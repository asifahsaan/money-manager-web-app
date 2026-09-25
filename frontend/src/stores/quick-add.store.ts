import { create } from 'zustand';

// Opens the global "Add transaction" modal from anywhere (header, Overview).
interface QuickAddState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
