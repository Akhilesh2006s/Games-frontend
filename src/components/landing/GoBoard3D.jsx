import { useState, useEffect } from 'react';

// Stone positions for the animated game sequence
const stoneSequence = [
  { top: '15%', left: '20%', color: 'white', delay: 500 },
  { top: '20%', left: '25%', color: 'black', delay: 1000 },
  { top: '25%', left: '20%', color: 'black', delay: 1500 },
  { top: '20%', left: '15%', color: 'white', delay: 2000 },
  { top: '50%', left: '50%', color: 'black', delay: 2500 },
  { top: '45%', left: '45%', color: 'white', delay: 3000 },
  { top: '80%', left: '75%', color: 'black', delay: 3500 },
  { top: '75%', left: '80%', color: 'white', delay: 4000 },
  { top: '80%', left: '85%', color: 'white', delay: 4500 },
  { top: '15%', left: '80%', color: 'black', delay: 5000 },
  { top: '20%', left: '75%', color: 'white', delay: 5500 },
  { top: '20%', left: '85%', color: 'black', delay: 6000 },
];

export default function GoBoard3D() {
  const [visibleStones, setVisibleStones] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start animation after component mounts
    setIsAnimating(true);
    
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
            {/* Grid Pattern */}
            <div className="absolute inset-4 grid gap-0 opacity-40" style={{ gridTemplateColumns: 'repeat(19, 1fr)', gridTemplateRows: 'repeat(19, 1fr)' }}>
              {Array.from({ length: 361 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-amber-600/20"
                />
              ))}
            </div>
            
            {/* Animated Stones - appearing one by one */}
            {stoneSequence.map((stone, index) => {
              const isVisible = visibleStones.includes(index);
              return (
                <div
                  key={index}
                  className={`absolute w-8 h-8 rounded-full shadow-lg transition-all duration-500 ${
                    stone.color === 'white' 
                      ? 'bg-white/90 border-2 border-gray-300/50' 
                      : 'bg-gray-900 border-2 border-gray-700/50'
                  } ${
                    isVisible 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-0'
                  }`}
                  style={{
                    top: stone.top,
                    left: stone.left,
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
      
      <style jsx>{`
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

