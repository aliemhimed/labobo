/* Sets data-theme before first paint, so dark-mode users don't see a
   light-mode flash (and the reverse). With no saved choice it follows the OS.
   Kept as an external file (not inlined into index.html)
   so it matches CSP's script-src 'self' unconditionally — an inline script
   would need its exact bytes hashed, which is fragile against any dev-server
   HTML transform (e.g. Vite's index.html pipeline can reformat the document). */
try {
  var t = localStorage.getItem('mcq.theme') || 'auto';
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {
  document.documentElement.setAttribute('data-theme',
    window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
