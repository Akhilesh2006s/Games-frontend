import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import RematchModal from './RematchModal';

const choices = [
  { label: 'Heads', value: 'heads', emoji: '🪙', icon: '👑' },
  { label: 'Tails', value: 'tails', emoji: '🪙', icon: '🦅' },
];

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const MatchingPennies = () => {
  const { selectedGameType, setSelectedGameType, currentGame, statusMessage, setStatusMessage, setCurrentGame, resetGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [result, setResult] = useState(null);
  const [lockedChoice, setLockedChoice] = useState('');
  const [opponentLock, setOpponentLock] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('Create or join a code to begin.');
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [roundNumber, setRoundNumber] = useState(0);
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

  // Constant roles: Host always chooses, Guest always chooses
  useEffect(() => {
    if (currentGame?.penniesRoundNumber !== undefined) {
      const round = currentGame.penniesRoundNumber || 0;
      setRoundNumber(round);
    }
  }, [currentGame?.penniesRoundNumber]);

  useEffect(() => {
    if (currentGame) {
      setScores({
        host: currentGame.hostPenniesScore || 0,
        guest: currentGame.guestPenniesScore || 0,
      });
    }
  }, [currentGame?.hostPenniesScore, currentGame?.guestPenniesScore]);

  useEffect(() => {
    setResult(null);
    setLockedChoice('');
    setOpponentLock('');
    if (!currentGame) {
      setOpponentStatus('Create or join a code to begin.');
      return;
    }
    const rivalName = isHost 
      ? (currentGame.guest?.studentName || currentGame.guest?.username)
      : (currentGame.host?.studentName || currentGame.host?.username);
    if (rivalName) {
      setOpponentStatus(`${rivalName} is connected. Ready to play Matching Pennies.`);
      return;
    }
    setOpponentStatus('Waiting for a challenger to enter your code.');
  }, [currentGame, isHost]);

  // Timer for per-move time control - request timer from server
  useEffect(() => {
    if (!currentGame?.penniesTimePerMove || currentGame.penniesTimePerMove === 0) {
      setTimeRemaining(null);
      return;
    }

    if (!lockedChoice && !result && isJoined && (currentGame.status === 'IN_PROGRESS' || currentGame.status === 'READY')) {
      // Notify server that round has started (server will send timer updates)
      if (socket && currentGame?.code && !lockedChoice && currentGame.status === 'IN_PROGRESS') {
        socket.emit('startRound', { code: currentGame.code, gameType: 'MATCHING_PENNIES' });
      }
    } else {
      setTimeRemaining(null);
    }
  }, [currentGame?.penniesTimePerMove, lockedChoice, result, isJoined, currentGame?.status, socket, currentGame?.code]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleResult = (payload) => {
      setResult(payload);
      setLockedChoice('');
      setOpponentLock('');
      setScores({
        host: payload.hostScore || 0,
        guest: payload.guestScore || 0,
      });
      setRoundNumber(payload.roundNumber || 0);
      
      if (payload.isGameComplete) {
        const winnerName = payload.winner === 'host' 
          ? (currentGame?.host?.studentName || currentGame?.host?.username)
          : (currentGame?.guest?.studentName || currentGame?.guest?.username);
        setStatusMessage(`${winnerName} wins the Matching Pennies match! First to 10 points.`);
      } else {
        const winnerText = payload.hostWon
          ? `Both chose the same. ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} wins!`
          : `Different choices. ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} wins!`;
        setStatusMessage(
          `Round ${payload.roundNumber} complete. ${winnerText} Score: ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} ${payload.hostScore} - ${payload.guestScore} ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}`
        );
        // Clear result after 8 seconds to allow players to see the result, or when a new move is played
        const resultTimeout = setTimeout(() => {
          // Only clear if no new result has been set (check if result is still the same)
          setResult((prevResult) => {
            if (prevResult && prevResult.roundNumber === payload.roundNumber) {
              return null;
            }
            return prevResult;
          });
          setStatusMessage((prevMsg) => {
            // Only update if it's still the round complete message
            if (prevMsg.includes('Round') && prevMsg.includes('complete')) {
              return 'Ready for next round. Both players choose!';
            }
            return prevMsg;
          });
        }, 8000);
        
        // Store timeout ID to clear if needed
        return () => clearTimeout(resultTimeout);
      }
      refreshGameDetails();
    };

    const handleOpponentLock = (name) => {
      setOpponentLock(`${name} locked in`);
      setOpponentStatus(`${name} locked their choice. Hang tight.`);
    };

    const handleJoined = () => {
      if (currentGame?.guest) {
        setStatusMessage('Both players connected. Ready for Matching Pennies.');
      } else {
        setStatusMessage('Arena synced. Waiting for a challenger.');
      }
    };

    const handlePeerJoined = (username) => {
      setOpponentStatus(`${username} joined your arena.`);
      setStatusMessage(`${username} is here. Ready to play Matching Pennies.`);
      refreshGameDetails();
    };

    const handleGuestJoined = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
      }
      setOpponentStatus(`${payload.guestName} joined your arena.`);
      setStatusMessage(`${payload.guestName} is here. Ready to play Matching Pennies.`);
    };

    const handleError = (message) => setStatusMessage(message);

    socket.on('penniesResult', handleResult);
    socket.on('penniesOpponentLocked', handleOpponentLock);
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
        // Only update if player hasn't locked their choice
        if (!lockedChoice) {
          setTimeRemaining(payload.timeRemaining);
        } else {
          // Clear timer when choice is locked
          setTimeRemaining(null);
        }
      }
    };
    socket.on('penniesTimerUpdate', handleTimerUpdate);
    
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
          setStatusMessage(`${winnerName} wins! ${payload.winner === 'host' ? payload.game.hostPenniesScore : payload.game.guestPenniesScore} - ${payload.winner === 'host' ? payload.game.guestPenniesScore : payload.game.hostPenniesScore}`);
        } else {
          setStatusMessage('Game ended in a draw!');
        }
        // Set final result for display
        setResult({
          isGameComplete: true,
          winner: payload.winner,
          hostScore: payload.game.hostPenniesScore || 0,
          guestScore: payload.game.guestPenniesScore || 0,
        });
        setScores({
          host: payload.game.hostPenniesScore || 0,
          guest: payload.game.guestPenniesScore || 0,
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
          setSelectedGameType('MATCHING_PENNIES');
        }
        // Reset game state
        setResult(null);
        setScores({ host: 0, guest: 0 });
        setLockedChoice('');
        setOpponentLock('');
        setRoundNumber(0);
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
      socket.off('penniesResult', handleResult);
      socket.off('penniesOpponentLocked', handleOpponentLock);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started');
      socket.off('game:error', handleError);
      socket.off('game:ended', handleGameEnded);
      socket.off('rematch:requested', handleRematchRequest);
      socket.off('rematch:accepted', handleRematchAccepted);
      socket.off('rematch:rejected', handleRematchRejected);
      socket.off('penniesTimerUpdate', handleTimerUpdate);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, setCurrentGame, socket, isHost, currentGame, selectedGameType, setSelectedGameType, lockedChoice]);

  const submitChoice = (choice) => {
    if (!socket || !currentGame || !isJoined) {
      if (!isConnected) {
        setStatusMessage('Connecting to arena...');
      } else if (!isJoined) {
        setStatusMessage('Joining game room...');
      }
      return;
    }
    if (lockedChoice) return;
    if (scores.host >= 10 || scores.guest >= 10) return;
    if (currentGame.status === 'COMPLETE') return; // Game already ended
    setLockedChoice(choice);
    setStatusMessage('Choice locked. Waiting for your opponent...');
    socket.emit('submitPenniesMove', { code: currentGame.code, choice });
  };

  if (!currentGame) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        Create or join a code to boot into the Matching Pennies arena.
      </div>
    );
  }

  const roleDescription = isHost
    ? 'You choose heads or tails. If your opponent chooses the same, you win!'
    : 'You choose heads or tails. If you choose differently from your opponent, you win!';

  return (
    <section className="glass-panel space-y-6 p-6 text-white">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 03</p>
            <h3 className="text-2xl font-semibold">Matching Pennies</h3>
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            </p>
            <p className={`text-3xl font-bold ${scores.guest >= 10 ? 'text-aurora' : 'text-white'}`}>
              {scores.guest}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Round {roundNumber + 1}</p>
          <p className="text-sm text-white/70 mt-1">
            🎯 Both Players Choose
          </p>
          <p className="text-base font-semibold text-white/90 mt-2">{roleDescription}</p>
        </div>
        <p className="mt-4 text-white/60">{statusMessage || opponentStatus}</p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">You</p>
            <p className={`text-6xl ${lockedChoice ? '' : 'animate-pulse'}`}>
              {lockedChoice === 'heads' ? '👑' : lockedChoice === 'tails' ? '🦅' : '🪙'}
            </p>
            <p className="text-white/60">
              {lockedChoice ? `Locked ${lockedChoice.toUpperCase()}` : 'Choose heads or tails'}
            </p>
            {/* Timer Display for You - Game of Go Style */}
            {timeRemaining !== null && timeRemaining > 0 && !lockedChoice && (currentGame?.status === 'IN_PROGRESS' || currentGame?.status === 'READY') && (
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
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-6 text-center">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-white/70">
              {isHost ? (currentGame.guest?.studentName || currentGame.guest?.username || 'Challenger') : (currentGame.host?.studentName || currentGame.host?.username || 'Host')}
            </p>
            <p className={`text-7xl mt-2 ${opponentLock ? '' : 'animate-pulse'}`}>
              {opponentLock ? '🪙' : '⌛'}
            </p>
            <p className="text-base font-semibold text-white/80 mt-2">
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
        <p className="mt-4 text-center text-sm text-white/50">{opponentStatus}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {choices.map((choice) => {
          const isDisabled = !isJoined || lockedChoice !== '' || scores.host >= 10 || scores.guest >= 10;
          return (
            <button
              key={choice.value}
              onClick={() => submitChoice(choice.value)}
              disabled={isDisabled}
              className={`rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:-translate-y-1 ${
                lockedChoice === choice.value ? 'ring-2 ring-aurora' : ''
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <p className="text-6xl">{choice.icon}</p>
              <p className="mt-4 text-lg font-semibold uppercase tracking-[0.4em] text-white/50">
                {choice.label}
              </p>
              <p className="text-white/70 mt-2">
                Choose this side
              </p>
            </button>
          );
        })}
      </div>

      {result && (
        <div className={`rounded-3xl border p-6 text-center ${
          result.isGameComplete 
            ? 'border-aurora/60 bg-aurora/20' 
            : 'border-aurora/40 bg-aurora/10'
        }`}>
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            {result.isGameComplete ? 'Match Complete' : 'Round Recap'}
          </p>
          {result.isGameComplete ? (
            <>
              <p className="text-4xl font-display text-aurora mt-2">
                {result.winner === 'host' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} Wins!` 
                  : `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} Wins!`}
              </p>
              <p className="text-white/70 mt-2">
                Final Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {result.hostScore} - {result.guestScore} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
              </p>
              <div className="flex gap-4 mt-4 justify-center">
                <button
                  onClick={() => {
                    if (socket && currentGame?.code) {
                      socket.emit('rematch:request', { code: currentGame.code });
                      setStatusMessage('Rematch request sent. Waiting for opponent...');
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
                    setLockedChoice('');
                    setOpponentLock('');
                    setRoundNumber(0);
                  }}
                  className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  Go Back to Arena
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-3xl font-display mt-2">
                {result.winner === 'host' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} wins this round` 
                  : `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} wins this round`}
              </p>
              <p className="text-white/70 mt-2">
                {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} chose <span className="font-semibold">{result.hostChoice}</span>
              </p>
              <p className="text-white/70">
                {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} chose <span className="font-semibold">{result.guestChoice}</span>
              </p>
              <p className="text-sm text-white/40 mt-2">
                {result.hostWon 
                  ? `✅ Same choice! ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} wins.`
                  : `❌ Different choices! ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} wins.`}
              </p>
              <p className="text-sm text-white/40 mt-2">
                Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {result.hostScore} - {result.guestScore} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
              </p>
            </>
          )}
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
                  setStatusMessage(`${winnerName} wins! ${data.winner === 'host' ? data.game.hostPenniesScore : data.game.guestPenniesScore} - ${data.winner === 'host' ? data.game.guestPenniesScore : data.game.hostPenniesScore}`);
                } else {
                  setStatusMessage('Game ended in a draw!');
                }
                // Set final result for display
                setResult({
                  isGameComplete: true,
                  winner: data.winner,
                  hostScore: data.game.hostPenniesScore || 0,
                  guestScore: data.game.guestPenniesScore || 0,
                });
                setScores({
                  host: data.game.hostPenniesScore || 0,
                  guest: data.game.guestPenniesScore || 0,
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

export default MatchingPennies;

