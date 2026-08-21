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
  todayOutboundKg: KpiItem;
  todayOutboundTransactions: KpiItem;
  monthlyLossRate: KpiItem;
}

export interface DailyFlowPoint {
  date: string;
  inboundKg: number;
  outboundKg: number;
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
  weightKg: number;
  amount: number;
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
