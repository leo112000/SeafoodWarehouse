import React, { useState, useMemo } from 'react';
import { Modal, Table, Button, Input, Tag, Empty, Pagination } from 'antd';
import {
  FolderOutlined,
  SearchOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { Category, Product } from '@/types/seafood';
import { formatCurrency } from '@/utils/format';

export interface CategoryProductsModalProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  products: Product[];
}

export const CategoryProductsModal: React.FC<CategoryProductsModalProps> = ({
  open,
  onClose,
  category,
  products,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });

  // Reset search and page when opening or changing category
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      setPagination({ current: 1, pageSize: 5 });
    }
  }, [open, category]);

  // Filter products by category and search keyword
  const categoryProducts = useMemo(() => {
    if (!category) return [];
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCategory =
        p.categoryId === category.id ||
        (p.categoryName &&
          p.categoryName.toLowerCase() === category.name.toLowerCase());
      if (!matchCategory) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query)
      );
    });
  }, [products, category, searchQuery]);

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: 'Mã SP',
        dataIndex: 'code',
        key: 'code',
        width: 110,
        render: (code: string) => (
          <span className="font-mono font-bold text-sky-600">{code}</span>
        ),
      },
      {
        title: 'Tên Sản Phẩm',
        dataIndex: 'name',
        key: 'name',
        render: (name: string) => (
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {name}
          </span>
        ),
      },
      {
        title: 'ĐVT',
        dataIndex: 'unit',
        key: 'unit',
        width: 70,
        align: 'center',
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
        align: 'center',
        render: (temp: number) => (
          <span className="font-mono text-xs">
            {temp !== undefined ? `${temp}°C` : '-18°C'}
          </span>
        ),
      },
      {
        title: 'Đơn Giá Tham Chiếu',
        dataIndex: 'referencePrice',
        key: 'referencePrice',
        align: 'right',
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
        align: 'center',
        render: (status: Product['status']) =>
          status === 'ACTIVE' ? (
            <Tag color="green">Hoạt động</Tag>
          ) : (
            <Tag color="default">Ngừng KD</Tag>
          ),
      },
    ],
    []
  );

  return (
    <Modal
      title={
        <div className="flex flex-wrap items-center gap-1.5 pr-6">
          <FolderOutlined className="text-sky-500 text-lg shrink-0" />
          <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
            Sản phẩm nhóm: <span className="text-sky-600">{category?.name}</span>
          </span>
          {category?.code && (
            <Tag color="geekblue" className="font-mono text-xs m-0">
              {category.code}
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 w-full pt-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-500">
            <span>
              Tổng cộng:{' '}
              <strong className="text-sky-600 font-bold text-sm">
                {categoryProducts.length}
              </strong>{' '}
              sản phẩm
            </span>
            {searchQuery && (
              <Tag color="orange" className="m-0 text-[10px]">
                Đang lọc
              </Tag>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onClose} className="flex-1 sm:flex-none">
              Đóng
            </Button>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-500 font-medium truncate"
              onClick={() => {
                onClose();
                navigate('/master-data/products');
              }}
            >
              Quản lý sản phẩm
            </Button>
          </div>
        </div>
      }
      width={900}
      style={{ maxWidth: '95vw' }}
      destroyOnClose
    >
      <div className="mt-3 space-y-3 sm:space-y-4">
        {/* Header Info & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-600 dark:text-slate-300 min-w-0">
            {category?.description ? (
              <span className="line-clamp-2 sm:line-clamp-1">
                <strong className="text-slate-700 dark:text-slate-200">
                  Mô tả:
                </strong>{' '}
                {category.description}
              </span>
            ) : (
              <span className="italic text-gray-400">
                Nhóm danh mục phân loại hải sản
              </span>
            )}
          </div>
          <Input.Search
            placeholder="Tìm theo tên hoặc mã SP..."
            allowClear
            className="w-full sm:w-64 shrink-0"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            prefix={<SearchOutlined className="text-gray-400" />}
          />
        </div>

        {/* Mobile View inside modal */}
        <div className="block sm:hidden space-y-1.5">
          {categoryProducts
            .slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )
            .map((p, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-2xs text-xs space-y-1 transition-colors ${
                    isEven
                      ? 'bg-slate-100/90 dark:bg-slate-800/90'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Tag
                        color="geekblue"
                        className="font-mono font-bold text-xs m-0 shrink-0"
                      >
                        {p.code}
                      </Tag>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </span>
                    </div>
                    <Tag
                      color={p.status === 'ACTIVE' ? 'green' : 'default'}
                      className="m-0 text-[10px] shrink-0 font-medium"
                    >
                      {p.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng KD'}
                    </Tag>
                  </div>

                  <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span>
                      Đơn vị:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {p.unit || 'Kg'}
                      </strong>
                    </span>
                    <div>
                      <span className="text-gray-400 text-[11px] mr-1">
                        Giá tham chiếu:
                      </span>
                      <strong className="text-emerald-600 font-bold">
                        {formatCurrency(p.referencePrice || 0)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}

          {categoryProducts.length === 0 && (
            <div className="text-center py-3 text-gray-400 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Không tìm thấy sản phẩm nào trong nhóm này.
            </div>
          )}

          {categoryProducts.length > 0 && (
            <div className="flex justify-center pt-1.5">
              <Pagination
                size="small"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={categoryProducts.length}
                onChange={(page, pageSize) =>
                  setPagination({ current: page, pageSize })
                }
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Desktop Table inside modal */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            dataSource={categoryProducts}
            rowKey="id"
            size="small"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
              onChange: (page, pageSize) =>
                setPagination({ current: page, pageSize }),
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
      </div>
    </Modal>
  );
};
