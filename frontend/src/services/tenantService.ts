import { api } from './api';

export interface TenantItem {
  id: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface CreateTenantDto {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  logoUrl?: string;
}

export interface UpdateTenantDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  logoUrl?: string;
  isActive: boolean;
}

export const tenantService = {
  getAll: async (): Promise<TenantItem[]> => {
    try {
      const response = await api.get<TenantItem[]>('/tenants');
      return response.data;
    } catch {
      // Fallback default store if API not reachable
      return [];
    }
  },

  getById: async (id: number): Promise<TenantItem> => {
    const response = await api.get<TenantItem>(`/tenants/${id}`);
    return response.data;
  },

  getByCode: async (code: string): Promise<TenantItem> => {
    const response = await api.get<TenantItem>(`/tenants/code/${code}`);
    return response.data;
  },

  create: async (dto: CreateTenantDto): Promise<TenantItem> => {
    const response = await api.post('/tenants', dto);
    return response.data?.data || response.data;
  },

  update: async (id: number, dto: UpdateTenantDto): Promise<TenantItem> => {
    const response = await api.put(`/tenants/${id}`, dto);
    return response.data?.data || response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tenants/${id}`);
  },
};
