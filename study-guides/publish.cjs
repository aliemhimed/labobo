/* Puts the study guides that are ready into the website.

     node study-guides/publish.cjs

   PUBLISH says which guides go live. For each one this script
     - copies the guide (an <article class="lb-guide"> fragment) to
       public/guides/<subject>/<part>/<name>.html,
     - copies the pictures it uses to public/guides/img/...,
     - lists it in src/lib/guides.json, which the app reads for the guide
       list, the badge on the home page and "Continue reading".
   Everything it wrote before is removed first, so taking a guide out of
   PUBLISH takes it off the site at the next deploy. Run build.cjs first: it
   checks the guides. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = path.join(ROOT, '..');
const OUT = path.join(SITE, 'public', 'guides');
const MANIFEST = path.join(SITE, 'src', 'lib', 'guides.json');

// GCT I, pre-midterm: lectures and weeks 1–7 of every part.
const PUBLISH = {
  gct: {
    scope: 'pre-midterm',
    note: 'up to the midterm',
    include: (g) => typeof g.lecture === 'number' && g.lecture <= 7,
  },
};
const PART_ORDER = ['Biochemistry', 'Medical Genetics', 'Molecular Biology', 'Histology'];

const attr = (html, name) => new RegExp(`data-${name}="([^"]*)"`).exec(html)?.[1] || '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&rsquo;/g, '’');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function describe(subject, rel, html) {
  const [part, file] = rel.split('/').slice(-2);
  const slug = file.replace(/\.html$/, '');
  const body = html.replace(/<details class="lb-slidemap">[\s\S]*?<\/details>/, '');
  const lectures = attr(html, 'lectures');
  return {
    subject,
    part: attr(html, 'part'),
    folder: part,
    slug,
    path: `${part}/${slug}`,
    lecture: /^\d+/.test(lectures) ? Number(lectures.match(/^\d+/)[0]) : null,
    label: text((/class="lb-kicker">([^<]*)/.exec(html) || [])[1] || '').split('·').pop().trim(),
    title: text((/<h1>([\s\S]*?)<\/h1>/.exec(html) || [])[1] || ''),
    lede: text((/class="lb-lede">([\s\S]*?)<\/p>/.exec(html) || [])[1] || ''),
    topics: decode(attr(html, 'topic')).split(/;\s*/).filter(Boolean),
    minutes: Math.max(5, Math.round(text(body).split(' ').length / 200)),
    videos: (html.match(/<li><a href="https:\/\/www\.youtube\.com/g) || []).length,
    pictures: (html.match(/<figure class="lb-figure"/g) || []).length,
    quiz: (html.match(/class="lb-q"/g) || []).length,
  };
}

fs.rmSync(OUT, { recursive: true, force: true });
const manifest = {};
let files = 0;
let bytes = 0;
for (const [subject, rule] of Object.entries(PUBLISH)) {
  const dir = path.join(ROOT, subject);
  const guides = [];
  for (const part of fs.readdirSync(dir)) {
    for (const file of fs.readdirSync(path.join(dir, part)).filter((f) => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(dir, part, file), 'utf8');
      const g = describe(subject, `${part}/${file}`, html);
      if (!rule.include(g)) continue;
      const dest = path.join(OUT, subject, part, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, html);
      bytes += Buffer.byteLength(html);
      files++;
      for (const [, src] of html.matchAll(/<img\b[^>]*\ssrc="\/guides\/(img\/[^"]+)"/g)) {
        const from = path.join(ROOT, src);
        if (!fs.existsSync(from)) throw new Error(`${part}/${file}: missing picture ${src}`);
        const to = path.join(OUT, src);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        bytes += fs.statSync(to).size;
        files++;
      }
      guides.push(g);
    }
  }
  guides.sort((a, b) => PART_ORDER.indexOf(a.part) - PART_ORDER.indexOf(b.part) || (a.lecture ?? 99) - (b.lecture ?? 99));
  manifest[subject] = { scope: rule.scope, note: rule.note, parts: PART_ORDER.filter((p) => guides.some((g) => g.part === p)), guides };
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
for (const [s, m] of Object.entries(manifest)) {
  console.log(`${s}: ${m.guides.length} guides (${m.parts.map((p) => `${p} ${m.guides.filter((g) => g.part === p).length}`).join(', ')})`);
}
console.log(`${files} files, ${(bytes / 1048576).toFixed(1)} MB in public/guides; list in src/lib/guides.json`);
