import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space, App, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined, ShoppingOutlined, CalculatorOutlined, ReloadOutlined, WarningOutlined, PlusCircleOutlined } from '@ant-design/icons';
import type { PackagingType } from '../../types/seafood';
import { packagingService } from '../../services/packagingService';

export const PackagingPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [packagings, setPackagings] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'LOSS'>('ADD');
  const [selectedPkgForAdjust, setSelectedPkgForAdjust] = useState<PackagingType | null>(null);

  const [editingPkg, setEditingPkg] = useState<PackagingType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CONTAINER' | 'CONSUMABLE'>('ALL');
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const fetchPackagings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await packagingService.getAll();
      setPackagings(data);
    } catch {
      message.error('Không thể tải danh sách bao bì.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchPackagings();
  }, [fetchPackagings]);

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
      onOk: async () => {
        try {
          await packagingService.delete(record.id);
          message.success('Đã xóa danh mục bao bì thành công!');
          fetchPackagings();
        } catch {
          message.error('Không thể xóa bao bì.');
        }
      },
    });
  };

  const handleOpenAdjustModal = (pkg?: PackagingType, mode: 'ADD' | 'LOSS' = 'ADD') => {
    setSelectedPkgForAdjust(pkg || packagings[0] || null);
    setAdjustMode(mode);
    adjustForm.resetFields();
    if (pkg) {
      adjustForm.setFieldsValue({ packagingId: pkg.id });
    }
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (values: any) => {
    try {
      const pkgId = Number(values.packagingId || selectedPkgForAdjust?.id);
      const qty = Math.abs(Number(values.quantity || 0));
      const finalQty = adjustMode === 'ADD' ? qty : -qty;

      await packagingService.adjustStock({
        packagingId: pkgId,
        adjustmentQty: finalQty,
        reason: values.reason || (adjustMode === 'ADD' ? 'Nhập bổ sung sọt' : 'Báo hư hỏng / báo mất sọt'),
      });

      message.success(adjustMode === 'ADD' ? 'Đã nhập bổ sung số lượng sọt vào kho!' : 'Đã ghi nhận báo hỏng / báo mất sọt thành công!');
      setIsAdjustModalOpen(false);
      fetchPackagings();
    } catch {
      message.error('Không thể cập nhật số lượng sọt.');
    }
  };

  const handleFormSubmit = async (values: any) => {
    try {
      const payload = {
        code: values.code.toUpperCase(),
        name: values.name,
        category: values.category,
        defaultTareWeight: values.defaultTareWeight,
        unit: values.unit,
        stockQuantity: values.stockQuantity,
        note: values.note,
      };

      if (editingPkg) {
        await packagingService.update(editingPkg.id, payload);
        message.success('Cập nhật danh mục bao bì thành công!');
      } else {
        await packagingService.create(payload);
        message.success('Thêm danh mục bao bì mới thành công!');
      }
      setIsModalOpen(false);
      fetchPackagings();
    } catch {
      message.error('Lỗi khi lưu thông tin bao bì.');
    }
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
      title: 'Mã số',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <span className="font-semibold text-sky-600">{code}</span>,
    },
    {
      title: 'Tên bao bì / sọt',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <Tag color={cat === 'CONTAINER' ? 'blue' : 'orange'}>
          {cat === 'CONTAINER' ? 'Sọt / Khay luân chuyển' : 'Vật tư 1 lần'}
        </Tag>
      ),
    },
    {
      title: 'Bì chuẩn (kg)',
      dataIndex: 'defaultTareWeight',
      key: 'defaultTareWeight',
      render: (val: number) => `${val.toFixed(2)} kg`,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Tồn kho hiện tại',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      render: (qty: number) => (
        <span className={`font-bold ${qty < 20 ? 'text-red-500 font-extrabold' : 'text-emerald-600'}`}>
          {qty.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note?: string) => note || <span className="text-gray-400 italic">--</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: PackagingType) => (
        <Space size="small">
          <Button
            size="small"
            icon={<PlusCircleOutlined className="text-emerald-500" />}
            onClick={() => handleOpenAdjustModal(record, 'ADD')}
            title="Nhập thêm sọt"
          >
            Nhập
          </Button>
          <Button
            size="small"
            danger
            icon={<WarningOutlined />}
            onClick={() => handleOpenAdjustModal(record, 'LOSS')}
            title="Báo hỏng"
          >
            Báo hỏng
          </Button>
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 m-0">Danh Mục Bao Bì & Quản Lý Luồng Sọt</h1>
          <p className="text-gray-500 mt-1">
            Quản lý danh sách các loại sọt nhựa, khay inox, thùng xốp, báo mất/hỏng và nhập bổ sung vỏ sọt.
          </p>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchPackagings} loading={loading}>
            Làm mới
          </Button>
          <Button
            icon={<PlusCircleOutlined className="text-emerald-500" />}
            onClick={() => handleOpenAdjustModal(undefined, 'ADD')}
          >
            Nhập Thêm Sọt
          </Button>
          <Button
            danger
            icon={<WarningOutlined />}
            onClick={() => handleOpenAdjustModal(undefined, 'LOSS')}
          >
            ⚠️ Báo Hỏng / Mất
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            className="bg-sky-500 hover:bg-sky-600 border-none"
          >
            Tạo Loại Bao Bì Mới
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-l-4 border-l-sky-500">
            <Statistic
              title="Tổng loại Bao Bì / Vật Tư"
              value={totalTypes}
              prefix={<InboxOutlined className="text-sky-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <Statistic
              title="Sọt / Khay Luân Chuyển"
              value={containerCount}
              prefix={<ShoppingOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-l-4 border-l-orange-500">
            <Statistic
              title="Vật Tư Dùng 1 Lần"
              value={consumableCount}
              prefix={<CalculatorOutlined className="text-orange-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <Statistic
              title="Tổng Số Lượng Tồn Kho"
              value={totalStock}
              prefix={<InboxOutlined className="text-emerald-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <Space wrap className="w-full md:w-auto">
            <Input.Search
              placeholder="Tìm kiếm mã sọt, tên sọt..."
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              style={{ width: 200 }}
              options={[
                { value: 'ALL', label: 'Tất cả phân loại' },
                { value: 'CONTAINER', label: 'Sọt / Khay luân chuyển' },
                { value: 'CONSUMABLE', label: 'Vật tư 1 lần' },
              ]}
            />
          </Space>
        </div>

        <Table
          dataSource={filteredPackagings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingPkg ? 'Chỉnh sửa thông tin bao bì' : 'Thêm danh mục bao bì mới'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText={editingPkg ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy bỏ"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ category: 'CONTAINER', unit: 'Cái', defaultTareWeight: 1.5, stockQuantity: 100 }}
          className="mt-4"
        >
          <Form.Item
            name="code"
            label="Mã Bao bì / Sọt"
            rules={[{ required: true, message: 'Vui lòng nhập mã!' }]}
          >
            <Input placeholder="VD: SOT-RED, THUNG-30KG" disabled={!!editingPkg} />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên hiển thị"
            rules={[{ required: true, message: 'Vui lòng nhập tên bao bì!' }]}
          >
            <Input placeholder="VD: Sọt nhựa đỏ tiêu chuẩn" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Phân loại"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: 'CONTAINER', label: 'Sọt / Khay luân chuyển' },
                    { value: 'CONSUMABLE', label: 'Vật tư dùng 1 lần' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Đơn vị tính"
                rules={[{ required: true }]}
              >
                <Input placeholder="VD: Cái, Chiếc, Thùng" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="defaultTareWeight"
                label="Trọng lượng bì chuẩn (kg)"
                rules={[{ required: true, message: 'Vui lòng nhập trọng lượng bì!' }]}
              >
                <InputNumber min={0} step={0.1} precision={2} className="w-full" placeholder="1.8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stockQuantity"
                label="Số lượng tồn kho ban đầu"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
              >
                <InputNumber min={0} step={1} className="w-full" placeholder="100" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú sử dụng">
            <Input.TextArea rows={3} placeholder="VD: Dùng đựng cá cơm nhập kho..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Điều Chỉnh Số Lượng Sọt / Báo Hỏng Báo Mất */}
      <Modal
        title={
          <Space>
            {adjustMode === 'ADD' ? <PlusCircleOutlined className="text-emerald-500" /> : <WarningOutlined className="text-red-500" />}
            <span>{adjustMode === 'ADD' ? 'Nhập Bổ Sung Số Lượng Sọt' : 'Ghi Nhận Báo Hỏng / Báo Mất Sọt'}</span>
          </Space>
        }
        open={isAdjustModalOpen}
        onCancel={() => setIsAdjustModalOpen(false)}
        onOk={() => adjustForm.submit()}
        okText={adjustMode === 'ADD' ? 'Cập nhật tăng tồn kho' : 'Cập nhật trừ tồn kho'}
        okButtonProps={{ danger: adjustMode === 'LOSS' }}
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjustSubmit}>
          <Form.Item
            name="packagingId"
            label="Chọn Loại Sọt / Bao Bì"
            rules={[{ required: true, message: 'Vui lòng chọn loại sọt!' }]}
            initialValue={selectedPkgForAdjust?.id}
          >
            <Select
              options={packagings.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code}) - Tồn hiện tại: ${p.stockQuantity} ${p.unit}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label={adjustMode === 'ADD' ? 'Số lượng sọt nhập thêm (+)' : 'Số lượng sọt hỏng / mất (-)'}
            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
          >
            <InputNumber min={1} precision={0} className="w-full" placeholder="VD: 50" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do / Ghi chú chi tiết"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                adjustMode === 'ADD'
                  ? 'VD: Nhập mua bổ sung 50 sọt nhựa đỏ mới từ nhà cung cấp nhựa...'
                  : 'VD: Sọt bị bể nứt trong quá trình bốc xếp cá / Khách mượn làm thất lạc...'
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PackagingPage;
