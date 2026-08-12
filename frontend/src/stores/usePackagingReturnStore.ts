import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ---------- types ----------

export interface PackagingLoan {
  id: string;
  partnerName: string;           // Khách hàng / Nhà cung cấp
  partnerType: 'CUSTOMER' | 'SUPPLIER';
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

interface PackagingReturnState {
  loans: PackagingLoan[];
  returns: PackagingReturn[];

  addReturn: (payload: {
    loanId: string;
    returnedQty: number;
    returnDate: string;
    recordedBy: string;
    note?: string;
  }) => void;

  addLoan: (loan: Omit<PackagingLoan, 'id' | 'returnedQty'>) => void;
}

// ---------- store ----------

export const usePackagingReturnStore = create<PackagingReturnState>()(
  devtools((set) => ({
    // ── seed data ─────────────────────────────────────────
    loans: [
      {
        id: 'LOAN-001',
        partnerName: 'Nhà hàng Hải Sản A',
        partnerType: 'CUSTOMER',
        packagingCode: 'SOT-RED',
        packagingName: 'Sọt nhựa đỏ tiêu chuẩn',
        loanedQty: 30,
        returnedQty: 12,
        date: '2026-08-10',
        note: 'Giao kèm lô tôm hùm PXK-20260812-001',
      },
      {
        id: 'LOAN-002',
        partnerName: 'Siêu thị WinMart',
        partnerType: 'CUSTOMER',
        packagingCode: 'SOT-BLUE',
        packagingName: 'Sọt nhựa xanh dương lớn',
        loanedQty: 20,
        returnedQty: 5,
        date: '2026-08-11',
      },
      {
        id: 'LOAN-003',
        partnerName: 'Vựa hải sản Hùng Vương',
        partnerType: 'SUPPLIER',
        packagingCode: 'SOT-RED',
        packagingName: 'Sọt nhựa đỏ tiêu chuẩn',
        loanedQty: 50,
        returnedQty: 50,
        date: '2026-08-05',
        note: 'Đã hoàn trả đủ',
      },
      {
        id: 'LOAN-004',
        partnerName: 'Đại lý Cá Sạch B',
        partnerType: 'CUSTOMER',
        packagingCode: 'SOT-RED',
        packagingName: 'Sọt nhựa đỏ tiêu chuẩn',
        loanedQty: 15,
        returnedQty: 0,
        date: '2026-08-12',
      },
    ],

    returns: [],

    // ── actions ───────────────────────────────────────────
    addReturn: ({ loanId, returnedQty, returnDate, recordedBy, note }) => {
      set((state) => {
        const loan = state.loans.find((l) => l.id === loanId);
        if (!loan) return state;

        const updatedLoans = state.loans.map((l) =>
          l.id === loanId
            ? { ...l, returnedQty: Math.min(l.loanedQty, l.returnedQty + returnedQty) }
            : l
        );

        const newReturn: PackagingReturn = {
          id: `RET-${Date.now()}`,
          loanId,
          partnerName: loan.partnerName,
          packagingCode: loan.packagingCode,
          packagingName: loan.packagingName,
          returnedQty,
          returnDate,
          recordedBy,
          note,
        };

        return {
          loans: updatedLoans,
          returns: [newReturn, ...state.returns],
        };
      });
    },

    addLoan: (loan) => {
      set((state) => ({
        loans: [
          { ...loan, id: `LOAN-${Date.now()}`, returnedQty: 0 },
          ...state.loans,
        ],
      }));
    },
  }))
);
