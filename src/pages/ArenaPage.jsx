import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import GameLobby from '../components/GameLobby';
import GameSelector from '../components/GameSelector';
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

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

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
          <button
            onClick={() => navigate('/history')}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            History
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            Leaderboard
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
          >
            Settings
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="rounded-full border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition font-semibold"
            >
              Admin
            </button>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {user?.studentName || user?.username || user?.email}
          </span>
          <button className="btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {showStats ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <UserStats />
          </div>
          <div className="lg:col-span-3 glass-panel p-6 text-center text-white/70">
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
        <>
          {/* Row 1: Game Lobby - Live Arena Section (Create Code) - At Top */}
          <div className="mb-6">
            <GameLobby showArenaOnly={true} />
          </div>

          {/* Row 2: Three Game Options */}
          <div className="mb-6">
            {currentGame?.guest ? (
              <GameSelector currentGame={currentGame} />
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <div className="glass-panel p-6 text-white border-2 border-white/10">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pulse/30 to-royal/30 text-3xl">
                    ✊
                  </div>
                  <div className="mb-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                      Stage 01
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">Rock • Paper • Scissors</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/70">
                    Classic hand game. Choose rock, paper, or scissors. First to 10 points wins.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✊ Rock</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✋ Paper</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✌️ Scissors</span>
                  </div>
                </div>
                <div className="glass-panel p-6 text-white border-2 border-white/10">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal/30 to-aurora/30 text-3xl">
                    ⚫
                  </div>
                  <div className="mb-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                      Stage 02
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">Game of Go</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/70">
                    Strategic board game. Place stones to surround territory and capture opponent stones.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">⚫ Black</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">⚪ White</span>
                  </div>
                </div>
                <div className="glass-panel p-6 text-white border-2 border-white/10">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora/30 to-pulse/30 text-3xl">
                    🪙
                  </div>
                  <div className="mb-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                      Stage 03
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-white">Matching Pennies</h3>
                  <p className="mb-4 text-sm leading-relaxed text-white/70">
                    Psychology game. One chooses, one guesses. If guess matches, guesser wins. First to 10 points wins.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">👑 Heads</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">🦅 Tails</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Active Game Display - Below Game Options */}
          {currentGame?.activeStage && (
            <div className="mb-6">
              {currentGame.activeStage === 'ROCK_PAPER_SCISSORS' ? (
                <RockPaperScissors />
              ) : currentGame.activeStage === 'GAME_OF_GO' ? (
                <GameOfGo />
              ) : currentGame.activeStage === 'MATCHING_PENNIES' ? (
                <MatchingPennies />
              ) : null}
            </div>
          )}

          {/* Row 4: Game History - Below Active Game */}
          <div className="mb-6">
            <GameLobby showHistoryOnly={true} />
          </div>
        </>
      )}
    </main>
  );
};

export default ArenaPage;

