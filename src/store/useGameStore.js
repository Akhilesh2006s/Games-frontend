import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGameStore = create(
  persist(
    (set) => ({
      matches: [],
      currentGame: null,
      statusMessage: '',
      selectedGameType: null, // Store selected game type for rematch
      setMatches: (matches) => set({ matches }),
      setCurrentGame: (payload) =>
        set((state) => {
          const newGame = typeof payload === 'function' ? payload(state.currentGame) : payload;
          return { currentGame: newGame };
        }),
      setStatusMessage: (statusMessage) => set({ statusMessage }),
      setSelectedGameType: (gameType) => set({ selectedGameType: gameType }),
      resetGame: () => {
        // Clear persisted storage
        localStorage.removeItem('game-storage');
        set({
          currentGame: null,
          statusMessage: '',
          selectedGameType: null,
        });
      },
    }),
    {
      name: 'game-storage', // unique name for localStorage key
      partialize: (state) => ({
        // Only persist the game code, not the entire game object (to avoid stale data)
        gameCode: state.currentGame?.code || null,
        selectedGameType: state.selectedGameType,
      }),
    }
  )
);

export default useGameStore;

