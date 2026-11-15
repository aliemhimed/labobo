/* Which devices may use a pass or trial.

   One account = up to three devices: one phone + two tablets or computers
   ('phone', 'other', 'other_2'). The app makes a random id the first time it
   runs on a device, keeps it in the browser, and sends it with every request:
     X-Labobo-Device:      <the id>
     X-Labobo-Device-Kind: phone | other
   The first phone and the first two tablets/computers to use the paid
   lectures take the three slots (`user_devices`). A fourth device (or a
   second phone) is turned away, unless
     - a device in that kind's slot has not been used for RELEASE_DAYS (a lost
       or replaced device frees itself), or
     - the student moves a slot themselves ("Use this device instead"),
       at most once every SWITCH_DAYS per slot, or
     - an admin clears the account's devices.

   Network check (soft, never blocks a student): each slot stores a keyed hash
   of the request's network prefix (IPv4 address or IPv6 /64 router subnet —
   raw IPs are never stored). When both large-device slots ('other' and
   'other_2') are active within SIMULTANEOUS_MS from different networks,
   `split_hits` is incremented (at most once per SPLIT_COOLDOWN_MS) so admins
   can spot shared accounts without locking out students on campus Wi-Fi or
   Apple iCloud Private Relay. */

const crypto = require('crypto');
const { SUPA_URL, dbHeaders } = require('./common');

const RELEASE_DAYS = 7;
const SWITCH_DAYS = 30;
const DAY_MS = 86_400_000;
const TOUCH_MS = 10 * 60 * 1000;
const SIMULTANEOUS_MS = 15 * 60 * 1000;
const SPLIT_COOLDOWN_MS = 30 * 60 * 1000;

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLOTS = ['phone', 'other', 'other_2'];
const CANDIDATE_SLOTS = { phone: ['phone'], other: ['other', 'other_2'] };
const LARGE_SLOTS = new Set(['other', 'other_2']);
const KIND_NAME = { phone: 'phone', other: 'tablet or computer' };
const SLOT_TITLE = {
  phone: 'Phone',
  other: 'Tablet or computer 1',
  other_2: 'Tablet or computer 2',
};

function normalizeNet(raw) {
  let ip = String(raw || '').split(',')[0].trim();
  if (!ip) return null;
  if (/^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip)) ip = ip.slice(7);
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) ip = ip.split(':')[0];

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    if (ip.startsWith('127.') || ip === '0.0.0.0') return null;
    return `v4:${ip}`;
  }
  if (ip.includes(':')) {
    const clean = ip.split('%')[0].toLowerCase();
    if (clean === '::1' || clean === '::') return null;
    const halves = clean.split('::');
    if (halves.length > 2) return null;
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const missing = halves.length === 2 ? 8 - (left.length + right.length) : 0;
    if (missing < 0) return null;
    const full = halves.length === 2 ? [...left, ...Array(missing).fill('0'), ...right] : left;
    if (full.length !== 8 || full.some((h) => !/^[0-9a-f]{1,4}$/.test(h))) return null;
    return `v6:${full.slice(0, 4).map((h) => h.padStart(4, '0')).join(':')}`;
  }
  return null;
}

function hashNet(rawIp) {
  const net = normalizeNet(rawIp);
  if (!net) return null;
  const secret = process.env.SUPA_SERVICE_KEY || 'labobo-net-salt';
  return crypto.createHmac('sha256', secret).update(net).digest('hex').slice(0, 16);
}

function clientIp(headers = {}) {
  return headers['x-nf-client-connection-ip']
    || headers['X-Nf-Client-Connection-Ip']
    || headers['client-ip']
    || headers['x-forwarded-for']
    || '';
}

function readDevice(event) {
  const h = event?.headers || {};
  const id = String(h['x-labobo-device'] || h['X-Labobo-Device'] || '').trim();
  const kind = String(h['x-labobo-device-kind'] || h['X-Labobo-Device-Kind'] || '').trim();
  if (!ID_RE.test(id) || !['phone', 'other'].includes(kind)) return null;
  return {
    id: id.toLowerCase(),
    kind,
    slot: kind,
    label: describeAgent(h['user-agent'] || h['User-Agent'] || ''),
    netHash: hashNet(clientIp(h)),
  };
}

