import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Modal, Form, Input, InputNumber, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, FireOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { warehouseService, type WarehouseItem } from '../../services/warehouseService';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';
import { exportToExcel } from '../../utils/exportUtils';
import { WarehouseImportModal } from './WarehouseImportModal';

export const WarehousesPage: React.FC = () => {
  const { warehouses, loading, fetchWarehouses } = useWarehouseStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [form] = Form.useForm();

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
  }, []);

  const handleCreateOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await warehouseService.update(String(editingId), values);
        message.success('Cập nhật kho lạnh thành công');
      } else {
        await warehouseService.create(values as Omit<WarehouseItem, 'id'>);
        setPagination((prev) => ({ ...prev, current: 1 }));
        message.success('Tạo mới kho lạnh thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchWarehouses();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu kho.');
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      location: record.location,
      capacityKg: record.capacityKg,
      temperatureCelcius: record.temperatureCelsius ?? record.temperatureCelcius ?? -18,
      description: record.description || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await warehouseService.delete(String(id));
      message.success('Đã xóa kho lạnh');
      fetchWarehouses();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Không thể xóa kho');
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã & Tên kho lạnh',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <div className="font-semibold text-gray-800 dark:text-gray-100">{text}</div>
          <div className="text-xs text-sky-600 font-mono font-medium">Mã: {record.code || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Vị trí / Địa chỉ',
      dataIndex: 'location',
      key: 'location',
      render: (text: string) => (
        <span><EnvironmentOutlined className="mr-1 text-sky-500" />{text || 'Khu vực chính'}</span>
      ),
    },
    {
      title: 'Sức chứa tối đa (kg)',
      dataIndex: 'capacityKg',
      key: 'capacityKg',
      render: (val: number) => <Tag color="blue">{val?.toLocaleString() || '10,000'} kg</Tag>,
    },
    {
      title: 'Nhiệt độ tiêu chuẩn (°C)',
      dataIndex: 'temperatureCelcius',
      key: 'temperatureCelcius',
      render: (val: number, record: any) => {
        const temp = val ?? record.temperatureCelsius ?? -18;
        return <Tag icon={<FireOutlined />} color="cyan">{temp}°C</Tag>;
      },
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => {
        return text ? (
          <span className="text-gray-600 dark:text-gray-300 text-xs">{text}</span>
        ) : (
          <span className="text-gray-400 text-xs italic">Không có</span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa kho lạnh này?"
            description="Bạn có chắc chắn muốn xóa kho lạnh này không?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Danh Mục Kho Bãi
        </h1>
        <Space wrap className="flex-shrink-0">
          <Button
            icon={<FileExcelOutlined className="text-emerald-600" />}
            size="middle"
            onClick={handleExportExcel}
            className="font-medium hover:border-emerald-500 hover:text-emerald-600"
          >
            <span className="hidden sm:inline">Xuất Excel</span>
            <span className="sm:hidden">Xuất</span>
          </Button>
          <Button
            icon={<UploadOutlined className="text-emerald-600" />}
            size="middle"
            onClick={() => setIsImportModalOpen(true)}
            className="font-medium border-emerald-500 text-emerald-600 hover:text-emerald-500 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            <span className="hidden sm:inline">Nhập Excel</span>
            <span className="sm:hidden">Nhập</span>
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }} size="middle">
            Thêm Kho Mới
          </Button>
        </Space>
      </div>

      <Card
        extra={<ZoomButton onClick={() => setIsZoomed(true)} />}
        className="shadow-sm rounded-2xl"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={warehouses}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 750 }}
        />
      </Card>

      <Modal
        title={editingId ? 'Cập Nhật Kho Lạnh' : 'Thêm Mới Kho Lạnh'}
        open={modalOpen}
        onOk={handleCreateOrUpdate}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); }}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên kho lạnh" rules={[{ required: true, message: 'Vui lòng nhập tên kho' }]}>
            <Input
              placeholder="Ví dụ: Kho Lạnh Cảng Cá A1"
              onChange={(e) => {
                if (!editingId) {
                  const autoCode = generateCodeFromName(e.target.value, 'KHO');
                  form.setFieldsValue({ code: autoCode });
                }
              }}
            />
          </Form.Item>
          <Form.Item name="code" label="Mã kho lạnh (Tự sinh theo tên)">
            <Input placeholder="Tự động sinh theo tên (VD: KHO-CANG-CA-A1)" className="font-mono bg-slate-50 dark:bg-slate-800/60" />
          </Form.Item>
          <Form.Item name="location" label="Vị trí / Khu vực">
            <Input placeholder="Ví dụ: Khung A, Khu vực bến cảng" />
          </Form.Item>
          <Form.Item name="capacityKg" label="Sức chứa tối đa (kg)">
            <InputNumber className="w-full" min={1} placeholder="Ví dụ: 50000" />
          </Form.Item>
          <Form.Item name="temperatureCelcius" label="Nhiệt độ bảo quản (°C)">
            <InputNumber className="w-full" placeholder="Ví dụ: -18" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả kho lạnh">
            <Input.TextArea rows={3} placeholder="Ví dụ: Kho chuyên bảo quản tôm cá xuất khẩu, dàn lạnh Nhật Bản công suất cao..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Phóng To Bảng Kho Lạnh & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="❄️ Danh Mục Kho Bãi & Kho Lạnh"
        subtitle={`Hiển thị ${warehouses.length} kho lạnh trong hệ thống`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={warehouses}
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              scroll={{ x: 850, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              size="middle"
            />
          </div>
        )}
      </ZoomViewerModal>

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

