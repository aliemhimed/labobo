import { Link } from 'react-router-dom';
import { toggleTheme } from '../lib/theme.js';
import { SunIcon, MoonIcon } from './ThemeIcons.jsx';

export default function TopBar({ subtitle, user, onBrandClick, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand" onClick={onBrandClick} role="button" tabIndex={0}
           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBrandClick?.(); } }}>
        <img src="/theme/app-icon.webp" className="brand-logo" alt="Labobo" width="32" height="32" />
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
        <SunIcon className="ico-sun" />
        <MoonIcon className="ico-moon" />
      </button>
      {user ? (
        <button className="icon-btn" title="Switch user" aria-label="Switch user" onClick={onLogout}>⎋</button>
      ) : null}
    </div>
  );
}
