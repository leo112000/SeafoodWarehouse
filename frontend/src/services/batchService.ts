import { api } from './api';

export interface BatchItem {
  id: number;
  batchCode: string;
  productId: number;
  productName: string;
  productionDate: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  grade: string | number;
  supplierName: string;
  certificateCode: string;
  daysUntilExpiry?: number;
}

/** Dữ liệu lô hàng theo FEFO dùng trong trang Xuất kho */
export interface FefoBatch {
  batchCode: string;
  productId: number;
  productCode: string;
  productName: string;
  expiryDate: string;   // yyyy-MM-dd
  quantity: number;     // kg còn lại
  unitPrice: number;    // VNĐ/kg
  supplierName: string;
}

export const batchService = {
  async getAll(productId?: number): Promise<BatchItem[]> {
    try {
      const response = await api.get('/lotbatches', {
        params: { productId, pageSize: 100 },
      });
      if (response.data && response.data.items) {
        return response.data.items;
      }
      return [];
    } catch {
      return [];
    }
  },

  /** Lấy tất cả lô còn tồn kho, sắp xếp FEFO (hết hạn sớm nhất đầu tiên) */
  async getFefo(): Promise<FefoBatch[]> {
    try {
      const response = await api.get('/lotbatches/fefo');
      if (response.data?.isSuccess && Array.isArray(response.data.data)) {
        return response.data.data as FefoBatch[];
      }
      return [];
    } catch {
      return [];
    }
  },

  async getExpiring(daysAhead: number = 30): Promise<BatchItem[]> {
    try {
      const response = await api.get('/lotbatches/expiring', {
        params: { daysAhead },
      });
      if (response.data) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: any): Promise<any> {
    const response = await api.post('/lotbatches', data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/lotbatches/${id}`);
  },
};

