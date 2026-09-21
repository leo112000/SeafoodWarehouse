import { create } from 'zustand';
import { tenantService, type TenantItem } from '@/services/tenantService';

interface TenantState {
  tenants: TenantItem[];
  activeTenant: TenantItem | null;
  loading: boolean;
  fetchTenants: () => Promise<void>;
  setActiveTenantByCode: (code: string) => Promise<void>;
  updateActiveTenantInfo: (info: Partial<TenantItem>) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  activeTenant: null,
  loading: false,

  fetchTenants: async () => {
    set({ loading: true });
    try {
      const data = await tenantService.getAll();
      if (data && data.length > 0) {
        const storedCode = localStorage.getItem('tenantName') || '';
        const found = data.find((t) => t.code.toLowerCase() === storedCode.toLowerCase()) || data[0];
        set({ tenants: data, activeTenant: found });
      }
    } catch {
      // Keep default
    } finally {
      set({ loading: false });
    }
  },

  setActiveTenantByCode: async (code: string) => {
    localStorage.setItem('tenantName', code);
    const tenants = get().tenants;
    const found = tenants.find((t) => t.code.toLowerCase() === code.toLowerCase());
    if (found) {
      set({ activeTenant: found });
    } else {
      try {
        const tenant = await tenantService.getByCode(code);
        if (tenant) {
          set({ activeTenant: tenant });
        }
      } catch {
        // Fallback
      }
    }
  },

  updateActiveTenantInfo: (info) => {
    set((state) => ({
      activeTenant: state.activeTenant ? { ...state.activeTenant, ...info } : null,
      tenants: state.tenants.map((t) => (t.code === state.activeTenant?.code ? { ...t, ...info } : t)),
    }));
  },
}));
