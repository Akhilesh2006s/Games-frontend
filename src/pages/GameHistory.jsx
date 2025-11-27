import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const GameHistory = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'complete', 'in_progress'

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        // Pass filter to backend for server-side filtering
        const params = filter !== 'all' ? { status: filter } : {};
        const { data } = await api.get('/games', { params });
        const games = data.games || [];
        // Games are already sorted by backend (-updatedAt)
        setGames(games);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load game history');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [filter]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const getGameTypeName = (type) => {
    const names = {
      ROCK_PAPER_SCISSORS: 'Rock Paper Scissors',
      GAME_OF_GO: 'Game of Go',
      MATCHING_PENNIES: 'Matching Pennies',
    };
    return names[type] || type || 'Not Started';
  };

  const getStatusColor = (status) => {
    const colors = {
      COMPLETE: 'text-green-400',
      IN_PROGRESS: 'text-yellow-400',
      READY: 'text-blue-400',
      WAITING: 'text-white/60',
    };
    return colors[status] || 'text-white/60';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-night px-4 py-8 md:px-10">
        <div className="glass-panel p-6 text-center text-white/70">
          Loading game history...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Game History</p>
          <h1 className="text-3xl font-display font-semibold">Match Archive</h1>
        </div>
        <button onClick={() => navigate('/arena')} className="btn-ghost">
          Back to Arena
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['all', 'complete', 'in_progress'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide transition ${
              filter === f
                ? 'bg-royal text-white shadow-neon font-semibold'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'All Games' : f === 'complete' ? 'Completed' : 'In Progress'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-red-400">
          {error}
        </div>
      )}

      {/* Games List */}
      <div className="space-y-4">
        {games.length === 0 ? (
          <div className="glass-panel p-8 text-center text-white/70">
            <p className="text-lg">No games found</p>
            <p className="text-sm mt-2 text-white/50">
              {filter === 'complete' 
                ? 'Complete a game to see it in your history'
                : 'Create or join a game to get started'}
            </p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game._id}
              className="glass-panel rounded-2xl border border-white/10 p-6 text-white hover:border-aurora/50 transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs uppercase tracking-[0.4em] font-semibold ${getStatusColor(game.status)}`}>
                      {game.status}
                    </span>
                    {game.activeStage && (
                      <span className="text-xs uppercase tracking-[0.4em] text-white/50">
                        {getGameTypeName(game.activeStage)}
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-2xl font-display tracking-[0.3em] text-aurora mb-2">
                      {game.code}
                    </p>
                    <p className="text-lg font-semibold">
                      {game.host?.studentName || game.host?.username || 'Host'} 
                      <span className="mx-2 text-white/40">vs</span>
                      {game.guest?.studentName || game.guest?.username || 'Guest'}
                    </p>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {game.hostScore > 0 || game.guestScore > 0 ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-white/50 mb-1">RPS</p>
                        <p className="text-lg font-bold">
                          {game.hostScore} - {game.guestScore}
                        </p>
                      </div>
                    ) : null}
                    {(game.activeStage === 'GAME_OF_GO' || game.goFinalScore || game.goBoardSize) ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Go</p>
                        {game.goFinalScore ? (
                          <p className="text-lg font-bold">
                            {game.goFinalScore.winner === 'black' ? '⚫' : '⚪'} Win
                          </p>
                        ) : game.goBoardSize ? (
                          <p className="text-sm font-semibold">
                            {game.goBoardSize}×{game.goBoardSize} Board
                          </p>
                        ) : (
                          <p className="text-sm text-white/70">In Progress</p>
                        )}
                        {game.goCapturedBlack > 0 || game.goCapturedWhite > 0 ? (
                          <p className="text-xs text-white/50 mt-1">
                            ⚫ {game.goCapturedBlack || 0} | ⚪ {game.goCapturedWhite || 0}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {game.hostPenniesScore > 0 || game.guestPenniesScore > 0 ? (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Pennies</p>
                        <p className="text-lg font-bold">
                          {game.hostPenniesScore} - {game.guestPenniesScore}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span>Started: {formatDate(game.createdAt)}</span>
                    {game.completedAt && (
                      <span>Completed: {formatDate(game.completedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {game.status === 'COMPLETE' && (
                    <button
                      onClick={() => navigate(`/analysis/${game.code}`)}
                      className="rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition font-semibold"
                    >
                      View Analysis
                    </button>
                  )}
                  {game.status !== 'COMPLETE' && game.guest && (
                    <button
                      onClick={() => {
                        // Set as current game and navigate to arena
                        navigate('/arena');
                      }}
                      className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
                    >
                      Continue Game
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};

export default GameHistory;

