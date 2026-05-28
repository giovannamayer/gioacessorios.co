// api/keepalive.js — Pinga o Supabase para não deixar pausar
// Vercel Cron: roda automaticamente a cada 3 dias

export const config = { runtime: 'edge' };

const SUPA_URL = "https://gtnllwzucjuncvpsyhsl.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bmxsd3p1Y2p1bmN2cHN5aHNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQyODQ0NiwiZXhwIjoyMDk1MDA0NDQ2fQ.XJaFRwaXbEjFBjFz5RxNKh-5yFUMw8r_InAjXglPkLk";

export default async function handler(req) {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/gio-loja?select=nome&limit=1', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    const ok = r.ok;
    return new Response(JSON.stringify({ ok, status: r.status, time: new Date().toISOString() }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
