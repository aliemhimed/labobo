import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { lastSettings, saveQuiz } from '../../lib/live.js';
import TeacherGate from './TeacherGate.jsx';
import CustomQuestionForm from './CustomQuestionForm.jsx';
import {
  MAX_QUESTIONS, customItem, loadBankItems, loadQuizItems, newUid, subjectByTitle, subjectsBySemester,
} from './quizData.js';
import '../../styles/live-teach.css';

const PAGE = 60;

function BankQuestion({ item, selected, full, onToggle }) {
  return (
    <li className={`lt-q${selected ? ' on' : ''}`}>
      <label className="lt-q-top">
        <input type="checkbox" checked={selected} disabled={!selected && full} onChange={() => onToggle(item)} />
        <span>
          <span className="lt-topic">{item.topic}</span>
          <span className="lt-q-text" style={{ display: 'block' }}>{item.q}</span>
        </span>
      </label>
      <ul className="lt-opts">
        {item.options.map((o, i) => <li key={i} className={i === item.answer ? 'right' : ''}>{o}</li>)}
      </ul>
    </li>
  );
}

function BankBrowser({ subject, selectedKeys, full, onToggle }) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['live-bank', subject.title],
    queryFn: async () => [...(await loadBankItems(subject.sources.map((s) => s.table))).values()],
    staleTime: 10 * 60_000,
  });
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);

  const topics = useMemo(() => [...new Set((data || []).map((q) => q.topic))].sort(), [data]);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data || []).filter((q) => (!topic || q.topic === topic) && (!s || q.q.toLowerCase().includes(s)));
  }, [data, topic, search]);

  useEffect(() => { setShown(PAGE); }, [topic, search, subject.title]);

  if (isLoading) return <p className="lt-muted" role="status">Loading questions…</p>;
  if (error) {
    return (
      <p className="lt-error" role="alert">Could not load the questions: {error.message}{' '}
        <button type="button" className="btn sm" onClick={() => refetch()}>Try again</button></p>
    );
  }
  return (
    <>
      <div className="lt-filters">
        <select className="lt-input" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Filter by topic">
          <option value="">All topics</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="search" className="lt-input" placeholder="Search the question text" value={search}
               onChange={(e) => setSearch(e.target.value)} aria-label="Search questions" />
      </div>
      <p className="lt-muted" role="status" style={{ marginBottom: 10 }}>{list.length} {list.length === 1 ? 'question' : 'questions'}</p>
      <ul className="lt-list">
        {list.slice(0, shown).map((q) => (
          <BankQuestion key={q.key} item={q} selected={selectedKeys.has(q.key)} full={full} onToggle={onToggle} />
        ))}
      </ul>
      {list.length > shown ? (
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setShown((n) => n + PAGE)}>
          Show more ({list.length - shown} left)
        </button>
      ) : null}
    </>
  );
}

