import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Configure default Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token and ABP tenant headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantName = localStorage.getItem('tenantName');
    if (tenantName) {
      config.headers['__tenant'] = tenantName;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Configure React Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
