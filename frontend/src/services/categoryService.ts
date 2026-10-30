import { api } from './api';
import type { Category } from '@/types/seafood';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    try {
      const response = await api.get('/categories');
      const rawList = Array.isArray(response.data)
        ? response.data
        : (response.data?.items || response.data?.data || []);
      return rawList.map((item: any) => ({
        id: String(item.id),
        code: item.code,
        name: item.name,
        description: item.description || '',
        productCount: item.productCount ?? 0,
        createdAt: item.createdAt ?? new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  async create(data: Omit<Category, 'id' | 'productCount' | 'createdAt'>): Promise<Category> {
    const response = await api.post('/categories', {
      code: data.code,
      name: data.name,
      description: data.description,
    });
    const item = response.data.data || response.data;
    return {
      id: String(item.id || Date.now()),
      code: data.code,
      name: data.name,
      description: data.description,
      productCount: 0,
      createdAt: item.createdAt || new Date().toISOString(),
    };
  },

  async update(id: string, data: Omit<Category, 'id' | 'productCount' | 'createdAt'>): Promise<void> {
    await api.put(`/categories/${id}`, {
      code: data.code,
      name: data.name,
      description: data.description,
    });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
