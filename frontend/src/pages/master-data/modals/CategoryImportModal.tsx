import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { ExcelImportModal, type ParsedImportRow } from '@/components/common/ExcelImportModal';

const { Text } = Typography;

interface CategoryData {
  code: string;
  name: string;
  description?: string;
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
  const { categories, addCategory } = useCategoryStore();

  const previewColumns = [
    {
      title: 'STT',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 90,
      render: (val: number, r: ParsedImportRow<CategoryData>) => (
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
      key: 'code',
      width: 140,
      render: (_: any, r: ParsedImportRow<CategoryData>) =>
        r.data.code ? <Tag color="blue">{r.data.code}</Tag> : <Tag className="italic">(Tự sinh)</Tag>,
    },
    {
      title: 'Tên Nhóm Danh Mục',
      key: 'name',
      width: 250,
      render: (_: any, r: ParsedImportRow<CategoryData>) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.data.name}</div>
      ),
    },
    {
      title: 'Mô tả / Ghi chú',
      key: 'description',
      render: (_: any, r: ParsedImportRow<CategoryData>) => r.data.description || '-',
    },
  ];

  return (
    <ExcelImportModal<CategoryData>
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Nhập Nhóm Danh Mục từ Excel (.xlsx, .xls)"
      entityName="nhóm danh mục"
      templateUrl="/templates/Mau_Import_Nhom_Danh_Muc.xlsx"
      templateConfig={{
        fileName: 'Mau_Import_Nhom_Danh_Muc.xlsx',
        headers: ['Mã danh mục', 'Tên nhóm danh mục (*)', 'Mô tả'],
        sampleRows: [['DM_CA', 'Cá biển', 'Các loại cá nước mặn']],
      }}
      instructionTitle="Nhập danh sách nhóm danh mục hải sản một lần"
      instructionSubtitle="Tải file mẫu để điền mã danh mục, tên nhóm và mô tả chi tiết."
      parseAndValidateRow={(r, _, { cleanStr, getFieldVal }) => {
        const errors: string[] = [];
        const rawName = cleanStr(
          getFieldVal(r, ['Tên nhóm danh mục (*)', 'Tên nhóm danh mục', 'Tên danh mục', 'Tên nhóm', 'Name', 'CategoryName'])
        );
        const rawCode = cleanStr(getFieldVal(r, ['Mã danh mục', 'Mã nhóm', 'Code', 'CategoryCode']));
        const description = cleanStr(getFieldVal(r, ['Mô tả', 'Ghi chú', 'Description', 'Note']));

        if (!rawName) {
          errors.push('Tên nhóm danh mục không được để trống.');
        } else if (categories.some((c) => c.name.toLowerCase().trim() === rawName.toLowerCase())) {
          errors.push(`Danh mục "${rawName}" đã tồn tại trong hệ thống.`);
        }

        if (rawCode && categories.some((c) => c.code.toLowerCase().trim() === rawCode.toLowerCase())) {
          errors.push(`Mã "${rawCode}" đã tồn tại trong hệ thống.`);
        }

        return {
          isValid: errors.length === 0,
          errors,
          data: { code: rawCode, name: rawName, description },
        };
      }}
      previewColumns={previewColumns}
      onImport={async (items) => {
        for (const item of items) {
          await addCategory({
            name: item.name,
            code: item.code || generateCodeFromName(item.name),
            description: item.description || '',
          });
        }
      }}
    />
  );
};

export default CategoryImportModal;
