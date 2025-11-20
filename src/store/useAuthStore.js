import { create } from 'zustand';

const storageKey = 'cp_auth';

const readPersisted = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Failed to parse auth storage', err);
    return null;
  }
};

const persist = (nextState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, JSON.stringify(nextState));
};

const initial = readPersisted();

const useAuthStore = create((set) => ({
  token: initial?.token || '',
  user: initial?.user || null,
  status: 'idle',
  setAuth: ({ token, user }) =>
    set(() => {
      const snapshot = { token, user };
      persist(snapshot);
      return { token, user };
    }),
  logout: () =>
    set(() => {
      persist({ token: '', user: null });
      return { token: '', user: null };
    }),
}));

export default useAuthStore;




