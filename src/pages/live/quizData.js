/* Teacher-side helpers: turn a saved quiz into full questions, and rooms
   into the frozen question list the server wants. Shared by the quiz
   builder and the room setup screen. */
import { fetchBank, fetchQuiz } from '../../lib/live.js';
import { questionFromRow } from '../../lib/questions.js';
import { SUBJECTS } from '../../lib/subjects.js';

export const MAX_QUESTIONS = 100;

export const subjectByTitle = (title) => Object.values(SUBJECTS).find((s) => s.title === title) || null;

/** Subjects grouped by semester: [[semester, [subject, ...]], ...]. */
export function subjectsBySemester() {
  const groups = new Map();
  for (const s of Object.values(SUBJECTS)) {
    const sem = [].concat(s.semester)[0];
    if (!groups.has(sem)) groups.set(sem, []);
    groups.get(sem).push(s);
  }
  return [...groups.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}

/** A bank question as the builder keeps it. */
export const bankItem = (table, row) => {
  const q = questionFromRow(row, table);
  return {
    kind: 'bank', key: `${table}:${row.id}`, table, id: row.id, topic: q.topic, q: q.q,
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

/** A saved quiz with every item resolved: { quiz, items, missing }. */
export async function loadQuizItems(id) {
  const { quiz, items } = await fetchQuiz(id);
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
  return { quiz, items: out, missing };
}

/** The question shape create_room expects. */
export const roomQuestion = (it) => ({
  q: it.q, options: it.options, answer: it.answer, explanation: it.explanation || '', image: it.images?.[0] || '',
  source_table: it.kind === 'bank' ? it.table : null,
  source_id: it.kind === 'bank' ? it.id : null,
  custom_id: it.kind === 'custom' ? it.customId : null,
});
