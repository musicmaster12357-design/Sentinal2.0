import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const isProd = import.meta.env.MODE === 'production';
const API_URL = import.meta.env.VITE_API_URL || (isProd ? 'https://sentinal20-production.up.railway.app/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
