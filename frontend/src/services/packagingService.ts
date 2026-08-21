import { api } from './api';
import type { PackagingType } from '../types/seafood';

export const packagingService = {
  async getAll(): Promise<PackagingType[]> {
    try {
      const response = await api.get('/packaging');
      if (response.data && response.data.data) {
        return response.data.data.map((item: any) => ({
          id: String(item.id),
          code: item.code,
          name: item.name,
          category: item.category || 'CONTAINER',
          defaultTareWeight: Number(item.defaultTareWeight) || 0,
          unit: item.unit || 'Cái',
          stockQuantity: Number(item.stockQuantity) || 0,
          note: item.note,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: Omit<PackagingType, 'id'>): Promise<PackagingType | null> {
    const response = await api.post('/packaging', data);
    return response.data?.data || null;
  },

  async update(id: string, data: Omit<PackagingType, 'id'>): Promise<void> {
    await api.put(`/packaging/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/packaging/${id}`);
  },

  async adjustStock(data: { packagingId: number; adjustmentQty: number; reason: string }): Promise<void> {
    await api.post('/packaging/adjust-stock', data);
  },
};
