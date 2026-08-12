import { create } from 'zustand';

export interface Batch {
  batchCode: string;
  seafoodCode: string;
  seafoodName: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number; // In stock (kg)
  unitPrice: number; // Price per kg
}

interface BatchState {
  batches: Batch[];
  deductStock: (batchCode: string, qty: number) => void;
  addBatch: (batch: Batch) => void;
}

export const useBatchStore = create<BatchState>((set) => ({
  batches: [
    {
      batchCode: 'LOT-TOMHUM-20260810',
      seafoodCode: 'TOMHUM',
      seafoodName: 'Tôm Hùm Bông',
      expiryDate: '2026-08-15',
      quantity: 50,
      unitPrice: 1500000,
    },
    {
      batchCode: 'LOT-TOMHUM-20260811',
      seafoodCode: 'TOMHUM',
      seafoodName: 'Tôm Hùm Bông',
      expiryDate: '2026-08-18',
      quantity: 70,
      unitPrice: 1550000,
    },
    {
      batchCode: 'LOT-CUAHD-20260805',
      seafoodCode: 'CUAHD',
      seafoodName: 'Cua Hoàng Đế',
      expiryDate: '2026-08-30',
      quantity: 10,
      unitPrice: 2200000,
    },
    {
      batchCode: 'LOT-CUAHD-20260812',
      seafoodCode: 'CUAHD',
      seafoodName: 'Cua Hoàng Đế',
      expiryDate: '2026-09-05',
      quantity: 15,
      unitPrice: 2300000,
    },
    {
      batchCode: 'LOT-CAHOI-20260812',
      seafoodCode: 'CAHOI',
      seafoodName: 'Cá Hồi Na Uy',
      expiryDate: '2026-08-25',
      quantity: 350,
      unitPrice: 350000,
    },
    {
      batchCode: 'LOT-MUCLA-20260811',
      seafoodCode: 'MUCLA',
      seafoodName: 'Mực Lá Đại',
      expiryDate: '2026-08-20',
      quantity: 80,
      unitPrice: 450000,
    },
  ],
  deductStock: (batchCode, qty) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.batchCode === batchCode ? { ...b, quantity: Math.max(0, b.quantity - qty) } : b
      ),
    })),
  addBatch: (batch) =>
    set((state) => ({
      batches: [...state.batches, batch],
    })),
}));
