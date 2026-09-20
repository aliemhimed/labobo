/* ============================================================
   LABOBO WEEKLY EXAM LEADERBOARD (client)
   ============================================================
   Connects to /api/leaderboard (Netlify Function -> Supabase).
   Handles: opt-in flow, handle picker, score submission, board UI.

   Each subject HTML file must:
   1. Load profanity.js and this file BEFORE its main script
   2. After exam completion (30-Q exams only), call:
        window.LABOBO_LEADERBOARD.handleExamSubmission({
          subject, score_pct, total_questions, time_seconds
        })
   3. Provide a button somewhere that calls:
        window.LABOBO_LEADERBOARD.showLeaderboardModal(subject)
   ============================================================ */

(function() {
  const API_BASE = '/api';
  const LS_KEY = 'labobo_leaderboard';

  /* ---------- State ---------- */
  function getState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch { return {}; }
  }
  function setState(updates) {
    const s = getState();
    Object.assign(s, updates);
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  }
  function getDeviceId() {
    try {
      const u = JSON.parse(localStorage.getItem('mcq.user') || 'null');
      return u && u.deviceId ? u.deviceId : null;
    } catch { return null; }
  }
  function getUserName() {
    try {
      const u = JSON.parse(localStorage.getItem('mcq.user') || 'null');
      return u && u.name ? u.name : '';
    } catch { return ''; }
  }

  /* ---------- API ---------- */
  async function apiSubmit(payload) {
    const res = await fetch(`${API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status} ${await res.text()}`);
    return res.json();
  }
  async function apiFetch(subject) {
    const deviceId = getDeviceId();
    const qs = new URLSearchParams({ subject });
    if (deviceId) qs.set('device_id', deviceId);
    const res = await fetch(`${API_BASE}/leaderboard?${qs.toString()}`);
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch {}
      console.error('Leaderboard API error body:', detail);
      throw new Error(`Fetch failed: ${res.status} ${detail}`);
    }
    return res.json();
  }

  /* ---------- Styles ---------- */
  function injectStyles() {
    if (document.getElementById('labobo-lb-styles')) return;
    const css = `
      .lb-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.62); backdrop-filter: blur(6px);
        z-index: 5000; display: flex; align-items: center; justify-content: center;
        padding: 16px; animation: lbFadeIn 0.2s ease;
      }
      @keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
      .lb-modal {
        background: var(--surface, #fff); color: var(--text, #111);
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 16px; padding: 24px;
        width: min(540px, 94vw); max-height: 90vh; overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        animation: lbSlideUp 0.28s cubic-bezier(.2,.7,.3,1.2);
      }
      @keyframes lbSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .lb-modal h3 { margin: 0 0 4px; font-size: 19px; font-weight: 700; line-height: 1.3; }
      .lb-modal .lb-sub { font-size: 13px; color: var(--text-muted, #6b7280); margin-bottom: 16px; }
      .lb-modal p { font-size: 14.5px; line-height: 1.55; margin: 0 0 14px; }

      .lb-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; flex-wrap: wrap; }
      .lb-btn {
        padding: 10px 16px; border-radius: 9px; font-size: 13.5px; font-weight: 600;
        cursor: pointer; font-family: inherit; border: 1px solid var(--border, #e5e7eb);
        background: var(--surface-raised, #f3f4f6); color: var(--text, #111);
        transition: background 0.15s, transform 0.1s, opacity 0.15s;
      }
      .lb-btn:hover { background: var(--border, #e5e7eb); }
      .lb-btn:active { transform: scale(0.97); }
      .lb-btn-primary {
        background: var(--brand, #2563eb); color: #fff; border-color: transparent;
        box-shadow: 0 2px 8px rgba(43,127,255,0.3);
      }
      .lb-btn-primary:hover { background: var(--brand-dark, #1d4ed8); }
      .lb-btn-danger {
        color: var(--wrong, #dc2626); border-color: transparent;
      }

      .lb-input {
        width: 100%; box-sizing: border-box;
        background: var(--surface-raised, #f3f4f6); border: 1.5px solid var(--border, #e5e7eb);
        border-radius: 9px; padding: 11px 14px;
        color: var(--text, #111); font-size: 15px; font-family: inherit;
        outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lb-input:focus { border-color: var(--brand, #2563eb); box-shadow: 0 0 0 3px rgba(43,127,255,0.18); }
      .lb-error { color: var(--wrong, #dc2626); font-size: 12.5px; margin-top: 6px; min-height: 16px; }

      .lb-table {
        width: 100%; border-collapse: collapse; margin-top: 10px;
        font-size: 14px;
      }
      .lb-table th {
        text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--text-muted, #6b7280); font-weight: 700; padding: 8px 6px;
        border-bottom: 1px solid var(--border, #e5e7eb);
      }
      .lb-table td {
        padding: 10px 6px; border-bottom: 1px solid var(--border, #e5e7eb);
        vertical-align: middle;
      }
      .lb-table tr.lb-me { background: var(--brand-soft, rgba(43,127,255,0.1)); font-weight: 600; }
      .lb-table tr.lb-me td:first-child { border-left: 3px solid var(--brand, #2563eb); padding-left: 8px; }
      .lb-rank { font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 700; width: 50px; }
      .lb-handle { font-weight: 600; }
      .lb-score { font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 700; text-align: right; }
      .lb-time  { font-family: 'Space Grotesk', system-ui, sans-serif; color: var(--text-muted, #6b7280); text-align: right; }
      .lb-medal { font-size: 18px; }

      .lb-empty { text-align: center; padding: 36px 16px; color: var(--text-muted, #6b7280); font-size: 14px; }
      .lb-empty .lb-empty-icon { font-size: 36px; margin-bottom: 8px; opacity: 0.6; }

      .lb-myrank {
        margin-top: 14px; padding: 12px 14px;
        background: var(--brand-soft, rgba(43,127,255,0.1));
        border: 1px solid var(--brand, #2563eb); border-radius: 10px;
        font-size: 14px;
      }
      .lb-myrank strong { color: var(--brand, #2563eb); font-family: 'Space Grotesk', system-ui, sans-serif; }

      .lb-meta {
        font-size: 12px; color: var(--text-muted, #6b7280);
        margin-top: 14px; padding-top: 12px;
        border-top: 1px solid var(--border, #e5e7eb);
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
      }

      .lb-toast {
        position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
        background: var(--surface, #fff); color: var(--text, #111);
        border: 1px solid var(--border, #e5e7eb); border-left: 4px solid var(--brand, #2563eb);
        border-radius: 10px; padding: 14px 18px;
        font-size: 14px; font-weight: 600;
        box-shadow: 0 12px 32px rgba(0,0,0,0.25);
        z-index: 6000; animation: lbToast 0.3s ease;
      }
      @keyframes lbToast { from { opacity: 0; transform: translateX(-50%) translateY(14px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;
    const style = document.createElement('style');
    style.id = 'labobo-lb-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------- Modal helpers ---------- */
  function buildOverlay(html) {
    injectStyles();
    const overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.innerHTML = `<div class="lb-modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  }

  function showToast(msg) {
    injectStyles();
    const t = document.createElement('div');
    t.className = 'lb-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 0.4s'; t.style.opacity = '0';
      setTimeout(() => t.remove(), 400);
    }, 3500);
  }

  /* ---------- Opt-in modal ---------- */
  function showOptInModal() {
    return new Promise(resolve => {
      const overlay = buildOverlay(`
        <h3>🏆 Submit to the weekly leaderboard?</h3>
        <div class="lb-sub">Your score will be visible to all players on this subject's board until Sunday night.</div>
        <p>Compete by your <strong>highest 30-question exam score</strong> this week. Each subject has its own board, resetting every Monday.</p>
        <p style="font-size:13px;color:var(--text-muted,#6b7280);">You'll pick a public handle (e.g. <code>MedGenius</code>). Your real name stays private.</p>
        <div class="lb-actions">
          <button class="lb-btn" data-act="never">No, never ask again</button>
          <button class="lb-btn" data-act="once">Yes, just this one</button>
          <button class="lb-btn lb-btn-primary" data-act="always">Yes, every time</button>
        </div>
      `);
      overlay.querySelectorAll('.lb-btn').forEach(btn => {
        btn.onclick = () => {
          const act = btn.dataset.act;
          overlay.remove();
          resolve(act);
        };
      });
    });
  }

  /* ---------- Handle picker ---------- */
  function showHandleModal(currentName) {
    return new Promise(resolve => {
      const seed = (currentName || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 16);
      const overlay = buildOverlay(`
        <h3>Choose your leaderboard handle</h3>
        <div class="lb-sub">3–20 characters. Letters, numbers, _ and - only.</div>
        <p style="font-size:13.5px;">This is the only name shown publicly. Your real name (${currentName ? '<strong>' + currentName + '</strong>' : 'from registration'}) stays private.</p>
        <input type="text" class="lb-input" id="lb-handle-input" value="${seed}" placeholder="e.g. MedGenius99" maxlength="20" autofocus>
        <div class="lb-error" id="lb-handle-err"></div>
        <div class="lb-actions">
          <button class="lb-btn" data-act="cancel">Cancel</button>
          <button class="lb-btn lb-btn-primary" data-act="save">Save handle</button>
        </div>
      `);
      const input = overlay.querySelector('#lb-handle-input');
      const err = overlay.querySelector('#lb-handle-err');
      const validator = (window.LABOBO_PROFANITY && window.LABOBO_PROFANITY.validateHandle) || ((h) => null);
      function tryValidate() {
        const v = input.value.trim();
        const e = validator(v);
        err.textContent = e || '';
        return e === null;
      }
      input.addEventListener('input', () => { err.textContent = ''; });
      overlay.querySelectorAll('.lb-btn').forEach(btn => {
        btn.onclick = () => {
          if (btn.dataset.act === 'cancel') { overlay.remove(); resolve(null); return; }
          if (!tryValidate()) return;
          const v = input.value.trim();
          overlay.remove();
          resolve(v);
        };
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          if (!tryValidate()) return;
          const v = input.value.trim();
          overlay.remove();
          resolve(v);
        }
      });
      setTimeout(() => input.focus(), 50);
    });
  }

  /* ---------- Leaderboard view ---------- */
  function fmtTime(secs) {
    if (!secs && secs !== 0) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  function fmtCountdown(weekStartStr) {
    const start = new Date(weekStartStr + 'T00:00:00Z');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const now = new Date();
    const ms = end - now;
    if (ms <= 0) return 'Resetting...';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (days > 0) return `Resets in ${days}d ${hours}h`;
    return `Resets in ${hours}h`;
  }
  function rankBadge(rank) {
    if (rank === 1) return '<span class="lb-medal">🥇</span>';
    if (rank === 2) return '<span class="lb-medal">🥈</span>';
    if (rank === 3) return '<span class="lb-medal">🥉</span>';
    return rank;
  }
  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function showLeaderboardModal(subject) {
    injectStyles();
    const overlay = buildOverlay(`
      <h3>🏆 Weekly Leaderboard — ${escHtml(subject)}</h3>
      <div class="lb-sub" id="lb-countdown">Loading…</div>
      <div id="lb-content">
        <div class="lb-empty"><div class="lb-empty-icon">⏳</div>Loading leaderboard…</div>
      </div>
      <div class="lb-meta">
        <span>30-question exams only</span>
        <button class="lb-btn" data-act="close">Close</button>
      </div>
    `);
    const closeBtn = overlay.querySelector('[data-act="close"]');
    closeBtn.onclick = () => overlay.remove();

    try {
      const data = await apiFetch(subject);
      const countdown = document.getElementById('lb-countdown');
      if (countdown) countdown.textContent = fmtCountdown(data.week_start);

      const content = document.getElementById('lb-content');
      if (!data.top || data.top.length === 0) {
        content.innerHTML = `
          <div class="lb-empty">
            <div class="lb-empty-icon">🌱</div>
            No entries yet this week.<br>Be the first — take a 30-question exam!
          </div>
        `;
        return;
      }
      const myDeviceId = getDeviceId();
      const rows = data.top.map((entry, i) => {
        const isMe = myDeviceId && entry.device_id === myDeviceId;
        return `
          <tr class="${isMe ? 'lb-me' : ''}">
            <td class="lb-rank">${rankBadge(i + 1)}</td>
            <td class="lb-handle">${escHtml(entry.handle)}${isMe ? ' <span style="font-size:11px;color:var(--brand,#2563eb);">(you)</span>' : ''}</td>
            <td class="lb-score">${Number(entry.score_pct).toFixed(0)}%</td>
            <td class="lb-time">${fmtTime(entry.time_seconds)}</td>
          </tr>
        `;
      }).join('');

      let myRankBlock = '';
      if (data.my_entry && data.my_rank && data.my_rank > 10) {
        myRankBlock = `
          <div class="lb-myrank">
            Your rank: <strong>#${data.my_rank}</strong> &nbsp;·&nbsp;
            ${Number(data.my_entry.score_pct).toFixed(0)}% &nbsp;·&nbsp;
            ${fmtTime(data.my_entry.time_seconds)}
          </div>
        `;
      } else if (!data.my_entry) {
        myRankBlock = `
          <div class="lb-myrank" style="background:transparent;border-style:dashed;color:var(--text-muted,#6b7280);">
            You haven't submitted a 30-question exam this week.
          </div>
        `;
      }

      content.innerHTML = `
        <table class="lb-table">
          <thead>
            <tr>
              <th>Rank</th><th>Handle</th>
              <th style="text-align:right;">Score</th><th style="text-align:right;">Time</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${myRankBlock}
      `;
    } catch (e) {
      console.error('Leaderboard fetch failed:', e);
      const content = document.getElementById('lb-content');
      if (content) {
        content.innerHTML = `
          <div class="lb-empty">
            <div class="lb-empty-icon">⚠️</div>
            Couldn't load the leaderboard.<br>
            <small>${escHtml(e.message)}</small>
          </div>
        `;
      }
    }
  }

  /* ---------- Submission flow ---------- */
  async function handleExamSubmission({ subject, score_pct, total_questions, time_seconds }) {
    // Leaderboard only counts 30-question exams
    if (parseInt(total_questions, 10) !== 30) return;

    const state = getState();
    let pref = state.opt_in_pref;

    if (pref === 'never') return;

    if (pref !== 'always') {
      const choice = await showOptInModal();
      if (choice === 'never') { setState({ opt_in_pref: 'never' }); return; }
      if (choice === 'once') { /* keep pref as is */ }
      if (choice === 'always') { setState({ opt_in_pref: 'always' }); }
      if (!choice || choice === 'cancel') return;
    }

    let handle = state.handle;
    if (!handle) {
      const picked = await showHandleModal(getUserName());
      if (!picked) return;
      handle = picked;
      setState({ handle });
    }

    const deviceId = getDeviceId();
    if (!deviceId) {
      showToast("Please register a name first to submit to the leaderboard.");
      return;
    }

    try {
      const result = await apiSubmit({
        device_id: deviceId, handle, subject,
        score_pct, total_questions, time_seconds
      });
      if (result.action === 'kept_existing') {
        showToast(`Your best this week is still ${Number(result.entry.score_pct).toFixed(0)}%`);
      } else {
        showToast(`Submitted! Rank #${result.my_rank} this week 🏆`);
      }
      // Auto-open board after a short delay
      setTimeout(() => showLeaderboardModal(subject), 1500);
    } catch (e) {
      console.error('Leaderboard submit failed:', e);
      showToast('Could not submit to leaderboard (check connection)');
    }
  }

  /* ---------- Settings / utilities ---------- */
  function resetPreferences() {
    localStorage.removeItem(LS_KEY);
  }
  function getHandle() {
    return getState().handle || null;
  }
  function getOptInPref() {
    return getState().opt_in_pref || null;
  }

  /* ---------- Expose ---------- */
  window.LABOBO_LEADERBOARD = {
    handleExamSubmission,
    showLeaderboardModal,
    showHandleModal,
    getHandle,
    getOptInPref,
    resetPreferences
  };
})();
