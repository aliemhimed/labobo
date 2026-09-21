import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../lib/storage.js';
import { toggleTheme } from '../lib/theme.js';
import { registerUser, createGuest } from '../lib/user.js';
import { SunIcon, MoonIcon } from '../components/ThemeIcons.jsx';

const MedArtIcon = () => (
  /* Paintbrush + stethoscope: the arms form a Y at the top, the tube curves
     down into a brush handle with the ferrule and bristles bottom-right. */
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="17" cy="4" r="1.6" fill="currentColor" stroke="none" />
    <path d="M7 5.5v4.5a5 5 0 0 0 10 0V5.5" />
    <path d="M12 14.5v3.5a4 4 0 0 0 4 4l4.2 0" />
    <rect x="19.5" y="20.6" width="5" height="3" rx="0.7" transform="rotate(45 22 22.1)"
          fill="currentColor" stroke="none" />
    <path d="M23.5 22.5l5.5 5.5M22 23.8l5.2 5.2M20.6 25.3l4 4" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="27.5" cy="20" r="0.9" fill="currentColor" stroke="none" opacity="0.65" />
    <circle cx="29" cy="22.7" r="0.55" fill="currentColor" stroke="none" opacity="0.45" />
  </svg>
);

const CARDS = [
  { to: '/gct', cls: 'gct', icon: '🧬', name: 'GCT I',
    desc: 'Molecular Biology, Biochemistry, Histology & Medical Genetics' },
  { to: '/body-systems', cls: 'bs', icon: '🫀', name: 'Body Systems',
    desc: 'Anatomy, Physiology & Medical Imaging' },
  { to: '/chemistry', cls: 'chem', icon: '⚗️', name: 'Medical Chemistry',
    desc: 'Matter, Thermodynamics, Kinetics, Solutions, Acids & Bases' },
  { to: '/physics', cls: 'phys', icon: '⚡', name: 'Medical Physics',
    desc: 'Biomechanics, Waves, Sound, Hydrodynamics & more' },
  { to: '/clinical', cls: 'clin', icon: '💉', name: 'Clinical & Prof. Skills 1',
    desc: 'Injections, Infection Control, Drug Administration & Vital Signs' },
  { to: '/medicine-art', cls: 'medart', icon: <MedArtIcon />, name: 'Medicine & Art',
    desc: 'Art & Anatomy, Doctors in Art, Photography, AIDS Art & Healing' },
];

export default function HomePage() {
  const [user, setUserState] = useState(() => getUser());
  const [fading, setFading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { document.title = 'Studywith Labobo'; }, []);

  function reveal(u) {
    setFading(true);
    setTimeout(() => setUserState(u), 240);
  }

  function start() {
    const name = inputRef.current.value.trim();
    if (!name) { inputRef.current.focus(); return; }
    reveal(registerUser(name));
  }

  function skip() {
    reveal(createGuest());
  }

  const greeting =
    user && user.name && user.name !== 'Guest'
      ? `Hey ${user.name}, pick your subject 👇`
      : 'Choose your subject';

  return (
    <>
      <button className="theme-toggle" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
        <SunIcon className="icon-sun" />
        <MoonIcon className="icon-moon" />
      </button>

      <div className="wrap">
        <div className="brand">
          <img src="/theme/app-icon.webp" className="brand-icon" alt="Labobo" width="68" height="68" />
          <div className="brand-words">
            <span className="brand-name">Studywith Labobo</span>
            <span className="brand-tagline">Study smart. Stay ahead. Ace together.</span>
          </div>
        </div>

        {!user ? (
          <>
            <div className="mascot-wrap">
              <img src="/theme/mascot.webp" alt="Labobo mascot" draggable="false" width="85" height="128" />
            </div>
            <div className={'name-card' + (fading ? ' fade-out' : '')}>
              <h2>Welcome! 👋</h2>
              <p>
                Enter your name to track your scores and progress across sessions.
                Or skip to study without saving.
              </p>
              <input ref={inputRef} type="text" aria-label="Your name" placeholder="Your name (e.g., Ali)"
                     autoComplete="off" autoFocus
                     onKeyDown={(e) => { if (e.key === 'Enter') start(); }} />
              <button className="btn-primary" onClick={start}>Get Started →</button>
              <button className="btn-ghost" onClick={skip}>Continue without saving</button>
            </div>
          </>
        ) : (
          <div className="subject-wrap visible">
            <div className="subject-greeting">{greeting}</div>
            <p className="subject-sub">Select what you want to study today</p>
            <div className="subject-grid">
              {CARDS.map((c) => (
                <Link key={c.to} to={c.to} className={'subject-card ' + c.cls}>
                  <div className="subject-icon">{c.icon}</div>
                  <div className="subject-name">{c.name}</div>
                  <div className="subject-desc">{c.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
