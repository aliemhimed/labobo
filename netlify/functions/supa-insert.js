/* Netlify Function: proxy inserts to Supabase
   Why: ad blockers (uBlock, AdGuard, Brave) block *.supabase.co directly.
   This routes inserts through your own domain (labobo.netlify.app) so they
   bypass blockers. */

const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';

const ALLOWED_TABLES = ['users', 'sessions', 'question_reports'];

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { table, data } = JSON.parse(event.body || '{}');

    if (!table || !data) {
      return { statusCode: 400, body: 'Missing table or data' };
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return { statusCode: 403, body: `Table not allowed: ${table}` };
    }

    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });

    const responseBody = res.ok ? '' : await res.text();
    return {
      statusCode: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: responseBody
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `Function error: ${err.message}`
    };
  }
};
