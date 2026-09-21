import { useCallback, useEffect, useState } from 'react';
import {
  apiCall, clearPassword, getPassword, setPassword, Unauthorized,
  fmtDate, timeAgo,
} from '../lib/adminApi.js';
import AnnouncementsTab from '../components/admin/AnnouncementsTab.jsx';
import '../styles/admin.css';

const TABS = [
  ['reports', '📋 Reports'],
  ['leaderboard', '🏆 Leaderboard'],
  ['users', '👤 Users'],
  ['sessions', '📊 Sessions'],
  ['announcements', '📣 Announcements'],
];

function useAdminTheme() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('labobo_admin_theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    } catch { /* ignore */ }
  }, []);
  return () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('labobo_admin_theme', next); } catch { /* ignore */ }
  };
}

function Toasts({ items }) {
  return items.map((t) => (
    <div key={t.id} className={'toast' + (t.err ? ' err' : '')}>{t.msg}</div>
  ));
}

function Empty({ icon, children }) {
  return (
    <div className="card">
      <div className="empty"><div className="icon">{icon}</div>{children}</div>
    </div>
  );
}

function Gate({ onUnlocked }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pw) return;
    setErr('');
    setBusy(true);
    setPassword(pw);
    try {
      await apiCall('GET', 'stats');
      onUnlocked();
    } catch {
      clearPassword();
      setErr('Wrong password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-box">
        <h2>🔒 Labobo Admin</h2>
        <p>Enter the admin password to continue.</p>
        <input type="password" placeholder="Password" autoFocus value={pw}
               onChange={(e) => setPw(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <button className="btn btn-primary" disabled={busy} onClick={submit}>Unlock</button>
        <div className="gate-err">{err}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="admin-page">
      <AdminInner />
    </div>
  );
}

function AdminInner() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('reports');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState([]);
  const toggleTheme = useAdminTheme();

  useEffect(() => { document.title = 'Labobo Admin'; }, []);

  const toast = useCallback((msg, err = false) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const relock = useCallback(() => {
    clearPassword();
    setUnlocked(false);
  }, []);

  /* Resume an unlocked session if the stored password still works. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getPassword()) { setChecking(false); return; }
      try {
        await apiCall('GET', 'stats');
        if (!cancelled) setUnlocked(true);
      } catch {
        clearPassword();
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    setStatsError(null);
    apiCall('GET', 'stats')
      .then((s) => { if (!cancelled) setStats(s); })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof Unauthorized) relock();
        else setStatsError(e.message);
      });
    return () => { cancelled = true; };
  }, [unlocked, tick, relock]);

  if (checking) return null;
  if (!unlocked) return <Gate onUnlocked={() => { setUnlocked(true); setTick((t) => t + 1); }} />;

  const statItems = stats ? [
    { label: 'Users', value: stats.users, sub: 'total registered' },
    { label: 'Sessions', value: stats.sessions, sub: 'all time' },
    { label: 'Today', value: stats.sessions_today, sub: 'sessions in last 24h' },
    { label: 'Reports', value: stats.reports, sub: 'question_reports' },
    { label: 'Leaderboard', value: stats.leaderboard_this_week, sub: `this week (${stats.week_start})` },
  ] : [];

  return (
    <div className="wrap">
      <div className="topbar">
        <h1><span className="pulse"></span> Labobo Admin</h1>
        <div className="topbar-right">
          <button className="btn btn-sm" onClick={() => setTick((t) => t + 1)}>↻ Refresh</button>
          <button className="btn btn-sm" onClick={toggleTheme}>Theme</button>
          <button className="btn btn-sm btn-danger" onClick={relock}>Lock</button>
        </div>
      </div>

      <div className="stats">
        {statsError ? (
          <div className="stat">
            <div className="label">Error</div>
            <div className="value" style={{ fontSize: 14, color: 'var(--wrong)' }}>{statsError}</div>
          </div>
        ) : !stats ? (
          <div className="stat"><div className="label">Loading…</div></div>
        ) : (
          statItems.map((it) => (
            <div key={it.label} className="stat">
              <div className="label">{it.label}</div>
              <div className="value">{String(it.value ?? '—')}</div>
              <div className="sub">{it.sub}</div>
            </div>
          ))
        )}
      </div>

      <div className="tabs">
        {TABS.map(([key, label]) => (
          <div key={key} className={'tab' + (tab === key ? ' active' : '')}
               onClick={() => setTab(key)}>
            {label}
          </div>
        ))}
      </div>

      <div id="panel">
        <TabPanel tab={tab} tick={tick} toast={toast} relock={relock}
                  refresh={() => setTick((t) => t + 1)} />
      </div>

      <Toasts items={toasts} />
    </div>
  );
}

/* ── tab bodies ───────────────────────────────────────────────────── */

function useTabData(action, params, deps) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null });
    apiCall('GET', action, { params })
      .then((d) => { if (!cancelled) setState({ data: d, error: null }); })
      .catch((e) => { if (!cancelled) setState({ data: null, error: e }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function TabPanel({ tab, tick, toast, relock, refresh }) {
  if (tab === 'announcements') {
    return <AnnouncementsTab tick={tick} toast={toast} refresh={refresh} relock={relock} />;
  }
  if (tab === 'reports') return <ReportsTab tick={tick} toast={toast} refresh={refresh} />;
  if (tab === 'leaderboard') return <LeaderboardTab tick={tick} toast={toast} refresh={refresh} />;
  if (tab === 'users') return <UsersTab tick={tick} />;
  return <SessionsTab tick={tick} />;
}

function Panel({ state, empty, children }) {
  if (state.error) return <Empty icon="⚠️">{state.error.message}</Empty>;
  if (!state.data) return <div className="card"><div className="loading">Loading…</div></div>;
  const rows = state.data.rows || [];
  if (!rows.length && empty) return empty;
  return children(rows, state.data);
}

function ReportsTab({ tick, toast, refresh }) {
  const state = useTabData('reports', {}, [tick]);

  async function dismiss(id) {
    if (!confirm('Dismiss this report?')) return;
    try {
      await apiCall('DELETE', 'report', { params: { id } });
      toast('Report dismissed');
      refresh();
    } catch (e) { toast(e.message, true); }
  }

  return (
    <Panel state={state} empty={<Empty icon="🎉">No reports — questions are clean.</Empty>}>
      {(rows) => (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th><th>Subject / Topic</th><th>Reason</th>
                  <th>Question + Note</th><th>Device</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>{fmtDate(r.created_at)}</div>
                      <div className="muted">{timeAgo(r.created_at)}</div>
                    </td>
                    <td>
                      <div><span className="pill">{r.subject || '—'}</span></div>
                      {r.topic ? <div className="muted" style={{ marginTop: 4 }}>{r.topic}</div> : null}
                    </td>
                    <td>
                      {r.reason ? <span className="pill pill-warn">{r.reason}</span>
                                : <span className="muted">—</span>}
                    </td>
                    <td>
                      {r.question_text ? (
                        <div className="muted" style={{ marginBottom: 6 }}>
                          {r.question_text.slice(0, 180)}{r.question_text.length > 180 ? '…' : ''}
                        </div>
                      ) : null}
                      {r.note ? <div className="report-body">{r.note}</div> : null}
                      {!r.question_text && !r.note ? <span className="muted">(no details)</span> : null}
                    </td>
                    <td className="mono">{(r.device_id || '').slice(0, 12)}</td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => dismiss(r.id)}>Dismiss</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

function LeaderboardTab({ tick, toast, refresh }) {
  const [week, setWeek] = useState(null);
  const state = useTabData('leaderboard', week ? { week } : {}, [tick, week]);

  async function remove(id, handle) {
    if (!confirm(`Remove leaderboard entry "${handle}"? They can re-submit next time they finish an exam.`)) return;
    try {
      await apiCall('DELETE', 'leaderboard', { params: { id } });
      toast('Entry removed');
      refresh();
    } catch (e) { toast(e.message, true); }
  }

  if (state.error) return <Empty icon="⚠️">{state.error.message}</Empty>;
  if (!state.data) return <div className="card"><div className="loading">Loading…</div></div>;

  const rows = state.data.rows || [];
  const current = state.data.week_start;
  const weeks = [...new Set([week || current, ...(state.data.weeks || [])])].sort().reverse();

  return (
    <div className="card">
      <div className="toolbar" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <label className="muted" style={{ fontSize: 12 }}>Week:</label>
        <select className="select" value={week || current || ''} onChange={(e) => setWeek(e.target.value)}>
          {weeks.map((w) => (
            <option key={w} value={w}>{w}{w === current ? ' (current)' : ''}</option>
          ))}
        </select>
        <span className="muted">{rows.length} entries</span>
      </div>
      {!rows.length ? (
        <div className="empty"><div className="icon">🌱</div>No leaderboard entries for this week.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Handle</th><th>Subject</th><th>Score</th>
                <th>Time</th><th>When</th><th>Device</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="mono">{i + 1}</td>
                  <td><strong>{r.handle || '—'}</strong></td>
                  <td><span className="pill">{r.subject || '—'}</span></td>
                  <td className="mono">{Number(r.score_pct ?? 0).toFixed(0)}%</td>
                  <td className="mono">
                    {r.time_seconds != null
                      ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td>
                    <div>{fmtDate(r.completed_at)}</div>
                    <div className="muted">{timeAgo(r.completed_at)}</div>
                  </td>
                  <td className="mono">{(r.device_id || '').slice(0, 12)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r.id, r.handle)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsersTab({ tick }) {
  const state = useTabData('users', {}, [tick]);
  return (
    <Panel state={state} empty={<Empty icon="👥">No users yet.</Empty>}>
      {(rows) => (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Joined</th><th>Device ID</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id || r.device_id}>
                    <td><strong>{r.name || '—'}</strong></td>
                    <td>
                      <div>{fmtDate(r.joined)}</div>
                      <div className="muted">{timeAgo(r.joined)}</div>
                    </td>
                    <td className="mono">{r.device_id || r.id || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

function SessionsTab({ tick }) {
  const state = useTabData('sessions', { limit: 200 }, [tick]);
  return (
    <Panel state={state} empty={<Empty icon="📊">No sessions yet.</Empty>}>
      {(rows) => (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>When</th><th>Subject</th><th>Mode</th><th>Score</th><th>%</th><th>Device</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pct = r.pct != null
                    ? Number(r.pct)
                    : r.total ? Math.round((r.score / r.total) * 100) : null;
                  const pctCls = pct == null ? '' : pct >= 75 ? 'pill-good' : pct >= 50 ? 'pill-warn' : 'pill-bad';
                  return (
                    <tr key={r.id}>
                      <td>
                        <div>{fmtDate(r.created_at)}</div>
                        <div className="muted">{timeAgo(r.created_at)}</div>
                      </td>
                      <td><span className="pill">{r.subject || '—'}</span></td>
                      <td>{r.mode || '—'}</td>
                      <td className="mono">{r.score ?? '—'}/{r.total ?? '—'}</td>
                      <td>{pct == null ? '—' : <span className={'pill ' + pctCls}>{pct}%</span>}</td>
                      <td className="mono">{(r.device_id || '').slice(0, 12)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}
