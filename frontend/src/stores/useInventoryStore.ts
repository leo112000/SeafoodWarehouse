import { create } from 'zustand';
import { inventoryService, type InventoryItemDto, type InventoryQueryParams } from '@/services/inventoryService';

interface InventoryState {
  items: InventoryItemDto[];
  totalCount: number;
  loading: boolean;
  pageNumber: number;
  pageSize: number;
  warehouseId?: number;
  productId?: number;
  search: string;

  fetchInventory: (params?: InventoryQueryParams) => Promise<void>;
  setFilter: (filter: Partial<InventoryQueryParams>) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  totalCount: 0,
  loading: false,
  pageNumber: 1,
  pageSize: 10,
  search: '',

  fetchInventory: async (params) => {
    set({ loading: true });
    try {
      const current = get();
      const queryParams: InventoryQueryParams = {
        pageNumber: params?.pageNumber ?? current.pageNumber,
        pageSize: params?.pageSize ?? current.pageSize,
        warehouseId: params?.warehouseId !== undefined ? params.warehouseId : current.warehouseId,
        productId: params?.productId !== undefined ? params.productId : current.productId,
        search: params?.search !== undefined ? params.search : current.search,
      };

      const res = await inventoryService.getInventory(queryParams);
      set({
        items: res.items || [],
        totalCount: res.totalCount || 0,
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      set({ loading: false, items: [] });
    }
  },

  setFilter: (filter) => {
    set({ ...filter });
    get().fetchInventory(filter);
  },
}));
