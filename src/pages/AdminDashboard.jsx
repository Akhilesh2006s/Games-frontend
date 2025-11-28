import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'leaderboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ groups: [], classrooms: [], teams: [] });

  // Games history state
  const [games, setGames] = useState([]);
  const [gameFilter, setGameFilter] = useState(location.state?.filter || 'all');
  const [gameSearch, setGameSearch] = useState(location.state?.search || '');

  // Student stats state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentStats, setStudentStats] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Restore state from navigation
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    if (location.state?.search !== undefined) {
      setGameSearch(location.state.search);
    }
    if (location.state?.filter) {
      setGameFilter(location.state.filter);
    }
  }, [location.state]);

  // Fetch leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab, selectedGroup, selectedClassroom, selectedTeam, searchQuery]);

  // Fetch games
  useEffect(() => {
    if (activeTab === 'games') {
      fetchGames();
    }
  }, [activeTab, gameFilter, gameSearch]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = {
        groupId: selectedGroup !== 'all' ? selectedGroup : undefined,
        classroomNumber: selectedClassroom !== 'all' ? selectedClassroom : undefined,
        teamNumber: selectedTeam !== 'all' ? selectedTeam : undefined,
        search: searchQuery || undefined,
      };
      const { data } = await api.get('/admin/leaderboard', { params });
      setLeaderboard(data.leaderboard || []);
      setFilters(data.filters || { groups: [], classrooms: [], teams: [] });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      setLoading(true);
      const params = {
        status: gameFilter !== 'all' ? gameFilter : undefined,
        search: gameSearch || undefined,
        limit: 100,
      };
      const { data } = await api.get('/admin/games', { params });
      setGames(data.games || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentStats = async (email) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/student/${encodeURIComponent(email)}`);
      setStudentStats(data);
      setSelectedStudent(email);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student stats');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const downloadCSV = () => {
    // Prepare CSV data
    const headers = ['Rank', 'Name', 'Email', 'Enrollment No', 'Group', 'Classroom', 'Team', 'Wins', 'Losses', 'Draws', 'Total Points', 'RPS Wins', 'RPS Points', 'Go Wins', 'Go Points', 'Pennies Wins', 'Pennies Points'];
    
    const csvRows = [headers.join(',')];
    
    processedData.forEach((item) => {
      const row = [
        item.rank || '',
        item.displayName || item.firstName || item.username || '',
        item.email || '',
        item.enrollmentNo || '',
        item.groupId || '',
        item.classroomNumber || '',
        item.teamNumber || '',
        item.stats?.wins || 0,
        item.stats?.losses || 0,
        item.stats?.draws || 0,
        item.stats?.totalPoints || 0,
        item.stats?.rpsWins || 0,
        item.stats?.rpsPoints || 0,
        item.stats?.goWins || 0,
        item.stats?.goPoints || 0,
        item.stats?.penniesWins || 0,
        item.stats?.penniesPoints || 0,
      ];
      // Escape commas and quotes in CSV
      csvRows.push(row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGameTypeName = (type) => {
    const names = {
      ROCK_PAPER_SCISSORS: 'Rock Paper Scissors',
      GAME_OF_GO: 'Game of Go',
      MATCHING_PENNIES: 'Matching Pennies',
    };
    return names[type] || type || 'Not Started';
  };

  const availableClassrooms = useMemo(() => {
    if (selectedGroup === 'all') {
      return filters.classrooms;
    }
    const groupStudents = leaderboard.filter(p => p.groupId === selectedGroup);
    return [...new Set(groupStudents.map(p => p.classroomNumber).filter(Boolean))].sort();
  }, [selectedGroup, leaderboard, filters.classrooms]);

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

  const viewMode = useMemo(() => {
    const hasGroup = selectedGroup !== 'all';
    const hasClassroom = selectedClassroom !== 'all';
    const hasTeam = selectedTeam !== 'all';

    if (hasGroup && hasClassroom && hasTeam) {
      return 'students';
    }
    if (hasGroup && !hasClassroom && !hasTeam) {
      return 'classrooms';
    }
    if (hasGroup && hasClassroom && !hasTeam) {
      return 'teams';
    }
    return 'students';
  }, [selectedGroup, selectedClassroom, selectedTeam]);

  const processedData = useMemo(() => {
    let filtered = [...leaderboard];

    if (selectedGroup !== 'all') {
      filtered = filtered.filter(p => p.groupId === selectedGroup);
    }
    if (selectedClassroom !== 'all') {
      filtered = filtered.filter(p => p.classroomNumber === selectedClassroom);
    }
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(p => p.teamNumber === selectedTeam);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.firstName?.toLowerCase().includes(query) ||
        p.lastName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.enrollmentNo?.toLowerCase().includes(query) ||
        p.username?.toLowerCase().includes(query)
      );
    }

    if (viewMode === 'classrooms') {
      const classroomMap = new Map();
      filtered.forEach(player => {
        const key = player.classroomNumber || 'Unknown';
        if (!classroomMap.has(key)) {
          classroomMap.set(key, {
            classroomNumber: key,
            students: [],
            stats: {
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
        displayName: classroom.classroomNumber,
        studentCount: classroom.students.length,
      }));
    }

    if (viewMode === 'teams') {
      const teamMap = new Map();
      filtered.forEach(player => {
        const key = player.teamNumber || 'Unknown';
        if (!teamMap.has(key)) {
          teamMap.set(key, {
            teamNumber: key,
            students: [],
            stats: {
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

    filtered.sort((a, b) => {
      if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
      return b.stats.totalPoints - a.stats.totalPoints;
    });

    return filtered.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [leaderboard, selectedGroup, selectedClassroom, selectedTeam, searchQuery, viewMode]);

  if (loading && !leaderboard.length && !games.length) {
    return (
      <main className="min-h-screen bg-night px-4 py-8 md:px-10">
        <div className="glass-panel p-6 text-center text-white/70">
          Loading admin dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Admin Dashboard</p>
          <h1 className="text-3xl font-display font-semibold">Administrator Panel</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/arena')} className="btn-ghost">
            Back to Arena
          </button>
          <button 
            onClick={() => {
              logout();
              navigate('/');
            }} 
            className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['leaderboard', 'games', 'student'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedStudent(null);
              setStudentStats(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide transition ${
              activeTab === tab
                ? 'bg-royal text-white shadow-neon font-semibold'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab === 'leaderboard' ? 'Leaderboard' : tab === 'games' ? 'Game History' : 'Student Stats'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-center text-red-400">
          {error}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          <div className="glass-panel mb-6 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Filters & Search</h2>
              <button
                onClick={downloadCSV}
                className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition"
              >
                📥 Download CSV
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Filter by Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                >
                  <option value="all">All Groups</option>
                  {filters.groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Filter by Classroom</label>
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                >
                  <option value="all">All Classrooms</option>
                  {availableClassrooms.map((classroom) => (
                    <option key={classroom} value={classroom}>{classroom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Filter by Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                >
                  <option value="all">All Teams</option>
                  {availableTeams.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-aurora focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Rank</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Name</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Group</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Classroom</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Team</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Wins</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Points</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((item) => (
                  <tr key={item.email || item.displayName} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{item.rank}</td>
                    <td className="px-4 py-3 text-white">{item.displayName || item.firstName || item.username}</td>
                    <td className="px-4 py-3 text-white/70">{item.groupId || '-'}</td>
                    <td className="px-4 py-3 text-white/70">{item.classroomNumber || '-'}</td>
                    <td className="px-4 py-3 text-white/70">{item.teamNumber || '-'}</td>
                    <td className="px-4 py-3 text-white">{item.stats?.wins || 0}</td>
                    <td className="px-4 py-3 text-white">{item.stats?.totalPoints || 0}</td>
                    <td className="px-4 py-3">
                      {item.email && (
                        <button
                          onClick={() => {
                            setActiveTab('student');
                            fetchStudentStats(item.email);
                          }}
                          className="text-aurora hover:text-aurora/70 text-sm"
                        >
                          View Stats
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Games History Tab */}
      {activeTab === 'games' && (
        <div>
          <div className="glass-panel mb-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Filter by Status</label>
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-aurora focus:outline-none [&>option]:bg-[#1a1a2e] [&>option]:text-white"
                >
                  <option value="all">All Games</option>
                  <option value="complete">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Search Games</label>
                <input
                  type="text"
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  placeholder="Search by code, player name, or email..."
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-aurora focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {games.map((game) => (
              <div key={game._id} className="glass-panel rounded-2xl border border-white/10 p-6 text-white hover:border-aurora/50 transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs uppercase tracking-[0.4em] font-semibold ${game.status === 'COMPLETE' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {game.status}
                      </span>
                      {game.activeStage && (
                        <span className="text-xs uppercase tracking-[0.4em] text-white/50">
                          {getGameTypeName(game.activeStage)}
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <p className="text-2xl font-display tracking-[0.3em] text-aurora mb-2">{game.code}</p>
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <div>
                          <div>{game.host?.studentName || game.host?.username || 'Host'}</div>
                          {game.host?.enrollmentNo && (
                            <div className="text-sm font-normal text-white/50">{game.host.enrollmentNo}</div>
                          )}
                        </div>
                        <span className="mx-2 text-white/40">vs</span>
                        <div>
                          <div>{game.guest?.studentName || game.guest?.username || 'Guest'}</div>
                          {game.guest?.enrollmentNo && (
                            <div className="text-sm font-normal text-white/50">{game.guest.enrollmentNo}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span>Started: {formatDate(game.createdAt)}</span>
                      {game.completedAt && <span>Completed: {formatDate(game.completedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {game.status === 'COMPLETE' && (
                      <button
                        onClick={() => navigate(`/analysis/${game.code}`, {
                          state: {
                            from: 'admin',
                            tab: 'games',
                            search: gameSearch,
                            filter: gameFilter
                          }
                        })}
                        className="rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition font-semibold"
                      >
                        View Analysis
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Stats Tab */}
      {activeTab === 'student' && (
        <div>
          {!studentStats ? (
            <div className="glass-panel p-6 text-center text-white/70">
              <p>Select a student from the leaderboard to view their detailed stats</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="glass-panel p-6">
                <h2 className="text-2xl font-semibold mb-4 text-white">Student Information</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Name</p>
                    <p className="text-lg font-semibold text-white">{studentStats.user.firstName} {studentStats.user.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Email</p>
                    <p className="text-lg font-semibold text-white">{studentStats.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Enrollment No</p>
                    <p className="text-lg font-semibold text-white">{studentStats.user.enrollmentNo || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Group/Classroom/Team</p>
                    <p className="text-lg font-semibold text-white">
                      {studentStats.user.groupId || '-'} / {studentStats.user.classroomNumber || '-'} / {studentStats.user.teamNumber || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="glass-panel p-6">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Total Games</p>
                  <p className="text-3xl font-bold text-aurora">{studentStats.gameStats.totalGames}</p>
                </div>
                <div className="glass-panel p-6">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Wins</p>
                  <p className="text-3xl font-bold text-green-400">{studentStats.stats.wins}</p>
                </div>
                <div className="glass-panel p-6">
                  <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Total Points</p>
                  <p className="text-3xl font-bold text-purple-400">{studentStats.stats.totalPoints}</p>
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Game Breakdown</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">RPS Games</p>
                    <p className="text-2xl font-bold text-white">{studentStats.gameStats.rpsGames}</p>
                    <p className="text-sm text-white/70">Wins: {studentStats.gameStats.rpsWins || studentStats.stats.rpsWins || 0}</p>
                    <p className="text-sm text-white/50">Losses: {studentStats.stats.rpsLosses || 0}</p>
                    <p className="text-sm text-white/50">Points: {studentStats.stats.rpsPoints || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Go Games</p>
                    <p className="text-2xl font-bold text-white">{studentStats.gameStats.goGames}</p>
                    <p className="text-sm text-white/70">Wins: {studentStats.gameStats.goWins || studentStats.stats.goWins || 0}</p>
                    <p className="text-sm text-white/50">Losses: {studentStats.stats.goLosses || 0}</p>
                    <p className="text-sm text-white/50">Points: {studentStats.stats.goPoints || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Pennies Games</p>
                    <p className="text-2xl font-bold text-white">{studentStats.gameStats.penniesGames}</p>
                    <p className="text-sm text-white/70">Wins: {studentStats.gameStats.penniesWins || studentStats.stats.penniesWins || 0}</p>
                    <p className="text-sm text-white/50">Losses: {studentStats.stats.penniesLosses || 0}</p>
                    <p className="text-sm text-white/50">Points: {studentStats.stats.penniesPoints || 0}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Completed Games</p>
                    <p className="text-xl font-bold text-green-400">{studentStats.gameStats.completedGames || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">In Progress</p>
                    <p className="text-xl font-bold text-yellow-400">{studentStats.gameStats.inProgressGames || 0}</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">All Games ({studentStats.allGames?.length || 0})</h3>
                <div className="max-h-[600px] overflow-y-auto space-y-2">
                  {studentStats.allGames && studentStats.allGames.length > 0 ? (
                    studentStats.allGames.map((game) => {
                      // Find user ID from the student stats
                      const userId = studentStats.user.id || studentStats.user._id;
                      const hostId = game.host?._id || game.host?.id;
                      const guestId = game.guest?._id || game.guest?.id;
                      const isHost = hostId && String(hostId) === String(userId);
                      const opponent = isHost ? game.guest : game.host;
                      const myScore = isHost 
                        ? (game.activeStage === 'ROCK_PAPER_SCISSORS' ? game.hostScore : 
                           game.activeStage === 'MATCHING_PENNIES' ? game.hostPenniesScore : 
                           game.goFinalScore?.winner === 'black' ? 'Win' : 'Loss')
                        : (game.activeStage === 'ROCK_PAPER_SCISSORS' ? game.guestScore : 
                           game.activeStage === 'MATCHING_PENNIES' ? game.guestPenniesScore : 
                           game.goFinalScore?.winner === 'white' ? 'Win' : 'Loss');
                      const opponentScore = isHost
                        ? (game.activeStage === 'ROCK_PAPER_SCISSORS' ? game.guestScore : 
                           game.activeStage === 'MATCHING_PENNIES' ? game.guestPenniesScore : 
                           game.goFinalScore?.winner === 'white' ? 'Win' : 'Loss')
                        : (game.activeStage === 'ROCK_PAPER_SCISSORS' ? game.hostScore : 
                           game.activeStage === 'MATCHING_PENNIES' ? game.hostPenniesScore : 
                           game.goFinalScore?.winner === 'black' ? 'Win' : 'Loss');
                      
                      return (
                        <div key={game._id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-white font-semibold">{game.code}</p>
                              <span className={`text-xs px-2 py-1 rounded ${game.status === 'COMPLETE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {game.status}
                              </span>
                            </div>
                            <p className="text-sm text-white/70 mb-1">{getGameTypeName(game.activeStage)}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/80">vs {opponent?.studentName || opponent?.username || 'Opponent'}</span>
                              {game.status === 'COMPLETE' && (
                                <span className="text-white/60">
                                  ({myScore} - {opponentScore})
                                </span>
                              )}
                            </div>
                            {game.activeStage === 'GAME_OF_GO' && game.goBoardSize && (
                              <p className="text-xs text-white/50 mt-1">
                                {game.goBoardSize}×{game.goBoardSize} Board
                                {game.goCapturedBlack > 0 || game.goCapturedWhite > 0 && (
                                  <span> • ⚫ {game.goCapturedBlack || 0} | ⚪ {game.goCapturedWhite || 0}</span>
                                )}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/70">{formatDate(game.createdAt)}</p>
                            {game.status === 'COMPLETE' && (
                              <button
                                onClick={() => navigate(`/analysis/${game.code}`, {
                                  state: {
                                    from: 'admin',
                                    tab: 'games',
                                    search: gameSearch,
                                    filter: gameFilter
                                  }
                                })}
                                className="mt-2 text-xs text-aurora hover:text-aurora/70"
                              >
                                View Analysis
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-white/60 py-8">No games found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default AdminDashboard;

