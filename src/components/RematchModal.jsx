import { useEffect } from 'react';

const RematchModal = ({ isOpen, opponentName, onAccept, onReject, onClose }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-panel border-2 border-aurora/50 p-8 max-w-md w-full mx-4 text-white">
        <h2 className="text-2xl font-bold mb-2 text-aurora">Rematch Request</h2>
        <p className="text-white/80 mb-6">
          <span className="font-semibold">{opponentName}</span> wants to play again!
        </p>
        <div className="flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-lg bg-gradient-to-r from-aurora/20 to-royal/20 border border-aurora/50 px-6 py-3 text-sm font-semibold text-white hover:from-aurora/30 hover:to-royal/30 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default RematchModal;



