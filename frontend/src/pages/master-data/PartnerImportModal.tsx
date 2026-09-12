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
import { partnerService, type CreatePartnerDto } from '../../services/partnerService';

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedPartnerRow {
  key: string;
  rowIndex: number;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  note?: string;
  isValid: boolean;
  errors: string[];
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
  const { message, notification } = App.useApp();
  const [parsedRows, setParsedRows] = useState<ParsedPartnerRow[]>([]);
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
      link.href = '/templates/Mau_Import_Nha_Cung_Cap.xlsx';
      link.download = 'Mau_Import_Nha_Cung_Cap.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Đã tải xuống file mẫu Nhà Cung Cấp!');
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

        const rows: ParsedPartnerRow[] = rawJson.map((r, index) => {
          const rowIndex = index + 2;
          const errors: string[] = [];

          const rawName = cleanStr(getFieldVal(r, ['Tên nhà cung cấp (*)', 'Tên nhà cung cấp', 'Tên đối tác', 'Name', 'PartnerName']));
          const rawCode = cleanStr(getFieldVal(r, ['Mã nhà cung cấp', 'Mã đối tác', 'Code', 'PartnerCode']));
          const contact = cleanStr(getFieldVal(r, ['Người liên hệ', 'Liên hệ', 'Contact', 'ContactPerson']));
          const phone = cleanStr(getFieldVal(r, ['Số điện thoại', 'Điện thoại', 'Phone', 'SDT']));
          const email = cleanStr(getFieldVal(r, ['Email', 'Thư điện tử']));
          const address = cleanStr(getFieldVal(r, ['Địa chỉ', 'Address']));
          const taxCode = cleanStr(getFieldVal(r, ['Mã số thuế', 'MST', 'TaxCode']));
          const note = cleanStr(getFieldVal(r, ['Ghi chú', 'Mô tả', 'Note']));

          if (!rawName) {
            errors.push('Tên nhà cung cấp không được để trống.');
          }

          const isValid = errors.length === 0;

          return {
            key: `row-${rowIndex}`,
            rowIndex,
            code: rawCode || '',
            name: rawName,
            contactPerson: contact,
            phone,
            email,
            address,
            taxCode,
            note,
            isValid,
            errors,
          };
        });

        setParsedRows(rows);
        message.success(`Đã đọc ${rows.length} dòng nhà cung cấp từ file!`);
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
    const errors: string[] = [];

    for (const r of validRows) {
      try {
        const dto: CreatePartnerDto = {
          code: r.code,
          name: r.name,
          type: 'SUPPLIER',
          contactPerson: r.contactPerson,
          phone: r.phone,
          email: r.email,
          address: r.address,
          taxCode: r.taxCode,
          note: r.note,
          isActive: true,
        };
        await partnerService.create(dto);
        successCount++;
      } catch (err: any) {
        errors.push(`${r.name}: ${err?.message || 'Lỗi lưu'}`);
      }
    }

    notification.success({
      message: 'Nhập Nhà Cung Cấp Thành Công!',
      description: `Đã thêm thành công ${successCount}/${validRows.length} nhà cung cấp vào hệ thống.`,
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
      render: (val: number, r: ParsedPartnerRow) => (
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
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (c: string) => (c ? <Tag color="blue">{c}</Tag> : <Tag className="italic">(Tự sinh)</Tag>),
    },
    {
      title: 'Tên Nhà Cung Cấp',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (n: string, r: ParsedPartnerRow) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{n || <Text type="danger">(Chưa có tên)</Text>}</div>
          {r.note && <div className="text-xs text-gray-400">{r.note}</div>}
        </div>
      ),
    },
    {
      title: 'Người liên hệ',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 140,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 160,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 220,
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      width: 120,
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
          <FileExcelOutlined className="text-emerald-600 text-lg" />
          <span>Nhập Danh Sách Nhà Cung Cấp từ Excel (.xlsx, .xls)</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={1050}
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
              Xác nhận nhập ({validRows.length}) nhà cung cấp
            </Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
              Nhập hàng loạt đối tác / nhà cung cấp từ file Excel
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Tải file Excel mẫu chuẩn đã có sẵn tiêu đề và dữ liệu thực tế để điền danh sách nhanh chóng.
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
              Nhấp hoặc kéo thả file Excel Nhà Cung Cấp vào đây
            </p>
            <p className="ant-upload-hint text-xs text-gray-500">
              Hỗ trợ tệp định dạng .xlsx, .xls, .csv.
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
                message={`Có ${errorRows.length} dòng bị thiếu tên nhà cung cấp và sẽ bị bỏ qua khi nhập.`}
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
              scroll={{ x: 950, y: 320 }}
              className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
              rowClassName={(r) => (!r.isValid ? 'bg-red-50/40' : '')}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
