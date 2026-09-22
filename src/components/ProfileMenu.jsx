import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, signOut } from '../lib/auth.jsx';
import { useProfile } from '../hooks/useProfile.js';

const SEMESTER_LABEL = { '1': 'Semester 1', '2': 'Semester 2' };

/** Account menu: avatar button top-right, opening a small card with the
    signed-in user's name/email, their semester, and account actions.
    `onSignOut`, if given, replaces the default plain sign-out (QuizEngine
    passes one that confirms and clears the in-progress quiz first). */
export default function ProfileMenu({ onSignOut }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const name = profile?.username || user.user_metadata?.full_name || user.email || 'Account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  async function handleSignOut() {
    setOpen(false);
    if (onSignOut) onSignOut();
    else await signOut();
  }

  return (
    <div className="profile-menu" ref={rootRef}>
      <button type="button" className="profile-avatar" onClick={() => setOpen((o) => !o)}
              aria-haspopup="true" aria-expanded={open} aria-label={`Account menu for ${name}`}>
        {initial}
      </button>
      {open ? (
        <div className="profile-dropdown" role="menu">
          <div className="profile-id">
            <div className="profile-name">{name}</div>
            {user.email ? <div className="profile-email">{user.email}</div> : null}
          </div>
          {profile?.semester ? (
            <div className="profile-semester">{SEMESTER_LABEL[profile.semester] || `Semester ${profile.semester}`}</div>
          ) : null}
          <Link to="/select-semester" className="profile-item" role="menuitem" onClick={() => setOpen(false)}>
            Change semester
          </Link>
          <button type="button" className="profile-item danger" role="menuitem" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
