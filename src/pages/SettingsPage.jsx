import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    username: user?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setMessage({ type: '', text: '' });
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setMessage({ type: 'error', text: 'Username cannot be empty' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.put('/auth/profile', {
        username: formData.username.trim(),
      });
      useAuthStore.getState().setAuth({
        token: useAuthStore.getState().token,
        user: data.user,
      });
      setMessage({ type: 'success', text: 'Username updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update username',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!formData.currentPassword || !formData.newPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/auth/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRefreshName = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post('/auth/refresh-name');
      useAuthStore.getState().setAuth({
        token: useAuthStore.getState().token,
        user: data.user,
      });
      setMessage({ type: 'success', text: 'Student name refreshed from database!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to refresh name',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-night px-4 py-8 md:px-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.6em] text-white/40">Settings</p>
          <h1 className="text-3xl font-display font-semibold">Account Settings</h1>
        </div>
        <button
          onClick={() => navigate('/arena')}
          className="btn-ghost"
        >
          Back to Arena
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="glass-panel space-y-6 p-6 text-white">
          <header>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Profile Information</p>
            <h2 className="text-2xl font-semibold mt-2">Your Account</h2>
          </header>

          <div className="space-y-4">
            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Name</label>
              <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                {user?.studentName || user?.username || 'Not set'}
              </div>
              <p className="mt-1 text-xs text-white/40">
                This is your name from the student database
              </p>
              <button
                onClick={handleRefreshName}
                disabled={loading}
                className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
              >
                {loading ? 'Refreshing...' : 'Refresh from Database'}
              </button>
            </div>

            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Email</label>
              <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                {user?.email || 'Not set'}
              </div>
            </div>

            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Enrollment Number</label>
              <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                {user?.enrollmentNo || 'Not available'}
              </div>
            </div>
          </div>
        </div>

        {/* Update Username */}
        <div className="glass-panel space-y-6 p-6 text-white">
          <header>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Account Settings</p>
            <h2 className="text-2xl font-semibold mt-2">Update Username</h2>
          </header>

          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter new username"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-aurora"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Username'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="glass-panel space-y-6 p-6 text-white">
          <header>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Security</p>
            <h2 className="text-2xl font-semibold mt-2">Change Password</h2>
          </header>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pulse"
                required
              />
            </div>
            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pulse"
                required
              />
            </div>
            <div>
              <label className="text-sm uppercase tracking-wide text-white/60">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-pulse"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="glass-panel space-y-6 p-6 text-white border-2 border-red-500/20">
          <header>
            <p className="text-xs uppercase tracking-[0.4em] text-red-400/60">Danger Zone</p>
            <h2 className="text-2xl font-semibold mt-2 text-red-400">Account Actions</h2>
          </header>

          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full rounded-2xl border-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500/20 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-center ${
            message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-400'
              : 'border-red-500/50 bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}
    </main>
  );
};

export default SettingsPage;

