import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const GameAnalysis = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGame, setSelectedGame] = useState('all');

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
        <button onClick={() => navigate('/arena')} className="btn-ghost">
          Back to Arena
        </button>
      </header>

      {/* Overview Stats */}
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

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['overview', 'moves', 'highlights'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide ${
              activeTab === tab ? 'bg-royal text-white shadow-neon' : 'text-white/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

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
              filteredRounds.map((round, idx) => (
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
                        <span className="ml-2 text-xs text-white/60">Round {round.roundNumber}</span>
                      )}
                      {round.gameType === 'GAME_OF_GO' && (
                        <span className="ml-2 text-xs text-white/60">Move {round.roundNumber}</span>
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
              ))
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
              {analysis.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-aurora/30 bg-aurora/10 p-4"
                >
                  {highlight.type === 'round_win' && (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="font-semibold text-aurora">
                          {getGameTypeName(highlight.gameType)} - Round {highlight.round}
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
                          Game of Go - Move {highlight.move}
                        </p>
                        <p className="text-sm text-white/80 mt-1">
                          {highlight.player} captured {highlight.captured} stone(s) at {highlight.position}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default GameAnalysis;




