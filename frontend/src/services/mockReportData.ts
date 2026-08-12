/**
 * mockReportData.ts
 * Mock data service for the Statistics / Reports page.
 * All data is self-contained; replace with real API calls later.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  label: string;    // Tuần 1, Tháng 1, Q1, 2024...
  inboundKg: number;
  outboundKg: number;
  inboundAmount: number;  // VND
  outboundAmount: number; // VND
}

export interface StockByCategory {
  category: string;
  kg: number;
  value: number; // VND
  color: string;
}

export interface TopItem {
  rank: number;
  name: string;
  categoryName: string;
  inboundKg: number;
  outboundKg: number;
  stockKg: number;
  stockValue: number; // VND
}

export interface WastagePoint {
  label: string;
  wastageKg: number;
  lossRate: number; // percent
}

export interface ReportSummary {
  totalInboundKg: number;
  totalInboundAmount: number;
  totalOutboundKg: number;
  totalOutboundAmount: number;
  stockKg: number;
  stockValue: number;
  wastageKg: number;
  lossRate: number; // percent
}

export interface ReportData {
  summary: ReportSummary;
  timeSeries: TimeSeriesPoint[];
  stockByCategory: StockByCategory[];
  topItems: TopItem[];
  wastage: WastagePoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rnd = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

const CATEGORIES_META = [
  { category: 'Cá',               color: '#3b82f6' },
  { category: 'Tôm',              color: '#f97316' },
  { category: 'Cua',              color: '#ef4444' },
  { category: 'Mực & Bạch tuộc', color: '#8b5cf6' },
  { category: 'Hàu & Nhuyễn thể', color: '#10b981' },
  { category: 'Hải sản khác',    color: '#6b7280' },
];

const TOP_ITEMS_BASE: Omit<TopItem, 'rank' | 'inboundKg' | 'outboundKg' | 'stockKg' | 'stockValue'>[] = [
  { name: 'Tôm Hùm Bông',     categoryName: 'Tôm' },
  { name: 'Cá Hồi Na Uy',     categoryName: 'Cá' },
  { name: 'Cua Hoàng Đế Nga', categoryName: 'Cua' },
  { name: 'Mực Lá Đại',       categoryName: 'Mực & Bạch tuộc' },
  { name: 'Tôm Sú Loại 1',    categoryName: 'Tôm' },
  { name: 'Cá Thu Phấn',      categoryName: 'Cá' },
  { name: 'Ghẹ Xanh Loại 1',  categoryName: 'Cua' },
  { name: 'Bạch Tuộc Đại',    categoryName: 'Mực & Bạch tuộc' },
  { name: 'Hàu Thái Bình Dương', categoryName: 'Hàu & Nhuyễn thể' },
  { name: 'Cá Basa Phi Lê',   categoryName: 'Cá' },
];

const UNIT_PRICES: Record<string, number> = {
  'Tôm Hùm Bông':         1_500_000,
  'Cá Hồi Na Uy':           350_000,
  'Cua Hoàng Đế Nga':      2_200_000,
  'Mực Lá Đại':             280_000,
  'Tôm Sú Loại 1':          320_000,
  'Cá Thu Phấn':            180_000,
  'Ghẹ Xanh Loại 1':        450_000,
  'Bạch Tuộc Đại':          260_000,
  'Hàu Thái Bình Dương':    120_000,
  'Cá Basa Phi Lê':         145_000,
};

// ─── Weekly Data (52 weeks) ───────────────────────────────────────────────────

const WEEKLY_DATA: TimeSeriesPoint[] = Array.from({ length: 52 }, (_, i) => ({
  label: `T${i + 1}`,
  inboundKg: rnd(800, 3_500),
  outboundKg: rnd(600, 3_200),
  inboundAmount: rnd(500_000_000, 5_000_000_000),
  outboundAmount: rnd(400_000_000, 4_800_000_000),
}));

// ─── Monthly Data (12 months) ─────────────────────────────────────────────────

const MONTH_NAMES = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];

const MONTHLY_DATA: TimeSeriesPoint[] = MONTH_NAMES.map((m) => ({
  label: m,
  inboundKg: rnd(6_000, 18_000),
  outboundKg: rnd(5_000, 17_000),
  inboundAmount: rnd(3_000_000_000, 20_000_000_000),
  outboundAmount: rnd(2_500_000_000, 19_000_000_000),
}));

// ─── Quarterly Data (4 quarters) ─────────────────────────────────────────────

const QUARTERLY_DATA: TimeSeriesPoint[] = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({
  label: q,
  inboundKg: rnd(20_000, 60_000),
  outboundKg: rnd(18_000, 58_000),
  inboundAmount: rnd(15_000_000_000, 70_000_000_000),
  outboundAmount: rnd(12_000_000_000, 65_000_000_000),
}));

// ─── Yearly Data (5 years) ───────────────────────────────────────────────────

const YEARLY_DATA: TimeSeriesPoint[] = [2022, 2023, 2024, 2025, 2026].map((y) => ({
  label: `${y}`,
  inboundKg: rnd(100_000, 250_000),
  outboundKg: rnd(90_000, 240_000),
  inboundAmount: rnd(80_000_000_000, 250_000_000_000),
  outboundAmount: rnd(70_000_000_000, 230_000_000_000),
}));

// ─── Stock by Category ────────────────────────────────────────────────────────

const STOCK_BY_CATEGORY: StockByCategory[] = CATEGORIES_META.map((c) => {
  const kg = rnd(50, 1_200);
  const price = rnd(150_000, 1_500_000);
  return { ...c, kg, value: kg * price };
});

// ─── Top Items ────────────────────────────────────────────────────────────────

const buildTopItems = (multiplier: number): TopItem[] =>
  TOP_ITEMS_BASE.map((item, i) => {
    const inboundKg = rnd(200, 4_000) * multiplier;
    const outboundKg = Math.round(inboundKg * (0.6 + Math.random() * 0.35));
    const stockKg = Math.max(0, inboundKg - outboundKg);
    const price = UNIT_PRICES[item.name] ?? 200_000;
    return {
      ...item,
      rank: i + 1,
      inboundKg,
      outboundKg,
      stockKg,
      stockValue: stockKg * price,
    };
  }).sort((a, b) => b.outboundKg - a.outboundKg)
    .map((item, i) => ({ ...item, rank: i + 1 }));

// ─── Wastage ─────────────────────────────────────────────────────────────────

const buildWastage = (series: TimeSeriesPoint[]): WastagePoint[] =>
  series.map((s) => {
    const wastageKg = Math.round(s.inboundKg * (0.005 + Math.random() * 0.025));
    return {
      label: s.label,
      wastageKg,
      lossRate: Math.round((wastageKg / s.inboundKg) * 1_000) / 10,
    };
  });

// ─── Summary builder ─────────────────────────────────────────────────────────

const buildSummary = (series: TimeSeriesPoint[], wastage: WastagePoint[]): ReportSummary => {
  const totalInboundKg     = series.reduce((s, p) => s + p.inboundKg, 0);
  const totalOutboundKg    = series.reduce((s, p) => s + p.outboundKg, 0);
  const totalInboundAmount = series.reduce((s, p) => s + p.inboundAmount, 0);
  const totalOutboundAmount= series.reduce((s, p) => s + p.outboundAmount, 0);
  const wastageKg          = wastage.reduce((s, w) => s + w.wastageKg, 0);
  const stockKg            = Math.max(0, totalInboundKg - totalOutboundKg - wastageKg);
  const stockValue         = STOCK_BY_CATEGORY.reduce((s, c) => s + c.value, 0);
  const lossRate           = totalInboundKg > 0
    ? Math.round((wastageKg / totalInboundKg) * 1_000) / 10
    : 0;
  return {
    totalInboundKg,
    totalInboundAmount,
    totalOutboundKg,
    totalOutboundAmount,
    stockKg,
    stockValue,
    wastageKg,
    lossRate,
  };
};

// ─── Public API ──────────────────────────────────────────────────────────────

export type ReportMode = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface ReportFilter {
  mode: ReportMode;
  /** For week: 1–52, month: 1–12, quarter: 1–4, year: e.g. 2026 */
  singleValue?: number;
  /** For custom mode */
  startDate?: string;
  endDate?: string;
}

