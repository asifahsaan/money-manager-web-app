import { create } from 'zustand';

interface ConnectionState {
  /** The phone or computer says it has a network */
  online: boolean;
  /** The last API call got an answer. Any answer counts, even "wrong password". */
  reachable: boolean;
  setOnline: (online: boolean) => void;
  setReachable: (reachable: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  online: navigator.onLine,
  reachable: true,
  setOnline: (online) => set({ online }),
  setReachable: (reachable) => set({ reachable }),
}));
