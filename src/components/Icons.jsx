/* Line icons drawn on a 20px grid; they take the surrounding text colour. */

const base = {
  width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true, focusable: false,
};

export const ChevronLeft = (p) => (
  <svg {...base} {...p}><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
);

export const ChevronRight = (p) => (
  <svg {...base} {...p}><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
);

export const Check = (p) => (
  <svg {...base} {...p}><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
);

export const Cross = (p) => (
  <svg {...base} {...p}><path d="m5.5 5.5 9 9m0-9-9 9" /></svg>
);

export const Flag = (p) => (
  <svg {...base} {...p}><path d="M5 17.5V3.5m0 0h9l-2 3.5 2 3.5H5" /></svg>
);
