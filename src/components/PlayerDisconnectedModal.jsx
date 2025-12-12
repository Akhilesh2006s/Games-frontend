import { useEffect } from 'react';

const PlayerDisconnectedModal = ({ isOpen, playerName, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="glass-panel border-2 border-red-500/70 bg-gradient-to-br from-red-600/30 via-red-500/25 to-red-600/30 p-8 max-w-md w-full mx-4 text-white shadow-lg shadow-red-500/30 transform transition-transform duration-300 scale-100">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-red-300">Player Disconnected</h2>
          <p className="text-white/90 mb-6 text-lg">
            <span className="font-semibold text-red-200">{playerName || 'Opponent'}</span> has left the game.
          </p>
          <p className="text-white/70 mb-6">
            You win by forfeit!
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/50 px-6 py-3 text-sm font-semibold text-white hover:from-red-500/30 hover:to-red-600/30 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerDisconnectedModal;

