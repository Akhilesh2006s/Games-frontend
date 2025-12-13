import { useEffect, useRef, useState } from 'react';
import { Globe, Users, Trophy, BookOpen } from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Online Play',
    description: 'Challenge players from around the world in real-time matches.',
  },
  {
    icon: BookOpen,
    title: 'Tutorials & AI Tools',
    description: 'Learn from interactive lessons and train against advanced AI.',
  },
  {
    icon: Trophy,
    title: 'Tournaments',
    description: 'Compete in local leagues and international championships.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Connect with passionate Go players and mentors globally.',
  },
];

export default function CommunitySection() {
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
      id="community"
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background with network pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      
      {/* Animated network lines */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="network" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="1" fill="hsl(var(--primary))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network)" />
        </svg>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/15 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Coming Soon Badge */}
        <div
          className={`text-center mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 font-display text-sm uppercase tracking-widest text-primary animate-pulse">
            Coming Soon
          </span>
        </div>

        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2
            className={`section-title mb-6 transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Join the Global <span className="text-gradient">Go Community</span>
          </h2>
          <p
            className={`section-subtitle mx-auto transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Whether you're a complete beginner or a seasoned player, our platform
            offers everything you need to master the art of Go.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group text-center transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${300 + index * 100}ms` }}
            >
              <div className="card-neon p-6 h-full hover:border-accent/50 transition-all duration-300">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground font-body">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center transition-all duration-700 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <button className="btn-primary group">
            <span className="relative z-10">Get Started</span>
          </button>
          <p className="mt-6 text-sm text-muted-foreground font-body">
            Be the first to know when we launch. Join thousands of Go enthusiasts.
          </p>
        </div>

        {/* Globe illustration */}
        <div
          className={`mt-16 flex justify-center transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <div className="relative w-48 h-48 md:w-64 md:h-64">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin-slow" />
            <div className="absolute inset-4 rounded-full border border-secondary/30 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
            <div className="absolute inset-8 rounded-full border border-accent/20 animate-spin-slow" style={{ animationDuration: '40s' }} />
            
            {/* Center globe */}
            <div className="absolute inset-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <Globe className="w-12 h-12 md:w-16 md:h-16 text-foreground/70" />
            </div>

            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '15s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
            </div>
            <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '20s', animationDirection: 'reverse' }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-secondary shadow-lg shadow-secondary/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
