import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetSemester } from '../hooks/useProfile.js';

const SEMESTERS = [
  { id: '1', label: 'Semester 1', desc: 'GCT I, Body Systems, Medical Chemistry, Medical Physics, Clinical & Professional Skills 1, Medicine & Art' },
  { id: '2', label: 'Semester 2', desc: 'GCT II, Body Systems II, Clinical & Professional Skills 2, Medicine & Art II' },
];

/** Shown once, right after signup/first login, until a semester is chosen.
    Reachable again any time from the home page to switch. */
export default function SelectSemesterPage() {
  const navigate = useNavigate();
  const setSemester = useSetSemester();
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Choose your semester — Studywith Labobo'; }, []);

  async function choose(id) {
    setError('');
    try {
      await setSemester.mutateAsync(id);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container center-wrap" style={{ maxWidth: 620 }}>
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 4 }}>Which semester are you in?</h1>
        <p style={{ color: 'var(--text-soft)', marginBottom: 20 }}>
          You can switch this later from the home page.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {SEMESTERS.map((s) => (
            <button key={s.id} type="button" className="btn primary lg"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', height: 'auto', padding: 18, gap: 6 }}
                    disabled={setSemester.isPending}
                    onClick={() => choose(s.id)}>
              <strong style={{ fontSize: 16 }}>{s.label}</strong>
              <span style={{ fontWeight: 400, fontSize: 12.5, opacity: 0.9 }}>{s.desc}</span>
            </button>
          ))}
        </div>
        <div role="alert" style={{ color: 'var(--wrong)', fontSize: 13, marginTop: 16 }}>{error}</div>
      </div>
    </div>
  );
}
