import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import RematchModal from './RematchModal';
import PlayerDisconnectedModal from './PlayerDisconnectedModal';

const choices = [
  { label: 'Heads', value: 'heads', emoji: '🪙', icon: '👑' },
  { label: 'Tails', value: 'tails', emoji: '🪙', icon: '🦅' },
];

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
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
  const timerIntervalRef = useRef(null);
  const [rematchModal, setRematchModal] = useState({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
  const [disconnectModal, setDisconnectModal] = useState({ isOpen: false, playerName: '' });
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

  // Update rounds played from game state
  useEffect(() => {
    if (currentGame?.penniesRoundNumber !== undefined) {
      const round = currentGame.penniesRoundNumber || 0;
      setRoundNumber(round);
      setRoundsPlayed(round);
    }
  }, [currentGame?.penniesRoundNumber]);

  const yourChoiceDisplay = useMemo(() => {
    if (result) {
      const resolvedChoice = isHost ? result.hostChoice : result.guestChoice;
      return resolvedChoice === 'heads' ? '👑' : resolvedChoice === 'tails' ? '🦅' : '⏳';
    }
    if (lockedChoice) {
      return lockedChoice === 'heads' ? '👑' : '🦅';
    }
    return '⏳';
  }, [isHost, lockedChoice, result]);

  const opponentChoiceDisplay = useMemo(() => {
    if (result) {
      const rivalChoice = isHost ? result.guestChoice : result.hostChoice;
      return rivalChoice === 'heads' ? '👑' : rivalChoice === 'tails' ? '🦅' : '⏳';
    }
    if (opponentLock) return '🔒';
    if (!currentGame?.guest) return '⏳';
    return '⏳';
  }, [currentGame?.guest, isHost, opponentLock, result]);

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

  // Simplified timer logic
  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Only start timer if game is in progress, no choice is locked, no result, and we have time per move
    if (currentGame?.status === 'IN_PROGRESS' && 
        !lockedChoice && 
        !result && 
        currentGame?.penniesTimePerMove && 
        currentGame.penniesTimePerMove > 0 &&
        !result?.isGameComplete) {
      
      // Start timer from the configured time or default 20 seconds
      const startTime = currentGame.penniesTimePerMove || 20;
      setTimeRemaining(startTime);
      
      // Start countdown
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
            
            // Auto-submit if time runs out
            if (!lockedChoice && socket && currentGame?.code) {
              const autoChoice = Math.random() > 0.5 ? 'heads' : 'tails';
              setLockedChoice(autoChoice);
              setStatusMessage('Time\'s up! Auto-submitting choice...');
              socket.emit('submitPenniesMove', { code: currentGame.code, choice: autoChoice });
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Reset timer if conditions aren't met
      setTimeRemaining(null);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [currentGame?.status, currentGame?.penniesTimePerMove, lockedChoice, result, socket, currentGame?.code, setStatusMessage]);

  // Listen for server timer updates to sync initial time
  useEffect(() => {
    if (!socket) return;

    const handleTimerUpdate = (payload) => {
      if (payload.timeRemaining !== undefined) {
        // Only sync if we don't have a timer running locally
        if (!timerIntervalRef.current && !lockedChoice) {
          setTimeRemaining(payload.timeRemaining);
        }
      }
    };

    socket.on('penniesTimerUpdate', handleTimerUpdate);

    return () => {
      socket.off('penniesTimerUpdate', handleTimerUpdate);
    };
  }, [socket, lockedChoice]);

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
      // Reset timer when result is received
      setTimeRemaining(null);
      
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
        return;
      } else {
        // Determine if current user won
        let winMessage = '';
        if (payload.hostWon) {
          // Host wins when both choose the same
          winMessage = isHost ? 'You won!' : 'You lose!';
        } else {
          // Guest wins when choices are different
          winMessage = isHost ? 'You lose!' : 'You won!';
        }
        setStatusMessage(winMessage);
        
        // Clear result after 3 seconds to allow players to see the result
        const resultTimeout = setTimeout(() => {
          setResult((prevResult) => {
            if (prevResult && prevResult.roundNumber === payload.roundNumber && !prevResult.isGameComplete) {
              return null;
            }
            return prevResult;
          });
          setStatusMessage((prevMsg) => {
            if (prevMsg.includes('Round complete') || prevMsg.includes('Draw registered')) {
              return 'Ready for next round. Both players choose!';
            }
            return prevMsg;
          });
        }, 3000);
        
        return () => clearTimeout(resultTimeout);
      }
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
        // Reset timer for new game
        setTimeRemaining(null);
      }
    });
    socket.on('game:error', handleError);
    
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
        setTimeRemaining(null); // Clear timer state on rematch
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

    const handlePlayerDisconnected = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
      }
      const disconnectedPlayerName = payload.disconnectedPlayerName || 'Opponent';
      setStatusMessage(`${disconnectedPlayerName} has left the game and cannot return. You win by forfeit!`);
      // Show disconnect modal
      setDisconnectModal({ isOpen: true, playerName: disconnectedPlayerName });
      // Set result to show game complete
      setResult({
        isGameComplete: true,
        winner: payload.remainingPlayer,
        hostScore: payload.game?.hostPenniesScore || 0,
        guestScore: payload.game?.guestPenniesScore || 0,
      });
      setScores({
        host: payload.game?.hostPenniesScore || 0,
        guest: payload.game?.guestPenniesScore || 0,
      });
      setRoundsPlayed(30);
    };

    socket.on('rematch:requested', handleRematchRequest);
    socket.on('rematch:accepted', handleRematchAccepted);
    socket.on('rematch:rejected', handleRematchRejected);
    socket.on('game:player_disconnected', handlePlayerDisconnected);
    socket.on('game:ended', handlePlayerDisconnected);

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
      socket.off('game:player_disconnected', handlePlayerDisconnected);
      socket.off('game:ended', handlePlayerDisconnected);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, setCurrentGame, socket, isHost, currentGame, selectedGameType, setSelectedGameType]);

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
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimeRemaining(null);
    
    setLockedChoice(choice);
    setStatusMessage('Choice locked. Waiting for your opponent...');
    socket.emit('submitPenniesMove', { code: currentGame.code, choice });
  };

  const handleExitGame = async () => {
    if (!currentGame?.code) {
      resetGame();
      setSelectedGameType(null);
      navigate('/arena', { replace: true });
      return;
    }

    if (currentGame.status === 'COMPLETE') {
      resetGame();
      setSelectedGameType(null);
      navigate('/arena', { replace: true });
      return;
    }

    const confirmExit = window.confirm('Are you sure you want to exit the game? The game will be completed and your opponent will win.');
    if (!confirmExit) return;

    try {
      // End the game via API
      await api.post('/games/end-game', { code: currentGame.code });
      // Reset game state
      resetGame();
      setSelectedGameType(null);
      setResult(null);
      setScores({ host: 0, guest: 0 });
      setRoundsPlayed(0);
      setLockedChoice('');
      setOpponentLock('');
      setRoundNumber(0);
      setTimeRemaining(null);
      // Navigate to arena page
      navigate('/arena', { replace: true });
    } catch (err) {
      console.error('Failed to exit game:', err);
      setStatusMessage(err.response?.data?.message || 'Failed to exit game');
    }
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
          <div className="flex items-center gap-4">
            {/* Exit Game Button - Left of Game 3 */}
            <button
              onClick={handleExitGame}
              className="rounded-lg border-2 border-red-500 bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 transition shadow-lg"
            >
              ✕ Exit
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Game 3</p>
              <h3 className="text-2xl font-semibold">Matching Pennies</h3>
            </div>
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
          <p className="text-base font-semibold text-white/90">
            🎯 Both Players Choose
          </p>
          <p className="text-base font-semibold text-white/90 mt-2">{roleDescription}</p>
        </div>
        <p className={`mt-4 ${(typeof statusMessage === 'string' && statusMessage.includes('Round complete')) ? 'text-lg font-bold text-white' : 'text-white/60'}`}>
          {statusMessage || opponentStatus}
        </p>
      </header>

      {/* Timer Display - Centered */}
      {timeRemaining !== null && !lockedChoice && !result && currentGame?.status === 'IN_PROGRESS' && (
        <div className="mt-4 text-center">
          <div className={`text-5xl font-bold font-mono mb-2 transition-colors duration-300 ${
            timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 
            timeRemaining <= 10 ? 'text-yellow-400' : 'text-blue-400'
          }`}>
            {formatDuration(timeRemaining)}
          </div>
          <p className="text-sm text-white/70">
            Time remaining for this move
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">You</p>
            <p className={`text-6xl ${lockedChoice ? '' : 'animate-pulse'}`}>
              {yourChoiceDisplay}
            </p>
            <p className="text-white/60">
              {lockedChoice ? `Locked ${lockedChoice.toUpperCase()}` : 'Choose heads or tails'}
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">
              {isHost ? (currentGame.guest?.studentName || currentGame.guest?.username || 'Challenger') : (currentGame.host?.studentName || currentGame.host?.username || 'Host')}
            </p>
            <p className={`text-6xl  ${opponentLock || result ? '' : 'animate-pulse'}`}>
              {opponentChoiceDisplay}
            </p>
            <p className="text-white/60">
              {opponentLock || (currentGame?.guest ? 'Waiting for lock' : 'Opponent pending')}
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-white/50">{opponentStatus}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {choices.map((choice) => {
          const isDisabled = !isJoined || lockedChoice !== '' || roundsPlayed >= 30 || currentGame.status === 'COMPLETE';
          return (
            <button
              key={choice.value}
              onClick={() => submitChoice(choice.value)}
              disabled={isDisabled}
              className={`rounded-3xl border border-white/10 bg-white/5 px-6 py-8 text-center transition hover:-translate-y-1 w-full flex flex-col items-center justify-center ${
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
                    setTimeRemaining(null);
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
            <div className="mt-4 rounded-3xl border-2 border-blue-500/70 bg-gradient-to-br from-blue-600/30 via-blue-500/25 to-blue-600/30 p-8 backdrop-blur-md shadow-lg shadow-blue-500/20">
              {/* Winner Badge */}
              <div className="mb-6 text-center">
                {result.winner === 'host' ? (
                  <p className="text-3xl font-bold text-green-300 drop-shadow-lg">
                    🏆 {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} Wins!
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-green-300 drop-shadow-lg">
                    🏆 {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'} Wins!
                  </p>
                )}
                <p className="text-base font-semibold text-white/90 mt-2">
                  {result.hostWon 
                    ? '✅ Same choice!'
                    : '❌ Different choices!'}
                </p>
              </div>

              {/* Player Selections */}
              <div className="flex items-center justify-center gap-8">
                {/* Host Player */}
                <div className="flex flex-col items-center">
                  <p className="text-base font-bold text-white mb-3">
                    {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
                  </p>
                  <div className={`rounded-2xl border-3 p-5 shadow-lg ${
                    result.winner === 'host' 
                      ? 'border-green-400 bg-green-400/30 shadow-green-400/30' 
                      : 'border-blue-400/40 bg-blue-500/20 shadow-blue-400/20'
                  }`}>
                    <p className="text-7xl">
                      {result.hostChoice === 'heads' ? '👑' : '🦅'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white/80 mt-3 capitalize">{result.hostChoice}</p>
                </div>

                {/* VS Divider */}
                <div className="flex flex-col items-center">
                  <p className="text-4xl font-bold text-blue-200 drop-shadow-md">VS</p>
                </div>

                {/* Guest Player */}
                <div className="flex flex-col items-center">
                  <p className="text-base font-bold text-white mb-3">
                    {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
                  </p>
                  <div className={`rounded-2xl border-3 p-5 shadow-lg ${
                    result.winner === 'guest' 
                      ? 'border-green-400 bg-green-400/30 shadow-green-400/30' 
                      : 'border-blue-400/40 bg-blue-500/20 shadow-blue-400/20'
                  }`}>
                    <p className="text-7xl">
                      {result.guestChoice === 'heads' ? '👑' : '🦅'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white/80 mt-3 capitalize">{result.guestChoice}</p>
                </div>
              </div>

              {/* Win/Lose Message */}
              <div className="mt-6 pt-6 border-t-2 border-blue-400/30 text-center">
                <p className="text-base font-semibold text-white">
                  {result.hostWon 
                    ? (isHost ? <span className="text-green-300 font-bold text-xl">You won!</span> : <span className="text-red-300 font-bold text-xl">You lose!</span>)
                    : (isHost ? <span className="text-red-300 font-bold text-xl">You lose!</span> : <span className="text-green-300 font-bold text-xl">You won!</span>)
                  }
                </p>
              </div>
            </div>
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
      <PlayerDisconnectedModal
        isOpen={disconnectModal.isOpen}
        playerName={disconnectModal.playerName}
        onClose={() => {
          setDisconnectModal({ isOpen: false, playerName: '' });
        }}
      />
    </section>
  );
};

export default MatchingPennies;