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
