import { api } from './api';
import type { WarehouseZoneStatus, StorageType } from '../constants';

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  location: string;
  capacityKg: number;
  currentStockKg: number;
  temperatureCelsius: number;
  status: WarehouseZoneStatus;
  storageType: StorageType;
  description?: string;
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
          description: w.description || '',
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async create(data: Omit<WarehouseItem, 'id'>): Promise<WarehouseItem> {
    const maxCapacityTon = data.capacityKg ? data.capacityKg / 1000 : 10;
    const targetTemperature = data.temperatureCelsius ?? (data as any).temperatureCelcius ?? -18;
    const description = data.description || '';
    const response = await api.post('/warehouses', {
      code: data.code || '',
      name: data.name,
      location: data.location || 'Khu vực chính',
      type: 0,
      targetTemperature: targetTemperature,
      maxCapacityTon: maxCapacityTon,
      description: description,
    });
    const item = response.data.data || response.data;
    return {
      id: String(item.id || Date.now()),
      code: item.code || data.code || '',
      name: item.name || data.name,
      location: item.location || data.location,
      capacityKg: data.capacityKg,
      currentStockKg: 0,
      temperatureCelsius: targetTemperature,
      status: 'OPERATIONAL',
      storageType: 'FROZEN',
      description: description,
    };
  },

  async update(id: string, data: Omit<WarehouseItem, 'id'>): Promise<void> {
    const maxCapacityTon = data.capacityKg ? data.capacityKg / 1000 : 10;
    const targetTemperature = data.temperatureCelsius ?? (data as any).temperatureCelcius ?? -18;
    const description = data.description || '';
    await api.put(`/warehouses/${id}`, {
      code: data.code || '',
      name: data.name,
      location: data.location || 'Khu vực chính',
      type: 0,
      targetTemperature: targetTemperature,
      maxCapacityTon: maxCapacityTon,
      description: description,
      isActive: true,
    });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/warehouses/${id}`);
  },
};
