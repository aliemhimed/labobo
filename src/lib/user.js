import { getUser, setUser } from './storage.js';
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

/** The current user, or a fresh guest if this is a first visit. Used instead
    of a "register before you can do anything" gate — subjects and quizzes
    are usable immediately, and a name is asked for only where it actually
    matters (saving a result, the leaderboard). Idempotent: safe to call from
    a lazy useState initializer even under a double-invoking dev mode. */
export function ensureGuest() {
  return getUser() || createGuest();
}
