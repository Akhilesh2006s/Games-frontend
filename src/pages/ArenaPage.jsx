import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import GameLobby from '../components/GameLobby';
import GameSelector from '../components/GameSelector';
import RockPaperScissors from '../components/RockPaperScissors';
import MatchingPennies from '../components/MatchingPennies';
import GameOfGo from '../components/GameOfGo';
import UserStats from '../components/UserStats';
import OnlinePlayers from '../components/OnlinePlayers';
import useAuthStore from '../store/useAuthStore';
import useGameStore from '../store/useGameStore';

const ArenaPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { currentGame, selectedGameType, setSelectedGameType, resetGame } = useGameStore();
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' or 'online'
  
  // Set selected game type when game starts
  useEffect(() => {
    if (currentGame?.activeStage && !selectedGameType) {
      setSelectedGameType(currentGame.activeStage);
    }
  }, [currentGame?.activeStage, selectedGameType, setSelectedGameType]);

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
          <button className="btn-ghost !normal-case" onClick={handleLogout} style={{ textTransform: 'none' }}>
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
          {/* Tab Navigation */}
          <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
            <button
              onClick={() => setActiveTab('arena')}
              className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold transition ${
                activeTab === 'arena'
                  ? 'bg-aurora text-night shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Live Arena
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`flex-1 rounded-full px-6 py-3 text-sm font-semibold transition ${
                activeTab === 'online'
                  ? 'bg-aurora text-night shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Online Players
            </button>
          </div>

          {activeTab === 'online' ? (
            <OnlinePlayers />
          ) : (
            <>
              {/* Step 1: Select Game (if no game selected and no active game) */}
              {!selectedGameType && !currentGame?.activeStage && !currentGame?.guest && (
                <div className="mb-6">
                  <div className="glass-panel p-6 text-white">
                    <h2 className="text-2xl font-semibold mb-4">Select a Game</h2>
                    <p className="text-white/60 mb-6">Choose a game to play, then create a code to invite your opponent.</p>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                      <button
                        onClick={() => {
                          setSelectedGameType('ROCK_PAPER_SCISSORS');
                        }}
                        className="glass-panel p-6 text-white border-2 border-white/10 hover:border-aurora/50 transition text-left"
                      >
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
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGameType('GAME_OF_GO');
                        }}
                        className="glass-panel p-6 text-white border-2 border-white/10 hover:border-aurora/50 transition text-left"
                      >
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
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGameType('MATCHING_PENNIES');
                        }}
                        className="glass-panel p-6 text-white border-2 border-white/10 hover:border-aurora/50 transition text-left"
                      >
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
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Show Selected Game and Current Lobby Info */}
              {selectedGameType && !currentGame?.activeStage && (
                <div className="mb-6 glass-panel p-4 border border-aurora/30">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">
                        {currentGame?.code ? 'Current Lobby' : 'Selected Game'}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-lg font-semibold text-white">
                          {selectedGameType === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' :
                           selectedGameType === 'GAME_OF_GO' ? 'Game of Go' :
                           selectedGameType === 'MATCHING_PENNIES' ? 'Matching Pennies' : 'Game'}
                        </p>
                        {currentGame?.code && (
                          <>
                            <span className="text-white/40">•</span>
                            <p className="text-lg font-mono tracking-wider text-aurora">{currentGame.code}</p>
                          </>
                        )}
                      </div>
                    </div>
                    {currentGame?.code && (
                      <div className="text-sm text-white/70">
                        {currentGame.guest ? 'Both players connected' : 'Waiting for opponent...'}
                      </div>
                    )}
                    {!currentGame?.code && (
                      <div className="text-sm text-white/60">
                        Create or join a code to start
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Game Lobby - Create Code (after game selection) */}
              {(selectedGameType || currentGame?.code) && !currentGame?.activeStage && (
                <div className="mb-6">
                  <GameLobby 
                    showArenaOnly={true} 
                    selectedGameType={selectedGameType || currentGame?.activeStage}
                    onGameTypeSelected={setSelectedGameType}
                  />
                </div>
              )}

              {/* Step 3: Game Selector - Host can start before guest joins */}
              {!currentGame?.activeStage && selectedGameType && (
                <div className="mb-6">
                  <GameSelector 
                    currentGame={currentGame} 
                    selectedGameType={selectedGameType}
                    onGameStarted={() => {
                      // Game started - keep selectedGameType locked
                    }}
                  />
                </div>
              )}
              
              {/* Show message if game is in progress and trying to create new game */}
              {currentGame?.activeStage && (
                <div className="mb-6 glass-panel p-4 text-white/70 text-center">
                  <p>Game in progress. End the current game to create a new one.</p>
                </div>
              )}

              {/* Row 3: Active Game Display - Full Screen */}
              {currentGame?.activeStage && (
                <div className="fixed inset-0 z-50 bg-night overflow-auto">
                  <div className="min-h-screen p-4 md:p-6">
                    {/* Full Screen Game Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        onClick={() => {
                          resetGame();
                          setSelectedGameType(null);
                        }}
                        className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                      >
                        ← Back to Arena
                      </button>
                      <div className="text-sm text-white/60">
                        Lobby: <span className="font-mono text-aurora">{currentGame.code}</span>
                      </div>
                    </div>
                    {currentGame.activeStage === 'ROCK_PAPER_SCISSORS' ? (
                      <RockPaperScissors />
                    ) : currentGame.activeStage === 'GAME_OF_GO' ? (
                      <GameOfGo />
                    ) : currentGame.activeStage === 'MATCHING_PENNIES' ? (
                      <MatchingPennies />
                    ) : null}
                  </div>
                </div>
              )}

            </>
          )}
        </>
      )}
    </main>
  );
};

export default ArenaPage;

