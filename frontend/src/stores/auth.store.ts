import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isInitialized: false,

  setAuth: (user, token) => {
    localStorage.setItem('mm_token', token);
    localStorage.setItem('mm_user', JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    set({ user: null, token: null });
  },

  initialize: () => {
    const token = localStorage.getItem('mm_token');
    const userJson = localStorage.getItem('mm_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isInitialized: true });
      } catch {
        localStorage.removeItem('mm_token');
        localStorage.removeItem('mm_user');
        set({ isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },
}));
