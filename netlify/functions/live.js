/* Netlify Function: Labobo Live (teacher rooms, slice 1)

   Every Live read and write goes through here with the service key; phones
   never touch the live_* tables. The rules (stage, deadline, who may do
   what, scoring) live in the database functions of
   supabase/migrations/20261127000000_labobo_live.sql, which also push the
   game's events over Supabase Realtime (private channels).

   GET  /api/live?view=me             -> { teacher, can_host, subjects: [bank tables], uni_email }
   GET  /api/live?view=bank&tables=a,b  teacher: raw rows of up to 6 of THEIR banks
   GET  /api/live?view=quizzes         teacher: their saved quizzes
   GET  /api/live?view=quiz&id=        teacher: one quiz with its items
   GET  /api/live?view=hosted          teacher: their rooms, newest first
   GET  /api/live?view=state&room=     host or player: the room right now
   GET  /api/live?view=results&room=   host: everything; player: own results
   GET  /api/live?view=history         student: past teacher sessions

   POST /api/live  { action, ... }
     save_quiz    { id?, title, subject, settings, pool: [{table, topic}], count,
                    items: [{table, id} | {custom: {id?, q, options, answer, explanation, share}}] }
                  items are the questions always included; the rest of `count`
                  is drawn at random from the pool's lectures at each start
     delete_quiz  { id }
     create_student_room { title?, settings, picks: [{ table, id }] }   pass holders (and teachers): a quick
                  room built on the server from bank ids; closes the student's earlier running room.
                  Student rooms (settings.kind 'student') need no university address to join.
     create_room  { quiz_id?, title, settings, questions: [{q, options, answer, explanation, image, source_table, source_id, custom_id}] }
     join         { code, nickname }        needs a verified @eu.edu.ge address
     next | close | board | finish  { room }
     pause        { room, paused }
     moderate     { room, act: 'kick'|'rename'|'lock', user?, value? }
     answer       { room, position, choice }
     pick_spell   { room, index }   power-ups: keep one of the offered cards
     cast         { room, target? }   power-ups: cast the held spell between questions
     auto_next    { room }   auto mode: anyone in the room, once the reveal's time is up
     vote         { room, position, choice }   team rooms: an advisor's pick (the captain uses answer)
     make_teams   { room }   team rooms, lobby: (re)make the teams at random
     name_team    { room, name }   team rooms, lobby: the team's first captain names it
     reject_team_name { room, team }   teacher: the team goes back to "Team <n>" and is asked again
     moderate act 'move'  { user, value: team no }   team rooms: move a student
   Case-scenario rooms (mode 'cases', teacher-marked, no timer):
     GET view=cases&room=        host: cases, teams' progress, answers, marks; player: own team's
                                 current case (no right answers) and draft, or everything after release
     GET view=case_sets | view=case_set&id=   teacher's saved case sets
     save_case_set   { id?, title, subject, cases: [{ scenario, questions: [{ kind: 'options'|'open', q, options, answer, max }] }] }
     delete_case_set { id }
     create_case_room { set_id, title?, settings: { names, team_size } }   frozen from the saved set
     case_draft   { room, position, answers: [{ choice, text }] }   any team member, current case only
     case_submit  { room, position }   locks the case
     case_mark    { room, position, team, question, mark (0..max | null), comment }   teacher
     case_release { room }   teacher: ends the room and shows teams their marks
     away         { room }

   Teachers are rows in `teachers`, granted by an admin (admin.js). */

const { SUPA_URL, dbHeaders, json, fail, parseBody, verifyUser, allowRequest } = require('./_lib/common');
const { trialEmail, getAccess } = require('./_lib/access');
const { bankQuestion } = require('./_lib/bankQuestion');
const { verifiedEmail } = require('./_lib/uniEmail');
const { ALLOWED_TABLES } = require('./questions');
const { containsProfanity } = require('./_lib/profanity');

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

/** The caller's teacher row ({ subjects: [bank tables] }), or null. */
/** True if the caller has an active pass (teachers are reported as a pass too). */
async function hasPass(caller) {
  try { return (await getAccess(caller)).kind === 'pass'; } catch { return false; }
}