/** "iPhone · Safari", "Windows · Chrome": enough for a student to recognise a device. */
function describeAgent(ua) {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android phone' : 'Android tablet')
    : /Mac OS X/.test(ua) ? 'Mac or iPad' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'Device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : '';
  return browser ? `${os} · ${browser}` : os;
}

async function db(path, init = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...dbHeaders(), 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`devices ${init.method || 'GET'} ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const listDevices = (userId) =>
  db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}&select=slot,device_id,label,first_seen,last_seen,switched_at,net_hash,split_hits,last_split_at&order=slot`);

function switchStatus(row, now = Date.now()) {
  const switchedAt = row?.switched_at ? new Date(row.switched_at).getTime() : 0;
  const nextSwitch = switchedAt ? new Date(switchedAt + SWITCH_DAYS * DAY_MS).toISOString() : null;
  const canSwitch = !nextSwitch || Date.parse(nextSwitch) <= now;
  return { can_switch: canSwitch, next_switch: canSwitch ? null : nextSwitch };
}

/** Public view of the 3 slots, marking the one this request comes from. */
function describeSlots(list, device, now = Date.now()) {
  return SLOTS.map((slot) => {
    const row = list.find((r) => r.slot === slot);
    const sw = row ? switchStatus(row, now) : { can_switch: true, next_switch: null };
    return {
      slot,
      kind: slot === 'phone' ? 'phone' : 'other',
      name: SLOT_TITLE[slot],
      used: !!row,
      label: row?.label || null,
      last_seen: row?.last_seen || null,
      this_device: !!(row && device && row.device_id === device.id),
      can_switch: sw.can_switch,
      next_switch: sw.next_switch,
    };
  });
}

function shouldCountSplit(list, mySlot, netHash, now) {
  if (!LARGE_SLOTS.has(mySlot) || !netHash) return false;
  const siblingSlot = mySlot === 'other' ? 'other_2' : 'other';
  const sibling = list.find((r) => r.slot === siblingSlot);
  if (!sibling?.net_hash || sibling.net_hash === netHash) return false;
  if (now - new Date(sibling.last_seen).getTime() > SIMULTANEOUS_MS) return false;

  const lastSplit = list.reduce((max, r) => {
    const t = r.last_split_at ? new Date(r.last_split_at).getTime() : 0;
    return Math.max(max, t);
  }, 0);
  return !lastSplit || now - lastSplit >= SPLIT_COOLDOWN_MS;
}

/** Checks (and records) the device for a caller who has full access.
    Returns { ok: true, slots } or { ok: false, reason, slot, slots, ... }. */
