import { useEffect, useRef, useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import { getSocket, releaseSocket } from '../services/socketManager';

const useSocket = ({ enabled, roomCode }) => {
  const token = useAuthStore((state) => state.token);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setIsConnected(false);
      setIsJoined(false);
      if (socketRef.current) {
        releaseSocket();
        socketRef.current = null;
      }
      return undefined;
    }
    
    // Get shared socket instance
    const socket = getSocket(token);
    if (!socket) {
      setIsConnected(false);
      setIsJoined(false);
      return undefined;
    }

    socketRef.current = socket;

    // Update connection state based on socket status
    const updateConnectionState = () => {
      setIsConnected(socket.connected);
    };

    // Set initial state
    updateConnectionState();

    // Listen for connection events
    const handleConnect = () => {
      console.log('Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setIsJoined(false);
    };

    const handleGameJoined = () => {
      setIsJoined(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game:joined', handleGameJoined);
    
    return () => {
      // Remove listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game:joined', handleGameJoined);
      
      // Release socket (only disconnects if no other components are using it)
      releaseSocket();
      socketRef.current = null;
      setIsConnected(false);
      setIsJoined(false);
    };
  }, [enabled, token]);

  useEffect(() => {
    if (roomCode && socketRef.current && isConnected && socketRef.current.connected) {
      setIsJoined(false);
      socketRef.current.emit('joinGame', { code: roomCode });
    }
  }, [roomCode, isConnected]);

  return { socket: socketRef.current, isConnected, isJoined };
};

export default useSocket;

