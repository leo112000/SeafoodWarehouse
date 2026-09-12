import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { packagingReturnService } from '../services/packagingReturnService';
import type { PartnerType } from '../constants';

// ---------- types ----------

export interface PackagingLoan {
  id: string;
  partnerName: string;           // Khách hàng / Nhà cung cấp
  partnerType: PartnerType;
  packagingCode: string;         // VD: SOT-RED
  packagingName: string;         // Tên hiển thị
  loanedQty: number;             // Tổng số đã giao/mượn
  returnedQty: number;           // Số đã trả về
  date: string;                  // Ngày giao mượn ban đầu (YYYY-MM-DD)
  note?: string;
}

export interface PackagingReturn {
  id: string;
  loanId: string;                // Liên kết với PackagingLoan
  partnerName: string;
  packagingCode: string;
  packagingName: string;
  returnedQty: number;           // Số lượng trả lần này
  returnDate: string;
  recordedBy: string;
  note?: string;
}

const SEED_LOANS: PackagingLoan[] = [
];

interface PackagingReturnState {
  loans: PackagingLoan[];
  returns: PackagingReturn[];
  loading: boolean;

  fetchLoansAndReturns: () => Promise<void>;

  addReturn: (payload: {
    loanId: string;
    returnedQty: number;
    returnDate: string;
    recordedBy: string;
    note?: string;
  }) => Promise<void>;

  addLoan: (loan: Omit<PackagingLoan, 'id' | 'returnedQty'>) => Promise<void>;
}

// ---------- store ----------

export const usePackagingReturnStore = create<PackagingReturnState>()(
  devtools((set, get) => ({
    loans: SEED_LOANS,
    returns: [],
    loading: false,

    fetchLoansAndReturns: async () => {
      set({ loading: true });
      try {
        const [apiLoans, apiReturns] = await Promise.all([
          packagingReturnService.getLoans(),
          packagingReturnService.getReturns(),
        ]);

        if (apiLoans.length > 0) {
          set({ loans: apiLoans });
        }
        if (apiReturns.length > 0) {
          set({ returns: apiReturns });
        }
      } catch {
        // Keep current state on API error
      } finally {
        set({ loading: false });
      }
    },

    // ── actions ───────────────────────────────────────────
    addReturn: async ({ loanId, returnedQty, returnDate, recordedBy, note }) => {
      const state = get();
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan) return;

      await packagingReturnService.createReturn({
        loanId,
        returnedQty,
        returnDate,
        recordedBy,
        note,
      });

      // Tự động đồng bộ chuẩn lại từ server
      await get().fetchLoansAndReturns();
    },

    addLoan: async (loanData) => {
      await packagingReturnService.createLoan(loanData);

      // Tự động đồng bộ chuẩn lại từ server
      await get().fetchLoansAndReturns();
    },
  }))
);
