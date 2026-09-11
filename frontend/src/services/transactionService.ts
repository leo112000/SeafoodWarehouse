import { api } from './api';

export interface InboundReceiptPayload {
  supplier: string;
  inboundDate: string;
  storageLocation: string;
  totalAmount: number;
  items: Array<{
    seafoodCode: string;
    seafoodName: string;
    totalWeight: number;
    tareWeight: number;
    netWeight: number;
    storageCondition: string;
    catchDate: string;
    expiryDate: string;
    unitPrice: number;
    totalPrice: number;
    batchCode: string;
  }>;
}

export interface OutboundReceiptPayload {
  customerName: string;
  reason: string;
  date: string;
  totalWeightKg: number;
  totalAmount: number;
  subTotal?: number;
  discountAmount?: number;
  discountReason?: string;
  createdBy: string;
  batches: Array<{
    batchCode: string;
    species: string;
    quantityKg: number;
    grossWeight?: number;
    tareWeight?: number;
    packagingCode?: string;
    packagingQty?: number;
    expiryDate: string;
    unitPrice: number;
    amount: number;
  }>;
  supplies?: Array<{
    name: string;
    packagingCode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
}

export const transactionService = {
  // Inbound Receipts
  async getInbounds(): Promise<any[]> {
    try {
      const res = await api.get('/inbound');
      if (res.data && res.data.data) {
        return res.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  async createInbound(data: InboundReceiptPayload): Promise<any> {
    const res = await api.post('/inbound', data);
    return res.data;
  },

  // Outbound Receipts
  async getOutbounds(): Promise<any[]> {
    try {
      const res = await api.get('/outbound');
      if (res.data && res.data.data) {
        return res.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  async createOutbound(data: OutboundReceiptPayload): Promise<any> {
    const res = await api.post('/outbound', data);
    return res.data;
  },

  async cancelInbound(refNo: string, reason: string): Promise<any> {
    const res = await api.post(`/inbound/cancel/${refNo}`, { reason });
    return res.data;
  },

  async cancelOutbound(refNo: string, reason: string): Promise<any> {
    const res = await api.post(`/outbound/cancel/${refNo}`, { reason });
    return res.data;
  },
};
