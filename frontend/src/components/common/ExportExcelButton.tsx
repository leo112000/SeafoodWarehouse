import React, { useState } from 'react';
import { Button, App, type ButtonProps } from 'antd';
import { exportToExcel, type ExcelExportColumn } from '@/utils/exportUtils';

export interface ExportExcelButtonProps<T = any> extends Omit<ButtonProps, 'onClick'> {
  /** Dữ liệu cần xuất ra Excel (chế độ tự động) */
  data?: T[];
  /** Danh sách cột và định dạng xuất (chế độ tự động) */
  columns?: ExcelExportColumn[];
  /** Tên file khi tải về (mặc định: 'BaoCao') */
  fileName?: string;
  /** Tên sheet trong file Excel (mặc định: 'Dữ liệu') */
  sheetName?: string;
  /** Tùy chọn hàm xuất thủ công (dành cho báo cáo đa sheet hoặc xử lý riêng) */
  onExport?: () => Promise<void> | void;
  /** Chữ hiển thị trên desktop (mặc định: 'Xuất Excel') */
  label?: string;
  /** Chữ hiển thị trên mobile (mặc định: 'Excel') */
  mobileLabel?: string;
  /** Icon hiển thị (mặc định: 📥) */
  customIcon?: React.ReactNode;
}

export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  data,
  columns,
  fileName = 'BaoCao',
  sheetName = 'Dữ liệu',
  onExport,
  label = 'Xuất Excel',
  mobileLabel = 'Excel',
  customIcon = <span>📥</span>,
  size = 'small',
  className = 'text-xs flex items-center gap-1 border-slate-200 dark:border-slate-700 font-medium',
  disabled,
  ...rest
}) => {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;

    // Chế độ 1: Tự viết hàm export riêng
    if (onExport) {
      try {
        setExporting(true);
        message.loading({ content: 'Đang chuẩn bị file Excel...', key: 'export_excel', duration: 1.5 });
        await onExport();
        message.success({ content: 'Đã xuất file Excel thành công!', key: 'export_excel' });
      } catch (err: any) {
        console.error('Export Excel failed:', err);
        message.error({ content: 'Xuất Excel thất bại. Vui lòng thử lại!', key: 'export_excel' });
      } finally {
        setExporting(false);
      }
      return;
    }

    // Chế độ 2: Tự động xuất từ data & columns
    if (!data || data.length === 0) {
      message.warning('Không có dữ liệu để xuất file Excel');
      return;
    }

    try {
      setExporting(true);
      message.loading({ content: 'Đang chuẩn bị file Excel tải về...', key: 'export_excel', duration: 1.5 });
      const success = exportToExcel(data, columns, fileName, sheetName);
      if (success) {
        message.success({ content: 'Đã tạo file Excel thành công!', key: 'export_excel' });
      }
    } catch (err: any) {
      console.error('Export Excel failed:', err);
      message.error({ content: 'Xuất file Excel thất bại!', key: 'export_excel' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      size={size}
      onClick={handleExport}
      loading={exporting}
      disabled={disabled}
      className={className}
      {...rest}
    >
      {!exporting && customIcon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{mobileLabel}</span>
    </Button>
  );
};

export default ExportExcelButton;
