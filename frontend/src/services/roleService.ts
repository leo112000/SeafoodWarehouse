import { api } from './api';
import type { Role } from '@/types/seafood';

export const roleService = {
  async getAll(): Promise<Role[]> {
    try {
      const response = await api.get('/roles');
      if (response.data && response.data.data) {
        return response.data.data.map((r: any) => ({
          id: String(r.id),
          name: r.name,
          description: r.description,
          isSystemDefault: Boolean(r.isSystemDefault),
          permissions: r.permissions || [],
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: { name: string; description: string; permissions: string[] }): Promise<Role | null> {
    const response = await api.post('/roles', data);
    return response.data?.data || null;
  },

  async update(id: string, data: { name: string; description: string; permissions: string[] }): Promise<void> {
    await api.put(`/roles/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },
};
