import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboardType, setLeaderboardType] = useState('all'); // 'all', 'group', 'classroom', 'team'
  const [selectedFilter, setSelectedFilter] = useState('');
  const [filters, setFilters] = useState({ groups: [], classrooms: [], teams: [] });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const params = leaderboardType !== 'all' && selectedFilter 
          ? { type: leaderboardType, filter: selectedFilter }
          : leaderboardType !== 'all' 
          ? { type: leaderboardType }
          : {};
        
        const { data } = await api.get('/games/leaderboard', { params });
        setLeaderboard(data.leaderboard || []);
        setFilters(data.filters || { groups: [], classrooms: [], teams: [] });
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [leaderboardType, selectedFilter]);

  const getLeaderboardTitle = () => {
    switch (leaderboardType) {
      case 'group':
        return selectedFilter ? `Group ${selectedFilter} Leaderboard` : 'Group Leaderboard';
      case 'classroom':
        return selectedFilter ? `Classroom ${selectedFilter} Leaderboard` : 'Classroom Leaderboard';
      case 'team':
        return selectedFilter ? `${selectedFilter} Leaderboard` : 'Team Leaderboard';
      default:
        return 'Global Leaderboard';
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-night px-4 py-8 md:px-10">
        <div className="glass-panel p-6 text-center text-white/70">
          Loading leaderboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Leaderboard</p>
          <h1 className="text-3xl font-display font-semibold">{getLeaderboardTitle()}</h1>
        </div>
        <button onClick={() => navigate('/arena')} className="btn-ghost">
          Back to Arena
        </button>
      </header>

      {/* Leaderboard Type Tabs */}
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['all', 'group', 'classroom', 'team'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setLeaderboardType(type);
              setSelectedFilter('');
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide transition ${
              leaderboardType === type
                ? 'bg-royal text-white shadow-neon font-semibold'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {type === 'all' ? 'Everyone' : type === 'group' ? 'Group' : type === 'classroom' ? 'Classroom' : 'Team'}
          </button>
        ))}
      </div>

      {/* Filter Dropdown */}
      {leaderboardType !== 'all' && (
        <div className="mb-6">
          <label className="block text-sm font-semibold uppercase tracking-wide text-white/70 mb-2">
            Select {leaderboardType === 'group' ? 'Group' : leaderboardType === 'classroom' ? 'Classroom' : 'Team'}
          </label>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none"
          >
            <option value="">All {leaderboardType === 'group' ? 'Groups' : leaderboardType === 'classroom' ? 'Classrooms' : 'Teams'}</option>
            {(leaderboardType === 'group' ? filters.groups : leaderboardType === 'classroom' ? filters.classrooms : filters.teams).length > 0 ? (
              (leaderboardType === 'group' ? filters.groups : leaderboardType === 'classroom' ? filters.classrooms : filters.teams).map((filter) => (
                <option key={filter} value={filter}>
                  {leaderboardType === 'group' ? `Group ${filter}` : filter}
                </option>
              ))
            ) : (
              <option value="" disabled>No {leaderboardType === 'group' ? 'groups' : leaderboardType === 'classroom' ? 'classrooms' : 'teams'} available</option>
            )}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-red-400">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-white/70">
            <p className="text-lg">No players found</p>
            <p className="text-sm mt-2 text-white/50">
              {leaderboardType !== 'all' && !selectedFilter
                ? `Select a ${leaderboardType} to view leaderboard`
                : 'No players have played games yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Player</th>
                  {leaderboardType === 'all' && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Group</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Classroom</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Team</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Wins</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Games</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Points</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">RPS</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Go</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Pennies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((player) => {
                  const medal = getMedalEmoji(player.rank);
                  return (
                    <tr
                      key={player.email}
                      className={`transition hover:bg-white/5 ${
                        player.rank <= 3 ? 'bg-gradient-to-r from-aurora/10 via-transparent to-transparent' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {medal ? (
                            <span className="text-2xl">{medal}</span>
                          ) : (
                            <span className="text-lg font-bold text-white/60">#{player.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-white">{player.fullName || player.studentName || player.username}</p>
                          <p className="text-sm text-white/50">{player.email}</p>
                        </div>
                      </td>
                      {leaderboardType === 'all' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{player.groupId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{player.classroomNumber || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{player.teamNumber || '-'}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-aurora">{player.stats.wins}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-white/70">{player.stats.totalGames}</td>
                      <td className="px-6 py-4 text-center text-white/70">{player.stats.totalPoints}</td>
                      <td className="px-6 py-4 text-center text-white/70">{player.stats.rpsWins}</td>
                      <td className="px-6 py-4 text-center text-white/70">{player.stats.goWins}</td>
                      <td className="px-6 py-4 text-center text-white/70">{player.stats.penniesWins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {leaderboard.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Players</p>
            <p className="text-2xl font-bold text-aurora mt-2">{leaderboard.length}</p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Games</p>
            <p className="text-2xl font-bold text-purple-400 mt-2">
              {leaderboard.reduce((sum, p) => sum + p.stats.totalGames, 0)}
            </p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Wins</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">
              {leaderboard.reduce((sum, p) => sum + p.stats.wins, 0)}
            </p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Top Player</p>
            <p className="text-lg font-semibold text-white mt-2">
              {leaderboard[0]?.fullName || leaderboard[0]?.studentName || leaderboard[0]?.username || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default LeaderboardPage;

