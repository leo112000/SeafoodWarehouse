import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { partnerService, type CreatePartnerDto } from '@/services/partnerService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { ExcelImportModal, type ParsedImportRow } from '@/components/common/ExcelImportModal';

const { Text } = Typography;

interface PartnerData {
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  note?: string;
}

interface PartnerImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PartnerImportModal: React.FC<PartnerImportModalProps> = ({
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
      render: (val: number, r: ParsedImportRow<PartnerData>) => (
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
      title: 'Mã NCC',
      key: 'code',
      width: 130,
      render: (_: any, r: ParsedImportRow<PartnerData>) =>
        r.data.code ? <Tag color="blue">{r.data.code}</Tag> : <Tag className="italic">(Tự sinh)</Tag>,
    },
    {
      title: 'Tên Nhà Cung Cấp / Tàu Cá',
      key: 'name',
      width: 220,
      render: (_: any, r: ParsedImportRow<PartnerData>) => (
        <div className="font-semibold text-slate-800 dark:text-slate-100">{r.data.name}</div>
      ),
    },
    {
      title: 'Người liên hệ',
      key: 'contactPerson',
      width: 150,
      render: (_: any, r: ParsedImportRow<PartnerData>) => r.data.contactPerson || '-',
    },
    {
      title: 'Số điện thoại',
      key: 'phone',
      width: 130,
      render: (_: any, r: ParsedImportRow<PartnerData>) => r.data.phone || '-',
    },
    {
      title: 'Địa chỉ / Cầu cảng',
      key: 'address',
      render: (_: any, r: ParsedImportRow<PartnerData>) => r.data.address || '-',
    },
  ];

  return (
    <ExcelImportModal<PartnerData>
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Nhập Nhà Cung Cấp từ Excel (.xlsx, .xls)"
      entityName="nhà cung cấp"
      templateUrl="/templates/Mau_Import_Nha_Cung_Cap.xlsx"
      templateConfig={{
        fileName: 'Mau_Import_Nha_Cung_Cap.xlsx',
        headers: ['Mã NCC', 'Tên nhà cung cấp / Tàu cá (*)', 'Người liên hệ', 'Số điện thoại', 'Email', 'Địa chỉ / Cảng', 'Mã số thuế', 'Ghi chú'],
        sampleRows: [['NCC_TAU_01', 'Tàu cá Kiên Giang 01', 'Nguyễn Văn A', '0912345678', 'ncc@gmail.com', 'Cảng cá Rạch Giá', '123456789', 'Tàu đánh bắt xa bờ']],
      }}
      instructionTitle="Nhập danh sách tàu cá, vựa thu mua & nhà cung cấp hải sản"
      instructionSubtitle="Tải file mẫu để điền thông tin liên hệ, mã số thuế và vị trí neo đậu chuẩn."
      parseAndValidateRow={(r, _, { cleanStr, getFieldVal }) => {
        const errors: string[] = [];
        const rawName = cleanStr(
          getFieldVal(r, ['Tên nhà cung cấp / Tàu cá (*)', 'Tên nhà cung cấp', 'Tên tàu', 'Tên đối tác', 'Name', 'PartnerName'])
        );
        const rawCode = cleanStr(getFieldVal(r, ['Mã NCC', 'Mã đối tác', 'Mã', 'Code', 'PartnerCode']));
        const contactPerson = cleanStr(getFieldVal(r, ['Người liên hệ', 'Thuyền trưởng', 'ContactPerson', 'Contact']));
        const phone = cleanStr(getFieldVal(r, ['Số điện thoại', 'Điện thoại', 'SĐT', 'Phone']));
        const email = cleanStr(getFieldVal(r, ['Email', 'Hòm thư']));
        const address = cleanStr(getFieldVal(r, ['Địa chỉ / Cảng', 'Địa chỉ', 'Cảng', 'Address']));
        const taxCode = cleanStr(getFieldVal(r, ['Mã số thuế', 'MST', 'TaxCode']));
        const note = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Note']));

        if (!rawName) {
          errors.push('Tên nhà cung cấp không được để trống.');
        }

        return {
          isValid: errors.length === 0,
          errors,
          data: {
            code: rawCode,
            name: rawName,
            contactPerson,
            phone,
            email,
            address,
            taxCode,
            note,
          },
        };
      }}
      previewColumns={previewColumns}
      onImport={async (items) => {
        for (const item of items) {
          const dto: CreatePartnerDto = {
            code: item.code || generateCodeFromName(item.name),
            name: item.name,
            type: 'SUPPLIER',
            contactPerson: item.contactPerson,
            phone: item.phone,
            email: item.email,
            address: item.address,
            taxCode: item.taxCode,
            note: item.note,
            isActive: true,
          };
          await partnerService.create(dto);
        }
      }}
    />
  );
};

export default PartnerImportModal;
