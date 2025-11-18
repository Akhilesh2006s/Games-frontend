import { useState } from 'react';
import api from '../services/api';
import useGameStore from '../store/useGameStore';

const GameSelector = ({ currentGame, onGameSelected }) => {
  const { setCurrentGame, setStatusMessage } = useGameStore();
  const [loading, setLoading] = useState({ rps: false, go: false, pennies: false });

  const hasActiveGame = currentGame?.activeStage && 
    (currentGame.activeStage === 'ROCK_PAPER_SCISSORS' || currentGame.activeStage === 'GAME_OF_GO' || currentGame.activeStage === 'MATCHING_PENNIES');

  const handleStartGame = async (gameType) => {
    if (!currentGame?.code) return;
    const loadingKey = gameType === 'MATCHING_PENNIES' ? 'pennies' : gameType === 'GAME_OF_GO' ? 'go' : 'rps';
    setLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      let endpoint;
      let message;
      if (gameType === 'MATCHING_PENNIES') {
        endpoint = '/games/start-pennies';
        message = 'Matching Pennies started! First to 10 points wins.';
      } else if (gameType === 'GAME_OF_GO') {
        endpoint = '/games/start-go';
        message = 'Game of Go started! Place stones to capture territory.';
      } else {
        endpoint = '/games/start-rps';
        message = 'Rock Paper Scissors started! First to 10 points wins.';
      }
      const { data } = await api.post(endpoint, { code: currentGame.code });
      setCurrentGame(data.game);
      setStatusMessage(message);
      if (onGameSelected) onGameSelected();
    } catch (err) {
      console.error(err);
      setStatusMessage(err.response?.data?.message || `Failed to start ${gameType}`);
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <div className="rounded-3xl border-2 border-aurora/50 bg-gradient-to-br from-aurora/10 to-royal/10 p-6 text-white shadow-lg">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.4em] text-aurora font-semibold">Choose Your Game</p>
        <h3 className="text-2xl font-semibold mt-2">🎮 {hasActiveGame ? 'Change Game' : 'Select a Game to Play'}</h3>
        <p className="text-white/70 mt-2">
          {hasActiveGame 
            ? `Currently playing: ${currentGame.activeStage === 'ROCK_PAPER_SCISSORS' ? 'Rock Paper Scissors' : currentGame.activeStage === 'GAME_OF_GO' ? 'Game of Go' : 'Matching Pennies'}. Click below to switch games.`
            : 'Both players are connected! Click on a game below to start.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => handleStartGame('ROCK_PAPER_SCISSORS')}
          disabled={loading.rps || loading.go || loading.pennies}
          className={`group relative rounded-3xl border-2 p-8 text-left transition-all hover:-translate-y-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            currentGame?.activeStage === 'ROCK_PAPER_SCISSORS'
              ? 'border-aurora bg-aurora/20'
              : 'border-white/20 bg-white/10 hover:border-aurora hover:bg-aurora/20'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-5xl">✊</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 01</p>
                {currentGame?.activeStage === 'ROCK_PAPER_SCISSORS' && (
                  <span className="text-xs bg-aurora text-night px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>
                )}
              </div>
              <h4 className="text-xl font-semibold mt-1">Rock • Paper • Scissors</h4>
              <p className="text-white/60 mt-2 text-sm">
                Classic hand game. Choose rock, paper, or scissors. First to 10 points wins.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                <span>✊ 🪨</span>
                <span>✋ 📜</span>
                <span>✌️ ✂️</span>
              </div>
            </div>
          </div>
          {loading.rps && (
            <div className="absolute inset-0 flex items-center justify-center bg-night/50 rounded-3xl">
              <span className="text-white">Starting...</span>
            </div>
          )}
        </button>

        <button
          onClick={() => handleStartGame('GAME_OF_GO')}
          disabled={loading.rps || loading.go || loading.pennies}
          className={`group relative rounded-3xl border-2 p-8 text-left transition-all hover:-translate-y-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            currentGame?.activeStage === 'GAME_OF_GO'
              ? 'border-aurora bg-aurora/20'
              : 'border-white/20 bg-white/10 hover:border-aurora hover:bg-aurora/20'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-5xl">⚫</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 02</p>
                {currentGame?.activeStage === 'GAME_OF_GO' && (
                  <span className="text-xs bg-aurora text-night px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>
                )}
              </div>
              <h4 className="text-xl font-semibold mt-1">Game of Go</h4>
              <p className="text-white/60 mt-2 text-sm">
                Strategic board game. Place stones to surround territory and capture opponent stones.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                <span>⚫ Black</span>
                <span>⚪ White</span>
              </div>
            </div>
          </div>
          {loading.go && (
            <div className="absolute inset-0 flex items-center justify-center bg-night/50 rounded-3xl">
              <span className="text-white">Starting...</span>
            </div>
          )}
        </button>

        <button
          onClick={() => handleStartGame('MATCHING_PENNIES')}
          disabled={loading.rps || loading.go || loading.pennies}
          className={`group relative rounded-3xl border-2 p-8 text-left transition-all hover:-translate-y-2 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            currentGame?.activeStage === 'MATCHING_PENNIES'
              ? 'border-aurora bg-aurora/20'
              : 'border-white/20 bg-white/10 hover:border-aurora hover:bg-aurora/20'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-5xl">🪙</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Stage 03</p>
                {currentGame?.activeStage === 'MATCHING_PENNIES' && (
                  <span className="text-xs bg-aurora text-night px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>
                )}
              </div>
              <h4 className="text-xl font-semibold mt-1">Matching Pennies</h4>
              <p className="text-white/60 mt-2 text-sm">
                Psychology game. One chooses, one guesses. If guess matches, guesser wins. First to 10 points wins.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                <span>👑 Heads</span>
                <span>🦅 Tails</span>
              </div>
            </div>
          </div>
          {loading.pennies && (
            <div className="absolute inset-0 flex items-center justify-center bg-night/50 rounded-3xl">
              <span className="text-white">Starting...</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default GameSelector;

