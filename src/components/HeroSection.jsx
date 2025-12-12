const features = [
  {
    title: 'Rock • Paper • Scissors',
    body: 'Fast bursts, reactive duels, instant bragging rights. Start every championship with a mind-read.',
    accent: 'from-pulse to-royal',
  },
  {
    title: 'Game of Go (Next Stage)',
    body: 'We stretch the arena with strategic grids, influence, territory. Unlocks once your duel code hits success.',
    accent: 'from-aurora to-royal',
  },
  {
    title: 'Matching Pennies',
    body: 'Psychology, deception, double-bluff glory. The tie-breaker to end all tie-breakers.',
    accent: 'from-royal to-pulse',
  },
];

const HeroSection = () => (
  <section className="space-y-10 text-white">
    <div className="flex flex-col gap-6 text-center md:text-left">
      <p className="text-sm uppercase tracking-[0.5em] text-white/60">
        Ceteris-Paribus Championship Network
      </p>
      <h1 className="text-4xl font-display font-semibold leading-tight md:text-6xl">
        Epic Multiplayer Frontline for people who live to compete.
      </h1>
      <p className="text-lg text-white/70 md:max-w-3xl">
        Spin up a private arena code, share it with your rival, and move through our trilogy: Rock Paper Scissors, Game
        of Go, and Matching Pennies. Built for rapid authentication, neon ambience, and highlight-ready match data.
      </p>
    </div>

    <div id="games" className="flex flex-col gap-6">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="glass-panel relative overflow-hidden p-6 text-left shadow-lg transition hover:-translate-y-1"
        >
          <div className={`absolute inset-0 opacity-30 blur-3xl bg-gradient-to-br ${feature.accent}`} />
          <div className="relative space-y-3">
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="text-sm text-white/60">{feature.body}</p>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default HeroSection;




