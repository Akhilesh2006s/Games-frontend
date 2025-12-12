import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';

const OnlinePlayers = ({ onJoinGame }) => {
  const { currentGame, setCurrentGame, setStatusMessage, setSelectedGameType } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'code', 'enrollment', 'name'
  const [searchResults, setSearchResults] = useState({ players: [], games: [] });
  const [loading, setLoading] = useState(false);
  const [creatingGame, setCreatingGame] = useState(false);
  
  // Filter to only show players who created game codes (hosts of games waiting for opponents)
  const playersWithCodes = useMemo(() => {
    if (!searchResults.games || searchResults.games.length === 0) return [];
    
    // Get games waiting for opponents (no guest)
    const waitingGames = searchResults.games.filter(game => !game.guest && game.host?._id !== user?._id);
    
    // Map to player objects with their game code and game details
    return waitingGames.map(game => {
      // Determine game type from pendingGameSettings or activeStage
      let gameType = 'Not Selected';
      let gameDetails = '';
      
      if (game.pendingGameSettings) {
        gameType = game.pendingGameSettings.gameType || 'Not Selected';
        if (gameType === 'GAME_OF_GO') {
          const settings = game.pendingGameSettings;
          const boardSize = settings.boardSize || game.goBoardSize || '9';
          const timeControl = settings.timeControl;
          if (timeControl && timeControl.mode && timeControl.mode !== 'none' && timeControl.mainTime > 0) {
            if (timeControl.mode === 'fischer') {
              gameDetails = `${boardSize}x${boardSize} • Fischer (${timeControl.mainTime}s + ${timeControl.increment || 0}s)`;
            } else if (timeControl.mode === 'japanese') {
              gameDetails = `${boardSize}x${boardSize} • Japanese Byo-Yomi (${timeControl.mainTime}s main, ${timeControl.byoYomiTime || 0}s periods)`;
            } else {
              gameDetails = `${boardSize}x${boardSize} • ${timeControl.mode}`;
            }
          } else {
            gameDetails = `${boardSize}x${boardSize} • No time control`;
          }
        } else if (gameType === 'ROCK_PAPER_SCISSORS') {
          gameDetails = '20 seconds per move';
        } else if (gameType === 'MATCHING_PENNIES') {
          gameDetails = '20 seconds per move';
        }
      } else if (game.activeStage) {
        gameType = game.activeStage;
        if (gameType === 'GAME_OF_GO') {
          const boardSize = game.goBoardSize || '9';
          const timeControl = game.goTimeControl;
          if (timeControl && timeControl.mode && timeControl.mode !== 'none' && timeControl.mainTime > 0) {
            if (timeControl.mode === 'fischer') {
              gameDetails = `${boardSize}x${boardSize} • Fischer (${timeControl.mainTime}s + ${timeControl.increment || 0}s)`;
            } else if (timeControl.mode === 'japanese') {
              gameDetails = `${boardSize}x${boardSize} • Japanese Byo-Yomi (${timeControl.mainTime}s main, ${timeControl.byoYomiTime || 0}s periods)`;
            } else {
              gameDetails = `${boardSize}x${boardSize} • ${timeControl.mode}`;
            }
          } else {
            gameDetails = `${boardSize}x${boardSize} • No time control`;
          }
        } else if (gameType === 'ROCK_PAPER_SCISSORS') {
          gameDetails = '20 seconds per move';
        } else if (gameType === 'MATCHING_PENNIES') {
          gameDetails = '20 seconds per move';
        }
      }
      
      return {
        _id: game.host?._id,
        username: game.host?.username,
        studentName: game.host?.studentName,
        email: game.host?.email,
        enrollmentNo: game.host?.enrollmentNo,
        gameCode: game.code,
        gameId: game._id,
        gameType,
        gameDetails,
      };
    });
  }, [searchResults.games, user?._id]);

  const loadPlayersAndGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/games/search', {
        params: { query: searchQuery || '', type: searchType },
      });
      // Debug: Log games data to see what we're getting
      if (data.games && data.games.length > 0) {
        console.log('Games with pendingGameSettings:', data.games.filter(g => g.pendingGameSettings).map(g => ({
          code: g.code,
          pendingGameSettings: g.pendingGameSettings,
          activeStage: g.activeStage
        })));
      }
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
      
      // Refresh game state to get latest data (including activeStage if auto-started)
      const { data: refreshedGame } = await api.get(`/games/code/${data.game.code}`);
      setCurrentGame(refreshedGame.game);
      
      // Set selected game type from pendingGameSettings or activeStage to trigger auto-start
      if (refreshedGame.game.pendingGameSettings?.gameType) {
        setSelectedGameType(refreshedGame.game.pendingGameSettings.gameType);
      } else if (refreshedGame.game.activeStage) {
        setSelectedGameType(refreshedGame.game.activeStage);
      }
      
      if (refreshedGame.game.activeStage) {
        setStatusMessage(`Game started! ${refreshedGame.game.activeStage === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' : refreshedGame.game.activeStage === 'MATCHING_PENNIES' ? 'Matching Pennies' : 'Game of Go'} is ready.`);
      } else {
        setStatusMessage('Both players connected! Choose a game to play.');
      }
      setSearchQuery('');
      setSearchResults({ players: [], games: [] });
      
      // Switch to arena view after joining
      if (onJoinGame) {
        onJoinGame();
      }
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
          {/* Online Players with Game Codes */}
          {playersWithCodes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Online Players ({playersWithCodes.length})
              </h3>
              <div className="space-y-3">
                {playersWithCodes.map((player, index) => (
                  <div
                    key={player.gameId || `${player._id}-${player.gameCode}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">
                        {player.studentName || player.username || player.email}
                      </p>
                      {player.enrollmentNo && (
                        <p className="text-sm text-white/60 mt-1">Enrollment: {player.enrollmentNo}</p>
                      )}
                      {player.gameType && player.gameType !== 'Not Selected' ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-aurora font-semibold">
                            {player.gameType === 'GAME_OF_GO' ? 'Game of Go' : 
                             player.gameType === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' :
                             player.gameType === 'MATCHING_PENNIES' ? 'Matching Pennies' : player.gameType}
                          </p>
                          {player.gameDetails && (
                            <p className="text-xs text-white/60">{player.gameDetails}</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs text-white/50 italic">No game selected yet</p>
                        </div>
                      )}
                      <p className="text-xs text-white/40 mt-2 font-mono">Game Code: {player.gameCode}</p>
                    </div>
                    <button
                      onClick={() => handleJoinGame(player.gameCode)}
                      className="ml-4 rounded-lg border border-aurora/50 bg-aurora/10 px-4 py-2 text-sm text-aurora hover:bg-aurora/20 transition"
                    >
                      Join Game
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && playersWithCodes.length === 0 && (
            <div className="text-center py-8 text-white/50">
              {searchQuery.trim() ? 'No players found' : 'No online players with available games'}
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

    </div>
  );
};

export default OnlinePlayers;

