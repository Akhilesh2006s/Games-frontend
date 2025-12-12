import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HeroSection from '../components/HeroSection';
import AuthPanel from '../components/AuthPanel';
import useAuthStore from '../store/useAuthStore';

const timeline = [
  {
    label: '01',
    title: 'Authenticate',
    body: 'Log into ceteris-paribus, your neon command center. Accounts live on MongoDB Atlas.',
  },
  {
    label: '02',
    title: 'Generate Code',
    body: 'Spin up a six-character arena code. Share it with your rival to sync sessions.',
  },
  {
    label: '03',
    title: 'Battle Trilogy',
    body: 'Handle Rock Paper Scissors, then Game of Go, then Matching Pennies. One link. One flow.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Redirect if already logged in (wait for user data to load)
  useEffect(() => {
    if (token && user) {
      // Small delay to ensure user data is fully loaded
      const timer = setTimeout(() => {
        if (user?.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/arena', { replace: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [token, user, navigate]);

  const handleSuccess = () => {
    // Small delay to ensure user data is set in store
    setTimeout(() => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/arena', { replace: true });
      }
    }, 100);
  };

  return (
    <main className="min-h-screen bg-night px-4 py-10 text-white md:px-12">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
        <HeroSection />
        <AuthPanel onSuccess={handleSuccess} />
      </div>
      <section className="mx-auto mt-12 max-w-5xl space-y-6">
        <p className="text-center text-sm uppercase tracking-[0.5em] text-white/50">
          ceteris-paribus • rock paper scissors • game of go • matching pennies
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {timeline.map((item) => (
            <div key={item.label} className="glass-panel p-5">
              <p className="text-sm uppercase tracking-[0.5em] text-white/40">{item.label}</p>
              <h4 className="text-xl font-semibold">{item.title}</h4>
              <p className="text-sm text-white/60">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default LandingPage;




