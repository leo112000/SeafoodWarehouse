import React, { useMemo, useCallback } from 'react';
import { Table, Tag, Button, Space, Tooltip, Pagination } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Category, Product } from '@/types/seafood';
import { formatDate } from '@/utils/format';

export interface CategoryTableProps {
  categories: Category[];
  products?: Product[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  onEdit?: (record: Category) => void;
  onDelete?: (record: Category) => void;
  onViewProducts?: (record: Category) => void;
  showPagination?: boolean;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  products = [],
  loading = false,
  pagination = { current: 1, pageSize: 10 },
  onPaginationChange,
  onEdit,
  onDelete,
  onViewProducts,
  showPagination = true,
}) => {
  const getProductCount = useCallback(
    (category: Category) => {
      const catProducts = products.filter(
        (p) =>
          String(p.categoryId) === String(category.id) ||
          p.categoryId?.toLowerCase() === category.code.toLowerCase() ||
          p.categoryName?.toLowerCase() === category.name.toLowerCase()
      );
      return catProducts.length > 0 ? catProducts.length : category.productCount || 0;
    },
    [products]
  );

  const columns: ColumnsType<Category> = useMemo(
    () => [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center',
      render: (_: unknown, __: unknown, index: number) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã Danh Mục',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">
          {code}
        </Tag>
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
      align: 'center',
      width: 150,
      render: (_: unknown, record: Category) => {
        const count = getProductCount(record);
        return (
          <Tooltip title="Click để xem danh sách sản phẩm thuộc nhóm này">
            <Button
              type="dashed"
              size="small"
              icon={<EyeOutlined />}
              className="cursor-pointer font-semibold border-sky-400 text-sky-700 bg-sky-50 hover:bg-sky-100 hover:border-sky-500 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700"
              onClick={() => onViewProducts?.(record)}
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
      render: (date: string) => (
        <span className="text-xs text-slate-500">{formatDate(date)}</span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Category) => (
        <Space>
          {onEdit && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], [pagination.current, pagination.pageSize, onEdit, onDelete, onViewProducts, getProductCount]);

  const mobileCategories = useMemo(() => {
    if (!showPagination || categories.length <= pagination.pageSize) return categories;
    return categories.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize
    );
  }, [categories, showPagination, pagination.current, pagination.pageSize]);

  return (
    <>
      {/* Mobile View: Dạng Card chạm lướt kiểu App */}
      <div className="block sm:hidden space-y-1.5">
        {mobileCategories.map((c, idx) => {
          const count = getProductCount(c);
          const isEven = idx % 2 === 1;

          return (
            <div
              key={c.id}
              className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-xs transition-colors ${
                isEven
                  ? 'bg-slate-100/90 dark:bg-slate-800/90'
                  : 'bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <Tag color="geekblue" className="font-mono font-bold text-xs m-0">
                    {c.code}
                  </Tag>
                  <span className="text-[11px] text-gray-400">
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined className="text-sky-600" />}
                      onClick={() => onEdit(c)}
                      className="h-6 w-6 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                    />
                  )}
                  {onDelete && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(c)}
                      className="h-6 w-6 p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
                    />
                  )}
                </div>
              </div>

              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                {c.name}
              </div>

              {c.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-1.5">
                  {c.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-gray-400 text-[11px]">Sản phẩm thuộc nhóm:</span>
                <Button
                  type="dashed"
                  size="small"
                  icon={<EyeOutlined />}
                  className="cursor-pointer font-semibold border-sky-400 text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700 text-xs"
                  onClick={() => onViewProducts?.(c)}
                >
                  {count} sản phẩm
                </Button>
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">
            Không tìm thấy nhóm danh mục phù hợp
          </div>
        )}

        {showPagination && categories.length > 0 && onPaginationChange && (
          <div className="flex justify-center pt-1.5">
            <Pagination
              size="small"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={categories.length}
              onChange={(page, pageSize) => onPaginationChange(page, pageSize)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View: Bảng đầy đủ cột */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={
            showPagination && onPaginationChange
              ? {
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '20', '50'],
                  onChange: (page, pageSize) => onPaginationChange(page, pageSize),
                  showTotal: (t) => `Tổng ${t} danh mục`,
                }
              : false
          }
          className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
          scroll={{ x: 800 }}
        />
      </div>
    </>
  );
};
