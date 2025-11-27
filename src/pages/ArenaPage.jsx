import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import GameLobby from '../components/GameLobby';
import RockPaperScissors from '../components/RockPaperScissors';
import MatchingPennies from '../components/MatchingPennies';
import GameOfGo from '../components/GameOfGo';
import UserStats from '../components/UserStats';
import useAuthStore from '../store/useAuthStore';
import useGameStore from '../store/useGameStore';

const ArenaPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const currentGame = useGameStore((state) => state.currentGame);
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Ceteris-Paribus Arena</p>
          <h1 className="text-3xl font-display font-semibold">Multiplayer Championship Deck</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowStats(!showStats)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            {showStats ? 'Hide Stats' : 'View Stats'}
          </button>
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {user?.email}
          </span>
          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {showStats ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <UserStats />
          <div className="glass-panel p-6 text-center text-white/70">
            <p className="text-lg">Your game statistics and performance metrics</p>
            <button
              onClick={() => setShowStats(false)}
              className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition"
            >
              Back to Games
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <GameLobby />
          {currentGame?.activeStage === 'MATCHING_PENNIES' ? (
            <MatchingPennies />
          ) : currentGame?.activeStage === 'GAME_OF_GO' ? (
            <GameOfGo />
          ) : currentGame?.activeStage === 'ROCK_PAPER_SCISSORS' ? (
            <RockPaperScissors />
          ) : currentGame?.guest ? (
            <div className="glass-panel p-6 text-center text-white/70">
              <p className="text-lg">Choose a game from the lobby to begin!</p>
            </div>
          ) : (
            <RockPaperScissors />
          )}
        </div>
      )}

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 02</p>
          <h3 className="text-2xl font-semibold">Game of Go • Strategic Nebula</h3>
          <p className="text-white/60">
            After Stage 01 resolves, the Go board lights up. We stage a 9x9 grid with fog-of-war preview and timeline
            replays. Coming online right after both players sync their RPS decisions.
          </p>
        </div>
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 03</p>
          <h3 className="text-2xl font-semibold">Matching Pennies • Finale</h3>
          <p className="text-white/60">
            Sudden-death psychology where equilibrium matters. This placeholder outlines the UI tier that will wrap the
            trilogy and crown the Ceteris-Paribus champion.
          </p>
        </div>
      </section>
    </main>
  );
};

export default ArenaPage;

