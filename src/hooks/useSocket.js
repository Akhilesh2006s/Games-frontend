import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';
import { socketBaseUrl } from '../services/api';

const useSocket = ({ enabled, roomCode }) => {
  const token = useAuthStore((state) => state.token);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setIsConnected(false);
      setIsJoined(false);
      return undefined;
    }
    
    const socket = io(socketBaseUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsJoined(false);
    });

    socket.on('game:joined', () => {
      setIsJoined(true);
    });

    socketRef.current = socket;
    
    return () => {
      socket.disconnect();
      setIsConnected(false);
      setIsJoined(false);
    };
  }, [enabled, token]);

  useEffect(() => {
    if (roomCode && socketRef.current && isConnected) {
      setIsJoined(false);
      socketRef.current.emit('joinGame', { code: roomCode });
    }
  }, [roomCode, isConnected]);

  return { socket: socketRef.current, isConnected, isJoined };
};

export default useSocket;

