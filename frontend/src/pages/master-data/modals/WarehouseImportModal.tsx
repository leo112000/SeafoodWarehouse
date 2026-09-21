import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { warehouseService } from '@/services/warehouseService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { ExcelImportModal, type ParsedImportRow } from '@/components/common/ExcelImportModal';

const { Text } = Typography;

interface WarehouseData {
  code: string;
  name: string;
  location: string;
  capacityKg: number;
  temperatureCelsius: number;
  description?: string;
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
  const { warehouses, fetchWarehouses } = useWarehouseStore();

  const previewColumns = [
    {
      title: 'STT',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedImportRow<WarehouseData>) => (
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
      key: 'code',
      width: 130,
      render: (_: any, r: ParsedImportRow<WarehouseData>) =>
        r.data.code ? <Tag color="blue">{r.data.code}</Tag> : <Tag className="italic">(Tự sinh)</Tag>,
    },
    {
      title: 'Tên kho lạnh',
      key: 'name',
      width: 220,
      render: (_: any, r: ParsedImportRow<WarehouseData>) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.data.name}</div>
      ),
    },
    {
      title: 'Vị trí / Khu vực',
      key: 'location',
      width: 160,
      render: (_: any, r: ParsedImportRow<WarehouseData>) => r.data.location,
    },
    {
      title: 'Sức chứa',
      key: 'capacityKg',
      width: 120,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<WarehouseData>) => (
        <span className="font-mono">{r.data.capacityKg.toLocaleString()} kg</span>
      ),
    },
    {
      title: 'Nhiệt độ',
      key: 'temperatureCelsius',
      width: 100,
      align: 'right' as const,
      render: (_: any, r: ParsedImportRow<WarehouseData>) => (
        <span className="font-mono">{r.data.temperatureCelsius}°C</span>
      ),
    },
    {
      title: 'Ghi chú',
      key: 'description',
      render: (_: any, r: ParsedImportRow<WarehouseData>) => r.data.description || '-',
    },
  ];

  return (
    <ExcelImportModal<WarehouseData>
      open={open}
      onClose={onClose}
      onSuccess={async () => {
        await fetchWarehouses();
        onSuccess?.();
      }}
      title="Nhập Danh Mục Kho Bãi từ Excel (.xlsx, .xls)"
      entityName="kho bãi"
      templateUrl="/templates/Mau_Import_Kho_Bai.xlsx"
      templateConfig={{
        fileName: 'Mau_Import_Kho_Bai.xlsx',
        headers: ['Mã kho', 'Tên kho lạnh (*)', 'Vị trí', 'Sức chứa (Kg)', 'Nhiệt độ (°C)', 'Ghi chú'],
        sampleRows: [['KHO_DONG_1', 'Kho Đông Hải Sản 1', 'Khu A', 20000, -18, 'Kho đông lạnh chính']],
      }}
      instructionTitle="Nhập danh sách kho lạnh & buồng cấp đông một lần"
      instructionSubtitle="Tải file mẫu để cấu hình sức chứa, vị trí và nhiệt độ chuẩn của kho."
      parseAndValidateRow={(r, _, { cleanStr, getFieldVal }) => {
        const errors: string[] = [];
        const rawName = cleanStr(
          getFieldVal(r, ['Tên kho lạnh (*)', 'Tên kho lạnh', 'Tên kho', 'Name', 'WarehouseName'])
        );
        const rawCode = cleanStr(getFieldVal(r, ['Mã kho', 'Mã', 'Code', 'WarehouseCode']));
        const location = cleanStr(getFieldVal(r, ['Vị trí', 'Địa điểm', 'Khu vực', 'Location']));
        const rawCap = getFieldVal(r, ['Sức chứa (Kg)', 'Sức chứa', 'Capacity', 'CapacityKg']);
        const rawTemp = getFieldVal(r, ['Nhiệt độ (°C)', 'Nhiệt độ', 'Temperature', 'Temp']);
        const description = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Description', 'Note']));

        if (!rawName) {
          errors.push('Tên kho không được để trống.');
        } else if (warehouses.some((w) => w.name.toLowerCase().trim() === rawName.toLowerCase())) {
          errors.push(`Kho "${rawName}" đã tồn tại trong hệ thống.`);
        }

        if (rawCode && warehouses.some((w) => w.code.toLowerCase().trim() === rawCode.toLowerCase())) {
          errors.push(`Mã kho "${rawCode}" đã tồn tại.`);
        }

        const capacityKg = !isNaN(Number(rawCap)) && Number(rawCap) > 0 ? Number(rawCap) : 10000;
        const temperatureCelsius = !isNaN(Number(rawTemp)) ? Number(rawTemp) : -18;

        return {
          isValid: errors.length === 0,
          errors,
          data: {
            code: rawCode,
            name: rawName,
            location: location || 'Khu lưu trữ chính',
            capacityKg,
            temperatureCelsius,
            description,
          },
        };
      }}
      previewColumns={previewColumns}
      onImport={async (items) => {
        for (const item of items) {
          await warehouseService.create({
            name: item.name,
            code: item.code || generateCodeFromName(item.name),
            location: item.location,
            capacityKg: item.capacityKg,
            currentStockKg: 0,
            status: 'OPERATIONAL',
            storageType: 'FROZEN',
            temperatureCelsius: item.temperatureCelsius,
            description: item.description,
          });
        }
      }}
    />
  );
};

export default WarehouseImportModal;
