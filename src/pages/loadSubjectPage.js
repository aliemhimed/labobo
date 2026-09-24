/* The subject page's lazy chunk. Shared so App's lazy() route and the home
   page's prefetch resolve to the same import (the browser fetches it once). */
export const loadSubjectPage = () => import('./SubjectPage.jsx');
