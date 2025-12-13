import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import HistorySection from '@/components/HistorySection';
import PlayersSection from '@/components/PlayersSection';
import AlphaGoSection from '@/components/AlphaGoSection';
import QuotesSection from '@/components/QuotesSection';
import CommunitySection from '@/components/CommunitySection';
import Footer from '@/components/Footer';

const Index = () => {
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

export default Index;
