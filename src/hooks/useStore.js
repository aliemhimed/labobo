import { useSyncExternalStore } from 'react';
import { subscribe } from '../lib/storage.js';

/* Live views of the stored progress. The store getters return the same object
   until the underlying value changes, so they can be used as snapshots
   directly; any write (this tab or another) re-renders the subscribers. */

export const useHistory = (store) => useSyncExternalStore(subscribe, store.getHistory);
export const useWrong = (store) => useSyncExternalStore(subscribe, store.getWrong);
