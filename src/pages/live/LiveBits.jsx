/* Small pieces every Live screen shares, so the projector, the teacher's
   room and the phones look like one thing (styles in live.css, "lv-"). */

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
