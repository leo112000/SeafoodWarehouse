export interface TimeSeriesPoint {
  label: string;
  inboundKg: number;
  outboundKg: number;
  inboundAmount: number;
  outboundAmount: number;
}

export interface StockByCategory {
  category: string;
  kg: number;
  value: number;
  color: string;
}

export interface TopItem {
  rank: number;
  name: string;
  categoryName: string;
  inboundKg: number;
  inboundAmount?: number;
  outboundKg: number;
  outboundAmount?: number;
  stockKg: number;
  stockValue: number;
}

export interface WastagePoint {
  label: string;
  wastageKg: number;
  lossRate: number;
}

export interface ReportSummary {
  totalInboundKg: number;
  totalInboundAmount: number;
  totalOutboundKg: number;
  totalOutboundAmount: number;
  cogsAmount?: number;
  grossProfit?: number;
  profitMarginPercent?: number;
  stockKg: number;
  stockValue: number;
  wastageKg: number;
  lossRate: number;
}

export interface ReportData {
  summary: ReportSummary;
  timeSeries: TimeSeriesPoint[];
  stockByCategory: StockByCategory[];
  topItems: TopItem[];
  wastage: WastagePoint[];
}

export type ReportMode = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface ReportFilter {
  mode: ReportMode;
  selectedWeek?: number;
  selectedMonth?: number;
  selectedQuarter?: number;
  selectedYear?: number;
  customRange?: [string, string];
}

export const EMPTY_REPORT_DATA: ReportData = {
  summary: {
    totalInboundKg: 0,
    totalInboundAmount: 0,
    totalOutboundKg: 0,
    totalOutboundAmount: 0,
    stockKg: 0,
    stockValue: 0,
    wastageKg: 0,
    lossRate: 0,
  },
  timeSeries: [],
  stockByCategory: [],
  topItems: [],
  wastage: [],
};

export function getReportData(_filter: ReportFilter): ReportData {
  return EMPTY_REPORT_DATA;
}
