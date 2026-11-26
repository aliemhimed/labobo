/* Netlify Function: Labobo Live (teacher rooms, slice 1)

   Every Live read and write goes through here with the service key; phones
   never touch the live_* tables. The rules (stage, deadline, who may do
   what, scoring) live in the database functions of
   supabase/migrations/20261127000000_labobo_live.sql, which also push the
   game's events over Supabase Realtime (private channels).

   GET  /api/live?view=me             -> { teacher, uni_email }
   GET  /api/live?view=bank&tables=a,b  teacher: raw rows of up to 6 banks
   GET  /api/live?view=quizzes         teacher: their saved quizzes
   GET  /api/live?view=quiz&id=        teacher: one quiz with its items
   GET  /api/live?view=hosted          teacher: their rooms, newest first
   GET  /api/live?view=state&room=     host or player: the room right now
   GET  /api/live?view=results&room=   host: everything; player: own results
   GET  /api/live?view=history         student: past teacher sessions

   POST /api/live  { action, ... }
     save_quiz    { id?, title, subject, settings, items: [{table, id} | {custom: {id?, q, options, answer, explanation, share}}] }
     delete_quiz  { id }
     create_room  { quiz_id?, title, settings, questions: [{q, options, answer, explanation, image, source_table, source_id, custom_id}] }
     join         { code, nickname }        needs a verified @eu.edu.ge address
     next | close | board | finish  { room }
     pause        { room, paused }
     moderate     { room, act: 'kick'|'rename'|'lock', user?, value? }
     answer       { room, position, choice }
     away         { room }

   Teachers are rows in `teachers`, granted by an admin (admin.js). */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { trialEmail } = require('./_lib/access');
const { verifiedEmail } = require('./_lib/uniEmail');
const { ALLOWED_TABLES } = require('./questions');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^\d{6}$/;
const MAX_QUESTIONS = 100;
const SECONDS = [10, 15, 20, 30, 45, 60, 90];

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function rows(path) {
  const res = await rest(path);
  if (!res.ok) throw new Error(`${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function rpc(name, args) {
  const res = await rest(`/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function isTeacher(userId) {
  const r = await rows(`/teachers?user_id=eq.${encodeURIComponent(userId)}&select=user_id`);
  return r.length > 0;
}

/** The caller's university address: the sign-in one, or one proved by code. */
async function uniEmail(caller) {
  return trialEmail(caller) || (await verifiedEmail(caller.id).catch(() => null));
}

async function displayName(caller) {
  const [p] = await rows(`/profiles?id=eq.${encodeURIComponent(caller.id)}&select=username`).catch(() => []);
  return p?.username || caller.email || '';
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Room settings with only known keys and allowed values. */
function cleanSettings(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    mode: 'individual',
    seconds: SECONDS.includes(Number(o.seconds)) ? Number(o.seconds) : 20,
    names: o.names === 'real' ? 'real' : 'nicknames',
    leaderboard: ['all', 'top5', 'none'].includes(o.leaderboard) ? o.leaderboard : 'top5',
    review: o.review !== false,
  };
}

/** One question as a teacher sent it, or null if malformed. */
function cleanQuestion(x) {
  if (!x || typeof x !== 'object') return null;
  const q = str(x.q, 2000);
  const options = Array.isArray(x.options) ? x.options.map((o) => str(String(o ?? ''), 500)) : [];
  if (!q || options.length < 2 || options.length > 6 || options.some((o) => !o)) return null;
  if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer >= options.length) return null;
  const image = str(x.image, 500);
  return {
    q, options, answer: x.answer,
    explanation: str(x.explanation, 4000),
    image: /^(\/|https:\/\/)/.test(image) ? image : '',
    source_table: ALLOWED_TABLES.includes(x.source_table) ? x.source_table : null,
    source_id: Number.isSafeInteger(x.source_id) ? x.source_id : null,
    custom_id: UUID.test(x.custom_id || '') ? x.custom_id : null,
  };
}

/** Shuffle the options of a question, keeping track of the right one. */
function shuffled(question) {
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...question, options: order.map((i) => question.options[i]), answer: order.indexOf(question.answer) };
}

// ── Teacher: question bank and quizzes ─────────────────────────────────

const BANK_COLS = 'id,ord,topic,q,options,answer,explanation,image,images';
const WITH_DISPLAY_TOPIC = ['clinical_skills', 'clinical_skills_2'];

