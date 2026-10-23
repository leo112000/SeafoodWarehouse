import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { transactionService, type OutboundReceiptPayload } from '@/services/transactionService';
import type { TransactionStatus } from '@/constants';
import { useInventoryStore } from './useInventoryStore';

export interface OutboundBatch {
  batchCode: string;
  species: string;
  quantityKg: number;
  expiryDate: string; // ISO date string
  unitPrice: number; // VND per kg
  amount: number; // total amount
}

export interface OutboundSupply {
  name: string;
  packagingCode?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface OutboundTransaction {
  id: string; // e.g. PXK-20260812-001
  status?: TransactionStatus;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  date: string; // ISO date string
  customerName: string;
  reason: string; // Bán hàng / Chuyển kho / Tiêu hủy
  totalWeightKg: number;
  subTotal?: number;
  suppliesTotal?: number;
  discountAmount?: number;
  discountReason?: string;
  totalAmount: number; // VND
  createdBy: string;
  supplies?: OutboundSupply[];
  batches: OutboundBatch[];
}

interface OutboundState {
  transactions: OutboundTransaction[];
  fetchTransactions: () => Promise<void>;
  addTransaction: (tx: OutboundTransaction) => Promise<void>;
  cancelTransaction: (id: string, reason: string) => Promise<any>;
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
        useInventoryStore.getState().fetchInventory();
      } catch {
        set((state) => ({ transactions: [tx, ...state.transactions] }));
      }
    },
    cancelTransaction: async (id, reason) => {
      const res = await transactionService.cancelOutbound(id, reason);
      await get().fetchTransactions();
      useInventoryStore.getState().fetchInventory();
      return res;
    },
    setTransactions: (txs) => set({ transactions: txs }),
  })),
);
