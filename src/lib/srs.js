/* Spaced review of missed questions.

   A question answered wrong in a practice set, exam or review goes into box 0
   and comes back the next day. Each time it is then answered right it moves
   up a box and waits longer (1, 3, 7, then 21 days); once it clears the last
   box it is learned and stops coming back. A miss at any point sends it back
   to box 0.

   Stored per subject under `<prefix>.srs` as { qid: { box, due, last } }:
   due is an ms timestamp (null once learned), last when it was last
   answered, which is also what the account sync merges on. */

const DAY = 86_400_000;
export const INTERVAL_DAYS = [1, 3, 7, 21];
const LEARNED = INTERVAL_DAYS.length;

// Due at the start of the day it falls on, so "tomorrow" means any time
// tomorrow rather than 24 hours to the minute.
function dueAt(now, days) {
  const d = new Date(now + days * DAY);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** The schedule after one finished set. `results` is [{ id, correct }]. */
export function updateSrs(srs, results, now = Date.now()) {
  const next = { ...srs };
  for (const { id, correct } of results) {
    if (!id) continue;
    const cur = next[id];
    if (!correct) {
      next[id] = { box: 0, due: dueAt(now, INTERVAL_DAYS[0]), last: now };
    } else if (cur && cur.box < LEARNED) {
      const box = cur.box + 1;
      next[id] = { box, due: box >= LEARNED ? null : dueAt(now, INTERVAL_DAYS[box]), last: now };
    }
  }
  return next;
}

/** Ids due for review now. Questions on the wrong-answer list from before
    this schedule existed have no entry yet, so they count as due. */
export function dueIds(srs, wrong, now = Date.now()) {
  const ids = new Set();
  for (const [id, c] of Object.entries(srs)) if (c && c.due != null && c.due <= now) ids.add(id);
  for (const id of Object.keys(wrong)) if (!srs[id]) ids.add(id);
  return [...ids];
}

/** How many come due tomorrow (shown when nothing is due today). */
export function dueTomorrow(srs, now = Date.now()) {
  const end = dueAt(now, 2);
  return Object.values(srs).filter((c) => c && c.due != null && c.due > now && c.due < end).length;
}
