import { getTheme, setTheme } from './storage.js';

/* Stored value is 'auto' | 'light' | 'dark'. 'auto' follows the OS. */
export function applyTheme(theme) {
  if (theme === 'auto') {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', sysDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function initTheme() {
  applyTheme(getTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'auto') applyTheme('auto');
  });
}

/* auto -> (opposite of what's showing) -> light <-> dark */
export function toggleTheme() {
  const stored = getTheme();
  let next;
  if (stored === 'auto') {
    next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  } else {
    next = stored === 'light' ? 'dark' : 'light';
  }
  setTheme(next);
  applyTheme(next);
  return next;
}
