import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { transactionService, type OutboundReceiptPayload } from '../services/transactionService';

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

interface OutboundState {
  transactions: OutboundTransaction[];
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: OutboundTransaction) => Promise<void>;
  setTransactions: (txs: OutboundTransaction[]) => void;
}

export const useOutboundStore = create<OutboundState>()(
  devtools((set, get) => ({
    transactions: [],
    fetchTransactions: async () => {
      try {
        const data = await transactionService.getOutbounds();
        if (data) {
          set({ transactions: data });
        }
      } catch {
        // keep state
      }
    },
    addTransaction: async (tx) => {
      try {
        await transactionService.createOutbound(tx as OutboundReceiptPayload);
        await get().fetchTransactions();
      } catch {
        set((state) => ({ transactions: [tx, ...state.transactions] }));
      }
    },
    setTransactions: (txs) => set({ transactions: txs }),
  })),
);
