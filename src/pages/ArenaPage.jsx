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
import api from '../services/api';

const ArenaPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { currentGame, selectedGameType, setSelectedGameType, resetGame, setCurrentGame, setStatusMessage } = useGameStore();
  const navigate = useNavigate();
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState('arena'); // 'arena' or 'online'
  
  // Get greeting based on timezone
  const getGreeting = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good evening';
    } else {
      return 'Good evening'; // Late night also uses evening
    }
  };
  
  const playerName = user?.studentName || user?.username || 'Player';
  const [goConfig, setGoConfig] = useState({
    boardSize: 9,
    timeControl: {
      enabled: false,
      mode: 'fischer',
      mainTime: 30,
      increment: 5,
      byoYomiTime: 10,
      byoYomiPeriods: 5,
      preset: null,
    },
  });
  const [creatingGame, setCreatingGame] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  // Restore game state on page load/refresh
  useEffect(() => {
    let timeoutId = null;
    
    const restoreGameState = async () => {
      try {
        // Get persisted game code from storage (Zustand persist format)
        const persistedState = JSON.parse(localStorage.getItem('game-storage') || '{}');
        // Zustand persist stores data in { state: { ... }, version: 0 } format
        const gameCode = persistedState?.state?.gameCode;
        
        if (gameCode && !currentGame) {
          // Restore game from server using persisted code
          try {
            const { data } = await api.get(`/games/code/${gameCode}`);
            if (data.game) {
              setCurrentGame(data.game);
              // Restore selected game type if available
              if (persistedState?.state?.selectedGameType) {
                setSelectedGameType(persistedState.state.selectedGameType);
              } else if (data.game.activeStage) {
                setSelectedGameType(data.game.activeStage);
              }
              setStatusMessage('Game restored. Reconnecting...');
              
              // Clear the reconnecting message after 3 seconds
              timeoutId = setTimeout(() => {
                if (data.game.activeStage) {
                  setStatusMessage('Game reconnected successfully!');
                  // Clear success message after 2 more seconds
                  setTimeout(() => setStatusMessage(''), 2000);
                } else {
                  setStatusMessage('');
                }
              }, 3000);
            } else {
              // Game not found, clear storage
              localStorage.removeItem('game-storage');
              setStatusMessage('');
            }
          } catch (err) {
            console.error('Failed to restore game:', err);
            // Clear invalid game code from storage
            localStorage.removeItem('game-storage');
            setStatusMessage('');
          }
        } else if (!gameCode) {
          // No game to restore, clear any stale status messages
          setStatusMessage('');
        }
      } catch (err) {
        console.error('Error restoring game state:', err);
        setStatusMessage('');
      }
    };
    
    restoreGameState();
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Only run on mount

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);
  
  // Set selected game type when game starts
  useEffect(() => {
    if (currentGame?.activeStage && !selectedGameType) {
      setSelectedGameType(currentGame.activeStage);
    }
  }, [currentGame?.activeStage, selectedGameType, setSelectedGameType]);

  // Redirect admin users to admin dashboard (only if user is loaded)
  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEnterLobby = async () => {
    if (creatingGame) return;
    setCreatingGame(true);
    try {
      // Create game code immediately when entering lobby
      const { data: gameData } = await api.post('/games/create');
      setCurrentGame(gameData.game);
      setSelectedGameType('GAME_OF_GO');
      
      // Call start-go endpoint to set pendingGameSettings
      const requestBody = {
        code: gameData.game.code,
        boardSize: goConfig.boardSize,
      };
      
      if (goConfig.timeControl.enabled) {
        requestBody.timeControl = {
          mode: goConfig.timeControl.mode,
          mainTime: goConfig.timeControl.mainTime,
          increment: goConfig.timeControl.increment,
          byoYomiTime: goConfig.timeControl.byoYomiTime,
          byoYomiPeriods: goConfig.timeControl.byoYomiPeriods,
        };
      }
      
      await api.post('/games/start-go', requestBody);
      
      // Refresh game to get updated state with pendingGameSettings
      const { data: updatedGame } = await api.get(`/games/code/${gameData.game.code}`);
      setCurrentGame(updatedGame.game);
      
      setStatusMessage('Game code created! Share the code with your opponent. Game will start automatically when they join.');
    } catch (err) {
      console.error('Failed to create game:', err);
      setStatusMessage(err.response?.data?.message || 'Failed to create game');
    } finally {
      setCreatingGame(false);
    }
  };

  const handleQuickJoin = async () => {
    if (!joinCode || creatingGame) return;
    setCreatingGame(true);
    try {
      const { data } = await api.post('/games/join', { code: joinCode.trim().toUpperCase() });
      if (data.game && (!data.game.host || !data.game.guest)) {
        const { data: gameData } = await api.get(`/games/code/${data.game.code}`);
        setCurrentGame(gameData.game);
      } else {
        setCurrentGame(data.game);
      }
      // Set selected game type based on active stage if exists
      if (data.game?.activeStage) {
        setSelectedGameType(data.game.activeStage);
      }
      setStatusMessage('Joined game successfully!');
      setJoinCode('');
    } catch (err) {
      console.error('Failed to join game:', err);
      setStatusMessage(err.response?.data?.message || 'Failed to join game');
    } finally {
      setCreatingGame(false);
    }
  };

  const handleSelectGame = async (gameType) => {
    if (creatingGame) return;
    
    // Check if games are unlocked
    if (gameType === 'ROCK_PAPER_SCISSORS' && user?.rpsUnlocked !== true) {
      setStatusMessage('Rock Paper Scissors is locked. Please contact an admin to unlock it.');
      return;
    }
    if (gameType === 'MATCHING_PENNIES' && user?.penniesUnlocked !== true) {
      setStatusMessage('Matching Pennies is locked. Please contact an admin to unlock it.');
      return;
    }
    if (gameType === 'GAME_OF_GO' && user?.goUnlocked !== true) {
      setStatusMessage('Game of Go is locked. Please contact an admin to unlock it.');
      return;
    }

    // For RPS and Matching Pennies, automatically create code and set pendingGameSettings
    if (gameType === 'ROCK_PAPER_SCISSORS' || gameType === 'MATCHING_PENNIES') {
      setCreatingGame(true);
      try {
        // First create the game code
        const { data: gameData } = await api.post('/games/create');
        setCurrentGame(gameData.game);
        setSelectedGameType(gameType);
        
        // Then call the start endpoint to set pendingGameSettings
        try {
          if (gameType === 'ROCK_PAPER_SCISSORS') {
            const startResponse = await api.post('/games/start-rps', {
              code: gameData.game.code,
              timePerMove: 20, // Fixed 20 seconds
            });
            console.log('Start RPS response:', startResponse.data);
          } else if (gameType === 'MATCHING_PENNIES') {
            const startResponse = await api.post('/games/start-pennies', {
              code: gameData.game.code,
              timePerMove: 20, // Fixed 20 seconds
            });
            console.log('Start Pennies response:', startResponse.data);
          }
        } catch (startErr) {
          console.error('Failed to start game:', startErr);
          console.error('Start error details:', startErr.response?.data);
        }
        
        // Refresh game to get updated state with pendingGameSettings
        const { data: updatedGame } = await api.get(`/games/code/${gameData.game.code}`);
        console.log('Updated game after start:', updatedGame.game);
        console.log('PendingGameSettings:', updatedGame.game.pendingGameSettings);
        setCurrentGame(updatedGame.game);
        
        setStatusMessage('Game code created! Share the code with your opponent. Game will start automatically when they join.');
      } catch (err) {
        console.error('Failed to create game:', err);
        setStatusMessage(err.response?.data?.message || 'Failed to create game');
      } finally {
        setCreatingGame(false);
      }
    } else {
      // For Game of Go, just set selected type (user needs to configure first)
      setSelectedGameType(gameType);
    }
  };

  // Auto-start game when both players connect
  useEffect(() => {
    const autoStartGame = async () => {
      if (
        currentGame?.code &&
        currentGame?.guest &&
        !currentGame?.activeStage &&
        !creatingGame &&
        selectedGameType
      ) {
        setCreatingGame(true);
        try {
          if (selectedGameType === 'GAME_OF_GO') {
            const requestBody = {
              code: currentGame.code,
              boardSize: goConfig.boardSize,
            };
            
            if (goConfig.timeControl.enabled) {
              requestBody.timeControl = {
                mode: goConfig.timeControl.mode,
                mainTime: goConfig.timeControl.mainTime,
                increment: goConfig.timeControl.increment,
                byoYomiTime: goConfig.timeControl.byoYomiTime,
                byoYomiPeriods: goConfig.timeControl.byoYomiPeriods,
              };
            }
            
            await api.post('/games/start-go', requestBody);
            setStatusMessage('Game of Go started automatically! Both players connected.');
          } else if (selectedGameType === 'ROCK_PAPER_SCISSORS') {
            await api.post('/games/start-rps', {
              code: currentGame.code,
              timePerMove: 20, // Fixed 20 seconds
            });
            setStatusMessage('Rock Paper Scissors started automatically! Both players connected.');
          } else if (selectedGameType === 'MATCHING_PENNIES') {
            await api.post('/games/start-pennies', {
              code: currentGame.code,
              timePerMove: 20, // Fixed 20 seconds
            });
            setStatusMessage('Matching Pennies started automatically! Both players connected.');
          }
          
          // Refresh game to get updated state
          const { data: updatedGame } = await api.get(`/games/code/${currentGame.code}`);
          setCurrentGame(updatedGame.game);
        } catch (err) {
          console.error('Failed to auto-start game:', err);
          setStatusMessage(err.response?.data?.message || 'Failed to start game');
        } finally {
          setCreatingGame(false);
        }
      }
    };

    autoStartGame();
  }, [currentGame?.guest, currentGame?.code, currentGame?.activeStage, selectedGameType, goConfig, creatingGame, setCurrentGame, setStatusMessage]);

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
            <OnlinePlayers onJoinGame={() => setActiveTab('arena')} />
          ) : (
            <>
              {/* Greeting with Player Name */}
              <div className="mb-4 text-center">
                <p className="text-xl font-semibold text-white/90">
                  {getGreeting()}, <span className="text-aurora font-bold">{playerName}</span>
                </p>
              </div>
              
              {/* Quick Join Option - Above game selection */}
              {!currentGame?.code && !currentGame?.activeStage && (
                <div className="mb-6 glass-panel p-4 border border-aurora/30">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs uppercase tracking-[0.4em] text-white/50 mb-2">
                        Quick Join
                      </label>
                      <input
                        type="text"
                        placeholder="Enter game code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && joinCode) {
                            handleQuickJoin();
                          }
                        }}
                        className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 outline-none focus:border-aurora transition uppercase tracking-wider"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleQuickJoin}
                        disabled={!joinCode || creatingGame}
                        className="rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-6 py-2 text-sm font-bold text-white transition-all hover:from-aurora/30 hover:to-royal/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingGame ? 'Joining...' : 'Join Game'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Select Game - Show GameSelector when both players connected but no game selected */}
              {currentGame?.code && currentGame?.guest && !selectedGameType && !currentGame?.activeStage && (
                <div className="mb-6">
                  <GameSelector 
                    currentGame={currentGame}
                    onGameSelected={handleSelectGame}
                    selectedGameType={selectedGameType}
                    onGameStarted={() => {}}
                  />
                </div>
              )}

              {/* Step 1: Select Game - Show when no game code created yet (allow configuration) */}
              {!currentGame?.code && !currentGame?.activeStage && (
                <div className="mb-6">
                  <div className="glass-panel p-6 text-white">
                    <h2 className="text-2xl font-semibold mb-4">Select a Game</h2>
                    <p className="text-white/60 mb-6">Choose a game to play, then create a code to invite your opponent.</p>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                      <div className={`glass-panel p-6 text-white border-2 transition text-left ${
                        user?.rpsUnlocked !== true
                          ? 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent opacity-60'
                          : selectedGameType === 'ROCK_PAPER_SCISSORS'
                          ? 'border-aurora/50 bg-aurora/10'
                          : 'border-white/10 hover:border-aurora/50'
                      }`}>
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pulse/30 to-royal/30 text-3xl">
                          ✊
                        </div>
                        <div className="mb-3">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                            Game 1
                          </span>
                          {user?.rpsUnlocked !== true && (
                            <span className="ml-2 flex items-center gap-1.5 rounded-full bg-red-500/30 border border-red-500/50 px-3 py-1 text-xs font-bold text-red-400">
                              🔒 LOCKED
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">Rock • Paper • Scissors</h3>
                        <p className="mb-4 text-sm leading-relaxed text-white/70">
                          {user?.rpsUnlocked === true
                            ? 'Classic hand game. Choose rock, paper, or scissors. Both players play the match for a total of 30 rounds.'
                            : '🔒 Locked - Contact an admin to unlock this game.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✊ Rock</span>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✋ Paper</span>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">✌️ Scissors</span>
                        </div>
                        {user?.rpsUnlocked === true && (
                          <button
                            onClick={() => handleSelectGame('ROCK_PAPER_SCISSORS')}
                            disabled={creatingGame}
                            className="mt-4 w-full rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-4 py-2 text-sm font-bold text-white transition-all hover:from-aurora/30 hover:to-royal/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Select Game
                          </button>
                        )}
                      </div>
                      <div className={`glass-panel p-6 text-white border-2 transition text-left ${
                        user?.goUnlocked !== true
                          ? 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent opacity-60'
                          : selectedGameType === 'GAME_OF_GO' 
                          ? 'border-aurora/50 bg-aurora/10' 
                          : 'border-white/10 hover:border-aurora/50'
                      }`}>
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-royal/30 to-aurora/30 text-3xl">
                          ⚫
                        </div>
                        <div className="mb-3">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                            Game 2
                          </span>
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">Game of Go</h3>
                        {user?.goUnlocked !== true && (
                          <div className="mb-3">
                            <span className="flex items-center gap-1.5 rounded-full bg-red-500/30 border border-red-500/50 px-3 py-1 text-xs font-bold text-red-400">
                              🔒 LOCKED
                            </span>
                          </div>
                        )}
                        <p className="mb-4 text-sm leading-relaxed text-white/70">
                          {user?.goUnlocked === true 
                            ? 'Strategic board game. Place stones to surround territory and capture opponent stones.'
                            : '🔒 Locked - Contact an admin to unlock this game.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">⚫ Black</span>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">⚪ White</span>
                        </div>

                        {selectedGameType === 'GAME_OF_GO' && user?.goUnlocked === true && (
                          <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                            {/* Board Size Selection */}
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                                Board Size
                              </label>
                              <div className="flex gap-2">
                                {[9, 13, 19].map((size) => (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGoConfig({ ...goConfig, boardSize: size });
                                    }}
                                    className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${
                                      goConfig.boardSize === size
                                        ? 'border-aurora bg-aurora/30 text-white'
                                        : 'border-white/20 bg-white/5 text-white/70 hover:border-aurora/50'
                                    }`}
                                  >
                                    {size}×{size}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Time Control */}
                            <div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={goConfig.timeControl.enabled}
                                  onChange={(e) => {
                                    setGoConfig({
                                      ...goConfig,
                                      timeControl: { ...goConfig.timeControl, enabled: e.target.checked },
                                    });
                                  }}
                                  className="rounded border-white/20"
                                />
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                                  Enable Time Control
                                </span>
                              </label>

                              {goConfig.timeControl.enabled && (
                                <div className="mt-3 pl-6 space-y-3 border-l-2 border-white/10">
                                  {/* Time System */}
                                  <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block mb-2">
                                      Time System
                                    </label>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setGoConfig({
                                            ...goConfig,
                                            timeControl: { ...goConfig.timeControl, mode: 'fischer', preset: null },
                                          });
                                        }}
                                        className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                          goConfig.timeControl.mode === 'fischer'
                                            ? 'border-aurora bg-aurora/30 text-white'
                                            : 'border-white/20 bg-white/5 text-white/70'
                                        }`}
                                      >
                                        Fischer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setGoConfig({
                                            ...goConfig,
                                            timeControl: { ...goConfig.timeControl, mode: 'japanese', preset: null },
                                          });
                                        }}
                                        className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                          goConfig.timeControl.mode === 'japanese'
                                            ? 'border-aurora bg-aurora/30 text-white'
                                            : 'border-white/20 bg-white/5 text-white/70'
                                        }`}
                                      >
                                        Byo-Yomi
                                      </button>
                                    </div>
                                  </div>

                                  {/* Fischer Presets */}
                                  {goConfig.timeControl.mode === 'fischer' && (
                                    <div>
                                      <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block mb-2">
                                        Quick Presets
                                      </label>
                                      <div className="grid grid-cols-3 gap-2">
                                        {[
                                          { name: 'Blitz A', mainTime: 30, increment: 5, preset: 'BLITZ_A' },
                                          { name: 'Blitz B', mainTime: 120, increment: 7, preset: 'BLITZ_B' },
                                          { name: 'Rapid', mainTime: 180, increment: 10, preset: 'RAPID' },
                                        ].map((preset) => (
                                          <button
                                            key={preset.preset}
                                            type="button"
                                            onClick={() => {
                                              setGoConfig({
                                                ...goConfig,
                                                timeControl: {
                                                  ...goConfig.timeControl,
                                                  ...preset,
                                                },
                                              });
                                            }}
                                            className={`rounded-lg border-2 px-2 py-2 text-xs font-bold transition-all ${
                                              goConfig.timeControl.preset === preset.preset
                                                ? 'border-aurora bg-aurora/30 text-white'
                                                : 'border-white/20 bg-white/5 text-white/70'
                                            }`}
                                          >
                                            {preset.name}
                                            <br />
                                            <span className="text-[10px]">
                                              {preset.mainTime}s + {preset.increment}s
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Main Time */}
                                  <div>
                                    <label className="text-xs text-white/60 block mb-1">Main Time (seconds)</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="3600"
                                      value={goConfig.timeControl.mainTime}
                                      onChange={(e) => {
                                        setGoConfig({
                                          ...goConfig,
                                          timeControl: {
                                            ...goConfig.timeControl,
                                            mainTime: parseInt(e.target.value) || 0,
                                            preset: null,
                                          },
                                        });
                                      }}
                                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                                    />
                                  </div>

                                  {/* Fischer Increment */}
                                  {goConfig.timeControl.mode === 'fischer' && (
                                    <div>
                                      <label className="text-xs text-white/60 block mb-1">Increment (seconds)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="60"
                                        value={goConfig.timeControl.increment}
                                        onChange={(e) => {
                                          setGoConfig({
                                            ...goConfig,
                                            timeControl: {
                                              ...goConfig.timeControl,
                                              increment: parseInt(e.target.value) || 0,
                                              preset: null,
                                            },
                                          });
                                        }}
                                        className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                                      />
                                    </div>
                                  )}

                                  {/* Japanese Byo-Yomi */}
                                  {goConfig.timeControl.mode === 'japanese' && (
                                    <>
                                      <div>
                                        <label className="text-xs text-white/60 block mb-1">Period Time (seconds)</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="300"
                                          value={goConfig.timeControl.byoYomiTime}
                                          onChange={(e) => {
                                            setGoConfig({
                                              ...goConfig,
                                              timeControl: {
                                                ...goConfig.timeControl,
                                                byoYomiTime: parseInt(e.target.value) || 1,
                                              },
                                            });
                                          }}
                                          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-white/60 block mb-1">Number of Periods</label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="10"
                                          value={goConfig.timeControl.byoYomiPeriods}
                                          onChange={(e) => {
                                            setGoConfig({
                                              ...goConfig,
                                              timeControl: {
                                                ...goConfig.timeControl,
                                                byoYomiPeriods: parseInt(e.target.value) || 1,
                                              },
                                            });
                                          }}
                                          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Enter Lobby Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (user?.goUnlocked === true) {
                                  handleEnterLobby();
                                } else {
                                  setStatusMessage('Game of Go is locked. Please contact an admin to unlock it.');
                                }
                              }}
                              disabled={creatingGame || user?.goUnlocked !== true}
                              className={`w-full mt-4 rounded-lg border px-4 py-3 text-sm font-bold transition-all ${
                                user?.goUnlocked === true
                                  ? 'bg-gradient-to-r from-aurora/20 to-royal/20 border-aurora/50 text-white hover:from-aurora/30 hover:to-royal/30'
                                  : 'bg-red-500/20 border-red-500/50 text-red-400 cursor-not-allowed'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {user?.goUnlocked === true ? 'Enter Lobby' : '🔒 Locked - Contact Admin'}
                            </button>
                          </div>
                        )}

                        {selectedGameType !== 'GAME_OF_GO' && (
                          <button
                            onClick={() => {
                              if (user?.goUnlocked === true) {
                                setSelectedGameType('GAME_OF_GO');
                              } else {
                                setStatusMessage('Game of Go is locked. Please contact an admin to unlock it.');
                              }
                            }}
                            disabled={user?.goUnlocked !== true}
                            className={`w-full mt-4 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                              user?.goUnlocked === true
                                ? 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                                : 'border-red-500/50 bg-red-500/20 text-red-400 cursor-not-allowed opacity-60'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {user?.goUnlocked === true ? 'Configure & Create' : '🔒 Locked'}
                          </button>
                        )}
                      </div>
                      <div className={`glass-panel p-6 text-white border-2 transition text-left ${
                        user?.penniesUnlocked !== true
                          ? 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent opacity-60'
                          : selectedGameType === 'MATCHING_PENNIES'
                          ? 'border-aurora/50 bg-aurora/10'
                          : 'border-white/10 hover:border-aurora/50'
                      }`}>
                        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora/30 to-pulse/30 text-3xl">
                          🪙
                        </div>
                        <div className="mb-3">
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                            Game 3
                          </span>
                          {user?.penniesUnlocked !== true && (
                            <span className="ml-2 flex items-center gap-1.5 rounded-full bg-red-500/30 border border-red-500/50 px-3 py-1 text-xs font-bold text-red-400">
                              🔒 LOCKED
                            </span>
                          )}
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-white">Matching Pennies</h3>
                        <p className="mb-4 text-sm leading-relaxed text-white/70">
                          {user?.penniesUnlocked === true
                            ? 'A psychology game where both players choose either Heads or Tails. Both players play the match for a total of 30 rounds.'
                            : '🔒 Locked - Contact an admin to unlock this game.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">👑 Heads</span>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">🦅 Tails</span>
                        </div>
                        {user?.penniesUnlocked === true && (
                          <button
                            onClick={() => handleSelectGame('MATCHING_PENNIES')}
                            disabled={creatingGame}
                            className="mt-4 w-full rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-4 py-2 text-sm font-bold text-white transition-all hover:from-aurora/30 hover:to-royal/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Select Game
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Show Selected Game and Current Lobby Info - AFTER game selection */}
              {selectedGameType && !currentGame?.activeStage && (
                <div className="mb-6 glass-panel p-4 border border-aurora/30 relative">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">
                        {currentGame?.code ? 'Current Lobby' : 'Selected Game'}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap mb-2">
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
                      {/* Show Go Configuration Details */}
                      {selectedGameType === 'GAME_OF_GO' && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="text-white/70">
                              Board: <span className="text-aurora font-semibold">{goConfig.boardSize}×{goConfig.boardSize}</span>
                            </span>
                            {goConfig.timeControl.enabled && (
                              <>
                                <span className="text-white/40">•</span>
                                <span className="text-white/70">
                                  Time: <span className="text-aurora font-semibold">
                                    {goConfig.timeControl.mode === 'fischer' 
                                      ? `${goConfig.timeControl.mainTime}s + ${goConfig.timeControl.increment}s`
                                      : `${goConfig.timeControl.mainTime}s + ${goConfig.timeControl.byoYomiPeriods}×${goConfig.timeControl.byoYomiTime}s`
                                    }
                                  </span>
                                </span>
                                {goConfig.timeControl.preset && (
                                  <>
                                    <span className="text-white/40">•</span>
                                    <span className="text-white/70">
                                      Preset: <span className="text-aurora font-semibold">
                                        {goConfig.timeControl.preset === 'BLITZ_A' ? 'Blitz A' :
                                         goConfig.timeControl.preset === 'BLITZ_B' ? 'Blitz B' :
                                         goConfig.timeControl.preset === 'RAPID' ? 'Rapid' : ''}
                                      </span>
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                            {!goConfig.timeControl.enabled && (
                              <>
                                <span className="text-white/40">•</span>
                                <span className="text-white/70">No time control</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {currentGame?.code && (
                        <button
                          onClick={() => {
                            // Clear game code and selected type to go back to selection
                            setCurrentGame(null);
                            setSelectedGameType(null);
                            setStatusMessage('');
                          }}
                          className="rounded-lg border border-aurora/50 bg-aurora/20 px-3 py-1.5 text-xs font-semibold text-aurora hover:bg-aurora/30 hover:border-aurora transition shadow-[0_0_10px_rgba(83,255,227,0.3)]"
                        >
                          ← Back to Selection
                        </button>
                      )}
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
                </div>
              )}

              {/* Step 2: Game Lobby - Create Code (after game selection, but hide when both players connected and need to select game) */}
              {(selectedGameType || currentGame?.code) && !currentGame?.activeStage && !(currentGame?.code && currentGame?.guest && !selectedGameType) && (
                <div className="mb-6">
                  <GameLobby 
                    showArenaOnly={true} 
                    selectedGameType={selectedGameType || currentGame?.activeStage}
                    onGameTypeSelected={setSelectedGameType}
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
                    <div className="mb-4 flex items-center justify-end">
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

