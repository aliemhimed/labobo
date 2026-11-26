/* Labobo Live power-ups ("spells") for friends' rooms. The server decides who
   holds what (netlify/functions/live.js); this is only the names and the
   copy the screens show.
   kind: attack (acts on a friend's next question), instant (acts at once),
   self (acts on your own next question), shield (blocks the next attack). */
export const SPELLS = {
  cataract: { name: 'Cataract', effect: 'Your question and answers are blurred', explanation: 'Clouding of the lens blurs vision.', rare: false, kind: 'attack' },
  scotoma: { name: 'Scotoma', effect: 'A dark patch hides part of the question', explanation: 'A blind spot in the visual field.', rare: false, kind: 'attack' },
  aphasia: { name: 'Aphasia', effect: 'Letters inside words are scrambled', explanation: 'Brain damage that disrupts language.', rare: false, kind: 'attack' },
  paralysis: { name: 'Paralysis', effect: "You can't answer for the first 5 seconds", explanation: 'Loss of muscle function.', rare: true, kind: 'attack' },
  tachycardia: { name: 'Tachycardia', effect: 'You only get 60% of the time', explanation: 'A heart rate over 100 beats a minute.', rare: true, kind: 'attack' },
  point_steal: { name: 'Point steal', effect: 'Takes 30 points right away', explanation: '', rare: true, kind: 'instant' },
  antidote: { name: 'Antidote', effect: 'Blocks the next spell cast on you', explanation: 'Counteracts a poison.', rare: false, kind: 'shield' },
  second_opinion: { name: 'Second opinion', effect: 'Two wrong answers are removed for you', explanation: "Another doctor's view narrows the diagnosis.", rare: false, kind: 'self' },
  double_or_nothing: { name: 'Double or nothing', effect: 'Double points if right, minus 50 if wrong', explanation: '', rare: true, kind: 'self' },
};

export const spellName = (id) => SPELLS[id]?.name || 'a power-up';

/** Seconds a Paralysis lasts, and the share of time Tachycardia leaves. */
export const PARALYSIS_MS = 5000;
export const TACHYCARDIA_SHARE = 0.6;

/** A small deterministic random generator, so scrambled text stays the same on every render. */
function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

/** Aphasia: scramble the inner letters of each word. First and last letter stay; numbers and words of 3 letters or fewer are unchanged. */
export function scrambleText(text, seed = '') {
  const rand = seeded(`${seed}|${text}`);
  return String(text).replace(/\p{L}+/gu, (w) => {
    const chars = [...w];
    if (chars.length <= 3) return w;
    const inner = chars.slice(1, -1);
    for (let tries = 0; tries < 3; tries++) {
      for (let i = inner.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [inner[i], inner[j]] = [inner[j], inner[i]];
      }
      if (inner.join('') !== chars.slice(1, -1).join('')) break;
    }
    return chars[0] + inner.join('') + chars[chars.length - 1];
  });
}
