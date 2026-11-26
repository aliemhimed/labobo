import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import TopBar from '../../components/TopBar.jsx';
import PageHead from '../../components/PageHead.jsx';
import { fetchLiveMe, lastSettings, saveQuiz } from '../../lib/live.js';
import { bankTables } from '../../lib/liveSubjects.js';
import TeacherGate from './TeacherGate.jsx';
import CustomQuestionForm from './CustomQuestionForm.jsx';
import {
  MAX_QUESTIONS, customItem, lectureKey, loadBankItems, loadQuizItems, newUid, splitLectureKey,
} from './quizData.js';
import '../../styles/live-teach.css';

const PAGE = 60;
const QUICK = [5, 10, 15, 20];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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

/* The ticked lectures' questions, to pick specific ones. */
function QuestionPicker({ questions, selectedKeys, full, onToggle }) {
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? questions.filter((q) => q.q.toLowerCase().includes(s)) : questions;
  }, [questions, search]);
  useEffect(() => { setShown(PAGE); }, [search, questions]);

  if (!questions.length) return <p className="lt-muted">Tick a lecture above to see its questions.</p>;
  return (
    <>
      <div className="lt-filters">
        <input type="search" className="lt-input" placeholder="Search the question text" value={search}
               onChange={(e) => setSearch(e.target.value)} aria-label="Search questions" />
      </div>
      <p className="lt-muted" role="status" style={{ marginBottom: 10 }}>{plural(list.length, 'question')}</p>
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

function ItemList({ items, onRemove, onEdit }) {
  return (
    <ol className="lt-sel" style={{ listStyle: 'none' }}>
      {items.map((it, i) => (
        <li key={it.key}>
          <div className="lt-sel-text"><b>{i + 1}.</b> {it.q}</div>
          <div className="lt-tools">
            {onEdit ? <button type="button" onClick={() => onEdit(it)} aria-label={`Edit question ${i + 1}`}>Edit</button> : null}
            <button type="button" onClick={() => onRemove(it)} aria-label={`Remove question ${i + 1}`}>×</button>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Builder({ existing, id, mine }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const labels = useMemo(() => new Map(bankTables().map((t) => [t.table, t.label])), []);
  const myTables = useMemo(() => (mine.subjects || []).filter((t) => labels.has(t)), [mine, labels]);

  const [title, setTitle] = useState(existing?.quiz.title || '');
  const [tables, setTables] = useState(() => {
    if (myTables.length === 1) return myTables;
    const used = new Set([
      ...(existing?.pool || []).map((p) => p.table),
      ...(existing?.items || []).filter((i) => i.kind === 'bank').map((i) => i.table),
    ]);
    return myTables.filter((t) => used.has(t));
  });
  const [lectures, setLectures] = useState(() => new Set((existing?.pool || []).map((p) => lectureKey(p.table, p.topic))));
  const [count, setCount] = useState(existing?.count || 10);
  const [items, setItems] = useState(existing?.items || []);
  const [form, setForm] = useState(null); // null | 'new' | custom item being edited

  const tablesKey = [...tables].sort().join(',');
  const bankQuery = useQuery({
    queryKey: ['live-bank', tablesKey],
    queryFn: async () => [...(await loadBankItems(tables)).values()],
    enabled: tables.length > 0,
    staleTime: 10 * 60_000,
  });
  const bank = useMemo(() => (tables.length ? bankQuery.data || [] : []), [tables.length, bankQuery.data]);

  // Lectures per chosen table, in the bank's order.
  const groups = useMemo(() => tables.map((table) => {
    const byTopic = new Map();
    for (const q of bank) if (q.table === table) byTopic.set(q.topic, (byTopic.get(q.topic) || 0) + 1);
    return {
      table, label: labels.get(table),
      lectures: [...byTopic.entries()].map(([topic, n]) => ({ topic, n, key: lectureKey(table, topic) })),
    };
  }), [tables, bank, labels]);
  const allKeys = useMemo(() => groups.flatMap((g) => g.lectures.map((l) => l.key)), [groups]);

  const picked = useMemo(() => bank.filter((q) => lectures.has(lectureKey(q.table, q.topic))), [bank, lectures]);
  const selectedKeys = useMemo(() => new Set(items.map((i) => i.key)), [items]);
  const bankItems = items.filter((i) => i.kind === 'bank');
  const customItems = items.filter((i) => i.kind === 'custom');
  const tickedCount = allKeys.filter((k) => lectures.has(k)).length;
  const full = items.length >= MAX_QUESTIONS;

  const min = Math.max(1, items.length);
  const poolFree = picked.filter((q) => !selectedKeys.has(q.key)).length;
  const max = Math.max(min, Math.min(MAX_QUESTIONS, items.length + poolFree));
  const total = Math.min(max, Math.max(min, count));
  const random = total - items.length;

  const toggleTable = (table) => {
    if (tables.includes(table)) {
      setTables(tables.filter((t) => t !== table));
      setLectures((s) => new Set([...s].filter((k) => splitLectureKey(k).table !== table)));
    } else setTables([...tables, table]);
  };
  const toggleLecture = (key) => setLectures((s) => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });
  const toggleItem = (item) => setItems((list) => (list.some((i) => i.key === item.key)
    ? list.filter((i) => i.key !== item.key)
    : list.length >= MAX_QUESTIONS ? list : [...list, item]));
  const remove = (item) => setItems((list) => list.filter((i) => i.key !== item.key));
  const saveCustom = (fields) => {
    if (form && form !== 'new') setItems((list) => list.map((i) => (i.key === form.key ? { ...i, ...fields } : i)));
    else setItems((list) => (list.length >= MAX_QUESTIONS ? list : [...list, { ...customItem(fields), key: newUid() }]));
    setForm(null);
  };

  const save = useMutation({
    mutationFn: () => saveQuiz({
      ...(id ? { id } : {}),
      title: title.trim(),
      subject: tables.map((t) => labels.get(t)).join(', ').slice(0, 80),
      settings: lastSettings(),
      pool: [...lectures].map(splitLectureKey),
      count: total,
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

  const reason = !title.trim() ? 'add a title' : (lectures.size === 0 && items.length === 0) ? 'tick a lecture or add a question' : '';
  const canSave = !reason && !save.isPending;

  const summary = items.length === 0
    ? `${plural(total, 'random question')} from ${plural(tickedCount, 'lecture')}`
    : random <= 0 ? `${plural(items.length, 'question')} chosen by you`
      : `${items.length} chosen by you + ${random} random = ${plural(total, 'question')}`;

  return (
    <main id="main" tabIndex={-1} className="lt">
      <PageHead title={id ? 'Edit quiz' : 'New quiz'} backLabel="Teacher home" onBack={() => navigate('/live/teach')} />
      {existing?.missing ? (
        <p className="lt-error" role="alert">{existing.missing} {existing.missing === 1 ? 'question was' : 'questions were'} removed from the bank and left out of this quiz.</p>
      ) : null}

      <div className="lt-card lt-step">
        <label className="lt-field" style={{ marginBottom: 0 }}>
          <span>Title</span>
          <input className="lt-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3 revision" />
        </label>
      </div>

      {myTables.length === 0 ? (
        <p className="lt-muted lt-step">No subjects are assigned to you yet. Ask the Labobo admin.</p>
      ) : (
        <>
          {myTables.length > 1 ? (
            <section className="lt-step" aria-labelledby="lt-subj">
              <h2 id="lt-subj">Subject</h2>
              <p className="lt-muted">You can combine several subjects in one quiz.</p>
              <div className="lt-pick-grid">
                {myTables.map((t) => (
                  <button type="button" key={t} className="lt-pick" aria-pressed={tables.includes(t)} onClick={() => toggleTable(t)}>
                    {labels.get(t)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {tables.length > 0 ? (
            <section className="lt-step" aria-labelledby="lt-lec">
              <h2 id="lt-lec">Lectures</h2>
              {bankQuery.isLoading ? <p className="lt-muted" role="status">Loading questions…</p>
                : bankQuery.error ? (
                  <p className="lt-error" role="alert">Could not load the questions: {bankQuery.error.message}{' '}
                    <button type="button" className="btn sm" onClick={() => bankQuery.refetch()}>Try again</button></p>
                ) : (
                  <div className="lt-card">
                    <div className="lt-controls" style={{ marginBottom: 10 }}>
                      <button type="button" className="btn sm" onClick={() => setLectures(new Set(allKeys))}>Select all</button>
                      <button type="button" className="btn sm" onClick={() => setLectures(new Set())}>Clear</button>
                      <span className="lt-muted">{tickedCount} of {allKeys.length} lectures, {plural(picked.length, 'question')}</span>
                    </div>
                    {groups.map((g) => (
                      <div key={g.table}>
                        {groups.length > 1 ? <h3 className="lt-label" style={{ margin: '12px 0 6px' }}>{g.label}</h3> : null}
                        <div className="lt-lectures">
                          {g.lectures.map((l) => (
                            <label key={l.key} className="lt-check">
                              <input type="checkbox" checked={lectures.has(l.key)} onChange={() => toggleLecture(l.key)} />
                              <span>{l.topic} <span className="lt-muted">({l.n})</span></span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>
          ) : null}
        </>
      )}

      <section className="lt-step" aria-labelledby="lt-num">
        <h2 id="lt-num">Number of questions</h2>
        <div className="lt-count">
          <button type="button" className="btn" onClick={() => setCount(total - 1)} disabled={total <= min} aria-label="Fewer questions">−</button>
          <input type="number" className="lt-input" min={min} max={max} value={total} aria-label="Number of questions"
                 onChange={(e) => setCount(Math.min(max, Math.max(min, Number(e.target.value) || min)))} />
          <button type="button" className="btn" onClick={() => setCount(total + 1)} disabled={total >= max} aria-label="More questions">+</button>
          <div className="lt-seg" role="group" aria-label="Quick picks">
            {QUICK.map((n) => (
              <button key={n} type="button" aria-pressed={total === n} disabled={n < min || n > max} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>
        <p role="status" style={{ marginTop: 10, fontWeight: 600 }}>{summary}</p>
        {max < count ? <p className="lt-muted">Only {plural(max, 'question')} available from what you ticked.</p> : null}
      </section>

      <section className="lt-step" aria-labelledby="lt-spec">
        <h2 id="lt-spec">Choose specific questions <span className="lt-muted">(optional)</span></h2>
        <details className="lt-more">
          <summary>Pick questions that are always included</summary>
          <QuestionPicker questions={picked} selectedKeys={selectedKeys} full={full} onToggle={toggleItem} />
        </details>
        {bankItems.length ? (
          <div className="lt-card" style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 8 }}>Always included ({bankItems.length})</h3>
            <ItemList items={bankItems} onRemove={remove} />
          </div>
        ) : null}
      </section>

      <section className="lt-step" aria-labelledby="lt-own">
        <h2 id="lt-own">Your own questions</h2>
        {customItems.length ? (
          <div className="lt-card" style={{ marginBottom: 12 }}>
            <ItemList items={customItems} onRemove={remove} onEdit={setForm} />
          </div>
        ) : null}
        {form ? (
          <CustomQuestionForm key={form === 'new' ? 'new' : form.key} initial={form === 'new' ? null : form}
                              onSave={saveCustom} onCancel={() => setForm(null)} />
        ) : (
          <button type="button" className="btn" onClick={() => setForm('new')} disabled={full}>Add your own question</button>
        )}
      </section>

      <div className="lt-step">
        {save.isError ? <p className="lt-error" role="alert">{save.error.message}</p> : null}
        <div className="lt-controls">
          <button type="button" className="btn primary" disabled={!canSave} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save quiz'}
          </button>
          <Link className="btn" to="/live/teach">Cancel</Link>
        </div>
        {reason ? <p className="lt-muted" style={{ marginTop: 8 }}>To save: {reason}.</p> : null}
      </div>
    </main>
  );
}

export default function QuizBuilder() {
  const { id } = useParams();
  const me = useQuery({ queryKey: ['live-me'], queryFn: fetchLiveMe, staleTime: 60_000 });
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['live-quiz-items', id], queryFn: () => loadQuizItems(id), enabled: !!id, gcTime: 0,
  });

  let body;
  if ((id && isLoading) || me.isLoading) body = <div className="splash" role="status">Loading</div>;
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
  } else body = <Builder key={id || 'new'} existing={data} id={id} mine={me.data || { subjects: [] }} />;

  return (
    <TeacherGate>
      <TopBar subtitle="Live" />
      {body}
    </TeacherGate>
  );
}
