/* A 1080×1350 picture of a finished set's score, for Instagram stories and
   chats. Drawn on a canvas, then handed to the phone's share sheet when it
   takes files, or downloaded otherwise. */

const W = 1080;
const H = 1350;
const FILLS = { good: '#7DE3C3', warn: '#FFE45C', bad: '#FF8F9C' };
const INK = '#0B1233';

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawScoreCard({ subject, kind, correct, total, score }) {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const display = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'sans-serif';
  const band = score >= 75 ? 'good' : score >= 50 ? 'warn' : 'bad';

  // Page: navy with a dot grid, like the site.
  ctx.fillStyle = '#0A0F2B';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let x = 30; x < W; x += 40) for (let y = 30; y < H; y += 40) ctx.fillRect(x, y, 3, 3);

  // Sticky note with a hard shadow.
  const nx = 90, ny = 170, nw = W - 180, nh = 720;
  ctx.save();
  ctx.translate(W / 2, ny + nh / 2);
  ctx.rotate(-0.025);
  ctx.translate(-W / 2, -(ny + nh / 2));
  ctx.fillStyle = '#3D5BFF';
  roundRect(ctx, nx + 16, ny + 16, nw, nh, 36); ctx.fill();
  ctx.fillStyle = FILLS[band];
  roundRect(ctx, nx, ny, nw, nh, 36); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = `800 64px ${display}`;
  ctx.fillText(`I got ${correct} of ${total} right`, W / 2, ny + 140);
  ctx.font = `800 260px ${display}`;
  ctx.fillText(`${score}%`, W / 2, ny + 420);
  ctx.font = `700 52px ${display}`;
  wrap(ctx, `on a ${kind} in ${subject}`, nw - 120).slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, W / 2, ny + 540 + i * 64));
  ctx.restore();

  // Mascot and the address.
  const mascot = await loadImage('/theme/mascot-lg.webp');
  if (mascot) {
    const mh = 380, mw = (mascot.width / mascot.height) * mh;
    ctx.drawImage(mascot, 80, H - mh - 40, mw, mh);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 56px ${display}`;
  ctx.fillText('Studywith Labobo', W - 80, H - 150);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 40px ${display}`;
  ctx.fillText('studywithlabobo.online', W - 80, H - 90);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Returns 'shared', 'downloaded' or 'cancelled'. */
export async function shareScore(details) {
  const blob = await drawScoreCard(details);
  if (!blob) throw new Error('Could not draw the picture');
  const file = new File([blob], 'labobo-score.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: 'Studying on studywithlabobo.online' });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'labobo-score.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
