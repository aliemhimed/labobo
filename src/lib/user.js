import { setUser } from './storage.js';
import { supaInsert } from './supabase.js';
import { uid } from './utils.js';

/** Register a named user: saved locally and recorded in the users table. */
export function registerUser(name) {
  const user = { name, deviceId: uid(), registered: true, joined: new Date().toISOString() };
  setUser(user);
  supaInsert('users', { name: user.name, device_id: user.deviceId, joined: user.joined });
  return user;
}

/** An unregistered visitor: results show, but nothing is saved. */
export function createGuest() {
  const user = { name: 'Guest', deviceId: uid(), registered: false };
  setUser(user);
  return user;
}
