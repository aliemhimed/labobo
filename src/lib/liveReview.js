/* Puts a finished Live quiz into the student's spaced review (lib/srs.js):
   a bank question they got wrong comes back the next day, one they got right
   moves up a box if it was already being reviewed — exactly as after a
   practice set. Only bank questions count (a teacher's own questions are not
   in the bank), and only when the teacher allowed review, because otherwise
   the results carry no question ids. Done once per room on this device; the
   account sync (progressSync.js) carries it to the student's other devices. */
import { SUBJECTS } from './subjects.js';
import { createSubjectStore } from './storage.js';
import { updateSrs } from './srs.js';

const DONE_KEY = (room) => `labobo.live.srs.${room}`;

/** Storage prefixes of every subject that contains this bank table. */
function prefixesFor(table) {
  return [...new Set(Object.values(SUBJECTS).filter((s) => s.sources.some((x) => x.table === table)).map((s) => s.storagePrefix))];
}

/** `results` is the player's GET /api/live?view=results reply. */
export function feedSpacedReview(roomId, results) {
  try {
    if (!results?.review || !Array.isArray(results.answers) || localStorage.getItem(DONE_KEY(roomId))) return;
    const byPrefix = new Map();
    for (const a of results.answers) {
      // Unanswered questions are left alone, as in practice sets.
      if (!a.source_table || a.source_id == null || a.choice == null) continue;
      for (const prefix of prefixesFor(a.source_table)) {
        if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
        byPrefix.get(prefix).push({ id: `${a.source_table}:${a.source_id}`, correct: !!a.correct });
      }
    }
    for (const [prefix, list] of byPrefix) {
      const store = createSubjectStore(prefix);
      store.setSrs(updateSrs(store.getSrs(), list));
    }
    localStorage.setItem(DONE_KEY(roomId), String(Date.now()));
  } catch (e) {
    console.warn('[live] spaced review not updated', e?.message || e);
  }
}
