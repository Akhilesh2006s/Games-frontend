import { useState, useEffect } from 'react';

const BOARD_SIZE = 19;
const BOARD_LAST_INDEX = BOARD_SIZE - 1;

// Stone positions for the animated game sequence
const stoneSequence = [
  { row: 3, col: 3, color: 'black', delay: 500 },
  { row: 15, col: 15, color: 'white', delay: 1000 },
  { row: 3, col: 15, color: 'black', delay: 1500 },
  { row: 15, col: 3, color: 'white', delay: 2000 },
  { row: 9, col: 9, color: 'black', delay: 2500 },
  { row: 9, col: 6, color: 'white', delay: 3000 },
  { row: 6, col: 9, color: 'black', delay: 3500 },
  { row: 12, col: 9, color: 'white', delay: 4000 },
  { row: 9, col: 12, color: 'black', delay: 4500 },
  { row: 5, col: 5, color: 'white', delay: 5000 },
  { row: 13, col: 13, color: 'black', delay: 5500 },
  { row: 5, col: 13, color: 'white', delay: 6000 },
];

export default function GoBoard3D() {
  const [visibleStones, setVisibleStones] = useState([]);

  useEffect(() => {
    // Reset and replay animation every 8 seconds
    const interval = setInterval(() => {
      setVisibleStones([]);
      setTimeout(() => {
        stoneSequence.forEach((stone, index) => {
          setTimeout(() => {
            setVisibleStones((prev) => [...prev, index]);
          }, stone.delay);
        });
      }, 500);
    }, 8000);

    // Initial animation
    stoneSequence.forEach((stone, index) => {
      setTimeout(() => {
        setVisibleStones((prev) => [...prev, index]);
      }, stone.delay);
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center perspective-1000">
      <div className="relative w-full h-full max-w-2xl transform-style-preserve-3d animate-float">
        {/* Board Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Board Background */}
          <div className="relative w-[90%] h-[90%] bg-gradient-to-br from-amber-800/40 to-amber-900/30 rounded-lg shadow-2xl border-2 border-amber-700/30">
            {/* Go board lines and star points */}
            <div className="absolute inset-8">
              <svg className="w-full h-full opacity-60" viewBox="0 0 100 100" preserveAspectRatio="none">
                {Array.from({ length: BOARD_SIZE }).map((_, index) => {
                  const pos = (index / BOARD_LAST_INDEX) * 100;
                  return (
                    <g key={index}>
                      <line x1={0} y1={pos} x2={100} y2={pos} stroke="rgba(180, 83, 9, 0.5)" strokeWidth="0.35" />
                      <line x1={pos} y1={0} x2={pos} y2={100} stroke="rgba(180, 83, 9, 0.5)" strokeWidth="0.35" />
                    </g>
                  );
                })}
                {[3, 9, 15].flatMap((row) =>
                  [3, 9, 15].map((col) => (
                    <circle
                      key={`${row}-${col}`}
                      cx={(col / BOARD_LAST_INDEX) * 100}
                      cy={(row / BOARD_LAST_INDEX) * 100}
                      r="0.85"
                      fill="rgba(120, 53, 15, 0.8)"
                    />
                  ))
                )}
              </svg>
            </div>
            
            {/* Animated Stones - appearing one by one */}
            {stoneSequence.map((stone, index) => {
              const isVisible = visibleStones.includes(index);
              return (
                <div
                  key={index}
                  className={`absolute w-7 h-7 md:w-8 md:h-8 rounded-full shadow-lg transition-all duration-500 ${
                    stone.color === 'white' 
                      ? 'bg-white/90 border-2 border-gray-300/50' 
                      : 'bg-gray-900 border-2 border-gray-700/50'
                  } ${
                    isVisible 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-0'
                  }`}
                  style={{
                    top: `calc(2rem + (${stone.row} / ${BOARD_LAST_INDEX}) * (100% - 4rem))`,
                    left: `calc(2rem + (${stone.col} / ${BOARD_LAST_INDEX}) * (100% - 4rem))`,
                    transform: isVisible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)',
                    animation: isVisible ? 'stonePlace 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                  }}
                >
                  {/* Stone glow effect */}
                  {isVisible && (
                    <div 
                      className={`absolute inset-0 rounded-full blur-md ${
                        stone.color === 'white' ? 'bg-white/30' : 'bg-gray-900/30'
                      }`}
                      style={{
                        animation: 'stoneGlow 0.6s ease-out',
                      }}
                    />
                  )}
                </div>
              );
            })}
            
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-radial from-primary/20 via-transparent to-transparent blur-2xl -z-10" />
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes stonePlace {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes stoneGlow {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
      `}</style>
    </div>
  );
}

