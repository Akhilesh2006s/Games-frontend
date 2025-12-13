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
      // Small delay to ensure auth state is updated before navigation
      setTimeout(() => {
        onSuccess?.();
      }, 50);
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
    <div id="auth" className="glass-panel relative overflow-hidden p-8 text-white">
      <div className="mb-6 flex gap-2 rounded-full bg-white/5 p-1">
        {['login', 'register'].map((type) => (
          <button
            key={type}
            type="button"
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-all ${
              mode === type 
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/50' 
                : 'text-white/70 hover:text-white'
            }`}
            onClick={() => setMode(type)}
          >
            {type === 'login' ? 'LOGIN' : 'SIGN UP'}
          </button>
        ))}
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">Gamertag</label>
            <input
              required
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Celestial Ranger"
              className="w-full rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </motion.div>
        )}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">EMAIL</label>
          <input
            required
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="student@bennett.edu.in"
            className="w-full rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/80 mb-2">PASSWORD</label>
          <input
            required
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>
        {error && <p className="text-sm text-pulse font-medium">{error}</p>}
        <button 
          type="submit" 
          className="w-full rounded-xl px-6 py-4 font-bold text-white uppercase tracking-wider bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={loading}
        >
          {loading ? 'Syncing...' : 'LAUNCH SESSION'}
        </button>
      </form>
      <p className="mt-6 text-center text-xs uppercase tracking-widest text-white/40">
        CETERIS-PARIBUS MULTIPLAYER AUTHENTICATION
      </p>
    </div>
  );
};

export default AuthPanel;




