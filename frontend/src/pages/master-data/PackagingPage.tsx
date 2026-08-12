import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space, App, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined, ShoppingOutlined, CalculatorOutlined, BarChartOutlined } from '@ant-design/icons';
import type { PackagingType } from '../../types/seafood';

export const PackagingPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [packagings, setPackagings] = useState<PackagingType[]>([
    {
      id: 'pkg-1',
      code: 'SOT-RED',
      name: 'Sọt nhựa đỏ tiêu chuẩn',
      category: 'CONTAINER',
      defaultTareWeight: 1.8,
      unit: 'Cái',
      stockQuantity: 120,
      note: 'Dùng đựng cá cơm, cá nục nhập kho',
    },
    {
      id: 'pkg-2',
      code: 'SOT-BLUE',
      name: 'Sọt nhựa xanh dương lớn',
      category: 'CONTAINER',
      defaultTareWeight: 2.2,
      unit: 'Cái',
      stockQuantity: 85,
      note: 'Dành cho hàng mực và bạch tuộc tươi',
    },
    {
      id: 'pkg-3',
      code: 'THUNG-30KG',
      name: 'Thùng xốp lớn 30kg',
      category: 'CONSUMABLE',
      defaultTareWeight: 0.5,
      unit: 'Chiếc',
      stockQuantity: 450,
      note: 'Thùng xốp dùng 1 lần để đóng gói xuất khẩu',
    },
    {
      id: 'pkg-4',
      code: 'THUNG-10KG',
      name: 'Thùng carton chống ẩm 10kg',
      category: 'CONSUMABLE',
      defaultTareWeight: 0.3,
      unit: 'Chiếc',
      stockQuantity: 600,
      note: 'Đóng gói nội địa cá basa fillet',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackagingType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CONTAINER' | 'CONSUMABLE'>('ALL');
  const [form] = Form.useForm();

  // Statistics calculations
  const totalTypes = packagings.length;
  const containerCount = packagings.filter(p => p.category === 'CONTAINER').length;
  const consumableCount = packagings.filter(p => p.category === 'CONSUMABLE').length;
  const totalStock = packagings.reduce((sum, p) => sum + p.stockQuantity, 0);

  const handleOpenAddModal = () => {
    setEditingPkg(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: PackagingType) => {
    setEditingPkg(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      category: record.category,
      defaultTareWeight: record.defaultTareWeight,
      unit: record.unit,
      stockQuantity: record.stockQuantity,
      note: record.note,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: PackagingType) => {
    modal.confirm({
      title: 'Xác nhận xóa bao bì',
      content: `Bạn có chắc chắn muốn xóa danh mục bao bì "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        setPackagings((prev) => prev.filter((p) => p.id !== record.id));
        message.success('Đã xóa danh mục bao bì thành công!');
      },
    });
  };

  const handleFormSubmit = (values: any) => {
    if (editingPkg) {
      // Edit Mode
      setPackagings((prev) =>
        prev.map((p) =>
          p.id === editingPkg.id
            ? {
                ...p,
                code: values.code.toUpperCase(),
                name: values.name,
                category: values.category,
                defaultTareWeight: values.defaultTareWeight,
                unit: values.unit,
                stockQuantity: values.stockQuantity,
                note: values.note,
              }
            : p
        )
      );
      message.success('Cập nhật danh mục bao bì thành công!');
    } else {
      // Add Mode
      const newPkg: PackagingType = {
        id: `pkg-${Math.random().toString(36).substring(2, 9)}`,
        code: values.code.toUpperCase(),
        name: values.name,
        category: values.category,
        defaultTareWeight: values.defaultTareWeight,
        unit: values.unit,
        stockQuantity: values.stockQuantity,
        note: values.note,
      };
      setPackagings((prev) => [...prev, newPkg]);
      message.success('Thêm danh mục bao bì mới thành công!');
    }
    setIsModalOpen(false);
  };

  const filteredPackagings = packagings.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const columns = [
    {
      title: 'Mã Vật Tư',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue" className="font-mono font-semibold">{code}</Tag>,
    },
    {
      title: 'Tên Bao Bì / Vật Tư',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'Phân Loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat: 'CONTAINER' | 'CONSUMABLE') => {
        return cat === 'CONTAINER' ? (
          <Tag color="cyan" icon={<InboxOutlined />}>Vật chứa tái sử dụng</Tag>
        ) : (
          <Tag color="orange" icon={<ShoppingOutlined />}>Vật tư dùng 1 lần</Tag>
        );
      },
    },
    {
      title: 'Bì Tiêu Chuẩn (kg)',
      dataIndex: 'defaultTareWeight',
      key: 'defaultTareWeight',
      render: (w: number) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {w.toFixed(2)} kg
        </span>
      ),
    },
    {
      title: 'Đơn Vị',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Tồn Kho Vật Tư',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      render: (q: number) => <span className="font-bold">{q.toLocaleString()}</span>,
    },
    {
      title: 'Ghi Chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: PackagingType) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Danh Mục Bao Bì & Trọng Lượng Bì
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quản lý các loại sọt nhựa, thùng xốp, thùng carton và cấu hình cân nặng bì tiêu chuẩn phục vụ quy trình cân nhập/xuất kho.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAddModal}
          size="large"
          className="bg-sky-600 hover:bg-sky-500"
        >
          Thêm Bao Bì Mới
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng số loại bao bì"
              value={totalTypes}
              prefix={<BarChartOutlined className="text-sky-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Vật chứa tái sử dụng"
              value={containerCount}
              prefix={<InboxOutlined className="text-cyan-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Vật tư đóng gói dùng 1 lần"
              value={consumableCount}
              prefix={<ShoppingOutlined className="text-orange-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng lượng tồn kho vật tư"
              value={totalStock}
              prefix={<CalculatorOutlined className="text-emerald-500 mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Table & Filters Card */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Input.Search
              placeholder="Tìm theo mã hoặc tên bao bì..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
              allowClear
            />
            <Select
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              className="w-full sm:w-56"
              options={[
                { value: 'ALL', label: 'Tất cả loại bao bì' },
                { value: 'CONTAINER', label: 'Vật chứa tái sử dụng (Sọt nhựa, khay...)' },
                { value: 'CONSUMABLE', label: 'Vật tư dùng 1 lần (Thùng xốp, carton...)' },
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredPackagings}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={editingPkg ? 'Cập Nhật Danh Mục Bao Bì' : 'Thêm Danh Mục Bao Bì Mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            category: 'CONTAINER',
            defaultTareWeight: 0,
            stockQuantity: 0,
            unit: 'Cái',
          }}
          className="mt-4"
        >
          <Form.Item
            name="code"
            label="Mã Vật Tư / Bao Bì"
            rules={[
              { required: true, message: 'Vui lòng nhập mã vật tư!' },
              { pattern: /^[a-zA-Z0-9-_]+$/, message: 'Mã chỉ bao gồm chữ, số, gạch ngang và gạch dưới!' }
            ]}
          >
            <Input placeholder="VD: SOT-RED-01" disabled={!!editingPkg} />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên Bao Bì / Vật Tư"
            rules={[{ required: true, message: 'Vui lòng nhập tên bao bì!' }]}
          >
            <Input placeholder="VD: Sọt nhựa đỏ trung" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Phân Loại Bao Bì"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'CONTAINER', label: 'Vật chứa tái sử dụng' },
                    { value: 'CONSUMABLE', label: 'Vật tư dùng 1 lần' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Đơn Vị Tính"
                rules={[{ required: true, message: 'Vui lòng nhập đơn vị tính!' }]}
              >
                <Input placeholder="VD: Cái, Chiếc, Cuộn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="defaultTareWeight"
                label="Trọng Lượng Bì Tiêu Chuẩn (Kg)"
                rules={[{ required: true, message: 'Vui lòng nhập trọng lượng bì!' }]}
              >
                <InputNumber min={0} step={0.1} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stockQuantity"
                label="Số Lượng Tồn Kho Vật Tư"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
              >
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="note"
            label="Ghi Chú"
          >
            <Input.TextArea rows={3} placeholder="Mô tả hoặc ghi chú lưu trữ..." />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Lưu Danh Mục
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default PackagingPage;
