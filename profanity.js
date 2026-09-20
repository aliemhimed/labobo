/* ============================================================
   LABOBO PROFANITY FILTER
   ============================================================
   Blocks obvious profanity in English + Arabic (script + Latin).
   You can ADD or REMOVE entries from BANNED_TERMS below.
   Returns true if the text contains any banned term.

   Conservative by default — only blocks obvious offensive terms,
   not edge cases like "Hassan" or "Ahmed".
   ============================================================ */

(function() {
  // Each entry: regex pattern (case-insensitive, Unicode-aware)
  // Patterns match substring within the handle after normalization
  const BANNED_PATTERNS = [
    // English profanity
    /f+u+c+k+/i,
    /\bf+a+g+/i,
    /s+h+i+t+/i,
    /b+i+t+c+h+/i,
    /a+s+s+h+o+l+e+/i,
    /\bc+u+n+t+/i,
    /d+i+c+k+\b/i,
    /\bc+o+c+k+\b/i,
    /\bp+u+s+s+y+/i,
    /\bw+h+o+r+e+/i,
    /\bs+l+u+t+/i,
    /\bh+o+e+\b/i,
    /\bp(o|0)rn/i,
    /\br+a+p+(e|er|ist)/i,
    /\bk+i+l+l+/i,
    /\bd+i+e+\b/i,
    /\bsuicide\b/i,
    /\bnaz+i+/i,

    // Racial slurs (no leniency)
    /\bn+i+g+(g+|er|ah)/i,
    /\bsp+i+c+\b/i,
    /\bk+i+k+e+\b/i,
    /\bch+i+n+k+\b/i,
    /\bg+o+o+k+\b/i,
    /\bd+y+k+e+\b/i,
    /\bretard/i,

    // Arabic profanity — Latin transliteration
    /\bk+o+s+\b/i,           // kos
    /\bk+u+s+\b/i,           // kus
    /\bk+o+s+s+\b/i,
    /\bzi+b+\b/i,
    /\bzo+b+\b/i,
    /\bz+u+b+r+/i,
    /\btee+z+\b/i,           // teez
    /\bti+z+\b/i,            // tiz
    /\bahb+a+l+/i,
    /\bhm+a+r+\b/i,          // hmar (donkey, insult)
    /\bya7mar/i,
    /\bya\s*hmar/i,
    /\bkhr+a+\b/i,           // khra
    /\bshar+m+o+u+t+/i,      // sharmoota
    /\bmet+n+a+k+/i,
    /\bibn\s*k+a+l+b+/i,     // ibn kalb (son of dog)
    /\bibnel/i,
    /\bya\s*kalb/i,
    /\bmanyak/i,
    /\bsharmoota/i,
    /\bgahba/i,

    // Arabic script — common offensive words
    /كس/, /زب/, /طيز/, /خرا/, /خرى/,
    /شرموطة/, /شرموط/, /متناك/, /منيوك/,
    /قحبة/, /قواد/, /كلب\s*بن\s*كلب/,
    /ابن\s*الكلب/, /ابن\s*الحرام/, /يا\s*كلب/,
    /يا\s*حمار/, /يا\s*غبي/, /زبر/,

    // Anti-religious slurs (any direction)
    /\bkafir/i, /كافر/, /مرتد/
  ];

  function normalize(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[0]/g, 'o').replace(/[1]/g, 'i').replace(/[3]/g, 'e')
      .replace(/[4]/g, 'a').replace(/[5]/g, 's').replace(/[7]/g, 't')
      .replace(/[@]/g, 'a').replace(/[!]/g, 'i').replace(/[$]/g, 's');
  }

  function containsProfanity(text) {
    if (!text || typeof text !== 'string') return false;
    const original = text;
    const normalized = normalize(text);
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(original) || pattern.test(normalized)) {
        return true;
      }
    }
    return false;
  }

  // Validate handle: length, charset, profanity
  // Returns null if valid, or an error string
  function validateHandle(handle) {
    if (!handle || !handle.trim()) return 'Handle is required';
    const h = handle.trim();
    if (h.length < 3) return 'Handle must be at least 3 characters';
    if (h.length > 20) return 'Handle must be 20 characters or fewer';
    // Allow letters (Latin + Arabic), digits, underscore, hyphen
    if (!/^[A-Za-z0-9_\-؀-ۿ]+$/.test(h)) {
      return 'Handle can only contain letters, numbers, _ and -';
    }
    if (containsProfanity(h)) return 'That handle contains inappropriate language';
    return null;
  }

  window.LABOBO_PROFANITY = { containsProfanity, validateHandle };
})();
