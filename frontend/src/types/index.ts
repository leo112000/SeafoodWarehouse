import type { StockStatus } from '../constants/enums';

export interface SeafoodProduct {
  id: string;
  name: string;
  category: string;
  quantity: number; // in kg
  price: number; // in VND
  storageLocation: string; // e.g. Cold room A, Freezer B
  status: StockStatus;
  lastUpdated: string;
}

export interface WarehouseStats {
  totalProducts: number;
  totalQuantity: number; // in kg
  lowStockAlerts: number;
  categoriesCount: Record<string, number>;
}

export * from '../constants/enums';
export * from './seafood';


