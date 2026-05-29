const { neon } = require('@neondatabase/serverless');
 
const sql = neon('postgresql://neondb_owner:npg_Eg8U1itZWFcY@ep-purple-hat-acb3ryu1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require');
 
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { query, params } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const rows = params && params.length ? await sql(query, params) : await sql(query);
    res.status(200).json({ rows: rows || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
 
