import { createContext, useContext } from 'react';

/* Starred (bookmarked) questions. QuizEngine provides { isStarred, toggle }
   for its subject; QuestionBody shows the star button only when it is there. */
export const StarContext = createContext(null);
export const useStars = () => useContext(StarContext);

/** Ids currently starred, newest first. */
export function starredIds(starred) {
  return Object.entries(starred)
    .filter(([, s]) => s?.on)
    .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
    .map(([id]) => id);
}
