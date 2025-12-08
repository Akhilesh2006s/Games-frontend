import { create } from 'zustand';

const useGameStore = create((set) => ({
  matches: [],
  currentGame: null,
  statusMessage: '',
  selectedGameType: null, // Store selected game type for rematch
  setMatches: (matches) => set({ matches }),
  setCurrentGame: (payload) =>
    set((state) => ({
      currentGame: typeof payload === 'function' ? payload(state.currentGame) : payload,
    })),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setSelectedGameType: (gameType) => set({ selectedGameType: gameType }),
  resetGame: () =>
    set({
      currentGame: null,
      statusMessage: '',
    }),
}));

export default useGameStore;

