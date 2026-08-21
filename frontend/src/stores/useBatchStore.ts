import { create } from 'zustand';
import { batchService, type BatchItem } from '../services/batchService';

export interface Batch {
  batchCode: string;
  seafoodCode: string;
  seafoodName: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number; // In stock (kg)
  unitPrice: number; // Price per kg
}

const INITIAL_BATCHES: Batch[] = [
];

interface BatchState {
  batches: Batch[];
  fetchBatches: () => Promise<void>;
  deductStock: (batchCode: string, qty: number) => void;
  addBatch: (batch: Batch) => Promise<void>;
}

export const useBatchStore = create<BatchState>((set) => ({
  batches: INITIAL_BATCHES,
  fetchBatches: async () => {
    try {
      const items = await batchService.getAll();
      if (items && items.length > 0) {
        set({
          batches: items.map((b: BatchItem) => ({
            batchCode: b.batchCode,
            seafoodCode: `HS-${b.productId}`,
            seafoodName: b.productName || 'Hải sản',
            expiryDate: b.expirationDate ? b.expirationDate.split('T')[0] : '2026-12-31',
            quantity: b.currentQuantity || 0,
            unitPrice: 300000,
          })),
        });
      }
    } catch {
      // Keep existing state
    }
  },
  deductStock: (batchCode, qty) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.batchCode === batchCode ? { ...b, quantity: Math.max(0, b.quantity - qty) } : b
      ),
    })),
  addBatch: async (batch) => {
    set((state) => ({
      batches: [...state.batches, batch],
    }));
  },
}));
