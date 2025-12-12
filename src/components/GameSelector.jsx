import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';

const GameSelector = ({ currentGame, onGameSelected, selectedGameType, onGameStarted }) => {
  const { setCurrentGame, setStatusMessage } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState({ rps: false, go: false, pennies: false });
  const [goBoardSize, setGoBoardSize] = useState(9);
  const goBoardSizeRef = useRef(9);
  const [hoveredGame, setHoveredGame] = useState(null);
  const [timeControl, setTimeControl] = useState({
    enabled: false,
    mode: 'fischer', // 'fischer' or 'japanese'
    mainTime: 30, // 30 seconds (for quick games)
    increment: 5, // 5 seconds increment for Fischer
    byoYomiTime: 10, // 10 seconds per period for Japanese
    byoYomiPeriods: 5, // 5 periods for Japanese
    preset: null, // 'BLITZ_A', 'BLITZ_B', 'RAPID', or null for custom
  });
  const [rpsTimePerMove, setRpsTimePerMove] = useState(20); // 20 seconds per move (default)
  const [penniesTimePerMove, setPenniesTimePerMove] = useState(20); // 20 seconds per move (default)

  // Keep ref in sync with state
  useEffect(() => {
    goBoardSizeRef.current = goBoardSize;
  }, [goBoardSize]);

  // Initialize ref on mount
  useEffect(() => {
    goBoardSizeRef.current = 9;
  }, []);

  const hasActiveGame = currentGame?.activeStage && 
    (currentGame.activeStage === 'ROCK_PAPER_SCISSORS' || currentGame.activeStage === 'GAME_OF_GO' || currentGame.activeStage === 'MATCHING_PENNIES');

  // Check if game is in progress (cannot switch games)
  const isGameInProgress = currentGame?.status === 'IN_PROGRESS' || 
    (currentGame?.status === 'READY' && currentGame?.activeStage && currentGame?.activeStage !== null);

  const handleStartGame = async (gameType, boardSizeOverride = null) => {
    if (!currentGame?.code) return;
    if (gameType === 'GAME_OF_GO' && !isGoUnlocked) {
      setStatusMessage('Game of Go is locked. Please contact an admin to unlock it.');
      return;
    }
    if (gameType === 'ROCK_PAPER_SCISSORS' && !isRpsUnlocked) {
      setStatusMessage('Rock Paper Scissors is locked. Please contact an admin to unlock it.');
      return;
    }
    if (gameType === 'MATCHING_PENNIES' && !isPenniesUnlocked) {
      setStatusMessage('Matching Pennies is locked. Please contact an admin to unlock it.');
      return;
    }
    if (isGameInProgress && currentGame?.activeStage !== gameType) {
      setStatusMessage('Cannot switch games while a game is in progress. End the current game first.');
      return;
    }
    const loadingKey = gameType === 'MATCHING_PENNIES' ? 'pennies' : gameType === 'GAME_OF_GO' ? 'go' : 'rps';
    setLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      let endpoint;
      let message;
      let requestBody = { code: currentGame.code };
      
      if (gameType === 'MATCHING_PENNIES') {
        endpoint = '/games/start-pennies';
        message = 'Matching Pennies started! First to 10 points wins.';
        requestBody.timePerMove = penniesTimePerMove || 20; // Default to 20 seconds
      } else if (gameType === 'GAME_OF_GO') {
        endpoint = '/games/start-go';
        message = 'Game of Go started! Place stones to capture territory.';
        // Ensure we have a valid board size
        const sizeToSend = boardSizeOverride !== null && boardSizeOverride !== undefined
          ? boardSizeOverride
          : (goBoardSizeRef.current || goBoardSize || 9);
        requestBody.boardSize = Number(sizeToSend);
        if (timeControl.enabled) {
          requestBody.timeControl = {
            mode: timeControl.mode,
            mainTime: timeControl.mainTime,
            increment: timeControl.increment,
            byoYomiTime: timeControl.byoYomiTime,
            byoYomiPeriods: timeControl.byoYomiPeriods,
          };
        }
        console.log('Starting Go game - goBoardSize state:', goBoardSize, 'goBoardSizeRef:', goBoardSizeRef.current, 'Size to send:', sizeToSend, 'Request body:', requestBody);
      } else {
        endpoint = '/games/start-rps';
        message = 'Rock Paper Scissors started! First to 10 points wins.';
        requestBody.timePerMove = rpsTimePerMove || 20; // Default to 20 seconds
      }
      
      const { data } = await api.post(endpoint, requestBody);
      console.log('Game started with boardSize:', data.game.goBoardSize, 'Requested:', requestBody.boardSize);
      setCurrentGame(data.game);
      
      if (data.pending) {
        setStatusMessage('Game settings saved! Waiting for opponent to join. Game will start automatically when they join.');
      } else {
        setStatusMessage(message);
      }
      
      if (onGameSelected) onGameSelected();
    } catch (err) {
      console.error(err);
      setStatusMessage(err.response?.data?.message || `Failed to start ${gameType}`);
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Ensure unlock status defaults to false if not present (for users with cached data)
  const isGoUnlocked = user?.goUnlocked === true;
  const isRpsUnlocked = user?.rpsUnlocked === true;
  const isPenniesUnlocked = user?.penniesUnlocked === true;

  const games = [
    {
      id: 'ROCK_PAPER_SCISSORS',
      stage: '1',
      title: 'Rock • Paper • Scissors',
      description: isRpsUnlocked 
        ? 'Classic hand game. Choose rock, paper, or scissors. Both players play the match for a total of 30 rounds.'
        : '🔒 Locked - Contact an admin to unlock this game.',
      icon: '✊',
      gradient: 'from-pulse/20 via-royal/20 to-aurora/20',
      borderGradient: 'from-pulse via-royal to-aurora',
      iconBg: 'bg-gradient-to-br from-pulse/30 to-royal/30',
      features: ['✊ Rock', '✋ Paper', '✌️ Scissors'],
      loadingKey: 'rps',
      locked: !isRpsUnlocked
    },
    {
      id: 'GAME_OF_GO',
      stage: '2',
      title: 'Game of Go',
      description: isGoUnlocked 
        ? 'Strategic board game. Place stones to surround territory and capture opponent stones.'
        : '🔒 Locked - Contact an admin to unlock this game.',
      icon: '⚫',
      gradient: 'from-royal/20 via-aurora/20 to-pulse/20',
      borderGradient: 'from-royal via-aurora to-pulse',
      iconBg: 'bg-gradient-to-br from-royal/30 to-aurora/30',
      features: ['⚫ Black', '⚪ White'],
      loadingKey: 'go',
      hasOptions: true,
      locked: !isGoUnlocked
    },
    {
      id: 'MATCHING_PENNIES',
      stage: '3',
      title: 'Matching Pennies',
      description: isPenniesUnlocked
        ? 'A psychology game where both players choose either Heads or Tails. Both players play the match for a total of 30 rounds.'
        : '🔒 Locked - Contact an admin to unlock this game.',
      icon: '🪙',
      gradient: 'from-aurora/20 via-pulse/20 to-royal/20',
      borderGradient: 'from-aurora via-pulse to-royal',
      iconBg: 'bg-gradient-to-br from-aurora/30 to-pulse/30',
      features: ['👑 Heads', '🦅 Tails'],
      loadingKey: 'pennies',
      locked: !isPenniesUnlocked
    }
  ];

  const isDisabled = loading.rps || loading.go || loading.pennies;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-night/90 via-nebula/50 to-night/90 p-8 backdrop-blur-xl shadow-2xl">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-royal/5 via-aurora/5 to-pulse/5 opacity-50" />
      
      {/* Header */}
      <div className="relative mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-aurora/30 bg-aurora/10 px-4 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-aurora">Choose Your Game</span>
        </div>
        <h2 className="mb-2 text-3xl font-bold bg-gradient-to-r from-white via-aurora to-white bg-clip-text text-transparent">
          {hasActiveGame ? 'Switch Game Mode' : 'Select Your Challenge'}
        </h2>
        <p className="text-sm text-white/60">
          {isGameInProgress 
            ? `Game in progress: ${currentGame.activeStage === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' : currentGame.activeStage === 'GAME_OF_GO' ? 'Game of Go' : 'Matching Pennies'}. End the current game to switch.`
            : hasActiveGame
            ? `Currently playing: ${currentGame.activeStage === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' : currentGame.activeStage === 'GAME_OF_GO' ? 'Game of Go' : 'Matching Pennies'}. Select a different game below.`
            : currentGame?.guest
            ? 'Both players are connected! Choose your battle arena below.'
            : 'Select game settings and start. Game will begin automatically when opponent joins.'}
        </p>
      </div>

      {/* Game Cards Grid - Always 3 columns */}
      <div className="relative grid gap-6 grid-cols-1 md:grid-cols-3">
        {games
          .filter(game => !selectedGameType || game.id === selectedGameType) // Only show selected game if specified
          .map((game) => {
          const isActive = currentGame?.activeStage === game.id;
          const isLoading = loading[game.loadingKey];
          const isHovered = hoveredGame === game.id;
          const isLocked = game.locked || false;
          const isDisabledForLock = isLocked || (isDisabled || (isGameInProgress && !isActive));

          return (
            <div
              key={game.id}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              className="group relative"
            >
              <div
                className={`relative h-full w-full overflow-hidden rounded-2xl border-2 p-6 text-left transition-all duration-300 ${
                  isActive
                    ? 'border-aurora bg-gradient-to-br from-aurora/20 via-aurora/10 to-transparent shadow-[0_0_30px_rgba(83,255,227,0.3)]'
                    : isLocked
                    ? 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent opacity-60'
                    : `border-white/10 bg-gradient-to-br ${game.gradient} hover:border-aurora/50 hover:shadow-[0_0_25px_rgba(83,255,227,0.2)]`
                } ${isDisabledForLock && !isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-aurora/20 via-transparent to-aurora/20 animate-pulse" />
                )}

                {/* Icon */}
                <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${game.iconBg} text-3xl shadow-lg transition-transform duration-300 ${isHovered ? 'scale-110 rotate-6' : ''}`}>
                  {game.icon}
            </div>

                {/* Game Badge */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
                    Game {game.stage}
                  </span>
                  {isLocked && (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-500/30 border border-red-500/50 px-3 py-1 text-xs font-bold text-red-400">
                      🔒 LOCKED
                    </span>
                  )}
                  {isActive && !isLocked && (
                    <span className="flex items-center gap-1.5 rounded-full bg-aurora px-3 py-1 text-xs font-bold text-night">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-night" />
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="mb-2 text-xl font-bold text-white">{game.title}</h3>

                {/* Description */}
                <p className="mb-4 text-sm leading-relaxed text-white/70">{game.description}</p>

                {/* Game-specific options - Board Size Selector */}
                {game.hasOptions && currentGame?.activeStage !== 'GAME_OF_GO' && !isLocked && (
                  <div className="mb-4">
                    <label className={`mb-3 block text-xs font-semibold uppercase tracking-wider ${isGameInProgress ? 'text-white/30' : 'text-white/50'}`}>
                      Board Size
                    </label>
                    <div className="flex flex-row flex-wrap gap-2">
                      {[9, 13, 19].map((size) => (
                        <button
                          key={size}
                          type="button"
                          disabled={isGameInProgress}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isGameInProgress) {
                              console.log('Board size button clicked - Setting to:', size);
                              setGoBoardSize(size);
                            }
                          }}
                          className={`flex-1 min-w-[80px] rounded-lg border-2 px-3 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                            isGameInProgress
                              ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                              : goBoardSize === size
                              ? 'border-aurora bg-aurora/30 text-white shadow-[0_0_15px_rgba(83,255,227,0.4)] scale-105'
                              : 'border-white/20 bg-white/5 text-white/70 hover:border-aurora/50 hover:bg-aurora/10 hover:text-white'
                          }`}
                        >
                          {size}×{size}
                        </button>
                      ))}
                    </div>
                    {/* Time Control Settings */}
                    <div className="mt-4 space-y-3">
                      <label className={`flex items-center gap-2 ${isGameInProgress ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={timeControl.enabled}
                          disabled={isGameInProgress}
                          onChange={(e) => {
                            if (!isGameInProgress) {
                              setTimeControl({ ...timeControl, enabled: e.target.checked });
                            }
                          }}
                          className="rounded border-white/20 disabled:opacity-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isGameInProgress) e.preventDefault();
                          }}
                        />
                        <span className={`text-xs font-semibold uppercase tracking-wider ${isGameInProgress ? 'text-white/30' : 'text-white/50'}`}>
                          Enable Time Control
                        </span>
                      </label>
                      {timeControl.enabled && (
                        <div className={`space-y-3 pl-6 border-l-2 ${isGameInProgress ? 'border-white/5' : 'border-white/10'}`}>
                          {/* Time Control Mode Selection */}
                          <div>
                            <label className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${isGameInProgress ? 'text-white/30' : 'text-white/50'}`}>
                              Time System
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isGameInProgress}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isGameInProgress) {
                                    setTimeControl({ ...timeControl, mode: 'fischer', preset: null });
                                  }
                                }}
                                className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                  isGameInProgress
                                    ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                                    : timeControl.mode === 'fischer'
                                    ? 'border-aurora bg-aurora/30 text-white'
                                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                }`}
                              >
                                Fischer
                              </button>
                              <button
                                type="button"
                                disabled={isGameInProgress}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isGameInProgress) {
                                    setTimeControl({ ...timeControl, mode: 'japanese', preset: null });
                                  }
                                }}
                                className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                  isGameInProgress
                                    ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                                    : timeControl.mode === 'japanese'
                                    ? 'border-aurora bg-aurora/30 text-white'
                                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                }`}
                              >
                                Byo-Yomi
                              </button>
                            </div>
                          </div>

                          {/* Pure Fischer Presets */}
                          {timeControl.mode === 'fischer' && (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block mb-2">
                                Quick Presets (Pure Fischer)
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  disabled={isGameInProgress}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isGameInProgress) {
                                      setTimeControl({
                                        ...timeControl,
                                        mode: 'fischer',
                                        mainTime: 30,
                                        increment: 5,
                                        preset: 'BLITZ_A',
                                      });
                                    }
                                  }}
                                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                    isGameInProgress
                                      ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                                      : timeControl.preset === 'BLITZ_A'
                                      ? 'border-aurora bg-aurora/30 text-white'
                                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                  }`}
                                >
                                  Blitz A
                                  <br />
                                  <span className="text-[10px]">30s + 5s</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isGameInProgress}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isGameInProgress) {
                                      setTimeControl({
                                        ...timeControl,
                                        mode: 'fischer',
                                        mainTime: 120,
                                        increment: 7,
                                        preset: 'BLITZ_B',
                                      });
                                    }
                                  }}
                                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                    isGameInProgress
                                      ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                                      : timeControl.preset === 'BLITZ_B'
                                      ? 'border-aurora bg-aurora/30 text-white'
                                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                  }`}
                                >
                                  Blitz B
                                  <br />
                                  <span className="text-[10px]">2m + 7s</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isGameInProgress}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isGameInProgress) {
                                      setTimeControl({
                                        ...timeControl,
                                        mode: 'fischer',
                                        mainTime: 180,
                                        increment: 10,
                                        preset: 'RAPID',
                                      });
                                    }
                                  }}
                                  className={`rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
                                    isGameInProgress
                                      ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-50'
                                      : timeControl.preset === 'RAPID'
                                      ? 'border-aurora bg-aurora/30 text-white'
                                      : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                  }`}
                                >
                                  Rapid
                                  <br />
                                  <span className="text-[10px]">3m + 10s</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Main Time */}
                          <div>
                            <label className="text-xs text-white/60 block mb-1">
                              Main Time (seconds)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="3600"
                              value={timeControl.mainTime}
                              disabled={isGameInProgress}
                              onChange={(e) => {
                                if (!isGameInProgress) {
                                  const seconds = parseInt(e.target.value) || 0;
                                  setTimeControl({ ...timeControl, mainTime: seconds });
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Fischer Increment */}
                          {timeControl.mode === 'fischer' && (
                            <div>
                              <label className="text-xs text-white/60 block mb-1">
                                Increment (seconds) - Added after each move
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={timeControl.increment}
                                disabled={isGameInProgress}
                                onChange={(e) => {
                                  if (!isGameInProgress) {
                                    const increment = parseInt(e.target.value) || 0;
                                    setTimeControl({ ...timeControl, increment });
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <p className="text-xs text-white/50 mt-1">
                                Format: {timeControl.mainTime}s + {timeControl.increment}s
                              </p>
                            </div>
                          )}

                          {/* Japanese Byo-Yomi */}
                          {timeControl.mode === 'japanese' && (
                            <>
                              <div>
                                <label className="text-xs text-white/60 block mb-1">
                                  Period Time (seconds)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="300"
                                  value={timeControl.byoYomiTime}
                                  disabled={isGameInProgress}
                                  onChange={(e) => {
                                    if (!isGameInProgress) {
                                      const seconds = parseInt(e.target.value) || 1;
                                      setTimeControl({ ...timeControl, byoYomiTime: seconds });
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                              <div>
                                <label className={`text-xs block mb-1 ${isGameInProgress ? 'text-white/30' : 'text-white/60'}`}>
                                  Number of Periods
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={timeControl.byoYomiPeriods}
                                  disabled={isGameInProgress}
                                  onChange={(e) => {
                                    if (!isGameInProgress) {
                                      const periods = parseInt(e.target.value) || 1;
                                      setTimeControl({ ...timeControl, byoYomiPeriods: periods });
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <p className="text-xs text-white/50 mt-1">
                                  Format: {timeControl.mainTime}s + {timeControl.byoYomiPeriods}×{timeControl.byoYomiTime}s
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isDisabledForLock) {
                          const currentSize = goBoardSizeRef.current;
                          console.log('Start button clicked - Current goBoardSize state:', goBoardSize, 'Ref:', currentSize);
                          handleStartGame(game.id, currentSize);
                        }
                      }}
                      disabled={isDisabledForLock}
                      className="mt-4 w-full rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-4 py-2.5 text-sm font-bold text-white transition-all hover:from-aurora/30 hover:to-royal/30 hover:shadow-[0_0_15px_rgba(83,255,227,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLocked ? '🔒 Locked - Contact Admin' : `Start Game (${goBoardSize}×${goBoardSize})`}
                    </button>
                  </div>
                )}

                {/* Features */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {game.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 backdrop-blur-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Time Control for RPS and Matching Pennies - Fixed at 15 seconds */}
                {!game.hasOptions && (
                  <div className="mt-4">
                    <p className="text-xs text-white/50">
                      Players have 20 seconds per move
                    </p>
                  </div>
                )}

                {/* Start Game Button for games without options (RPS and Matching Pennies) */}
                {!game.hasOptions && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isDisabledForLock) {
                        handleStartGame(game.id);
                      }
                    }}
                    disabled={isDisabledForLock}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-4 py-2.5 text-sm font-bold text-white transition-all hover:from-aurora/30 hover:to-royal/30 hover:shadow-[0_0_15px_rgba(83,255,227,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLocked ? '🔒 Locked - Contact Admin' : 'Start Game'}
                  </button>
                )}

                {/* Hover effect overlay */}
                {!isActive && isHovered && !game.hasOptions && (
                  <div className="absolute inset-0 bg-gradient-to-br from-aurora/5 to-transparent pointer-events-none" />
                )}

                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-night/80 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-aurora/30 border-t-aurora" />
                      <span className="text-sm font-semibold text-aurora">Starting...</span>
              </div>
              </div>
            )}

                {/* Shine effect on hover - removed for games without options since they now have buttons */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom decorative line */}
      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-aurora/30 to-transparent" />
    </div>
  );
};

export default GameSelector;

