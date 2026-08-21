import { api } from './api';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  status: 'Active' | 'Blocked';
  tenantName?: string;
}

export const userService = {
  async getAll(): Promise<UserRecord[]> {
    try {
      const response = await api.get('/users');
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: Partial<UserRecord>): Promise<UserRecord | null> {
    const response = await api.post('/users', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      roles: data.roles,
      status: data.status || 'Active',
      tenantName: data.tenantName || 'Default',
    });
    return response.data?.data || null;
  },

  async update(id: string, data: Partial<UserRecord>): Promise<void> {
    await api.put(`/users/${id}`, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      roles: data.roles,
      status: data.status || 'Active',
      tenantName: data.tenantName || 'Default',
    });
  },

  async toggleStatus(id: string): Promise<void> {
    await api.patch(`/users/${id}/status`);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
