import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Modal, Form, Input, Space, App,
  Row, Col, Tooltip, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, AppstoreOutlined, CalendarOutlined,
  ReloadOutlined, SearchOutlined, EyeOutlined, ArrowRightOutlined,
} from '@ant-design/icons';
import type { Category, Product } from '../../types/seafood';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { useProductStore } from '../../stores/useProductStore';
import { formatCurrency } from '../../utils/format';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { ZoomButton, ZoomViewerModal } from '../../components/common/ZoomViewerModal';

// ─── component ─────────────────────────────────────────────────────────────────

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const { products, fetchProducts } = useProductStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [form] = Form.useForm();

  // Modal xem danh sách sản phẩm theo danh mục
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<Category | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productModalPagination, setProductModalPagination] = useState({ current: 1, pageSize: 5 });

  const loadData = useCallback(async () => {
    await Promise.all([fetchCategories(), fetchProducts()]);
  }, [fetchCategories, fetchProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── statistics ───────────────────────────────────────────────────────────────
  const totalCategories = categories.length;
  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + c.productCount, 0),
    [categories]
  );
  const recentCount = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return categories.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
  }, [categories]);

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // ── sản phẩm thuộc danh mục đang chọn ─────────────────────────────────────────
  const categoryProducts = useMemo(() => {
    if (!selectedCategoryForProducts) return [];
    const cat = selectedCategoryForProducts;
    return products.filter((p) => {
      const matchCat =
        String(p.categoryId) === String(cat.id) ||
        p.categoryId?.toLowerCase() === cat.code.toLowerCase() ||
        p.categoryName?.toLowerCase() === cat.name.toLowerCase();
      if (!matchCat) return false;
      if (!productSearchQuery) return true;
      const q = productSearchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.note && p.note.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategoryForProducts, productSearchQuery]);

  const openProductsModal = (cat: Category) => {
    setSelectedCategoryForProducts(cat);
    setProductSearchQuery('');
    setProductModalPagination({ current: 1, pageSize: 5 });
    setIsProductsModalOpen(true);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditingCategory(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: Category) => {
    if (record.productCount > 0) {
      modal.warning({
        title: 'Không thể xóa danh mục',
        content: `Danh mục "${record.name}" đang chứa ${record.productCount} sản phẩm. Vui lòng di chuyển hoặc xóa hết sản phẩm trước khi xóa danh mục.`,
        okText: 'Đã hiểu',
      });
      return;
    }
    modal.confirm({
      title: 'Xác nhận xóa danh mục',
      content: `Bạn có chắc chắn muốn xóa danh mục "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteCategory(record.id);
          message.success('Đã xóa danh mục thành công!');
        } catch {
          message.error('Không thể xóa danh mục.');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        code: (values.code as string).toUpperCase(),
        name: values.name,
        description: values.description,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        message.success('Cập nhật danh mục thành công!');
      } else {
        await addCategory(payload);
        setPagination((prev) => ({ ...prev, current: 1 }));
        message.success('Thêm danh mục mới thành công!');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingCategory(null);
    } catch {
      message.error('Lỗi khi lưu thông tin danh mục.');
    }
  };

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
      title: 'Mã Danh Mục',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">{code}</Tag>
      ),
    },
    {
      title: 'Tên Danh Mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <strong className="text-slate-800 dark:text-slate-200">{name}</strong>
      ),
    },
    {
      title: 'Mô Tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc?: string) =>
        desc ? (
          <span className="text-slate-500">{desc}</span>
        ) : (
          <span className="text-gray-400 italic">--</span>
        ),
    },
    {
      title: 'Số Sản Phẩm',
      dataIndex: 'productCount',
      key: 'productCount',
      align: 'center' as const,
      width: 150,
      render: (_: number, record: Category) => {
        const catProducts = products.filter(
          (p) =>
            String(p.categoryId) === String(record.id) ||
            p.categoryId?.toLowerCase() === record.code.toLowerCase() ||
            p.categoryName?.toLowerCase() === record.name.toLowerCase()
        );
        const count = catProducts.length > 0 ? catProducts.length : (record.productCount || 0);

        return (
          <Tooltip title="Click để xem danh sách sản phẩm thuộc nhóm này">
            <Button
              type="dashed"
              size="small"
              icon={<EyeOutlined />}
              className="cursor-pointer font-semibold border-sky-400 text-sky-700 bg-sky-50 hover:bg-sky-100 hover:border-sky-500 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700"
              onClick={() => openProductsModal(record)}
            >
              {count} sản phẩm
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date: string) => {
        try {
          return new Date(date).toLocaleDateString('vi-VN');
        } catch {
          return '--';
        }
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 100,
      render: (_: any, record: Category) => (
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

  // ── columns cho modal sản phẩm ────────────────────────────────────────────────
  const productModalColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: any, index: number) =>
        (productModalPagination.current - 1) * productModalPagination.pageSize + index + 1,
    },
    {
      title: 'Mã SP',
      dataIndex: 'code',
      key: 'code',
      width: 110,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">{code}</Tag>
      ),
    },
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold text-gray-800 dark:text-gray-100">{text}</span>,
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 70,
      align: 'center' as const,
      render: (unit: string) => <Tag color="default">{unit}</Tag>,
    },
    {
      title: 'Bảo Quản',
      dataIndex: 'storageType',
      key: 'storageType',
      width: 110,
      render: (type: string) => {
        const map: Record<string, { label: string; color: string }> = {
          FROZEN: { label: 'Đông lạnh', color: 'blue' },
          FRESH: { label: 'Tươi sống', color: 'green' },
          ALIVE: { label: 'Sống thở', color: 'cyan' },
          DRY: { label: 'Khô ráo', color: 'orange' },
        };
        const item = map[type] || { label: type, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Nhiệt Độ',
      dataIndex: 'targetTemperature',
      key: 'targetTemperature',
      width: 90,
      align: 'center' as const,
      render: (temp: number) => (
        <span className="font-mono text-xs">{temp !== undefined ? `${temp}°C` : '-18°C'}</span>
      ),
    },
    {
      title: 'Đơn Giá Tham Chiếu',
      dataIndex: 'referencePrice',
      key: 'referencePrice',
      align: 'right' as const,
      width: 150,
      render: (p: number) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(p || 0)}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center' as const,
      render: (status: Product['status']) => (
        status === 'ACTIVE'
          ? <Tag color="green">Hoạt động</Tag>
          : <Tag color="default">Ngừng KD</Tag>
      ),
    },
  ];

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Nhóm Danh Mục
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} size="middle">
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAdd}
            size="middle"
            className="font-medium"
          >
            <span className="hidden sm:inline">Thêm Danh Mục</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </div>
      </div>

      {/* ── Statistics Cards (Gọn gàng, mỏng nhẹ, không bị đẩy chữ trên mobile) ── */}
      <Row gutter={[8, 8]}>
        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-sky-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Tổng nhóm
                </div>
                <div className="text-sm sm:text-xl font-black text-sky-600 mt-0.5 truncate">
                  {totalCategories}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500 shrink-0 hidden sm:flex">
                <FolderOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-emerald-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Sản phẩm
                </div>
                <div className="text-sm sm:text-xl font-black text-emerald-600 mt-0.5 truncate">
                  {totalProducts}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 shrink-0 hidden sm:flex">
                <AppstoreOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-purple-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Mới 30 ngày
                </div>
                <div className="text-sm sm:text-xl font-black text-purple-600 mt-0.5 truncate">
                  {recentCount}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-500 shrink-0 hidden sm:flex">
                <CalendarOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Filter + Table ── */}
      <Card
        bordered={false}
        className="shadow-sm"
        title="Danh sách nhóm danh mục"
        extra={<ZoomButton onClick={() => setIsZoomOpen(true)} />}
      >
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Input.Search
            placeholder="Tìm theo tên hoặc mã danh mục..."
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            className="w-full sm:w-72"
            prefix={<SearchOutlined className="text-gray-400" />}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
            showTotal: (t) => `Tổng ${t} danh mục`,
          }}
          className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
          scroll={{ x: 800 }}
        />
      </Card>

      <ZoomViewerModal
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title="Danh sách nhóm danh mục"
      >
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </ZoomViewerModal>

      {/* ── Add / Edit Modal ── */}
      <Modal
        title={editingCategory ? `Chỉnh sửa — ${editingCategory.name}` : 'Thêm Danh Mục Mới'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingCategory(null); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="Tên Danh Mục"
            rules={[
              { required: true, message: 'Nhập tên danh mục!' },
              { max: 150, message: 'Tối đa 150 ký tự!' },
            ]}
          >
            <Input
              placeholder="VD: Cá Biển, Tôm Sú, Cua Ghẹ..."
              onChange={(e) => {
                if (!editingCategory) {
                  const autoCode = generateCodeFromName(e.target.value);
                  form.setFieldsValue({ code: autoCode });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã Danh Mục (Tự sinh theo tên)"
            rules={[
              { required: true, message: 'Nhập mã danh mục!' },
              { max: 50, message: 'Tối đa 50 ký tự!' },
            ]}
          >
            <Input
              placeholder="Tự động sinh theo tên (VD: CA-BIEN, TOM-SU)"
              disabled={!!editingCategory}
              className="font-mono bg-slate-50 dark:bg-slate-800/60"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô Tả"
            rules={[{ max: 500, message: 'Tối đa 500 ký tự!' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả ngắn về nhóm danh mục này..."
            />
          </Form.Item>

          {/* Footer */}
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-3">
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); setEditingCategory(null); }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={editingCategory ? <EditOutlined /> : <PlusOutlined />}
              >
                {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal Xem Danh Sách Sản Phẩm Theo Danh Mục ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 pr-6">
            <FolderOutlined className="text-sky-500 text-lg" />
            <span>
              Danh Sách Sản Phẩm — <strong className="text-sky-600">{selectedCategoryForProducts?.name}</strong>{' '}
              <Tag color="geekblue" className="font-mono text-xs">{selectedCategoryForProducts?.code}</Tag>
            </span>
          </div>
        }
        open={isProductsModalOpen}
        onCancel={() => {
          setIsProductsModalOpen(false);
          setSelectedCategoryForProducts(null);
        }}
        footer={
          <div className="flex justify-between items-center w-full">
            <span className="text-xs text-gray-500">
              Tổng cộng: <strong>{categoryProducts.length}</strong> sản phẩm
            </span>
            <Space>
              <Button onClick={() => setIsProductsModalOpen(false)}>
                Đóng
              </Button>
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={() => {
                  setIsProductsModalOpen(false);
                  navigate('/master-data/products');
                }}
              >
                Đến trang Quản lý Sản Phẩm
              </Button>
            </Space>
          </div>
        }
        width={900}
        destroyOnClose
      >
        <div className="mt-3 space-y-4">
          {/* Header Info & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {selectedCategoryForProducts?.description ? (
                <span><strong>Mô tả nhóm:</strong> {selectedCategoryForProducts.description}</span>
              ) : (
                <span className="italic">Nhóm danh mục phân loại hải sản</span>
              )}
            </div>
            <Input.Search
              placeholder="Tìm theo tên hoặc mã SP trong nhóm..."
              allowClear
              size="small"
              className="w-64"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              prefix={<SearchOutlined className="text-gray-400" />}
            />
          </div>

          {/* Product Table */}
          <Table
            columns={productModalColumns}
            dataSource={categoryProducts}
            rowKey="id"
            size="small"
            pagination={{
              current: productModalPagination.current,
              pageSize: productModalPagination.pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
              onChange: (page, pageSize) => setProductModalPagination({ current: page, pageSize }),
              showTotal: (t) => `Tổng ${t} SP`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-xs text-gray-500">
                      Chưa có sản phẩm nào thuộc nhóm danh mục này.
                    </span>
                  }
                />
              ),
            }}
            scroll={{ x: 750 }}
            className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
          />
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
