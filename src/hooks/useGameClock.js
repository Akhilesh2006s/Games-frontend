import { useState, useEffect, useRef, useCallback } from 'react';

// Time control presets
export const TIME_PRESETS = {
  BLITZ_A: { name: 'Blitz A', mainTime: 30, increment: 5 },
  BLITZ_B: { name: 'Blitz B', mainTime: 120, increment: 7 },
  RAPID: { name: 'Rapid', mainTime: 180, increment: 10 },
};

/**
 * Pure Fischer Game Clock Hook
 * - No maximum limits
 * - Time can grow indefinitely
 * - Adds increment after each move
 */
export const useGameClock = (initialConfig = null) => {
  const [blackTime, setBlackTime] = useState(0);
  const [whiteTime, setWhiteTime] = useState(0);
  const [activePlayer, setActivePlayer] = useState(null); // 'black' | 'white' | null
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState(initialConfig || TIME_PRESETS.BLITZ_A);
  
  const intervalRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  // Initialize times when config changes
  useEffect(() => {
    if (config && config.mainTime > 0) {
      setBlackTime(config.mainTime);
      setWhiteTime(config.mainTime);
    }
  }, [config]);

  // Tick function - decrements active player's time by 1 second
  const tick = useCallback(() => {
    if (!isRunning || !activePlayer) return;

    const now = Date.now();
    const elapsed = (now - lastTickRef.current) / 1000;
    
    if (elapsed >= 1) {
      lastTickRef.current = now;
      
      if (activePlayer === 'black') {
        setBlackTime((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            setIsRunning(false);
          }
          return newTime;
        });
      } else {
        setWhiteTime((prev) => {
          const newTime = Math.max(0, prev - 1);
          if (newTime <= 0) {
            setIsRunning(false);
          }
          return newTime;
        });
      }
    }
  }, [isRunning, activePlayer]);

  // Start clock for a specific player
  const startClock = useCallback((color) => {
    if (color !== 'black' && color !== 'white') return;
    
    setActivePlayer(color);
    setIsRunning(true);
    lastTickRef.current = Date.now();
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start ticking every second
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  // Press clock - adds increment to current player's time (NO CAP)
  const pressClock = useCallback(() => {
    if (!activePlayer) return;
    
    // Add increment without any cap
    if (activePlayer === 'black') {
      setBlackTime((prev) => prev + config.increment);
    } else {
      setWhiteTime((prev) => prev + config.increment);
    }
  }, [activePlayer, config.increment]);

  // Stop clock
  const stopClock = useCallback(() => {
    setIsRunning(false);
    setActivePlayer(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset clock
  const resetClock = useCallback((newConfig = null) => {
    stopClock();
    const clockConfig = newConfig || config;
    setBlackTime(clockConfig.mainTime);
    setWhiteTime(clockConfig.mainTime);
    setConfig(clockConfig);
  }, [config, stopClock]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    blackTime,
    whiteTime,
    activePlayer,
    isRunning,
    config,
    setConfig,
    startClock,
    pressClock,
    tick,
    stopClock,
    resetClock,
    formatTime,
    isTimeExpired: (blackTime <= 0 || whiteTime <= 0),
  };
};


