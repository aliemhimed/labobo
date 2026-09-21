import { useRef, useState } from 'react';
import { registerUser, createGuest } from '../lib/user.js';

export default function Welcome({ config, totalQuestions, onReady }) {
  const [warned, setWarned] = useState(false);
  const inputRef = useRef(null);

  function register() {
    const name = inputRef.current.value.trim();
    if (!name) { inputRef.current.focus(); return; }
    onReady(registerUser(name));
  }

  function skip() {
    if (!warned) { setWarned(true); return; }
    onReady(createGuest());
  }

  return (
    <div className="container center-wrap">
      <div className="card welcome-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="welcome-hero">
          <img src="/theme/mascot.webp" className="mascot-hero" alt="Labobo" width="92" height="92" />
          <h1>{config.title}</h1>
          <p>{totalQuestions} {config.tagline}</p>
        </div>
        <div className="welcome-body">
          <h3 style={{ marginBottom: 4 }}>Register to track your progress</h3>
          <p style={{ marginBottom: 14 }}>
            Exam scores and wrong-answer history are saved locally on this device.
          </p>
          <input ref={inputRef} type="text" aria-label="Your name" placeholder="Your name (e.g., Ali)" autoFocus
                 onKeyDown={(e) => { if (e.key === 'Enter') register(); }} />
          <button className="btn primary lg" style={{ width: '100%', marginTop: 10 }} onClick={register}>
            Get Started →
          </button>
          <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
            — or —
          </div>
          <button className="btn ghost" style={{ width: '100%', border: '1px solid var(--border)' }}
                  onClick={skip}>
            {warned ? 'Continue anonymously' : 'Continue without saving'}
          </button>
          {warned ? (
            <div className="welcome-warn">
              <strong>Heads up:</strong> Without registering, results show after each session but won't be saved.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
