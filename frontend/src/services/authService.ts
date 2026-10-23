import { api } from './api';
import type { UserInfo } from '@/stores/useAuthStore';

export interface IsTenantAvailableInput {
  tenancyName?: string;
}

export const TenantAvailabilityState = {
  Available: 1,
  InActive: 2,
  NotFound: 3,
} as const;

export type TenantAvailabilityState =
  (typeof TenantAvailabilityState)[keyof typeof TenantAvailabilityState];


export interface IsTenantAvailableOutput {
  state: TenantAvailabilityState;
  tenantId?: number | null;
  tenantCode?: string | null;
  tenantName?: string | null;
}

export interface LoginParams {
  email: string;
  password: string;
  tenantName?: string;
  tenantId?: number | null;
}

export interface LoginResult {
  token: string;
  refreshToken?: string;
  user: UserInfo;
}

export const authService = {
  async isTenantAvailable(tenancyName?: string): Promise<IsTenantAvailableOutput> {
    try {
      const response = await api.post('/auth/is-tenant-available', { tenancyName });
      if (response.data && response.data.isSuccess) {
        return response.data.data;
      }
      return {
        state: TenantAvailabilityState.NotFound,
      };
    } catch {
      return {
        state: TenantAvailabilityState.NotFound,
      };
    }
  },

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

  async impersonateTenant(tenantId: number): Promise<LoginResult> {
    try {
      const response = await api.post(`/auth/impersonate-tenant/${tenantId}`);
      if (response.data && response.data.isSuccess) {
        return response.data.data;
      }
      if (response.data && response.data.token) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Không thể đăng nhập vào tài khoản Tenant.');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      await api.post('/auth/revoke', { refreshToken });
    } catch {
      // Bỏ qua lỗi mạng khi logout, vẫn dọn dẹp client
    }
  },
};

