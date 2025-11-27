import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const UserStats = () => {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/games/stats');
        setStats(data.stats);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        Loading statistics...
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        No statistics available.
      </div>
    );
  }

  const winRate = stats.totalGames > 0 
    ? ((stats.wins / stats.totalGames) * 100).toFixed(1) 
    : '0.0';

  return (
    <section className="glass-panel space-y-6 p-6 text-white">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Player Statistics</p>
        <h3 className="text-2xl font-semibold">{user?.studentName || user?.username || 'Player'}</h3>
      </header>

      {/* Overall Stats */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h4 className="text-lg font-bold mb-4 text-center">Overall Performance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Total Games</p>
            <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Win Rate</p>
            <p className="text-3xl font-bold text-aurora">{winRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Wins</p>
            <p className="text-3xl font-bold text-green-400">{stats.wins}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Losses</p>
            <p className="text-3xl font-bold text-red-400">{stats.losses}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Draws</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.draws}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Total Points</p>
            <p className="text-3xl font-bold text-aurora">{stats.totalPoints}</p>
          </div>
        </div>
      </div>

      {/* Game-Specific Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Game of Go Stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h5 className="text-sm font-bold mb-3 text-center text-aurora">Game of Go</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Wins:</span>
              <span className="font-bold text-green-400">{stats.goWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Losses:</span>
              <span className="font-bold text-red-400">{stats.goLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Points:</span>
              <span className="font-bold text-aurora">{stats.goPoints}</span>
            </div>
            {stats.goWins + stats.goLosses > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Win Rate:</span>
                  <span className="font-bold">
                    {((stats.goWins / (stats.goWins + stats.goLosses)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rock Paper Scissors Stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h5 className="text-sm font-bold mb-3 text-center text-purple-400">Rock Paper Scissors</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Wins:</span>
              <span className="font-bold text-green-400">{stats.rpsWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Losses:</span>
              <span className="font-bold text-red-400">{stats.rpsLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Points:</span>
              <span className="font-bold text-purple-400">{stats.rpsPoints}</span>
            </div>
            {stats.rpsWins + stats.rpsLosses > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Win Rate:</span>
                  <span className="font-bold">
                    {((stats.rpsWins / (stats.rpsWins + stats.rpsLosses)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Matching Pennies Stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h5 className="text-sm font-bold mb-3 text-center text-yellow-400">Matching Pennies</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Wins:</span>
              <span className="font-bold text-green-400">{stats.penniesWins}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Losses:</span>
              <span className="font-bold text-red-400">{stats.penniesLosses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Points:</span>
              <span className="font-bold text-yellow-400">{stats.penniesPoints}</span>
            </div>
            {stats.penniesWins + stats.penniesLosses > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Win Rate:</span>
                  <span className="font-bold">
                    {((stats.penniesWins / (stats.penniesWins + stats.penniesLosses)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserStats;


