import React, { useEffect, useState } from 'react';
import { Button, App } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useWarehouseStore } from '@/stores/useWarehouseStore';
import { warehouseService, type WarehouseItem } from '@/services/warehouseService';
import { exportToExcel } from '@/utils/exportUtils';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import { PageHeader } from '@/components/common/PageHeader';
import { WarehouseImportModal, WarehouseFormModal } from './modals';
import { WarehouseTable } from './components';

export const WarehousesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { warehouses, loading, fetchWarehouses } = useWarehouseStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<
    (WarehouseItem & { temperatureCelcius?: number }) | null
  >(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const handleExportExcel = () => {
    if (warehouses.length === 0) {
      message.warning('Không có dữ liệu kho bãi để xuất.');
      return;
    }
    const cols = [
      { header: 'Mã kho', key: 'code', width: 18 },
      { header: 'Tên kho lạnh', key: 'name', width: 30 },
      { header: 'Vị trí', key: 'location', width: 35 },
      { header: 'Sức chứa (Kg)', key: 'capacityKg', width: 18 },
      { header: 'Nhiệt độ (°C)', key: 'temperatureCelsius', width: 16 },
      { header: 'Ghi chú', key: 'description', width: 40 },
    ];
    exportToExcel(warehouses, cols, 'Danh_Muc_Kho_Bai', 'Kho bãi');
    message.success('Đã xuất file Excel danh mục kho bãi thành công!');
  };

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleEdit = (record: WarehouseItem) => {
    setEditingWarehouse(record);
    setModalOpen(true);
  };

  const handleDelete = (record: WarehouseItem) => {
    modal.confirm({
      title: 'Xác nhận xóa kho lạnh',
      content: `Bạn có chắc chắn muốn xóa kho "${record.name}" (${record.code || `KHO-${record.id}`})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await warehouseService.delete(String(record.id));
          message.success('Đã xóa kho lạnh thành công');
          fetchWarehouses();
        } catch (err: any) {
          message.error(err?.response?.data?.message || err?.message || 'Không thể xóa kho');
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <PageHeader
        title="Danh Mục Kho Bãi"
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
              onClick={() => {
                setEditingWarehouse(null);
                setModalOpen(true);
              }}
              size="middle"
            >
              Thêm Kho Mới
            </Button>
          </>
        }
      />

      {/* ── Bảng dữ liệu Kho bãi (Hỗ trợ cả Mobile & Desktop) ── */}
      <WarehouseTable
        warehouses={warehouses}
        loading={loading}
        pagination={pagination}
        onPaginationChange={(page, pageSize) => setPagination({ current: page, pageSize })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal Thêm / Cập nhật Kho Lạnh */}
      <WarehouseFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingWarehouse(null);
        }}
        editingWarehouse={editingWarehouse}
        onSuccess={() => {
          fetchWarehouses();
          if (!editingWarehouse) {
            setPagination((prev) => ({ ...prev, current: 1 }));
          }
        }}
      />

      {/* Modal Import Excel */}
      <WarehouseImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchWarehouses()}
      />
    </div>
  );
};

export default WarehousesPage;
