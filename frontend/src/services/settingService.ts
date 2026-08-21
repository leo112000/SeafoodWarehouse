import { api } from './api';

export interface SystemSetting {
  id?: number;
  expiringAlertDays: number;
  tempDeviationThreshold: number;
  defaultSeafoodPrice: number;
  autoRefreshIntervalSeconds: number;
  lowStockWarningPercent: number;
}

export const settingService = {
  async getSettings(): Promise<SystemSetting> {
    try {
      const response = await api.get('/settings');
      if (response.data && response.data.isSuccess && response.data.data) {
        return response.data.data;
      }
      return {
        expiringAlertDays: 15,
        tempDeviationThreshold: 3.0,
        defaultSeafoodPrice: 250000,
        autoRefreshIntervalSeconds: 30,
        lowStockWarningPercent: 100,
      };
    } catch {
      return {
        expiringAlertDays: 15,
        tempDeviationThreshold: 3.0,
        defaultSeafoodPrice: 250000,
        autoRefreshIntervalSeconds: 30,
        lowStockWarningPercent: 100,
      };
    }
  },

  async updateSettings(data: SystemSetting): Promise<SystemSetting> {
    const response = await api.put('/settings', data);
    return response.data?.data || data;
  },
};
