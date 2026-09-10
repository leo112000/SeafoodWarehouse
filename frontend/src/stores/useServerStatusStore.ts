import { create } from 'zustand';
import axios from 'axios';

export interface TechnicalDetails {
  url?: string;
  method?: string;
  statusCode?: number | string;
  timestamp?: string;
  serverMessage?: string;
  validationErrors?: string[];
  raw?: any;
}

export interface BusinessErrorInfo {
  isOpen: boolean;
  title: string;
  message: string;
  details?: TechnicalDetails | null;
}

interface ServerStatusState {
  isOnline: boolean;
  errorStatus: number | 'NETWORK_ERROR' | null;
  errorMessage: string;
  errorDetails: TechnicalDetails | null;
  isRecovering: boolean;
  checking: boolean;

  businessError: BusinessErrorInfo | null;

  setOffline: (status: number | 'NETWORK_ERROR', message: string, details?: TechnicalDetails) => void;
  setOnline: () => void;
  checkConnection: () => Promise<boolean>;

  showBusinessError: (title: string, message: string, details?: TechnicalDetails) => void;
  closeBusinessError: () => void;
}

export const useServerStatusStore = create<ServerStatusState>((set, get) => ({
  isOnline: true,
  errorStatus: null,
  errorMessage: '',
  errorDetails: null,
  isRecovering: false,
  checking: false,
  businessError: null,

  setOffline: (status, message, details) => {
    // Chỉ cập nhật nếu trước đó đang online hoặc trạng thái thay đổi hoặc có thêm chi tiết lỗi
    if (get().isOnline || get().errorStatus !== status || !get().errorDetails) {
      set({
        isOnline: false,
        errorStatus: status,
        errorMessage: message,
        errorDetails: details || null,
        isRecovering: false,
      });
    }
  },

  setOnline: () => {
    if (!get().isOnline) {
      set({
        isOnline: true,
        errorStatus: null,
        errorMessage: '',
        errorDetails: null,
        isRecovering: true,
      });

      // Hiển thị thông báo "đã kết nối lại" trong 3.5s rồi tắt
      setTimeout(() => {
        set({ isRecovering: false });
      }, 3500);
    }
  },

  checkConnection: async () => {
    set({ checking: true });
    try {
      const baseURL = import.meta.env.VITE_API_URL || '/api';
      await axios.get(`${baseURL}/healthcheck`, { timeout: 4000 });
      get().setOnline();
      return true;
    } catch (err: any) {
      const status = err.response?.status || 'NETWORK_ERROR';
      const msg = err.response?.status
        ? `Máy chủ phản hồi mã lỗi ${err.response.status}`
        : 'Không thể kết nối tới dịch vụ máy chủ backend (ERR_CONNECTION_REFUSED).';
      const details: TechnicalDetails = {
        url: `${import.meta.env.VITE_API_URL || '/api'}/healthcheck`,
        method: 'GET',
        statusCode: status,
        timestamp: new Date().toLocaleTimeString('vi-VN') + ' ' + new Date().toLocaleDateString('vi-VN'),
        serverMessage: err.response?.data?.message || err.message,
      };
      get().setOffline(status, msg, details);
      return false;
    } finally {
      set({ checking: false });
    }
  },

  showBusinessError: (title, message, details) => {
    set({
      businessError: {
        isOpen: true,
        title: title || 'Có lỗi xảy ra!',
        message: message || 'Thao tác không thành công, vui lòng thử lại.',
        details: details || null,
      },
    });
  },

  closeBusinessError: () => {
    set({ businessError: null });
  },
}));

