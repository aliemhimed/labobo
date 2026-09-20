/* Netlify Function: weekly per-subject leaderboard
   GET  /api/leaderboard?subject=GCT&device_id=xxx
     -> { top: [...top 10], my_rank: N, my_entry: {...}, week_start: 'YYYY-MM-DD' }
   POST /api/leaderboard
     body: { device_id, handle, subject, score_pct, total_questions, time_seconds }
     -> upserts entry for current week; returns updated rank
*/

const SUPA_URL = 'https://boukmowybmtfqkinuvqj.supabase.co';
const SUPA_KEY = 'sb_publishable_LLpEKdQRvePMYJ5b7loUKA_SeZ51lJs';

const HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json'
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Get the Monday of the week containing the given date (UTC)
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // shift Sunday to last
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getWeeklyTop(subject, weekStart, limit = 10) {
  const url = `${SUPA_URL}/rest/v1/leaderboard_entries`
    + `?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}`
    + `&select=handle,score_pct,total_questions,time_seconds,completed_at,device_id`
    + `&order=score_pct.desc,time_seconds.asc,completed_at.asc`
    + `&limit=${limit}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getMyEntry(subject, weekStart, deviceId) {
  const url = `${SUPA_URL}/rest/v1/leaderboard_entries`
    + `?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}`
    + `&device_id=eq.${encodeURIComponent(deviceId)}`
    + `&select=*`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function getMyRank(subject, weekStart, myEntry) {
  if (!myEntry) return null;
  // Count entries that are strictly better
  const url = `${SUPA_URL}/rest/v1/leaderboard_entries`
    + `?subject=eq.${encodeURIComponent(subject)}`
    + `&week_start=eq.${weekStart}`
    + `&or=(score_pct.gt.${myEntry.score_pct}`
    + `,and(score_pct.eq.${myEntry.score_pct},time_seconds.lt.${myEntry.time_seconds || 999999}))`
    + `&select=id`;
  const res = await fetch(url, { headers: { ...HEADERS, 'Prefer': 'count=exact' } });
  if (!res.ok) return null;
  const range = res.headers.get('content-range');
  if (range) {
    const total = parseInt(range.split('/')[1], 10);
    return total + 1;
  }
  const rows = await res.json();
  return rows.length + 1;
}

async function upsertEntry(payload) {
  // Try to find existing entry for device + subject + week
  const existing = await getMyEntry(payload.subject, payload.week_start, payload.device_id);

  if (existing) {
    // Only update if new score is better (higher %, or same % with faster time)
    const isBetter = payload.score_pct > existing.score_pct
      || (payload.score_pct === existing.score_pct && (payload.time_seconds || 0) < (existing.time_seconds || Infinity));
    if (!isBetter) {
      return { action: 'kept_existing', entry: existing };
    }
    // PATCH the existing record
    const patchUrl = `${SUPA_URL}/rest/v1/leaderboard_entries?id=eq.${existing.id}`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        handle: payload.handle,
        score_pct: payload.score_pct,
        total_questions: payload.total_questions,
        time_seconds: payload.time_seconds,
        completed_at: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
    const updated = await res.json();
    return { action: 'updated', entry: updated[0] };
  } else {
    // Insert new
    const res = await fetch(`${SUPA_URL}/rest/v1/leaderboard_entries`, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...payload, completed_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error(`Insert failed: ${res.status} ${await res.text()}`);
    const inserted = await res.json();
    return { action: 'inserted', entry: inserted[0] };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const subject = params.subject;
      const deviceId = params.device_id;
      if (!subject) {
        return { statusCode: 400, headers: CORS, body: 'Missing subject' };
      }
      const weekStart = getWeekStart();
      const top = await getWeeklyTop(subject, weekStart, 10);
      let myEntry = null;
      let myRank = null;
      if (deviceId) {
        myEntry = await getMyEntry(subject, weekStart, deviceId);
        if (myEntry) myRank = await getMyRank(subject, weekStart, myEntry);
      }
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, top, my_entry: myEntry, my_rank: myRank })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const required = ['device_id', 'handle', 'subject', 'score_pct', 'total_questions'];
      for (const key of required) {
        if (body[key] === undefined || body[key] === null || body[key] === '') {
          return { statusCode: 400, headers: CORS, body: `Missing field: ${key}` };
        }
      }
      // Reject anything that's not a 30-question exam
      if (parseInt(body.total_questions, 10) !== 30) {
        return { statusCode: 400, headers: CORS, body: 'Leaderboard requires exactly 30 questions' };
      }
      const weekStart = getWeekStart();
      const result = await upsertEntry({
        device_id: String(body.device_id).slice(0, 80),
        handle: String(body.handle).slice(0, 30),
        subject: String(body.subject).slice(0, 80),
        score_pct: Math.round(Number(body.score_pct) * 100) / 100,
        total_questions: parseInt(body.total_questions, 10),
        time_seconds: body.time_seconds ? Math.round(Number(body.time_seconds)) : null,
        week_start: weekStart
      });
      // Get updated rank
      const myRank = await getMyRank(body.subject, weekStart, result.entry);
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, my_rank: myRank, week_start: weekStart })
      };
    }

    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
