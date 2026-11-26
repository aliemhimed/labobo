import { useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import LiveApp from './live/LiveApp.jsx';

/* Development only (and builds made with VITE_LIVE_DEMO=1): the Labobo Live
   screens with made-up data, so they can be designed without signing in or
   running a real room. /api/live is answered here by a fake fetch; nothing
   reaches the server. The public build has neither this page nor its route.

   /dev/live/screens               the list of screens
   /dev/live/<live path>?s=<scene> that Live screen in that scene */

const ROOM = '00000000-0000-4000-8000-000000000001';
const now = () => new Date().toISOString();
const inSec = (s) => new Date(Date.now() + s * 1000).toISOString();

const Q = {
  position: 2, q: 'A 6-year-old has bloody diarrhoea and, a week later, low platelets and rising creatinine. Which toxin is most likely responsible?',
  options: ['Shiga toxin', 'Cholera toxin', 'Botulinum toxin', 'Tetanospasmin'], image: '',
};
const ROSTER = ['Sara Haddad', 'Omar Khalil', 'Nino Beridze', 'Luka Kapanadze', 'Amira Saleh', 'Giorgi Lomidze', 'Mariam Aziz', 'Dato Gelashvili']
  .map((n, i) => ({ user_id: `u${i}`, name: n, email: `${n.split(' ')[0].toLowerCase()}@eu.edu.ge`, nickname: ['Ace', '', 'Nini', '', 'Mira', 'Gio', '', 'Dato'][i],
    shown: ['Ace', 'Omar', 'Nini', 'Luka', 'Mira', 'Gio', 'Mariam', 'Dato'][i], score: [372, 340, 311, 298, 260, 214, 180, 95][i], correct: [4, 4, 4, 3, 3, 3, 2, 1][i],
    away: i === 6 ? 2 : 0, online: i !== 7, answered: i < 5 }));
const TEAMS = [
  { no: 1, name: 'Neurons', score: 540, correct: 6, rank: 1, answered: true, captain: 'u0', members: ROSTER.slice(0, 3) },
  { no: 2, name: 'Team 2', score: 410, correct: 5, rank: 2, answered: false, captain: 'u3', members: ROSTER.slice(3, 6) },
  { no: 3, name: 'Synapses', score: 320, correct: 4, rank: 3, answered: true, captain: 'u6', members: ROSTER.slice(6) },
];
const settings = (mode = 'individual') => ({ mode, seconds: 20, names: 'nicknames', leaderboard: 'top5', review: true, advance: 'teacher', team_size: 3 });

function roomState(scene, role) {
  const team = scene.includes('team');
  const cases = scene.includes('case');
  const stage = cases ? (scene === 'case-lobby' ? 'lobby' : 'cases')
    : scene.includes('lobby') ? 'lobby' : scene.includes('reveal') ? 'reveal' : scene.includes('board') ? 'leaderboard' : scene.includes('finished') ? 'finished' : 'question';
  const base = {
    role, server_now: now(), players: ROSTER.length,
    room: { id: ROOM, code: '482915', title: 'Biochem Wk 10: Enzymes', stage, current: stage === 'lobby' ? -1 : 2, total: 10,
      deadline: stage === 'question' ? inSec(14) : null, paused: false, paused_left_ms: null, locked: false,
      settings: settings(cases ? 'cases' : team ? 'teams' : 'individual') },
  };
  if (stage !== 'lobby' && !cases) base.question = Q;
  if (['reveal', 'leaderboard', 'finished'].includes(stage)) base.reveal = { answer: 0, explanation: 'Shiga toxin (E. coli O157:H7) damages glomerular endothelium, causing haemolytic uraemic syndrome.', counts: { answered: 7, by_option: { 0: 4, 1: 2, 3: 1 } } };
  const board = (team ? TEAMS : ROSTER.slice(0, 5)).map((x, i) => ({ rank: i + 1, name: x.shown || x.name, score: x.score, correct: x.correct }));
  if (['leaderboard', 'finished'].includes(stage)) base.board = board;
  if (role === 'host') {
    base.roster = ROSTER;
    base.counts = { answered: team ? 2 : 5, by_option: { 0: 3, 1: 1, 3: 1 } };
    if (team || cases) base.teams = TEAMS;
  } else {
    base.me = { kicked: false, nickname: 'Ace', score: 372, correct: 4, rank: 1,
      answer: stage === 'question' ? (scene.includes('answered') ? { choice: 0 } : null) : { choice: 0, correct: true, points: 87 } };
    if (team || cases) {
      base.team = { no: 1, name: 'Neurons', name_status: 'chosen', namer: 'u0', am_namer: true, namer_name: 'Ace', rank: 1, score: 540, teams: 3,
        captain: scene.includes('advisor') ? 'u1' : 'u0', am_captain: !scene.includes('advisor'), members: TEAMS[0].members,
        votes: [{ user_id: 'u1', shown: 'Omar', choice: 0 }, { user_id: 'u2', shown: 'Nini', choice: 1 }],
        answer: stage === 'question' ? null : { choice: 0, auto: false, correct: true, points: 87 } };
    }
  }
  return base;
}

const CASES_HOST = {
  role: 'host', stage: 'cases', released: false, total: 3,
  cases: [
    { position: 0, scenario: 'A 54-year-old man has crushing chest pain for 40 minutes, sweating and nausea. BP 100/60.', questions: [
      { kind: 'options', q: 'Most likely diagnosis?', options: ['Acute MI', 'GERD', 'Pulmonary embolism', 'Aortic dissection'], answer: 0, max: 5 },
      { kind: 'open', q: 'Which test do you order first, and why?', max: 10 }] },
    { position: 1, scenario: 'A 7-year-old has fever, a strawberry tongue and a sandpaper rash.', questions: [{ kind: 'open', q: 'Diagnosis and first treatment?', max: 5 }] },
    { position: 2, scenario: 'A 30-year-old woman has fatigue, cold intolerance and weight gain.', questions: [{ kind: 'options', q: 'First test?', options: ['TSH', 'Cortisol', 'HbA1c'], answer: 0, max: 5 }] },
  ],
  teams: TEAMS.map((t, i) => ({ no: t.no, name: t.name, done: [2, 1, 3][i], totals: { marks: [12, 0, 15][i], max: 25 }, members: t.members.map((m) => m.name),
    answers: [{ position: 0, submitted: true, submitted_at: now(), answers: [{ choice: i === 1 ? 2 : 0, text: 'ST elevation in II, III, aVF' }, { choice: null, text: 'ECG first: fastest way to see ST elevation, then troponin.' }],
      marks: i === 0 ? [{ mark: 5, comment: 'Right' }, { mark: 7, comment: 'Mention troponin timing' }] : [] }] })),
};
const CASES_PLAYER = {
  role: 'player', stage: 'cases', released: false, total: 3, done: 1,
  current: { position: 1, scenario: CASES_HOST.cases[1].scenario, questions: [{ kind: 'open', q: 'Diagnosis and first treatment?', max: 5 }],
    draft: { answers: [{ choice: null, text: 'Scarlet fever: start penicillin V' }], updated_by: 'u1', updated_at: now() } },
};

const BANK = Array.from({ length: 14 }, (_, i) => ({ id: 100 + i, ord: i, topic: i < 8 ? 'Biochem Wk 10: Enzymes and Kinetics' : 'Biochem Wk 11: Glycolysis',
  q: ['Enzymes increase reaction rate by:', 'Which is NOT one of the six IUBMB enzyme classes?', 'Km is the substrate concentration at:'][i % 3],
  options: ['Lowering the activation energy', 'Raising the activation energy', 'Changing the equilibrium', 'Being consumed'], answer: 0, explanation: '' }));

function fakeLive(path, scene) {
  const url = new URL(path, location.origin);
  const view = url.searchParams.get('view');
  const host = !url.pathname.includes('play') && !scene.startsWith('play');
  switch (view) {
    case 'me': return { teacher: true, can_host: true, subjects: ['gct_biochemistry', 'gct_genetics'], uni_email: 'ace@eu.edu.ge' };
    case 'quizzes': return { quizzes: [{ id: 'q1', title: 'Week 10 revision', subject: 'GCT I · Biochemistry', updated_at: now(), count: 10, settings: {} },
      { id: 'q2', title: 'Midterm warm-up', subject: 'GCT I · Biochemistry, GCT I · Medical Genetics', updated_at: now(), count: 25, settings: {} }] };
    case 'case_sets': return { sets: [{ id: 'c1', title: 'Chest pain cases', subject: '', updated_at: now(), count: 3 }] };
    case 'hosted': return { rooms: [{ room: ROOM, title: 'Biochem Wk 10: Enzymes', code: '482915', stage: 'finished', date: now(), total: 10, players: 34, average: 236, mode: 'individual' },
      { room: 'r2', title: 'Chest pain cases', code: '113052', stage: 'cases', date: now(), total: 3, players: 9, average: 0, mode: 'cases' }] };
    case 'history': return { sessions: [{ room: ROOM, title: 'Biochem Wk 10: Enzymes', date: now(), total: 10, score: 372, correct: 4, rank: 1, players: 34, mode: 'individual' }] };
    case 'bank': return { tables: Object.fromEntries((url.searchParams.get('tables') || '').split(',').map((t) => [t, BANK])) };
    case 'quiz': return { quiz: { id: 'q1', title: 'Week 10 revision', subject: 'GCT I · Biochemistry', settings: { pool: [{ table: 'gct_biochemistry', topic: 'Biochem Wk 10: Enzymes and Kinetics' }], count: 10 } }, items: [] };
    case 'state': return roomState(scene, host ? 'host' : 'player');
    case 'cases': return host ? CASES_HOST : CASES_PLAYER;
    case 'results': return { room: { id: ROOM, title: 'Biochem Wk 10: Enzymes', code: '482915', stage: 'finished', created_at: now(), total: 10, settings: settings() },
      players: ROSTER.map((p, i) => ({ ...p, rank: i + 1, total_ms: 40000 })), average: 259,
      questions: [{ position: 0, q: Q.q, options: Q.options, answer: 0, answered: 31, correct: 22, counts: { 0: 22, 1: 6, 3: 3 } }] };
    default: return { status: 'ok' };
  }
}

let installed = false;
function installFakeApi(getScene) {
  if (installed) return;
  installed = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const path = typeof input === 'string' ? input : input.url;
    if (path.startsWith('/api/live')) {
      await new Promise((r) => setTimeout(r, 120));
      return new Response(JSON.stringify(fakeLive(path, getScene())), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return real(input, init);
  };
}

const SCREENS = [
  ['Teacher home', '/dev/live/teach', ''],
  ['Quiz builder', '/dev/live/teach/quiz/new', ''],
  ['Room setup', '/dev/live/teach/start/q1', ''],
  ['Teacher room: lobby', `/dev/live/teach/room/${ROOM}`, 'lobby'],
  ['Teacher room: question', `/dev/live/teach/room/${ROOM}`, 'question'],
  ['Teacher room: reveal', `/dev/live/teach/room/${ROOM}`, 'reveal'],
  ['Teacher room: teams question', `/dev/live/teach/room/${ROOM}`, 'team-question'],
  ['Teacher room: cases', `/dev/live/teach/room/${ROOM}`, 'case-work'],
  ['Projector: lobby', `/dev/live/screen/${ROOM}`, 'lobby'],
  ['Projector: question', `/dev/live/screen/${ROOM}`, 'question'],
  ['Projector: reveal', `/dev/live/screen/${ROOM}`, 'reveal'],
  ['Projector: leaderboard', `/dev/live/screen/${ROOM}`, 'board'],
  ['Projector: team podium', `/dev/live/screen/${ROOM}`, 'team-finished'],
  ['Host a game (pass holders)', '/dev/live/host', ''],
  ['Join page', '/dev/live', 'join'],
  ['Phone: lobby', `/dev/live/play/${ROOM}`, 'play-lobby'],
  ['Phone: question', `/dev/live/play/${ROOM}`, 'play-question'],
  ['Phone: answered', `/dev/live/play/${ROOM}`, 'play-question-answered'],
  ['Phone: reveal', `/dev/live/play/${ROOM}`, 'play-reveal'],
  ['Phone: team captain', `/dev/live/play/${ROOM}`, 'play-team-question'],
  ['Phone: team advisor', `/dev/live/play/${ROOM}`, 'play-team-question-advisor'],
  ['Phone: case', `/dev/live/play/${ROOM}`, 'play-case-work'],
  ['Results (teacher)', `/dev/live/results/${ROOM}`, ''],
];

function Index() {
  return (
    <main style={{ padding: 24, maxWidth: 640 }}>
      <h1>Labobo Live screens (demo data)</h1>
      <ul>{SCREENS.map(([name, path, s]) => <li key={name}><Link to={`${path}${s ? `?s=${s}` : ''}`}>{name}</Link></li>)}</ul>
    </main>
  );
}

export default function DevLivePreview() {
  const location = useLocation();
  const [scene] = useState(() => new URLSearchParams(location.search).get('s') || '');
  installFakeApi(() => new URLSearchParams(window.location.search).get('s') || scene);
  return (
    <Routes>
      <Route path="screens" element={<Index />} />
      <Route path="*" element={<LiveApp />} />
    </Routes>
  );
}
