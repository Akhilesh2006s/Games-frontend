import { useCallback, useEffect, useMemo, useState } from 'react';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

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
  const { currentGame, statusMessage, setStatusMessage, setCurrentGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [result, setResult] = useState(null);
  const [lockedMove, setLockedMove] = useState('');
  const [opponentLock, setOpponentLock] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('Create or join a code to begin.');
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [scores, setScores] = useState({ host: 0, guest: 0 });

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
      return handMap[resolvedMove] || '🎯';
    }
    if (lockedMove) return handMap[lockedMove];
    return '🎯';
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
      } else {
        setStatusMessage(
          payload.result === 'draw'
            ? 'Draw registered. Replay to continue.'
            : `Round complete. Score: ${currentGame?.host?.studentName || currentGame?.host?.username || 'Host'} ${payload.hostScore} - ${payload.guestScore} ${currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}`
        );
        // Clear result after 3 seconds to allow next round
        setTimeout(() => {
          setResult(null);
          setStatusMessage('Ready for next round. Pick a hand!');
        }, 3000);
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

    return () => {
      socket.off('roundResult', handleResult);
      socket.off('opponentLocked', handleOpponentLock);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started');
      socket.off('game:error', handleError);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, socket]);

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
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:justify-between">
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">You</p>
            <p className={`text-6xl ${lockedMove ? '' : 'animate-pulse'}`}>{yourHandDisplay}</p>
            <p className="text-white/60">
              {lockedMove ? `Locked ${lockedMove.toUpperCase()}` : 'Pick a hand to lock in'}
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {isHost ? (currentGame.guest?.studentName || currentGame.guest?.username || 'Challenger') : (currentGame.host?.studentName || currentGame.host?.username || 'Host')}
            </p>
            <p className={`text-6xl ${opponentLock ? '' : 'animate-pulse'}`}>{opponentHandDisplay}</p>
            <p className="text-white/60">
              {opponentLock || (currentGame?.guest ? 'Waiting for lock' : 'Opponent pending')}
            </p>
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
            </>
          ) : (
            <>
              <p className="text-3xl font-display">
                {result.result === 'draw' ? 'Draw' : `${result.result.toUpperCase()} wins this round`}
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

      <div className="rounded-3xl border border-white/5 bg-white/5 p-4 text-sm text-white/60">
        Game of Go and Matching Pennies unlock sequentially for every completed Rock Paper Scissors duel. They are
        showcased here with cinematic placeholders until your code completes Stage 01.
      </div>
    </section>
  );
};

export default RockPaperScissors;

