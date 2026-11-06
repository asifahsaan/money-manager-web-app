import axios from 'axios';
import { useConnectionStore } from '@/stores/connection.store';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear token and redirect to login
apiClient.interceptors.response.use(
  (response) => {
    useConnectionStore.getState().setReachable(true);
    return response;
  },
  (error) => {
    // No answer at all, or a gateway error: the problem is the connection, not the request
    if (!axios.isCancel(error)) {
      const status = error.response?.status;
      useConnectionStore.getState().setReachable(!!status && ![502, 503, 504].includes(status));
    }
    // A 401 from login/register is a wrong password: let the form show it instead of reloading the page
    const authCall = /\/auth\/(login|register)$/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && !authCall) {
      localStorage.removeItem('mm_token');
      localStorage.removeItem('mm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
