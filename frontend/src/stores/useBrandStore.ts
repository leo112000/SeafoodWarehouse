import { create } from 'zustand';
import { settingService } from '@/services/settingService';
import { useAuthStore } from './useAuthStore';

interface BrandState {
  websiteName: string;
  logoUrl: string;
  tenantId?: number;
  loading: boolean;
  loadBrand: () => Promise<void>;
  updateBrand: (name: string, logoUrl?: string) => Promise<void>;
}

export const useBrandStore = create<BrandState>((set) => ({
  websiteName: localStorage.getItem('app_website_name') || 'KHO HẢI SẢN',
  logoUrl: localStorage.getItem('app_website_logo') || '',
  tenantId: undefined,
  loading: false,

  loadBrand: async () => {
    try {
      set({ loading: true });
      const user = useAuthStore.getState().user;
      const settings = await settingService.getSettings();

      const defaultName = user?.tenantName || localStorage.getItem('app_website_name') || 'KHO HẢI SẢN';
      const name = settings.websiteName || defaultName;
      const logo = (settings.logoUrl !== undefined && settings.logoUrl !== null && settings.logoUrl !== '')
        ? settings.logoUrl
        : (localStorage.getItem('app_website_logo') || '');

      localStorage.setItem('app_website_name', name);
      localStorage.setItem('app_website_logo', logo);
      set({ websiteName: name, logoUrl: logo, tenantId: user?.tenantId ?? undefined });
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
      const currentSettings = await settingService.getSettings();
      await settingService.updateSettings({
        ...currentSettings,
        websiteName: cleanName,
        logoUrl: cleanLogo,
      });
    } catch {
      // Backend update failure won't break UI since localStorage has it
    }
  },
}));