async function checkDevice(userId, device) {
  if (!device) return { ok: false, reason: 'missing', slots: [] };

  const kind = device.kind || device.slot;
  const candidates = CANDIDATE_SLOTS[kind] || ['other', 'other_2'];
  const list = await listDevices(userId);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const uid = encodeURIComponent(userId);

  const mine = list.find((r) => r.device_id === device.id);
  if (mine) {
    const split = shouldCountSplit(list, mine.slot, device.netHash, now);
    const stale = now - new Date(mine.last_seen).getTime() > TOUCH_MS;
    const netChanged = Boolean(device.netHash && device.netHash !== mine.net_hash);
    if (stale || split || netChanged || mine.label !== device.label) {
      const patch = {
        last_seen: iso,
        label: device.label,
        ...(device.netHash ? { net_hash: device.netHash } : {}),
        ...(split ? { split_hits: (mine.split_hits || 0) + 1, last_split_at: iso } : {}),
      };
      await db(`/user_devices?user_id=eq.${uid}&slot=eq.${mine.slot}&device_id=eq.${encodeURIComponent(device.id)}`, {
        method: 'PATCH', body: JSON.stringify(patch), headers: { Prefer: 'return=minimal' },
      });
      Object.assign(mine, patch);
    }
    return { ok: true, slots: describeSlots(list, device, now) };
  }

  const freeSlot = candidates.find((s) => !list.some((r) => r.slot === s));
  if (freeSlot) {
    const split = shouldCountSplit(list, freeSlot, device.netHash, now);
    const res = await fetch(`${SUPA_URL}/rest/v1/user_devices?on_conflict=user_id,slot`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: userId,
        slot: freeSlot,
        device_id: device.id,
        label: device.label,
        net_hash: device.netHash || null,
        split_hits: split ? 1 : 0,
        last_split_at: split ? iso : null,
        first_seen: iso,
        last_seen: iso,
      }),
    });
    if (!res.ok) throw new Error(`devices insert: ${res.status} ${await res.text()}`);
    const inserted = await res.json();
    if (inserted.length) return { ok: true, slots: describeSlots([...list, inserted[0]], device, now) };
    return checkDevice(userId, device);
  }

  const holders = candidates
    .map((s) => list.find((r) => r.slot === s))
    .filter(Boolean)
    .sort((a, b) => new Date(a.last_seen) - new Date(b.last_seen));

  const quiet = holders.find((h) => now - new Date(h.last_seen).getTime() > RELEASE_DAYS * DAY_MS);
  if (quiet) {
    await replace(userId, device, quiet, iso, false, list, now);
    return { ok: true, replaced: true, slots: describeSlots(await listDevices(userId), device, now) };
  }

  const describedHolders = holders.map((h) => {
    const sw = switchStatus(h, now);
    return {
      slot: h.slot,
      name: SLOT_TITLE[h.slot],
      label: h.label,
      last_seen: h.last_seen,
      frees_at: new Date(new Date(h.last_seen).getTime() + RELEASE_DAYS * DAY_MS).toISOString(),
      can_switch: sw.can_switch,
      next_switch: sw.next_switch,
    };
  });

  const switchable = describedHolders.filter((h) => h.can_switch);
  const primary = switchable[0] || [...describedHolders].sort((a, b) => Date.parse(a.next_switch) - Date.parse(b.next_switch))[0];
  const earliestFrees = [...describedHolders].sort((a, b) => Date.parse(a.frees_at) - Date.parse(b.frees_at))[0];

  return {
    ok: false,
    reason: 'taken',
    slot: kind,
    slot_name: KIND_NAME[kind],
    holder: { slot: primary.slot, label: primary.label, last_seen: primary.last_seen },
    holders: describedHolders,
    frees_at: earliestFrees.frees_at,
    can_switch: switchable.length > 0,
    next_switch: switchable.length > 0 ? null : primary.next_switch,
    slots: describeSlots(list, device, now),
  };
}

async function replace(userId, device, holder, iso, bySwitch, list = [], now = Date.now()) {
  const split = shouldCountSplit(list, holder.slot, device.netHash, now);
  const body = {
    device_id: device.id,
    label: device.label,
    net_hash: device.netHash || null,
    split_hits: split ? 1 : 0,
    last_split_at: split ? iso : null,
    first_seen: iso,
    last_seen: iso,
  };
  if (bySwitch) body.switched_at = iso;
  await db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}&slot=eq.${holder.slot}&device_id=eq.${encodeURIComponent(holder.device_id)}`, {
    method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' },
  });
}

/** "Use this device instead": moves a slot to this device, once per SWITCH_DAYS per slot. */
async function switchToDevice(userId, device, targetSlot) {
  if (!device) return { ok: false, reason: 'missing' };
  const result = await checkDevice(userId, device);
  if (result.ok) return result;
  if (result.reason !== 'taken') return result;

  const kind = device.kind || device.slot;
  const allowed = CANDIDATE_SLOTS[kind] || ['other', 'other_2'];
  if (targetSlot && !allowed.includes(targetSlot)) return { ...result, reason: 'invalid_slot' };

  const list = await listDevices(userId);
  const now = Date.now();
  const candidates = (targetSlot ? [targetSlot] : allowed)
    .map((s) => list.find((r) => r.slot === s))
    .filter(Boolean)
    .sort((a, b) => new Date(a.last_seen) - new Date(b.last_seen));

  const chosen = candidates.find((r) => switchStatus(r, now).can_switch);
  if (!chosen) return { ...result, reason: 'switch_limit' };

  await replace(userId, device, chosen, new Date(now).toISOString(), true, list, now);
  return { ok: true, switched: true, slots: describeSlots(await listDevices(userId), device, now) };
}

/** Admin: forget every device on an account; the next three to sign in take the slots. */
const clearDevices = (userId) =>
  db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

module.exports = {
  RELEASE_DAYS, SWITCH_DAYS, SIMULTANEOUS_MS, SPLIT_COOLDOWN_MS,
  SLOTS, SLOT_TITLE, normalizeNet, hashNet,
  readDevice, checkDevice, switchToDevice, clearDevices, listDevices, describeSlots, describeAgent,
};
