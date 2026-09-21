import { create } from 'zustand';
import type { SeafoodProduct } from '@/types';
import { warehouseService, type WarehouseItem } from '@/services/warehouseService';

interface WarehouseState {
  products: SeafoodProduct[];
  warehouses: WarehouseItem[];
  loading: boolean;
  isLoading: boolean;
  fetchWarehouses: () => Promise<void>;
  addProduct: (product: Omit<SeafoodProduct, 'id' | 'lastUpdated'>) => void;
  updateProduct: (id: string, updated: Partial<SeafoodProduct>) => void;
  deleteProduct: (id: string) => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => ({
  products: [],
  warehouses: [],
  loading: false,
  isLoading: false,
  fetchWarehouses: async () => {
    set({ loading: true, isLoading: true });
    try {
      const data = await warehouseService.getAll();
      if (Array.isArray(data)) {
        set({ warehouses: data });
      }
    } catch {
      // Keep state on error
    } finally {
      set({ loading: false, isLoading: false });
    }
  },
  addProduct: (product) =>
    set((state) => {
      const newProduct: SeafoodProduct = {
        ...product,
        id: Math.random().toString(36).substring(2, 9),
        lastUpdated: new Date().toISOString(),
      };
      return { products: [newProduct, ...state.products] };
    }),
  updateProduct: (id, updated) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id
          ? {
            ...p,
            ...updated,
            lastUpdated: new Date().toISOString(),
          }
          : p
      ),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
}));
