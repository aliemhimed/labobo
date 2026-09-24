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
    <main className="semester">
      <h1>Which semester are you in?</h1>
      <p className="lede">
        This decides which subjects you see. You can change it later from your profile menu.
      </p>
      <div className="semester-options">
        {SEMESTERS.map((s) => (
          <button key={s.id} type="button" className="semester-option"
                  disabled={setSemester.isPending} onClick={() => choose(s.id)}>
            <span className="so-name">{s.label}</span>
            <span className="so-subjects">{s.desc}</span>
          </button>
        ))}
      </div>
      <p className="form-error" role="alert">{error}</p>
    </main>
  );
}
