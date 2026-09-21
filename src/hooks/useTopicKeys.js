import { useMemo } from 'react';

/** Every "Subject::Topic" key in a subject index, in display order. */
export function useTopicKeys(subjectIndex) {
  return useMemo(() => {
    const keys = [];
    Object.keys(subjectIndex).forEach((s) =>
      Object.keys(subjectIndex[s]).forEach((t) => keys.push(`${s}::${t}`))
    );
    return keys;
  }, [subjectIndex]);
}
