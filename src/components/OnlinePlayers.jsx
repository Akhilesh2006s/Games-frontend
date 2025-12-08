import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import GameSelector from './GameSelector';

const OnlinePlayers = () => {
  const { currentGame, setCurrentGame, setStatusMessage } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'code', 'enrollment', 'name'
  const [searchResults, setSearchResults] = useState({ players: [], games: [] });
  const [loading, setLoading] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);

  const loadPlayersAndGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/games/search', {
        params: { query: searchQuery || '', type: searchType },
      });
      // Ensure we have the expected structure
      setSearchResults({
        players: data.players || [],
        games: data.games || []
      });
    } catch (err) {
      console.error('Load failed:', err);
      console.error('Error details:', err.response?.data || err.message);
      setSearchResults({ players: [], games: [] });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType]);

  // Load all players and games on mount
  useEffect(() => {
    loadPlayersAndGames();
  }, []); // Load once on mount

  // Debounce search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPlayersAndGames();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchType, loadPlayersAndGames]);

  const handleJoinGame = async (code) => {
    try {
      const { data } = await api.post('/games/join', { code: code.trim().toUpperCase() });
      setCurrentGame(data.game);
      setStatusMessage('Both players connected! Choose a game to play.');
      setSearchQuery('');
      setSearchResults({ players: [], games: [] });
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Failed to join game');
    }
  };

  const handleCreateGame = async () => {
    // Prevent creating a new game if there's an active game in progress
    const hasActiveGame = currentGame?.activeStage && 
      (currentGame.activeStage === 'ROCK_PAPER_SCISSORS' || currentGame.activeStage === 'GAME_OF_GO' || currentGame.activeStage === 'MATCHING_PENNIES');
    const isGameInProgress = currentGame?.status === 'IN_PROGRESS' || 
      (currentGame?.status === 'READY' && currentGame?.activeStage && currentGame?.activeStage !== null);
    
    if (hasActiveGame || isGameInProgress) {
      setStatusMessage('Cannot create a new game while a game is in progress. Please end the current game first.');
      return;
    }

    setCreatingGame(true);
    try {
      const { data } = await api.post('/games/create');
      setCurrentGame(data.game);
      setStatusMessage('Share the code with your challenger to start playing.');
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Failed to create game');
    } finally {
      setCreatingGame(false);
    }
  };


  return (
    <div className="glass-panel p-6 text-white">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Online Players</h2>
        <p className="text-sm text-white/60">Search for players or join games by code, enrollment number, or name</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-aurora"
          >
            <option value="all">All</option>
            <option value="code">Code</option>
            <option value="enrollment">Enrollment</option>
            <option value="name">Name</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === 'code' ? 'Enter game code...' :
              searchType === 'enrollment' ? 'Enter enrollment number...' :
              searchType === 'name' ? 'Enter player name...' :
              'Search by code, enrollment, or name...'
            }
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-aurora"
          />
        </div>
      </div>

      {/* Search Results */}
      {loading && (
        <div className="text-center py-8 text-white/60">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-aurora/30 border-t-aurora" />
          <p className="mt-2">Searching...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* Available Games */}
          {searchResults.games && searchResults.games.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {searchQuery.trim() ? 'Available Games' : 'All Available Games'}
              </h3>
              <div className="space-y-3">
                {searchResults.games.map((game) => (
                  <div
                    key={game._id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-white/50 mb-1">Game Code: {game.code}</p>
                      <p className="font-semibold">
                        {game.host?.studentName || game.host?.username || 'Host'}
                        {game.guest ? ` vs ${game.guest?.studentName || game.guest?.username || 'Guest'}` : ' (Waiting for opponent)'}
                      </p>
                      {game.host?.enrollmentNo && (
                        <p className="text-xs text-white/40 mt-1">Host Enrollment: {game.host.enrollmentNo}</p>
                      )}
                    </div>
                    {!game.guest && game.host?._id !== user?._id && (
                      <button
                        onClick={() => handleJoinGame(game.code)}
                        className="ml-4 rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition"
                      >
                        Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Players */}
          {searchResults.players && searchResults.players.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {searchQuery.trim() ? 'Players' : 'All Online Players'}
              </h3>
              <div className="space-y-3">
                {searchResults.players.map((player) => (
                  <div
                    key={player._id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">
                        {player.studentName || player.username || player.email}
                      </p>
                      {player.enrollmentNo && (
                        <p className="text-sm text-white/60">Enrollment: {player.enrollmentNo}</p>
                      )}
                      {player.fullName && (
                        <p className="text-xs text-white/40 mt-1">{player.fullName}</p>
                      )}
                    </div>
                    <button
                      onClick={handleCreateGame}
                      className="ml-4 rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition"
                    >
                      Challenge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && searchResults.games?.length === 0 && searchResults.players?.length === 0 && (
            <div className="text-center py-8 text-white/50">
              {searchQuery.trim() ? 'No results found' : 'No players or games available'}
            </div>
          )}
        </div>
      )}

      {/* Game Creation Flow - Show code when game is created */}
      {currentGame && !currentGame.guest && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-r from-royal/30 to-pulse/20 p-6 text-center">
          <p className="text-sm uppercase tracking-[0.5em] text-white/60 mb-4">Arena Code</p>
          <div className="relative inline-block">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(currentGame.code);
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              }}
              className="text-4xl md:text-5xl font-display font-semibold tracking-[0.3em] text-white hover:text-aurora transition-colors cursor-pointer select-none"
              style={{
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {currentGame.code}
            </button>
          </div>
          <p className="mt-6 text-white/70">Share the code with your challenger to start playing.</p>
        </div>
      )}

      {/* Show game selector when both players connected */}
      {currentGame?.guest && (
        <div className="mt-6">
          <GameSelector currentGame={currentGame} />
        </div>
      )}
    </div>
  );
};

export default OnlinePlayers;

