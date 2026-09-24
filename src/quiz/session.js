import { loadSession } from '../lib/storage.js';

/* State of the quiz that is on screen (or was just finished):
     mode      'practice' | 'exam' | 'review-wrong' | 'review-after-exam' | null
     qIds      question positions in the loaded bank, in display order
     answers   [{ qIdx, selected }] parallel to qIds; selected = original option index or null
     index     current position within qIds
     startedAt ms timestamp an exam/practice began (drives the leaderboard time)
     record    the saved result being shown on the results / detail / review screens */
export const initialSession = { mode: null, qIds: [], answers: [], index: 0, startedAt: null, record: null };

const slotsFor = (qIds) => qIds.map((qIdx) => ({ qIdx, selected: null }));

export function sessionReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...initialSession, mode: action.mode, qIds: action.qIds, answers: slotsFor(action.qIds), startedAt: Date.now() };
    case 'select': {
      const answers = state.answers.slice();
      answers[action.slot] = { ...answers[action.slot], selected: action.option };
      return { ...state, answers };
    }
    case 'goto':
      return { ...state, index: action.index };
    case 'finish': // leave the quiz; only the result stays
      return { ...initialSession, record: action.record };
    case 'view-record':
      return { ...state, record: action.record };
    case 'review':
      return {
        ...initialSession,
        mode: 'review-after-exam',
        qIds: action.slots.map((s) => s.qIdx),
        answers: action.slots,
        index: Math.min(action.index || 0, Math.max(0, action.slots.length - 1)),
        record: action.record,
      };
    case 'reset':
      return initialSession;
    default:
      return state;
  }
}

/* Sessions are stored by question id (positions shift when the bank changes)
   and restored on the next visit to the same tab, so a refresh doesn't lose an
   exam in progress. */
export function serializeSession(s, questions) {
  if (!s.mode && !s.record) return null;
  return {
    mode: s.mode,
    ids: s.qIds.map((i) => questions[i]?.id),
    selected: s.answers.map((a) => a.selected),
    index: s.index,
    startedAt: s.startedAt,
    record: s.record,
  };
}

export function restoreSession(prefix, idToIndex) {
  const saved = loadSession(prefix);
  if (!saved) return initialSession;
  const slots = (saved.ids || [])
    .map((id, i) => ({ qIdx: idToIndex.get(id), selected: saved.selected?.[i] ?? null }))
    .filter((s) => s.qIdx !== undefined);
  if (saved.mode && !slots.length) return { ...initialSession, record: saved.record || null };
  return {
    mode: saved.mode || null,
    qIds: slots.map((s) => s.qIdx),
    answers: slots,
    index: Math.min(saved.index || 0, Math.max(0, slots.length - 1)),
    startedAt: saved.startedAt || null,
    record: saved.record || null,
  };
}
