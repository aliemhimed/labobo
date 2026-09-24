"""One-off asset optimiser (Pillow). Run from the repo root:

    python scripts/optimize_images.py

- public/images/medart/*.{png,jpg,jpeg} -> .webp, max 1600px wide
- public/images/medart/*.webp -> sm/<same name>.webp, fitted to 1040x720:
  the size the quiz actually shows (2x its 520x360 image box). The full
  file stays for the "open image" link. Re-run after adding medart images.
- public/theme/* -> right-sized WebP/PNG icons with clean filenames
- meme GIF/JPG/WebP folders -> public/memes/{right,wrong}/<kebab-name>.webp
  (animated GIFs stay animated)

Originals are deleted afterwards; they remain in git history. Prints the meme
filename mapping so src/lib/memes.js can be updated.
"""
import os, re, shutil, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'

def kb(p): return os.path.getsize(p) / 1024

def slug(stem):
    s = re.sub(r'[^a-z0-9]+', '-', stem.lower()).strip('-')
    return s or 'img'

def save_static(im, dest, quality=80, max_w=None, max_h=None):
    im.load()
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGBA' if 'A' in im.getbands() or im.info.get('transparency') else 'RGB')
    w, h = im.size
    scale = min((max_w / w) if max_w else 1, (max_h / h) if max_h else 1, 1)
    if scale < 1:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=quality, method=6)

def convert(src, dest, **kw):
    """src -> dest as WebP (animated stays animated). Returns (before, after) KB."""
    before = kb(src)
    with Image.open(src) as im:
        frames = getattr(im, 'n_frames', 1)
        if frames > 1:
            im.save(dest, 'WEBP', save_all=True, quality=kw.get('quality', 75), method=6, loop=0)
        else:
            save_static(im, dest, **kw)
    return before, kb(dest)

total_before = total_after = 0
def report(name, b, a):
    global total_before, total_after
    total_before += b; total_after += a
    print(f'  {name}: {b:,.0f} KB -> {a:,.0f} KB')

# ---- medart --------------------------------------------------------------
print('medart')
for f in sorted((PUB / 'images' / 'medart').iterdir()):
    if f.suffix.lower() in ('.png', '.jpg', '.jpeg'):
        dest = f.with_suffix('.webp')
        b, a = convert(f, dest, quality=80, max_w=1600)
        report(f.name, b, a)
        f.unlink()

# Display copies for the quiz (see the docstring). Images that already fit
# are copied as-is so every image has an sm/ twin.
print('medart display copies')
SM = PUB / 'images' / 'medart' / 'sm'
SM.mkdir(exist_ok=True)
for f in sorted((PUB / 'images' / 'medart').glob('*.webp')):
    dest = SM / f.name
    if dest.exists() and dest.stat().st_mtime >= f.stat().st_mtime:
        continue
    with Image.open(f) as im:
        w, h = im.size
        fits = w <= 1040 and h <= 720
    if fits:
        shutil.copyfile(f, dest)
    else:
        with Image.open(f) as im:
            save_static(im, dest, quality=80, max_w=1040, max_h=720)
        if dest.stat().st_size >= f.stat().st_size:  # re-encoding didn't pay off
            shutil.copyfile(f, dest)
    report(f'sm/{f.name}', kb(f), kb(dest))

# ---- theme ---------------------------------------------------------------
if (PUB / 'theme' / 'full-body mascot.png').exists():  # skip on re-runs
    print('theme')
    theme = PUB / 'theme'
    def theme_asset(src_name, dest_name, **kw):
        src = theme / src_name
        dest = theme / dest_name
        b, a = convert(src, dest, **kw)
        report(dest_name, b, a)
        return src

    srcs = [
        theme_asset('full-body mascot.png', 'mascot.webp', quality=85, max_h=320),
        theme_asset('app icon.png', 'app-icon.webp', quality=88, max_w=160),
        theme_asset('wordmark (text logo).png', 'wordmark.webp', quality=85, max_w=800),
    ]
    # 180px apple-touch icon and a padded 64px favicon (PNG: broadest support).
    with Image.open(theme / 'app icon.png') as im:
        im.convert('RGB').resize((180, 180), Image.LANCZOS).save(theme / 'apple-touch-icon.png', optimize=True)
    with Image.open(theme / 'line art  favicon version.png') as im:
        im = im.convert('RGBA'); im.thumbnail((60, 60), Image.LANCZOS)
        canvas = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        canvas.paste(im, ((64 - im.width) // 2, (64 - im.height) // 2), im)
        canvas.save(theme / 'favicon.png', optimize=True)
    print(f'  apple-touch-icon.png {kb(theme / "apple-touch-icon.png"):.0f} KB, favicon.png {kb(theme / "favicon.png"):.0f} KB')
    srcs.append(theme / 'line art  favicon version.png')
    for s in srcs:
        s.unlink()


# ---- memes ---------------------------------------------------------------
print('memes')
mapping = {}
for old, new in (('right answer', 'right'), ('wrong answer memes reactions', 'wrong')):
    out = PUB / 'memes' / new
    out.mkdir(parents=True, exist_ok=True)
    used = set()
    for f in sorted((PUB / old).iterdir()):
        name = slug(f.stem)
        while name in used: name += '-x'
        used.add(name)
        dest = out / f'{name}.webp'
        b, a = convert(f, dest, quality=72, max_w=500)
        report(f'{new}/{name}', b, a)
        mapping[f'{old}/{f.name}'] = f'{new}/{name}.webp'
        f.unlink()
    try:
        (PUB / old).rmdir()
    except OSError:
        print(f'  (could not remove empty folder {old!r}; delete it by hand)')

print(f'\nTotal: {total_before/1024:,.1f} MB -> {total_after/1024:,.1f} MB')
print('\nMEME MAPPING'); [print(k, '=>', v) for k, v in mapping.items()]
