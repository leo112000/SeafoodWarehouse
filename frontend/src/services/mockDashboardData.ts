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

export const mockDashboardData: DashboardData = {
  alerts: {
    expiringBatchesCount: 4,
    deviatedFreezersCount: 2,
    lowStockProductsCount: 3,
  },
  kpis: {
    totalStockKg: { value: 575 },
    totalStockValue: { value: 638250000 },
    todayInboundKg: { value: 135 },
    todayInboundReceipts: { value: 2 },
    todayOutboundKg: { value: 120 },
    todayOutboundTransactions: { value: 1 },
    monthlyLossRate: { value: 1.4 },
  },
  dailyFlow: [
    { date: '06/08', inboundKg: 450, outboundKg: 300 },
    { date: '07/08', inboundKg: 200, outboundKg: 350 },
    { date: '08/08', inboundKg: 600, outboundKg: 400 },
    { date: '09/08', inboundKg: 150, outboundKg: 220 },
    { date: '10/08', inboundKg: 700, outboundKg: 500 },
    { date: '11/08', inboundKg: 125, outboundKg: 80 },
    { date: '12/08', inboundKg: 135, outboundKg: 120 },
  ],
  categoryStock: [
    { name: 'Cá', value: 370, color: '#3b82f6' },
    { name: 'Tôm', value: 120, color: '#f97316' },
    { name: 'Cua', value: 25, color: '#ef4444' },
    { name: 'Mực', value: 80, color: '#8b5cf6' },
  ],
  recentTransactions: [
    {
      id: 'PNK-20260812-002',
      type: 'INBOUND',
      time: '14:35',
      partnerName: 'Tàu cá QT-90112',
      weightKg: 15,
      amount: 33000000,
    },
    {
      id: 'PXK-20260812-001',
      type: 'OUTBOUND',
      time: '10:15',
      partnerName: 'Nhà hàng Hải Sản A',
      weightKg: 120,
      amount: 2400000,
    },
    {
      id: 'PNK-20260811-001',
      type: 'INBOUND',
      time: '08:30',
      partnerName: 'Vựa hải sản Hùng Vương',
      weightKg: 120,
      amount: 180000000,
    },
    {
      id: 'PXK-20260810-002',
      type: 'OUTBOUND',
      time: '16:45',
      partnerName: 'Siêu thị Hải Sản B',
      weightKg: 50,
      amount: 1000000,
    },
  ],
};
