import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MEME_CONFIG, RIGHT_MEMES, WRONG_MEMES, RIGHT_CAPTIONS, WRONG_CAPTIONS,
  RIGHT_DIR, WRONG_DIR,
} from '../lib/memes.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Warm the cache for one meme of each kind, once per session, after the
   first answer, so the popup rarely shows a blank frame without downloading
   the whole set up front. Never runs in exam mode (no popups there). */
const preloaded = new Set();
function preloadOne(dir, list) {
  const src = dir + pick(list);
  if (preloaded.has(src)) return;
  preloaded.add(src);
  new Image().src = src;
}

/**
 * Returns [element, trigger, dismiss]. `trigger(isCorrect)` maybe shows a
 * popup — never during an exam, and only at MEME_CONFIG.PROBABILITY.
 */
export function useMeme(quizMode) {
  // phase: 'in' (entering/shown) | 'out' (animating away)
  const [meme, setMeme] = useState(null);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  const fadeTimer = useRef(null);

  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(fadeTimer.current); }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setLeaving(true);
    clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setMeme(null);
      setLeaving(false);
      setVisible(false);
    }, MEME_CONFIG.FADE_MS);
  }, []);

  const trigger = useCallback((isCorrect) => {
    if (quizMode === 'exam') return;
    preloadOne(RIGHT_DIR, RIGHT_MEMES);
    preloadOne(WRONG_DIR, WRONG_MEMES);
    if (Math.random() > MEME_CONFIG.PROBABILITY) return;
    const src = isCorrect ? RIGHT_DIR + pick(RIGHT_MEMES) : WRONG_DIR + pick(WRONG_MEMES);
    const caption = pick(isCorrect ? RIGHT_CAPTIONS : WRONG_CAPTIONS);
    clearTimeout(timer.current);
    clearTimeout(fadeTimer.current);
    setLeaving(false);
    setVisible(false);
    setMeme({ src, caption, isCorrect, key: Math.random() });
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    timer.current = setTimeout(dismiss, MEME_CONFIG.DISPLAY_MS);
  }, [quizMode, dismiss]);

  const element = meme ? (
    <div id="memePopup" key={meme.key}
         className={
           (meme.isCorrect ? 'meme-correct' : 'meme-wrong') +
           (visible ? ' meme-visible' : '') +
           (leaving ? ' meme-exit' : '')
         }
         onClick={dismiss}>
      <img src={meme.src} alt="" decoding="async" />
      <div className="meme-caption">{meme.caption}</div>
    </div>
  ) : null;

  return [element, trigger, dismiss];
}
