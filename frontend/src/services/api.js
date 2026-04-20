import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'http://13.228.31.66:5000/api');
const api = axios.create({ baseURL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  console.log(`[AXIOS] Outgoing ${cfg.method.toUpperCase()} ${cfg.url}`, cfg.data);
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    console.error('[AXIOS ERROR]', err.response?.status, err.response?.data);
    throw err;
  }
);

export default api;
