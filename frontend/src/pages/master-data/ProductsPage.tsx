import React, { useState, useMemo } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, InputNumber,
  Select, Space, App, Row, Col, Statistic, Switch, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FireOutlined, SlidersOutlined, DropboxOutlined,
  SunOutlined, BarChartOutlined, CheckCircleOutlined,
  FileOutlined, SearchOutlined, ReloadOutlined,
  FileExcelOutlined, UploadOutlined,
} from '@ant-design/icons';
import type { Product } from '../../types/seafood';
import { formatCurrency } from '../../utils/format';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { useProductStore } from '../../stores/useProductStore';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { QRCodeSVG } from 'qrcode.react';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { exportToExcel } from '../../utils/exportUtils';
import { ProductImportModal } from './ProductImportModal';



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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedProductQr, setSelectedProductQr] = useState<Product | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [storageFilter, setStorageFilter] = useState<Product['storageType'] | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category: 'ALL',
    storage: 'ALL' as Product['storageType'] | 'ALL',
    status: 'ALL' as 'ALL' | 'ACTIVE' | 'INACTIVE',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [form] = Form.useForm();

  React.useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // ── statistics ───────────────────────────────────────────────────────────────
  const activeCount = useMemo(() => products.filter(p => p.status === 'ACTIVE').length, [products]);
  const frozenCount = useMemo(() => products.filter(p => p.storageType === 'FROZEN').length, [products]);
  const categoryCount = useMemo(() => new Set(products.map(p => p.categoryId)).size, [products]);

  // ── filter handlers ─────────────────────────────────────────────────────────
  const handleFilter = () => {
    setAppliedFilters({
      search: searchQuery,
      category: categoryFilter,
      storage: storageFilter,
      status: statusFilter,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setStorageFilter('ALL');
    setStatusFilter('ALL');
    setAppliedFilters({
      search: '',
      category: 'ALL',
      storage: 'ALL',
      status: 'ALL',
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchProducts();
  };

  const handleExportExcel = () => {
    if (products.length === 0) {
      message.warning('Không có dữ liệu sản phẩm để xuất.');
      return;
    }
    const exportColumns = [
      { header: 'Mã sản phẩm', key: 'code', width: 16 },
      { header: 'Tên hải sản', key: 'name', width: 30 },
      { header: 'Danh mục', key: 'categoryName', width: 18 },
      { header: 'Đơn vị tính', key: 'unit', width: 12 },
      {
        header: 'Loại bảo quản',
        key: 'storageType',
        width: 16,
        formatter: (val: any) => STORAGE_TYPE_CONFIG[val as Product['storageType']]?.label || val,
      },
      { header: 'Nhiệt độ (°C)', key: 'targetTemperature', width: 14 },
      { header: 'Tồn tối thiểu', key: 'minStock', width: 14 },
      { header: 'Tồn tối đa', key: 'maxStock', width: 14 },
      {
        header: 'Đơn giá tham chiếu (VNĐ)',
        key: 'referencePrice',
        width: 22,
        formatter: (val: any) => val ?? 0,
      },
      { header: 'Cảnh báo HSD (ngày)', key: 'warningDaysBeforeExpiry', width: 18 },
      {
        header: 'Trạng thái',
        key: 'status',
        width: 16,
        formatter: (val: any) => (val === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng bán'),
      },
      { header: 'Ghi chú', key: 'note', width: 35 },
    ];
    exportToExcel(filtered, exportColumns, 'Danh_Muc_Hai_San', 'Danh sách hải sản');
    message.success('Đã xuất file Excel danh mục hải sản thành công!');
  };

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = appliedFilters.search.trim().toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
      const matchCategory = appliedFilters.category === 'ALL' || p.categoryId === appliedFilters.category;
      const matchStorage = appliedFilters.storage === 'ALL' || p.storageType === appliedFilters.storage;
      const matchStatus = appliedFilters.status === 'ALL' || p.status === appliedFilters.status;
      return matchSearch && matchCategory && matchStorage && matchStatus;
    });
  }, [products, appliedFilters]);

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

  const { isSubmitting, handleSubmit } = useAsyncSubmit(async (values: any) => {
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
      await updateProduct(editingProduct.id, productData);
      message.success('Cập nhật sản phẩm thành công!');
    } else {
      await addProduct(productData);
      setPagination((prev) => ({ ...prev, current: 1 }));
      message.success('Thêm sản phẩm mới thành công!');
    }
    setIsModalOpen(false);
  });

  // ── table columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
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
      title: 'Mã Barcode / QR',
      key: 'qr',
      align: 'center' as const,
      render: (_: any, record: Product) => (
        <Button
          size="small"
          type="dashed"
          className="text-sky-600 border-sky-400 font-mono text-xs hover:bg-sky-50"
          onClick={() => {
            setSelectedProductQr(record);
            setIsQrModalOpen(true);
          }}
        >
          🏷️ Xem Mã ({record.code})
        </Button>
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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
            Danh Mục Hải Sản
          </h1>
        </div>
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            onClick={openAdd}
            className="font-medium"
          >
            <span className="hidden sm:inline">Thêm Sản Phẩm Mới</span>
            <span className="sm:hidden">Thêm mới</span>
          </Button>
        </Space>
      </div>

      {/* ── Statistics Cards (2 cột 1 dòng trên mobile) ── */}
      <Row gutter={[10, 10]}>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="shadow-xs rounded-xl" styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<span className="text-xs">Tổng sản phẩm</span>}
              value={products.length}
              prefix={<BarChartOutlined className="text-sky-500 mr-1" />}
              valueStyle={{ fontSize: '1.25rem', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="shadow-xs rounded-xl" styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<span className="text-xs">Đang hoạt động</span>}
              value={activeCount}
              prefix={<CheckCircleOutlined className="text-green-500 mr-1" />}
              valueStyle={{ color: '#22c55e', fontSize: '1.25rem', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="shadow-xs rounded-xl" styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<span className="text-xs">Hàng cấp đông</span>}
              value={frozenCount}
              prefix={<SlidersOutlined className="text-blue-500 mr-1" />}
              valueStyle={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <Card bordered={false} className="shadow-xs rounded-xl" styles={{ body: { padding: '12px' } }}>
            <Statistic
              title={<span className="text-xs">Nhóm danh mục</span>}
              value={categoryCount}
              prefix={<DropboxOutlined className="text-purple-500 mr-1" />}
              valueStyle={{ fontSize: '1.25rem', fontWeight: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Filter + Table ── */}
      <Card
        bordered={false}
        className="shadow-sm rounded-2xl"
        extra={<ZoomButton onClick={() => setIsZoomed(true)} />}
      >
        {/* Filters: 2 cột trên mobile, dàn ngang trên desktop */}
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 mb-4">
          <Input
            placeholder="Tìm tên / mã hàng..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onPressEnter={handleFilter}
            allowClear
            size="middle"
            className="col-span-2 lg:w-52"
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            showSearch
            optionFilterProp="label"
            size="middle"
            className="col-span-1 lg:w-40"
            options={[
              { value: 'ALL', label: 'Tất cả danh mục' },
              ...categories.map(c => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            value={storageFilter}
            onChange={setStorageFilter}
            showSearch
            optionFilterProp="label"
            size="middle"
            className="col-span-1 lg:w-36"
            options={[
              { value: 'ALL', label: 'Tất cả bảo quản' },
              ...Object.entries(STORAGE_TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            showSearch
            optionFilterProp="label"
            size="middle"
            className="col-span-1 lg:w-36"
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'INACTIVE', label: 'Ngừng bán' },
            ]}
          />
          <div className="col-span-1 flex items-center gap-1.5">
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFilter} size="middle" className="flex-1 font-semibold">
              Lọc
            </Button>
            <Tooltip title="Đặt lại bộ lọc">
              <Button icon={<ReloadOutlined />} onClick={handleReset} size="middle" />
            </Tooltip>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            showTotal: (t) => `Tổng ${t} sản phẩm`,
          }}
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
          {/* Row 1 — Name & Code */}
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Tên Sản Phẩm"
                rules={[{ required: true, message: 'Nhập tên sản phẩm!' }]}
              >
                <Input
                  placeholder="VD: Cá Hồi Na Uy, Tôm Càng Xanh..."
                  onChange={(e) => {
                    if (!editingProduct) {
                      const autoCode = generateCodeFromName(e.target.value, 'SP');
                      form.setFieldsValue({ code: autoCode });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="code"
                label="Mã Hàng (Tự sinh theo tên)"
                rules={[{ required: true, message: 'Nhập mã hàng!' }]}
              >
                <Input
                  placeholder="Tự động sinh (VD: SP-CA-HOI-NA-UY)"
                  disabled={!!editingProduct}
                  className="font-mono bg-slate-50 dark:bg-slate-800/60"
                />
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
                  showSearch
                  optionFilterProp="label"
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
                  showSearch
                  optionFilterProp="label"
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
              <Button disabled={isSubmitting} onClick={() => { setIsModalOpen(false); form.resetFields(); setEditingProduct(null); }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isSubmitting} icon={editingProduct ? <EditOutlined /> : <PlusOutlined />}>
                {isSubmitting ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm sản phẩm')}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal hiển thị và in tem QR của hải sản */}
      <Modal
        title={
          <span className="text-sky-600 font-bold flex items-center gap-2">
            🏷️ Mã QR Hải Sản: {selectedProductQr?.name}
          </span>
        }
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsQrModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" onClick={() => window.print()}>
            In Tem Dán
          </Button>,
        ]}
        width={420}
      >
        {selectedProductQr && (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white p-3 border-2 border-dashed border-sky-400 rounded-lg shadow-sm">
              <div className="font-extrabold text-sm uppercase text-sky-800 mb-1">
                KHO THỦY HẢI SẢN WMS
              </div>
              <div className="text-xs font-bold text-gray-800 mb-2">{selectedProductQr.name}</div>
              <div className="flex justify-center my-2">
                <QRCodeSVG value={selectedProductQr.code} size={150} level="H" />
              </div>
              <div className="font-mono text-sm font-bold text-sky-700 mt-1">MÃ: {selectedProductQr.code}</div>
              <div className="text-[11px] text-gray-500 mt-1">
                Đơn vị: {selectedProductQr.unit} | Bảo quản: {selectedProductQr.storageType}
              </div>
            </div>
            <p className="text-xs text-gray-500 italic mt-3">
              Dùng điện thoại mở mục "Nhập kho" ➜ Bấm "Quét Mã QR" và hướng camera vào mã này để nhận diện tự động!
            </p>
          </div>
        )}
      </Modal>
      {/* Modal Phóng To Bảng Sản Phẩm & Quay Ngang */}
      <ZoomViewerModal
        visible={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="🐟 Danh Mục Sản Phẩm Hải Sản"
        subtitle={`Hiển thị ${filtered.length} sản phẩm chi tiết`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                showTotal: (t) => `Tổng ${t} sản phẩm`,
              }}
              size="middle"
              scroll={{ x: 1000, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
            />
          </div>
        )}
      </ZoomViewerModal>

      {/* ── Modal Nhập Excel ── */}
      <ProductImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => fetchProducts()}
      />
    </div>
  );
};

export default ProductsPage;