/**
 * Returns a slice of the time-series data and derived summary for the given filter.
 * In a real app this would call an API endpoint.
 */
export function getReportData(filter: ReportFilter): ReportData {
  let series: TimeSeriesPoint[];

  switch (filter.mode) {
    case 'week': {
      // Show ±4 surrounding weeks around the selected week (9 points)
      const w = Math.max(1, Math.min(52, filter.singleValue ?? 32));
      const start = Math.max(0, w - 5);
      const end   = Math.min(51, w + 3);
      series = WEEKLY_DATA.slice(start, end + 1);
      break;
    }
    case 'month': {
      // Show all 12 months, highlight is in the data (no slice needed)
      series = MONTHLY_DATA;
      break;
    }
    case 'quarter': {
      // Show all 4 quarters
      series = QUARTERLY_DATA;
      break;
    }
    case 'year': {
      series = YEARLY_DATA;
      break;
    }
    case 'custom': {
      // Use monthly data as approximation for custom ranges
      series = MONTHLY_DATA;
      break;
    }
    default:
      series = MONTHLY_DATA;
  }

  const wastage = buildWastage(series);
  const topItems = buildTopItems(filter.mode === 'year' ? 12 : filter.mode === 'quarter' ? 3 : 1);

  return {
    summary: buildSummary(series, wastage),
    timeSeries: series,
    stockByCategory: STOCK_BY_CATEGORY,
    topItems,
    wastage,
  };
}

export { STOCK_BY_CATEGORY };
