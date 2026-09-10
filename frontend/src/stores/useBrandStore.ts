import { create } from 'zustand';
import { tenantService } from '../services/tenantService';

interface BrandState {
  websiteName: string;
  logoUrl: string;
  tenantId?: number;
  loading: boolean;
  loadBrand: () => Promise<void>;
  updateBrand: (name: string, logoUrl?: string) => Promise<void>;
}

export const useBrandStore = create<BrandState>((set, get) => ({
  websiteName: localStorage.getItem('app_website_name') || 'KHO HẢI SẢN',
  logoUrl: localStorage.getItem('app_website_logo') || '',
  tenantId: undefined,
  loading: false,

  loadBrand: async () => {
    try {
      set({ loading: true });
      const tenants = await tenantService.getAll();
      if (tenants && tenants.length > 0) {
        const primary = tenants[0];
        const name = primary.name || localStorage.getItem('app_website_name') || 'KHO HẢI SẢN';
        const logo = primary.logoUrl || localStorage.getItem('app_website_logo') || '';
        localStorage.setItem('app_website_name', name);
        localStorage.setItem('app_website_logo', logo);
        set({ websiteName: name, logoUrl: logo, tenantId: primary.id });
      } else {
        set({ tenantId: undefined });
      }
    } catch {
      // Bỏ qua lỗi kết nối
    } finally {
      set({ loading: false });
    }
  },

  updateBrand: async (name: string, logoUrl?: string) => {
    const cleanName = name.trim() || 'KHO HẢI SẢN';
    const cleanLogo = logoUrl?.trim() || '';
    localStorage.setItem('app_website_name', cleanName);
    localStorage.setItem('app_website_logo', cleanLogo);
    set({ websiteName: cleanName, logoUrl: cleanLogo });

    try {
      const { tenantId } = get();
      if (tenantId) {
        try {
          const tenant = await tenantService.getById(tenantId);
          if (tenant) {
            await tenantService.update(tenantId, {
              name: cleanName,
              logoUrl: cleanLogo,
              address: tenant.address,
              phone: tenant.phone,
              email: tenant.email,
              taxCode: tenant.taxCode,
              isActive: tenant.isActive,
            });
            return;
          }
        } catch {
          // Tenant id cũ không còn tồn tại, chuyển về tìm tenant khả dụng
          set({ tenantId: undefined });
        }
      }

      const tenants = await tenantService.getAll();
      if (tenants && tenants.length > 0) {
        const primary = tenants[0];
        await tenantService.update(primary.id, {
          name: cleanName,
          logoUrl: cleanLogo,
          address: primary.address,
          phone: primary.phone,
          email: primary.email,
          taxCode: primary.taxCode,
          isActive: primary.isActive,
        });
        set({ tenantId: primary.id });
      }
    } catch {
      // Backend update failure won't break UI since localStorage has it
    }
  },
}));

