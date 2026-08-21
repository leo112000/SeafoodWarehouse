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
  createdBy: string;
  batches: Array<{
    batchCode: string;
    species: string;
    quantityKg: number;
    expiryDate: string;
    unitPrice: number;
    amount: number;
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
};
