import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeIcons.jsx';
import ProfileMenu from './ProfileMenu.jsx';

/* Labobo / <subject>: the wordmark leads to all subjects, the subject name
   back to this subject's menu. */
export default function TopBar({ subtitle, onBrandClick, onLogout }) {
  return (
    <header className="appbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/" className="wordmark">Labobo</Link>
        {subtitle ? (
          <>
            <span className="crumb-sep" aria-hidden="true">/</span>
            {onBrandClick ? (
              <button type="button" className="crumb-current" onClick={onBrandClick}>{subtitle}</button>
            ) : (
              <span className="crumb-current">{subtitle}</span>
            )}
          </>
        ) : null}
      </nav>
      <div className="appbar-actions">
        <ThemeToggle />
        <ProfileMenu onSignOut={onLogout} />
      </div>
    </header>
  );
}
