import { api } from './api';

export interface SystemSetting {
  id?: number;
  websiteName?: string;
  logoUrl?: string;
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
        websiteName: 'KHO HẢI SẢN',
        logoUrl: '',
        expiringAlertDays: 15,
        tempDeviationThreshold: 3.0,
        defaultSeafoodPrice: 250000,
        autoRefreshIntervalSeconds: 30,
        lowStockWarningPercent: 100,
      };
    } catch {
      return {
        websiteName: 'KHO HẢI SẢN',
        logoUrl: '',
        expiringAlertDays: 15,
        tempDeviationThreshold: 3.0,
        defaultSeafoodPrice: 250000,
        autoRefreshIntervalSeconds: 30,
        lowStockWarningPercent: 100,
      };
    }
  },

  async updateSettings(data: SystemSetting): Promise<SystemSetting> {
    const payload: any = {
      expiringAlertDays: Number(data.expiringAlertDays) || 15,
      tempDeviationThreshold: Number(data.tempDeviationThreshold) || 3.0,
      defaultSeafoodPrice: Number(data.defaultSeafoodPrice) || 250000,
      autoRefreshIntervalSeconds: Number(data.autoRefreshIntervalSeconds) || 30,
      lowStockWarningPercent: Number(data.lowStockWarningPercent) || 100,
    };
    if (data.websiteName !== undefined) {
      payload.websiteName = data.websiteName.trim() || 'KHO HẢI SẢN';
    }
    if (data.logoUrl !== undefined) {
      payload.logoUrl = data.logoUrl.trim();
    }
    const response = await api.put('/settings', payload);
    return response.data?.data || data;
  },
};
