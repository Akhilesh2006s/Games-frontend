import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import GameSelector from './GameSelector';

const GameLobby = () => {
  const { currentGame, setCurrentGame, matches, setMatches, statusMessage, setStatusMessage } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState({ create: false, join: false });

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

  const handleCreate = async () => {
    setLoading((prev) => ({ ...prev, create: true }));
    try {
      const { data } = await api.post('/games/create');
      setCurrentGame(data.game);
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
      setCurrentGame(data.game);
      setStatusMessage('Both players connected! Choose a game to play.');
      setJoinCode('');
      await refreshMatches();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, join: false }));
    }
  };


  return (
    <section className="space-y-6 text-white">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/60">Live Arena</p>
            <h2 className="text-2xl font-semibold">Welcome back, {user?.username}</h2>
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
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-royal/30 to-pulse/20 p-6 text-center">
              <p className="text-sm uppercase tracking-[0.5em] text-white/60">Arena Code</p>
              <p className="text-5xl font-display font-semibold tracking-[0.3em]">{currentGame.code}</p>
              <p className="mt-3 text-white/70">{statusMessage || 'Waiting for opponent...'}</p>
            </div>
            {currentGame.guest && (
              <GameSelector currentGame={currentGame} />
            )}
          </div>
        )}
      </div>

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
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-white/40">{match.status}</p>
                <p className="text-lg font-semibold">
                  {match.host?.username || 'Host'} vs {match.guest?.username || '???'}
                </p>
              </div>
              <p className="text-3xl font-display tracking-[0.3em] text-white/70">{match.code}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GameLobby;

