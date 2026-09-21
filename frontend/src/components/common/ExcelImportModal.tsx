import { useState, useMemo } from 'react';
import {
  Modal, Upload, Button, Table, Space, Typography, App, Radio,
  type TableColumnsType,
} from 'antd';
import {
  InboxOutlined, DownloadOutlined, CheckCircleOutlined,
  ReloadOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Dragger } = Upload;
const { Text } = Typography;

export interface ParsedImportRow<T = any> {
  key: string;
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  data: T;
}

export interface ExcelImportModalProps<T = any> {
  open: boolean;
  onClose: () => void;
  title: string;
  entityName: string;
  templateUrl?: string;
  templateConfig?: {
    fileName: string;
    sheetName?: string;
    headers: string[];
    sampleRows?: any[][];
  };
  instructionTitle?: string;
  instructionSubtitle?: string;
  parseAndValidateRow: (
    rawRow: Record<string, any>,
    rowIndex: number,
    helpers: {
      cleanStr: (v: any) => string;
      getFieldVal: (row: Record<string, any>, possibleKeys: string[]) => any;
    }
  ) => { isValid: boolean; errors: string[]; data: T };
  previewColumns: TableColumnsType<ParsedImportRow<T>>;
  onImport: (validItems: T[]) => Promise<void>;
  onSuccess?: () => void;
  width?: number;
}

export const cleanStr = (val: any): string =>
  val !== undefined && val !== null ? String(val).trim() : '';

export const getFieldVal = (
  row: Record<string, any>,
  possibleKeys: string[]
): any => {
  const keys = Object.keys(row);
  for (const p of possibleKeys) {
    const pNorm = p.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pNorm
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      return row[foundKey];
    }
  }
  return '';
};

export function ExcelImportModal<T = any>({
  open,
  onClose,
  title,
  entityName,
  templateUrl,
  templateConfig,
  instructionTitle = 'Nhập danh sách từ tệp Excel một lần',
  instructionSubtitle = 'Tải file mẫu để điền dữ liệu đúng định dạng hệ thống yêu cầu.',
  parseAndValidateRow,
  previewColumns,
  onImport,
  onSuccess,
  width = 950,
}: ExcelImportModalProps<T>) {
  const { message } = App.useApp();
  const [parsedRows, setParsedRows] = useState<ParsedImportRow<T>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [importLoading, setImportLoading] = useState(false);

  const handleClose = () => {
    setParsedRows([]);
    setIsProcessing(false);
    setFilterView('ALL');
    setImportLoading(false);
    onClose();
  };

  const handleDownloadTemplate = () => {
    try {
      if (templateUrl) {
        const link = document.createElement('a');
        link.href = templateUrl;
        link.download = templateUrl.split('/').pop() || 'Mau_Nhap_Du_Lieu.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (templateConfig) {
        const wb = XLSX.utils.book_new();
        const aoaData = [
          templateConfig.headers,
          ...(templateConfig.sampleRows || []),
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        XLSX.utils.book_append_sheet(
          wb,
          ws,
          templateConfig.sheetName || 'Mau_Nhap'
        );
        XLSX.writeFile(wb, templateConfig.fileName || 'Mau_Nhap_Du_Lieu.xlsx');
        message.success('Đã tải file Excel mẫu!');
        return;
      }

      message.warning('Chưa có file mẫu được cấu hình.');
    } catch (err: any) {
      console.error('Download template error:', err);
      message.error('Không thể tải file mẫu.');
    }
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          message.error('Không thể đọc dữ liệu file.');
          setIsProcessing(false);
          return;
        }

        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const worksheet = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          message.warning('Tệp Excel không chứa dữ liệu hoặc để trống.');
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        const helpers = { cleanStr, getFieldVal };
        const rows: ParsedImportRow<T>[] = rawJson.map((r, index) => {
          const rowIndex = index + 2;
          const { isValid, errors, data } = parseAndValidateRow(r, rowIndex, helpers);
          return {
            key: `row-${rowIndex}`,
            rowIndex,
            isValid,
            errors,
            data,
          };
        });

        setParsedRows(rows);
        const validCount = rows.filter((r) => r.isValid).length;
        message.success(`Đã đọc ${rows.length} dòng từ file (${validCount} hợp lệ)!`);
      } catch (err: any) {
        message.error(`Lỗi phân tích tệp: ${err?.message || 'Định dạng không hợp lệ'}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const errorRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  const displayedRows = useMemo(() => {
    if (filterView === 'VALID') return validRows;
    if (filterView === 'ERROR') return errorRows;
    return parsedRows;
  }, [parsedRows, validRows, errorRows, filterView]);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      message.warning('Không có dòng hợp lệ nào để nhập.');
      return;
    }

    try {
      setImportLoading(true);
      await onImport(validRows.map((r) => r.data));
      message.success(`Nhập thành công ${validRows.length} ${entityName}!`);
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Import error:', err);
      message.error(`Lỗi khi nhập dữ liệu: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>{title}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={width}
      destroyOnClose
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {parsedRows.length > 0 && (
              <span>
                Tổng: <strong>{parsedRows.length}</strong> | Hợp lệ:{' '}
                <strong className="text-green-600">{validRows.length}</strong> | Lỗi:{' '}
                <strong className="text-red-500">{errorRows.length}</strong>
              </span>
            )}
          </div>
          <Space>
            <Button onClick={handleClose}>Đóng</Button>
            {parsedRows.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={() => setParsedRows([])}>
                Chọn file khác
              </Button>
            )}
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={validRows.length === 0}
              loading={importLoading}
              onClick={handleConfirmImport}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Xác nhận nhập ({validRows.length}) {entityName}
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
              {instructionTitle}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              {instructionSubtitle}
            </div>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            className="bg-emerald-600 hover:bg-emerald-500 shrink-0 font-medium"
          >
            Tải File Excel Mẫu (.xlsx)
          </Button>
        </div>

        {parsedRows.length === 0 && (
          <Dragger
            accept=".xlsx, .xls, .csv"
            beforeUpload={handleFile}
            showUploadList={false}
            disabled={isProcessing}
            className="p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-emerald-500"
          >
            <p className="ant-upload-drag-icon text-emerald-600 text-4xl mb-3">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text font-semibold text-slate-700 dark:text-slate-200 text-base">
              Nhấp hoặc kéo thả file Excel {title} vào đây
            </p>
            <p className="ant-upload-hint text-xs text-gray-500 mt-1">
              Hỗ trợ định dạng .xlsx, .xls, .csv. Dung lượng tối đa 10MB.
            </p>
          </Dragger>
        )}

        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Text strong className="text-sm">Hiển thị:</Text>
                <Radio.Group
                  size="small"
                  value={filterView}
                  onChange={(e) => setFilterView(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="ALL">Tất cả ({parsedRows.length})</Radio.Button>
                  <Radio.Button value="VALID" disabled={validRows.length === 0}>
                    <span className="text-green-600 font-semibold">✓ Hợp lệ ({validRows.length})</span>
                  </Radio.Button>
                  <Radio.Button value="ERROR" disabled={errorRows.length === 0}>
                    <span className="text-red-500 font-semibold">✗ Lỗi ({errorRows.length})</span>
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>

            <Table<ParsedImportRow<T>>
              columns={previewColumns}
              dataSource={displayedRows}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 850, y: 300 }}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ExcelImportModal;
