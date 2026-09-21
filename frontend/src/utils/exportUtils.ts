import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ReportData } from '@/services/mockReportData';

export interface ExcelExportColumn {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: any, row: any) => string | number;
}

/**
 * Tải file hoặc kích hoạt bảng chia sẻ trên di động (hỗ trợ toàn diện iPhone/iPad Safari, PWA Standalone, Android Chrome, Desktop)
 */
export async function downloadOrShareExcel(blob: Blob, fileName: string): Promise<boolean> {
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 1. Thử Web Share API cho thiết bị di động (đặc biệt iOS Safari và iOS PWA Standalone)
  if (isMobile && typeof navigator.share === 'function' && typeof File !== 'undefined') {
    try {
      const file = new File([blob], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Người dùng chủ động đóng share sheet
        return true;
      }
      console.warn('Web Share API error, fallback to download link', err);
    }
  }

  // 2. Tải trực tiếp bằng thẻ <a> download (cho Desktop hoặc trình duyệt di động)
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.warn('Anchor download failed, fallback to saveAs', err);
    saveAs(blob, fileName);
    return true;
  }
}

/**
 * Xuất dữ liệu danh sách ra file Excel (.xlsx) chuẩn
 * Hỗ trợ cả 2 cách gọi:
 * 1. exportToExcel(data, columns, fileName) - dùng định dạng cột tùy chỉnh
 * 2. exportToExcel(data, fileName, sheetName) - xuất trực tiếp object list
 */
export function exportToExcel(
  data: any[],
  columnsOrFileName?: ExcelExportColumn[] | string,
  fileNameOrSheetName?: string,
  maybeSheetName: string = 'Dữ liệu'
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  let workbook = XLSX.utils.book_new();

  if (Array.isArray(columnsOrFileName)) {
    // Cách 1: có định nghĩa columns
    const columns = columnsOrFileName;
    const fileName = (fileNameOrSheetName as string) || 'Baocao_Kho';

    const formattedData = data.map((row) => {
      const formattedRow: Record<string, any> = {};
      columns.forEach((col) => {
        const val = row[col.key];
        formattedRow[col.header] = col.formatter ? col.formatter(val, row) : val ?? '';
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const colWidths = columns.map((col) => ({
      wch: col.width || Math.max(col.header.length + 5, 15),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, maybeSheetName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const fullFileName = `${fileName}_${timestamp}.xlsx`;
    downloadOrShareExcel(blob, fullFileName);
    return true;
  } else {
    // Cách 2: exportToExcel(data, fileName, sheetName)
    const fileName = (columnsOrFileName as string) || 'BaoCao';
    const sheetName = fileNameOrSheetName || 'Sheet1';

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    const fullFileName = `${fileName}_${timestamp}.xlsx`;
    downloadOrShareExcel(blob, fullFileName);
    return true;
  }
}

// ─── Formatters cho Báo cáo Đa Sheet ─────────────────────────────────────────
const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const fmtKg = (v: number) => `${v.toLocaleString('vi-VN')} kg`;

/**
 * Xuất báo cáo tổng hợp thống kê đa sheet (KPI, Xuất Nhập, Tồn Kho, Lô Sắp Hết Hạn)
 */
export function exportReportToExcel(data: ReportData | any, periodName: string = 'Kỳ báo cáo', _mode?: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng hợp KPI
  const { summary = {}, timeSeries = [], wastage = [], topItems = [], topProducts = topItems, expiringBatches = [] } = data || {};
  const summaryRows: (string | number)[][] = [
    [`BÁO CÁO THỐNG KÊ KHO HẢI SẢN — ${periodName.toUpperCase()}`],
    [''],
    ['CHỈ SỐ KPI TỔNG HỢP', ''],
    ['Chỉ số', 'Giá trị'],
    ['Tổng Khối Lượng Nhập', fmtKg(summary.totalInboundKg || 0)],
    ['Tổng Tiền Nhập', fmtVND(summary.totalInboundAmount || 0)],
    ['Tổng Khối Lượng Xuất', fmtKg(summary.totalOutboundKg || 0)],
    ['Tổng Doanh Thu Xuất', fmtVND(summary.totalOutboundAmount || 0)],
    ['Tổng Kg Tồn Kho', fmtKg(summary.stockKg || 0)],
    ['Giá Trị Tồn Kho', fmtVND(summary.stockValue || 0)],
    ['Tổng Hao Hụt (Kg)', fmtKg(summary.wastageKg || 0)],
    ['Tỷ Lệ Tổn Thất', `${summary.lossRate || 0}%`],
    [''],
    ['BIẾN ĐỘNG NHẬP – XUẤT THEO KỲ'],
    ['Kỳ', 'Nhập (kg)', 'Xuất (kg)', 'Tiền Nhập (VND)', 'Doanh Thu Xuất (VND)'],
    ...timeSeries.map((p: any) => [p.label, p.inboundKg, p.outboundKg, p.inboundAmount, p.outboundAmount]),
    [''],
    ['THỐNG KÊ HAO HỤT / TỔN THẤT'],
    ['Kỳ', 'Hao Hụt (kg)', 'Tỷ Lệ (%)'],
    ...wastage.map((w: any) => [w.label, w.wastageKg, w.lossRate]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan & KPI');

  // Sheet 2: Top Sản Phẩm
  const items: any[] = topProducts?.length ? topProducts : topItems;
  const productRows: (string | number)[][] = [
    ['TOP SẢN PHẨM THEO DOANH THU VÀ SẢN LƯỢNG'],
    ['Mã SP / Tên', 'Danh Mục', 'Khối Lượng Xuất (kg)', 'Doanh Thu (VND)', 'Tồn Kho (kg)'],
    ...items.map((p: any) => [p.code || p.name || '', p.categoryName || '', p.outboundKg || 0, fmtVND(p.revenue || p.outboundAmount || 0), p.stockKg || 0]),
  ];
  const wsProducts = XLSX.utils.aoa_to_sheet(productRows);
  wsProducts['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Sản Phẩm');

  // Sheet 3: Lô Sắp Hết Hạn
  const batchList: any[] = expiringBatches;
  const batchRows: (string | number)[][] = [
    ['CẢNH BÁO LÔ HÀNG SẮP HẾT HẠN'],
    ['Mã Lô', 'Sản Phẩm', 'Số Lượng Còn (kg)', 'Vị Trí Kho', 'Hạn Sử Dụng', 'Số Ngày Còn Lại', 'Mức Độ Cảnh Báo'],
    ...batchList.map((b: any) => [
      b.batchCode || '',
      b.productName || '',
      b.remainingKg || 0,
      b.warehouse || '',
      b.expiryDate || '',
      b.daysLeft || 0,
      (b.daysLeft ?? 99) <= 3 ? 'Khẩn cấp' : (b.daysLeft ?? 99) <= 7 ? 'Cảnh báo' : 'Theo dõi',
    ]),
  ];
  const wsBatches = XLSX.utils.aoa_to_sheet(batchRows);
  wsBatches['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsBatches, 'Cảnh Báo Hết Hạn');

  const timestamp = new Date().toISOString().slice(0, 10);
  const outBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  downloadOrShareExcel(blob, `Bao_Cao_Kho_Hai_San_${timestamp}.xlsx`);
}

