import { io } from 'socket.io-client';
import { socketBaseUrl } from './api';
import useAuthStore from '../store/useAuthStore';

let socketInstance = null;
let connectionCount = 0;
let currentToken = null;

export const getSocket = (token) => {
  // If token changed, disconnect old socket
  if (socketInstance && currentToken !== token) {
    socketInstance.disconnect();
    socketInstance = null;
    connectionCount = 0;
  }

  // If no token, return null
  if (!token) {
    return null;
  }

  // If socket exists and is connected, return it
  if (socketInstance && socketInstance.connected) {
    currentToken = token;
    return socketInstance;
  }

  // Create new socket if needed
  if (!socketInstance) {
    socketInstance = io(socketBaseUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { token },
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    currentToken = token;
  }

  connectionCount++;
  return socketInstance;
};

export const releaseSocket = () => {
  connectionCount--;
  // Only disconnect if no components are using it
  if (connectionCount <= 0 && socketInstance) {
    connectionCount = 0;
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    connectionCount = 0;
    currentToken = null;
  }
};


