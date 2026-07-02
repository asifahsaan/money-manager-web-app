import { create } from 'zustand';
import type { Account } from '@/types';

interface AccountState {
  accounts: Account[];
  activeAccountId: number | null;
  setAccounts: (accounts: Account[]) => void;
  setActiveAccount: (id: number) => void;
  activeAccount: () => Account | null;
  reset: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  activeAccountId:
    localStorage.getItem('mm_active_account')
      ? Number(localStorage.getItem('mm_active_account'))
      : null,

  setAccounts: (accounts) => {
    const current = get().activeAccountId;
    // If no active account or active no longer exists, pick first
    const validId =
      current && accounts.find((a) => a.id === current)
        ? current
        : accounts[0]?.id ?? null;

    if (validId) {
      localStorage.setItem('mm_active_account', String(validId));
    }
    set({ accounts, activeAccountId: validId });
  },

  setActiveAccount: (id) => {
    localStorage.setItem('mm_active_account', String(id));
    set({ activeAccountId: id });
  },

  activeAccount: () => {
    const { accounts, activeAccountId } = get();
    return accounts.find((a) => a.id === activeAccountId) ?? null;
  },

  reset: () => {
    localStorage.removeItem('mm_active_account');
    set({ accounts: [], activeAccountId: null });
  },
}));
