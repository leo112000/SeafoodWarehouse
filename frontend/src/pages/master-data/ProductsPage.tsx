import React, { useState, useMemo } from 'react';
import {
  Card, Button, Input,
  Select, App, Row, Col, Statistic, Tooltip,
} from 'antd';
import {
  PlusOutlined, SlidersOutlined,
  BarChartOutlined, CheckCircleOutlined,
  SearchOutlined, ReloadOutlined,
  UploadOutlined, DropboxOutlined,
} from '@ant-design/icons';
import type { Product } from '@/types/seafood';
import { useProductStore } from '@/stores/useProductStore';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { exportToExcel } from '@/utils/exportUtils';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import { PageHeader } from '@/components/common/PageHeader';
import {
  ProductImportModal,
  ProductFormModal,
  ProductQrModal,
} from './modals';
import { ProductTable, STORAGE_TYPE_CONFIG } from './components';

// ─── component ─────────────────────────────────────────────────────────────────

export const ProductsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { products, fetchProducts, deleteProduct } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedProductQr, setSelectedProductQr] = useState<Product | null>(null);
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
    setIsModalOpen(true);
  };

  const openEdit = (record: Product) => {
    setEditingProduct(record);
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



  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <PageHeader
        title="Danh Mục Hải Sản"
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
              size="middle"
              onClick={openAdd}
              className="bg-sky-600 hover:bg-sky-500 font-medium"
            >
              <span className="hidden sm:inline">Thêm Sản Phẩm Mới</span>
              <span className="sm:hidden">Thêm mới</span>
            </Button>
          </>
        }
      />

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

        <ProductTable
          products={filtered}
          pagination={pagination}
          onPaginationChange={(page, pageSize) => setPagination({ current: page, pageSize })}
          onEdit={openEdit}
          onDelete={handleDelete}
          onViewQr={(record) => {
            setSelectedProductQr(record);
            setIsQrModalOpen(true);
          }}
        />
      </Card>

      {/* ── Add / Edit Modal ── */}
      <ProductFormModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        editingProduct={editingProduct}
        categories={categories}
        onSuccess={() => { fetchProducts(); setPagination((prev) => ({ ...prev, current: 1 })); }}
      />

      {/* ── QR Modal ── */}
      <ProductQrModal
        open={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        product={selectedProductQr}
      />

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
