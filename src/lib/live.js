/* Labobo Live on the client: API calls, the realtime connection and the
   shared clock. Screens (src/pages/live/) build on useLiveRoom().

   How a room stays in sync (see the architecture doc):
   - The server is the truth. GET /api/live?view=state returns the room as
     it is now; every screen draws from that.
   - Realtime Broadcast only nudges: each event is applied at once for a
     snappy screen, then the state is re-read (with a little random delay so
     35 phones don't all ask in the same millisecond).
   - Missed messages don't matter: reconnecting, coming back to the tab or
     coming back online re-reads the state.
   - Deadlines come from the server. The phone works out how far its clock is
     from the server's (offset), so every countdown shows the same time.
   - Channels are private: Realtime checks live_can_listen() with the
     student's token, and only the server can send on them. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeClient } from '@supabase/realtime-js';
import { SUPA_URL, SUPA_KEY } from './supabaseConfig.js';
import { supabase, authHeader } from './supabaseClient.js';

// ── API ──────────────────────────────────────────────────────────────

export class LiveError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(method, query = '', body) {
  const headers = { ...(await authHeader()) };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/live${query}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LiveError(data.error || `Live request failed (${res.status})`, res.status, data.code);
  return data;
}

export const liveGet = (params) => call('GET', `?${new URLSearchParams(params)}`);
export const livePost = (action, extra = {}) => call('POST', '', { action, ...extra });

export const fetchLiveMe = () => liveGet({ view: 'me' });
export const fetchBank = (tables) => liveGet({ view: 'bank', tables: tables.join(',') });
export const fetchQuizzes = () => liveGet({ view: 'quizzes' });
export const fetchQuiz = (id) => liveGet({ view: 'quiz', id });
export const fetchHosted = () => liveGet({ view: 'hosted' });
export const fetchHistory = () => liveGet({ view: 'history' });
export const fetchResults = (room) => liveGet({ view: 'results', room });
export const saveQuiz = (quiz) => livePost('save_quiz', quiz);
export const deleteQuiz = (id) => livePost('delete_quiz', { id });
export const createRoom = (room) => livePost('create_room', room);
export const joinRoom = (code, nickname) => livePost('join', { code, nickname });

/** Settings a new room starts with (the "More options" defaults). */
export const DEFAULT_SETTINGS = Object.freeze({ seconds: 20, names: 'nicknames', leaderboard: 'top5', review: true, advance: 'teacher', mode: 'individual', team_size: 3 });
export const SECONDS_CHOICES = [10, 15, 20, 30, 45, 60, 90];

const LAST_SETTINGS_KEY = 'labobo.live.lastSettings';
/** The teacher's last room settings, so the setup screen remembers them. */
export function lastSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LAST_SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function rememberSettings(s) {
  try { localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify(s)); } catch { /* blocked */ }
}

// ── Realtime ─────────────────────────────────────────────────────────

let realtime = null;
function realtimeClient() {
  if (!realtime) {
    realtime = new RealtimeClient(`${SUPA_URL.replace(/^http/, 'ws')}/realtime/v1`, {
      params: { apikey: SUPA_KEY },
      // A fresh token on every (re)connect, so private channels keep working
      // after the session refreshes.
      accessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
    });
  }
  return realtime;
}

/** Subscribe to one private topic. Returns an unsubscribe function. */
function listen(topic, onEvent, onStatus) {
  const channel = realtimeClient().channel(topic, { config: { private: true } });
  channel.on('broadcast', { event: '*' }, (msg) => onEvent(msg.event, msg.payload || {}));
  channel.subscribe((status) => onStatus?.(status));
  return () => { realtimeClient().removeChannel(channel); };
}

// ── Clock ────────────────────────────────────────────────────────────

/** Milliseconds left until `deadline` on the server's clock. */
export function msLeft(deadline, offsetMs) {
  if (!deadline) return 0;
  return Date.parse(deadline) - (Date.now() + offsetMs);
}

/** Re-renders about 10 times a second while a countdown runs. */
export function useCountdown(deadline, offsetMs, paused, pausedLeftMs) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!deadline || paused) return undefined;
    const t = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [deadline, paused]);
  if (paused) return Math.max(0, pausedLeftMs ?? 0);
  return Math.max(0, msLeft(deadline, offsetMs));
}

// ── The room hook ────────────────────────────────────────────────────

const GRACE_MS = 1000;

/**
 * Keeps one room's state in sync. `asHost` also listens to the host topic
 * (joins, answer counts, who left the app).
 * Returns { state, error, offsetMs, connected, refresh, act }.
 *   act(action, extra) posts an action for this room and re-reads the state.
 */
