import { useLayoutEffect } from 'react';

/** Give every `.option` inside `ref` the height of the tallest one, so the
    longest answer isn't a visual giveaway. Re-measures when `deps` change. */
export function useEqualOptionHeights(ref, deps) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const opts = box.querySelectorAll('.option');
    opts.forEach((o) => { o.style.minHeight = ''; });
    let maxH = 0;
    opts.forEach((o) => { maxH = Math.max(maxH, o.offsetHeight); });
    opts.forEach((o) => { o.style.minHeight = maxH + 'px'; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
