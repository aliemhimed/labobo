import { useEffect, useState, useSyncExternalStore } from 'react';
import { installMode, promptInstall, subscribeInstall } from '../lib/install.js';

const DISMISS_KEY = 'labobo.install-dismissed';
const SNOOZE_MS = 14 * 86400000;
const SHOW_AFTER_MS = 2500;

export function useInstallMode() {
  return useSyncExternalStore(subscribeInstall, installMode, () => null);
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

/* iOS Share glyph (square with an arrow out of the top). */
function ShareIcon() {
  return (
    <svg className="install-share" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

/** Bottom banner inviting the visitor to install Labobo as an app. Appears a
    moment after load, never inside the installed app, and stays away for two
    weeks after "Not now". */
export default function InstallPrompt() {
  const mode = useInstallMode();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mode || snoozed()) { setVisible(false); return undefined; }
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [mode]);

  if (!visible || !mode) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="install-banner" role="dialog" aria-labelledby="install-title">
      <img src="/theme/icon-192.png" alt="" width="52" height="52" className="install-icon" />
      <div className="install-text">
        <strong id="install-title">Get the Labobo app</strong>
        {mode === 'ios' ? (
          <span>Tap <ShareIcon /> <b>Share</b>, then <b>Add to Home Screen</b>.</span>
        ) : (
          <span>Full screen, one tap from your home screen.</span>
        )}
      </div>
      <div className="install-actions">
        {mode === 'prompt' ? (
          <button type="button" className="btn primary sm" onClick={() => promptInstall()}>Install</button>
        ) : null}
        <button type="button" className="btn ghost sm" onClick={dismiss}>{mode === 'ios' ? 'Got it' : 'Not now'}</button>
      </div>
    </div>
  );
}
