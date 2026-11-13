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

/** The lecture or week number in a topic name ("Biochem Wk 10: …",
    "Histo Lec 3: …", "Lecture 2 - …"), or null when it has none (past
    papers, cases, topics named without a number). */
export function lectureNumber(topic) {
  const m = /(?:Lec|Wk|Lecture)\s+0?(\d+)/.exec(topic || '');
  return m ? Number(m[1]) : null;
}

/* How many questions each subject gives to a set of `total`, when each has
   only `pools[subject]` to give. The ratio is followed across the subjects
   that have any; what a small subject can't supply goes to the others, so
   the set is as close to `total` as the selection allows. */
export function planSet(total, ratio, pools) {
  const open = {};
  Object.keys(ratio).forEach((s) => { if ((pools[s] || 0) > 0) open[s] = ratio[s]; });
  const plan = Object.fromEntries(Object.keys(open).map((s) => [s, 0]));
  let want = Math.min(total, Object.keys(open).reduce((n, s) => n + pools[s], 0));
  while (want > 0 && Object.keys(open).length) {
    const share = distribute(want, open);
    let given = 0;
    Object.keys(open).forEach((s) => {
      const take = Math.min(share[s], pools[s] - plan[s]);
      plan[s] += take;
      given += take;
      if (plan[s] >= pools[s]) delete open[s];
    });
    if (!given) break;
    want -= given;
  }
  return plan;
}

/** Topic key used wherever lectures are selected: "Subject::Topic". */
export const topicKey = (q) => `${q.subject}::${q.topic}`;

/* Pick `total` question indices from the chosen lectures only (`selected` is
   a Set of topic keys), split across subjects as planSet decides. */
export function buildQuizFromTopics(total, ratio, questions, selected) {
  const pools = {};
  questions.forEach((q, i) => {
    if (selected.has(topicKey(q))) (pools[q.subject] ||= []).push(i);
  });
  const sizes = Object.fromEntries(Object.entries(pools).map(([s, list]) => [s, list.length]));
  const plan = planSet(total, ratio, sizes);
  const picks = [];
  Object.entries(plan).forEach(([s, n]) => picks.push(...shuffle(pools[s]).slice(0, n)));
  return shuffle(picks);
}
