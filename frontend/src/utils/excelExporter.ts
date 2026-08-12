/**
 * excelExporter.ts
 * Helper to export report data to a multi-sheet Excel (.xlsx) file.
 * Uses SheetJS (xlsx) + file-saver.
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ReportData } from '../services/mockReportData';

// ─── Currency / Number formatters ─────────────────────────────────────────────

const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const fmtKg = (v: number) => `${v.toLocaleString('vi-VN')} kg`;

// ─── Sheet 1: KPI Summary + Time-Series ──────────────────────────────────────

function buildSummarySheet(data: ReportData, periodName: string): XLSX.WorkSheet {
  const { summary, timeSeries, wastage } = data;

  const rows: (string | number)[][] = [
    // Title block
    [`BÁO CÁO THỐNG KÊ KHO HẢI SẢN — ${periodName.toUpperCase()}`],
    [''],

    // KPI block
    ['CHỈ SỐ KPI TỔNG HỢP', ''],
    ['Chỉ số', 'Giá trị'],
    ['Tổng Khối Lượng Nhập', fmtKg(summary.totalInboundKg)],
    ['Tổng Tiền Nhập', fmtVND(summary.totalInboundAmount)],
    ['Tổng Khối Lượng Xuất', fmtKg(summary.totalOutboundKg)],
    ['Tổng Doanh Thu Xuất', fmtVND(summary.totalOutboundAmount)],
    ['Tổng Kg Tồn Kho', fmtKg(summary.stockKg)],
    ['Giá Trị Tồn Kho', fmtVND(summary.stockValue)],
    ['Tổng Hao Hụt (Kg)', fmtKg(summary.wastageKg)],
    ['Tỷ Lệ Tổn Thất', `${summary.lossRate}%`],
    [''],

    // Time-series block
    ['BIẾN ĐỘNG NHẬP – XUẤT THEO KỲ'],
    ['Kỳ', 'Nhập (kg)', 'Xuất (kg)', 'Tiền Nhập (VND)', 'Doanh Thu Xuất (VND)'],
    ...timeSeries.map((p) => [
      p.label,
      p.inboundKg,
      p.outboundKg,
      p.inboundAmount,
      p.outboundAmount,
    ]),
    [''],

    // Wastage block
    ['THỐNG KÊ HAO HỤT / TỔN THẤT'],
    ['Kỳ', 'Hao Hụt (kg)', 'Tỷ Lệ (%)'],
    ...wastage.map((w) => [w.label, w.wastageKg, w.lossRate]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 24 },
  ];

  // Merge title row
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  return ws;
}

// ─── Sheet 2: Top Items Detail ────────────────────────────────────────────────

function buildDetailSheet(data: ReportData, periodName: string): XLSX.WorkSheet {
  const { topItems, stockByCategory } = data;

  const rows: (string | number)[][] = [
    [`CHI TIẾT MẶT HÀNG — ${periodName.toUpperCase()}`],
    [''],

    // Top items
    ['TOP MẶT HÀNG NHẬP/XUẤT NHIỀU NHẤT'],
    ['#', 'Tên Mặt Hàng', 'Danh Mục', 'Nhập (kg)', 'Xuất (kg)', 'Tồn (kg)', 'Giá Trị Tồn (VND)'],
    ...topItems.map((item) => [
      item.rank,
      item.name,
      item.categoryName,
      item.inboundKg,
      item.outboundKg,
      item.stockKg,
      item.stockValue,
    ]),
    [''],

    // Stock by category
    ['TỒN KHO THEO LOẠI HẢI SẢN'],
    ['Loại Hải Sản', 'Tồn (kg)', 'Giá Trị (VND)'],
    ...stockByCategory.map((c) => [c.category, c.kg, c.value]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
  ];

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

  return ws;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates and triggers download of a two-sheet Excel report.
 *
 * @param reportData  The full report data object returned by getReportData()
 * @param periodName  Human-readable period label, e.g. "Tháng 8 / 2026"
 * @param mode        Report mode used to build the filename slug
 */
export function exportReportToExcel(
  reportData: ReportData,
  periodName: string,
  mode: 'week' | 'month' | 'quarter' | 'year' | 'custom',
): void {
  const modeSlug: Record<typeof mode, string> = {
    week: 'Tuan',
    month: 'Thang',
    quarter: 'Quy',
    year: 'Nam',
    custom: 'TuyChon',
  };

  const wb = XLSX.utils.book_new();

  const ws1 = buildSummarySheet(reportData, periodName);
  const ws2 = buildDetailSheet(reportData, periodName);

  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp KPI');
  XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết Mặt hàng');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const fileName = `Bao-Cao-Kho-Hai-San-${modeSlug[mode]}.xlsx`;
  saveAs(blob, fileName);
}
