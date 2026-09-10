import { api } from './api';
import type { PackagingLoan, PackagingReturn } from '../stores/usePackagingReturnStore';

export const packagingReturnService = {
  async getLoans(): Promise<PackagingLoan[]> {
    try {
      const response = await api.get('/packaging/loans');
      if (response.data && response.data.data) {
        return response.data.data.map((item: any) => ({
          id: String(item.id),
          partnerName: item.partnerName,
          partnerType: item.partnerType,
          packagingCode: item.packagingCode,
          packagingName: item.packagingName,
          loanedQty: Number(item.loanedQty) || 0,
          returnedQty: Number(item.returnedQty) || 0,
          date: item.date,
          note: item.note,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async getReturns(): Promise<PackagingReturn[]> {
    try {
      const response = await api.get('/packaging/returns');
      if (response.data && response.data.data) {
        return response.data.data.map((item: any) => ({
          id: String(item.id),
          loanId: String(item.loanId),
          partnerName: item.partnerName,
          packagingCode: item.packagingCode,
          packagingName: item.packagingName,
          returnedQty: Number(item.returnedQty) || 0,
          returnDate: item.returnDate,
          recordedBy: item.recordedBy,
          note: item.note,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async createLoan(data: Omit<PackagingLoan, 'id' | 'returnedQty'>): Promise<PackagingLoan | null> {
    try {
      const response = await api.post('/packaging/loans', data);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },

  async createReturn(data: {
    loanId: string;
    returnedQty: number;
    returnDate: string;
    recordedBy: string;
    note?: string;
  }): Promise<PackagingReturn | null> {
    try {
      const response = await api.post('/packaging/returns', data);
      return response.data?.data || null;
    } catch {
      return null;
    }
  },
};
