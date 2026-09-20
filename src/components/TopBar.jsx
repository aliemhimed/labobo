import { Link } from 'react-router-dom';
import { toggleTheme } from '../lib/theme.js';

const SunIcon = () => (
  <svg className="ico-sun" viewBox="0 0 24 24">
    <path d="M12 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 4.5zm0 13.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75zm7.5-7.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5zm-13.5 0a.75.75 0 0 1 0 1.5H4.5a.75.75 0 0 1 0-1.5H6zM17.03 6.97a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0zm-8.48 8.48a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0zm9.54 0a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06zm-8.48-8.48a.75.75 0 0 1 0 1.06L8.543 7.97a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0zM12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="ico-moon" viewBox="0 0 24 24">
    <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75 9.75 9.75 0 0 1 8.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 12a9 9 0 0 0 17.999-.004l-.001-.002-.245.008z" />
  </svg>
);

export default function TopBar({ subtitle, user, onBrandClick, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand" onClick={onBrandClick} role="button" tabIndex={0}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBrandClick?.(); } }}>
        <img src="/theme/app icon.png" className="brand-logo" alt="Labobo" />
        <div className="brand-text">
          <span className="b1">Studywith Labobo</span>
          {subtitle ? <span className="b2">{subtitle}</span> : null}
        </div>
      </div>
      <Link to="/" className="subject-switcher">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span>All Subjects</span>
      </Link>
      <div className="spacer"></div>
      <span className="username">{user?.name ? `Hi, ${user.name}` : ''}</span>
      <button className="icon-btn" title="Toggle theme" aria-label="Toggle theme"
              style={{ position: 'relative' }} onClick={toggleTheme}>
        <SunIcon />
        <MoonIcon />
      </button>
      {user ? (
        <button className="icon-btn" title="Switch user" aria-label="Switch user" onClick={onLogout}>⎋</button>
      ) : null}
    </div>
  );
}
