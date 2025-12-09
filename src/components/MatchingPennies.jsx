import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [lockedChoice, setLockedChoice] = useState('');
  const [opponentLock, setOpponentLock] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('Create or join a code to begin.');
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [roundNumber, setRoundNumber] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
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
      // If game is complete, ensure result persists and set rounds to 30
      if (data.game.status === 'COMPLETE' && !result) {
        // Determine winner based on scores after 30 rounds
        let winner = null;
        if (data.game.hostPenniesScore > data.game.guestPenniesScore) {
          winner = 'host';
        } else if (data.game.guestPenniesScore > data.game.hostPenniesScore) {
          winner = 'guest';
        }
        setResult({
          isGameComplete: true,
          winner,
          hostScore: data.game.hostPenniesScore || 0,
          guestScore: data.game.guestPenniesScore || 0,
        });
        setRoundsPlayed(30); // Game complete means 30 rounds played
      }
    } catch (err) {
      console.error('Failed to refresh arena state', err);
    }
  }, [currentGame?.code, setCurrentGame, result]);

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
    // Don't clear result if game is complete - keep buttons visible
    if (currentGame?.status !== 'COMPLETE' && !result?.isGameComplete) {
      setResult(null);
    }
    setLockedChoice('');
    setOpponentLock('');
    // Reset rounds played when game changes
    if (!currentGame) {
      setRoundsPlayed(0);
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
  }, [currentGame, isHost, result?.isGameComplete]);

  // Timer for per-move time control - request timer from server
  useEffect(() => {
    if (!currentGame?.penniesTimePerMove || currentGame.penniesTimePerMove === 0) {
      setTimeRemaining(null);
      return;
    }

    // Start timer from first round (READY status) or when game is in progress
    if (!lockedChoice && !result && isJoined && (currentGame.status === 'IN_PROGRESS' || currentGame.status === 'READY')) {
      // Notify server that round has started (server will send timer updates)
      if (socket && currentGame?.code && !lockedChoice) {
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
      
      // Update rounds played from payload
      if (payload.roundsPlayed !== undefined) {
        setRoundsPlayed(payload.roundsPlayed);
      } else {
        // Increment if not provided
        setRoundsPlayed(prev => prev + 1);
      }
      
      if (payload.isGameComplete) {
        const winnerName = payload.winner === 'host' 
          ? (currentGame?.host?.studentName || currentGame?.host?.username)
          : (currentGame?.guest?.studentName || currentGame?.guest?.username);
        if (payload.winner) {
          setStatusMessage(`${winnerName} wins the Matching Pennies match! Final score after 30 rounds.`);
        } else {
          setStatusMessage('Match complete! It\'s a draw after 30 rounds.');
        }
        // Don't clear result when game is complete - keep it visible for both players
        // Don't refresh game details immediately to prevent clearing the result
        return; // Exit early to prevent refreshGameDetails() call
      } else {
        const winnerText = payload.hostWon
          ? `Both chose the same. ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} wins!`
          : `Different choices. ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} wins!`;
        setStatusMessage(
          `Round complete. Score: ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} ${payload.hostScore} - ${payload.guestScore} ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}`
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
              return 'Ready for next round. Both players choose!';
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
        // Auto-start timer if game just started and has time per move
        if (payload.gameType === 'MATCHING_PENNIES' && payload.game.penniesTimePerMove && payload.game.penniesTimePerMove > 0 && socket && payload.game.code) {
          // Auto-start the timer for the first round
          socket.emit('startRound', { code: payload.game.code, gameType: 'MATCHING_PENNIES' });
        }
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
        setRoundsPlayed(0);
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
    if (roundsPlayed >= 30) return; // Game already complete (30 rounds played)
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
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Game 3</p>
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
            <p className={`text-3xl font-bold ${roundsPlayed >= 30 && scores.host > scores.guest ? 'text-aurora' : 'text-white'}`}>
              {scores.host}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">Total 30 Rounds</p>
            <p className="text-lg font-semibold text-white/40">VS</p>
            <p className="text-xl font-bold text-white mt-1">Round {roundsPlayed}/30</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            </p>
            <p className={`text-3xl font-bold ${roundsPlayed >= 30 && scores.guest > scores.host ? 'text-aurora' : 'text-white'}`}>
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
        <p className={`mt-4 ${(typeof statusMessage === 'string' && statusMessage.includes('Round complete')) ? 'text-lg font-bold text-white' : 'text-white/60'}`}>
          {statusMessage || opponentStatus}
        </p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">You</p>
            <p className={`text-6xl ${lockedChoice ? '' : 'animate-pulse'}`}>
              {lockedChoice === 'heads' ? '👑' : lockedChoice === 'tails' ? '🦅' : '⏳'}
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
            <p className={`text-6xl mt-2 ${opponentLock ? '' : 'animate-pulse'}`}>
              {opponentLock ? '⏳' : '⏳'}
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
          const isDisabled = !isJoined || lockedChoice !== '' || roundsPlayed >= 30;
          return (
            <button
              key={choice.value}
              onClick={() => submitChoice(choice.value)}
              disabled={isDisabled}
              className={`rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:-translate-y-1 h-full flex flex-col items-center justify-center ${
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

      {((result && (result.isGameComplete || currentGame?.status === 'COMPLETE')) || currentGame?.status === 'COMPLETE') && (
        <div className={`rounded-3xl border p-6 text-center ${
          (result?.isGameComplete || currentGame?.status === 'COMPLETE')
            ? 'border-aurora/60 bg-aurora/20' 
            : 'border-aurora/40 bg-aurora/10'
        }`}>
          <p className={`uppercase tracking-[0.4em] ${(result?.isGameComplete || currentGame?.status === 'COMPLETE') ? 'text-lg font-bold text-white' : 'text-xs text-white/60'}`}>
            {(result?.isGameComplete || currentGame?.status === 'COMPLETE') ? 'Match Complete' : 'Round Recap'}
          </p>
          {(result?.isGameComplete || currentGame?.status === 'COMPLETE') ? (
            <>
              <p className="text-4xl font-display text-aurora mt-2">
                {result?.winner === 'host' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} Wins!` 
                  : result?.winner === 'guest'
                    ? `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} Wins!`
                    : 'Match Complete - Draw!'}
              </p>
              <p className="text-white/70 mt-2">
                Final Score: {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} {result?.hostScore || currentGame?.hostPenniesScore || 0} - {result?.guestScore || currentGame?.guestPenniesScore || 0} {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
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
                    setRoundsPlayed(0);
                    setLockedChoice('');
                    setOpponentLock('');
                    setRoundNumber(0);
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

