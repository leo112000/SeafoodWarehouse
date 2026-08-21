import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExcelExportColumn {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: any, row: any) => string | number;
}

/**
 * Xuất dữ liệu danh sách ra file Excel (.xlsx) chuẩn
 */
export const exportToExcel = (
  data: any[],
  columns: ExcelExportColumn[],
  fileName: string = 'Baocao_Kho'
) => {
  if (!data || data.length === 0) {
    return false;
  }

  // Chuyển đổi dữ liệu theo định dạng cột khai báo
  const formattedData = data.map((row) => {
    const formattedRow: Record<string, any> = {};
    columns.forEach((col) => {
      const val = row[col.key];
      formattedRow[col.header] = col.formatter ? col.formatter(val, row) : val ?? '';
    });
    return formattedRow;
  });

  // Tạo Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Đặt độ rộng các cột
  const colWidths = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length + 5, 15),
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu');

  // Đóng gói và tải file .xlsx
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `${fileName}_${timestamp}.xlsx`);
  return true;
};
