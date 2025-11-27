import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

const AuthPanel = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate email domain - only @bennett.edu.in allowed
    const emailDomain = form.email.toLowerCase().trim();
    if (!emailDomain.endsWith('@bennett.edu.in')) {
      setError('Only @bennett.edu.in email addresses are allowed');
      setLoading(false);
      return;
    }
    
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : form;
      const { data } = await api.post(endpoint, payload);
      setAuth({ token: data.token, user: data.user });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Something misfired. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <div id="auth" className="glass-panel relative overflow-hidden p-6 text-white">
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['login', 'register'].map((type) => (
          <button
            key={type}
            type="button"
            className={`flex-1 rounded-full px-4 py-2 text-sm uppercase tracking-wide ${
              mode === type ? 'bg-royal text-white shadow-neon' : 'text-white/70'
            }`}
            onClick={() => setMode(type)}
          >
            {type === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="text-sm uppercase tracking-wide text-white/60">Gamertag</label>
            <input
              required
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Celestial Ranger"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-aurora"
            />
          </motion.div>
        )}
        <div>
          <label className="text-sm uppercase tracking-wide text-white/60">Email</label>
          <input
            required
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="student@bennett.edu.in"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-aurora"
          />
        </div>
        <div>
          <label className="text-sm uppercase tracking-wide text-white/60">Password</label>
          <input
            required
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pulse"
          />
        </div>
        {error && <p className="text-sm text-pulse">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Syncing...' : mode === 'login' ? 'Launch Session' : 'Claim Callsign'}
        </button>
      </form>
      <p className="mt-4 text-center text-xs uppercase tracking-widest text-white/40">
        ceteris-paribus multiplayer authentication • mongodb atlas
      </p>
    </div>
  );
};

export default AuthPanel;




