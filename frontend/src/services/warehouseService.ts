import { api } from './api';

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  location: string;
  capacityKg: number;
  currentStockKg: number;
  temperatureCelsius: number;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'FULL';
  storageType: 'FROZEN' | 'FRESH' | 'ALIVE' | 'DRY';
  totalZones?: number;
  totalSlots?: number;
  occupiedSlots?: number;
}

export const warehouseService = {
  async getAll(): Promise<WarehouseItem[]> {
    try {
      const response = await api.get('/warehouses');
      if (response.data && response.data.items) {
        return response.data.items.map((w: any) => ({
          id: String(w.id),
          code: w.code,
          name: w.name,
          location: w.address || w.location || 'Khu A',
          capacityKg: w.capacityKg || w.totalCapacityKg || 10000,
          currentStockKg: w.currentStockKg || w.usedCapacityKg || 0,
          temperatureCelsius: w.temperatureCelsius ?? -18,
          status: w.status || 'OPERATIONAL',
          storageType: w.storageType || 'FROZEN',
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: Omit<WarehouseItem, 'id'>): Promise<WarehouseItem> {
    const response = await api.post('/warehouses', {
      code: data.code,
      name: data.name,
      address: data.location,
      totalCapacityKg: data.capacityKg,
      temperatureCelsius: data.temperatureCelsius,
      storageType: data.storageType,
    });
    const item = response.data.data || response.data;
    return {
      id: String(item.id || Date.now()),
      ...data,
    };
  },

  async update(id: string, data: Omit<WarehouseItem, 'id'>): Promise<void> {
    await api.put(`/warehouses/${id}`, {
      code: data.code,
      name: data.name,
      address: data.location,
      totalCapacityKg: data.capacityKg,
      temperatureCelsius: data.temperatureCelsius,
      storageType: data.storageType,
    });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/warehouses/${id}`);
  },
};
