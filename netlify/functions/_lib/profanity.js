/* Server-side copy of the handle validator in src/legacy/profanity.js, so the
   leaderboard can't be handed a handle that skipped the browser check.
   Keep the pattern list in sync with that file (Phase 3 removes the duplicate
   by porting the client to a shared module). */

const BANNED_PATTERNS = [
  /f+u+c+k+/i, /\bf+a+g+/i, /s+h+i+t+/i, /b+i+t+c+h+/i, /a+s+s+h+o+l+e+/i,
  /\bc+u+n+t+/i, /d+i+c+k+\b/i, /\bc+o+c+k+\b/i, /\bp+u+s+s+y+/i, /\bw+h+o+r+e+/i,
  /\bs+l+u+t+/i, /\bh+o+e+\b/i, /\bp(o|0)rn/i, /\br+a+p+(e|er|ist)/i, /\bk+i+l+l+/i,
  /\bd+i+e+\b/i, /\bsuicide\b/i, /\bnaz+i+/i,
  /\bn+i+g+(g+|er|ah)/i, /\bsp+i+c+\b/i, /\bk+i+k+e+\b/i, /\bch+i+n+k+\b/i,
  /\bg+o+o+k+\b/i, /\bd+y+k+e+\b/i, /\bretard/i,
  /\bk+o+s+\b/i, /\bk+u+s+\b/i, /\bk+o+s+s+\b/i, /\bzi+b+\b/i, /\bzo+b+\b/i,
  /\bz+u+b+r+/i, /\btee+z+\b/i, /\bti+z+\b/i, /\bahb+a+l+/i, /\bhm+a+r+\b/i,
  /\bya7mar/i, /\bya\s*hmar/i, /\bkhr+a+\b/i, /\bshar+m+o+u+t+/i, /\bmet+n+a+k+/i,
  /\bibn\s*k+a+l+b+/i, /\bibnel/i, /\bya\s*kalb/i, /\bmanyak/i, /\bsharmoota/i, /\bgahba/i,
  /كس/, /زب/, /طيز/, /خرا/, /خرى/, /شرموطة/, /شرموط/, /متناك/, /منيوك/,
  /قحبة/, /قواد/, /كلب\s*بن\s*كلب/, /ابن\s*الكلب/, /ابن\s*الحرام/, /يا\s*كلب/,
  /يا\s*حمار/, /يا\s*غبي/, /زبر/,
  /\bkafir/i, /كافر/, /مرتد/,
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a').replace(/!/g, 'i').replace(/\$/g, 's');
}

function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalize(text);
  return BANNED_PATTERNS.some((p) => p.test(text) || p.test(normalized));
}

/** null when the handle is acceptable, otherwise a user-facing reason. */
function validateHandle(handle) {
  const h = String(handle || '').trim();
  if (h.length < 3) return 'Handle must be at least 3 characters';
  if (h.length > 20) return 'Handle must be 20 characters or fewer';
  if (!/^[A-Za-z0-9_\-؀-ۿ]+$/.test(h)) return 'Handle can only contain letters, numbers, _ and -';
  if (containsProfanity(h)) return 'That handle contains inappropriate language';
  return null;
}

module.exports = { containsProfanity, validateHandle };
