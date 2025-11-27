import { useCallback, useEffect, useMemo, useState } from 'react';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

const choices = [
  { label: 'Heads', value: 'heads', emoji: '🪙', icon: '👑' },
  { label: 'Tails', value: 'tails', emoji: '🪙', icon: '🦅' },
];

const MatchingPennies = () => {
  const { currentGame, statusMessage, setStatusMessage, setCurrentGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [result, setResult] = useState(null);
  const [lockedChoice, setLockedChoice] = useState('');
  const [opponentLock, setOpponentLock] = useState('');
  const [opponentStatus, setOpponentStatus] = useState('Create or join a code to begin.');
  const [scores, setScores] = useState({ host: 0, guest: 0 });
  const [roundNumber, setRoundNumber] = useState(0);
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
        // Clear result after 3 seconds to allow next round
        setTimeout(() => {
          setResult(null);
          setStatusMessage('Ready for next round. Both players choose!');
        }, 3000);
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

    return () => {
      socket.off('penniesResult', handleResult);
      socket.off('penniesOpponentLocked', handleOpponentLock);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started');
      socket.off('game:error', handleError);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, socket, isHost, currentGame]);

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
            <h3 className="text-2xl font-semibold">Matching Pennies • Finale</h3>
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
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
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
          <p className="text-xs text-white/60 mt-1">{roleDescription}</p>
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
          </div>
          <div className="flex-1 rounded-2xl border border-white/5 bg-night/20 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {isHost ? (currentGame.guest?.studentName || currentGame.guest?.username || 'Challenger') : (currentGame.host?.studentName || currentGame.host?.username || 'Host')}
            </p>
            <p className={`text-6xl ${opponentLock ? '' : 'animate-pulse'}`}>
              {opponentLock ? '🪙' : '⌛'}
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
    </section>
  );
};

export default MatchingPennies;

