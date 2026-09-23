/* Announcements are authored in Supabase with a little inline HTML
   (<strong>, links). That HTML reaches every visitor, so it is filtered down to
   a small allowlist before it is ever put into the DOM: unknown tags are
   unwrapped to their text, and every attribute is dropped except a safe
   http(s)/mailto href on <a>. */

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'UL', 'OL', 'LI', 'CODE', 'A']);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT']);

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function cleanNode(node, doc) {
  const out = doc.createDocumentFragment();
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(doc.createTextNode(child.nodeValue));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName;
      if (DROP_WITH_CONTENT.has(tag)) continue;
      if (!ALLOWED_TAGS.has(tag)) {
        out.appendChild(cleanNode(child, doc));
        continue;
      }
      const el = doc.createElement(tag.toLowerCase());
      if (tag === 'A') {
        const href = child.getAttribute('href') || '';
        if (/^(https?:|mailto:)/i.test(href.trim())) {
          el.setAttribute('href', href.trim());
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
      el.appendChild(cleanNode(child, doc));
      out.appendChild(el);
    }
  }
  return out;
}

/** Returns an HTML string that is safe to assign to innerHTML. */
export function sanitizeHtml(html) {
  const parsed = new DOMParser().parseFromString(`<body>${String(html ?? '')}</body>`, 'text/html');
  const holder = document.createElement('div');
  holder.appendChild(cleanNode(parsed.body, document));
  return holder.innerHTML;
}
