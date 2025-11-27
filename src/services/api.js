import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const API_BASE =
  import.meta.env?.VITE_API_URL?.replace(/\/$/, '') || 'https://game-backend-production-d78d.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const socketBaseUrl =
  import.meta.env?.VITE_SOCKET_URL ||
  API_BASE.replace(/\/api$/, '') ||
  'https://game-backend-production-d78d.up.railway.app';

export default api;