async function bankView(raw) {
  const tables = [...new Set(String(raw || '').split(',').map((t) => t.trim()).filter(Boolean))];
  if (!tables.length || tables.length > 6) return fail(400, 'Ask for 1-6 tables');
  if (tables.some((t) => !ALLOWED_TABLES.includes(t))) return fail(403, 'Table not allowed');
  const out = {};
  for (const t of tables) {
    const cols = WITH_DISPLAY_TOPIC.includes(t) ? `${BANK_COLS},display_topic` : BANK_COLS;
    const list = [];
    for (let from = 0; ; from += 1000) {
      const res = await rest(`/${t}?select=${cols}&order=ord.asc,id.asc`, { headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
      if (!res.ok) throw new Error(`${t}: ${res.status} ${await res.text()}`);
      const batch = await res.json();
      list.push(...batch);
      if (batch.length < 1000) break;
    }
    out[t] = list;
  }
  return json(200, { tables: out });
}

async function quizzesView(owner) {
  const list = await rows(`/live_quizzes?owner=eq.${owner}&select=id,title,subject,settings,updated_at,live_quiz_items(count)&order=updated_at.desc`);
  return json(200, { quizzes: list.map((q) => ({ ...q, count: q.live_quiz_items?.[0]?.count ?? 0, live_quiz_items: undefined })) });
}

async function quizView(owner, id) {
  if (!UUID.test(id || '')) return fail(400, 'Invalid quiz id');
  const [quiz] = await rows(`/live_quizzes?id=eq.${id}&owner=eq.${owner}&select=id,title,subject,settings,updated_at`);
  if (!quiz) return fail(404, 'No such quiz');
  const items = await rows(`/live_quiz_items?quiz_id=eq.${id}&select=position,source_table,source_id,custom_id,custom_questions(id,q,options,answer,explanation,review_status)&order=position.asc`);
  return json(200, { quiz, items });
}

async function saveQuiz(owner, body) {
  const title = str(body.title, 120);
  if (!title) return fail(400, 'Give the quiz a title');
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_QUESTIONS) : [];
  if (!items.length) return fail(400, 'Add at least one question');

  // Own questions first, so the items can point at them.
  const resolved = [];
  for (const it of items) {
    if (it?.custom) {
      const c = cleanQuestion({ ...it.custom, source_table: null });
      if (!c) return fail(400, 'One of your own questions is incomplete');
      const row = {
        owner, q: c.q, options: c.options, answer: c.answer, explanation: c.explanation,
        review_status: it.custom.share ? 'pending' : 'private', updated_at: new Date().toISOString(),
      };
      let saved;
      if (UUID.test(it.custom.id || '')) {
        const res = await rest(`/custom_questions?id=eq.${it.custom.id}&owner=eq.${owner}`, {
          method: 'PATCH', headers: { Prefer: 'return=representation' },
          // An approved question stays approved unless it is edited.
          body: JSON.stringify(row),
        });
        if (!res.ok) throw new Error(`custom update ${res.status} ${await res.text()}`);
        [saved] = await res.json();
      }
      if (!saved) {
        const res = await rest('/custom_questions', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
        if (!res.ok) throw new Error(`custom insert ${res.status} ${await res.text()}`);
        [saved] = await res.json();
      }
      resolved.push({ custom_id: saved.id });
    } else if (ALLOWED_TABLES.includes(it?.table) && Number.isSafeInteger(it?.id)) {
      resolved.push({ source_table: it.table, source_id: it.id });
    } else {
      return fail(400, 'A question in the quiz is not valid');
    }
  }

  const quizRow = { owner, title, subject: str(body.subject, 80), settings: cleanSettings(body.settings), updated_at: new Date().toISOString() };
  let quizId = UUID.test(body.id || '') ? body.id : null;
  if (quizId) {
    const res = await rest(`/live_quizzes?id=eq.${quizId}&owner=eq.${owner}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(quizRow) });
    if (!res.ok) throw new Error(`quiz update ${res.status} ${await res.text()}`);
    if (!(await res.json()).length) return fail(404, 'No such quiz');
    const del = await rest(`/live_quiz_items?quiz_id=eq.${quizId}`, { method: 'DELETE' });
    if (!del.ok) throw new Error(`items delete ${del.status} ${await del.text()}`);
  } else {
    const res = await rest('/live_quizzes', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(quizRow) });
    if (!res.ok) throw new Error(`quiz insert ${res.status} ${await res.text()}`);
    quizId = (await res.json())[0].id;
  }
  const ins = await rest('/live_quiz_items', {
    method: 'POST',
    body: JSON.stringify(resolved.map((r, position) => ({ quiz_id: quizId, position, source_table: null, source_id: null, custom_id: null, ...r }))),
  });
  if (!ins.ok) throw new Error(`items insert ${ins.status} ${await ins.text()}`);
  return json(200, { id: quizId });
}

async function deleteQuiz(owner, id) {
  if (!UUID.test(id || '')) return fail(400, 'Invalid quiz id');
  const res = await rest(`/live_quizzes?id=eq.${id}&owner=eq.${owner}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`quiz delete ${res.status} ${await res.text()}`);
  return json(200, { ok: true });
}

async function createRoom(host, body) {
  const list = Array.isArray(body.questions) ? body.questions.slice(0, MAX_QUESTIONS).map(cleanQuestion) : [];
  if (!list.length || list.some((q) => !q)) return fail(400, 'The quiz has a question that cannot be used');
  const quizId = UUID.test(body.quiz_id || '') ? body.quiz_id : null;
  const out = await rpc('live_create_room', {
    p_host: host, p_title: str(body.title, 120), p_settings: cleanSettings(body.settings),
    p_questions: list.map(shuffled), p_quiz: quizId,
  });
  return json(200, out);
}

// ── Everyone in a room ────────────────────────────────────────────────

async function join(caller, body) {
  const code = String(body.code || '').replace(/\D/g, '');
  if (!CODE.test(code)) return fail(400, 'Room codes have 6 digits');
  if (!(await allowRequest(caller.id, 'live_join', 30, 600))) return fail(429, 'Too many tries. Wait a few minutes.');
  const email = await uniEmail(caller);
  if (!email) return json(403, { error: 'Confirm your EU university email to join', code: 'uni_email_required' });
  const out = await rpc('live_join', {
    p_code: code, p_user: caller.id, p_display: await displayName(caller), p_email: email,
    p_nickname: str(body.nickname, 24),
  });
  const messages = {
    not_found: 'No running room has that code',
    locked: 'The teacher has locked this room',
    kicked: 'You were removed from this room',
  };
  if (messages[out.status]) return json(out.status === 'not_found' ? 404 : 403, { error: messages[out.status], code: out.status });
  return json(200, out);
}

/** Maps a database function's status to an HTTP reply. */
function statusReply(out) {
  const s = out?.status;
  if (s === 'not_allowed' || s === 'not_in_room') return fail(403, 'Not allowed');
  if (s === 'not_found') return fail(404, 'No such room');
  return json(200, out);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  const caller = await verifyUser(event);
  if (!caller) return fail(401, 'Sign in required');

  try {
    if (event.httpMethod === 'GET') {
      const { view, room, id, tables } = event.queryStringParameters || {};
      if (view === 'me') {
        const [teacher, email] = await Promise.all([isTeacher(caller.id), uniEmail(caller)]);
        return json(200, { teacher, uni_email: email });
      }
      if (view === 'state' || view === 'results') {
        if (!UUID.test(room || '')) return fail(400, 'Invalid room');
        const out = await rpc(view === 'state' ? 'live_state' : 'live_results', { p_room: room, p_user: caller.id });
        return out ? json(200, out) : fail(404, 'Not available');
      }
      if (view === 'history') return json(200, { sessions: await rpc('live_history', { p_user: caller.id }) });

      if (!(await isTeacher(caller.id))) return fail(403, 'Teachers only');
      if (view === 'bank') return await bankView(tables);
      if (view === 'quizzes') return await quizzesView(caller.id);
      if (view === 'quiz') return await quizView(caller.id, id);
      if (view === 'hosted') return json(200, { rooms: await rpc('live_hosted', { p_host: caller.id }) });
      return fail(400, 'Unknown view');
    }

    if (event.httpMethod !== 'POST') return fail(405, 'Method not allowed');
    const body = parseBody(event);
    if (!body) return fail(400, 'Body must be a JSON object');
    const room = body.room;
    const needRoom = () => (UUID.test(room || '') ? null : fail(400, 'Invalid room'));

    switch (body.action) {
      case 'join': return await join(caller, body);
      case 'answer': {
        const bad = needRoom(); if (bad) return bad;
        if (!Number.isInteger(body.position) || !Number.isInteger(body.choice)) return fail(400, 'Invalid answer');
        return statusReply(await rpc('live_answer', { p_room: room, p_user: caller.id, p_position: body.position, p_choice: body.choice }));
      }
      case 'close': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_close', { p_room: room, p_user: caller.id }));
      }
      case 'away': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_away', { p_room: room, p_user: caller.id }));
      }
      default: break;
    }

    // Everything below is for teachers.
    if (!(await isTeacher(caller.id))) return fail(403, 'Teachers only');
    switch (body.action) {
      case 'save_quiz': return await saveQuiz(caller.id, body);
      case 'delete_quiz': return await deleteQuiz(caller.id, body.id);
      case 'create_room': return await createRoom(caller.id, body);
      case 'next':
      case 'board':
      case 'finish': {
        const bad = needRoom(); if (bad) return bad;
        const fn = { next: 'live_next', board: 'live_show_board', finish: 'live_finish' }[body.action];
        return statusReply(await rpc(fn, { p_room: room, p_host: caller.id }));
      }
      case 'pause': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_pause', { p_room: room, p_host: caller.id, p_paused: body.paused === true }));
      }
      case 'moderate': {
        const bad = needRoom(); if (bad) return bad;
        if (!['kick', 'rename', 'lock'].includes(body.act)) return fail(400, 'Unknown action');
        if (body.act !== 'lock' && !UUID.test(body.user || '')) return fail(400, 'Invalid player');
        return statusReply(await rpc('live_moderate', {
          p_room: room, p_host: caller.id, p_action: body.act,
          p_user: body.act === 'lock' ? null : body.user, p_value: body.act === 'lock' ? String(body.value === true) : str(body.value, 24),
        }));
      }
      default: return fail(400, 'Unknown action');
    }
  } catch (e) {
    return fail(500, 'Live is unavailable right now', e);
  }
};
