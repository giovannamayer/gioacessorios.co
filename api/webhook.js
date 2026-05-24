// api/webhook.js — Webhook InfinityPay → Supabase
// Recebe pagamento aprovado → baixa estoque → salva venda → salva cliente

const SUPA_URL = "https://gtnllwzucjuncvpsyhsl.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmxsd3p1Y2p1bmN2cHN5aHNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQyODQ0NiwiZXhwIjoyMDk1MDA0NDQ2fQ.XJaFRwaXbEjFBjFz5RxNKh-5yFUMw8r_InAjXglPkLk";

const HEADERS = {
  "apikey": SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
};

async function supabase(method, table, query, body) {
  const url = `${SUPA_URL}/rest/v1/${table}${query || ""}`;
  const res = await fetch(url, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined
  });
  if (method === "GET") return res.json();
  return res;
}

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const data = req.body;

    // Valida campos obrigatórios
    if (!data.order_nsu || !data.paid_amount) {
      return res.status(400).json({ success: false, message: "Dados incompletos" });
    }

    const items = data.items || [];
    const agora = new Date().toISOString();
    const valorTotal = parseFloat(data.paid_amount) / 100; // InfinityPay envia em centavos

    // 1. Para cada item: baixar estoque
    for (const item of items) {
      const nomeProduto = item.name || item.description || "";
      const qtd = parseInt(item.quantity) || 1;

      if (!nomeProduto) continue;

      // Busca produto pelo nome
      const produtos = await supabase("GET", "gio-loja",
        `?nome=eq.${encodeURIComponent(nomeProduto)}&select=nome,estoque`
      );

      if (!Array.isArray(produtos) || !produtos.length) continue;

      const prod = produtos[0];
      const novoEstoque = Math.max(0, (prod.estoque || 0) - qtd);
      const novoVisivel = novoEstoque > 0;

      // Atualiza estoque (e oculta se zerou)
      await supabase("PATCH", "gio-loja",
        `?nome=eq.${encodeURIComponent(nomeProduto)}`,
        { estoque: novoEstoque, visivel: novoVisivel }
      );
    }

    // 2. Salva a venda na tabela gio-vendas
    const venda = {
      transaction_nsu: data.transaction_nsu || "",
      order_nsu: data.order_nsu || "",
      valor: valorTotal,
      forma_pagamento: data.capture_method || "",
      parcelas: data.installments || 1,
      receipt_url: data.receipt_url || "",
      itens: JSON.stringify(items),
      cliente_nome: data.customer?.name || "",
      cliente_email: data.customer?.email || "",
      cliente_telefone: data.customer?.phone || "",
      created_at: agora
    };

    await supabase("POST", "gio-vendas", "", venda);

    // 3. Salva / atualiza cliente na tabela gio-clientes
    if (data.customer?.email || data.customer?.phone) {
      const email = data.customer?.email || "";
      const telefone = data.customer?.phone || "";
      const nome = data.customer?.name || "";

      // Verifica se cliente já existe
      const query = email
        ? `?email=eq.${encodeURIComponent(email)}&select=id,total_compras,valor_total`
        : `?telefone=eq.${encodeURIComponent(telefone)}&select=id,total_compras,valor_total`;

      const clientes = await supabase("GET", "gio-clientes", query);

      if (Array.isArray(clientes) && clientes.length > 0) {
        // Atualiza cliente existente
        const c = clientes[0];
        const idQuery = `?id=eq.${c.id}`;
        await supabase("PATCH", "gio-clientes", idQuery, {
          total_compras: (c.total_compras || 0) + 1,
          valor_total: parseFloat(((c.valor_total || 0) + valorTotal).toFixed(2)),
          ultima_compra: agora,
          nome: nome || undefined
        });
      } else {
        // Novo cliente
        await supabase("POST", "gio-clientes", "", {
          nome,
          email,
          telefone,
          total_compras: 1,
          valor_total: valorTotal,
          primeira_compra: agora,
          ultima_compra: agora
        });
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Webhook erro:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
}
