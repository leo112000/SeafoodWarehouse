import { create } from 'zustand';
import { transactionService, type InboundReceiptPayload } from '@/services/transactionService';
import type { TransactionStatus } from '@/constants';
import { useInventoryStore } from './useInventoryStore';

export interface InboundItem {
  seafoodName: string;
  seafoodCode: string;
  totalWeight: number;
  tareWeight: number;
  netWeight: number;
  storageCondition: 'Tươi sống' | 'Ướp đá' | 'Cấp đông';
  catchDate: string;
  expiryDate: string;
  unitPrice: number;
  totalPrice: number;
  batchCode: string;
  initialQuantity?: number;
  currentQuantity?: number;
}

export interface InboundReceipt {
  id: string;
  status?: TransactionStatus;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  hasExports?: boolean;
  canCancel?: boolean;
  exportRefNos?: string[];
  supplier: string;
  inboundDate: string;
  storageLocation: string;
  items: InboundItem[];
  totalAmount: number;
}

interface InboundState {
  receipts: InboundReceipt[];
  fetchReceipts: () => Promise<void>;
  addReceipt: (receipt: Omit<InboundReceipt, 'id'>) => Promise<void>;
  cancelReceipt: (id: string, reason: string) => Promise<any>;
}

export const useInboundStore = create<InboundState>((set, get) => ({
  receipts: [],
  fetchReceipts: async () => {
    try {
      const data = await transactionService.getInbounds();
      if (data) {
        set({ receipts: data });
      }
    } catch {
      // keep state
    }
  },
  addReceipt: async (receipt) => {
    try {
      await transactionService.createInbound(receipt as InboundReceiptPayload);
      await get().fetchReceipts();
      useInventoryStore.getState().fetchInventory();
    } catch {
      set((state) => ({
        receipts: [{ ...receipt, id: `PNK-${Date.now()}` }, ...state.receipts],
      }));
    }
  },
  cancelReceipt: async (id, reason) => {
    const res = await transactionService.cancelInbound(id, reason);
    await get().fetchReceipts();
    useInventoryStore.getState().fetchInventory();
    return res;
  },
}));
