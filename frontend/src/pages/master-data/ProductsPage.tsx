import React, { useState, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
  Select, Space, App, Row, Col, Statistic, Switch, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FireOutlined, SlidersOutlined, DropboxOutlined,
  SunOutlined, BarChartOutlined, CheckCircleOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { Product } from '../../types/seafood';
import { formatCurrency } from '../../utils/format';
import { useProductStore } from '../../stores/useProductStore';
import { useCategoryStore } from '../../stores/useCategoryStore';



const STORAGE_TYPE_CONFIG: Record<Product['storageType'], { label: string; color: string; icon: React.ReactNode; temp: string }> = {
  ALIVE: { label: 'Tươi sống', color: 'green', icon: <SunOutlined />, temp: '18–22°C' },
  FRESH: { label: 'Ướp đá', color: 'cyan', icon: <DropboxOutlined />, temp: '0–4°C' },
  FROZEN: { label: 'Cấp đông', color: 'blue', icon: <FireOutlined />, temp: '≤ -18°C' },
  DRY: { label: 'Khô', color: 'orange', icon: <FileOutlined />, temp: 'Nhiệt độ phòng' },
};


// ─── helpers ───────────────────────────────────────────────────────────────────

const StorageTag: React.FC<{ type: Product['storageType'] }> = ({ type }) => {
  const cfg = STORAGE_TYPE_CONFIG[type];
  return (
    <Tag color={cfg.color} icon={cfg.icon}>
      {cfg.label}
    </Tag>
  );
};

// ─── component ─────────────────────────────────────────────────────────────────

export const ProductsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [storageFilter, setStorageFilter] = useState<Product['storageType'] | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [form] = Form.useForm();

  React.useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // ── statistics ───────────────────────────────────────────────────────────────
  const activeCount = useMemo(() => products.filter(p => p.status === 'ACTIVE').length, [products]);
  const frozenCount = useMemo(() => products.filter(p => p.storageType === 'FROZEN').length, [products]);
  const categoryCount = useMemo(() => new Set(products.map(p => p.categoryId)).size, [products]);

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
      const matchStorage = storageFilter === 'ALL' || p.storageType === storageFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchCategory && matchStorage && matchStatus;
    });
  }, [products, searchQuery, categoryFilter, storageFilter, statusFilter]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE', storageType: 'FROZEN', unit: 'Kg', warningDaysBeforeExpiry: 3 });
    setIsModalOpen(true);
  };

  const openEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue({
      ...record,
      statusSwitch: record.status === 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: Product) => {
    modal.confirm({
      title: 'Xác nhận xóa sản phẩm',
      content: `Bạn có chắc muốn xóa "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        deleteProduct(record.id);
        message.success('Đã xóa sản phẩm thành công!');
      },
    });
  };

  const handleSubmit = (values: any) => {
    const cat = categories.find(c => c.id === values.categoryId || c.code === values.categoryId);
    const productData: Omit<Product, 'id'> = {
      code: (values.code as string).toUpperCase(),
      name: values.name,
      categoryId: values.categoryId,
      categoryName: cat?.name,
      unit: values.unit,
      storageType: values.storageType,
      targetTemperature: values.targetTemperature,
      warningDaysBeforeExpiry: values.warningDaysBeforeExpiry,
      minStock: values.minStock,
      maxStock: values.maxStock,
      referencePrice: values.referencePrice,
      status: values.statusSwitch ? 'ACTIVE' : 'INACTIVE',
      note: values.note,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      message.success('Cập nhật sản phẩm thành công!');
    } else {
      addProduct(productData);
      message.success('Thêm sản phẩm mới thành công!');
    }
    setIsModalOpen(false);
  };

  // ── table columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Mã Hàng',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">{code}</Tag>
      ),
    },
    {
      title: 'Tên Hải Sản',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Product) => (
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{name}</strong>
          {record.categoryName && (
            <div>
              <Tag color="default" className="mt-1 text-xs">{record.categoryName}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại Bảo Quản',
      dataIndex: 'storageType',
      key: 'storageType',
      render: (type: Product['storageType']) => <StorageTag type={type} />,
    },
    {
      title: 'Nhiệt Độ (°C)',
      dataIndex: 'targetTemperature',
      key: 'targetTemperature',
      align: 'right' as const,
      render: (t: number) => (
        <span className={`font-semibold ${t < 0 ? 'text-blue-600' : t < 10 ? 'text-cyan-600' : 'text-orange-500'}`}>
          {t}°C
        </span>
      ),
    },
    {
      title: 'Đơn Vị',
      dataIndex: 'unit',
      key: 'unit',
      align: 'center' as const,
    },
    {
      title: 'Tồn Kho (Min / Max)',
      key: 'stock',
      render: (_: any, record: Product) => (
        <span className="text-sm text-slate-500">
          <span className="text-red-500 font-semibold">{record.minStock}</span>
          {' – '}
          <span className="text-green-600 font-semibold">{record.maxStock}</span>
          {' '}
          {record.unit}
        </span>
      ),
    },
    {
      title: 'Cảnh Báo HSD',
      dataIndex: 'warningDaysBeforeExpiry',
      key: 'warningDaysBeforeExpiry',
      align: 'center' as const,
      render: (d: number) => (
        <Tag color={d <= 2 ? 'red' : d <= 5 ? 'orange' : 'default'}>
          {d} ngày
        </Tag>
      ),
    },
    {
      title: 'Đơn Giá Tham Chiếu',
      dataIndex: 'referencePrice',
      key: 'referencePrice',
      align: 'right' as const,
      render: (p: number) => (
        <span className="font-semibold text-emerald-600">{formatCurrency(p)}</span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: Product['status']) => (
        status === 'ACTIVE'
          ? <Tag color="green" icon={<CheckCircleOutlined />}>Đang hoạt động</Tag>
          : <Tag color="default">Ngừng kinh doanh</Tag>
      ),
    },
    {
      title: 'Hành Động',
      key: 'action',
      width: 100,
      render: (_: any, record: Product) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">
            Danh Mục Hải Sản & Hàng Hóa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý toàn bộ danh mục hải sản, thông số bảo quản và cài đặt mức tồn kho.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={openAdd}
        >
          Thêm Sản Phẩm Mới
        </Button>
      </div>

      {/* ── Statistics Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng danh mục sản phẩm"
              value={products.length}
              prefix={<BarChartOutlined className="text-sky-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Đang hoạt động"
              value={activeCount}
              prefix={<CheckCircleOutlined className="text-green-500 mr-2" />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Hàng cấp đông"
              value={frozenCount}
              prefix={<SlidersOutlined className="text-blue-500 mr-2" />}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Nhóm danh mục"
              value={categoryCount}
              prefix={<DropboxOutlined className="text-purple-500 mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Filter + Table ── */}
      <Card bordered={false} className="shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <Input.Search
            placeholder="Tìm theo tên hoặc mã hàng..."
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            className="w-60"
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-44"
            options={[
              { value: 'ALL', label: 'Tất cả danh mục' },
              ...categories.map(c => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            value={storageFilter}
            onChange={setStorageFilter}
            className="w-40"
            options={[
              { value: 'ALL', label: 'Tất cả bảo quản' },
              ...Object.entries(STORAGE_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-44"
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'INACTIVE', label: 'Ngừng kinh doanh' },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} sản phẩm` }}
          rowClassName={(r) => r.status === 'INACTIVE' ? 'opacity-50' : ''}
          className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* ── Add / Edit Modal ── */}
      <Modal
        title={editingProduct ? `Chỉnh sửa — ${editingProduct.name}` : 'Thêm Sản Phẩm Mới'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingProduct(null); }}
        footer={null}
        destroyOnClose
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
          initialValues={{ statusSwitch: true, storageType: 'FROZEN', unit: 'Kg', warningDaysBeforeExpiry: 3 }}
        >
          {/* Row 1 — Code & Name */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="code"
                label="Mã Hàng"
                rules={[{ required: true, message: 'Nhập mã hàng!' }]}
              >
                <Input placeholder="HS-CA-CAHOI" disabled={!!editingProduct} className="font-mono" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Tên Sản Phẩm"
                rules={[{ required: true, message: 'Nhập tên sản phẩm!' }]}
              >
                <Input placeholder="VD: Cá Hồi Na Uy" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2 — Category, Unit, Storage */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="categoryId"
                label="Danh Mục"
                rules={[{ required: true, message: 'Chọn danh mục!' }]}
              >
                <Select
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Chọn danh mục"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Đơn Vị Tính" rules={[{ required: true, message: 'Nhập đơn vị!' }]}>
                <Input placeholder="Kg / Con / Thùng" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="storageType" label="Loại Bảo Quản" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(STORAGE_TYPE_CONFIG).map(([k, v]) => ({
                    value: k, label: `${v.label} (${v.temp})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3 — Temp, Warning days, Ref price */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="targetTemperature"
                label="Nhiệt Độ Bảo Quản (°C)"
                rules={[{ required: true, message: 'Nhập nhiệt độ!' }]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="-18" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="warningDaysBeforeExpiry"
                label="Cảnh Báo HSD (ngày)"
                rules={[{ required: true, message: 'Nhập số ngày!' }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="referencePrice"
                label="Đơn Giá Tham Chiếu (VNĐ)"
                rules={[{ required: true, message: 'Nhập giá!' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4 — Min/Max stock */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minStock"
                label="Tồn Kho Tối Thiểu"
                rules={[{ required: true, message: 'Nhập mức tối thiểu!' }]}
              >
                <InputNumber min={0} precision={1} style={{ width: '100%' }} addonAfter={<Form.Item name="unit" noStyle><span /></Form.Item>} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxStock"
                label="Tồn Kho Tối Đa"
                rules={[
                  { required: true, message: 'Nhập mức tối đa!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const min = getFieldValue('minStock');
                      if (!value || !min || value >= min) return Promise.resolve();
                      return Promise.reject(new Error('Tối đa phải lớn hơn tối thiểu!'));
                    },
                  }),
                ]}
              >
                <InputNumber min={0} precision={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Note + Status */}
          <Form.Item name="note" label="Ghi Chú">
            <Input.TextArea rows={2} placeholder="Xuất xứ, quy cách đóng gói, lưu ý bảo quản..." />
          </Form.Item>

          <Form.Item name="statusSwitch" label="Trạng Thái Kinh Doanh" valuePropName="checked">
            <Switch
              checkedChildren="Đang hoạt động"
              unCheckedChildren="Ngừng kinh doanh"
            />
          </Form.Item>

          {/* Footer */}
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-3">
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); setEditingProduct(null); }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" icon={editingProduct ? <EditOutlined /> : <PlusOutlined />}>
                {editingProduct ? 'Cập nhật' : 'Thêm sản phẩm'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsPage;
