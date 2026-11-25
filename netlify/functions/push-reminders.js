/* Netlify Scheduled Function: the daily study reminder.
   Runs every hour (schedule in netlify.toml). For each push subscription
   whose local time has reached the student's chosen hour and that hasn't had
   today's reminder, it checks whether the student has studied today; if not,
   it sends an empty push and public/sw.js shows "Keep your streak going".

   "Studied today" = their synced progress changed today (a finished practice
   set or exam) or they answered in Study mode / flashcards today. */

const { SUPA_URL, dbHeaders } = require('./_lib/common');
const { isConfigured, privateKey, sendEmptyPush } = require('./_lib/webpush');

const rest = (path, init = {}) =>
  fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });

async function rows(path) {
  const res = await rest(path);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

/** Local date (YYYY-MM-DD), hour, and the UTC instant the local day began. */
function localClock(tz, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour);
  const sinceMidnight = ((hour * 60 + Number(parts.minute)) * 60 + Number(parts.second)) * 1000;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour, dayStart: new Date(now.getTime() - sinceMidnight).toISOString() };
}

async function studiedToday(userId, clock) {
  const [progress, study] = await Promise.all([
    rows(`/user_progress?user_id=eq.${userId}&updated_at=gte.${encodeURIComponent(clock.dayStart)}&select=prefix&limit=1`),
    rows(`/study_activity?user_id=eq.${userId}&day=eq.${clock.date}&select=day&limit=1`),
  ]);
  return progress.length > 0 || study.length > 0;
}

exports.handler = async () => {
  if (!isConfigured()) {
    console.log('[push-reminders] VAPID keys not set; nothing to do');
    return { statusCode: 200, body: 'not configured' };
  }
  const key = privateKey();
  const subs = await rows('/push_subscriptions?select=endpoint,user_id,remind_hour,tz,last_sent,failures');
  const studied = new Map(); // user_id -> boolean, checked once per run
  let sent = 0, skipped = 0, removed = 0;

  for (const s of subs) {
    let clock;
    try { clock = localClock(s.tz); } catch { clock = localClock('Asia/Tbilisi'); }
    if (clock.hour < s.remind_hour || s.last_sent === clock.date) continue;

    if (!studied.has(s.user_id)) studied.set(s.user_id, await studiedToday(s.user_id, clock).catch(() => false));
    const endpointQ = `endpoint=eq.${encodeURIComponent(s.endpoint)}`;
    if (studied.get(s.user_id)) {
      // Already studied: count today as done so we don't check again.
      await rest(`/push_subscriptions?${endpointQ}`, { method: 'PATCH', body: JSON.stringify({ last_sent: clock.date }) });
      skipped++;
      continue;
    }

    let status = 0;
    try { status = await sendEmptyPush(s.endpoint, key); } catch (e) { console.error('[push-reminders] send failed', e.message); }
    if (status === 404 || status === 410 || (status >= 400 && s.failures >= 4)) {
      await rest(`/push_subscriptions?${endpointQ}`, { method: 'DELETE' });
      removed++;
    } else if (status >= 200 && status < 300) {
      await rest(`/push_subscriptions?${endpointQ}`, { method: 'PATCH', body: JSON.stringify({ last_sent: clock.date, failures: 0 }) });
      sent++;
    } else {
      await rest(`/push_subscriptions?${endpointQ}`, { method: 'PATCH', body: JSON.stringify({ failures: (s.failures || 0) + 1 }) });
    }
  }

  console.log(`[push-reminders] sent ${sent}, already studied ${skipped}, removed ${removed}, of ${subs.length}`);
  return { statusCode: 200, body: 'ok' };
};
