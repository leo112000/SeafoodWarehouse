import { create } from 'zustand';
import {
  transactionService,
  type TransactionHistoryQueryParams,
} from '@/services/transactionService';
import type { TransactionStatus, TransactionType } from '@/constants';

export interface UnifiedTransactionItem {
  id: string; // ReferenceNumber e.g. PNK-2026... or PXK-2026...
  type: TransactionType; // 'INBOUND' | 'OUTBOUND'
  status?: TransactionStatus; // 'ACTIVE' | 'CANCELLED'
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  hasExports?: boolean;
  canCancel?: boolean;
  exportRefNos?: string[];
  date: string;
  partnerName: string;
  partnerType: 'SUPPLIER' | 'CUSTOMER';
  storageLocation: string;
  totalWeightKg: number;
  totalAmount: number;
  subTotal?: number;
  suppliesTotal?: number;
  discountAmount?: number;
  discountReason?: string;
  createdBy: string;
  supplies?: Array<{
    name: string;
    packagingCode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  items: Array<{
    batchCode: string;
    seafoodName: string;
    storageCondition?: string;
    grossWeight?: number;
    tareWeight?: number;
    netWeight: number;
    packagingCode?: string;
    packagingQty?: number;
    expiryDate?: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface TransactionHistoryState {
  items: UnifiedTransactionItem[];
  totalCount: number;
  loading: boolean;
  pageNumber: number;
  pageSize: number;
  type: 'ALL' | 'INBOUND' | 'OUTBOUND';
  status: 'ALL' | 'ACTIVE' | 'CANCELLED';
  search: string;
  fromDate?: string;
  toDate?: string;

  fetchTransactions: (params?: Partial<TransactionHistoryQueryParams>) => Promise<void>;
  setFilter: (filter: Partial<TransactionHistoryQueryParams>) => void;
  cancelTransaction: (id: string, reason: string, type: 'INBOUND' | 'OUTBOUND') => Promise<any>;
}

export const useTransactionHistoryStore = create<TransactionHistoryState>((set, get) => ({
  items: [],
  totalCount: 0,
  loading: false,
  pageNumber: 1,
  pageSize: 10,
  type: 'ALL',
  status: 'ALL',
  search: '',

  fetchTransactions: async (params) => {
    set({ loading: true });
    try {
      const current = get();
      const queryParams: TransactionHistoryQueryParams = {
        pageNumber: params?.pageNumber ?? current.pageNumber,
        pageSize: params?.pageSize ?? current.pageSize,
        type: params?.type !== undefined ? params.type : current.type,
        status: params?.status !== undefined ? params.status : current.status,
        search: params?.search !== undefined ? params.search : current.search,
        fromDate: params?.fromDate !== undefined ? params.fromDate : current.fromDate,
        toDate: params?.toDate !== undefined ? params.toDate : current.toDate,
      };

      const res = await transactionService.getTransactionHistory(queryParams);

      set({
        items: res.items || [],
        totalCount: res.totalCount || 0,
        pageNumber: res.pageNumber || 1,
        pageSize: res.pageSize || 10,
        type: queryParams.type,
        status: queryParams.status,
        search: queryParams.search || '',
        fromDate: queryParams.fromDate,
        toDate: queryParams.toDate,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
      set({ loading: false, items: [], totalCount: 0 });
    }
  },

  setFilter: (filter) => {
    const nextParams = { ...filter, pageNumber: filter.pageNumber ?? 1 };
    set({ ...nextParams });
    get().fetchTransactions(nextParams);
  },

  cancelTransaction: async (id: string, reason: string, type: 'INBOUND' | 'OUTBOUND') => {
    let res;
    if (type === 'INBOUND') {
      res = await transactionService.cancelInbound(id, reason);
    } else {
      res = await transactionService.cancelOutbound(id, reason);
    }
    await get().fetchTransactions();
    return res;
  },
}));
