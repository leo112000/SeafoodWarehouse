import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { Product } from '@/types/seafood';
import { useProductStore } from '@/stores/useProductStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { formatCurrency } from '@/utils/format';
import { ExcelImportModal, type ParsedImportRow } from '@/components/common/ExcelImportModal';

const { Text } = Typography;

interface ProductData {
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  storageType: Product['storageType'];
  targetTemperature: number;
  minStock: number;
  maxStock: number;
  referencePrice: number;
  warningDaysBeforeExpiry: number;
  note?: string;
}

interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STORAGE_MAP: Record<string, { label: string; color: string }> = {
  FROZEN: { label: 'Cấp đông', color: 'blue' },
  FRESH:  { label: 'Ướp đá',   color: 'cyan' },
  ALIVE:  { label: 'Tươi sống', color: 'green' },
  DRY:    { label: 'Khô',       color: 'orange' },
};

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { products, addProductsBatch } = useProductStore();
  const { categories } = useCategoryStore();

  const previewColumns = [
    {
      title: 'STT / Dòng',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedImportRow<ProductData>) => (
        <Space direction="vertical" size={2}>
          <Text strong>Dòng {val}</Text>
          {r.isValid ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>Hợp lệ</Tag>
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
      key: 'code',
      width: 130,
      render: (_: any, r: ParsedImportRow<ProductData>) =>
        r.data.code
          ? <Tag color="blue">{r.data.code}</Tag>
          : <Tag className="italic">(Tự sinh)</Tag>,
    },
    {
      title: 'Tên hải sản',
      key: 'name',
      width: 220,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            {r.data.name || <Text type="danger">(Chưa có tên)</Text>}
          </div>
          {r.data.note && (
            <div className="text-xs text-gray-400 truncate max-w-xs">{r.data.note}</div>
          )}
          {r.errors.length > 0 && (
            <div className="text-xs text-red-500 mt-1 font-medium">{r.errors.join(' | ')}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Danh mục',
      key: 'categoryName',
      width: 120,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <Tag color="purple">{r.data.categoryName}</Tag>
      ),
    },
    {
      title: 'ĐVT',
      key: 'unit',
      width: 70,
      align: 'center' as const,
      render: (_: any, r: ParsedImportRow<ProductData>) => <Tag>{r.data.unit}</Tag>,
    },
    {
      title: 'Bảo quản',
      key: 'storageType',
      width: 110,
      render: (_: any, r: ParsedImportRow<ProductData>) => {
        const cfg = STORAGE_MAP[r.data.storageType] ?? STORAGE_MAP.FROZEN;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Nhiệt độ',
      key: 'targetTemperature',
      width: 85,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <span className="font-mono">{r.data.targetTemperature}°C</span>
      ),
    },
    {
      title: 'Tồn Min/Max',
      key: 'stockRange',
      width: 130,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <span className="font-mono text-xs">
          {r.data.minStock} - {r.data.maxStock} {r.data.unit}
        </span>
      ),
    },
    {
      title: 'Đơn giá tham chiếu',
      key: 'referencePrice',
      width: 140,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <span className="font-semibold text-emerald-600">{formatCurrency(r.data.referencePrice)}</span>
      ),
    },
    {
      title: 'Báo HSD',
      key: 'warningDaysBeforeExpiry',
      width: 90,
      align: 'center' as const,
      render: (_: any, r: ParsedImportRow<ProductData>) => (
        <span className="text-xs">{r.data.warningDaysBeforeExpiry} ngày</span>
      ),
    },
  ];

  return (
    <ExcelImportModal<ProductData>
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Nhập Danh Sách Hải Sản từ File Excel (.xlsx, .xls)"
      entityName="mặt hàng hải sản"
      templateUrl="/templates/Mau_Import_Danh_Muc_Hai_San.xlsx"
      templateConfig={{
        fileName: 'Mau_Import_Danh_Muc_Hai_San.xlsx',
        headers: [
          'Mã sản phẩm', 'Tên hải sản (*)', 'Danh mục (*)', 'Đơn vị tính (*)',
          'Loại bảo quản', 'Nhiệt độ (°C)', 'Tồn tối thiểu', 'Tồn tối đa',
          'Đơn giá tham chiếu (VNĐ)', 'Cảnh báo HSD (ngày)', 'Ghi chú',
        ],
        sampleRows: [[
          'HS_CA_001', 'Cá Thu Đại Dương', 'Cá', 'Kg',
          'FROZEN', -18, 50, 500, 180000, 3, 'Cá thu nguyên con',
        ]],
      }}
      instructionTitle="Bạn có danh sách hải sản cần nạp vào hệ thống một lần?"
      instructionSubtitle="Hãy tải file Excel mẫu chuẩn đã có sẵn tiêu đề, định dạng cột và dữ liệu mẫu test để điền thông tin nhanh chóng."
      width={1100}
      parseAndValidateRow={(r, _, { cleanStr, getFieldVal }) => {
        const errors: string[] = [];

        const rawName    = cleanStr(getFieldVal(r, ['Tên hải sản (*)', 'Tên hải sản', 'Tên sản phẩm', 'Name', 'Ten hai san', 'Ten san pham']));
        const rawCode    = cleanStr(getFieldVal(r, ['Mã sản phẩm', 'Mã hải sản', 'Code', 'Ma san pham', 'Ma hai san']));
        const rawCat     = cleanStr(getFieldVal(r, ['Danh mục (*)', 'Danh mục', 'Category', 'Danh muc', 'Nhóm danh mục']));
        const rawUnit    = cleanStr(getFieldVal(r, ['Đơn vị tính (*)', 'Đơn vị tính', 'ĐVT', 'Unit', 'Don vi tinh'])) || 'Kg';
        const rawStorage = cleanStr(getFieldVal(r, ['Loại bảo quản', 'Bảo quản', 'StorageType', 'Loai bao quan']));
        const rawTemp    = getFieldVal(r, ['Nhiệt độ (°C)', 'Nhiệt độ', 'TargetTemperature', 'Nhiet do']);
        const rawMin     = getFieldVal(r, ['Tồn tối thiểu', 'Tồn min', 'MinStock', 'Ton toi thieu']);
        const rawMax     = getFieldVal(r, ['Tồn tối đa', 'Tồn max', 'MaxStock', 'Ton toi da']);
        const rawPrice   = getFieldVal(r, ['Đơn giá tham chiếu (VNĐ)', 'Đơn giá tham chiếu', 'Đơn giá', 'Price', 'Don gia']);
        const rawExpiry  = getFieldVal(r, ['Cảnh báo HSD (ngày)', 'Cảnh báo HSD', 'HSD', 'Canh bao HSD']);
        const note       = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Description', 'Note', 'Ghi chu']));

        if (!rawName) errors.push('Tên hải sản không được để trống.');

        let matchedCatId   = String(categories[0]?.id || '1');
        let matchedCatName = categories[0]?.name || 'Cá';
        if (categories.length > 0 && rawCat) {
          const found = categories.find(
            (c) =>
              c.name.toLowerCase() === rawCat.toLowerCase() ||
              c.code.toLowerCase() === rawCat.toLowerCase() ||
              rawCat.toLowerCase().includes(c.name.toLowerCase())
          );
          if (found) {
            matchedCatId   = String(found.id);
            matchedCatName = found.name;
          }
        }

        let storageType: Product['storageType'] = 'FROZEN';
        const sLower = rawStorage.toLowerCase();
        if (sLower.includes('tươi') || sLower.includes('sống') || sLower === 'alive')   storageType = 'ALIVE';
        else if (sLower.includes('đá') || sLower === 'fresh')                            storageType = 'FRESH';
        else if (sLower.includes('khô') || sLower === 'dry')                             storageType = 'DRY';

        let targetTemperature = storageType === 'ALIVE' ? 20 : storageType === 'FRESH' ? 2 : storageType === 'DRY' ? 25 : -18;
        if (rawTemp !== '' && !isNaN(Number(rawTemp))) targetTemperature = Number(rawTemp);

        const minStock = !isNaN(Number(rawMin)) && Number(rawMin) >= 0 ? Number(rawMin) : 50;
        const maxStock = !isNaN(Number(rawMax)) && Number(rawMax) >= 0 ? Number(rawMax) : 500;
        if (minStock > maxStock) errors.push('Tồn tối thiểu lớn hơn tồn tối đa.');

        const referencePrice          = !isNaN(Number(rawPrice))  && Number(rawPrice)  >= 0 ? Number(rawPrice)  : 0;
        const warningDaysBeforeExpiry = !isNaN(Number(rawExpiry)) && Number(rawExpiry) >  0 ? Number(rawExpiry) : 3;

        const finalCode = rawCode ? rawCode.toUpperCase() : '';
        if (finalCode) {
          const existingCodes = new Set(products.map((p) => p.code?.trim().toUpperCase()).filter(Boolean));
          if (existingCodes.has(finalCode)) errors.push(`Mã "${finalCode}" đã tồn tại trong hệ thống.`);
        }

        return {
          isValid: errors.length === 0,
          errors,
          data: {
            code: finalCode,
            name: rawName,
            categoryId: matchedCatId,
            categoryName: matchedCatName,
            unit: rawUnit,
            storageType,
            targetTemperature,
            minStock,
            maxStock,
            referencePrice,
            warningDaysBeforeExpiry,
            note,
          },
        };
      }}
      previewColumns={previewColumns}
      onImport={async (items) => {
        await addProductsBatch(
          items.map((item) => ({
            code: item.code,
            name: item.name,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            unit: item.unit,
            storageType: item.storageType,
            targetTemperature: item.targetTemperature,
            minStock: item.minStock,
            maxStock: item.maxStock,
            referencePrice: item.referencePrice,
            warningDaysBeforeExpiry: item.warningDaysBeforeExpiry,
            status: 'ACTIVE' as const,
            note: item.note,
          }))
        );
      }}
    />
  );
};

export default ProductImportModal;
