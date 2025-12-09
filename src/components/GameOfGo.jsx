import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/useGameStore';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import RematchModal from './RematchModal';

const GameOfGo = () => {
  const { selectedGameType, setSelectedGameType, currentGame, statusMessage, setStatusMessage, setCurrentGame, resetGame } = useGameStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
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
  const [rematchModal, setRematchModal] = useState({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
  const [startConfirmModal, setStartConfirmModal] = useState({ isOpen: false, gameSettings: null });
  const [rematchStartModal, setRematchStartModal] = useState({ isOpen: false, opponentName: '', gameSettings: null });

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
      // Only set finalScore if game is actually complete
      if (data.game.goFinalScore && (data.game.status === 'COMPLETE' || data.game.goPhase === 'COMPLETE')) {
        setFinalScore(data.game.goFinalScore);
      } else if (data.game.status !== 'COMPLETE' && data.game.goPhase !== 'COMPLETE') {
        // Clear finalScore if game is not complete
        setFinalScore(null);
      }
      // Load time info if available
      if (data.game.goTimeControl && data.game.goTimeControl.mode !== 'none') {
        // Use stored time directly - server already decrements it, no need to recalculate elapsed time
        const blackState = data.game.goTimeState?.black;
        const whiteState = data.game.goTimeState?.white;
        
        if (blackState && whiteState) {
          // Use stored time directly (server handles decrementing via interval)
          const blackTime = {
            mode: data.game.goTimeControl.mode,
            mainTime: blackState.mainTime,
            isByoYomi: blackState.isByoYomi,
            byoYomiTime: blackState.isByoYomi ? blackState.byoYomiTime : null,
            byoYomiPeriods: blackState.isByoYomi ? blackState.byoYomiPeriods : null,
          };
          
          const whiteTime = {
            mode: data.game.goTimeControl.mode,
            mainTime: whiteState.mainTime,
            isByoYomi: whiteState.isByoYomi,
            byoYomiTime: whiteState.isByoYomi ? whiteState.byoYomiTime : null,
            byoYomiPeriods: whiteState.isByoYomi ? whiteState.byoYomiPeriods : null,
          };
          
          setTimeInfo({ black: blackTime, white: whiteTime });
          // Initialize server update time
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

  // Auto-start game when both players are connected (but not during rematch)
  useEffect(() => {
    if (
      isHost &&
      currentGame?.status === 'READY' &&
      currentGame?.activeStage === 'GAME_OF_GO' &&
      currentGame?.guest &&
      !rematchStartModal.isOpen && // Don't auto-start if rematch modal is open
      gamePhase === 'PLAY' &&
      !board.some(row => row && row.some(cell => cell !== null)) // No moves made yet
    ) {
      // Auto-start the game
      const startGame = async () => {
        if (!currentGame?.code) return;
        try {
          const requestBody = {
            code: currentGame.code,
            boardSize: currentGame.goBoardSize || 9,
          };
          
          if (currentGame.goTimeControl && currentGame.goTimeControl.mode && currentGame.goTimeControl.mode !== 'none') {
            requestBody.timeControl = currentGame.goTimeControl;
          }
          
          await api.post('/games/start-go', requestBody);
          setStatusMessage('Game started! Black plays first.');
        } catch (err) {
          console.error('Failed to auto-start game:', err);
          setStatusMessage(err.response?.data?.message || 'Failed to start game');
        }
      };
      
      // Small delay to ensure everything is ready
      const timer = setTimeout(startGame, 500);
      return () => clearTimeout(timer);
    }
  }, [isHost, currentGame?.status, currentGame?.activeStage, currentGame?.guest, currentGame?.code, currentGame?.goBoardSize, currentGame?.goTimeControl, rematchStartModal.isOpen, gamePhase, board]);

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
      // Set finalScore with reason but NO scoring details
      setFinalScore({
        winner: payload.winner,
        reason: 'timeout',
        message: payload.message,
      });
      setStatusMessage(payload.message || 'Time expired');
      refreshGameDetails();
    };

    const handleResigned = (payload) => {
      setGamePhase('COMPLETE');
      // Set finalScore with reason but NO scoring details
      setFinalScore({
        winner: payload.winner,
        reason: 'resignation',
        message: payload.message,
      });
      setStatusMessage(payload.message || 'Game resigned');
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
    socket.on('goResigned', handleResigned);
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

    // Rematch handlers
    const handleRematchRequest = (payload) => {
      const opponentName = payload.requesterName || 'Opponent';
      setRematchModal({
        isOpen: true,
        opponentName,
        requesterId: payload.requesterId,
        gameType: payload.gameType,
        gameSettings: payload.gameSettings,
      });
    };

    const handleRematchAccepted = async (payload) => {
      setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
      setRematchStartModal({ isOpen: false, opponentName: '', gameSettings: null });
      if (payload.game) {
        setCurrentGame(payload.game);
        // Set game type for auto-start
        if (payload.gameType) {
          setSelectedGameType(payload.gameType);
        } else if (!selectedGameType) {
          setSelectedGameType('GAME_OF_GO');
        }
        // Reset game state
        setFinalScore(null);
        setGamePhase('PLAY');
        setBoard(() => {
          const size = Number(payload.game?.goBoardSize || payload.gameSettings?.goBoardSize || 9);
          return Array(size).fill(null).map(() => Array(size).fill(null));
        });
        setCapturedBlack(0);
        setCapturedWhite(0);
        setCurrentTurn('black');
        setLastMove(null);
        // Reset time info - will be updated from server when game starts
        setTimeInfo({ black: null, white: null });
        
        // Get opponent name
        const opponentName = isHost 
          ? (payload.game?.guest?.studentName || payload.game?.guest?.username || 'Opponent')
          : (payload.game?.host?.studentName || payload.game?.host?.username || 'Opponent');
        
        // Join new game room first
        if (socket && payload.newCode) {
          socket.emit('joinGame', { code: payload.newCode });
        }
        
        // Auto-start the game immediately (host starts it)
        if (isHost && payload.game?.code) {
          try {
            const requestBody = {
              code: payload.game.code,
              boardSize: payload.game?.goBoardSize || 9,
            };
            
            if (payload.game?.goTimeControl && payload.game.goTimeControl.mode && payload.game.goTimeControl.mode !== 'none') {
              requestBody.timeControl = payload.game.goTimeControl;
            }
            
            // Wait a bit for room join to complete
            setTimeout(async () => {
              try {
                await api.post('/games/start-go', requestBody);
                setStatusMessage('Rematch started! Black plays first.');
              } catch (err) {
                console.error('Failed to start rematch:', err);
                setStatusMessage(err.response?.data?.message || 'Failed to start rematch');
              }
            }, 500);
          } catch (err) {
            console.error('Failed to prepare rematch start:', err);
          }
        } else {
          setStatusMessage(`${opponentName} accepted the rematch. Game starting...`);
        }
      }
    };

    const handleRematchRejected = (payload) => {
      setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
      setStatusMessage(`${payload.rejectorName || 'Opponent'} declined the rematch.`);
    };

    socket.on('rematch:requested', handleRematchRequest);
    socket.on('rematch:accepted', handleRematchAccepted);
    socket.on('rematch:rejected', handleRematchRejected);

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
      socket.off('rematch:requested', handleRematchRequest);
      socket.off('rematch:accepted', handleRematchAccepted);
      socket.off('rematch:rejected', handleRematchRejected);
    };
  }, [currentGame?.guest, refreshGameDetails, setStatusMessage, setCurrentGame, socket, myColor]);

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

    const confirmResign = window.confirm('Are you sure you want to resign? Your opponent will win.');
    if (!confirmResign) return;

    // Resign - ends game without scoring
    socket.emit('resignGo', { 
      code: currentGame.code
    });
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Client-side timer using real-time calculations
  // Track when server last sent time and calculate remaining based on real elapsed time
  const lastServerUpdateRef = useRef(Date.now());
  const serverTimeInfoRef = useRef(null);
  const intervalRef = useRef(null);

  // Store server time info when received
  useEffect(() => {
    if (timeInfo.black || timeInfo.white) {
      serverTimeInfoRef.current = timeInfo;
      lastServerUpdateRef.current = Date.now();
    }
  }, [timeInfo]);

  // Client-side smooth display using real-time calculations
  // Updates display every 100ms but calculates from server time + elapsed time
  useEffect(() => {
    if (!timeInfo.black || !timeInfo.white || gamePhase !== 'PLAY') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval for smooth display
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (!serverTimeInfoRef.current) return;

        const now = Date.now();
        const elapsedSinceUpdate = Math.floor((now - lastServerUpdateRef.current) / 1000);
        
        // Only update if at least 1 second has passed since last server update
        if (elapsedSinceUpdate < 1) return;

        setTimeInfo((prev) => {
          if (!prev.black || !prev.white || !serverTimeInfoRef.current) return prev;
          
          const updated = { ...prev };
          const serverTime = serverTimeInfoRef.current;

          // Calculate remaining time based on server time minus elapsed time
          // Only for the active player
          if (currentTurn === 'black' && prev.black && serverTime.black) {
            if (serverTime.black.isByoYomi) {
              const remaining = Math.max(0, serverTime.black.byoYomiTime - elapsedSinceUpdate);
              updated.black = {
                ...serverTime.black,
                byoYomiTime: remaining,
              };
            } else {
              const remaining = Math.max(0, serverTime.black.mainTime - elapsedSinceUpdate);
              updated.black = {
                ...serverTime.black,
                mainTime: remaining,
              };
            }
          } else if (currentTurn === 'white' && prev.white && serverTime.white) {
            if (serverTime.white.isByoYomi) {
              const remaining = Math.max(0, serverTime.white.byoYomiTime - elapsedSinceUpdate);
              updated.white = {
                ...serverTime.white,
                byoYomiTime: remaining,
              };
            } else {
              const remaining = Math.max(0, serverTime.white.mainTime - elapsedSinceUpdate);
              updated.white = {
                ...serverTime.white,
                mainTime: remaining,
              };
            }
          }

          return updated;
        });
      }, 100); // Update display every 100ms for smoothness
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
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 mb-1">
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
            <p className="text-base font-semibold text-white mb-2">
              {currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
            </p>
            <PlayerClock
              color="black"
              timeInfo={timeInfo.black}
              isActive={currentTurn === 'black' && gamePhase === 'PLAY'}
              playerName={currentGame?.host?.studentName || currentGame?.host?.username || 'Host'}
            />
            <p className="text-base font-semibold text-white/80 mt-2">
              Captured: <span className="text-aurora">{capturedBlack}</span>
            </p>
          </div>
          <div className="text-center px-6">
            <p className="text-xs text-white/60 mb-1">Current Turn</p>
            <p className={`text-3xl font-semibold ${currentTurn === 'black' ? 'text-white' : 'text-white/40'}`}>
              {currentTurn === 'black' ? '⚫' : '⚪'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {isMyTurn ? 'Your turn!' : 'Opponent\'s turn'}
            </p>
          </div>
          <div className="flex-1 ml-4 text-right">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-1">⚪ White</p>
            <p className="text-base font-semibold text-white mb-2">
              {currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            </p>
            <PlayerClock
              color="white"
              timeInfo={timeInfo.white}
              isActive={currentTurn === 'white' && gamePhase === 'PLAY'}
              playerName={currentGame?.guest?.studentName || currentGame?.guest?.username || 'Guest'}
            />
            <p className="text-base font-semibold text-white/80 mt-2">
              Captured: <span className="text-aurora">{capturedWhite}</span>
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
          {/* Only show scoring details if game ended normally (no reason field) */}
          {!finalScore.reason && finalScore.black && finalScore.white && (
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
          )}
          
          {finalScore.winner && (
            <div className="mt-4">
              <p className="text-lg font-semibold text-white/80 mb-2">Winner:</p>
              <p className="text-3xl font-bold text-aurora">
                {finalScore.winner === 'black' 
                  ? `${currentGame?.host?.studentName || currentGame?.host?.username || 'Black'} (Black)`
                  : `${currentGame?.guest?.studentName || currentGame?.guest?.username || 'White'} (White)`
                }
              </p>
            </div>
          )}
          {finalScore.winner === null && !finalScore.reason && (
            <div className="mt-4">
              <p className="text-xl font-semibold text-white">It's a Draw!</p>
            </div>
          )}
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={() => {
                if (socket && currentGame?.code) {
                  socket.emit('rematch:request', { 
                    code: currentGame.code,
                    gameType: 'GAME_OF_GO',
                    gameSettings: {
                      boardSize: currentGame.goBoardSize || 9,
                      timeControl: currentGame.goTimeControl || null,
                    }
                  });
                  setStatusMessage('Rematch request sent. Waiting for opponent...');
                }
              }}
              className="rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-6 py-3 text-sm font-bold text-white hover:from-aurora/30 hover:to-royal/30 transition"
            >
              Rematch
            </button>
            <button
              onClick={() => {
                resetGame();
                setSelectedGameType(null);
                // Navigate to arena page (home)
                navigate('/arena', { replace: true });
              }}
              className="rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Exit to Arena
            </button>
          </div>
          {/* Display clear win reason for resignation/timeout/disconnect */}
          {finalScore?.reason && finalScore?.message && (
            <p className="text-sm text-white/70 mt-3 italic">
              {finalScore.message.replace(/Black|White/g, (match) => {
                const isBlack = match === 'Black';
                const playerName = isBlack 
                  ? (currentGame?.host?.studentName || currentGame?.host?.username || 'Black')
                  : (currentGame?.guest?.studentName || currentGame?.guest?.username || 'White');
                return playerName;
              })}
            </p>
          )}
          {!finalScore?.reason && statusMessage && (
            <p className="text-sm text-white/70 mt-3 italic">
              {statusMessage.includes('ran out of time') || statusMessage.includes('Time expired') 
                ? statusMessage.replace(/Black|White/g, (match) => {
                    const isBlack = match === 'Black';
                    const playerName = isBlack 
                      ? (currentGame?.host?.studentName || currentGame?.host?.username || 'Black')
                      : (currentGame?.guest?.studentName || currentGame?.guest?.username || 'White');
                    return playerName;
                  })
                : statusMessage
              }
            </p>
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
        {gamePhase !== 'COMPLETE' && currentGame?.guest && (() => {
          // Check if any moves have been made
          const hasAnyMoves = capturedBlack > 0 || capturedWhite > 0 || 
            (board && board.some(row => row && row.some(cell => cell !== null)));
          
        })()}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">Game Rules</p>
        <ul className="text-sm text-white/70 space-y-1 mb-4">
          <li>• Black plays first, then players alternate turns</li>
          <li>• Place stones on intersections to surround territory</li>
          <li>• Stones with no liberties (adjacent empty spaces) are captured</li>
          <li>• Cannot place stone that captures your own group (Suicide Rule)</li>
          <li>• Cannot recreate previous board position (Ko Rule)</li>
          <li>• One may pass their turn without losing points</li>
          <li>• Game ends when both players pass consecutively</li>
        </ul>
        <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2 mt-4">Scoring System (Chinese)</p>
        <ul className="text-sm text-white/70 space-y-1">
          <li>• Controlled Territory: Empty intersections you enclose (+1)</li>
          <li>• Stones on board: Intersections your stones occupy (+1)</li>
          <li>• Komi: White's bonus for going second (+7.5)</li>
          <li>• White Scoring: Stones on Board + Controlled Territory + Komi</li>
          <li>• Black Scoring: Stones on Board + Controlled Territory</li>
        </ul>
      </div>

      <RematchModal
        isOpen={rematchModal.isOpen}
        opponentName={rematchModal.opponentName}
        onAccept={() => {
          if (socket && currentGame?.code && rematchModal.requesterId) {
            socket.emit('rematch:accept', { code: currentGame.code, requesterId: rematchModal.requesterId });
          }
        }}
        onReject={() => {
          if (socket && currentGame?.code) {
            socket.emit('rematch:reject', { code: currentGame.code });
          }
          setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
        }}
        onClose={() => {
          setRematchModal({ isOpen: false, opponentName: '', requesterId: null, gameType: null, gameSettings: null });
        }}
      />


    </section>
  );
};

export default GameOfGo;

