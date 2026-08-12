import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface OutboundBatch {
  batchCode: string;
  species: string;
  quantityKg: number;
  expiryDate: string; // ISO date string
  unitPrice: number; // VND per kg
  amount: number; // total amount
}

export interface OutboundTransaction {
  id: string; // e.g. PXK-20260812-001
  date: string; // ISO date string
  customerName: string;
  reason: string; // Bán hàng / Chuyển kho / Tiêu hủy
  totalWeightKg: number;
  totalAmount: number; // VND
  createdBy: string;
  batches: OutboundBatch[];
}

/** Simple mock store – replace with real API later */
export const useOutboundStore = create<{
  transactions: OutboundTransaction[];
  setTransactions: (txs: OutboundTransaction[]) => void;
}>()(
  devtools((set) => ({
    transactions: [],
    setTransactions: (txs) => set({ transactions: txs }),
  })),
);

// Populate with sample data for development
useOutboundStore.getState().setTransactions([
  {
    id: 'PXK-20260812-001',
    date: '2026-08-12',
    customerName: 'Nhà hàng Hải Sản A',
    reason: 'Bán hàng',
    totalWeightKg: 120,
    totalAmount: 2400000,
    createdBy: 'Nguyễn Văn B',
    batches: [
      {
        batchCode: 'LOT-CAHOI-20260801',
        species: 'Cá hồi',
        quantityKg: 80,
        expiryDate: '2026-09-15',
        unitPrice: 20000,
        amount: 1600000,
      },
      {
        batchCode: 'LOT-TOMU-20260805',
        species: 'Tôm hùm',
        quantityKg: 40,
        expiryDate: '2026-08-30',
        unitPrice: 20000,
        amount: 800000,
      },
    ],
  },
  {
    id: 'PXK-20260810-002',
    date: '2026-08-10',
    customerName: 'Siêu thị Hải Sản B',
    reason: 'Chuyển kho',
    totalWeightKg: 50,
    totalAmount: 1000000,
    createdBy: 'Lê Thị C',
    batches: [
      {
        batchCode: 'LOT-MU-20260720',
        species: 'Mực lá',
        quantityKg: 50,
        expiryDate: '2026-08-20',
        unitPrice: 20000,
        amount: 1000000,
      },
    ],
  },
]);
