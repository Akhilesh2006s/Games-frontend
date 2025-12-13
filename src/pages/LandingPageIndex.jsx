import Navigation from '../components/landing/Navigation';
import HeroSection from '../components/landing/HeroSection';
import HistorySection from '../components/landing/HistorySection';
import PlayersSection from '../components/landing/PlayersSection';
import AlphaGoSection from '../components/landing/AlphaGoSection';
import QuotesSection from '../components/landing/QuotesSection';
import CommunitySection from '../components/landing/CommunitySection';
import Footer from '../components/landing/Footer';

const LandingPageIndex = () => {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <HistorySection />
      <PlayersSection />
      <AlphaGoSection />
      <QuotesSection />
      <CommunitySection />
      <Footer />
    </main>
  );
};

export default LandingPageIndex;

