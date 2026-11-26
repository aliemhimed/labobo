/* Bank tables as Labobo Live teachers know them: one label per table,
   like "GCT I · Biochemistry". Shared by the quiz builder and the admin
   Teachers tab. */
import { SUBJECTS } from './subjects.js';

const clean = (title) => String(title).replace(/ MCQ$/, '');

/** Label of one source of a SUBJECTS entry. */
const labelOf = (entry, source) => {
  const head = clean(entry.title);
  return source.subject && source.subject !== head ? `${head} · ${source.subject}` : head;
};

/** Every bank table once: [{ table, label }], in SUBJECTS order. */
export function bankTables() {
  const seen = new Set();
  const out = [];
  for (const entry of Object.values(SUBJECTS)) {
    for (const s of entry.sources || []) {
      if (seen.has(s.table)) continue;
      seen.add(s.table);
      out.push({ table: s.table, label: labelOf(entry, s) });
    }
  }
  return out;
}

/** Bank tables grouped by SUBJECTS entry: [{ title, tables: [{ table, label }] }]. A table shows under the first entry that has it. */
export function bankGroups() {
  const seen = new Set();
  const groups = [];
  for (const entry of Object.values(SUBJECTS)) {
    const tables = [];
    for (const s of entry.sources || []) {
      if (seen.has(s.table)) continue;
      seen.add(s.table);
      tables.push({ table: s.table, label: labelOf(entry, s) });
    }
    if (tables.length) groups.push({ title: clean(entry.title), tables });
  }
  return groups;
}

/** table name to label, for lookups. */
export const tableLabelMap = () => new Map(bankTables().map((t) => [t.table, t.label]));

/* Some banks (the bs_* tables) store topic slugs and show them through a
   topicMap. Live's lecture lists carry the stored value; these two helpers
   go between the stored value and the name students read. */
function topicMapFor(table) {
  for (const entry of Object.values(SUBJECTS)) {
    if (entry.topicMap && (entry.sources || []).some((s) => s.table === table)) return entry.topicMap;
  }
  return null;
}

/** The name to show for a stored topic value. */
export const displayTopic = (table, topic) => topicMapFor(table)?.[topic] || topic;

/** The stored value for a topic that may be a display name (old saved quizzes). */
export function storedTopic(table, topic) {
  const map = topicMapFor(table);
  if (!map || Object.prototype.hasOwnProperty.call(map, topic)) return topic;
  return Object.keys(map).find((k) => map[k] === topic) ?? topic;
}
