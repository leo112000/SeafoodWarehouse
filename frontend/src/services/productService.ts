import { api } from './api';
import type { Product } from '../types/seafood';

export const productService = {
  async getAll(): Promise<Product[]> {
    try {
      const response = await api.get('/products?pageSize=100');
      const rawList = response.data?.items || response.data?.data || (Array.isArray(response.data) ? response.data : []);
      if (Array.isArray(rawList)) {
        return rawList.map((item: any) => ({
          id: String(item.id),
          code: item.code,
          name: item.name,
          categoryId: String(item.categoryId || 'CA'),
          categoryName: item.categoryName || 'Cá',
          unit: item.unit || 'Kg',
          storageType: item.storageType || 'FROZEN',
          targetTemperature: item.targetTemperature ?? -18,
          warningDaysBeforeExpiry: item.warningDaysBeforeExpiry ?? 3,
          minStock: item.minimumStock ?? item.minStockQuantity ?? item.minStock ?? 50,
          maxStock: item.maximumStock ?? item.maxStockQuantity ?? item.maxStock ?? 500,
          referencePrice: item.referencePrice ?? 0,
          status: item.status || 'ACTIVE',
          note: item.description || item.note,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const response = await api.post('/products', {
      code: data.code,
      name: data.name,
      categoryId: parseInt(data.categoryId) || 1,
      unit: data.unit,
      storageType: data.storageType,
      targetTemperature: data.targetTemperature,
      minimumStock: data.minStock,
      maximumStock: data.maxStock,
      referencePrice: data.referencePrice,
      warningDaysBeforeExpiry: data.warningDaysBeforeExpiry,
      status: data.status || 'ACTIVE',
      description: data.note,
    });
    const item = response.data.data || response.data;
    return {
      id: String(item.id || Date.now()),
      ...data,
    };
  },

  async update(id: string, data: Omit<Product, 'id'>): Promise<void> {
    await api.put(`/products/${id}`, {
      code: data.code,
      name: data.name,
      categoryId: parseInt(data.categoryId) || 1,
      unit: data.unit,
      storageType: data.storageType,
      targetTemperature: data.targetTemperature,
      minimumStock: data.minStock,
      maximumStock: data.maxStock,
      referencePrice: data.referencePrice,
      warningDaysBeforeExpiry: data.warningDaysBeforeExpiry,
      status: data.status || 'ACTIVE',
      description: data.note,
    });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
