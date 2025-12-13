import { useEffect, useRef, useState } from 'react';
import { Quote } from 'lucide-react';

interface QuoteData {
  name: string;
  title: string;
  quote: string;
  initials: string;
}

const quotes: QuoteData[] = [
  {
    name: 'Magnus Carlsen',
    title: 'Chess Grandmaster',
    quote: "I don't think there's anything more complex than the game of Go.",
    initials: 'MC',
  },
  {
    name: 'Lee Sedol',
    title: 'Legendary Go Player',
    quote: 'After playing AlphaGo, I have learned that I still have so much more to explore in Go.',
    initials: 'LS',
  },
  {
    name: 'Demis Hassabis',
    title: 'DeepMind Co-Founder',
    quote: 'Go is the ultimate challenge. Its beauty lies in its profound complexity.',
    initials: 'DH',
  },
  {
    name: 'Fan Hui',
    title: 'Pro Go Player',
    quote: 'Go is the art of balancing strategy, intuition, and creativity.',
    initials: 'FH',
  },
  {
    name: 'Ke Jie',
    title: 'World-Ranked Go Pro',
    quote: 'Go is too beautiful to be considered just a game.',
    initials: 'KJ',
  },
  {
    name: 'Garry Kasparov',
    title: 'Chess Champion',
    quote: 'Chess is limited by tactics. Go is limited only by imagination.',
    initials: 'GK',
  },
];

export default function QuotesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="quotes"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-secondary/10 via-transparent to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2
            className={`section-title mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            What Professionals Think <span className="text-gradient">About Go</span>
          </h2>
          <p
            className={`section-subtitle mx-auto transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Insights from world-class players, grandmasters, and visionaries.
          </p>
        </div>

        {/* Quotes Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {quotes.map((quote, index) => (
            <div
              key={quote.name}
              className={`group relative transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <div className="card-neon p-6 md:p-8 h-full flex flex-col transition-all duration-300 group-hover:border-secondary/50">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-primary/40 mb-4 group-hover:text-primary/60 transition-colors duration-300" />

                {/* Quote text */}
                <blockquote className="flex-1 mb-6">
                  <p className="text-foreground/90 font-body text-lg leading-relaxed italic">
                    "{quote.quote}"
                  </p>
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center ring-2 ring-border/30 group-hover:ring-primary/30 transition-all duration-300">
                    <span className="font-display text-sm font-bold text-foreground">
                      {quote.initials}
                    </span>
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h4 className="font-display font-bold text-foreground">
                      {quote.name}
                    </h4>
                    <p className="text-sm text-muted-foreground font-body">
                      {quote.title}
                    </p>
                  </div>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-secondary/0 to-primary/0 group-hover:from-secondary/5 group-hover:to-primary/5 transition-all duration-500 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
