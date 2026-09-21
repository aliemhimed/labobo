/* Client for /api/leaderboard. The server validates everything again; the
   result of a submission is { action: 'inserted'|'updated'|'kept_existing',
   entry, my_rank, week_start }. */

async function request(url, init) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function fetchBoard(subject, deviceId, signal) {
  const qs = new URLSearchParams({ subject });
  if (deviceId) qs.set('device_id', deviceId);
  return request(`/api/leaderboard?${qs}`, { signal });
}

export function submitScore(payload) {
  return request('/api/leaderboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fmtTime(secs) {
  if (secs === null || secs === undefined) return '—';
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, '0')}`;
}

/** "Resets in 3d 4h" for the week that started on `weekStart` (YYYY-MM-DD, UTC). */
export function fmtCountdown(weekStart) {
  const end = new Date(weekStart + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 7);
  const ms = end - Date.now();
  if (ms <= 0) return 'Resetting…';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `Resets in ${days}d ${hours}h` : `Resets in ${hours}h`;
}
