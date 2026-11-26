/* Small pieces every Live screen shares, so the projector, the teacher's
   room and the phones look like one thing (styles in live.css, "lv-"). */

import { useCountdown } from '../../lib/live.js';

export const spacedCode = (code) => (code || '').replace(/^(\d{3})(\d{3})$/, '$1 $2');

/** The room code on a name-tag sticker, like the one on the sign-in page.
    `children` (the QR code) sits beside the code on the projector. */
export function CodeTag({ code, size = 'lg', children }) {
  return (
    <div className={`lv-tag lv-tag-${size}`}>
      <p className="lv-tag-band">{size === 'sm' ? 'studywithlabobo.online/live' : 'Join at studywithlabobo.online/live'}</p>
      <div className="lv-tag-body">
        <p className="lv-tag-code" aria-label={`Room code ${(code || '').split('').join(' ')}`}>{spacedCode(code)}</p>
        {children}
      </div>
    </div>
  );
}

/** Seconds left on a round sticker that empties as time runs out. */
export function TimerSticker({ msLeft, totalMs, paused, size = 'lg' }) {
  const p = totalMs > 0 ? Math.max(0, Math.min(1, msLeft / totalMs)) : 0;
  const secs = Math.ceil(msLeft / 1000);
  return (
    <div className={`lv-timer lv-timer-${size}${p < 0.25 ? ' is-low' : ''}`} style={{ '--p': p }} role="timer"
         aria-label={paused ? 'Paused' : `${secs} seconds left`}>
      <span>{paused ? 'II' : secs}</span>
    </div>
  );
}

/** Where a question is in time: reading (answers not open yet) or answering.
    `total` is the answer time (deadline minus opens_at; double for clinical cases). */
export function useQuestionClock(room, offsetMs) {
  const left = useCountdown(room?.deadline, offsetMs, room?.paused, room?.paused_left_ms);
  const readLeft = useCountdown(room?.opens_at, offsetMs, false, 0);
  const reading = room?.stage === 'question' && !!room?.opens_at && !room?.paused && readLeft > 0;
  const span = room?.opens_at && room?.deadline ? Date.parse(room.deadline) - Date.parse(room.opens_at) : 0;
  const total = span > 0 ? span : Math.max(1, (room?.settings?.seconds || 20) * 1000);
  return { left, readLeft, reading, total };
}

/** Seconds of power-up time left between questions (0 when there is none). */
export function usePowerupLeft(room, offsetMs) {
  const ms = useCountdown(room?.powerup_until, offsetMs, false, 0);
  const on = !!room?.powerup_until && ['reveal', 'leaderboard'].includes(room?.stage) && ms > 0;
  return on ? Math.ceil(ms / 1000) : 0;
}

/** "Answers open in 3": shown while the students read. */
export function ReadingNote({ msLeft, size }) {
  return (
    <p className={`lv-reading${size === 'big' ? ' is-big' : ''}`} role="timer" aria-live="off">
      Answers open in <b>{Math.max(1, Math.ceil(msLeft / 1000))}</b>
    </p>
  );
}

/** A small sticker for clinical cases, which get double answer time. */
export function ClinicalBadge({ question, settings, size }) {
  if (!question?.clinical) return null;
  const double = settings?.clinical_double !== false;
  return <span className={`lv-badge lv-clinical${size === 'big' ? ' is-big' : ''}`}>Clinical case{double ? ' · double time' : ''}</span>;
}
