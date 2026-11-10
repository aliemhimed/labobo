import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Cross, Flag, InstagramGlyph, Mail } from './Icons.jsx';
import { CONTACT_EMAIL, CONTACT_MAILTO, INSTAGRAM_DM, INSTAGRAM_HANDLE, INSTAGRAM_PROFILE } from '../lib/contact.js';

/* The round "?" in the corner of every student page. It opens a small card
   with the ways to reach us: an Instagram DM, email, and a pointer to the
   per-question report flag for mistakes in a question. */
export default function HelpButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <div className="help" ref={rootRef}>
      {open ? (
        <div className="help-card" role="dialog" aria-labelledby="help-title">
          <div className="help-head">
            <h2 id="help-title">Need help?</h2>
            <button type="button" className="help-close" aria-label="Close" onClick={() => setOpen(false)}>
              <Cross />
            </button>
          </div>
          <p className="help-lede">Questions, bugs or ideas, we read everything.</p>

          <a className="help-option ig" href={INSTAGRAM_DM} target="_blank" rel="noopener noreferrer">
            <span className="help-icon" aria-hidden="true"><InstagramGlyph /></span>
            <span className="help-text">
              <b>Message us on Instagram</b>
              <span>@{INSTAGRAM_HANDLE}</span>
            </span>
          </a>
          <a className="help-option mail" href={CONTACT_MAILTO}>
            <span className="help-icon" aria-hidden="true"><Mail /></span>
            <span className="help-text">
              <b>Email us</b>
              <span>{CONTACT_EMAIL}</span>
            </span>
          </a>

          <p className="help-note">
            <Flag aria-hidden="true" /> Found a mistake in a question? Tap <b>Report a problem</b> on that question.
          </p>
          <a className="help-follow" href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">
            Follow us for new questions and updates
          </a>
        </div>
      ) : null}

      <button type="button" className="help-fab" aria-expanded={open} aria-haspopup="dialog"
              aria-label={open ? 'Close help' : 'Help and contact'} onClick={() => setOpen((o) => !o)}>
        ?
      </button>
    </div>
  );
}
