import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Input, App } from 'antd';
import { PlusOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { partnerService, type PartnerItem } from '@/services/partnerService';
import { exportToExcel } from '@/utils/exportUtils';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PartnerImportModal, PartnerFormModal } from './modals';
import { PartnerTable } from './components';

export const PartnersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const handleExportExcel = () => {
    if (partners.length === 0) {
      message.warning('Không có dữ liệu nhà cung cấp để xuất.');
      return;
    }
    const cols = [
      { header: 'Mã nhà cung cấp', key: 'code', width: 18 },
      { header: 'Tên nhà cung cấp', key: 'name', width: 35 },
      { header: 'Người liên hệ', key: 'contactPerson', width: 20 },
      { header: 'Số điện thoại', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Địa chỉ', key: 'address', width: 40 },
      { header: 'Mã số thuế', key: 'taxCode', width: 16 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];
    exportToExcel(partners, cols, 'Danh_Sach_Nha_Cung_Cap', 'Nhà cung cấp');
    message.success('Đã xuất file Excel nhà cung cấp thành công!');
  };

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partnerService.getAll('SUPPLIER', search);
      setPartners(data);
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, [search, message]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleOpenModal = (item?: PartnerItem) => {
    setEditingPartner(item || null);
    setModalOpen(true);
  };

  const handleDelete = (partner: PartnerItem) => {
    modal.confirm({
      title: 'Xác nhận xóa nhà cung cấp',
      content: `Bạn có chắc chắn muốn xóa nhà cung cấp "${partner.name}" (${partner.code}) khỏi danh sách?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await partnerService.delete(partner.id);
          message.success('Đã xóa nhà cung cấp thành công.');
          fetchPartners();
        } catch (err: any) {
          message.error(err?.message || 'Không thể xóa thông tin.');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhà Cung Cấp"
        icon={<TeamOutlined className="text-sky-600" />}
        extra={
          <>
            <ExportExcelButton
              size="middle"
              onExport={handleExportExcel}
            />
            <Button
              icon={<UploadOutlined className="text-emerald-600" />}
              size="middle"
              onClick={() => setIsImportModalOpen(true)}
              className="font-medium border-emerald-500 text-emerald-600 hover:text-emerald-500 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
            >
              <span className="hidden sm:inline">Nhập Excel</span>
              <span className="sm:hidden">Nhập</span>
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenModal()}
              size="middle"
            >
              <span className="hidden sm:inline">Thêm Nhà Cung Cấp</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          </>
        }
      />

      <Card className="shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            Danh sách đối tác cung cấp (Tàu cá đánh bắt xa bờ / Vựa thu mua / Hợp tác xã)
          </span>
          <Input.Search
            placeholder="Tìm theo tên tàu, mã hoặc SĐT..."
            allowClear
            onSearch={(val) => {
              setSearch(val);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ maxWidth: 300 }}
          />
        </div>

        <PartnerTable
          partners={partners}
          loading={loading}
          pagination={pagination}
          onPaginationChange={(page, pageSize) => setPagination({ current: page, pageSize })}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      </Card>

      {/* Modal Thêm / Cập nhật Nhà Cung Cấp */}
      <PartnerFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPartner(null);
        }}
        editingPartner={editingPartner}
        onSuccess={() => {
          fetchPartners();
          if (!editingPartner) {
            setPagination((prev) => ({ ...prev, current: 1 }));
          }
        }}
      />

      {/* Modal Import Excel */}
      <PartnerImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchPartners()}
      />
    </div>
  );
};

export default PartnersPage;
