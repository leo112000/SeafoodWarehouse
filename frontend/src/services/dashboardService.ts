import { api } from './api';
import type { DashboardData } from './mockDashboardData';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await api.get('/dashboard');
      if (response.data && response.data.isSuccess) {
        return response.data.data;
      }
      if (response.data && response.data.alerts) {
        return response.data;
      }
      throw new Error('Không thể tải dữ liệu dashboard.');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi gọi API Dashboard.');
    }
  },
};
