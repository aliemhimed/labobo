/* Checks every study guide and builds pages you can open in a browser.

     node study-guides/build.cjs

   Guides live in study-guides/<subject>/<part>/*.html as fragments: one
   <article class="lb-guide"> each, with no style or script (the site will
   load lb-guide.css once). This script
     1. checks each fragment against the rules the site needs (no scripts,
        no event attributes, no outside files, links that resolve, unique
        ids, tables in their scroll wrapper, one h1);
     2. writes study-guides/preview/<same path>.html, a standalone page with
        Labobo's colours (light and dark) and lb-guide.css inlined, plus an
        index page listing every guide.
   It exits non-zero if any guide breaks a rule. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'preview');
const css = fs.readFileSync(path.join(ROOT, 'lb-guide.css'), 'utf8');

// Labobo's colour tokens (src/styles/tokens.css), for the standalone pages only.
const TOKENS = `
:root { color-scheme: light dark;
  --paper:#EDF0FF; --sheet:#FFFFFF; --rule:#CDD4F2; --rule-strong:#8C96C8; --ink:#0B1233; --ink-soft:#46527F;
  --ink-muted:#56618D; --edge:#0B1233; --hard:#0B1233; --hema:#2F5BFF; --hema-wash:#E1E7FF; --eosin:#D12A45;
  --correct:#137A50; --correct-wash:#DDF7EE; --wrong-wash:#FFE3E7; --fill-yellow:#FFE45C; --card-ink:#0B1233; }
@media (prefers-color-scheme: dark) { :root {
  --paper:#0A0F2B; --sheet:#151D45; --rule:#28336E; --rule-strong:#4A5A9E; --ink:#F1F4FF; --ink-soft:#B1BCE6;
  --ink-muted:#98A4D6; --edge:#5568B8; --hard:#3557FF; --hema:#7D98FF; --hema-wash:#1F2A66; --eosin:#FF8F9C;
  --correct:#63D6A6; --correct-wash:#133A33; --wrong-wash:#43202A; } }
html { background: var(--paper); }
body { margin: 0; padding: 24px 16px 48px; background: var(--paper); }
.pv-back { display: block; max-width: 46rem; margin: 0 auto 12px; font: 600 0.95rem system-ui, sans-serif; color: var(--hema); }
`;

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === 'preview') continue;
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.html') && dir !== ROOT) out.push(p);
  }
  return out.sort();
}

function check(html) {
  const problems = [];
  const bad = (cond, msg) => { if (cond) problems.push(msg); };
  bad(!/^\s*<article class="lb-guide"/.test(html), 'must start with <article class="lb-guide">');
  bad(/<script\b/i.test(html), 'contains <script>');
  bad(/<style\b/i.test(html), 'contains <style> (use lb-guide.css)');
  bad(/\son[a-z]+\s*=/i.test(html), 'has an on… event attribute');
  bad(/javascript:/i.test(html), 'has a javascript: link');
  bad(/<(link|iframe|form|input|object|embed)\b/i.test(html), 'has an external-file or form element');
  // Pictures only from the guides' own folder, with alt text and a size.
  for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\ssrc="([^"]*)"/.exec(img)?.[1] || '';
    bad(!src.startsWith('/guides/img/'), `picture not from /guides/img/: ${src}`);
    bad(!fs.existsSync(path.join(ROOT, src.replace(/^\/guides\//, ''))), `picture file missing: ${src}`);
    bad(!/\salt="[^"]+"/.test(img) || !/\swidth="\d+"/.test(img) || !/\sheight="\d+"/.test(img), `picture needs alt, width and height: ${src}`);
  }
  bad(/src\s*=\s*"(https?:)?\/\//i.test(html), 'loads an outside file');
  // Outside links are allowed only to YouTube videos (the Watch boxes).
  const outside = [...html.matchAll(/href="((?:https?:)?\/\/[^"]+)"/g)].map((m) => m[1])
    .filter((u) => !/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}(&amp;t=\d+s)?$/.test(u));
  bad(outside.length > 0, `links outside YouTube: ${outside.join(', ')}`);
  bad((html.match(/<h1\b/g) || []).length !== 1, 'needs exactly one h1');
  bad(/all of the above|none of the above|both a and b/i.test(html.split('class="lb-quiz"')[1] || ''), 'quiz uses All/None of the above');

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  bad(dup.length > 0, `duplicate ids: ${[...new Set(dup)].join(', ')}`);
  const missing = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.includes(id));
  bad(missing.length > 0, `links to missing ids: ${missing.join(', ')}`);

  // Every <table> sits directly in a .lb-table-wrap.
  const tables = (html.match(/<table\b/g) || []).length;
  const wrapped = (html.match(/<div class="lb-table-wrap">\s*<table class="lb-table"/g) || []).length;
  bad(tables !== wrapped, `${tables - wrapped} table(s) not in <div class="lb-table-wrap">`);
  bad(/<svg\b(?![^>]*>\s*<title>)/.test(html), 'an <svg> has no <title> first');

  // Balanced tags for the elements that matter most.
  for (const tag of ['article', 'section', 'aside', 'table', 'details', 'ol', 'ul', 'div', 'dl']) {
    const open = (html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    bad(open !== close, `<${tag}> opened ${open}, closed ${close}`);
  }
  // A cell opened as <th> must close as </th>, and <td> as </td>.
  const cells = [...html.matchAll(/<(th|td)\b[^>]*>|<\/(th|td)>/g)];
  let open = null;
  for (const m of cells) {
    if (m[1]) open = m[1];
    else if (open && m[2] !== open) { problems.push(`<${open}> closed with </${m[2]}>`); break; }
    else open = null;
  }
  bad(Buffer.byteLength(html) > 200 * 1024, 'over 200 KB');
  return problems;
}

const title = (html) => (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] || '').replace(/<[^>]+>/g, '').trim();
const attr = (html, name) => new RegExp(`data-${name}="([^"]*)"`).exec(html)?.[1] || '';

const page = (heading, body, back) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${heading}</title>
<style>${TOKENS}
${css}</style></head>
<body>${back ? `<a class="pv-back" href="${back}">All study guides</a>` : ''}
${body}
</body></html>
`;

let failed = 0;
const listed = [];
fs.rmSync(OUT, { recursive: true, force: true });
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  const problems = check(html);
  if (problems.length) {
    failed++;
    console.log(`✗ ${rel}\n    ${problems.join('\n    ')}`);
  } else {
    console.log(`✓ ${rel}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
  }
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const depth = rel.split('/').length - 1;
  fs.writeFileSync(dest, page(title(html), html, `${'../'.repeat(depth)}index.html`));
  listed.push({ rel, title: title(html), part: attr(html, 'part'), topic: attr(html, 'topic') });
}

const groups = {};
for (const g of listed) (groups[g.part] ||= []).push(g);
const index = `<article class="lb-guide"><header class="lb-head"><p class="lb-kicker">Studywith Labobo</p>
<h1>Study guides</h1><p class="lb-lede">Preview pages, not yet on the website. ${listed.length} guides.</p></header>
${Object.entries(groups).map(([part, list]) => `<h2>${part}</h2><ul>${list.map((g) => `<li><a href="${g.rel}">${g.topic || g.title}</a></li>`).join('')}</ul>`).join('\n')}
</article>`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), page('Study guides', index));
// Pictures are referenced as /guides/img/..., so serve the preview folder as the web root.
if (fs.existsSync(path.join(ROOT, 'img'))) fs.cpSync(path.join(ROOT, 'img'), path.join(OUT, 'guides', 'img'), { recursive: true });
console.log(`\n${listed.length} guides, ${failed} with problems. Preview: study-guides/preview/index.html`);
process.exit(failed ? 1 : 0);
