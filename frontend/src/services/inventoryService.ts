import { api } from './api';

export interface InventoryItemDto {
  id: number;
  warehouseId: number;
  warehouseName: string;
  lotBatchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  productCode: string;
  categoryName?: string;
  storageBin: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  productionDate?: string;
  expirationDate?: string;
  grade?: string;
  supplierName?: string;
}

export interface InventoryQueryParams {
  pageNumber?: number;
  pageSize?: number;
  warehouseId?: number;
  productId?: number;
  search?: string;
}

export interface PagedInventoryResponse {
  items: InventoryItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export const inventoryService = {
  getInventory: async (params?: InventoryQueryParams): Promise<PagedInventoryResponse> => {
    const res = await api.get<PagedInventoryResponse>('/Inventory', { params });
    return res.data;
  },
};
