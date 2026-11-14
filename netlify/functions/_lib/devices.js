/* Which devices may use a pass or trial.

   One account = one phone + one other device (tablet or computer). The app
   makes a random id the first time it runs on a device, keeps it in the
   browser, and sends it with every request as
     X-Labobo-Device:      <the id>
     X-Labobo-Device-Kind: phone | other
   The first phone and the first other device to use the paid lectures take
   the two slots (`user_devices`). A third device is turned away, unless
     - the device in that slot has not been used for RELEASE_DAYS (a lost
       or replaced phone frees itself), or
     - the student moves the slot themselves ("Use this device instead"),
       at most once every SWITCH_DAYS per slot, or
     - an admin clears the account's devices.
   This does not make sharing impossible (clearing the browser makes a new
   id); it makes sharing one pass between several people impractical. */

const { SUPA_URL, dbHeaders } = require('./common');

const RELEASE_DAYS = 7;
const SWITCH_DAYS = 30;
const DAY_MS = 86_400_000;
const TOUCH_MS = 60 * 60 * 1000; // update last_seen at most hourly

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** { id, slot, label } from the request headers, or null if missing or malformed. */
function readDevice(event) {
  const h = event?.headers || {};
  const id = String(h['x-labobo-device'] || '').trim();
  const kind = String(h['x-labobo-device-kind'] || '').trim();
  if (!ID_RE.test(id) || !['phone', 'other'].includes(kind)) return null;
  return { id: id.toLowerCase(), slot: kind, label: describeAgent(h['user-agent'] || '') };
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
  db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}&select=slot,device_id,label,first_seen,last_seen,switched_at&order=slot`);

const SLOT_NAME = { phone: 'phone', other: 'tablet or computer' };

/** Public view of the slots, marking the one this request comes from. */
function describeSlots(list, device) {
  return ['phone', 'other'].map((slot) => {
    const row = list.find((r) => r.slot === slot);
    return {
      slot,
      name: SLOT_NAME[slot],
      used: !!row,
      label: row?.label || null,
      last_seen: row?.last_seen || null,
      this_device: !!(row && device && row.device_id === device.id),
    };
  });
}

/** Checks (and records) the device for a caller who has full access.
    Returns { ok: true, slots } or { ok: false, reason, slot, slots, ... }.
    reason: 'missing'  the request carried no device id (an old copy of the app)
            'taken'    another device holds this slot and was used recently */
async function checkDevice(userId, device) {
  if (!device) return { ok: false, reason: 'missing', slots: [] };
  const list = await listDevices(userId);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const uid = encodeURIComponent(userId);

  // A known device keeps working in whichever slot it holds (a phone that
  // switches to "desktop site" still counts as the phone it registered as).
  const mine = list.find((r) => r.device_id === device.id);
  if (mine) {
    if (now - new Date(mine.last_seen).getTime() > TOUCH_MS) {
      await db(`/user_devices?user_id=eq.${uid}&slot=eq.${mine.slot}&device_id=eq.${encodeURIComponent(device.id)}`, {
        method: 'PATCH', body: JSON.stringify({ last_seen: iso, label: device.label }), headers: { Prefer: 'return=minimal' },
      });
    }
    return { ok: true, slots: describeSlots(list, device) };
  }

  const holder = list.find((r) => r.slot === device.slot);
  if (!holder) {
    // Free slot: take it. If a parallel request took it first, look again.
    const res = await fetch(`${SUPA_URL}/rest/v1/user_devices?on_conflict=user_id,slot`, {
      method: 'POST',
      headers: { ...dbHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ user_id: userId, slot: device.slot, device_id: device.id, label: device.label, first_seen: iso, last_seen: iso }),
    });
    if (!res.ok) throw new Error(`devices insert: ${res.status} ${await res.text()}`);
    const inserted = await res.json();
    if (inserted.length) return { ok: true, slots: describeSlots([...list, inserted[0]], device) };
    return checkDevice(userId, device);
  }

  // Slot held by a device that has gone quiet: this one takes it over.
  if (now - new Date(holder.last_seen).getTime() > RELEASE_DAYS * DAY_MS) {
    await replace(userId, device, holder, iso, false);
    return { ok: true, replaced: true, slots: describeSlots(await listDevices(userId), device) };
  }

  const switchedAt = holder.switched_at ? new Date(holder.switched_at).getTime() : 0;
  const nextSwitch = switchedAt ? new Date(switchedAt + SWITCH_DAYS * DAY_MS).toISOString() : null;
  return {
    ok: false,
    reason: 'taken',
    slot: device.slot,
    slot_name: SLOT_NAME[device.slot],
    holder: { label: holder.label, last_seen: holder.last_seen },
    frees_at: new Date(new Date(holder.last_seen).getTime() + RELEASE_DAYS * DAY_MS).toISOString(),
    can_switch: !nextSwitch || Date.parse(nextSwitch) <= now,
    next_switch: nextSwitch && Date.parse(nextSwitch) > now ? nextSwitch : null,
    slots: describeSlots(list, device),
  };
}

async function replace(userId, device, holder, iso, bySwitch) {
  const body = { device_id: device.id, label: device.label, first_seen: iso, last_seen: iso };
  if (bySwitch) body.switched_at = iso;
  // Match the old device id too, so two devices racing for the slot cannot both win.
  await db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}&slot=eq.${holder.slot}&device_id=eq.${encodeURIComponent(holder.device_id)}`, {
    method: 'PATCH', body: JSON.stringify(body), headers: { Prefer: 'return=minimal' },
  });
}

/** "Use this device instead": moves the slot to this device, once per SWITCH_DAYS. */
async function switchToDevice(userId, device) {
  if (!device) return { ok: false, reason: 'missing' };
  const result = await checkDevice(userId, device);
  if (result.ok) return result;
  if (result.reason !== 'taken') return result;
  if (!result.can_switch) return { ...result, reason: 'switch_limit' };
  const holder = (await listDevices(userId)).find((r) => r.slot === device.slot);
  await replace(userId, device, holder, new Date().toISOString(), true);
  return { ok: true, switched: true, slots: describeSlots(await listDevices(userId), device) };
}

/** Admin: forget every device on an account; the next two to sign in take the slots. */
const clearDevices = (userId) =>
  db(`/user_devices?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

module.exports = { RELEASE_DAYS, SWITCH_DAYS, readDevice, checkDevice, switchToDevice, clearDevices, listDevices, describeSlots, describeAgent };
