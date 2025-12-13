import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import GoBoard3D from './GoBoard3D';

export default function HeroSection() {
  const navigate = useNavigate();
  
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Glowing orbs */}
      <div className="hero-glow w-[600px] h-[600px] bg-primary/20 -top-40 -left-40" />
      <div className="hero-glow w-[500px] h-[500px] bg-secondary/20 -bottom-20 -right-20" />
      <div className="hero-glow w-[400px] h-[400px] bg-accent/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* 3D Go Board */}
          <div className="relative w-full max-w-3xl mx-auto mb-8">
            {/* Glow behind board */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent blur-2xl" />
            
            <Suspense
              fallback={
                <div className="h-[500px] md:h-[600px] lg:h-[700px] flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }
            >
              <GoBoard3D />
            </Suspense>
          </div>

          {/* Title */}
          <h1 className="section-title text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-6 animate-fade-in">
            <span className="text-gradient">Global Go League</span>
          </h1>

          {/* Tagline */}
          <p
            className="font-display text-xl md:text-2xl lg:text-3xl text-foreground/90 mb-6 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Play, Study, and Compete in the World's Most Complex Board Game.
          </p>

          {/* Description */}
          <p
            className="section-subtitle text-center mb-10 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            Join millions of players worldwide in mastering the ancient art of Go.
            From beginner tutorials to professional tournaments — your journey starts here.
          </p>

          {/* CTA Button */}
          <div
            className="animate-fade-in"
            style={{ animationDelay: '0.6s' }}
          >
            <button 
              className="btn-primary group"
              onClick={() => navigate('/signin')}
            >
              <span className="relative z-10">Play Now</span>
            </button>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
            style={{ animationDelay: '1s' }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

