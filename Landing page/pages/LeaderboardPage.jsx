import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ groups: [], classrooms: [], teams: [] });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        // Fetch all data - we'll filter on client side for multiple filters
        const { data } = await api.get('/games/leaderboard', {});
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
  }, []);

  // No restrictions - filters can be selected independently

  // Get available classrooms based on selected group (if any)
  const availableClassrooms = useMemo(() => {
    if (selectedGroup === 'all') {
      return filters.classrooms;
    }
    const groupStudents = leaderboard.filter(p => p.groupId === selectedGroup);
    return [...new Set(groupStudents.map(p => p.classroomNumber).filter(Boolean))].sort();
  }, [selectedGroup, leaderboard, filters.classrooms]);

  // Get available teams based on selected filters (if any)
  const availableTeams = useMemo(() => {
    let filtered = leaderboard;
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(p => p.groupId === selectedGroup);
    }
    if (selectedClassroom !== 'all') {
      filtered = filtered.filter(p => p.classroomNumber === selectedClassroom);
    }
    return [...new Set(filtered.map(p => p.teamNumber).filter(Boolean))].sort();
  }, [selectedGroup, selectedClassroom, leaderboard]);

  // Determine view mode based on selected filters
  const viewMode = useMemo(() => {
    const hasGroup = selectedGroup !== 'all';
    const hasClassroom = selectedClassroom !== 'all';
    const hasTeam = selectedTeam !== 'all';

    // All 3 filters selected → Individual students
    if (hasGroup && hasClassroom && hasTeam) {
      return 'students';
    }
    
    // Only Group selected → Show classrooms
    if (hasGroup && !hasClassroom && !hasTeam) {
      return 'classrooms';
    }
    
    // Group + Classroom selected → Show teams
    if (hasGroup && hasClassroom && !hasTeam) {
      return 'teams';
    }
    
    // Any other combination → Show students
    return 'students';
  }, [selectedGroup, selectedClassroom, selectedTeam]);

  // Process data based on view mode
  const processedData = useMemo(() => {
    let filtered = [...leaderboard];

    // Apply filters
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(p => p.groupId === selectedGroup);
    }
    if (selectedClassroom !== 'all') {
      filtered = filtered.filter(p => p.classroomNumber === selectedClassroom);
    }
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(p => p.teamNumber === selectedTeam);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.fullName || p.studentName || p.username || '').toLowerCase().includes(query) ||
        (p.email || '').toLowerCase().includes(query) ||
        (p.groupId || '').toLowerCase().includes(query) ||
        (p.classroomNumber || '').toLowerCase().includes(query) ||
        (p.teamNumber || '').toLowerCase().includes(query)
      );
    }

    if (viewMode === 'classrooms') {
      // Aggregate by classroom
      const classroomMap = new Map();
      filtered.forEach(player => {
        const key = player.classroomNumber || 'Unknown';
        if (!classroomMap.has(key)) {
          classroomMap.set(key, {
            classroomNumber: key,
            groupId: player.groupId,
            students: [],
            stats: {
              totalGames: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              totalPoints: 0,
              rpsWins: 0,
              goWins: 0,
              penniesWins: 0,
            },
          });
        }
        const classroom = classroomMap.get(key);
        classroom.students.push(player);
        classroom.stats.totalGames += player.stats.totalGames;
        classroom.stats.wins += player.stats.wins;
        classroom.stats.losses += player.stats.losses;
        classroom.stats.draws += player.stats.draws;
        classroom.stats.totalPoints += player.stats.totalPoints;
        classroom.stats.rpsWins += player.stats.rpsWins;
        classroom.stats.goWins += player.stats.goWins;
        classroom.stats.penniesWins += player.stats.penniesWins;
      });

      const classrooms = Array.from(classroomMap.values());
      classrooms.sort((a, b) => {
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        return b.stats.totalPoints - a.stats.totalPoints;
      });

      return classrooms.map((classroom, index) => ({
        ...classroom,
        rank: index + 1,
        displayName: `Classroom ${classroom.classroomNumber}`,
        studentCount: classroom.students.length,
      }));
    }

    if (viewMode === 'teams') {
      // Aggregate by team
      const teamMap = new Map();
      filtered.forEach(player => {
        const key = player.teamNumber || 'Unknown';
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            teamNumber: key,
            classroomNumber: player.classroomNumber,
            groupId: player.groupId,
            students: [],
            stats: {
              totalGames: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              totalPoints: 0,
              rpsWins: 0,
              goWins: 0,
              penniesWins: 0,
            },
          });
        }
        const team = teamMap.get(key);
        team.students.push(player);
        team.stats.totalGames += player.stats.totalGames;
        team.stats.wins += player.stats.wins;
        team.stats.losses += player.stats.losses;
        team.stats.draws += player.stats.draws;
        team.stats.totalPoints += player.stats.totalPoints;
        team.stats.rpsWins += player.stats.rpsWins;
        team.stats.goWins += player.stats.goWins;
        team.stats.penniesWins += player.stats.penniesWins;
      });

      const teams = Array.from(teamMap.values());
      teams.sort((a, b) => {
        if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
        return b.stats.totalPoints - a.stats.totalPoints;
      });

      return teams.map((team, index) => ({
        ...team,
        rank: index + 1,
        displayName: team.teamNumber,
        studentCount: team.students.length,
      }));
    }

    // Default: students view
    filtered.sort((a, b) => {
      if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
      return b.stats.totalPoints - a.stats.totalPoints;
    });

    return filtered.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [leaderboard, selectedGroup, selectedClassroom, selectedTeam, searchQuery, viewMode]);

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
          <h1 className="text-3xl font-display font-semibold">Global Leaderboard</h1>
        </div>
        <button onClick={() => navigate('/arena')} className="btn-ghost">
          Back to Arena
        </button>
      </header>

      {/* Filters & Search Section */}
      <div className="glass-panel mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Filters & Search</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Filter 1: Group Id */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Filter 1: Group Id
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
            >
              <option value="all">All Groups</option>
              {filters.groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Classroom Number */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Filter 2: Classroom Number
            </label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
            >
              <option value="all">All Classrooms</option>
              {availableClassrooms.map((classroom) => (
                <option key={classroom} value={classroom}>
                  {classroom}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Team Number */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Filter 3: Team Number
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
            >
              <option value="all">All Teams</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Search Player
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., John Doe or s25cseu1560@bennett.edu.in"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-aurora focus:outline-none"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 flex items-center justify-between text-sm text-white/60">
          <span>
            Showing <strong className="text-white">{processedData.length}</strong> {viewMode === 'classrooms' ? 'classrooms' : viewMode === 'teams' ? 'teams' : 'players'}
            {selectedGroup !== 'all' && ` in Group ${selectedGroup}`}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-red-400">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel overflow-hidden">
        {processedData.length === 0 ? (
          <div className="p-8 text-center text-white/70">
            <p className="text-lg">No data found</p>
            <p className="text-sm mt-2 text-white/50">
              {searchQuery || selectedGroup !== 'all' || selectedClassroom !== 'all' || selectedTeam !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No players have played games yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Rank</th>
                  {viewMode === 'classrooms' ? (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Classroom</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Students</th>
                    </>
                  ) : viewMode === 'teams' ? (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Team</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Classroom</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-white/60">Members</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/60">Player</th>
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
                {processedData.map((item) => {
                  const medal = getMedalEmoji(item.rank);
                  return (
                    <tr
                      key={viewMode === 'classrooms' ? item.classroomNumber : viewMode === 'teams' ? item.teamNumber : item.email}
                      className={`transition hover:bg-white/5 ${
                        item.rank <= 3 ? 'bg-gradient-to-r from-aurora/10 via-transparent to-transparent' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {medal ? (
                            <span className="text-2xl">{medal}</span>
                          ) : (
                            <span className="text-lg font-bold text-white/60">#{item.rank}</span>
                          )}
                        </div>
                      </td>
                      {viewMode === 'classrooms' ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-white">{item.displayName}</p>
                          </td>
                          <td className="px-6 py-4 text-center text-white/70">{item.studentCount}</td>
                        </>
                      ) : viewMode === 'teams' ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-white">{item.displayName}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{item.classroomNumber || '-'}</td>
                          <td className="px-6 py-4 text-center text-white/70">{item.studentCount}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-white">{item.fullName || item.studentName || item.username}</p>
                              <p className="text-sm text-white/50">{item.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{item.groupId || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{item.classroomNumber || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-white/70">{item.teamNumber || '-'}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-aurora">{item.stats.wins}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-white/70">{item.stats.totalGames}</td>
                      <td className="px-6 py-4 text-center text-white/70">{item.stats.totalPoints}</td>
                      <td className="px-6 py-4 text-center text-white/70">{item.stats.rpsWins}</td>
                      <td className="px-6 py-4 text-center text-white/70">{item.stats.goWins}</td>
                      <td className="px-6 py-4 text-center text-white/70">{item.stats.penniesWins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {processedData.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Total {viewMode === 'classrooms' ? 'Classrooms' : viewMode === 'teams' ? 'Teams' : 'Players'}
            </p>
            <p className="text-2xl font-bold text-aurora mt-2">{processedData.length}</p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Games</p>
            <p className="text-2xl font-bold text-purple-400 mt-2">
              {processedData.reduce((sum, p) => sum + p.stats.totalGames, 0)}
            </p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Wins</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">
              {processedData.reduce((sum, p) => sum + p.stats.wins, 0)}
            </p>
          </div>
          <div className="glass-panel p-4 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Top {viewMode === 'classrooms' ? 'Classroom' : viewMode === 'teams' ? 'Team' : 'Player'}</p>
            <p className="text-lg font-semibold text-white mt-2">
              {viewMode === 'classrooms' 
                ? processedData[0]?.displayName || 'N/A'
                : viewMode === 'teams'
                ? processedData[0]?.displayName || 'N/A'
                : processedData[0]?.fullName || processedData[0]?.studentName || processedData[0]?.username || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default LeaderboardPage;
