import { api } from './api';

export interface PartnerItem {
  id: number;
  code: string;
  name: string;
  type: 'SUPPLIER' | 'CUSTOMER';
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  note?: string;
  isActive: boolean;
  tenantId?: number | null;
  createdAt?: string;
}

export interface CreatePartnerDto {
  code: string;
  name: string;
  type: 'SUPPLIER' | 'CUSTOMER';
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  note?: string;
  isActive?: boolean;
}

export const partnerService = {
  getAll: async (type?: 'SUPPLIER' | 'CUSTOMER', search?: string): Promise<PartnerItem[]> => {
    const params: any = {};
    if (type) params.type = type;
    if (search) params.search = search;
    const response = await api.get('/partners', { params });
    return response.data?.data || [];
  },

  getById: async (id: number): Promise<PartnerItem> => {
    const response = await api.get(`/partners/${id}`);
    return response.data?.data;
  },

  create: async (dto: CreatePartnerDto): Promise<PartnerItem> => {
    const response = await api.post('/partners', dto);
    return response.data?.data;
  },

  update: async (id: number, dto: Partial<CreatePartnerDto>): Promise<PartnerItem> => {
    const response = await api.put(`/partners/${id}`, dto);
    return response.data?.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/partners/${id}`);
  },
};
