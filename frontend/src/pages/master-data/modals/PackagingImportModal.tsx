import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { packagingService } from '@/services/packagingService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import type { PackagingType } from '@/types/seafood';
import { ExcelImportModal, type ParsedImportRow } from '@/components/common/ExcelImportModal';

const { Text } = Typography;

interface PackagingData {
  code: string;
  name: string;
  category: 'CONTAINER' | 'CONSUMABLE';
  defaultTareWeight: number;
  unit: string;
  stockQuantity: number;
  note?: string;
}

interface PackagingImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PackagingImportModal: React.FC<PackagingImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const previewColumns = [
    {
      title: 'STT',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedImportRow<PackagingData>) => (
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
      title: 'Mã số',
      key: 'code',
      width: 120,
      render: (_: any, r: ParsedImportRow<PackagingData>) =>
        r.data.code ? <Tag color="blue">{r.data.code}</Tag> : <Tag className="italic">(Tự sinh)</Tag>,
    },
    {
      title: 'Tên Bao Bì / Sọt',
      key: 'name',
      width: 220,
      render: (_: any, r: ParsedImportRow<PackagingData>) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.data.name}</div>
      ),
    },
    {
      title: 'Phân loại',
      key: 'category',
      width: 140,
      render: (_: any, r: ParsedImportRow<PackagingData>) => (
        <Tag color={r.data.category === 'CONTAINER' ? 'cyan' : 'orange'}>
          {r.data.category === 'CONTAINER' ? 'Sọt luân chuyển' : 'Vật tư 1 lần'}
        </Tag>
      ),
    },
    {
      title: 'Trọng lượng bì',
      key: 'defaultTareWeight',
      width: 130,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<PackagingData>) => (
        <span className="font-mono">{r.data.defaultTareWeight} kg</span>
      ),
    },
    {
      title: 'Tồn ban đầu',
      key: 'stockQuantity',
      width: 120,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<PackagingData>) => (
        <span className="font-mono font-bold text-emerald-600">
          {r.data.stockQuantity.toLocaleString()} {r.data.unit}
        </span>
      ),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_: any, r: ParsedImportRow<PackagingData>) => r.data.note || '-',
    },
  ];

  return (
    <ExcelImportModal<PackagingData>
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Nhập Danh Mục Bao Bì từ Excel (.xlsx, .xls)"
      entityName="bao bì"
      templateUrl="/templates/Mau_Import_Bao_Bi.xlsx"
      templateConfig={{
        fileName: 'Mau_Import_Bao_Bi.xlsx',
        headers: ['Mã số', 'Tên bao bì / sọt (*)', 'Phân loại (CONTAINER/CONSUMABLE)', 'Khối lượng bì (Kg)', 'Đơn vị tính', 'Số lượng tồn ban đầu', 'Ghi chú'],
        sampleRows: [['SOT_CAM_01', 'Sọt nhựa cam 50kg', 'CONTAINER', 2.5, 'Cái', 500, 'Sọt nhựa dày luân chuyển']],
      }}
      instructionTitle="Nhập danh sách sọt nhựa luân chuyển & vật tư đóng gói một lần"
      instructionSubtitle="Tải file mẫu để điền khối lượng bì chuẩn và số lượng tồn kho ban đầu."
      parseAndValidateRow={(r, _, { cleanStr, getFieldVal }) => {
        const errors: string[] = [];
        const rawName = cleanStr(
          getFieldVal(r, ['Tên bao bì / sọt (*)', 'Tên bao bì', 'Tên sọt', 'Tên vật tư', 'Name', 'PackagingName'])
        );
        const rawCode = cleanStr(getFieldVal(r, ['Mã số', 'Mã bao bì', 'Mã', 'Code', 'PackagingCode']));
        const rawCat = cleanStr(getFieldVal(r, ['Phân loại', 'Loại', 'Category', 'Type'])).toUpperCase();
        const rawTare = getFieldVal(r, ['Khối lượng bì (Kg)', 'Trọng lượng bì', 'Bì (kg)', 'TareWeight', 'DefaultTareWeight']);
        const rawUnit = cleanStr(getFieldVal(r, ['Đơn vị tính', 'ĐVT', 'Unit'])) || 'Cái';
        const rawStock = getFieldVal(r, ['Số lượng tồn ban đầu', 'Tồn kho', 'Số lượng', 'Stock', 'StockQuantity']);
        const note = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Note']));

        if (!rawName) {
          errors.push('Tên bao bì/sọt không được để trống.');
        }

        const category: 'CONTAINER' | 'CONSUMABLE' =
          rawCat.includes('CONSUMABLE') || rawCat.includes('1 LẦN') || rawCat.includes('XỐP')
            ? 'CONSUMABLE'
            : 'CONTAINER';

        const defaultTareWeight = !isNaN(Number(rawTare)) && Number(rawTare) >= 0 ? Number(rawTare) : 0;
        const stockQuantity = !isNaN(Number(rawStock)) && Number(rawStock) >= 0 ? Number(rawStock) : 0;

        return {
          isValid: errors.length === 0,
          errors,
          data: {
            code: rawCode,
            name: rawName,
            category,
            defaultTareWeight,
            unit: rawUnit,
            stockQuantity,
            note,
          },
        };
      }}
      previewColumns={previewColumns}
      onImport={async (items) => {
        for (const item of items) {
          const createDto: Omit<PackagingType, 'id'> = {
            code: item.code || generateCodeFromName(item.name),
            name: item.name,
            category: item.category,
            defaultTareWeight: item.defaultTareWeight,
            unit: item.unit,
            stockQuantity: item.stockQuantity,
            note: item.note,
          };
          await packagingService.create(createDto);
        }
      }}
    />
  );
};

export default PackagingImportModal;
