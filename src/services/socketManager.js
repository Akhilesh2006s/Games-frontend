import { io } from 'socket.io-client';
import { socketBaseUrl } from './api';

let socketInstance = null;
let usageCount = 0;
let currentToken = null;

/**
 * Get or create a socket instance
 * @param {string} token - Authentication token
 * @returns {Socket|null} Socket instance or null if token is missing
 */
export const getSocket = (token) => {
  if (!token) {
    return null;
  }

  // If socket exists and token matches, increment usage and return
  if (socketInstance && currentToken === token && socketInstance.connected) {
    usageCount++;
    return socketInstance;
  }

  // If socket exists but token changed or disconnected, clean up first
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    usageCount = 0;
  }

  // Create new socket instance
  currentToken = token;
  socketInstance = io(socketBaseUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  usageCount = 1;

  // Handle connection errors
  socketInstance.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socketInstance;
};

/**
 * Release the socket instance (decrement usage count)
 * Only disconnects if no components are using it
 */
export const releaseSocket = () => {
  if (!socketInstance) {
    return;
  }

  usageCount--;

  // Only disconnect if no components are using the socket
  if (usageCount <= 0) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
    usageCount = 0;
  }
};

/**
 * Force disconnect the socket (for logout, etc.)
 */
export const forceDisconnect = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
    usageCount = 0;
  }
};

