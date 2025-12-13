export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-12 border-t border-border/30">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-t from-muted/20 to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Copyright */}
          <div className="text-center md:text-left">
            <span className="font-display text-xl font-bold text-gradient">
              Global Go League
            </span>
            <p className="mt-2 text-sm text-muted-foreground font-body">
              © {currentYear} Global Go League. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {['About', 'Privacy', 'Terms', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 font-body"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>

        {/* Tagline */}
        <div className="mt-8 pt-8 border-t border-border/20 text-center">
          <p className="text-sm text-muted-foreground/60 font-body italic">
            Inspired by the ancient game of Go (Weiqi/Baduk) — the world's most complex board game.
          </p>
        </div>
      </div>
    </footer>
  );
}

