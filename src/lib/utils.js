export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function shuffle(a) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Like shuffle(), but the same `seed` string always gives the same order
   (FNV-1a hash of the seed feeding a mulberry32 generator). */
export function seededShuffle(a, seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function fmtDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

export function scoreClass(p) {
  return p >= 75 ? 'good' : p >= 50 ? 'warn' : 'bad';
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* Split `total` questions across subjects following the configured ratio.
   Floor everything first, then hand out the remainder highest-ratio first. */
export function distribute(total, ratio) {
  const dist = {};
  const subjects = Object.keys(ratio);
  const ratioTotal = subjects.reduce((sum, s) => sum + ratio[s], 0) || 1;
  let remaining = total;

  subjects.forEach((s) => {
    dist[s] = Math.floor((total * ratio[s]) / ratioTotal);
    remaining -= dist[s];
  });

  const order = subjects.slice().sort((a, b) => ratio[b] - ratio[a]);
  let i = 0;
  while (remaining > 0 && order.length) {
    dist[order[i % order.length]] += 1;
    remaining--;
    i++;
  }
  return dist;
}

/* Pick question indices matching a per-subject distribution. */
export function buildQuizQuestions(distMap, questions) {
  const picks = [];
  Object.keys(distMap).forEach((subject) => {
    const wanted = distMap[subject];
    const pool = questions
      .map((q, i) => ({ q, i }))
      .filter((x) => x.q.subject === subject);
    picks.push(...shuffle(pool).slice(0, Math.min(wanted, pool.length)).map((x) => x.i));
  });
  return shuffle(picks);
}
