/* Confetti for rewards (Live): in Labobo's sticker colours, never with
   Reduce motion on. The library loads only when first used. */
import { prefersReducedMotion } from './settings.js';

const COLORS = ['#8FB2FF', '#7DE3C3', '#FFB36B', '#C7ADFF', '#FF8F9C', '#FFE45C'];

/** 'burst': a small pop from the bottom (earning a power-up);
    'podium': two side cannons (the end of a game). */
export async function celebrate(kind = 'burst') {
  if (prefersReducedMotion()) return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    const base = { colors: COLORS, disableForReducedMotion: true, ticks: 160, scalar: 0.9 };
    if (kind === 'podium') {
      confetti({ ...base, particleCount: 90, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
      confetti({ ...base, particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
    } else {
      confetti({ ...base, particleCount: 50, spread: 70, startVelocity: 32, origin: { x: 0.5, y: 0.9 } });
    }
  } catch { /* purely decorative */ }
}
