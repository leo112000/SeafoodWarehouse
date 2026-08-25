import { create } from 'zustand';
import type { SeafoodProduct } from '../types';
import { warehouseService, type WarehouseItem } from '../services/warehouseService';

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
  products: [
    {
      id: '1',
      name: 'Tôm Hùm Bông',
      category: 'Giáp xác',
      quantity: 120,
      price: 1500000,
      storageLocation: 'Kho đông lạnh A1',
      status: 'InStock',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Cua Hoàng Đế',
      category: 'Giáp xác',
      quantity: 15,
      price: 2200000,
      storageLocation: 'Kho đông lạnh A2',
      status: 'LowStock',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Cá Hồi Na Uy',
      category: 'Cá tươi',
      quantity: 350,
      price: 3500000,
      storageLocation: 'Kho làm mát B1',
      status: 'InStock',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Mực Lá Đại',
      category: 'Thân mềm',
      quantity: 0,
      price: 450000,
      storageLocation: 'Kho đông lạnh A1',
      status: 'OutofStock',
      lastUpdated: new Date().toISOString(),
    },
  ],
  warehouses: [],
  loading: false,
  isLoading: false,
  fetchWarehouses: async () => {
    set({ loading: true, isLoading: true });
    try {
      const data = await warehouseService.getAll();
      if (data && data.length > 0) {
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
