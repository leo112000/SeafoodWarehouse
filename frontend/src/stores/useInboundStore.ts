import { create } from 'zustand';

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
}

export interface InboundReceipt {
  id: string;
  supplier: string;
  inboundDate: string;
  storageLocation: string;
  items: InboundItem[];
  totalAmount: number;
}

interface InboundState {
  receipts: InboundReceipt[];
  addReceipt: (receipt: Omit<InboundReceipt, 'id'>) => void;
}

export const useInboundStore = create<InboundState>((set) => ({
  receipts: [
    {
      id: 'REC-001',
      supplier: 'Vựa hải sản Hùng Vương',
      inboundDate: '2026-08-11',
      storageLocation: 'Kho đông lạnh A1',
      totalAmount: 180000000,
      items: [
        {
          seafoodName: 'Tôm Hùm Bông',
          seafoodCode: 'TOMHUM',
          totalWeight: 125,
          tareWeight: 5,
          netWeight: 120,
          storageCondition: 'Tươi sống',
          catchDate: '2026-08-10',
          expiryDate: '2026-08-15',
          unitPrice: 1500000,
          totalPrice: 180000000,
          batchCode: 'LOT-TOMHUM-20260811',
        },
      ],
    },
    {
      id: 'REC-002',
      supplier: 'Tàu cá QT-90112',
      inboundDate: '2026-08-12',
      storageLocation: 'Kho đông lạnh A2',
      totalAmount: 33000000,
      items: [
        {
          seafoodName: 'Cua Hoàng Đế',
          seafoodCode: 'CUAHD',
          totalWeight: 17,
          tareWeight: 2,
          netWeight: 15,
          storageCondition: 'Cấp đông',
          catchDate: '2026-08-05',
          expiryDate: '2026-09-05',
          unitPrice: 2200000,
          totalPrice: 33000000,
          batchCode: 'LOT-CUAHD-20260812',
        },
      ],
    },
  ],
  addReceipt: (receipt) =>
    set((state) => {
      const newReceipt: InboundReceipt = {
        ...receipt,
        id: `REC-${String(state.receipts.length + 1).padStart(3, '0')}`,
      };
      return { receipts: [newReceipt, ...state.receipts] };
    }),
}));
