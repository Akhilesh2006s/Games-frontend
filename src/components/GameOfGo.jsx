import { useCallback, useEffect, useState } from 'react';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

const BOARD_SIZE = 9;

const GameOfGo = () => {
  const { currentGame, statusMessage, setStatusMessage, setCurrentGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [currentTurn, setCurrentTurn] = useState('black'); // 'black' or 'white'
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [capturedWhite, setCapturedWhite] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  const { socket, isConnected, isJoined } = useSocket({
    enabled: Boolean(currentGame),
    roomCode: currentGame?.code,
  });

  const userId = user?._id || user?.id;
  const hostId = currentGame?.host?._id || currentGame?.host?.id;
  const isHost = Boolean(userId && hostId && userId === hostId);
  const myColor = isHost ? 'black' : 'white';

  const refreshGameDetails = useCallback(async () => {
    if (!currentGame?.code) return;
    try {
      const { data } = await api.get(`/games/code/${currentGame.code}`);
      setCurrentGame(data.game);
      if (data.game.goBoard) {
        setBoard(data.game.goBoard);
      } else {
        // Initialize empty board if not set
        setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
      }
      if (data.game.goCurrentTurn) {
        setCurrentTurn(data.game.goCurrentTurn);
        setIsMyTurn(data.game.goCurrentTurn === myColor);
      } else {
        setCurrentTurn('black');
        setIsMyTurn(myColor === 'black');
      }
      if (data.game.goCapturedBlack !== undefined) {
        setCapturedBlack(data.game.goCapturedBlack);
      }
      if (data.game.goCapturedWhite !== undefined) {
        setCapturedWhite(data.game.goCapturedWhite);
      }
    } catch (err) {
      console.error('Failed to refresh arena state', err);
    }
  }, [currentGame?.code, setCurrentGame, myColor]);

  useEffect(() => {
    refreshGameDetails();
  }, [refreshGameDetails]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleMove = (payload) => {
      if (payload.board) {
        setBoard(payload.board);
      }
      if (payload.currentTurn) {
        setCurrentTurn(payload.currentTurn);
        setIsMyTurn(payload.currentTurn === myColor);
      }
      if (payload.capturedBlack !== undefined) {
        setCapturedBlack(payload.capturedBlack);
      }
      if (payload.capturedWhite !== undefined) {
        setCapturedWhite(payload.capturedWhite);
      }
      if (payload.lastMove) {
        setLastMove(payload.lastMove);
      }
      if (payload.message) {
        setStatusMessage(payload.message);
      }
      refreshGameDetails();
    };

    const handleJoined = () => {
      if (currentGame?.guest) {
        setStatusMessage('Both players connected. Ready for Game of Go.');
      } else {
        setStatusMessage('Arena synced. Waiting for a challenger.');
      }
    };

    const handlePeerJoined = (username) => {
      setStatusMessage(`${username} joined your arena. Ready to play Go.`);
      refreshGameDetails();
    };

    const handlePass = (payload) => {
      if (payload.currentTurn) {
        setCurrentTurn(payload.currentTurn);
        setIsMyTurn(payload.currentTurn === myColor);
      }
      if (payload.message) {
        setStatusMessage(payload.message);
      }
      if (payload.gameComplete) {
        setStatusMessage(payload.message || 'Game ended. Both players passed.');
      }
      refreshGameDetails();
    };

    const handleError = (message) => setStatusMessage(message);

    socket.on('goMove', handleMove);
    socket.on('goPass', handlePass);
    socket.on('game:joined', handleJoined);
    socket.on('game:peer_joined', handlePeerJoined);
    socket.on('game:error', handleError);

    return () => {
      socket.off('goMove', handleMove);
      socket.off('goPass', handlePass);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:error', handleError);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, socket, myColor]);

  const handleCellClick = (row, col) => {
    if (!socket || !currentGame || !isJoined || !isMyTurn) {
      if (!isConnected) {
        setStatusMessage('Connecting to arena...');
      } else if (!isJoined) {
        setStatusMessage('Joining game room...');
      } else if (!isMyTurn) {
        setStatusMessage('Wait for your opponent to make a move.');
      }
      return;
    }

    if (board[row][col] !== null) {
      setStatusMessage('This position is already occupied.');
      return;
    }

    socket.emit('submitGoMove', {
      code: currentGame.code,
      row,
      col,
      color: myColor,
    });
  };

  const handlePass = () => {
    if (!socket || !currentGame || !isJoined || !isMyTurn) {
      if (!isConnected) {
        setStatusMessage('Connecting to arena...');
      } else if (!isJoined) {
        setStatusMessage('Joining game room...');
      } else if (!isMyTurn) {
        setStatusMessage('Wait for your opponent to make a move.');
      }
      return;
    }

    socket.emit('passGo', { code: currentGame.code });
  };

  if (!currentGame) {
    return (
      <div className="glass-panel p-6 text-center text-white/70">
        Create or join a code to boot into the Game of Go arena.
      </div>
    );
  }

  return (
    <section className="glass-panel space-y-6 p-6 text-white">
      <header>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 02</p>
            <h3 className="text-2xl font-semibold">Game of Go • Strategic Nebula</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-white/50">
              {isConnected ? (isJoined ? 'Joined' : 'Connecting...') : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {currentGame?.host?.username || 'Host'} (Black)
            </p>
            <p className="text-2xl font-bold text-white">
              Captured: {capturedWhite}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/60">Current Turn</p>
            <p className={`text-2xl font-semibold ${currentTurn === 'black' ? 'text-white' : 'text-white/40'}`}>
              {currentTurn === 'black' ? '⚫' : '⚪'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {isMyTurn ? 'Your turn!' : 'Opponent\'s turn'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              {currentGame?.guest?.username || 'Guest'} (White)
            </p>
            <p className="text-2xl font-bold text-white">
              Captured: {capturedBlack}
            </p>
          </div>
        </div>
        <p className="mt-4 text-white/60">{statusMessage || 'Place stones to capture territory and opponent stones.'}</p>
      </header>

      <div className="flex justify-center">
        <div className="relative bg-amber-900/30 p-4 rounded-2xl border border-amber-800/50">
          <div className="grid grid-cols-9 gap-0" style={{ width: '100%', maxWidth: '500px' }}>
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
              const row = Math.floor(index / BOARD_SIZE);
              const col = index % BOARD_SIZE;
              const cellValue = board[row][col];
              const isLastMove = lastMove && lastMove.row === row && lastMove.col === col;

              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => handleCellClick(row, col)}
                  disabled={!isMyTurn || cellValue !== null}
                  className={`
                    aspect-square border border-white/10 bg-amber-900/20
                    hover:bg-amber-800/30 transition-all
                    ${cellValue === 'black' ? 'bg-black' : cellValue === 'white' ? 'bg-white' : ''}
                    ${isLastMove ? 'ring-2 ring-aurora' : ''}
                    ${!isMyTurn || cellValue !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    relative
                  `}
                  style={{
                    minWidth: '40px',
                    minHeight: '40px',
                  }}
                >
                  {cellValue === 'black' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3/4 h-3/4 rounded-full bg-black border border-white/20" />
                    </div>
                  )}
                  {cellValue === 'white' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3/4 h-3/4 rounded-full bg-white border border-gray-400" />
                    </div>
                  )}
                  {isLastMove && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-aurora" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handlePass}
          disabled={!isMyTurn || !isJoined}
          className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-sm font-semibold">Pass</p>
          <p className="text-xs text-white/60 mt-1">Skip your turn</p>
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">Game Rules</p>
        <ul className="text-sm text-white/70 space-y-1">
          <li>• Black plays first, then players alternate turns</li>
          <li>• Place stones on intersections to surround territory</li>
          <li>• Stones with no liberties (adjacent empty spaces) are captured</li>
          <li>• Cannot place stone that captures your own group (Suicide Rule)</li>
          <li>• Cannot recreate previous board position (Ko Rule)</li>
          <li>• Pass when no beneficial moves available</li>
          <li>• Game ends when both players pass consecutively</li>
          <li>• The player with more captured stones wins</li>
        </ul>
      </div>
    </section>
  );
};

export default GameOfGo;

