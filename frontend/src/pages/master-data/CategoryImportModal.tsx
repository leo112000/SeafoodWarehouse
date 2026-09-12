import React, { useState, useMemo } from 'react';
import {
  Modal, Upload, Button, Table, Tag, Space, Alert,
  Typography, Tooltip, App, Radio
} from 'antd';
import {
  InboxOutlined, DownloadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ReloadOutlined, FileExcelOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useCategoryStore } from '../../stores/useCategoryStore';

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedCategoryRow {
  key: string;
  rowIndex: number;
  code: string;
  name: string;
  description?: string;
  isValid: boolean;
  errors: string[];
}

interface CategoryImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CategoryImportModal: React.FC<CategoryImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { message, notification } = App.useApp();
  const { categories, addCategory } = useCategoryStore();
  const [parsedRows, setParsedRows] = useState<ParsedCategoryRow[]>([]);
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
      link.href = '/templates/Mau_Import_Nhom_Danh_Muc.xlsx';
      link.download = 'Mau_Import_Nhom_Danh_Muc.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã tải file mẫu Nhóm Danh Mục!');
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

        const existingNames = new Set(categories.map((c) => c.name.toLowerCase().trim()));
        const existingCodes = new Set(categories.map((c) => c.code.toLowerCase().trim()));

        const rows: ParsedCategoryRow[] = rawJson.map((r, index) => {
          const rowIndex = index + 2;
          const errors: string[] = [];

          const rawName = cleanStr(getFieldVal(r, ['Tên nhóm danh mục (*)', 'Tên nhóm danh mục', 'Tên danh mục', 'Tên nhóm', 'Name', 'CategoryName']));
          const rawCode = cleanStr(getFieldVal(r, ['Mã danh mục', 'Mã nhóm', 'Code', 'CategoryCode']));
          const description = cleanStr(getFieldVal(r, ['Mô tả', 'Ghi chú', 'Description', 'Note']));

          if (!rawName) {
            errors.push('Tên nhóm danh mục không được để trống.');
          } else if (existingNames.has(rawName.toLowerCase())) {
            errors.push(`Danh mục "${rawName}" đã tồn tại trong hệ thống.`);
          }

          if (rawCode && existingCodes.has(rawCode.toLowerCase())) {
            errors.push(`Mã "${rawCode}" đã tồn tại trong hệ thống.`);
          }

          const isValid = errors.length === 0;

          return {
            key: `row-${rowIndex}`,
            rowIndex,
            code: rawCode,
            name: rawName,
            description,
            isValid,
            errors,
          };
        });

        setParsedRows(rows);
        message.success(`Đã đọc ${rows.length} nhóm danh mục từ file!`);
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
        await addCategory({
          code: r.code || '',
          name: r.name,
          description: r.description || '',
        });
        successCount++;
      } catch {
        // Continue
      }
    }

    notification.success({
      message: 'Nhập Nhóm Danh Mục Thành Công!',
      description: `Đã thêm thành công ${successCount}/${validRows.length} nhóm danh mục.`,
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
      render: (val: number, r: ParsedCategoryRow) => (
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
      title: 'Mã danh mục',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (c: string) => (c ? <Tag color="blue">{c}</Tag> : <Tag className="italic">(Tự sinh)</Tag>),
    },
    {
      title: 'Tên Nhóm Danh Mục',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (n: string) => <div className="font-semibold text-slate-800 dark:text-slate-100">{n}</div>,
    },
    {
      title: 'Mô tả / Ghi chú',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>Nhập Nhóm Danh Mục từ Excel (.xlsx, .xls)</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={900}
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
              Xác nhận nhập ({validRows.length}) danh mục
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
              Nhập danh sách nhóm danh mục hải sản một lần
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Tải file mẫu để điền các nhóm danh mục như Cá biển, Tôm, Cua, Mực...
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
              Nhấp hoặc kéo thả file Excel Nhóm Danh Mục vào đây
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

            {errorRows.length > 0 && (
              <Alert
                message={`Có ${errorRows.length} dòng bị trùng hoặc thiếu tên và sẽ bị bỏ qua khi nhập.`}
                type="warning"
                showIcon
              />
            )}

            <Table
              columns={columns}
              dataSource={displayedRows}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 750, y: 300 }}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
