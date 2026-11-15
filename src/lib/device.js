/* This device's id and kind, sent with every signed-in request so the
   server can hold a pass to one phone and two tablets or computers
   (netlify/functions/_lib/devices.js). The id is random and means nothing
   outside Labobo; it is kept in this browser only. */

const KEY = 'labobo-device-id';
let memory = null;

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function deviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (some private modes): one id for as long as the tab lives.
    memory ||= newId();
    return memory;
  }
}

/** 'phone' or 'other'. iPads report themselves as Macs, so they count as 'other', as they should. */
export function deviceKind() {
  const mobile = navigator.userAgentData?.mobile;
  if (typeof mobile === 'boolean') return mobile ? 'phone' : 'other';
  return /iPhone|iPod|Windows Phone|Android.*Mobile|Mobile.*Firefox/i.test(navigator.userAgent) ? 'phone' : 'other';
}

export const deviceHeaders = () => ({ 'X-Labobo-Device': deviceId(), 'X-Labobo-Device-Kind': deviceKind() });
