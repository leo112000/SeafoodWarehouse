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
import type { Product } from '../../types/seafood';
import { useProductStore } from '../../stores/useProductStore';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { formatCurrency } from '../../utils/format';

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedProductRow {
  key: string;
  rowIndex: number;
  code: string;
  name: string;
  categoryName: string;
  categoryId: string;
  unit: string;
  storageType: Product['storageType'];
  targetTemperature: number;
  minStock: number;
  maxStock: number;
  referencePrice: number;
  warningDaysBeforeExpiry: number;
  note?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { message, notification } = App.useApp();
  const { products, addProductsBatch } = useProductStore();
  const { categories } = useCategoryStore();

  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [importLoading, setImportLoading] = useState(false);

  // Reset khi đóng modal
  const handleClose = () => {
    setParsedRows([]);

    setIsProcessing(false);
    setFilterView('ALL');
    setImportLoading(false);
    onClose();
  };

  // Helper chuẩn hóa text
  const cleanStr = (val: any): string => (val !== undefined && val !== null ? String(val).trim() : '');

  // Helper tìm key trong object linh hoạt hoa thường
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

  // Tải file mẫu Excel
  const handleDownloadTemplate = () => {
    try {
      const link = document.createElement('a');
      link.href = '/templates/Mau_Import_Danh_Muc_Hai_San.xlsx';
      link.download = 'Mau_Import_Danh_Muc_Hai_San.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã tải xuống file mẫu Excel!');
    } catch {
      message.error('Không thể tải file mẫu, vui lòng thử lại.');
    }
  };

  // Xử lý đọc file Excel
  const handleFile = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          message.error('Không thể đọc dữ liệu từ tệp tin.');
          setIsProcessing(false);
          return;
        }

        const wb = XLSX.read(buffer, { type: 'array' });
        // Chọn sheet đầu tiên hoặc sheet có tên chứa "Danh sách" / "Sản phẩm"
        let sheetName = wb.SheetNames[0];
        const dataSheet = wb.SheetNames.find(
          (name) =>
            name.toLowerCase().includes('danh sách') ||
            name.toLowerCase().includes('hải sản') ||
            name.toLowerCase().includes('san pham') ||
            name.toLowerCase().includes('product')
        );
        if (dataSheet) {
          sheetName = dataSheet;
        }

        const worksheet = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          message.warning('Tệp Excel không chứa dữ liệu hoặc để trống.');
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        // Tạo tập hợp mã sản phẩm hiện tại để kiểm tra trùng
        const existingCodes = new Set(
          products.map((p) => p.code?.trim().toUpperCase()).filter(Boolean)
        );
        const importedCodesInBatch = new Set<string>();

        const rows: ParsedProductRow[] = rawJson.map((r, index) => {
          const rowIndex = index + 2; // Dòng 1 là tiêu đề
          const errors: string[] = [];
          const warnings: string[] = [];

          const rawName = cleanStr(getFieldVal(r, ['Tên hải sản (*)', 'Tên hải sản', 'Tên sản phẩm', 'Name', 'Ten hai san', 'Ten san pham']));
          const rawCode = cleanStr(getFieldVal(r, ['Mã sản phẩm', 'Mã hải sản', 'Code', 'Ma san pham', 'Ma hai san']));
          const rawCat = cleanStr(getFieldVal(r, ['Danh mục (*)', 'Danh mục', 'Category', 'Danh muc', 'Nhóm danh mục']));
          const rawUnit = cleanStr(getFieldVal(r, ['Đơn vị tính (*)', 'Đơn vị tính', 'ĐVT', 'Unit', 'Don vi tinh'])) || 'Kg';
          const rawStorage = cleanStr(getFieldVal(r, ['Loại bảo quản', 'Bảo quản', 'StorageType', 'Loai bao quan']));
          const rawTemp = getFieldVal(r, ['Nhiệt độ (°C)', 'Nhiệt độ', 'TargetTemperature', 'Nhiet do']);
          const rawMinStock = getFieldVal(r, ['Tồn tối thiểu', 'Tồn min', 'MinStock', 'Ton toi thieu']);
          const rawMaxStock = getFieldVal(r, ['Tồn tối đa', 'Tồn max', 'MaxStock', 'Ton toi da']);
          const rawPrice = getFieldVal(r, ['Đơn giá tham chiếu (VNĐ)', 'Đơn giá tham chiếu', 'Đơn giá', 'Price', 'Don gia']);
          const rawExpiry = getFieldVal(r, ['Cảnh báo HSD (ngày)', 'Cảnh báo HSD', 'HSD', 'Canh bao HSD']);
          const note = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Description', 'Note', 'Ghi chu']));

          // 1. Kiểm tra Tên hải sản (Bắt buộc)
          if (!rawName) {
            errors.push('Tên hải sản không được để trống.');
          }

          // 2. Kiểm tra & Khớp danh mục
          let matchedCatId = '1';
          let matchedCatName = rawCat || 'Cá';
          if (categories.length > 0) {
            const found = categories.find(
              (c) =>
                c.name.toLowerCase() === rawCat.toLowerCase() ||
                c.code.toLowerCase() === rawCat.toLowerCase() ||
                rawCat.toLowerCase().includes(c.name.toLowerCase())
            );
            if (found) {
              matchedCatId = String(found.id);
              matchedCatName = found.name;
            } else if (rawCat) {
              warnings.push(`Danh mục "${rawCat}" chưa có sẵn, sẽ gán vào "${categories[0]?.name || 'Cá'}"`);
              matchedCatId = String(categories[0]?.id || '1');
              matchedCatName = categories[0]?.name || 'Cá';
            } else {
              matchedCatId = String(categories[0]?.id || '1');
              matchedCatName = categories[0]?.name || 'Cá';
            }
          }

          // 3. Chuẩn hóa Loại bảo quản
          let storageType: Product['storageType'] = 'FROZEN';
          const sLower = rawStorage.toLowerCase();
          if (sLower.includes('tươi') || sLower.includes('sống') || sLower === 'alive') {
            storageType = 'ALIVE';
          } else if (sLower.includes('đá') || sLower.includes('fresh')) {
            storageType = 'FRESH';
          } else if (sLower.includes('khô') || sLower === 'dry') {
            storageType = 'DRY';
          } else {
            storageType = 'FROZEN';
          }

          // 4. Nhiệt độ bảo quản
          let targetTemperature = -18;
          if (rawTemp !== '' && !isNaN(Number(rawTemp))) {
            targetTemperature = Number(rawTemp);
          } else {
            if (storageType === 'ALIVE') targetTemperature = 20;
            else if (storageType === 'FRESH') targetTemperature = 2;
            else if (storageType === 'DRY') targetTemperature = 25;
            else targetTemperature = -18;
          }

          // 5. Tồn kho tối thiểu & tối đa
          const minStock = !isNaN(Number(rawMinStock)) && Number(rawMinStock) >= 0 ? Number(rawMinStock) : 50;
          const maxStock = !isNaN(Number(rawMaxStock)) && Number(rawMaxStock) >= 0 ? Number(rawMaxStock) : 500;
          if (minStock > maxStock) {
            warnings.push('Tồn tối thiểu lớn hơn tồn tối đa');
          }

          // 6. Đơn giá tham chiếu
          const referencePrice = !isNaN(Number(rawPrice)) && Number(rawPrice) >= 0 ? Number(rawPrice) : 0;

          // 7. Cảnh báo HSD
          const warningDaysBeforeExpiry = !isNaN(Number(rawExpiry)) && Number(rawExpiry) > 0 ? Number(rawExpiry) : 3;

          // 8. Kiểm tra mã sản phẩm
          let finalCode = rawCode ? rawCode.toUpperCase() : '';
          if (finalCode) {
            if (existingCodes.has(finalCode)) {
              errors.push(`Mã "${finalCode}" đã tồn tại trong hệ thống.`);
            } else if (importedCodesInBatch.has(finalCode)) {
              errors.push(`Mã "${finalCode}" bị trùng lặp trong file import.`);
            } else {
              importedCodesInBatch.add(finalCode);
            }
          }

          const isValid = errors.length === 0;

          return {
            key: `row-${rowIndex}`,
            rowIndex,
            code: finalCode,
            name: rawName,
            categoryName: matchedCatName,
            categoryId: matchedCatId,
            unit: rawUnit,
            storageType,
            targetTemperature,
            minStock,
            maxStock,
            referencePrice,
            warningDaysBeforeExpiry,
            note,
            isValid,
            errors,
            warnings,
          };
        });

        setParsedRows(rows);
        message.success(`Đã đọc thành công ${rows.length} dòng dữ liệu từ file!`);
      } catch (err: any) {
        message.error(`Lỗi phân tích tệp Excel: ${err?.message || 'Định dạng không hợp lệ'}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
    return false; // Ngăn Antd upload tự động lên server
  };

  // Thống kê dữ liệu import
  const validRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const errorRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  // Lọc hiển thị trong bảng Preview
  const displayedRows = useMemo(() => {
    if (filterView === 'VALID') return validRows;
    if (filterView === 'ERROR') return errorRows;
    return parsedRows;
  }, [parsedRows, validRows, errorRows, filterView]);

  // Thực hiện lưu hàng loạt
  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      message.warning('Không có dòng dữ liệu hợp lệ nào để nhập.');
      return;
    }

    setImportLoading(true);
    try {
      const itemsToImport = validRows.map((r) => ({
        code: r.code,
        name: r.name,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        unit: r.unit,
        storageType: r.storageType,
        targetTemperature: r.targetTemperature,
        minStock: r.minStock,
        maxStock: r.maxStock,
        referencePrice: r.referencePrice,
        warningDaysBeforeExpiry: r.warningDaysBeforeExpiry,
        status: 'ACTIVE' as const,
        note: r.note,
      }));

      const res = await addProductsBatch(itemsToImport);

      notification.success({
        message: 'Nhập Dữ Liệu Excel Thành Công!',
        description: `Đã nhập thành công ${res.importedCount}/${validRows.length} mặt hàng hải sản vào hệ thống. ${
          res.skippedCount > 0 ? `Bỏ qua ${res.skippedCount} dòng không hợp lệ.` : ''
        }`,
        duration: 5,
      });

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err: any) {
      notification.error({
        message: 'Nhập dữ liệu thất bại',
        description: err?.message || 'Có lỗi xảy ra trong quá trình lưu dữ liệu hàng loạt.',
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Cấu hình cột bảng Preview
  const columns = [
    {
      title: 'STT / Dòng',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedProductRow) => (
        <Space orientation="vertical" size={2}>
          <Text strong>Dòng {val}</Text>
          {r.isValid ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Hợp lệ
            </Tag>
          ) : (
            <Tooltip title={r.errors.join('; ')}>
              <Tag color="error" icon={<CloseCircleOutlined />} className="cursor-pointer">
                Lỗi ({r.errors.length})
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Mã hải sản',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) =>
        code ? (
          <Tag color="blue">{code}</Tag>
        ) : (
          <Tag color="default" className="italic">
            (Tự sinh)
          </Tag>
        ),
    },
    {
      title: 'Tên hải sản',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, r: ParsedProductRow) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{name || <Text type="danger">(Chưa có tên)</Text>}</div>
          {r.note && <div className="text-xs text-gray-400 truncate max-w-xs">{r.note}</div>}
          {r.errors.length > 0 && (
            <div className="text-xs text-red-500 mt-1 font-medium">{r.errors.join(' | ')}</div>
          )}
          {r.warnings.length > 0 && (
            <div className="text-xs text-amber-500 mt-0.5">{r.warnings.join(' | ')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      render: (cat: string) => <Tag color="purple">{cat}</Tag>,
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 70,
      align: 'center' as const,
      render: (unit: string) => <Tag>{unit}</Tag>,
    },
    {
      title: 'Bảo quản',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 110,
      render: (type: Product['storageType']) => {
        const map = {
          FROZEN: { label: 'Cấp đông', color: 'blue' },
          FRESH: { label: 'Ướp đá', color: 'cyan' },
          ALIVE: { label: 'Tươi sống', color: 'green' },
          DRY: { label: 'Khô', color: 'orange' },
        };
        const item = map[type] || map.FROZEN;
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Nhiệt độ',
      dataIndex: 'targetTemperature',
      key: 'targetTemperature',
      width: 85,
      align: 'right' as const,
      render: (t: number) => <span className="font-mono">{t}°C</span>,
    },
    {
      title: 'Tồn Min/Max',
      key: 'stockRange',
      width: 130,
      align: 'right' as const,
      render: (_: any, r: ParsedProductRow) => (
        <span className="font-mono text-xs">
          {r.minStock} - {r.maxStock} {r.unit}
        </span>
      ),
    },
    {
      title: 'Đơn giá tham chiếu',
      dataIndex: 'referencePrice',
      key: 'referencePrice',
      width: 140,
      align: 'right' as const,
      render: (p: number) => <span className="font-semibold text-emerald-600">{formatCurrency(p)}</span>,
    },
    {
      title: 'Báo HSD',
      dataIndex: 'warningDaysBeforeExpiry',
      key: 'warningDaysBeforeExpiry',
      width: 90,
      align: 'center' as const,
      render: (d: number) => <span className="text-xs">{d} ngày</span>,
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>Nhập Danh Sách Hải Sản từ File Excel (.xlsx, .xls)</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={1100}
      destroyOnClose
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {parsedRows.length > 0 && (
              <span>
                Phát hiện <strong className="text-slate-800 dark:text-slate-200">{parsedRows.length}</strong> dòng |{' '}
                Hợp lệ: <strong className="text-green-600">{validRows.length}</strong> |{' '}
                Lỗi: <strong className="text-red-500">{errorRows.length}</strong>
              </span>
            )}
          </div>
          <Space>
            <Button onClick={handleClose}>Đóng</Button>
            {parsedRows.length > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setParsedRows([]);
                }}
              >
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
              Xác nhận nhập ({validRows.length}) mặt hàng
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Hướng dẫn & Nút tải mẫu */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
              Bạn có danh sách hải sản cần nạp vào hệ thống một lần?
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Hãy tải file Excel mẫu chuẩn đã có sẵn tiêu đề, định dạng cột và dữ liệu mẫu test để điền thông tin nhanh chóng.
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

        {/* Khu vực Upload Kéo Thả */}
        {parsedRows.length === 0 && (
          <Dragger
            accept=".xlsx, .xls, .csv"
            beforeUpload={handleFile}
            showUploadList={false}
            disabled={isProcessing}
            className="p-6 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-emerald-500 transition-colors"
          >
            <p className="ant-upload-drag-icon text-emerald-600 text-4xl mb-3">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text font-semibold text-slate-700 dark:text-slate-200 text-base">
              Nhấp hoặc kéo thả file Excel vào khu vực này để tải lên
            </p>
            <p className="ant-upload-hint text-xs text-gray-500 max-w-md mx-auto mt-1">
              Hỗ trợ tệp định dạng .xlsx, .xls, .csv. Hệ thống sẽ tự động phân tích các cột và kiểm tra tính hợp lệ trước khi lưu vào kho dữ liệu.
            </p>
          </Dragger>
        )}

        {/* Thanh trạng thái & Bộ lọc bảng Preview khi đã tải file */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Text strong className="text-sm">Xem danh sách:</Text>
                <Radio.Group
                  size="small"
                  value={filterView}
                  onChange={(e) => setFilterView(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="ALL">
                    Tất cả ({parsedRows.length})
                  </Radio.Button>
                  <Radio.Button value="VALID" disabled={validRows.length === 0}>
                    <span className="text-green-600 font-semibold">✓ Hợp lệ ({validRows.length})</span>
                  </Radio.Button>
                  <Radio.Button value="ERROR" disabled={errorRows.length === 0}>
                    <span className="text-red-500 font-semibold">✗ Lỗi ({errorRows.length})</span>
                  </Radio.Button>
                </Radio.Group>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium">
                  {validRows.length} sẵn sàng nhập
                </span>
                {errorRows.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 font-medium">
                    {errorRows.length} dòng cần sửa
                  </span>
                )}
              </div>
            </div>

            {errorRows.length > 0 && (
              <Alert
                message={
                  <span>
                    Có <strong>{errorRows.length}</strong> dòng bị lỗi (thiếu tên hải sản hoặc trùng mã). Các dòng lỗi này sẽ tự động bị bỏ qua khi bạn bấm xác nhận nhập.
                  </span>
                }
                type="warning"
                showIcon
                closable
              />
            )}

            {/* Bảng xem trước dữ liệu */}
            <Table
              columns={columns}
              dataSource={displayedRows}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 1050, y: 340 }}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
              rowClassName={(r) => (!r.isValid ? 'bg-red-50/40 dark:bg-red-950/20' : '')}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