// Actions only teachers may take; every other host action is also open to
// pass holders, for their own rooms (the database checks who the host is).
const TEACHER_ONLY = new Set(['save_quiz', 'delete_quiz', 'create_room', 'save_case_set', 'delete_case_set', 'create_case_room', 'upload_image']);

async function getTeacher(userId) {
  const [r] = await rows(`/teachers?user_id=eq.${encodeURIComponent(userId)}&select=user_id,subjects`);
  return r ? { subjects: (r.subjects || []).filter((t) => ALLOWED_TABLES.includes(t)) } : null;
}

/** The caller's university address: the sign-in one, or one proved by code. */
async function uniEmail(caller) {
  return trialEmail(caller) || (await verifiedEmail(caller.id).catch(() => null));
}

/** The name a player is listed under. In friends' rooms (`student`), never
    the email: a student without a username shows by nickname or "Student". */
async function displayName(caller, studentRoom = false) {
  const [p] = await rows(`/profiles?id=eq.${encodeURIComponent(caller.id)}&select=username`).catch(() => []);
  return p?.username || (studentRoom ? '' : caller.email || '');
}

/** Friends' rooms: the host is a student, so players' emails are left out. */
function withoutEmails(out) {
  if (out?.room?.settings?.kind !== 'student') return out;
  const strip = (list) => (Array.isArray(list) ? list.map(({ email, ...rest }) => rest) : list);
  return { ...out, roster: strip(out.roster), players: strip(out.players) };
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Room settings with only known keys and allowed values. */
function cleanSettings(s) {
  const o = s && typeof s === 'object' ? s : {};
  return {
    // 'teams': groups of team_size (2-5) with a rotating captain (slice 2).
    mode: o.mode === 'teams' ? 'teams' : 'individual',
    team_size: Number.isInteger(Number(o.team_size)) ? Math.max(2, Math.min(5, Number(o.team_size))) : 3,
    seconds: SECONDS.includes(Number(o.seconds)) ? Number(o.seconds) : 20,
    names: o.names === 'real' ? 'real' : 'nicknames',
    leaderboard: ['all', 'top5', 'none'].includes(o.leaderboard) ? o.leaderboard : 'top5',
    review: o.review !== false,
    // 'teacher': the teacher clicks Next (default); 'auto': the next question
    // starts by itself a few seconds after the reveal.
    advance: o.advance === 'auto' ? 'auto' : 'teacher',
    // Power-ups: only acted on in friends' rooms in individual mode (live_spells_on).
    spells: o.spells === true,
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

async function bankView(raw, teacher) {
  const tables = [...new Set(String(raw || '').split(',').map((t) => t.trim()).filter(Boolean))];
  if (!tables.length || tables.length > 6) return fail(400, 'Ask for 1-6 tables');
  if (tables.some((t) => !teacher.subjects.includes(t))) return fail(403, 'That subject is not assigned to you');
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

/** The lectures a quiz draws random questions from, and how many questions it has. */
function cleanPool(body, teacher) {
  const pool = Array.isArray(body.pool) ? body.pool : [];
  const lectures = pool
    .filter((p) => p && teacher.subjects.includes(p.table) && typeof p.topic === 'string' && p.topic.trim())
    .slice(0, 200)
    .map((p) => ({ table: p.table, topic: p.topic.trim().slice(0, 200) }));
  const count = Number.isInteger(body.count) ? Math.max(1, Math.min(MAX_QUESTIONS, body.count)) : 10;
  return { lectures, count };
}

async function saveQuiz(owner, body, teacher) {
  const title = str(body.title, 120);
  if (!title) return fail(400, 'Give the quiz a title');
  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_QUESTIONS) : [];
  const { lectures, count } = cleanPool(body, teacher);
  if (!items.length && !lectures.length) return fail(400, 'Choose at least one lecture or question');

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
    } else if (teacher.subjects.includes(it?.table) && Number.isSafeInteger(it?.id)) {
      resolved.push({ source_table: it.table, source_id: it.id });
    } else {
      return fail(400, 'A question in the quiz is not valid');
    }
  }

  const quizRow = {
    owner, title, subject: str(body.subject, 300),
    // Room settings, plus the lectures to draw random questions from and the
    // quiz length. Random questions are drawn fresh each time it starts.
    settings: { ...cleanSettings(body.settings), pool: lectures, count },
    updated_at: new Date().toISOString(),
  };
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
  if (!resolved.length) return json(200, { id: quizId });
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

async function createRoom(host, body, teacher) {
  const list = Array.isArray(body.questions) ? body.questions.slice(0, MAX_QUESTIONS).map(cleanQuestion) : [];
  if (!list.length || list.some((q) => !q)) return fail(400, 'The quiz has a question that cannot be used');
  if (list.some((q) => q.source_table && !teacher.subjects.includes(q.source_table))) return fail(403, 'That subject is not assigned to you');
  const quizId = UUID.test(body.quiz_id || '') ? body.quiz_id : null;
  const out = await rpc('live_create_room', {
    p_host: host, p_title: str(body.title, 120), p_settings: cleanSettings(body.settings),
    p_questions: list.map(shuffled), p_quiz: quizId,
  });
  return json(200, out);
}

// ── Case-scenario sets (teacher) ──────────────────────────────────────

/** A case set's cases as a teacher sent them, or a reason string if invalid. */
function cleanCases(list) {
  if (!Array.isArray(list) || !list.length) return 'Add at least one case';
  if (list.length > 50) return 'At most 50 cases';
  const out = [];
  for (const [ci, c] of list.entries()) {
    const scenario = str(c?.scenario, 5000);
    const qs = Array.isArray(c?.questions) ? c.questions : [];
    if (!scenario) return `Case ${ci + 1} needs a scenario`;
    if (!qs.length || qs.length > 6) return `Case ${ci + 1} needs 1 to 6 questions`;
    const questions = [];
    for (const [qi, q] of qs.entries()) {
      const kind = q?.kind === 'open' ? 'open' : 'options';
      const text = str(q?.q, 2000);
      const max = Number.isInteger(q?.max) ? Math.max(1, Math.min(100, q.max)) : 5;
      if (!text) return `Case ${ci + 1}, question ${qi + 1} has no text`;
      if (kind === 'open') { questions.push({ kind, q: text, max }); continue; }
      const options = Array.isArray(q.options) ? q.options.map((o) => str(String(o ?? ''), 500)).filter(Boolean) : [];
      if (options.length < 2 || options.length > 6) return `Case ${ci + 1}, question ${qi + 1} needs 2 to 6 options`;
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= options.length) return `Case ${ci + 1}, question ${qi + 1} needs a correct option`;
      questions.push({ kind, q: text, options, answer: q.answer, max });
    }
    out.push({ scenario, questions });
  }
  return out;
}

async function caseSetsView(owner) {
  const list = await rows(`/case_sets?owner=eq.${owner}&select=id,title,subject,cases,updated_at&order=updated_at.desc`);
  return json(200, { sets: list.map((s) => ({ id: s.id, title: s.title, subject: s.subject, updated_at: s.updated_at, count: s.cases.length })) });
}

async function caseSetView(owner, id) {
  if (!UUID.test(id || '')) return fail(400, 'Invalid case set');
  const [set] = await rows(`/case_sets?id=eq.${id}&owner=eq.${owner}&select=id,title,subject,cases,updated_at`);
  return set ? json(200, { set }) : fail(404, 'No such case set');
}

async function saveCaseSet(owner, body) {
  const title = str(body.title, 120);
  if (!title) return fail(400, 'Give the case set a title');
  const cases = cleanCases(body.cases);
  if (typeof cases === 'string') return fail(400, cases);
  const row = { owner, title, subject: str(body.subject, 300), cases, updated_at: new Date().toISOString() };
  if (UUID.test(body.id || '')) {
    const res = await rest(`/case_sets?id=eq.${body.id}&owner=eq.${owner}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
    if (!res.ok) throw new Error(`case set update ${res.status} ${await res.text()}`);
    const [saved] = await res.json();
    return saved ? json(200, { id: saved.id }) : fail(404, 'No such case set');
  }
  const res = await rest('/case_sets', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
  if (!res.ok) throw new Error(`case set insert ${res.status} ${await res.text()}`);
  return json(200, { id: (await res.json())[0].id });
}

async function deleteCaseSet(owner, id) {
  if (!UUID.test(id || '')) return fail(400, 'Invalid case set');
  const res = await rest(`/case_sets?id=eq.${id}&owner=eq.${owner}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`case set delete ${res.status} ${await res.text()}`);
  return json(200, { ok: true });
}

/** A case room from one of the teacher's saved sets (frozen on the server). */
async function createCaseRoom(host, body) {
  if (!UUID.test(body.set_id || '')) return fail(400, 'Choose a case set');
  const [set] = await rows(`/case_sets?id=eq.${body.set_id}&owner=eq.${host}&select=title,cases`);
  if (!set) return fail(404, 'No such case set');
  const s = cleanSettings({ ...(body.settings || {}), mode: 'teams' });
  const out = await rpc('live_create_case_room', {
    p_host: host, p_title: str(body.title, 120) || set.title,
    p_settings: { names: s.names, team_size: s.team_size, leaderboard: 'none', review: true },
    p_cases: set.cases,
  });
  return json(200, out);
}

/** A team's answers for one case: [{ choice, text }] per question. */
function cleanDraft(list) {
  if (!Array.isArray(list) || list.length > 6) return null;
  return list.map((a) => ({
    choice: Number.isInteger(a?.choice) && a.choice >= 0 && a.choice < 6 ? a.choice : null,
    text: str(a?.text, 4000),
  }));
}

// ── Student rooms (pass holders) ──────────────────────────────────────

/** A pass holder's quick room: the client picks bank questions at random
    from the lectures the student ticked and sends their ids; the server
    reads those rows itself and builds the questions, so nobody can put
    their own text in front of their friends. One running room per student:
    starting a new one closes the previous one. */
async function createStudentRoom(caller, body) {
  const picks = Array.isArray(body.picks) ? body.picks.slice(0, MAX_QUESTIONS) : [];
  if (!picks.length) return fail(400, 'Choose at least one lecture');
  if (picks.some((p) => !ALLOWED_TABLES.includes(p?.table) || !Number.isSafeInteger(p?.id))) return fail(400, 'A question is not valid');
  if (!(await allowRequest(caller.id, 'live_student_room', 20, 3600))) return fail(429, 'Too many rooms. Try again later.');

  const byTable = new Map();
  for (const p of picks) { if (!byTable.has(p.table)) byTable.set(p.table, []); byTable.get(p.table).push(p.id); }
  const rowsBy = new Map();
  for (const [table, ids] of byTable) {
    const list = await rows(`/${table}?id=in.(${[...new Set(ids)].join(',')})&select=id,q,options,answer,explanation,image,images`);
    for (const r of list) rowsBy.set(`${table}:${r.id}`, bankQuestion(r, table));
  }
  const questions = picks.map((p) => rowsBy.get(`${p.table}:${p.id}`)).filter(Boolean).map(cleanQuestion).filter(Boolean);
  if (!questions.length) return fail(400, 'Those questions are not available');

  // Close this student's earlier rooms that are still running.
  const old = await rest(`/live_rooms?host=eq.${caller.id}&stage=neq.finished&settings->>kind=eq.student`, {
    method: 'PATCH', body: JSON.stringify({ stage: 'finished', finished_at: new Date().toISOString() }),
  });
  if (!old.ok) console.error('[live] could not close old student rooms', old.status, await old.text());

  const out = await rpc('live_create_room', {
    p_host: caller.id, p_title: str(body.title, 120) || 'Study game',
    p_settings: { ...cleanSettings(body.settings), kind: 'student' },
    p_questions: questions.map(shuffled), p_quiz: null,
  });
  return json(200, out);
}

// ── Everyone in a room ────────────────────────────────────────────────

async function join(caller, body) {
  const code = String(body.code || '').replace(/\D/g, '');
  if (!CODE.test(code)) return fail(400, 'Room codes have 6 digits');
  if (!(await allowRequest(caller.id, 'live_join', 30, 600))) return fail(429, 'Too many tries. Wait a few minutes.');
  const [target] = await rows(`/live_rooms?code=eq.${code}&stage=neq.finished&select=settings`);
  const studentRoom = target?.settings?.kind === 'student';
  // Teacher rooms are for EU students; friends' rooms are open to anyone signed in.
  const email = (await uniEmail(caller)) || (studentRoom ? caller.email || '' : null);
  if (email === null) return json(403, { error: 'Confirm your EU university email to join', code: 'uni_email_required' });
  if (containsProfanity(str(body.nickname, 24))) return json(400, { error: 'Please choose another nickname', code: 'bad_nickname' });
  const out = await rpc('live_join', {
    p_code: code, p_user: caller.id, p_display: await displayName(caller, studentRoom), p_email: studentRoom ? '' : email,
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
        const [teacher, email] = await Promise.all([getTeacher(caller.id), uniEmail(caller)]);
        const canHost = !!teacher || (await hasPass(caller));
        return json(200, { teacher: !!teacher, can_host: canHost, subjects: teacher?.subjects || [], uni_email: email });
      }
      if (view === 'state' || view === 'results') {
        if (!UUID.test(room || '')) return fail(400, 'Invalid room');
        const out = await rpc(view === 'state' ? 'live_state' : 'live_results', { p_room: room, p_user: caller.id });
        return out ? json(200, withoutEmails(out)) : fail(404, 'Not available');
      }
      if (view === 'history') return json(200, { sessions: await rpc('live_history', { p_user: caller.id }) });
      if (view === 'cases') {
        if (!UUID.test(room || '')) return fail(400, 'Invalid room');
        const out = await rpc('live_case_view', { p_room: room, p_user: caller.id });
        return out ? json(200, out) : fail(404, 'Not available');
      }

      const teacher = await getTeacher(caller.id);
      if (view === 'hosted') {
        if (!teacher && !(await hasPass(caller))) return fail(403, 'Hosting a room needs a pass');
        return json(200, { rooms: await rpc('live_hosted', { p_host: caller.id }) });
      }
      if (!teacher) return fail(403, 'Teachers only');
      if (view === 'bank') return await bankView(tables, teacher);
      if (view === 'quizzes') return await quizzesView(caller.id);
      if (view === 'quiz') return await quizView(caller.id, id);
      if (view === 'hosted') return json(200, { rooms: await rpc('live_hosted', { p_host: caller.id }) });
      if (view === 'case_sets') return await caseSetsView(caller.id);
      if (view === 'case_set') return await caseSetView(caller.id, id);
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
      case 'vote': {
        const bad = needRoom(); if (bad) return bad;
        if (!Number.isInteger(body.position) || !Number.isInteger(body.choice)) return fail(400, 'Invalid pick');
        return statusReply(await rpc('live_vote', { p_room: room, p_user: caller.id, p_position: body.position, p_choice: body.choice }));
      }
      case 'name_team': {
        const bad = needRoom(); if (bad) return bad;
        const name = str(body.name, 24);
        if (containsProfanity(name)) return json(400, { error: 'Please choose another team name', code: 'bad_name' });
        const out = await rpc('live_name_team', { p_room: room, p_user: caller.id, p_name: name });
        if (out.status === 'taken') return json(409, { error: 'Another team already has that name', code: 'taken' });
        if (out.status === 'too_short') return json(400, { error: 'Use at least 2 characters', code: 'too_short' });
        return statusReply(out);
      }
      case 'case_draft': {
        const bad = needRoom(); if (bad) return bad;
        const answers = cleanDraft(body.answers);
        if (!Number.isInteger(body.position) || !answers) return fail(400, 'Invalid answers');
        return statusReply(await rpc('live_case_draft', { p_room: room, p_user: caller.id, p_position: body.position, p_answers: answers }));
      }
      case 'case_submit': {
        const bad = needRoom(); if (bad) return bad;
        if (!Number.isInteger(body.position)) return fail(400, 'Invalid case');
        return statusReply(await rpc('live_case_submit', { p_room: room, p_user: caller.id, p_position: body.position }));
      }
      case 'pick_spell': {
        const bad = needRoom(); if (bad) return bad;
        if (!Number.isInteger(body.index)) return fail(400, 'Invalid card');
        return statusReply(await rpc('live_pick_spell', { p_room: room, p_user: caller.id, p_index: body.index }));
      }
      case 'cast': {
        const bad = needRoom(); if (bad) return bad;
        if (body.target != null && !UUID.test(body.target)) return fail(400, 'Invalid target');
        return statusReply(await rpc('live_cast', { p_room: room, p_user: caller.id, p_target: body.target || null }));
      }
      case 'auto_next': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_auto_next', { p_room: room, p_user: caller.id }));
      }
      case 'away': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_away', { p_room: room, p_user: caller.id }));
      }
      default: break;
    }

    // Everything below is for people who host rooms: teachers, and students
    // with a pass (their own rooms only; the database checks the host).
    const teacher = await getTeacher(caller.id);
    if (TEACHER_ONLY.has(body.action) && !teacher) return fail(403, 'Teachers only');
    if (!teacher && !(await hasPass(caller))) return fail(403, 'Hosting a room needs a pass');
    switch (body.action) {
      case 'create_student_room': return await createStudentRoom(caller, body);
      case 'save_quiz': return await saveQuiz(caller.id, body, teacher);
      case 'delete_quiz': return await deleteQuiz(caller.id, body.id);
      case 'create_room': return await createRoom(caller.id, body, teacher);
      case 'save_case_set': return await saveCaseSet(caller.id, body);
      case 'delete_case_set': return await deleteCaseSet(caller.id, body.id);
      case 'create_case_room': return await createCaseRoom(caller.id, body);
      case 'case_mark': {
        const bad = needRoom(); if (bad) return bad;
        const { position, team, question } = body;
        const mark = body.mark === null ? null : body.mark;
        if (![position, team, question].every(Number.isInteger) || !(mark === null || Number.isInteger(mark))) return fail(400, 'Invalid mark');
        const out = await rpc('live_case_mark', { p_room: room, p_host: caller.id, p_position: position, p_team: team, p_question: question, p_mark: mark, p_comment: str(body.comment, 1000) });
        if (out.status === 'bad_mark') return json(400, { error: `Marks go from 0 to ${out.max}`, code: 'bad_mark' });
        return statusReply(out);
      }
      case 'case_release': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_case_release', { p_room: room, p_host: caller.id }));
      }
      case 'next':
      case 'board':
      case 'finish': {
        const bad = needRoom(); if (bad) return bad;
        const fn = { next: 'live_next', board: 'live_show_board', finish: 'live_finish' }[body.action];
        return statusReply(await rpc(fn, { p_room: room, p_host: caller.id }));
      }
      case 'reject_team_name': {
        const bad = needRoom(); if (bad) return bad;
        if (!Number.isInteger(body.team)) return fail(400, 'Invalid team');
        return statusReply(await rpc('live_reject_team_name', { p_room: room, p_host: caller.id, p_team: body.team }));
      }
      case 'make_teams': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_make_teams', { p_room: room, p_host: caller.id }));
      }
      case 'pause': {
        const bad = needRoom(); if (bad) return bad;
        return statusReply(await rpc('live_pause', { p_room: room, p_host: caller.id, p_paused: body.paused === true }));
      }
      case 'moderate': {
        const bad = needRoom(); if (bad) return bad;
        if (!['kick', 'rename', 'lock', 'move'].includes(body.act)) return fail(400, 'Unknown action');
        if (body.act === 'move' && !Number.isInteger(body.value)) return fail(400, 'Invalid team');
        if (body.act !== 'lock' && !UUID.test(body.user || '')) return fail(400, 'Invalid player');
        return statusReply(await rpc('live_moderate', {
          p_room: room, p_host: caller.id, p_action: body.act,
          p_user: body.act === 'lock' ? null : body.user,
          p_value: body.act === 'lock' ? String(body.value === true) : body.act === 'move' ? String(body.value) : str(body.value, 24),
        }));
      }
      default: return fail(400, 'Unknown action');
    }
  } catch (e) {
    return fail(500, 'Live is unavailable right now', e);
  }
};
