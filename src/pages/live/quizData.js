/* Teacher-side helpers: turn a saved quiz into full questions, and rooms
   into the frozen question list the server wants. Shared by the quiz
   builder and the room setup screen. */
import { fetchBank, fetchLectures, fetchQuiz } from '../../lib/live.js';
import { storedTopic } from '../../lib/liveSubjects.js';
import { questionFromRow } from '../../lib/questions.js';

export const MAX_QUESTIONS = 100;

/** A bank question as the builder keeps it. */
export const bankItem = (table, row) => {
  const q = questionFromRow(row, table);
  return {
    kind: 'bank', key: `${table}:${row.id}`, table, id: row.id, topic: q.topic, rawTopic: row.topic || '', q: q.q,
    options: q.options, answer: q.answer, explanation: q.explanation, images: q.images,
  };
};

let uid = 0;
export const newUid = () => `c${Date.now().toString(36)}${uid++}`;

/** The teacher's own question as the builder keeps it. */
export const customItem = (c) => ({
  kind: 'custom', key: newUid(), customId: c.id || null, q: c.q || '', options: c.options || [], answer: c.answer ?? 0,
  explanation: c.explanation || '', images: [], share: !!c.share || ['pending', 'approved'].includes(c.review_status),
});

/** Loads the bank tables (max 6 per call) and returns every question as a Map of "table:id" to item. */
export async function loadBankItems(tables) {
  const out = new Map();
  const list = [...new Set(tables)];
  const calls = [];
  for (let i = 0; i < list.length; i += 6) calls.push(fetchBank(list.slice(i, i + 6)));
  for (const res of await Promise.all(calls)) {
    for (const [table, rows] of Object.entries(res.tables || {})) {
      for (const row of rows) { const it = bankItem(table, row); out.set(it.key, it); }
    }
  }
  return out;
}

/** A quiz's lecture pool with stored topic values (old quizzes saved display names for some banks). */
const cleanPool = (quiz) => (quiz.settings?.pool || []).map((p) => ({ table: p.table, topic: storedTopic(p.table, p.topic) }));

/** A saved quiz with its fixed items resolved: { quiz, items, missing, pool, count, bank }.
    Only the banks of the fixed questions are loaded (not the lecture pool's). */
export async function loadQuizItems(id) {
  const { quiz, items } = await fetchQuiz(id);
  const pool = cleanPool(quiz);
  const bank = await loadBankItems(items.filter((i) => i.source_table).map((i) => i.source_table));
  const out = [];
  let missing = 0;
  for (const it of [...items].sort((a, b) => a.position - b.position)) {
    if (it.custom_questions) out.push(customItem(it.custom_questions));
    else {
      const found = bank.get(`${it.source_table}:${it.source_id}`);
      if (found) out.push(found); else missing += 1;
    }
  }
  return { quiz, items: out, missing, pool, count: quiz.settings?.count || 0, bank };
}

/** What a start of this quiz is made of, without loading any bank:
    { quiz, fixed, pool: [{ table, topic, n }], count }. */
export async function loadQuizSummary(id) {
  const { quiz, items } = await fetchQuiz(id);
  const pool = cleanPool(quiz);
  const tables = [...new Set(pool.map((p) => p.table))];
  const lists = tables.length ? (await fetchLectures(tables)).tables || {} : {};
  const counts = new Map();
  for (const [table, list] of Object.entries(lists)) for (const l of list) counts.set(lectureKey(table, l.topic), l.n);
  return {
    quiz, fixed: items.length, count: quiz.settings?.count || 0,
    pool: pool.map((p) => ({ ...p, n: counts.get(lectureKey(p.table, p.topic)) || 0 })),
  };
}

/** The question shape create_room expects. */
export const roomQuestion = (it) => ({
  q: it.q, options: it.options, answer: it.answer, explanation: it.explanation || '', image: it.images?.[0] || '',
  source_table: it.kind === 'bank' ? it.table : null,
  source_id: it.kind === 'bank' ? it.id : null,
  custom_id: it.kind === 'custom' ? it.customId : null,
});

/* ---- Pasted questions ---- */

const OPTION_LINE = /^\(?([A-Za-z])[).]\s*(\S.*)$/;
const ANSWER_LINE = /^(?:correct\s+)?(?:answer|ans)\s*[:=\-]\s*\(?([A-Za-z])\b\)?/i;
const MAX_PASTED_OPTIONS = 6;

/** Reads a question pasted from Word: the question, options "A) ...", and the answer
    marked with a trailing "*" or a last line "Answer: B".
    Returns { q, options, answer } or { error }. */
export function parsePastedQuestion(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: 'Paste the question with its options.' };

  let marked = null; // letter index from an "Answer: B" line
  if (lines.length > 1) {
    const m = ANSWER_LINE.exec(lines[lines.length - 1]);
    if (m) { marked = m[1].toUpperCase().charCodeAt(0) - 65; lines.pop(); }
  }

  const stem = [];
  const options = [];
  const stars = [];
  for (const line of lines) {
    const m = OPTION_LINE.exec(line);
    const next = options.length;
    if (m && m[1].toUpperCase().charCodeAt(0) - 65 === next && next < MAX_PASTED_OPTIONS) {
      options.push(m[2]);
    } else if (options.length) {
      options[options.length - 1] += ` ${line}`; // a wrapped option line
    } else {
      stem.push(line);
    }
  }
  if (options.length < 2) return { error: 'Could not find the options. Start each one with A) B) C) D).' };

  options.forEach((o, i) => {
    if (/\s*\*+\s*$/.test(o)) { stars.push(i); options[i] = o.replace(/\s*\*+\s*$/, '').trim(); }
  });
  const q = stem.join('\n').replace(/^\d+[.)]\s+/, '').trim();
  if (!q) return { error: 'Could not find the question text above the options.' };
  if (options.some((o) => !o)) return { error: 'One of the options is empty.' };

  let answer;
  if (stars.length > 1) return { error: 'More than one option is marked with *. Mark only the correct one.' };
  if (stars.length === 1) {
    if (marked !== null && marked !== stars[0]) return { error: 'The * and the Answer line disagree.' };
    answer = stars[0];
  } else if (marked !== null) {
    if (marked < 0 || marked >= options.length) return { error: `The answer is not one of the ${options.length} options.` };
    answer = marked;
  } else {
    return { error: 'Could not find the answer. Put * after the correct option, or end with "Answer: B".' };
  }
  return { q, options, answer };
}

/* ---- Random draw ---- */

const keyOf = (table, topic) => `${table}\u0001${topic}`;
export const lectureKey = keyOf;
export const splitLectureKey = (key) => { const i = key.indexOf('\u0001'); return { table: key.slice(0, i), topic: key.slice(i + 1) }; };

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The questions of one start: the always-included ones plus random ones from the pool
    lectures (never a repeat), all shuffled, up to `count`. Returns { questions, available, short }
    where `short` is true when the pool could not fill `count`. */
export function drawQuestions({ items, pool, count, bank }) {
  const lectures = new Set((pool || []).map((p) => keyOf(p.table, p.topic)));
  const have = new Set(items.filter((i) => i.kind === 'bank').map((i) => i.key));
  const candidates = [...bank.values()].filter((q) => lectures.has(keyOf(q.table, q.topic)) && !have.has(q.key));
  const need = Math.max(0, count - items.length);
  const picked = shuffle(candidates).slice(0, need);
  const questions = shuffle([...items, ...picked]);
  return { questions, random: picked.length, short: items.length + picked.length < count };
}
