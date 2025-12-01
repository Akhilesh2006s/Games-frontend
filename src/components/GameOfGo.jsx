import { useCallback, useEffect, useState, useRef } from 'react';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

const GameOfGo = () => {
  const { currentGame, statusMessage, setStatusMessage, setCurrentGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverIntersection, setHoverIntersection] = useState(null); // { row, col } or null
  const [board, setBoard] = useState(() => {
    const size = Number(currentGame?.goBoardSize) || 9;
    console.log('Initial board state - Size:', size);
    return Array(size).fill(null).map(() => Array(size).fill(null));
  });
  const [currentTurn, setCurrentTurn] = useState('black'); // 'black' or 'white'
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [capturedWhite, setCapturedWhite] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [gamePhase, setGamePhase] = useState('PLAY'); // 'PLAY', 'SCORING', 'COMPLETE'
  const [finalScore, setFinalScore] = useState(null);
  const [timeInfo, setTimeInfo] = useState({ black: null, white: null });

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
      const size = Number(data.game.goBoardSize) || 9;
      console.log('Refreshing game details - Board size from server:', size, 'Current game state:', currentGame?.goBoardSize);
      setCurrentGame(data.game);
      if (data.game.goBoard && Array.isArray(data.game.goBoard) && data.game.goBoard.length === size) {
        setBoard(data.game.goBoard);
      } else {
        // Initialize empty board if not set
        console.log('Initializing board with size:', size);
        setBoard(Array(size).fill(null).map(() => Array(size).fill(null)));
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
      if (data.game.goPhase) {
        setGamePhase(data.game.goPhase);
      }
      if (data.game.goFinalScore) {
        setFinalScore(data.game.goFinalScore);
      }
      // Load time info if available
      if (data.game.goTimeControl && data.game.goTimeControl.mode !== 'none') {
        // Calculate time remaining using server's time state and elapsed time
        const blackState = data.game.goTimeState?.black;
        const whiteState = data.game.goTimeState?.white;
        
        if (blackState && whiteState) {
          // Calculate elapsed time from server's last move time
          const elapsed = data.game.goLastMoveTime 
            ? Math.floor((new Date() - new Date(data.game.goLastMoveTime)) / 1000)
            : 0;
          
          // Only count down for the active player
          const blackTime = {
            mode: data.game.goTimeControl.mode,
            mainTime: data.game.goCurrentTurn === 'black' 
              ? Math.max(0, blackState.mainTime - elapsed)
              : blackState.mainTime,
            isByoYomi: blackState.isByoYomi,
            byoYomiTime: blackState.isByoYomi 
              ? (data.game.goCurrentTurn === 'black'
                  ? Math.max(0, blackState.byoYomiTime - elapsed)
                  : blackState.byoYomiTime)
              : null,
            byoYomiPeriods: blackState.isByoYomi ? blackState.byoYomiPeriods : null,
          };
          
          const whiteTime = {
            mode: data.game.goTimeControl.mode,
            mainTime: data.game.goCurrentTurn === 'white'
              ? Math.max(0, whiteState.mainTime - elapsed)
              : whiteState.mainTime,
            isByoYomi: whiteState.isByoYomi,
            byoYomiTime: whiteState.isByoYomi
              ? (data.game.goCurrentTurn === 'white'
                  ? Math.max(0, whiteState.byoYomiTime - elapsed)
                  : whiteState.byoYomiTime)
              : null,
            byoYomiPeriods: whiteState.isByoYomi ? whiteState.byoYomiPeriods : null,
          };
          
          setTimeInfo({ black: blackTime, white: whiteTime });
          // Initialize last tick time and server update time
          lastTickRef.current = Date.now();
          lastServerUpdateRef.current = Date.now();
          serverTimeInfoRef.current = { black: blackTime, white: whiteTime };
        }
      }
    } catch (err) {
      console.error('Failed to refresh arena state', err);
    }
  }, [currentGame?.code, setCurrentGame, myColor]);

  useEffect(() => {
    refreshGameDetails();
  }, [refreshGameDetails]);

  // Force refresh when game becomes active or board size might have changed
  useEffect(() => {
    if (currentGame?.activeStage === 'GAME_OF_GO' && currentGame?.code) {
      refreshGameDetails();
    }
  }, [currentGame?.activeStage, currentGame?.code, refreshGameDetails]);

  // Update board when board size changes
  useEffect(() => {
    if (currentGame?.goBoardSize) {
      const size = Number(currentGame.goBoardSize);
      console.log('Board size effect triggered - Size:', size, 'Current board length:', board.length);
      if (currentGame.goBoard && Array.isArray(currentGame.goBoard) && currentGame.goBoard.length === size) {
        console.log('Using existing board from game state');
        setBoard(currentGame.goBoard);
      } else if (board.length !== size) {
        // Board size changed, reinitialize
        console.log('Reinitializing board - Old size:', board.length, 'New size:', size);
        setBoard(Array(size).fill(null).map(() => Array(size).fill(null)));
      }
    }
  }, [currentGame?.goBoardSize, currentGame?.goBoard, board.length]);

  // Draw the board on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    if (!container) return;

    const drawBoard = () => {
      // Get current board size from game state
      const currentBoardSize = Number(currentGame?.goBoardSize) || 9;
      console.log('Drawing board - Board size:', currentBoardSize, 'Board array length:', board.length);
      
      // Set canvas size
      const containerWidth = container.offsetWidth;
      const boardSizePx = Math.min(containerWidth - 40, 600);
      canvas.width = boardSizePx;
      canvas.height = boardSizePx;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Board background
      ctx.fillStyle = 'rgba(180, 83, 9, 0.3)'; // amber-900/30
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const padding = 20;
      const availableWidth = canvas.width - padding * 2;
      const availableHeight = canvas.height - padding * 2;
      const gridSize = Math.min(availableWidth, availableHeight) / (currentBoardSize - 1);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let i = 0; i < currentBoardSize; i++) {
        const pos = padding + i * gridSize;

        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, padding + (currentBoardSize - 1) * gridSize);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(padding + (currentBoardSize - 1) * gridSize, pos);
        ctx.stroke();
      }

      // Draw star points (hoshi) for 9x9, 13x13, 19x19 boards
      if (currentBoardSize >= 9) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        const starPoints = currentBoardSize === 9 
          ? [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]]
          : currentBoardSize === 13
          ? [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]]
          : currentBoardSize === 19
          ? [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]]
          : [];

        starPoints.forEach(([row, col]) => {
          const x = padding + col * gridSize;
          const y = padding + row * gridSize;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw stones
      const stoneRadius = gridSize * 0.4;
      for (let row = 0; row < currentBoardSize; row++) {
        for (let col = 0; col < currentBoardSize; col++) {
          if (board[row] && board[row][col]) {
            const x = padding + col * gridSize;
            const y = padding + row * gridSize;
            const color = board[row][col];

            // Stone shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(x + 1, y + 1, stoneRadius, 0, Math.PI * 2);
            ctx.fill();

            // Stone
            if (color === 'black') {
              ctx.fillStyle = '#000000';
            } else {
              ctx.fillStyle = '#FFFFFF';
            }
            ctx.beginPath();
            ctx.arc(x, y, stoneRadius, 0, Math.PI * 2);
            ctx.fill();

            // Stone border
            ctx.strokeStyle = color === 'black' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Last move indicator
            if (lastMove && lastMove.row === row && lastMove.col === col) {
              ctx.fillStyle = '#53ffe3'; // aurora color
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Draw hover cursor at intersection (always show when hovering)
      if (hoverIntersection !== null) {
        const { row, col } = hoverIntersection;
        const x = padding + col * gridSize;
        const y = padding + row * gridSize;
        const isValid = board[row] && board[row][col] === null && isMyTurn && isJoined;

        if (isValid) {
          // Valid move - show preview stone with current turn color
          ctx.strokeStyle = 'rgba(83, 255, 227, 0.8)'; // aurora color
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, stoneRadius * 0.7, 0, Math.PI * 2);
          ctx.stroke();

          // Preview fill with current turn color
          ctx.fillStyle = currentTurn === 'black' 
            ? 'rgba(0, 0, 0, 0.4)' 
            : 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(x, y, stoneRadius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Invalid position or not your turn - show small crosshair indicator
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1.5;
          const indicatorSize = 8;
          ctx.beginPath();
          ctx.moveTo(x - indicatorSize, y);
          ctx.lineTo(x + indicatorSize, y);
          ctx.moveTo(x, y - indicatorSize);
          ctx.lineTo(x, y + indicatorSize);
          ctx.stroke();
        }
      }
    };

    drawBoard();

    // Handle window resize
    const handleResize = () => {
      drawBoard();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [board, currentGame?.goBoardSize, hoverIntersection, isMyTurn, isJoined, lastMove, currentTurn]);

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
      if (payload.timeInfo) {
        // Server sends current remaining time - use it directly as source of truth
        setTimeInfo(payload.timeInfo);
        // Reset last tick time and server update time so timer continues smoothly
        lastTickRef.current = Date.now();
        lastServerUpdateRef.current = Date.now();
        serverTimeInfoRef.current = payload.timeInfo;
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

    const handleGuestJoined = (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
      }
      setStatusMessage(`${payload.guestName} is here. Ready to play Game of Go.`);
      refreshGameDetails();
    };

    const handlePass = (payload) => {
      if (payload.currentTurn) {
        setCurrentTurn(payload.currentTurn);
        setIsMyTurn(payload.currentTurn === myColor);
      }
      if (payload.phase) {
        setGamePhase(payload.phase);
      }
      if (payload.timeInfo) {
        // Server sends current remaining time - use it directly as source of truth
        setTimeInfo(payload.timeInfo);
        // Reset last tick time and server update time so timer continues smoothly
        lastTickRef.current = Date.now();
        lastServerUpdateRef.current = Date.now();
        serverTimeInfoRef.current = payload.timeInfo;
      }
      if (payload.message) {
        setStatusMessage(payload.message);
      }
      if (payload.gameComplete) {
        setStatusMessage(payload.message || 'Game ended. Both players passed.');
      }
      refreshGameDetails();
    };

    const handleTimeUpdate = (payload) => {
      if (payload.timeInfo) {
        // Server sends current remaining time - use it directly as source of truth
        setTimeInfo(payload.timeInfo);
        // Reset last tick time and server update time so timer continues smoothly
        lastTickRef.current = Date.now();
        lastServerUpdateRef.current = Date.now();
        serverTimeInfoRef.current = payload.timeInfo;
      }
    };

    const handleTimeExpired = (payload) => {
      setGamePhase('COMPLETE');
      setStatusMessage(payload.message || 'Time expired!');
      refreshGameDetails();
    };

    const handleScoreFinalized = (payload) => {
      setGamePhase('COMPLETE');
      setFinalScore(payload);
      setStatusMessage(payload.message || 'Game complete! Final scores calculated.');
      refreshGameDetails();
    };

    const handleError = (message) => setStatusMessage(message);

    socket.on('goMove', handleMove);
    socket.on('goPass', handlePass);
    socket.on('goTimeUpdate', handleTimeUpdate);
    socket.on('goTimeExpired', handleTimeExpired);
    socket.on('goScoreFinalized', handleScoreFinalized);
    socket.on('game:joined', handleJoined);
    socket.on('game:peer_joined', handlePeerJoined);
    socket.on('game:guest_joined', handleGuestJoined);
    socket.on('game:started', (payload) => {
      if (payload.game) {
        setCurrentGame(payload.game);
        refreshGameDetails();
      }
    });
    socket.on('game:error', handleError);

    return () => {
      socket.off('goMove', handleMove);
      socket.off('goPass', handlePass);
      socket.off('goTimeUpdate', handleTimeUpdate);
      socket.off('goTimeExpired', handleTimeExpired);
      socket.off('goScoreFinalized', handleScoreFinalized);
      socket.off('game:joined', handleJoined);
      socket.off('game:peer_joined', handlePeerJoined);
      socket.off('game:guest_joined', handleGuestJoined);
      socket.off('game:started');
      socket.off('game:error', handleError);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, socket, myColor]);

  // Get intersection coordinates from mouse position
  const getIntersectionFromMouse = useCallback((e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 20;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;
    const currentBoardSize = Number(currentGame?.goBoardSize) || 9;
    const gridSize = Math.min(availableWidth, availableHeight) / (currentBoardSize - 1);

    // Calculate intersection
    const intersectionX = Math.round((x - padding) / gridSize);
    const intersectionY = Math.round((y - padding) / gridSize);

    // Clamp to valid board range
    if (intersectionX >= 0 && intersectionX < currentBoardSize && intersectionY >= 0 && intersectionY < currentBoardSize) {
      return { row: intersectionY, col: intersectionX };
    }
    return null;
  }, [currentGame?.goBoardSize]);

  const handleMouseMove = useCallback((e) => {
    const intersection = getIntersectionFromMouse(e);
    setHoverIntersection(intersection);
  }, [getIntersectionFromMouse]);

  const handleMouseLeave = useCallback(() => {
    setHoverIntersection(null);
  }, []);

  const handleCanvasClick = useCallback((e) => {
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

    const intersection = getIntersectionFromMouse(e);
    if (!intersection) return;

    const { row, col } = intersection;

    if (board[row] && board[row][col] !== null) {
      setStatusMessage('This position is already occupied.');
      return;
    }

    socket.emit('submitGoMove', {
      code: currentGame.code,
      row,
      col,
      color: myColor,
    });
  }, [socket, currentGame, isJoined, isMyTurn, isConnected, getIntersectionFromMouse, board, myColor, setStatusMessage]);

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

  const handleEndGame = () => {
    if (!socket || !currentGame || !isJoined) {
      setStatusMessage('Not connected to game.');
      return;
    }

    if (gamePhase === 'COMPLETE') {
      setStatusMessage('Game is already complete.');
      return;
    }

    const confirmEnd = window.confirm('Are you sure you want to end the game? The winner will be determined by current score.');
    if (!confirmEnd) return;

    // Force end game by calculating score immediately
    socket.emit('finalizeGoScore', { 
      code: currentGame.code, 
      method: 'chinese' // Default to Chinese scoring
    });
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Client-side timer for smooth countdown (only for display, server is source of truth)
  const lastTickRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const lastServerUpdateRef = useRef(Date.now());
  const serverTimeInfoRef = useRef(null);

  // Store server time info when received
  useEffect(() => {
    if (timeInfo.black || timeInfo.white) {
      serverTimeInfoRef.current = timeInfo;
      lastServerUpdateRef.current = Date.now();
    }
  }, [timeInfo]);

  // Start/stop timer based on game phase
  useEffect(() => {
    if (!timeInfo.black || !timeInfo.white || gamePhase !== 'PLAY') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();

        // Check if we've received a server update recently (within last 3 seconds)
        // If not, don't count down (wait for server update)
        const timeSinceServerUpdate = (now - lastServerUpdateRef.current) / 1000;
        if (timeSinceServerUpdate > 3) {
          // No recent server update, don't count down
          return;
        }

        setTimeInfo((prev) => {
          if (!prev.black || !prev.white) return prev;
          
          const updated = { ...prev };

          // Only count down for the ACTIVE player - decrement by exactly 1 second
          if (currentTurn === 'black' && prev.black) {
            if (prev.black.isByoYomi) {
              // Byo Yomi: decrement byoYomiTime by 1 second
              const newByoYomiTime = Math.max(0, prev.black.byoYomiTime - 1);
              updated.black = {
                ...prev.black,
                byoYomiTime: newByoYomiTime,
              };
            } else {
              // Fischer: decrement mainTime by 1 second
              const newMainTime = Math.max(0, prev.black.mainTime - 1);
              updated.black = {
                ...prev.black,
                mainTime: newMainTime,
              };
            }
          } else if (currentTurn === 'white' && prev.white) {
            if (prev.white.isByoYomi) {
              // Byo Yomi: decrement byoYomiTime by 1 second
              const newByoYomiTime = Math.max(0, prev.white.byoYomiTime - 1);
              updated.white = {
                ...prev.white,
                byoYomiTime: newByoYomiTime,
              };
            } else {
              // Fischer: decrement mainTime by 1 second
              const newMainTime = Math.max(0, prev.white.mainTime - 1);
              updated.white = {
                ...prev.white,
                mainTime: newMainTime,
              };
            }
          }

          return updated;
        });
      }, 1000); // Update every 1 second for accurate countdown
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentTurn, gamePhase, timeInfo]);

  // PlayerClock Component
  const PlayerClock = ({ color, timeInfo, isActive, playerName }) => {
    if (!timeInfo) return null;

    const displayTime = timeInfo.isByoYomi ? timeInfo.byoYomiTime : timeInfo.mainTime;
    const isLowTime = displayTime < 5 && displayTime > 0;

    return (
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">
          {playerName} ({color === 'black' ? 'Black' : 'White'})
        </p>
        <div className={`text-3xl font-bold font-mono transition-colors ${
          isActive && gamePhase === 'PLAY' 
            ? isLowTime 
              ? 'text-pulse animate-pulse' 
              : 'text-aurora' 
            : 'text-white'
        }`}>
          {formatTime(displayTime)}
        </div>
        {timeInfo.mode === 'fischer' && !timeInfo.isByoYomi && (
          <p className="text-xs text-white/50 mt-1">+{currentGame?.goTimeControl?.increment || 0}s per move</p>
        )}
        {timeInfo.isByoYomi && (
          <div className="mt-1">
            <p className="text-xs text-white/60">
              Periods: <span className="font-bold">{timeInfo.byoYomiPeriods}</span>
            </p>
          </div>
        )}
      </div>
    );
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
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-1">⚫ Black</p>
            <p className="text-sm font-semibold text-white mb-2">
              {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
            </p>
            <PlayerClock
              color="black"
              timeInfo={timeInfo.black}
              isActive={currentTurn === 'black' && gamePhase === 'PLAY'}
              playerName={currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
            />
            <p className="text-lg font-bold text-white mt-2">
              Captured: {capturedWhite}
            </p>
          </div>
          <div className="text-center px-4">
            <p className="text-xs text-white/60 mb-1">Current Turn</p>
            <p className={`text-3xl font-semibold ${currentTurn === 'black' ? 'text-white' : 'text-white/40'}`}>
              {currentTurn === 'black' ? '⚫' : '⚪'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {isMyTurn ? 'Your turn!' : 'Opponent\'s turn'}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-1">⚪ White</p>
            <p className="text-sm font-semibold text-white mb-2">
              {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            </p>
            <PlayerClock
              color="white"
              timeInfo={timeInfo.white}
              isActive={currentTurn === 'white' && gamePhase === 'PLAY'}
              playerName={currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            />
            <p className="text-lg font-bold text-white mt-2">
              Captured: {capturedBlack}
            </p>
          </div>
        </div>
        <p className="mt-4 text-white/60">{statusMessage || 'Place stones to capture territory and opponent stones.'}</p>
      </header>

      <div className="flex justify-center">
        <div 
          ref={containerRef}
          className="relative bg-amber-900/30 p-4 rounded-2xl border border-amber-800/50"
          style={{ maxWidth: '600px', width: '100%' }}
        >
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
            className="w-full h-auto"
                  style={{
              cursor: isMyTurn && isJoined ? 'none' : 'default',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Winner Display */}
      {gamePhase === 'COMPLETE' && finalScore && (
        <div className="rounded-2xl border-2 border-aurora/50 bg-gradient-to-br from-aurora/20 to-royal/20 p-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Game Complete!</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-2">Black</p>
              <p className="text-3xl font-bold text-white mb-2">{finalScore.black?.score || 0}</p>
              <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                <p>Stones on board: {finalScore.black?.stones || 0}</p>
                <p>Controlled territory: {finalScore.black?.territory || 0}</p>
                <p className="font-semibold text-white mt-2">
                  Total = {finalScore.black?.stones || 0} + {finalScore.black?.territory || 0} = {finalScore.black?.score || 0}
                </p>
              </div>
                    </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-2">White</p>
              <p className="text-3xl font-bold text-white mb-2">{finalScore.white?.score || 0}</p>
              <div className="text-xs text-white/70 space-y-1 border-t border-white/20 pt-2">
                <p>Stones on board: {finalScore.white?.stones || 0}</p>
                <p>Controlled territory: {finalScore.white?.territory || 0}</p>
                <p>Komi (compensation): +{finalScore.komi || 0}</p>
                <p className="font-semibold text-white mt-2">
                  Total = {finalScore.white?.stones || 0} + {finalScore.white?.territory || 0} + {finalScore.komi || 0} = {finalScore.white?.score || 0}
                </p>
                    </div>
                    </div>
          </div>
          {finalScore.winner && (
            <div className="mt-4">
              <p className="text-lg font-semibold text-white/80 mb-2">Winner:</p>
              <p className="text-3xl font-bold text-aurora">
                {finalScore.winner === 'black' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Black'} (Black)`
                  : `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'White'} (White)`
                }
              </p>
              {finalScore.winner === null && (
                <p className="text-xl font-semibold text-white mt-2">It's a Draw!</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handlePass}
          disabled={!isMyTurn || !isJoined || gamePhase !== 'PLAY'}
          className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-sm font-semibold">Pass</p>
          <p className="text-xs text-white/60 mt-1">Skip your turn</p>
        </button>
        {gamePhase !== 'COMPLETE' && currentGame?.guest && (
          <button
            onClick={handleEndGame}
            disabled={!isJoined || gamePhase === 'COMPLETE'}
            className="flex-1 rounded-lg border border-red-500/50 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            End Game
          </button>
        )}
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

      {/* Match Archive */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-1">MATCH ARCHIVE</p>
            <p className="text-sm text-white/70">Recent runs</p>
          </div>
          <button
            onClick={refreshGameDetails}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            REFRESH
          </button>
        </div>
        <div className="text-sm text-white/60 text-center py-4">
          No archived matches yet. Complete games will appear here.
        </div>
      </div>
    </section>
  );
};

export default GameOfGo;

