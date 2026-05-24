export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    // Injeta webhook_url automaticamente em todo pedido
    const body = {
      ...req.body,
      webhook_url: 'https://gioacessorios-co.vercel.app/api/webhook',
      redirect_url: req.body.redirect_url || 'https://gioacessorios-co.vercel.app/sucesso.html'
    };
    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao conectar com InfinityPay', detail: err.message });
  }
}
