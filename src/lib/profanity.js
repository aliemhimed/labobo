/* Handle validation for the leaderboard. Same pattern list as the server
   (shared/profanity-patterns.json); the server re-checks every submission, so
   this copy only exists to give instant feedback in the handle dialog. */
import rawPatterns from '../../shared/profanity-patterns.json';

const patterns = rawPatterns.map(({ source, flags }) => new RegExp(source, flags));

const HANDLE_CHARS = /^[A-Za-z0-9_\-؀-ۿ]+$/;

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a').replace(/!/g, 'i').replace(/\$/g, 's');
}

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalize(text);
  return patterns.some((p) => p.test(text) || p.test(normalized));
}

/** null when the handle is acceptable, otherwise a user-facing reason. */
export function validateHandle(handle) {
  const h = String(handle || '').trim();
  if (!h) return 'Handle is required';
  if (h.length < 3) return 'Handle must be at least 3 characters';
  if (h.length > 20) return 'Handle must be 20 characters or fewer';
  if (!HANDLE_CHARS.test(h)) return 'Handle can only contain letters, numbers, _ and -';
  if (containsProfanity(h)) return 'That handle contains inappropriate language';
  return null;
}
