// Turns lecture decks (.pptx, .pdf) and documents (.docx) into slide-numbered text,
// saved next to the original as _text/<name>.md, so later sessions read the short
// text file instead of the deck. Skips files whose text is already up to date.
//
//   node deck-to-text.cjs <file or folder> [...]      (needs pdftotext and unzip on PATH)
//   node deck-to-text.cjs --force <file>               re-extract even if up to date
//
// Output format matches the course indexes (Documents\eu\Sem 4\_index\lectures):
// "## Slide N", the slide text, "[k picture(s): ppt/media/image3.png, ...]", "Notes: ...".
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const force = args.includes('--force');
const inputs = args.filter((a) => a !== '--force');
if (!inputs.length) { console.error('usage: node deck-to-text.cjs [--force] <file or folder> ...'); process.exit(1); }

const run = (cmd, a) => execFileSync(cmd, a, { maxBuffer: 1 << 30 }).toString('utf8');
const unent = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const paras = (xml) => xml.split(/<\/a:p>/).map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('')).filter((s) => s.trim()).map(unent).join('\n');

function pptx(file) {
  const list = run('unzip', ['-Z1', file]).split('\n').map((s) => s.trim());
  const slides = list.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
  return slides.map((s, i) => {
    const xml = run('unzip', ['-p', file, s]);
    const num = s.match(/\d+/)[0];
    const rel = `ppt/slides/_rels/slide${num}.xml.rels`;
    let notes = '', media = [];
    if (list.includes(rel)) {
      const r = run('unzip', ['-p', file, rel]);
      media = [...new Set([...r.matchAll(/Target="\.\.\/media\/([^"]+)"/g)].map((m) => 'ppt/media/' + m[1]))];
      const nm = /notesSlide(\d+)\.xml/.exec(r);
      if (nm) notes = paras(run('unzip', ['-p', file, `ppt/notesSlides/notesSlide${nm[1]}.xml`])).split('\n').filter((l) => !/^\d+$/.test(l.trim())).join('\n');
    }
    const pics = media.length ? `\n[${media.length} picture(s): ${media.join(', ')}]` : '';
    return `## Slide ${i + 1}\n${paras(xml)}${pics}${notes.trim() ? `\nNotes: ${notes.trim()}` : ''}\n`;
  }).join('\n');
}

function pdf(file) {
  return run('pdftotext', ['-enc', 'UTF-8', file, '-']).split('\f')
    .map((p, i) => ({ p: p.trim(), i })).filter((x) => x.p)
    .map((x) => `## Slide ${x.i + 1}\n${x.p}\n`).join('\n');
}

function docx(file) {
  return run('unzip', ['-p', file, 'word/document.xml']).split(/<\/w:p>/)
    .map((p) => unent([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(''))).filter((s) => s.trim()).join('\n');
}

// pdftotext returns scrambled letters when a deck embeds fonts by glyph id (see Sem 4 _index/sources/degly.cjs).
function looksScrambled(text) {
  const letters = text.replace(/^## Slide.*$/gm, '').replace(/[^A-Za-z]/g, '');
  if (letters.length < 200) return false;
  const vowels = (letters.match(/[aeiouAEIOU]/g) || []).length;
  return vowels / letters.length < 0.2;
}

function one(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.pptx', '.pdf', '.docx'].includes(ext)) return;
  const outDir = path.join(path.dirname(file), '_text');
  const out = path.join(outDir, path.basename(file, path.extname(file)) + '.md');
  if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) { console.log('up to date ', out); return; }
  let body;
  try { body = ext === '.pptx' ? pptx(file) : ext === '.pdf' ? pdf(file) : docx(file); }
  catch (e) { console.error('FAILED     ', file, '-', e.message.split('\n')[0]); return; }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, `# ${path.basename(file)}\n\n${body}`);
  const kb = (Buffer.byteLength(body) / 1024).toFixed(0);
  const slides = body.split(/^## Slide \d+$/m).slice(1);
  const empty = slides.filter((s) => !s.replace(/^\[.*picture\(s\).*\]$/gm, '').replace(/^Notes:.*$/gm, '').trim()).length;
  const mostlyPictures = slides.length && empty / slides.length > 0.5;
  console.log(`written     ${out} (${kb} KB)${looksScrambled(body) ? '  WARNING: text looks scrambled, run degly.cjs on it' : ''}${mostlyPictures ? `  WARNING: ${empty}/${slides.length} slides have no text (content is in pictures or scanned pages; look at them)` : ''}`);
}

for (const inp of inputs) {
  if (!fs.existsSync(inp)) { console.error('not found  ', inp); continue; }
  if (fs.statSync(inp).isDirectory()) {
    for (const f of fs.readdirSync(inp)) { const full = path.join(inp, f); if (fs.statSync(full).isFile()) one(full); }
  } else one(inp);
}
