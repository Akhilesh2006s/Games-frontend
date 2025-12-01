import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import useSocket from '../hooks/useSocket';
import GameSelector from './GameSelector';

const GameLobby = ({ showHistoryOnly = false, showArenaOnly = false }) => {
  const { currentGame, setCurrentGame, matches, setMatches, statusMessage, setStatusMessage } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState({ create: false, join: false });
  
  // Socket connection for real-time updates
  const { socket } = useSocket({
    enabled: Boolean(currentGame?.code),
    roomCode: currentGame?.code,
  });

  const refreshMatches = useCallback(async () => {
    try {
      const { data } = await api.get('/games');
      setMatches(data.games);
    } catch (err) {
      console.error(err);
    }
  }, [setMatches]);

  useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  // Listen for guest joined event to update game state
  useEffect(() => {
    if (!socket || !currentGame) return;

    const handleGuestJoined = async (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        setStatusMessage(`${payload.guestName} joined! Both players connected.`);
        await refreshMatches();
      }
    };

    const handleGameStarted = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        const gameTypeNames = {
          'ROCK_PAPER_SCISSORS': 'Rock Paper Scissors',
          'GAME_OF_GO': 'Game of Go',
          'MATCHING_PENNIES': 'Matching Pennies',
        };
        const gameName = gameTypeNames[payload.gameType] || payload.gameType;
        setStatusMessage(`${gameName} started! Game is ready to play.`);
      }
    };

    socket.on('game:guest_joined', handleGuestJoined);
    socket.on('game:started', handleGameStarted);

    return () => {
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started', handleGameStarted);
    };
  }, [socket, currentGame, setCurrentGame, setStatusMessage, refreshMatches]);

  const handleCreate = async () => {
    setLoading((prev) => ({ ...prev, create: true }));
    try {
      const { data } = await api.post('/games/create');
      // Ensure host is populated
      if (data.game && !data.game.host) {
        // If host is missing, fetch the game again
        const { data: gameData } = await api.get(`/games/code/${data.game.code}`);
        setCurrentGame(gameData.game);
      } else {
        setCurrentGame(data.game);
      }
      setStatusMessage('Share the code with your challenger to unlock the Go grid.');
      setJoinCode('');
      await refreshMatches();
    } catch (err) {
      console.error(err.response?.data || err.message);
    } finally {
      setLoading((prev) => ({ ...prev, create: false }));
    }
  };

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!joinCode) return;
    setLoading((prev) => ({ ...prev, join: true }));
    try {
      const { data } = await api.post('/games/join', { code: joinCode.trim().toUpperCase() });
      // Ensure both host and guest are populated
      if (data.game && (!data.game.host || !data.game.guest)) {
        // If host or guest is missing, fetch the game again
        const { data: gameData } = await api.get(`/games/code/${data.game.code}`);
        setCurrentGame(gameData.game);
      } else {
        setCurrentGame(data.game);
      }
      setStatusMessage('Both players connected! Choose a game to play.');
      setJoinCode('');
      await refreshMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, join: false }));
    }
  };


  const getTimeBasedGreeting = () => {
    // Get current time in IST (UTC+5:30)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Convert to IST: UTC + 5 hours 30 minutes
    const istTotalMinutes = (utcHours * 60 + utcMinutes) + (5 * 60 + 30);
    const istHours = Math.floor(istTotalMinutes / 60) % 24;
    
    if (istHours >= 5 && istHours < 12) {
      return 'Good morning';
    } else if (istHours >= 12 && istHours < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  return (
    <section className="space-y-6 text-white">
      {!showHistoryOnly && (
        <div className="glass-panel p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Live Arena</p>
              <h2 className="text-2xl font-semibold">{getTimeBasedGreeting()}, {user?.studentName || user?.username}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={handleCreate} disabled={loading.create}>
                {loading.create ? 'Generating...' : 'Create Code'}
              </button>
              <form className="flex items-center gap-2" onSubmit={handleJoin}>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="Enter Code"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 uppercase tracking-widest text-white outline-none focus:border-aurora"
                />
                <button className="btn-ghost" type="submit" disabled={loading.join}>
                  {loading.join ? 'Linking...' : 'Join'}
                </button>
              </form>
            </div>
          </div>
          {currentGame && (
            <div className="mt-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-royal/30 to-pulse/20 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.5em] text-white/60">Arena Code</p>
                <p className="text-5xl font-display font-semibold tracking-[0.3em]">{currentGame.code}</p>
                <p className="mt-3 text-white/70">{statusMessage || 'Waiting for opponent...'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {!showArenaOnly && (
        <div className="glass-panel p-6">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Match Archive</p>
              <h3 className="text-xl font-semibold">Recent runs</h3>
            </div>
            <button className="btn-ghost" onClick={refreshMatches}>
              Refresh
            </button>
          </header>
          <div className="mt-4 space-y-3">
            {matches.length === 0 && <p className="text-white/50">No matches yet. Create one to seed the archive.</p>}
            {matches.map((match) => (
              <div key={match._id} className="flex flex-wrap items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm uppercase tracking-[0.4em] text-white/40">{match.status}</p>
                  <p className="text-lg font-semibold">
                    {match.host?.studentName || match.host?.username || 'Host'} vs {match.guest?.studentName || match.guest?.username || '???'}
                  </p>
                  <p className="text-3xl font-display tracking-[0.3em] text-white/70 mt-1">{match.code}</p>
                </div>
                {match.status === 'COMPLETE' && (
                  <button
                    onClick={() => navigate(`/analysis/${match.code}`)}
                    className="ml-4 rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition"
                  >
                    View Analysis
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default GameLobby;

