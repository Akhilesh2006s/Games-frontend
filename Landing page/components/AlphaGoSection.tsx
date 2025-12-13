import { useEffect, useRef, useState } from 'react';
import { Cpu, User, Zap, Brain } from 'lucide-react';

export default function AlphaGoSection() {
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
      id="alphago"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      
      {/* Animated circuit pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-px h-32 bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-32 h-px bg-gradient-to-r from-transparent via-secondary to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-px h-24 bg-gradient-to-b from-transparent via-accent to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-display text-sm text-primary uppercase tracking-wider">
              Historic Match
            </span>
          </div>
          
          <h2
            className={`section-title mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            AlphaGo vs. Human
          </h2>
          <p
            className={`font-display text-xl md:text-2xl text-secondary mb-4 transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            The AI Revolution
          </p>
          <p
            className={`section-subtitle mx-auto transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            In March 2016, the world witnessed a pivotal moment in the history of
            artificial intelligence and human achievement.
          </p>
        </div>

        {/* VS Battle Display */}
        <div
          className={`max-w-5xl mx-auto mb-16 transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="grid md:grid-cols-3 gap-8 items-center">
            {/* AlphaGo */}
            <div className="text-center">
              <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary animate-glow-pulse" />
                <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                  <Cpu className="w-16 h-16 md:w-20 md:h-20 text-primary" />
                </div>
                {/* Orbiting elements */}
                <div className="absolute inset-0 animate-spin-slow">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 rounded-full bg-primary/60" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-secondary/60" />
                </div>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-primary mb-2">
                AlphaGo
              </h3>
              <p className="text-muted-foreground font-body">
                DeepMind's AI
              </p>
              <div className="mt-4 text-5xl md:text-6xl font-display font-bold text-primary">
                4
              </div>
            </div>

            {/* VS */}
            <div className="text-center py-8">
              <div className="relative">
                <span className="font-display text-4xl md:text-6xl font-bold text-gradient animate-pulse">
                  VS
                </span>
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary via-secondary to-accent opacity-30" />
              </div>
              <div className="mt-6 px-6 py-3 rounded-full border border-border/50 bg-muted/30 inline-block">
                <span className="font-display text-sm text-muted-foreground uppercase tracking-widest">
                  March 2016 • Seoul
                </span>
              </div>
            </div>

            {/* Lee Sedol */}
            <div className="text-center">
              <div className="relative mx-auto w-32 h-32 md:w-40 md:h-40 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-primary/50 animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                  <User className="w-16 h-16 md:w-20 md:h-20 text-accent" />
                </div>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-accent mb-2">
                Lee Sedol
              </h3>
              <p className="text-muted-foreground font-body">
                18-time World Champion
              </p>
              <div className="mt-4 text-5xl md:text-6xl font-display font-bold text-accent">
                1
              </div>
            </div>
          </div>
        </div>

        {/* Impact Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Brain,
              title: 'AI Breakthrough',
              description: 'AlphaGo used deep neural networks and reinforcement learning to master Go, a feat many believed was decades away.',
              delay: 500,
            },
            {
              icon: Zap,
              title: 'Move 37',
              description: 'In Game 2, AlphaGo played a move so creative that experts initially thought it was a mistake — it won the game.',
              delay: 600,
            },
            {
              icon: User,
              title: 'Human Spirit',
              description: 'Lee Sedol\'s Game 4 victory, exploiting a rare flaw in AlphaGo, remains one of the most celebrated moments in Go history.',
              delay: 700,
            },
          ].map((card, index) => (
            <div
              key={card.title}
              className={`card-neon p-6 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${card.delay}ms` }}
            >
              <card.icon className="w-10 h-10 text-primary mb-4" />
              <h4 className="font-display text-xl font-bold text-foreground mb-3">
                {card.title}
              </h4>
              <p className="text-muted-foreground font-body">
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div
          className={`max-w-3xl mx-auto mt-16 text-center transition-all duration-700 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <blockquote className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-6xl text-primary/20 font-serif">
              "
            </div>
            <p className="text-xl md:text-2xl text-foreground/90 font-body italic leading-relaxed pt-8">
              This match was not about man versus machine. It was about what we can achieve
              when human creativity meets artificial intelligence.
            </p>
            <footer className="mt-6 text-muted-foreground font-display">
              — DeepMind Team
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
