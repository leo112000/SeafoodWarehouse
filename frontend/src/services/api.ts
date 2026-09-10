import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore, isTokenExpired } from '../stores/useAuthStore';
import { useServerStatusStore } from '../stores/useServerStatusStore';

// Configure default Axios instance
export const api = axios.create({
  baseURL: ((typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL) || '/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirecting = false;

export const resetUnauthorizedCooldown = () => {
  isRedirecting = false;
};

export const handleUnauthorized = () => {
  useAuthStore.getState().logout();
  queryClient.clear();

  if (typeof window !== 'undefined' && window.location.pathname !== '/login' && !isRedirecting) {
    isRedirecting = true;
    window.location.href = '/login';
    setTimeout(() => {
      isRedirecting = false;
    }, 3000);
  }
};

// Interceptor to attach JWT token and ABP tenant headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (isTokenExpired(token)) {
        handleUnauthorized();
        return Promise.reject(new axios.Cancel('Token đã hết hạn hoặc quá hạn 7 ngày. Vui lòng đăng nhập lại.'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Xử lý Tenant Headers theo chuẩn ABP
    const isAuthLogin = config.url?.includes('/auth/login') || config.url?.includes('/auth/is-tenant-available');

    if (isAuthLogin) {
      // Khi đăng nhập, chỉ gửi header Tenant nếu payload request có chỉ định rõ ràng
      let bodyTenantId: any = null;
      let bodyTenantCode: any = null;
      try {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        bodyTenantId = body?.tenantId;
        bodyTenantCode = body?.tenantName;
      } catch {
        // ignore parse error
      }

      if (bodyTenantId !== undefined && bodyTenantId !== null && bodyTenantId !== '') {
        config.headers['X-Tenant-Id'] = bodyTenantId;
        config.headers['Abp.TenantId'] = bodyTenantId;
      } else {
        delete config.headers['X-Tenant-Id'];
        delete config.headers['Abp.TenantId'];
        delete config.headers['TenantId'];
      }

      if (bodyTenantCode && typeof bodyTenantCode === 'string' && bodyTenantCode.trim()) {
        config.headers['__tenant'] = encodeURIComponent(bodyTenantCode.trim());
        config.headers['X-Tenant-Code'] = bodyTenantCode.trim();
      } else {
        delete config.headers['__tenant'];
        delete config.headers['X-Tenant-Code'];
      }
    } else {
      // Đối với các request thông thường sau khi đã xác thực
      const tenantName = localStorage.getItem('tenantName');
      if (tenantName && tenantName.trim() && tenantName !== 'null') {
        config.headers['__tenant'] = encodeURIComponent(tenantName.trim());
        config.headers['X-Tenant-Code'] = tenantName.trim();
      } else {
        delete config.headers['__tenant'];
        delete config.headers['X-Tenant-Code'];
      }

      const tenantId = localStorage.getItem('tenantId');
      if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
        config.headers['X-Tenant-Id'] = tenantId;
        config.headers['Abp.TenantId'] = tenantId;
      } else {
        delete config.headers['X-Tenant-Id'];
        delete config.headers['Abp.TenantId'];
        delete config.headers['TenantId'];
      }
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

  // Chuẩn ABP error envelope: { error: { message, details, validationErrors } }
  if (error.response?.data?.error) {
    const abpErr = error.response.data.error;
    if (abpErr.validationErrors && Array.isArray(abpErr.validationErrors) && abpErr.validationErrors.length > 0) {
      return abpErr.validationErrors.map((v: any) => typeof v === 'string' ? v : v.message).join('; ');
    }
    if (abpErr.message) {
      return abpErr.message;
    }
  }

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

// Response interceptor to normalize backend Result<T> error format and handle 401 & Server downtime (500, 502, 503, Network Error)
api.interceptors.response.use(
  (response) => {
    // Khi nhận phản hồi thành công, tự động đánh dấu dịch vụ online
    useServerStatusStore.getState().setOnline();
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const config = error.config || {};
    const abpError = error.response?.data?.error;

    // Trích xuất chi tiết kỹ thuật cho modal ABP
    const technicalDetails: any = {
      url: config.url,
      method: config.method?.toUpperCase(),
      statusCode: status || (error.code === 'ERR_NETWORK' ? 'ERR_CONNECTION_REFUSED' : 'NETWORK_ERROR'),
      timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
      serverMessage: abpError?.message || (typeof error.response?.data === 'string'
        ? error.response.data
        : error.response?.data?.message || error.response?.data?.title || error.message),
      serverDetails: abpError?.details || null,
    };

    if (abpError?.validationErrors && Array.isArray(abpError.validationErrors)) {
      technicalDetails.validationErrors = abpError.validationErrors.map((v: any) =>
        typeof v === 'string' ? v : `${v.members ? v.members.join(', ') + ': ' : ''}${v.message}`
      );
    } else if (error.response?.data?.errors) {
      const errs = error.response.data.errors;
      if (Array.isArray(errs)) {
        technicalDetails.validationErrors = errs;
      } else if (typeof errs === 'object') {
        technicalDetails.validationErrors = Object.entries(errs).flatMap(
          ([field, msgs]: [string, any]) =>
            Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [`${field}: ${msgs}`]
        );
      }
    }


    // 1. Phân loại lỗi máy chủ / chết service (500, 502, 503, 504, Mất mạng hoàn toàn)
    // -> Khóa cứng màn hình không cho thao tác (chuẩn ASP Boilerplate)
    if (!error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      useServerStatusStore.getState().setOffline(
        'NETWORK_ERROR',
        'Không thể kết nối đến máy chủ Backend (ERR_CONNECTION_REFUSED / Offline). Dịch vụ có thể chưa khởi động hoặc kết nối mạng bị ngắt.',
        technicalDetails
      );
    } else if (status === 502) {
      useServerStatusStore.getState().setOffline(
        502,
        'Máy chủ Backend không phản hồi (502 Bad Gateway). Dịch vụ có thể đang bảo trì hoặc khởi động lại.',
        technicalDetails
      );
    } else if (status === 503) {
      useServerStatusStore.getState().setOffline(
        503,
        'Dịch vụ máy chủ tạm thời không khả dụng (503 Service Unavailable).',
        technicalDetails
      );
    } else if (status === 504) {
      useServerStatusStore.getState().setOffline(
        504,
        'Hết thời gian chờ phản hồi từ máy chủ (504 Gateway Timeout).',
        technicalDetails
      );
    } else if (status === 500) {
      useServerStatusStore.getState().setOffline(
        500,
        technicalDetails.serverMessage || 'Máy chủ gặp sự cố nội bộ nghiêm trọng (500 Internal Server Error).',
        technicalDetails
      );
    } else if (status === 401) {
      handleUnauthorized();
    } else if (status === 403) {
      // 403 Forbidden - Văng modal ABP thông báo từ chối truy cập
      useServerStatusStore.getState().showBusinessError(
        'Từ chối truy cập (403 Forbidden)',
        'Bạn không có quyền thực hiện thao tác này trên hệ thống.',
        technicalDetails
      );
    } else if (status === 400 || status === 404 || status === 409 || status === 422) {
      // Các lỗi khác từ máy chủ - Văng modal lỗi ABP nếu không phải form đăng nhập
      const isLoginRequest = config.url?.includes('/auth/login');
      if (!isLoginRequest) {
        useServerStatusStore.getState().showBusinessError(
          'Có lỗi xảy ra!',
          technicalDetails.serverMessage || 'Thao tác không thể hoàn tất do dữ liệu không hợp lệ.',
          technicalDetails
        );
      }
    }

    const customMessage = getErrorMessage(error, error.message);
    if (error && typeof error === 'object') {
      error.message = customMessage;
    }
    return Promise.reject(error);
  }
);

// ABP global message helper object
export const abp = {
  message: {
    error: (message: string, title = 'Có lỗi xảy ra!', details?: any) => {
      useServerStatusStore.getState().showBusinessError(
        title,
        message,
        typeof details === 'string' ? { serverMessage: details } : details
      );
    },
    warn: (message: string, title = 'Cảnh báo!') => {
      useServerStatusStore.getState().showBusinessError(title, message);
    },
  },
};

if (typeof window !== 'undefined') {
  (window as any).abp = abp;
}

// Configure React Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

