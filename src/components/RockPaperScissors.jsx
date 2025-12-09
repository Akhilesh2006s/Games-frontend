import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import RematchModal from './RematchModal';

const moves = [
  { label: 'Rock', value: 'rock', hand: '✊', hint: 'Crushes scissors' },
  { label: 'Paper', value: 'paper', hand: '✋', hint: 'Smothers rock' },
  { label: 'Scissors', value: 'scissors', hand: '✌️', hint: 'Slices paper' },
];

const handMap = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const RockPaperScissors = () => {
  const { selectedGameType, setSelectedGameType, currentGame, statusMessage, setStatusMessage, setCurrentGame, resetGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [lockedMove, setLockedMove] = useState('');
  const [opponentLock, setOpponentLock] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('Create or join a code to begin.');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [timeRemaining, setTimeRemaining] = useState(null);
  const timeRemainingRef = useRef(null);
  const [rematchModal, setRematchModal] = useState({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });

  const { socket, isConnected, isJoined } = useSocket({
    enabled: Boolean(currentGame),
    roomCode: currentGame?.code,
  });

  const userId = user?._id || user?.id;
  const hostId = currentGame?.host?._id || currentGame?.host?.id;
  const isHost = Boolean(userId && hostId && userId === hostId);

  const refreshGameDetails = useCallback(async () => {
    if (!currentGame?.code) return;
    try {
      const { data } = await api.get(`/games/code/${currentGame.code}`);
      setCurrentGame(data.game);
    } catch (err) {
      console.error('Failed to refresh arena state', err);
    }
  }, [currentGame?.code, setCurrentGame]);

  const yourHandDisplay = useMemo(() => {
    if (result) {
      const resolvedMove = isHost ? result.hostMove : result.guestMove;
      return handMap[resolvedMove] || '⏳';
    }
    if (lockedMove) return handMap[lockedMove];
    return '⏳';
  }, [isHost, lockedMove, result]);

  const opponentHandDisplay = useMemo(() => {
    if (result) {
      const rivalMove = isHost ? result.guestMove : result.hostMove;
      return handMap[rivalMove] || '⏳';
    }
    if (opponentLock) return handMap[opponentLock] || '🔒';
    if (!currentGame?.guest) return '⏳';
    return '⏳';
  }, [currentGame?.guest, isHost, opponentLock, result]);

  useEffect(() => {
    if (currentGame) {
      setScores({
        host: currentGame.hostScore || 0,
        guest: currentGame.guestScore || 0,
      });
    }
  }, [currentGame?.hostScore, currentGame?.guestScore]);

  useEffect(() => {
    setResult(null);
    setLockedMove('');
    setOpponentLock('');
    setWaitSeconds(0);
    if (!currentGame) {
      setOpponentStatus('Create or join a code to begin.');
      return;
    }
    const rivalName = isHost 
      ? (currentGame.guest?.studentName || currentGame.guest?.username)
      : (currentGame.host?.studentName || currentGame.host?.username);
    if (rivalName) {
      setOpponentStatus(`${rivalName} is connected. Throw a hand when ready.`);
      return;
    }
    setOpponentStatus('Waiting for a challenger to enter your code.');
  }, [currentGame, isHost]);

  useEffect(() => {
    if (!currentGame || currentGame.guest) {
      setWaitSeconds(0);
      return () => {};
    }
    const timer = setInterval(() => setWaitSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [currentGame]);

  // Listen for server timer updates (like Game of Go)
  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (payload) => {
      if (payload.timeRemaining !== undefined) {
        setTimeRemaining(payload.timeRemaining);
      }
    };

    socket.on('rpsTimerUpdate', handleTimerUpdate);

    return () => {
      socket.off('rpsTimerUpdate', handleTimerUpdate);
    };
  }, [socket]);

  // Timer for per-move time control - request timer from server
  useEffect(() => {
    if (!currentGame?.rpsTimePerMove || currentGame.rpsTimePerMove === 0) {
      setTimeRemaining(null);
      return;
    }

    if (!lockedMove && !result && isJoined && (currentGame.status === 'IN_PROGRESS' || currentGame.status === 'READY')) {
      // Notify server that round has started (server will send timer updates)
      if (socket && currentGame?.code && !lockedMove && currentGame.status === 'IN_PROGRESS') {
        socket.emit('startRound', { code: currentGame.code, gameType: 'ROCK_PAPER_SCISSORS' });
      }
    } else {
      setTimeRemaining(null);
    }
  }, [currentGame?.rpsTimePerMove, lockedMove, result, isJoined, currentGame?.status, socket, currentGame?.code]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleResult = (payload) => {
      setResult(payload);
      setLockedMove('');
      setOpponentLock('');
      setScores({
        host: payload.hostScore || 0,
        guest: payload.guestScore || 0,
      });
      
      if (payload.isGameComplete) {
        const winnerName = payload.winner === 'host' 
          ? (currentGame?.host?.studentName || currentGame?.host?.username)
          : (currentGame?.guest?.studentName || currentGame?.guest?.username);
        setStatusMessage(`${winnerName} wins the match! First to 10 points.`);
        // Don't clear result when game is complete - keep it visible for both players
      } else {
        setStatusMessage(
          payload.result === 'draw'
            ? 'Draw registered. Replay to continue.'
            : `Round complete. Score: ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} ${payload.hostScore} - ${payload.guestScore} ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}`
        );
        // Clear result after 3 seconds to allow players to see the result, or when a new move is played
        const resultTimeout = setTimeout(() => {
          // Only clear if no new result has been set (check if result is still the same)
          setResult((prevResult) => {
            if (prevResult && prevResult.roundNumber === payload.roundNumber && !prevResult.isGameComplete) {
              return null;
            }
            return prevResult;
          });
          setStatusMessage((prevMsg) => {
            // Only update if it's still the round complete message
            if (prevMsg.includes('Round complete') || prevMsg.includes('Draw registered')) {
              return 'Ready for next round. Pick a hand!';
            }
            return prevMsg;
          });
        }, 3000);
        
        // Store timeout ID to clear if needed
        return () => clearTimeout(resultTimeout);
      }
      refreshGameDetails();
    };

    const handleOpponentLock = (name) => {
      setOpponentLock(`${name} locked in`);
      setOpponentStatus(`${name} locked their hand. Hang tight.`);
    };

    const handleJoined = () => {
      if (currentGame?.guest) {
        setStatusMessage('Both players connected. Pick a hand to continue.');
      } else {
        setStatusMessage('Arena synced. Waiting for a challenger.');
      }
    };

    const handlePeerJoined = (username) => {
      setOpponentStatus(`${username} joined your arena. Ask them to lock in.`);
      setStatusMessage(`${username} is here. Throw your hand when ready.`);
      refreshGameDetails();
    };

    const handleGuestJoined = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        setStatusMessage(`${payload.guestName} is here. Ready to play Rock Paper Scissors.`);
        refreshGameDetails();
      }
    };

    const handleError = (message) => setStatusMessage(message);

    socket.on('roundResult', handleResult);
    socket.on('opponentLocked', handleOpponentLock);
    socket.on('game:joined', handleJoined);
    socket.on('game:peer_joined', handlePeerJoined);
    socket.on('game:guest_joined', handleGuestJoined);
    socket.on('game:started', (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        refreshGameDetails();
      }
    });
    socket.on('game:error', handleError);
    
    // Listen for server timer updates (like Game of Go)
    const handleTimerUpdate = (payload) => {
      if (payload.timeRemaining !== undefined) {
        // Only update if player hasn't locked their move
        if (!lockedMove) {
          setTimeRemaining(payload.timeRemaining);
        } else {
          // Clear timer when move is locked
          setTimeRemaining(null);
        }
      }
    };
    socket.on('rpsTimerUpdate', handleTimerUpdate);

    // Handle game ended (from resign)
    const handleGameEnded = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        const winnerName = payload.winner === 'host'
          ? (payload.game.host?.studentName || payload.game.host?.username || 'Host')
          : payload.winner === 'guest'
            ? (payload.game.guest?.studentName || payload.game.guest?.username || 'Guest')
            : null;
        if (winnerName) {
          setStatusMessage(`${winnerName} wins! ${payload.winner === 'host' ? payload.game.hostScore : payload.game.guestScore} - ${payload.winner === 'host' ? payload.game.guestScore : payload.game.hostScore}`);
        } else {
          setStatusMessage('Game ended in a draw!');
        }
        // Set final result for display
        setResult({
          isGameComplete: true,
          winner: payload.winner,
          hostScore: payload.game.hostScore || 0,
          guestScore: payload.game.guestScore || 0,
        });
        setScores({
          host: payload.game.hostScore || 0,
          guest: payload.game.guestScore || 0,
        });
      }
    };

    socket.on('game:ended', handleGameEnded);

    // Rematch handlers
    const handleRematchRequest = (payload) => {
      const opponentName = payload.requesterName || 'Opponent';
      setRematchModal({
        isOpen: true,
        opponentName,
        requesterId: payload.requesterId,
        gameType: payload.gameType,
        gameSettings: payload.gameSettings,
      });
    };

    const handleRematchAccepted = async (payload) => {
      setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
      if (payload.game) {
        setCurrentGame(payload.game);
        // Set game type for auto-start
        if (payload.gameType) {
          setSelectedGameType(payload.gameType);
        } else if (!selectedGameType) {
          setSelectedGameType('ROCK_PAPER_SCISSORS');
        }
        // Reset game state
        setResult(null);
        setScores({ host: 0, guest: 0 });
        setLockedMove('');
        setOpponentLock('');
        setStatusMessage('Rematch started! Both players connected.');
        // Join new game room
        if (socket && payload.newCode) {
          socket.emit('joinGame', { code: payload.newCode });
        }
      }
    };

    const handleRematchRejected = (payload) => {
      setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
      setStatusMessage(`${payload.rejectorName || 'Opponent'} declined the rematch.`);
    };

    socket.on('rematch:requested', handleRematchRequest);
    socket.on('rematch:accepted', handleRematchAccepted);
    socket.on('rematch:rejected', handleRematchRejected);

    return () => {
      socket.off('roundResult', handleResult);
      socket.off('opponentLocked', handleOpponentLock);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started');
      socket.off('game:error', handleError);
      socket.off('game:ended', handleGameEnded);
      socket.off('rematch:requested', handleRematchRequest);
      socket.off('rematch:accepted', handleRematchAccepted);
      socket.off('rematch:rejected', handleRematchRejected);
      socket.off('rpsTimerUpdate', handleTimerUpdate);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, setCurrentGame, socket, lockedMove]);

  const playMove = (choice) => {
    if (!socket || !currentGame || !isJoined) {
      if (!isConnected) {
        setStatusMessage('Connecting to arena...');
      } else if (!isJoined) {
        setStatusMessage('Joining game room...');
      }
      return;
    }
    if (lockedMove) return; // Prevent double submission
    if (scores.host >= 10 || scores.guest >= 10) return; // Game already complete
    if (currentGame.status === 'COMPLETE') return; // Game already ended
    setLockedMove(choice);
    setStatusMessage('Hand locked. Waiting for your opponent...');
    socket.emit('submitMove', { code: currentGame.code, move: choice });
  };

  if (!currentGame) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        Create or join a code to boot into the Rock Paper Scissors arena.
      </div>
    );
  }

  return (
    <section className="glass-panel space-y-6 p-6 text-white">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 01</p>
            <h3 className="text-2xl font-semibold">Rock • Paper • Scissors</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-white/50">
              {isConnected ? (isJoined ? 'Joined' : 'Connecting...') : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {currentGame?.host?.username || 'Host'}
            </p>
            <p className={`text-3xl font-bold ${scores.host >= 10 ? 'text-aurora' : 'text-white'}`}>
              {scores.host}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/60">First to 10 wins</p>
            <p className="text-lg font-semibold text-white/40">VS</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            </p>
            <p className={`text-3xl font-bold ${scores.guest >= 10 ? 'text-aurora' : 'text-white'}`}>
              {scores.guest}
            </p>
          </div>
        </div>
        <p className="mt-4 text-white/60">{statusMessage || opponentStatus}</p>
        {/* Timer Display - Game of Go Style (removed duplicate, timer is in player card) */}
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">You</p>
            <p className={`text-6xl ${lockedMove ? '' : 'animate-pulse'}`}>{yourHandDisplay}</p>
            <p className="text-white/60">
              {lockedMove ? `Locked ${lockedMove.toUpperCase()}` : 'Pick a hand to lock in'}
            </p>
            {/* Timer Display for You - Game of Go Style */}
            {timeRemaining !== null && timeRemaining > 0 && !lockedMove && (currentGame?.status === 'IN_PROGRESS' || currentGame?.status === 'READY') && (
              <div className="mt-3 text-center">
                <div className={`text-3xl font-bold font-mono transition-colors ${
                  timeRemaining <= 5 
                    ? 'text-pulse animate-pulse' 
                    : 'text-aurora'
                }`}>
                  {formatDuration(timeRemaining)}
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">
              {isHost ? (currentGame.guest?.studentName || currentGame.guest?.username || 'Challenger') : (currentGame.host?.studentName || currentGame.host?.username || 'Host')}
            </p>
            <p className={`text-6xl  ${opponentLock ? '' : 'animate-pulse'}`}>{opponentHandDisplay}</p>
            <p className="text-white/60">
              {opponentLock || (currentGame?.guest ? 'Waiting for lock' : 'Opponent pending')}
            </p>
            {/* Timer Display for Opponent - Game of Go Style */}
            {timeRemaining !== null && timeRemaining > 0 && opponentLock === '' && (currentGame?.status === 'IN_PROGRESS' || currentGame?.status === 'READY') && currentGame?.guest && (
              <div className="mt-3 text-center">
                <div className={`text-3xl font-bold font-mono transition-colors ${
                  timeRemaining <= 5 
                    ? 'text-pulse animate-pulse' 
                    : 'text-aurora'
                }`}>
                  {formatDuration(timeRemaining)}
                </div>
              </div>
            )}
          </div>
        </div>
        {!currentGame.guest && (
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/50">
            Waiting • {formatDuration(waitSeconds)}
          </p>
        )}
        <p className="mt-1 text-white/50">{opponentStatus}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {moves.map((move) => {
          const isDisabled = !isJoined || lockedMove !== '' || scores.host >= 10 || scores.guest >= 10;
          return (
            <button
              key={move.value}
              onClick={() => playMove(move.value)}
              disabled={isDisabled}
              className={`rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-left transition hover:-translate-y-1 ${
                lockedMove === move.value ? 'ring-2 ring-aurora' : ''
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <p className="text-5xl">{move.hand}</p>
              <p className="mt-4 text-sm uppercase tracking-[0.4em] text-white/50">{move.label}</p>
              <p className="text-white/70">{move.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-center">
        <p className="text-white/60">
          {lockedMove ? `You locked ${lockedMove.toUpperCase()}` : 'Awaiting your decision'}
        </p>
        <p className="text-white/50">{opponentLock || 'Opponent pending'}</p>
      </div>

      {(result || currentGame?.status === 'COMPLETE') && (
        <div className={`rounded-3xl border p-6 text-center ${
          (result?.isGameComplete || currentGame?.status === 'COMPLETE')
            ? 'border-aurora/60 bg-aurora/20' 
            : 'border-aurora/40 bg-aurora/10'
        }`}>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {(result?.isGameComplete || currentGame?.status === 'COMPLETE') ? 'Match Complete' : 'Round Recap'}
          </p>
          {(result?.isGameComplete || currentGame?.status === 'COMPLETE') ? (
            <>
              <p className="text-4xl font-display text-aurora mt-2">
                {(result?.winner || (currentGame?.hostScore >= 10 ? 'host' : currentGame?.guestScore >= 10 ? 'guest' : null)) === 'host' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} Wins!` 
                  : (result?.winner || (currentGame?.hostScore >= 10 ? 'host' : currentGame?.guestScore >= 10 ? 'guest' : null)) === 'guest'
                    ? `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} Wins!`
                    : 'Match Complete!'}
              </p>
              <p className="text-white/70 mt-2">
                Final Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {result?.hostScore || currentGame?.hostScore || 0} - {result?.guestScore || currentGame?.guestScore || 0} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
              </p>
              <div className="flex gap-4 mt-4 justify-center">
                <button
                  onClick={async () => {
                    try {
                      // Request rematch - use socket to send rematch request
                      if (socket && currentGame?.code) {
                        socket.emit('rematch:request', { 
                          code: currentGame.code,
                          gameType: 'ROCK_PAPER_SCISSORS',
                          gameSettings: { timePerMove: 15 }
                        });
                        setStatusMessage('Rematch request sent. Waiting for opponent...');
                      } else {
                        // Fallback: create new game for rematch
                        const { data } = await api.post('/games/create');
                        setCurrentGame(data.game);
                        if (!selectedGameType) {
                          setSelectedGameType('ROCK_PAPER_SCISSORS');
                        }
                        setStatusMessage('Rematch game created! Share the code with your opponent.');
                        setResult(null);
                        setScores({ host: 0, guest: 0 });
                        setLockedMove('');
                        setOpponentLock('');
                      }
                    } catch (err) {
                      setStatusMessage(err.response?.data?.message || 'Failed to create rematch');
                    }
                  }}
                  className="rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-6 py-3 text-sm font-bold text-white hover:from-aurora/30 hover:to-royal/30 transition"
                >
                  Rematch
                </button>
                <button
                  onClick={() => {
                    resetGame();
                    setSelectedGameType(null);
                    setResult(null);
                    setScores({ host: 0, guest: 0 });
                    setLockedMove('');
                    setOpponentLock('');
                    // Navigate to arena page (home)
                    navigate('/arena', { replace: true });
                  }}
                  className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Exit to Arena
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-3xl font-display">
                {result.result === 'draw' 
                  ? 'Draw' 
                  : result.result === 'host'
                    ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} wins this round`
                    : `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} wins this round`}
              </p>
              <p className="text-white/70">
                {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} played <span className="font-semibold">{result.hostMove}</span> • {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} played{' '}
                <span className="font-semibold">{result.guestMove}</span>
              </p>
              <p className="text-sm text-white/40 mt-2">
                Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {result.hostScore} - {result.guestScore} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Show buttons when game is complete, even if result is not set */}
      {currentGame?.status === 'COMPLETE' && !result && (
        <div className="rounded-3xl border border-aurora/60 bg-aurora/20 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Match Complete</p>
          <p className="text-4xl font-display text-aurora mt-2">
            {currentGame?.hostScore >= 10 
              ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} Wins!` 
              : currentGame?.guestScore >= 10
                ? `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} Wins!`
                : 'Match Complete!'}
          </p>
          <p className="text-white/70 mt-2">
            Final Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {currentGame?.hostScore || 0} - {currentGame?.guestScore || 0} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
          </p>
          <div className="flex gap-4 mt-4 justify-center">
            <button
              onClick={async () => {
                try {
                  if (socket && currentGame?.code) {
                    socket.emit('rematch:request', { 
                      code: currentGame.code,
                      gameType: 'ROCK_PAPER_SCISSORS',
                      gameSettings: { timePerMove: 15 }
                    });
                    setStatusMessage('Rematch request sent. Waiting for opponent...');
                  } else {
                    const { data } = await api.post('/games/create');
                    setCurrentGame(data.game);
                    if (!selectedGameType) {
                      setSelectedGameType('ROCK_PAPER_SCISSORS');
                    }
                    setStatusMessage('Rematch game created! Share the code with your opponent.');
                  }
                } catch (err) {
                  setStatusMessage(err.response?.data?.message || 'Failed to create rematch');
                }
              }}
              className="rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-6 py-3 text-sm font-bold text-white hover:from-aurora/30 hover:to-royal/30 transition"
            >
              Rematch
            </button>
            <button
              onClick={() => {
                resetGame();
                setSelectedGameType(null);
                navigate('/arena', { replace: true });
              }}
              className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Exit to Arena
            </button>
          </div>
        </div>
      )}

      {/* End Game Button */}
      {currentGame?.guest && currentGame?.status !== 'COMPLETE' && scores.host < 10 && scores.guest < 10 && (
        <div className="flex justify-end">
          <button
            onClick={async () => {
              if (!currentGame?.code) return;
              const hasAnyPoints = scores.host > 0 || scores.guest > 0;
              const confirmText = hasAnyPoints 
                ? 'Are you sure you want to resign? The game will end and your opponent will win.'
                : 'Are you sure you want to cancel this game?';
              if (!window.confirm(confirmText)) return;
              
              try {
                const { data } = await api.post('/games/end-game', { code: currentGame.code });
                // Show result immediately
                const winnerName = data.winner === 'host'
                  ? (currentGame?.host?.studentName || currentGame?.host?.username || 'Host')
                  : data.winner === 'guest'
                    ? (currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest')
                    : null;
                if (winnerName) {
                  setStatusMessage(`${winnerName} wins! ${data.winner === 'host' ? data.game.hostScore : data.game.guestScore} - ${data.winner === 'host' ? data.game.guestScore : data.game.hostScore}`);
                } else {
                  setStatusMessage('Game ended in a draw!');
                }
                // Set final result for display
                setResult({
                  isGameComplete: true,
                  winner: data.winner,
                  hostScore: data.game.hostScore || 0,
                  guestScore: data.game.guestScore || 0,
                });
                setScores({
                  host: data.game.hostScore || 0,
                  guest: data.game.guestScore || 0,
                });
                setCurrentGame(data.game);
                await refreshGameDetails();
              } catch (err) {
                console.error('Failed to end game:', err);
                setStatusMessage(err.response?.data?.message || 'Failed to end game');
              }
            }}
            disabled={!isJoined}
            className="rounded-lg border border-red-500/50 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scores.host > 0 || scores.guest > 0 ? 'Resign' : 'Cancel Game'}
          </button>
        </div>
      )}

      <RematchModal
        isOpen={rematchModal.isOpen}
        opponentName={rematchModal.opponentName}
        onAccept={() => {
          if (socket && currentGame?.code && rematchModal.requesterId) {
            socket.emit('rematch:accept', { code: currentGame.code, requesterId: rematchModal.requesterId });
          }
        }}
        onReject={() => {
          if (socket && currentGame?.code) {
            socket.emit('rematch:reject', { code: currentGame.code });
          }
          setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
        }}
        onClose={() => {
          setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
        }}
      />
    </section>
  );
};

export default RockPaperScissors;

