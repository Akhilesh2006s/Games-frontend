import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const GameAnalysis = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGame, setSelectedGame] = useState('all');
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/games/analysis/${code}`);
        setAnalysis(data.analysis);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load game analysis');
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchAnalysis();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        Loading game analysis...
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="glass-panel p-6 text-center text-red-400">
        {error || 'Game analysis not available'}
      </div>
    );
  }

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
    return names[type] || type;
  };

  const getChoiceDisplay = (choice, move) => {
    if (choice === 'pass') return 'Pass';
    if (choice?.startsWith('place:')) {
      const [, row, col, color] = choice.split(':');
      return `${color === 'black' ? '⚫' : '⚪'} (${parseInt(row) + 1}, ${parseInt(col) + 1})${move?.captured ? ` - Captured ${move.captured}` : ''}`;
    }
    return choice?.charAt(0).toUpperCase() + choice?.slice(1) || choice;
  };

  const allRounds = [
    ...analysis.rounds.rockPaperScissors.map(r => ({ ...r, gameType: 'ROCK_PAPER_SCISSORS' })),
    ...analysis.rounds.gameOfGo.map(r => ({ ...r, gameType: 'GAME_OF_GO' })),
    ...analysis.rounds.matchingPennies.map(r => ({ ...r, gameType: 'MATCHING_PENNIES' })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const filteredRounds = selectedGame === 'all' 
    ? allRounds 
    : allRounds.filter(r => r.gameType === selectedGame);

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Game Analysis</p>
          <h1 className="text-3xl font-display font-semibold">Match Report: {analysis.gameCode}</h1>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button
              onClick={() => {
                // Create comprehensive CSV
                const csvRows = [];
              
              // Game Information Section
              csvRows.push('=== GAME INFORMATION ===');
              csvRows.push('Game Code,' + analysis.gameCode);
              csvRows.push('Status,' + analysis.status);
              csvRows.push('Active Stage,' + getGameTypeName(analysis.activeStage));
              csvRows.push('Started,' + formatDate(analysis.createdAt));
              csvRows.push('Completed,' + (analysis.completedAt ? formatDate(analysis.completedAt) : 'N/A'));
              csvRows.push('');
              
              // Players Section
              csvRows.push('=== PLAYERS ===');
              csvRows.push('Host Name,' + analysis.host.name);
              csvRows.push('Host Email,' + analysis.host.email);
              csvRows.push('Guest Name,' + (analysis.guest?.name || 'N/A'));
              csvRows.push('Guest Email,' + (analysis.guest?.email || 'N/A'));
              csvRows.push('');
              
              // Final Scores Section
              csvRows.push('=== FINAL SCORES ===');
              if (analysis.scores.rps.host > 0 || analysis.scores.rps.guest > 0) {
                csvRows.push('Rock Paper Scissors,' + analysis.host.name + ',' + analysis.scores.rps.host + ',' + analysis.guest?.name + ',' + analysis.scores.rps.guest);
              }
              if (analysis.scores.pennies.host > 0 || analysis.scores.pennies.guest > 0) {
                csvRows.push('Matching Pennies,' + analysis.host.name + ',' + analysis.scores.pennies.host + ',' + analysis.guest?.name + ',' + analysis.scores.pennies.guest);
              }
              if (analysis.scores.go) {
                csvRows.push('Game of Go,Black (Host),' + (analysis.scores.go.black?.score || 0) + ',White (Guest),' + (analysis.scores.go.white?.score || 0));
                csvRows.push('Game of Go Winner,' + (analysis.scores.go.winner === 'black' ? analysis.host.name : analysis.guest?.name || 'N/A'));
              }
              csvRows.push('');
              
              // Detailed Statistics
              if (analysis.rpsData) {
                csvRows.push('=== ROCK PAPER SCISSORS DETAILS ===');
                csvRows.push('Total Rounds,' + analysis.rpsData.totalRounds);
                csvRows.push('Host Wins,' + analysis.rpsData.hostWins);
                csvRows.push('Guest Wins,' + analysis.rpsData.guestWins);
                csvRows.push('Draws,' + analysis.rpsData.draws);
                csvRows.push('Host Score,' + analysis.rpsData.hostScore);
                csvRows.push('Guest Score,' + analysis.rpsData.guestScore);
                csvRows.push('Host Rock Choices,' + (analysis.rpsData.hostChoices.rock || 0));
                csvRows.push('Host Paper Choices,' + (analysis.rpsData.hostChoices.paper || 0));
                csvRows.push('Host Scissors Choices,' + (analysis.rpsData.hostChoices.scissors || 0));
                csvRows.push('Guest Rock Choices,' + (analysis.rpsData.guestChoices.rock || 0));
                csvRows.push('Guest Paper Choices,' + (analysis.rpsData.guestChoices.paper || 0));
                csvRows.push('Guest Scissors Choices,' + (analysis.rpsData.guestChoices.scissors || 0));
                csvRows.push('Winner,' + (analysis.rpsData.winner === 'host' ? analysis.host.name : analysis.guest?.name || 'N/A'));
                csvRows.push('');
              }
              
              if (analysis.penniesData) {
                csvRows.push('=== MATCHING PENNIES DETAILS ===');
                csvRows.push('Total Rounds,' + analysis.penniesData.totalRounds);
                csvRows.push('Host Wins,' + analysis.penniesData.hostWins);
                csvRows.push('Guest Wins,' + analysis.penniesData.guestWins);
                csvRows.push('Draws,' + analysis.penniesData.draws);
                csvRows.push('Host Score,' + analysis.penniesData.hostScore);
                csvRows.push('Guest Score,' + analysis.penniesData.guestScore);
                csvRows.push('Host Heads Choices,' + (analysis.penniesData.hostChoices.heads || 0));
                csvRows.push('Host Tails Choices,' + (analysis.penniesData.hostChoices.tails || 0));
                csvRows.push('Guest Heads Choices,' + (analysis.penniesData.guestChoices.heads || 0));
                csvRows.push('Guest Tails Choices,' + (analysis.penniesData.guestChoices.tails || 0));
                csvRows.push('Winner,' + (analysis.penniesData.winner === 'host' ? analysis.host.name : analysis.guest?.name || 'N/A'));
                csvRows.push('');
              }
              
              if (analysis.goData) {
                csvRows.push('=== GAME OF GO DETAILS ===');
                csvRows.push('Board Size,' + analysis.goData.boardSize + 'x' + analysis.goData.boardSize);
                csvRows.push('Komi,' + analysis.goData.komi);
                csvRows.push('Captured Black,' + analysis.goData.capturedBlack);
                csvRows.push('Captured White,' + analysis.goData.capturedWhite);
                csvRows.push('Total Moves,' + analysis.goData.totalMoves);
                if (analysis.goData.finalScore) {
                  csvRows.push('Black Score,' + (analysis.goData.finalScore.black?.score || 0));
                  csvRows.push('White Score,' + (analysis.goData.finalScore.white?.score || 0));
                  csvRows.push('Black Stones,' + (analysis.goData.finalScore.black?.stones || 0));
                  csvRows.push('Black Territory,' + (analysis.goData.finalScore.black?.territory || 0));
                  csvRows.push('White Stones,' + (analysis.goData.finalScore.white?.stones || 0));
                  csvRows.push('White Territory,' + (analysis.goData.finalScore.white?.territory || 0));
                  csvRows.push('Winner,' + (analysis.goData.finalScore.winner === 'black' ? analysis.host.name : analysis.guest?.name || 'N/A'));
                }
                csvRows.push('');
              }
              
              // All Moves Section
              csvRows.push('=== ALL MOVES ===');
              csvRows.push('Move Number,Game Type,Round Number,Player,Choice,Position,Timestamp,Winner,Summary');
              
              allRounds.forEach((round, idx) => {
                const moveNum = idx + 1;
                const roundNum = round.roundNumber || idx + 1;
                round.moves.forEach((move, moveIdx) => {
                  const row = [
                    moveNum,
                    getGameTypeName(round.gameType),
                    roundNum,
                    move.player?.name || 'Unknown',
                    getChoiceDisplay(move.choice, move),
                    move.row !== undefined && move.col !== undefined ? `(${move.row + 1},${move.col + 1})` : 'N/A',
                    formatDate(round.timestamp),
                    moveIdx === round.moves.length - 1 && round.winner ? round.winner.name : '',
                    round.summary || ''
                  ];
                  csvRows.push(row.map(cell => {
                    const cellStr = String(cell || '');
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                      return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                  }).join(','));
                });
              });
              
              csvRows.push('');
              
              // Highlights Section
              if (analysis.highlights && analysis.highlights.length > 0) {
                csvRows.push('=== HIGHLIGHTS ===');
                csvRows.push('Type,Game Type,Round/Move,Player,Details');
                analysis.highlights.forEach(highlight => {
                  const roundNum = highlight.round || highlight.move || 'N/A';
                  const row = [
                    highlight.type,
                    getGameTypeName(highlight.gameType),
                    roundNum,
                    highlight.player || highlight.winner || 'N/A',
                    highlight.summary || highlight.position || highlight.captured ? `Captured: ${highlight.captured}` : ''
                  ];
                  csvRows.push(row.map(cell => {
                    const cellStr = String(cell || '');
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                      return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                  }).join(','));
                });
              }
              
              // Download CSV
              const csvContent = csvRows.join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              
              link.setAttribute('href', url);
              link.setAttribute('download', `game_analysis_${analysis.gameCode}_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition"
          >
            📥 Download CSV
          </button>
          )}
          <button 
            onClick={() => {
              // Check if we came from admin dashboard
              if (location.state?.from === 'admin') {
                const navState = {
                  tab: location.state.tab || 'games',
                };
                
                // If coming from student stats, include studentEmail
                if (location.state.tab === 'student' && location.state.studentEmail) {
                  navState.studentEmail = location.state.studentEmail;
                }
                
                // If coming from games tab, include search and filter
                if (location.state.tab === 'games') {
                  navState.search = location.state.search || '';
                  navState.filter = location.state.filter || 'all';
                }
                
                navigate('/admin', { state: navState });
              } else {
                navigate('/arena');
              }
            }} 
            className="btn-ghost"
          >
            {location.state?.from === 'admin' ? 'Back to Admin' : 'Back to Arena'}
        </button>
        </div>
      </header>

      {/* Tabs - Always Visible */}
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['overview', 'moves', 'highlights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide transition ${
              activeTab === tab 
                ? 'bg-royal text-white shadow-neon font-semibold' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'moves' ? 'All Moves' : 'Highlights'}
          </button>
        ))}
      </div>

      {/* Overview Stats - Show when overview tab is active */}
      {activeTab === 'overview' && (
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Total Moves</p>
          <p className="text-3xl font-bold text-aurora mt-2">{analysis.moveCount}</p>
        </div>
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">RPS Rounds</p>
          <p className="text-3xl font-bold text-purple-400 mt-2">{analysis.totalRounds.rps}</p>
        </div>
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Go Moves</p>
          <p className="text-3xl font-bold text-white mt-2">{analysis.totalRounds.go}</p>
        </div>
        <div className="glass-panel p-6 text-white">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Pennies Rounds</p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{analysis.totalRounds.pennies}</p>
        </div>
      </div>
      )}

      {/* Game Filter */}
      {activeTab === 'moves' && (
        <div className="mb-6 flex gap-2">
          {['all', 'ROCK_PAPER_SCISSORS', 'GAME_OF_GO', 'MATCHING_PENNIES'].map((game) => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`rounded-full px-4 py-2 text-sm ${
                selectedGame === game
                  ? 'bg-aurora text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {game === 'all' ? 'All Games' : getGameTypeName(game)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Players */}
          <div className="glass-panel space-y-4 p-6 text-white">
            <h2 className="text-xl font-semibold">Players</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wide text-white/50">Host</p>
                <p className="text-lg font-semibold mt-1">{analysis.host.name}</p>
                <p className="text-sm text-white/60">{analysis.host.email}</p>
              </div>
              {analysis.guest && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">Guest</p>
                  <p className="text-lg font-semibold mt-1">{analysis.guest.name}</p>
                  <p className="text-sm text-white/60">{analysis.guest.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scores */}
          <div className="glass-panel space-y-4 p-6 text-white">
            <h2 className="text-xl font-semibold">Final Scores</h2>
            <div className="space-y-3">
              {analysis.scores.rps.host > 0 || analysis.scores.rps.guest > 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">Rock Paper Scissors</p>
                  <p className="text-lg font-semibold mt-1">
                    {analysis.host.name}: {analysis.scores.rps.host} - {analysis.scores.rps.guest} :{analysis.guest?.name}
                  </p>
                </div>
              ) : null}
              {analysis.scores.pennies.host > 0 || analysis.scores.pennies.guest > 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">Matching Pennies</p>
                  <p className="text-lg font-semibold mt-1">
                    {analysis.host.name}: {analysis.scores.pennies.host} - {analysis.scores.pennies.guest} :{analysis.guest?.name}
                  </p>
                </div>
              ) : null}
              {analysis.scores.go ? (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/50">Game of Go</p>
                  <p className="text-lg font-semibold mt-1">
                    {analysis.scores.go.winner === 'black' ? analysis.host.name : analysis.guest?.name} Wins
                  </p>
                  {analysis.scores.go.black && (
                    <p className="text-sm text-white/60 mt-1">
                      Black: {analysis.scores.go.black.score} | White: {analysis.scores.go.white.score}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Rock Paper Scissors Detailed Analysis */}
          {analysis.rpsData && (
            <div className="glass-panel space-y-4 p-6 text-white">
              <h2 className="text-xl font-semibold">Rock Paper Scissors Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{analysis.host.name}</p>
                  <p className="text-3xl font-bold text-white mb-2">{analysis.rpsData.hostScore}</p>
                  <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                    <p>Rounds won: {analysis.rpsData.hostWins}</p>
                    <p>Rounds lost: {analysis.rpsData.guestWins}</p>
                    <p>Draws: {analysis.rpsData.draws}</p>
                    <p className="mt-2 font-semibold text-white">Choices:</p>
                    <p>✊ Rock: {analysis.rpsData.hostChoices.rock || 0}</p>
                    <p>✋ Paper: {analysis.rpsData.hostChoices.paper || 0}</p>
                    <p>✌️ Scissors: {analysis.rpsData.hostChoices.scissors || 0}</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{analysis.guest?.name || 'Guest'}</p>
                  <p className="text-3xl font-bold text-white mb-2">{analysis.rpsData.guestScore}</p>
                  <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                    <p>Rounds won: {analysis.rpsData.guestWins}</p>
                    <p>Rounds lost: {analysis.rpsData.hostWins}</p>
                    <p>Draws: {analysis.rpsData.draws}</p>
                    <p className="mt-2 font-semibold text-white">Choices:</p>
                    <p>✊ Rock: {analysis.rpsData.guestChoices.rock || 0}</p>
                    <p>✋ Paper: {analysis.rpsData.guestChoices.paper || 0}</p>
                    <p>✌️ Scissors: {analysis.rpsData.guestChoices.scissors || 0}</p>
                  </div>
                </div>
              </div>
              {analysis.rpsData.winner && (
                <div className="mt-4 text-center">
                  <p className="text-lg font-semibold text-white/80 mb-2">Winner:</p>
                  <p className="text-3xl font-bold text-aurora">
                    {analysis.rpsData.winner === 'host' 
                      ? `${analysis.host.name} Wins!`
                      : `${analysis.guest?.name || 'Guest'} Wins!`}
                  </p>
                  <p className="text-sm text-white/60 mt-2">
                    Total Rounds: {analysis.rpsData.totalRounds}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Matching Pennies Detailed Analysis */}
          {analysis.penniesData && (
            <div className="glass-panel space-y-4 p-6 text-white">
              <h2 className="text-xl font-semibold">Matching Pennies Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{analysis.host.name}</p>
                  <p className="text-3xl font-bold text-white mb-2">{analysis.penniesData.hostScore}</p>
                  <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                    <p>Rounds won: {analysis.penniesData.hostWins}</p>
                    <p>Rounds lost: {analysis.penniesData.guestWins}</p>
                    <p>Draws: {analysis.penniesData.draws}</p>
                    <p className="mt-2 font-semibold text-white">Choices:</p>
                    <p>👑 Heads: {analysis.penniesData.hostChoices.heads || 0}</p>
                    <p>🦅 Tails: {analysis.penniesData.hostChoices.tails || 0}</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60 mb-2">{analysis.guest?.name || 'Guest'}</p>
                  <p className="text-3xl font-bold text-white mb-2">{analysis.penniesData.guestScore}</p>
                  <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                    <p>Rounds won: {analysis.penniesData.guestWins}</p>
                    <p>Rounds lost: {analysis.penniesData.hostWins}</p>
                    <p>Draws: {analysis.penniesData.draws}</p>
                    <p className="mt-2 font-semibold text-white">Choices:</p>
                    <p>👑 Heads: {analysis.penniesData.guestChoices.heads || 0}</p>
                    <p>🦅 Tails: {analysis.penniesData.guestChoices.tails || 0}</p>
                  </div>
                </div>
              </div>
              {analysis.penniesData.winner && (
                <div className="mt-4 text-center">
                  <p className="text-lg font-semibold text-white/80 mb-2">Winner:</p>
                  <p className="text-3xl font-bold text-aurora">
                    {analysis.penniesData.winner === 'host' 
                      ? `${analysis.host.name} Wins!`
                      : `${analysis.guest?.name || 'Guest'} Wins!`}
                  </p>
                  <p className="text-sm text-white/60 mt-2">
                    Total Rounds: {analysis.penniesData.totalRounds}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Game Info */}
          <div className="glass-panel space-y-4 p-6 text-white">
            <h2 className="text-xl font-semibold">Game Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Status:</span>
                <span className="font-semibold">{analysis.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Active Stage:</span>
                <span className="font-semibold">{getGameTypeName(analysis.activeStage) || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Started:</span>
                <span className="font-semibold">{formatDate(analysis.createdAt)}</span>
              </div>
              {analysis.completedAt && (
                <div className="flex justify-between">
                  <span className="text-white/60">Completed:</span>
                  <span className="font-semibold">{formatDate(analysis.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Go Specific Data */}
          {analysis.goData && (
            <div className="glass-panel space-y-4 p-6 text-white">
              <h2 className="text-xl font-semibold">Game of Go Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Board Size:</span>
                  <span className="font-semibold">{analysis.goData.boardSize}x{analysis.goData.boardSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Komi:</span>
                  <span className="font-semibold">{analysis.goData.komi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Captured Black:</span>
                  <span className="font-semibold">{analysis.goData.capturedBlack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Captured White:</span>
                  <span className="font-semibold">{analysis.goData.capturedWhite}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Moves:</span>
                  <span className="font-semibold">{analysis.goData.totalMoves}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'moves' && (
        <div className="glass-panel space-y-4 p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">All Moves ({filteredRounds.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredRounds.length === 0 ? (
              <p className="text-center text-white/60 py-8">No moves recorded for this game</p>
            ) : (
              filteredRounds.map((round, idx) => {
                // Calculate sequential round/move number based on position in filtered list
                const sequentialNumber = idx + 1;
                
                return (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-white/50">
                        {getGameTypeName(round.gameType)}
                      </span>
                      {round.gameType !== 'GAME_OF_GO' && (
                          <span className="ml-2 text-xs text-white/60">Round {sequentialNumber}</span>
                      )}
                      {round.gameType === 'GAME_OF_GO' && (
                          <span className="ml-2 text-xs text-white/60">Move {sequentialNumber}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/40">{formatDate(round.timestamp)}</span>
                  </div>
                  <div className="space-y-2">
                    {round.moves.map((move, moveIdx) => (
                      <div key={moveIdx} className="flex items-center gap-3 text-sm">
                        <span className={`font-semibold ${move.player.isHost ? 'text-purple-400' : 'text-cyan-400'}`}>
                          {move.player.name}:
                        </span>
                        <span className="text-white/80">
                          {getChoiceDisplay(move.choice, move)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {round.winner && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <span className="text-xs text-aurora font-semibold">
                        🏆 Winner: {round.winner.name}
                      </span>
                    </div>
                  )}
                  {round.summary && (
                    <p className="mt-2 text-xs text-white/60">{round.summary}</p>
                  )}
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'highlights' && (
        <div className="glass-panel space-y-4 p-6 text-white">
          <h2 className="text-xl font-semibold mb-4">Game Highlights ({analysis.highlights.length})</h2>
          {analysis.highlights.length === 0 ? (
            <p className="text-center text-white/60 py-8">No highlights available</p>
          ) : (
            <div className="space-y-3">
              {analysis.highlights.map((highlight, idx) => {
                // Find sequential round/move number for highlights
                const getSequentialNumber = () => {
                  if (highlight.type === 'round_win') {
                    const roundIndex = allRounds.findIndex(r => 
                      r.gameType === highlight.gameType && 
                      r.roundNumber === highlight.round
                    );
                    return roundIndex !== -1 ? roundIndex + 1 : highlight.round;
                  } else if (highlight.type === 'capture') {
                    const moveIndex = allRounds.findIndex(r => 
                      r.gameType === 'GAME_OF_GO' && 
                      r.roundNumber === highlight.move
                    );
                    return moveIndex !== -1 ? moveIndex + 1 : highlight.move;
                  }
                  return highlight.round || highlight.move;
                };

                return (
                <div
                  key={idx}
                  className="rounded-lg border border-aurora/30 bg-aurora/10 p-4"
                >
                  {highlight.type === 'round_win' && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="font-semibold text-aurora">
                            {getGameTypeName(highlight.gameType)} - Round {getSequentialNumber()}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          {highlight.winner} wins! {highlight.summary}
                        </p>
                      </div>
                    </div>
                  )}
                  {highlight.type === 'capture' && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚔️</span>
                      <div>
                        <p className="font-semibold text-aurora">
                            Game of Go - Move {getSequentialNumber()}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          {highlight.player} captured {highlight.captured} stone(s) at {highlight.position}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default GameAnalysis;

