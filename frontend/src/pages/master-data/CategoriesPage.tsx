import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Button, Input, App,
  Row, Col,
} from 'antd';
import {
  PlusOutlined,
  FolderOutlined, AppstoreOutlined, CalendarOutlined,
  ReloadOutlined, UploadOutlined,
} from '@ant-design/icons';
import type { Category } from '@/types/seafood';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { useProductStore } from '@/stores/useProductStore';
import { exportToExcel } from '@/utils/exportUtils';
import { PageHeader } from '@/components/common/PageHeader';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import {
  CategoryImportModal,
  CategoryFormModal,
  CategoryProductsModal,
} from './modals';
import { CategoryTable } from './components';

export const CategoriesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { categories, loading, fetchCategories, deleteCategory } = useCategoryStore();
  const { products, fetchProducts } = useProductStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // Modal xem danh sách sản phẩm theo danh mục
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    await Promise.all([fetchCategories(), fetchProducts()]);
  }, [fetchCategories, fetchProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── statistics ───────────────────────────────────────────────────────────────
  const totalCategories = categories.length;
  const totalProducts = useMemo(
    () => (products.length > 0 ? products.length : categories.reduce((sum, c) => sum + (c.productCount || 0), 0)),
    [products, categories]
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

  const openProductsModal = (cat: Category) => {
    setSelectedCategoryForProducts(cat);
    setIsProductsModalOpen(true);
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditingCategory(record);
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

  const handleExportExcel = () => {
    if (categories.length === 0) {
      message.warning('Không có dữ liệu danh mục để xuất.');
      return;
    }
    const cols = [
      { header: 'Mã danh mục', key: 'code', width: 18 },
      { header: 'Tên nhóm danh mục', key: 'name', width: 30 },
      { header: 'Mô tả', key: 'description', width: 50 },
      { header: 'Số lượng sản phẩm', key: 'productCount', width: 20 },
    ];
    exportToExcel(categories, cols, 'Danh_Muc_Hai_San_Nhom', 'Nhóm danh mục');
    message.success('Đã xuất file Excel nhóm danh mục thành công!');
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Nhóm Danh Mục"
        icon={<FolderOutlined className="text-sky-600" />}
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
              onClick={openAdd}
              size="middle"
            >
              Thêm Danh Mục
            </Button>
          </>
        }
      />

      {/* ── Statistics Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            className="shadow-sm rounded-2xl border-l-4 border-l-sky-500 transition-all hover:shadow-md"
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Tổng nhóm danh mục</p>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalCategories}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600">
                <FolderOutlined className="text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            className="shadow-sm rounded-2xl border-l-4 border-l-emerald-500 transition-all hover:shadow-md"
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Tổng số sản phẩm</p>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalProducts}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <AppstoreOutlined className="text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            className="shadow-sm rounded-2xl border-l-4 border-l-indigo-500 transition-all hover:shadow-md"
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Tạo mới gần đây (30 ngày)</p>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{recentCount}</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
                <CalendarOutlined className="text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Table Card ── */}
      <Card
        className="shadow-sm rounded-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            Danh sách phân nhóm sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <Input.Search
              placeholder="Tìm theo mã, tên hoặc mô tả..."
              allowClear
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              style={{ maxWidth: 300 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              title="Tải lại dữ liệu"
            />
          </div>
        </div>

        <CategoryTable
          categories={filtered}
          loading={loading}
          pagination={pagination}
          onPaginationChange={(page, pageSize) => setPagination({ current: page, pageSize })}
          onEdit={openEdit}
          onDelete={handleDelete}
          onViewProducts={openProductsModal}
          products={products}
        />
      </Card>

      {/* ── Add / Edit Modal ── */}
      <CategoryFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        onSuccess={() => {
          fetchCategories();
          setPagination((prev) => ({ ...prev, current: 1 }));
        }}
      />

      {/* ── Modal Xem Danh Sách Sản Phẩm Theo Danh Mục ── */}
      <CategoryProductsModal
        open={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setSelectedCategoryForProducts(null);
        }}
        category={selectedCategoryForProducts}
        products={products}
      />

      {/* ── Import Excel Modal ── */}
      <CategoryImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default CategoriesPage;