function Selected({ items, onMove, onRemove, onEdit }) {
  if (!items.length) return <p className="lt-muted">Nothing selected yet. Tick questions on the left.</p>;
  return (
    <ol className="lt-sel" style={{ listStyle: 'none' }}>
      {items.map((it, i) => (
        <li key={it.key}>
          <div className="lt-sel-text">
            <b>{i + 1}.</b>{it.kind === 'custom' ? <span className="lt-tag">Your question</span> : null} {it.q}
          </div>
          <div className="lt-tools">
            {it.kind === 'custom' ? <button type="button" onClick={() => onEdit(it)} aria-label={`Edit question ${i + 1}`}>Edit</button> : null}
            <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`}>↑</button>
            <button type="button" onClick={() => onMove(i, 1)} disabled={i === items.length - 1} aria-label={`Move question ${i + 1} down`}>↓</button>
            <button type="button" onClick={() => onRemove(it)} aria-label={`Remove question ${i + 1}`}>×</button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Builder({ existing, id }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState(existing?.quiz.title || '');
  const [subjectTitle, setSubjectTitle] = useState(existing?.quiz.subject || '');
  const [items, setItems] = useState(existing?.items || []);
  const [form, setForm] = useState(null); // null | 'new' | custom item being edited
  const subject = subjectByTitle(subjectTitle);
  const full = items.length >= MAX_QUESTIONS;
  const selectedKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  const toggle = (item) => setItems((list) => (list.some((i) => i.key === item.key)
    ? list.filter((i) => i.key !== item.key)
    : list.length >= MAX_QUESTIONS ? list : [...list, item]));
  const remove = (item) => setItems((list) => list.filter((i) => i.key !== item.key));
  const move = (i, d) => setItems((list) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });
  const saveCustom = (fields) => {
    if (form && form !== 'new') setItems((list) => list.map((i) => (i.key === form.key ? { ...i, ...fields } : i)));
    else setItems((list) => (list.length >= MAX_QUESTIONS ? list : [...list, { ...customItem(fields), key: newUid() }]));
    setForm(null);
  };

  const save = useMutation({
    mutationFn: () => saveQuiz({
      ...(id ? { id } : {}),
      title: title.trim(),
      subject: subjectTitle,
      settings: lastSettings(),
      items: items.map((it) => (it.kind === 'bank'
        ? { table: it.table, id: it.id }
        : { custom: { ...(it.customId ? { id: it.customId } : {}), q: it.q, options: it.options, answer: it.answer, explanation: it.explanation, share: it.share } })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live-quizzes'] });
      qc.invalidateQueries({ queryKey: ['live-quiz-items', id] });
      navigate('/live/teach');
    },
  });

  const canSave = title.trim() && subject && items.length > 0 && !save.isPending;

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title={id ? 'Edit quiz' : 'New quiz'} backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      {existing?.missing ? (
        <p className="lt-error" role="alert">{existing.missing} {existing.missing === 1 ? 'question was' : 'questions were'} removed from the bank and left out of this quiz.</p>
      ) : null}
      <div className="lt-card" style={{ marginBottom: 24 }}>
        <div className="lt-two">
          <label className="lt-field">
            <span>Title</span>
            <input className="lt-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3 revision" />
          </label>
          <label className="lt-field">
            <span>Subject</span>
            <select className="lt-input" value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)}>
              <option value="">Choose a subject</option>
              {subjectsBySemester().map(([sem, list]) => (
                <optgroup key={sem} label={`Semester ${sem}`}>
                  {list.map((s) => <option key={s.title} value={s.title}>{s.title}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="lt-builder">
        <section aria-labelledby="lt-bank">
          <h2 id="lt-bank" style={{ marginBottom: 12 }}>Questions</h2>
          {subject
            ? <BankBrowser subject={subject} selectedKeys={selectedKeys} full={full} onToggle={toggle} />
            : <p className="lt-muted">Choose a subject to see its questions.</p>}
        </section>

        <aside className="lt-side" aria-label="Your quiz">
          <div className="lt-card">
            <h2 style={{ fontSize: 'var(--t-21)', marginBottom: 10 }}>Selected ({items.length} of {MAX_QUESTIONS})</h2>
            <Selected items={items} onMove={move} onRemove={remove} onEdit={setForm} />
            {full ? <p className="lt-muted">You reached the limit of {MAX_QUESTIONS} questions.</p> : null}
          </div>
          {form ? (
            <CustomQuestionForm key={form === 'new' ? 'new' : form.key} initial={form === 'new' ? null : form}
                                onSave={saveCustom} onCancel={() => setForm(null)} />
          ) : (
            <button type="button" className="btn" onClick={() => setForm('new')} disabled={full}>Add your own question</button>
          )}
          {save.isError ? <p className="lt-error" role="alert">{save.error.message}</p> : null}
          <div className="lt-controls">
            <button type="button" className="btn primary" disabled={!canSave} onClick={() => save.mutate()}>
              {save.isPending ? 'Saving…' : 'Save quiz'}
            </button>
            <Link className="btn" to="/live/teach">Cancel</Link>
          </div>
          {!canSave && !save.isPending ? (
            <p className="lt-muted">To save: add a title, choose a subject and select at least one question.</p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

export default function QuizBuilder() {
  const { id } = useParams();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['live-quiz-items', id], queryFn: () => loadQuizItems(id), enabled: !!id, gcTime: 0,
  });

  let body;
  if (id && isLoading) body = <div className="splash" role="status">Loading</div>;
  else if (id && error) {
    body = (
      <main id="main" tabIndex={-1} className="lt">
        <div className="lt-state" role="alert">
          <h1>Could not load this quiz</h1>
          <p className="lt-sub">{error.message}</p>
          <button type="button" className="btn primary" onClick={() => refetch()}>Try again</button>
          <Link className="btn" to="/live/teach">Back</Link>
        </div>
      </main>
    );
  } else body = <Builder key={id || 'new'} existing={data} id={id} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
