import { api } from './api';
import type { UserInfo } from '../stores/useAuthStore';

export interface LoginParams {
  email: string;
  password: string;
  tenantName?: string;
}

export interface LoginResult {
  token: string;
  user: UserInfo;
}

export const authService = {
  async login(params: LoginParams): Promise<LoginResult> {
    try {
      const response = await api.post('/auth/login', params);
      if (response.data && response.data.isSuccess) {
        return response.data.data;
      }
      if (response.data && response.data.token) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Đăng nhập không thành công.');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};
