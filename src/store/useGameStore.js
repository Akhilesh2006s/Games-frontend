import { create } from 'zustand';

const useGameStore = create((set) => ({
  matches: [],
  currentGame: null,
  statusMessage: '',
  setMatches: (matches) => set({ matches }),
  setCurrentGame: (payload) =>
    set((state) => ({
      currentGame: typeof payload === 'function' ? payload(state.currentGame) : payload,
    })),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  resetGame: () =>
    set({
      currentGame: null,
      statusMessage: '',
    }),
}));

export default useGameStore;

