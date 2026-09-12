import React, { useState, useMemo } from 'react';
import {
  Modal, Upload, Button, Table, Tag, Space,
  Typography, Tooltip, App, Radio
} from 'antd';
import {
  InboxOutlined, DownloadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ReloadOutlined, FileExcelOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { warehouseService, type WarehouseItem } from '../../services/warehouseService';

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedWarehouseRow {
  key: string;
  rowIndex: number;
  code: string;
  name: string;
  location: string;
  capacityKg: number;
  temperatureCelsius: number;
  description?: string;
  isValid: boolean;
  errors: string[];
}

interface WarehouseImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WarehouseImportModal: React.FC<WarehouseImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { message, notification } = App.useApp();
  const [parsedRows, setParsedRows] = useState<ParsedWarehouseRow[]>([]);
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

  const cleanStr = (val: any): string => (val !== undefined && val !== null ? String(val).trim() : '');

  const getFieldVal = (row: Record<string, any>, possibleKeys: string[]): any => {
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

  const handleDownloadTemplate = () => {
    try {
      const link = document.createElement('a');
      link.href = '/templates/Mau_Import_Kho_Bai.xlsx';
      link.download = 'Mau_Import_Kho_Bai.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã tải file mẫu Kho Bãi!');
    } catch {
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

        const rows: ParsedWarehouseRow[] = rawJson.map((r, index) => {
          const rowIndex = index + 2;
          const errors: string[] = [];

          const rawName = cleanStr(getFieldVal(r, ['Tên kho lạnh (*)', 'Tên kho lạnh', 'Tên kho', 'Name', 'WarehouseName']));
          const rawCode = cleanStr(getFieldVal(r, ['Mã kho', 'Mã', 'Code', 'WarehouseCode']));
          const location = cleanStr(getFieldVal(r, ['Vị trí', 'Địa điểm', 'Khu vực', 'Location']));
          const rawCap = getFieldVal(r, ['Sức chứa (Kg)', 'Sức chứa', 'Capacity', 'CapacityKg']);
          const rawTemp = getFieldVal(r, ['Nhiệt độ (°C)', 'Nhiệt độ', 'Temperature', 'Temp']);
          const description = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Description', 'Note']));

          if (!rawName) {
            errors.push('Tên kho không được để trống.');
          }

          const capacityKg = !isNaN(Number(rawCap)) && Number(rawCap) > 0 ? Number(rawCap) : 10000;
          const temperatureCelsius = !isNaN(Number(rawTemp)) ? Number(rawTemp) : -18;

          const isValid = errors.length === 0;

          return {
            key: `row-${rowIndex}`,
            rowIndex,
            code: rawCode,
            name: rawName,
            location: location || 'Khu lưu trữ chính',
            capacityKg,
            temperatureCelsius,
            description,
            isValid,
            errors,
          };
        });

        setParsedRows(rows);
        message.success(`Đã đọc ${rows.length} kho từ file!`);
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

    setImportLoading(true);
    let successCount = 0;

    for (const r of validRows) {
      try {
        const item: Omit<WarehouseItem, 'id'> = {
          code: r.code || '',
          name: r.name,
          location: r.location,
          capacityKg: r.capacityKg,
          currentStockKg: 0,
          temperatureCelsius: r.temperatureCelsius,
          status: 'OPERATIONAL',
          storageType: r.temperatureCelsius <= -15 ? 'FROZEN' : r.temperatureCelsius <= 5 ? 'FRESH' : 'DRY',
          description: r.description,
        };
        await warehouseService.create(item);
        successCount++;
      } catch {
        // Continue
      }
    }


    notification.success({
      message: 'Nhập Danh Mục Kho Thành Công!',
      description: `Đã thêm thành công ${successCount}/${validRows.length} kho lạnh vào hệ thống.`,
    });

    if (onSuccess) onSuccess();
    handleClose();
    setImportLoading(false);
  };

  const columns = [
    {
      title: 'STT / Dòng',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedWarehouseRow) => (
        <Space direction="vertical" size={2}>
          <Text strong>Dòng {val}</Text>
          {r.isValid ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hợp lệ
            </Tag>
          ) : (
            <Tooltip title={r.errors.join('; ')}>
              <Tag color="error" icon={<CloseCircleOutlined />} className="cursor-pointer">
                Lỗi
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Mã kho',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (c: string) => (c ? <Tag color="blue">{c}</Tag> : <Tag className="italic">(Tự sinh)</Tag>),
    },
    {
      title: 'Tên Kho Lạnh',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (n: string) => <div className="font-semibold text-slate-800 dark:text-slate-100">{n}</div>,
    },
    {
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: 180,
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacityKg',
      key: 'capacityKg',
      width: 120,
      align: 'right' as const,
      render: (cap: number) => <span className="font-mono">{cap.toLocaleString()} kg</span>,
    },
    {
      title: 'Nhiệt độ',
      dataIndex: 'temperatureCelsius',
      key: 'temperatureCelsius',
      width: 100,
      align: 'right' as const,
      render: (t: number) => <span className="font-mono">{t}°C</span>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>Nhập Danh Mục Kho Bãi từ Excel (.xlsx, .xls)</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={950}
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
              Xác nhận nhập ({validRows.length}) kho bãi
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
              Nhập danh sách kho lạnh & buồng cấp đông một lần
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Tải file mẫu để cấu hình sức chứa, vị trí và nhiệt độ chuẩn của kho.
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
              Nhấp hoặc kéo thả file Excel Danh Mục Kho vào đây
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

            <Table
              columns={columns}
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
};
