import { useCallback, useState } from 'react';

// Hide/show amounts on a page, remembered per browser.
//
// The stored value is simply the set of hidden keys: "Hide all" adds every
// key, and each card's eye toggles only its own key — so after hiding all,
// any single card can be revealed again without revealing the rest.

function read(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export interface Privacy {
  isHidden: (key: string) => boolean;
  toggle: (key: string) => void;
  /** True when every key passed in is hidden. */
  allHidden: boolean;
  /** Hide everything, or — when all are hidden — show everything. */
  toggleAll: () => void;
}

export function usePrivacy(storageKey: string, keys: readonly string[]): Privacy {
  const [hidden, setHidden] = useState<Set<string>>(() => read(storageKey));

  const save = useCallback(
    (next: Set<string>) => {
      setHidden(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* storage blocked — keep it in memory for this visit */
      }
    },
    [storageKey],
  );

  const allHidden = keys.length > 0 && keys.every((k) => hidden.has(k));

  return {
    isHidden: (key) => hidden.has(key),
    toggle: (key) => {
      const next = new Set(hidden);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      save(next);
    },
    allHidden,
    toggleAll: () => {
      const next = new Set(hidden);
      for (const k of keys) {
        if (allHidden) next.delete(k);
        else next.add(k);
      }
      save(next);
    },
  };
}

export const MASK = '••••••';