export function useLiveRoom(roomId, { asHost = false } = {}) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const offsetRef = useRef(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const refreshTimer = useRef(null);
  const closing = useRef(null);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const t0 = Date.now();
      const s = await liveGet({ view: 'state', room: roomId });
      const t1 = Date.now();
      if (s.server_now) {
        offsetRef.current = Date.parse(s.server_now) - (t0 + t1) / 2;
        setOffsetMs(offsetRef.current);
      }
      setState(s);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [roomId]);

  /** Re-read soon; `spreadMs` spreads 35 phones over a short window. */
  const refreshSoon = useCallback((spreadMs = 0) => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 80 + Math.random() * spreadMs);
  }, [refresh]);

  // First load, and again whenever the student comes back.
  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refresh);
      clearTimeout(refreshTimer.current);
    };
  }, [refresh]);

  // Realtime. Events are applied at once, then the state is re-read.
  useEffect(() => {
    if (!roomId) return undefined;
    let me = null;
    supabase.auth.getSession().then(({ data }) => { me = data.session?.user?.id ?? null; });
    let unsubs = [];
    const onRoomEvent = (event, payload) => {
      // Removed by the teacher: leave the room's channel at once, then show it.
      if (event === 'kicked' && payload.user && payload.user === me) {
        unsubs.forEach((u) => u());
        unsubs = [];
        setConnected(false);
        refresh();
        return;
      }
      setState((s) => {
        if (!s) return s;
        if (event === 'question') {
          return {
            ...s, reveal: undefined, board: undefined,
            question: payload.question,
            room: { ...s.room, stage: 'question', current: payload.question?.position ?? s.room.current, deadline: payload.deadline, paused: false },
            me: s.me ? { ...s.me, answer: null } : s.me,
          };
        }
        // In auto mode the room's deadline becomes "next question at".
        if (event === 'reveal') return { ...s, reveal: { answer: payload.answer, explanation: payload.explanation, counts: payload.counts }, room: { ...s.room, stage: 'reveal', deadline: payload.next_at ?? s.room.deadline } };
        if (event === 'leaderboard') return { ...s, board: payload.board, room: { ...s.room, stage: 'leaderboard', deadline: payload.next_at ?? s.room.deadline } };
        if (event === 'finished') return { ...s, board: payload.board, room: { ...s.room, stage: 'finished' } };
        if (event === 'paused') return { ...s, room: { ...s.room, paused: true } };
        if (event === 'resumed') return { ...s, room: { ...s.room, paused: false, deadline: payload.deadline ?? s.room.deadline } };
        return s;
      });
      // Players spread their re-reads over half a second; the host needs none.
      refreshSoon(asHost ? 0 : 500);
    };
    unsubs = [listen(`live:${roomId}`, onRoomEvent, (status) => {
      const ok = status === 'SUBSCRIBED';
      setConnected(ok);
      if (ok) refresh(); // anything missed while disconnected
    })];
    if (asHost) {
      // Joins, answers and "left the app" come often; one re-read covers a burst.
      unsubs.push(listen(`live-host:${roomId}`, () => refreshSoon(400)));
    }
    return () => unsubs.forEach((u) => u());
  }, [roomId, asHost, refresh, refreshSoon]);

  // Team rooms: listen to the student's own team (advisors' picks, the
  // captain's answer). The server only lets team members listen.
  const teamNo = state?.team?.no;
  useEffect(() => {
    if (asHost || !roomId || teamNo == null) return undefined;
    return listen(`live-team:${roomId}:${teamNo}`, () => refreshSoon(150));
  }, [asHost, roomId, teamNo, refreshSoon]);

  // Close the question once its time is up. The host closes right at the
  // deadline; players only after the grace, spread out, so the game moves
  // on even if the teacher's laptop has dropped. The server ignores extras.
  const room = state?.room;
  useEffect(() => {
    clearTimeout(closing.current);
    if (!room || room.stage !== 'question' || room.paused || !room.deadline) return undefined;
    const wait = msLeft(room.deadline, offsetRef.current) + (asHost ? 150 : GRACE_MS + 300 + Math.random() * 1500);
    closing.current = setTimeout(async () => {
      try { await livePost('close', { room: roomId }); } catch { /* someone else closed it */ }
      refreshSoon(asHost ? 0 : 500);
    }, Math.max(0, wait));
    return () => clearTimeout(closing.current);
  }, [room?.stage, room?.paused, room?.deadline, room?.current, roomId, asHost, refreshSoon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto mode: when the reveal's time is up, ask the server for the next
  // question. The host asks first; players a moment later, spread out, so the
  // quiz goes on even if the teacher's laptop has dropped.
  const advancing = useRef(null);
  const auto = room?.settings?.advance === 'auto';
  useEffect(() => {
    clearTimeout(advancing.current);
    if (!room || !auto || room.paused || !room.deadline || !['reveal', 'leaderboard'].includes(room.stage)) return undefined;
    const wait = msLeft(room.deadline, offsetRef.current) + (asHost ? 100 : 1000 + Math.random() * 1500);
    advancing.current = setTimeout(async () => {
      try { await livePost('auto_next', { room: roomId }); } catch { /* someone else did */ }
      refreshSoon(asHost ? 0 : 500);
    }, Math.max(0, wait));
    return () => clearTimeout(advancing.current);
  }, [room?.stage, room?.paused, room?.deadline, auto, roomId, asHost, refreshSoon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Players: tell the teacher when the student leaves the app mid-question.
  useEffect(() => {
    if (asHost || !roomId) return undefined;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && room?.stage === 'question') {
        livePost('away', { room: roomId }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [asHost, roomId, room?.stage]);

  const act = useCallback(async (action, extra = {}) => {
    const out = await livePost(action, { room: roomId, ...extra });
    refreshSoon(0);
    return out;
  }, [roomId, refreshSoon]);

  return { state, error, offsetMs, connected, refresh, act };
}

/** Seconds until the next question in auto mode, or null when not counting down. */
export function useAutoNext(state, offsetMs) {
  const r = state?.room;
  const on = r?.settings?.advance === 'auto' && !r?.paused && ['reveal', 'leaderboard'].includes(r?.stage) && r?.current < r?.total - 1;
  const left = useCountdown(on ? r.deadline : null, offsetMs, false, 0);
  return on ? Math.ceil(left / 1000) : null;
}
