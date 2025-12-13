import { useEffect, useRef, useState } from 'react';

interface Player {
  name: string;
  country: string;
  flag: string;
  description: string;
}

const players: Player[] = [
  {
    name: 'Go Seigen',
    country: 'China/Japan',
    flag: '🇨🇳🇯🇵',
    description: 'Revolutionary master who dominated the Go world for decades and transformed modern opening theory.',
  },
  {
    name: 'Honinbo Shusaku',
    country: 'Japan',
    flag: '🇯🇵',
    description: 'The "Saint of Go" whose games are still studied as masterpieces of perfect play.',
  },
  {
    name: 'Lee Sedol',
    country: 'South Korea',
    flag: '🇰🇷',
    description: 'One of the greatest players ever, famous for his creative fighting style and historic match against AlphaGo.',
  },
  {
    name: 'Ke Jie',
    country: 'China',
    flag: '🇨🇳',
    description: 'Current world #1, known for his aggressive style and philosophical approach to Go.',
  },
];

export default function PlayersSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="players"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2
            className={`section-title mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Legendary <span className="text-gradient">Players</span>
          </h2>
          <p
            className={`section-subtitle mx-auto transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Meet the masters who shaped the game and inspired generations of players worldwide.
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {players.map((player, index) => (
            <div
              key={player.name}
              className={`group relative transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${300 + index * 150}ms` }}
            >
              <div className="card-neon p-6 h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:border-primary/50">
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 to-secondary/0 group-hover:from-primary/10 group-hover:to-secondary/10 transition-all duration-300" />
                
                <div className="relative z-10">
                  {/* Player Avatar Placeholder */}
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300">
                    <span className="font-display text-3xl text-foreground">
                      {player.name.charAt(0)}
                    </span>
                  </div>

                  {/* Player Info */}
                  <div className="text-center">
                    <h3 className="font-display text-xl font-bold text-foreground mb-1">
                      {player.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-lg">{player.flag}</span>
                      <span className="text-sm text-muted-foreground font-body">
                        {player.country}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                      {player.description}
                    </p>
                  </div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-xl">
                  <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-primary to-transparent transform rotate-45 translate-x-8 -translate-y-4 group-hover:translate-x-4 transition-transform duration-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
