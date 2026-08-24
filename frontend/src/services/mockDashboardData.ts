export interface DashboardAlerts {
  expiringBatchesCount: number;
  deviatedFreezersCount: number;
  lowStockProductsCount: number;
}

export interface KpiItem {
  value: number;
  subValue?: number | string;
}

export interface DashboardKpis {
  totalStockKg: KpiItem;
  totalStockValue: KpiItem;
  todayInboundKg: KpiItem;
  todayInboundReceipts: KpiItem;
  todayInboundValue?: KpiItem;
  todayOutboundKg: KpiItem;
  todayOutboundTransactions: KpiItem;
  todayOutboundValue?: KpiItem;
  monthlyLossRate: KpiItem;
}

export interface DailyFlowPoint {
  date: string;
  inboundKg: number;
  outboundKg: number;
  inboundAmount?: number;
  outboundAmount?: number;
}

export interface CategoryStockPoint {
  name: string;
  value: number;
  color: string;
}

export interface RecentTransaction {
  id: string;
  type: 'INBOUND' | 'OUTBOUND';
  time: string;
  partnerName: string;
  batchCode?: string;
  productName?: string;
  itemCount?: number;
  weightKg: number;
  amount: number;
  subTotal?: number;
  suppliesTotal?: number;
  discountAmount?: number;
  discountReason?: string;
  createdBy?: string;
  supplies?: Array<{
    name: string;
    packagingCode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  items?: Array<{
    batchCode: string;
    productName: string;
    netWeight: number;
    tareWeight: number;
    grossWeight: number;
    packagingCode?: string;
    packagingQty?: number;
    unitPrice: number;
    totalAmount: number;
  }>;
}

export interface DashboardData {
  alerts: DashboardAlerts;
  kpis: DashboardKpis;
  dailyFlow: DailyFlowPoint[];
  categoryStock: CategoryStockPoint[];
  recentTransactions: RecentTransaction[];
}

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  alerts: {
    expiringBatchesCount: 0,
    deviatedFreezersCount: 0,
    lowStockProductsCount: 0,
  },
  kpis: {
    totalStockKg: { value: 0 },
    totalStockValue: { value: 0 },
    todayInboundKg: { value: 0 },
    todayInboundReceipts: { value: 0 },
    todayOutboundKg: { value: 0 },
    todayOutboundTransactions: { value: 0 },
    monthlyLossRate: { value: 0 },
  },
  dailyFlow: [],
  categoryStock: [],
  recentTransactions: [],
};
