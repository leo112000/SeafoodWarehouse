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
      config.headers['__tenant'] = encodeURIComponent(tenantName.trim());
      config.headers['X-Tenant-Code'] = tenantName.trim();
    }
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
      config.headers['Abp.TenantId'] = tenantId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Helper function to extract user-friendly error message from Axios / backend response
export const getErrorMessage = (error: any, fallbackMessage = 'Có lỗi xảy ra, vui lòng thử lại.'): string => {
  if (!error) return fallbackMessage;

  // Backend Result<T> failure response
  if (error.response?.data) {
    const data = error.response.data;
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.join('; ');
    }
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
  }

  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  return fallbackMessage;
};

// Response interceptor to normalize backend Result<T> error format
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = getErrorMessage(error, error.message);
    if (error && typeof error === 'object') {
      error.message = customMessage;
    }
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
