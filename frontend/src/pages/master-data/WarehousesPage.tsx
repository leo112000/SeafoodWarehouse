import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Modal, Form, Input, InputNumber, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined, FireOutlined } from '@ant-design/icons';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { warehouseService, type WarehouseItem } from '../../services/warehouseService';

export const WarehousesPage: React.FC = () => {
  const { warehouses, loading, fetchWarehouses } = useWarehouseStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [form] = Form.useForm();

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
        message.success('Tạo mới kho lạnh thành công');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingId(null);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      location: record.location,
      capacityKg: record.capacityKg,
      temperatureCelcius: record.temperatureCelcius,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      await warehouseService.delete(String(id));
      message.success('Đã xóa kho lạnh');
      fetchWarehouses();
    } catch (err) {
      message.error('Không thể xóa kho');
    }
  };

  const columns = [
    {
      title: 'Tên kho lạnh',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold text-gray-800 dark:text-gray-100">{text}</span>,
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
      render: (val: number) => (
        <Tag icon={<FireOutlined />} color="cyan">{val !== undefined ? `${val}°C` : '-18°C'}</Tag>
      ),
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
    <div className="space-y-6">
      <Card
        title="❄️ Danh Mục Kho Bãi & Kho Lạnh"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
            Thêm Kho Lạnh Mới
          </Button>
        }
        className="shadow-sm"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={warehouses}
          loading={loading}
          pagination={{ pageSize: 10 }}
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
            <Input placeholder="Ví dụ: Kho Lạnh Cảng Cá A1" />
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
        </Form>
      </Modal>
    </div>
  );
};

export default WarehousesPage;
