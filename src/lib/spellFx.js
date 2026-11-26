// Spell effects on the projector, played with Effekseer for WebGL (public/fx,
// see CREDITS.txt there). Loaded only the first time a spell lands on a
// projector, never on phones. Off under Reduce motion, and anything that
// fails (no WebGL, blocked WebAssembly) just leaves the CSS banner on its own.
import { prefersReducedMotion } from './settings.js';

const BASE = '/fx/';
// Spell -> effect file. Blocked spells and point steals have their own.
const EFFECT_FOR = {
  cataract: 'Light', scotoma: 'Blow1', aphasia: 'Arrow1', paralysis: 'ToonHit', tachycardia: 'Blow1',
  point_steal: 'ToonHit', second_opinion: 'Cure1', double_or_nothing: 'Cure1',
  blocked: 'ToonWater',
};
const SCALE = { Light: 1.6, Blow1: 2.2, Arrow1: 1.6, ToonHit: 2.4, Cure1: 2.2, ToonWater: 2.4 };

let ready = null; // Promise<{ play(name) } | null>

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.effekseer) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('effekseer script'));
    document.head.appendChild(s);
  });
}

async function start() {
  await loadScript(BASE + 'effekseer.min.js');
  const fx = window.effekseer;
  await new Promise((resolve, reject) => fx.initRuntime(BASE + 'effekseer.wasm', resolve, () => reject(new Error('effekseer wasm'))));

  const canvas = document.createElement('canvas');
  canvas.className = 'spell-fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { canvas.remove(); return null; }
  const ctx = fx.createContext();
  ctx.init(gl);

  const effects = new Map();
  const load = (name) => {
    if (!effects.has(name)) {
      effects.set(name, new Promise((resolve) => {
        const e = ctx.loadEffect(`${BASE}${name}.efkefc`, SCALE[name] || 2, () => resolve(e), () => resolve(null));
      }));
    }
    return effects.get(name);
  };

  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    ctx.setProjectionPerspective(30, canvas.width / canvas.height, 1, 1000);
    ctx.setCameraLookAt(0, 0, 40, 0, 0, 0, 0, 1, 0);
  };
  size();
  window.addEventListener('resize', size);

  // Draw only while something is playing.
  const handles = new Set();
  let raf = 0; let last = 0;
  const frame = (t) => {
    const frames = last ? Math.min(4, ((t - last) / 1000) * 60) : 1;
    last = t;
    ctx.update(frames);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    ctx.draw();
    for (const h of handles) if (!h.exists) handles.delete(h);
    if (handles.size) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; gl.clear(gl.COLOR_BUFFER_BIT); }
  };

  return {
    async play(name) {
      const effect = await load(name);
      if (!effect) return;
      // A little above the middle: the banner sits at the bottom.
      handles.add(ctx.play(effect, 0, 2, 0));
      if (!raf) raf = requestAnimationFrame(frame);
    },
  };
}

/** Play the effect for a spell event ({ spell, blocked, amount }). Never throws. */
export function playSpellFx(payload) {
  if (prefersReducedMotion()) return;
  const name = payload?.blocked ? EFFECT_FOR.blocked : EFFECT_FOR[payload?.spell];
  if (!name) return;
  if (!ready) {
    ready = start().catch((e) => { console.warn('[live] spell effects unavailable', e?.message || e); return null; });
  }
  ready.then((player) => player?.play(name)).catch(() => {});
}
