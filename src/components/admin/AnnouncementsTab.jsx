import { useEffect, useState } from 'react';
import { sanitizeHtml } from '../../lib/sanitize.js';
import { apiCall, fmtDate, timeAgo, suggestId, todayISODate } from '../../lib/adminApi.js';

const EMPTY = { id: '', title: '', body: '', pub_date: todayISODate(), active: true };

export default function AnnouncementsTab({ tick, toast, refresh }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [idEdited, setIdEdited] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    apiCall('GET', 'announcements')
      .then((d) => { if (!cancelled) setRows(d.rows || []); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [tick, reload]);

  function setTitle(title) {
    setForm((f) => ({ ...f, title, id: idEdited ? f.id : suggestId(title) }));
  }

  function clearForm() {
    setForm(EMPTY);
    setIdEdited(false);
  }

  async function save() {
    const payload = {
      id: (form.id || suggestId(form.title)).trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      pub_date: form.pub_date || todayISODate(),
      active: !!form.active,
    };
    if (!payload.title || !payload.body) { toast('Title and body are required', true); return; }
    if (!payload.id) { toast('Could not derive an ID — fill in the slug', true); return; }
    try {
      await apiCall('POST', 'announcement', { body: payload });
      toast(`Saved “${payload.title}” (${payload.id})`);
      setReload((r) => r + 1);
      refresh();
    } catch (e) { toast(e.message, true); }
  }

  async function toggleActive(r) {
    try {
      await apiCall('POST', 'announcement', { body: { ...r, active: !r.active } });
      toast(r.active ? 'Hidden from users' : 'Now visible to users');
      setReload((x) => x + 1);
    } catch (e) { toast(e.message, true); }
  }

  async function remove(id) {
    if (!confirm(`Delete announcement "${id}"? This cannot be undone. (Use Hide instead if you might want it back.)`)) return;
    try {
      await apiCall('DELETE', 'announcement', { params: { id } });
      toast('Deleted');
      setReload((x) => x + 1);
      refresh();
    } catch (e) { toast(e.message, true); }
  }

  function edit(r) {
    setForm({
      id: r.id || '',
      title: r.title || '',
      body: r.body || '',
      pub_date: r.pub_date || todayISODate(),
      active: !!r.active,
    });
    setIdEdited(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Loaded “${r.title}” into the form — edit and Save to update.`);
  }

  return (
    <div className="card">
      <div className="ann-form">
        <div>
          <label htmlFor="ann-title-input">Title</label>
          <input id="ann-title-input" type="text" placeholder="e.g. 🎉 New: Question feedback button"
                 value={form.title} onChange={(e) => setTitle(e.target.value)} />
          <div className="hint">Emoji + plain text. Shown bold at the top of the popup.</div>
        </div>
        <div>
          <label htmlFor="ann-id-input">ID (slug)</label>
          <input id="ann-id-input" type="text" placeholder="auto from title" value={form.id}
                 onChange={(e) => { setIdEdited(true); setForm((f) => ({ ...f, id: e.target.value })); }} />
          <div className="hint">
            Used so each user sees this announcement only once. Auto-fills from the title.
          </div>
        </div>
        <div className="full">
          <label htmlFor="ann-body-input">Body (HTML allowed)</label>
          <textarea id="ann-body-input" placeholder={'Type the announcement. Use <strong>, <em>, <br>, <a href="...">link</a> to format.'}
                    value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <div className="hint">
            Allowed tags: &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, &lt;a&gt;. Plain &amp;, &lt;, &gt; need to be
            written as &amp;amp; &amp;lt; &amp;gt;.
          </div>
        </div>
        <div>
          <label htmlFor="ann-date-input">Publish date</label>
          <input id="ann-date-input" type="date" value={form.pub_date}
                 onChange={(e) => setForm((f) => ({ ...f, pub_date: e.target.value }))} />
        </div>
        <div>
          <label>Status</label>
          <label className="ann-checkbox">
            <input type="checkbox" checked={form.active}
                   onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            {' '}Active (visible to users)
          </label>
          <div className="hint">
            Uncheck to save a draft / hide an old announcement without deleting it.
          </div>
        </div>
        <div className="full">
          <label>Live preview</label>
          <div className="ann-preview">
            <div className="pv-label">Preview</div>
            <div className="pv-title">{form.title || 'Title will appear here…'}</div>
            {form.body ? (
              /* Same filter as the live popup, so the preview shows exactly what
                 visitors get (only a few inline tags survive). */
              <div className="pv-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.body) }} />
            ) : (
              <div className="pv-body"><span className="muted">Body will appear here…</span></div>
            )}
          </div>
        </div>
        <div className="full row-actions">
          <button className="btn btn-sm" onClick={clearForm}>Clear form</button>
          <button className="btn btn-sm btn-primary" onClick={save}>💾 Save announcement</button>
        </div>
      </div>

      <div className="table-wrap">
        {error ? (
          <div className="empty"><div className="icon">⚠️</div>{error.message}</div>
        ) : rows === null ? (
          <div className="loading">Loading…</div>
        ) : !rows.length ? (
          <div className="empty">
            <div className="icon">📣</div>
            No announcements yet. Fill in the form above and click Save.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th><th>Title / ID</th><th>Body preview</th>
                <th>Publish date</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const plain = (r.body || '').replace(/<[^>]+>/g, ' ');
                return (
                  <tr key={r.id}>
                    <td>
                      <span className={r.active ? 'pill pill-good' : 'pill'}>
                        {r.active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.title || '(untitled)'}</div>
                      <div className="mono" style={{ marginTop: 3 }}>{r.id}</div>
                    </td>
                    <td>
                      <div className="muted" style={{ maxWidth: 360 }}>
                        {plain.slice(0, 200)}{plain.length > 200 ? '…' : ''}
                      </div>
                    </td>
                    <td>{r.pub_date || '—'}</td>
                    <td>
                      <div>{fmtDate(r.updated_at)}</div>
                      <div className="muted">{timeAgo(r.updated_at)}</div>
                    </td>
                    <td>
                      <button className="btn btn-sm" style={{ marginRight: 6 }} onClick={() => edit(r)}>Edit</button>
                      <button className="btn btn-sm" style={{ marginRight: 6 }} onClick={() => toggleActive(r)}>
                        {r.active ? 'Hide' : 'Activate'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
