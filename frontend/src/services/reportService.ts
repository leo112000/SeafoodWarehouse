import { api } from './api';
import type { ReportData } from './mockReportData';

export const reportService = {
  async getReportData(timeFrame: string = 'month', dateRange: string = '', categoryId?: string): Promise<ReportData> {
    try {
      const response = await api.get('/reports', {
        params: { timeFrame, dateRange, categoryId },
      });
      if (response.data && response.data.isSuccess) {
        return response.data.data;
      }
      if (response.data && response.data.summary) {
        return response.data;
      }
      throw new Error('Không thể tải dữ liệu báo cáo.');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Lỗi khi gọi API Báo cáo.');
    }
  },
};
