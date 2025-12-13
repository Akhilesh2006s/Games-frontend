import { useEffect, useRef, useState } from 'react';

const timelineEvents = [
  {
    year: '2500 BCE',
    title: 'Ancient Origins',
    description: 'Go originates in China, making it one of the oldest board games still played today.',
  },
  {
    year: '7th Century',
    title: 'Spreads to Japan',
    description: 'Go arrives in Japan where it becomes known as "Igo" and gains immense popularity among nobility.',
  },
  {
    year: '1600s',
    title: 'Four Go Houses',
    description: 'Japan establishes four major Go schools, professionalizing the game.',
  },
  {
    year: '1900s',
    title: 'Korean Renaissance',
    description: 'Korea emerges as a Go powerhouse, producing world-class players.',
  },
  {
    year: '2016',
    title: 'AlphaGo Era',
    description: 'DeepMind\'s AlphaGo defeats world champion, revolutionizing AI and Go forever.',
  },
];

export default function HistorySection() {
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
      id="history"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2
            className={`section-title mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            History of <span className="text-gradient">Go</span>
          </h2>
          <p
            className={`section-subtitle mx-auto transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            From ancient China to modern artificial intelligence — discover the 4,000-year journey
            of the world's most complex board game.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          {/* Left - Image/Illustration */}
          <div
            className={`relative transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
          >
            <div className="relative rounded-2xl overflow-hidden card-glass p-8">
              {/* Ancient Go Board Illustration */}
              <div className="aspect-square bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl flex items-center justify-center relative overflow-hidden">
                {/* Decorative grid pattern */}
                <div className="absolute inset-4 grid grid-cols-9 grid-rows-9 gap-0">
                  {Array.from({ length: 81 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-amber-700/30"
                    />
                  ))}
                </div>
                
                {/* Decorative stones */}
                <div className="absolute top-1/4 left-1/4 w-6 h-6 rounded-full bg-foreground/90 shadow-lg" />
                <div className="absolute top-1/3 right-1/3 w-6 h-6 rounded-full bg-muted shadow-lg" />
                <div className="absolute bottom-1/3 left-1/2 w-6 h-6 rounded-full bg-foreground/90 shadow-lg" />
                <div className="absolute bottom-1/4 right-1/4 w-6 h-6 rounded-full bg-muted shadow-lg" />
                
                {/* Ancient scroll decoration */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/40" />
                
                <div className="relative z-10 text-center p-6">
                  <span className="font-display text-6xl md:text-7xl text-gradient opacity-80">碁</span>
                  <p className="mt-4 font-body text-lg text-muted-foreground">Ancient Chinese character for Go</p>
                </div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-2xl blur-xl opacity-50 -z-10" />
            </div>
          </div>

          {/* Right - Text Content */}
          <div
            className={`space-y-6 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
          >
            <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              The Ancient Art of Strategy
            </h3>
            <div className="space-y-4 text-muted-foreground font-body text-lg leading-relaxed">
              <p>
                Go, known as <span className="text-primary">Weiqi</span> in China,{' '}
                <span className="text-primary">Baduk</span> in Korea, and{' '}
                <span className="text-primary">Igo</span> in Japan, is the oldest board game
                continuously played to this day.
              </p>
              <p>
                Legend has it that the game was invented by the Chinese Emperor Yao around
                2300 BCE to teach his son discipline and concentration. Over millennia, it
                evolved from a tool of education to a profound art form studied by scholars,
                warriors, and emperors alike.
              </p>
              <p>
                Today, Go stands as humanity's benchmark for strategic complexity — with more
                possible game positions than atoms in the observable universe. It remains a
                cornerstone of artificial intelligence research and competitive esports.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent" />
          
          <div className="space-y-12">
            {timelineEvents.map((event, index) => (
              <div
                key={event.year}
                className={`relative flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${600 + index * 100}ms` }}
              >
                {/* Left side (desktop) */}
                <div className={`hidden md:block w-1/2 ${index % 2 === 0 ? 'text-right pr-12' : 'order-2 pl-12'}`}>
                  {index % 2 === 0 ? (
                    <div className="card-neon p-6 inline-block text-left">
                      <span className="font-display text-primary text-lg">{event.year}</span>
                      <h4 className="font-display text-xl font-bold text-foreground mt-1">{event.title}</h4>
                      <p className="text-muted-foreground mt-2 font-body">{event.description}</p>
                    </div>
                  ) : (
                    <span className="font-display text-2xl text-gradient">{event.year}</span>
                  )}
                </div>

                {/* Center dot */}
                <div className="absolute left-4 md:left-1/2 w-4 h-4 -ml-2 md:-ml-2 rounded-full bg-primary shadow-lg shadow-primary/50 z-10" />

                {/* Right side (desktop) */}
                <div className={`hidden md:block w-1/2 ${index % 2 === 0 ? 'pl-12' : 'order-1 text-right pr-12'}`}>
                  {index % 2 === 1 ? (
                    <div className="card-neon p-6 inline-block text-left">
                      <span className="font-display text-primary text-lg">{event.year}</span>
                      <h4 className="font-display text-xl font-bold text-foreground mt-1">{event.title}</h4>
                      <p className="text-muted-foreground mt-2 font-body">{event.description}</p>
                    </div>
                  ) : (
                    <span className="font-display text-2xl text-gradient">{event.year}</span>
                  )}
                </div>

                {/* Mobile layout */}
                <div className="md:hidden pl-10">
                  <div className="card-neon p-4">
                    <span className="font-display text-primary text-sm">{event.year}</span>
                    <h4 className="font-display text-lg font-bold text-foreground mt-1">{event.title}</h4>
                    <p className="text-muted-foreground mt-2 text-sm font-body">{event.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
