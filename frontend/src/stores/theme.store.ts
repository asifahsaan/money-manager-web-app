import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mm_theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // storage blocked — fall back to system
  }
  return 'system';
}

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore
    }
    apply(preference);
    set({ preference });
  },
}));

// Apply on load and follow the OS setting while in "system" mode.
apply(useThemeStore.getState().preference);
media?.addEventListener('change', () => {
  if (useThemeStore.getState().preference === 'system') apply('system');
});
