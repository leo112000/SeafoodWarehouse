import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Space, Button, Pagination } from 'antd';
import {
  PlusCircleOutlined,
  WarningOutlined,
  HistoryOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PackagingType } from '@/types/seafood';

export interface PackagingTableProps {
  packagings: PackagingType[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  onEdit?: (record: PackagingType) => void;
  onDelete?: (record: PackagingType) => void;
  onAdjust?: (record: PackagingType, mode: 'ADD' | 'LOSS') => void;
  onHistory?: (pkgId: number) => void;
  showPagination?: boolean;
}

export const PackagingTable: React.FC<PackagingTableProps> = ({
  packagings,
  loading = false,
  pagination = { current: 1, pageSize: 10 },
  onPaginationChange,
  onEdit,
  onDelete,
  onAdjust,
  onHistory,
  showPagination = true,
}) => {
  const columns: ColumnsType<PackagingType> = useMemo(
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
        title: 'Mã số',
        dataIndex: 'code',
        key: 'code',
        render: (code: string) => (
          <span className="font-semibold text-sky-600">{code}</span>
        ),
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
        title: 'Tồn tại kho',
        dataIndex: 'stockQuantity',
        key: 'stockQuantity',
        align: 'right',
        render: (qty: number, record: PackagingType) => (
          <div>
            <span
              className={`font-bold ${
                qty === 0
                  ? 'text-rose-500 font-extrabold'
                  : qty < 20
                  ? 'text-orange-500 font-semibold'
                  : 'text-emerald-600'
              }`}
            >
              {qty.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 ml-1">{record.unit || 'cái'}</span>
          </div>
        ),
        sorter: (a: PackagingType, b: PackagingType) => a.stockQuantity - b.stockQuantity,
      },
      {
        title: 'Đang cho mượn',
        dataIndex: 'loanedQuantity',
        key: 'loanedQuantity',
        align: 'right',
        render: (_val: number = 0, record: PackagingType) => {
          const loaned = record.loanedQuantity || 0;
          if (loaned <= 0) return <span className="text-gray-400">0</span>;
          return (
            <div>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {loaned.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 ml-1">{record.unit || 'cái'}</span>
            </div>
          );
        },
        sorter: (a: PackagingType, b: PackagingType) =>
          (a.loanedQuantity || 0) - (b.loanedQuantity || 0),
      },
      {
        title: 'Tổng số lượng thật',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        align: 'right',
        render: (_: unknown, record: PackagingType) => {
          const total =
            record.totalQuantity ??
            record.stockQuantity + (record.loanedQuantity || 0);
          return (
            <Tooltip
              title={`Tổng số lượng sở hữu: gồm ${record.stockQuantity.toLocaleString()} tại kho + ${(
                record.loanedQuantity || 0
              ).toLocaleString()} đang cho mượn`}
            >
              <div>
                <span className="font-black text-sky-700 dark:text-sky-400 text-sm">
                  {total.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 ml-1">{record.unit || 'cái'}</span>
              </div>
            </Tooltip>
          );
        },
        sorter: (a: PackagingType, b: PackagingType) =>
          (a.totalQuantity ?? (a.stockQuantity + (a.loanedQuantity || 0))) -
          (b.totalQuantity ?? (b.stockQuantity + (b.loanedQuantity || 0))),
      },
      {
        title: 'Ghi chú',
        dataIndex: 'note',
        key: 'note',
        render: (note?: string) =>
          note || <span className="text-gray-400 italic">--</span>,
      },
      {
        title: 'Thao tác',
        key: 'action',
        render: (_: unknown, record: PackagingType) => (
          <Space size="small">
            {onAdjust && (
              <>
                <Button
                  size="small"
                  icon={<PlusCircleOutlined className="text-emerald-500" />}
                  onClick={() => onAdjust(record, 'ADD')}
                  title="Nhập thêm sọt"
                >
                  Nhập
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<WarningOutlined />}
                  disabled={record.stockQuantity <= 0}
                  onClick={() => onAdjust(record, 'LOSS')}
                  title={
                    record.stockQuantity <= 0
                      ? 'Trong kho không còn sọt nào (Tồn: 0)'
                      : 'Báo hỏng'
                  }
                >
                  Báo hỏng
                </Button>
              </>
            )}
            {onHistory && (
              <Button
                size="small"
                icon={<HistoryOutlined className="text-sky-500" />}
                onClick={() => onHistory(Number(record.id))}
                title="Lịch sử nhập / báo hỏng của loại sọt này"
              />
            )}
            {onEdit && (
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            )}
            {onDelete && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
              />
            )}
          </Space>
        ),
      },
    ],
    [pagination.current, pagination.pageSize, onAdjust, onHistory, onEdit, onDelete]
  );

  return (
    <>
      {/* Mobile View: Dạng Card chạm lướt kiểu App */}
      <div className="block sm:hidden space-y-1.5">
        {(showPagination
          ? packagings.slice(
              (pagination.current - 1) * pagination.pageSize,
              pagination.current * pagination.pageSize
            )
          : packagings
        ).map((pkg, idx) => {
          const isEven = idx % 2 === 1;
          const total =
            pkg.totalQuantity ?? pkg.stockQuantity + (pkg.loanedQuantity || 0);

          return (
            <div
              key={pkg.id}
              className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-xs transition-colors ${
                isEven
                  ? 'bg-slate-100/90 dark:bg-slate-800/90'
                  : 'bg-white dark:bg-slate-900'
              }`}
            >
              {/* Header: Code + Category Tag + Actions */}
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Tag color="geekblue" className="font-mono font-bold text-xs m-0 shrink-0">
                    {pkg.code}
                  </Tag>
                  <Tag
                    color={pkg.category === 'CONTAINER' ? 'blue' : 'orange'}
                    className="m-0 text-[10px] truncate"
                  >
                    {pkg.category === 'CONTAINER' ? 'Sọt luân chuyển' : 'Vật tư 1 lần'}
                  </Tag>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {onAdjust && (
                    <>
                      <Button
                        size="small"
                        type="text"
                        icon={<PlusCircleOutlined className="text-emerald-600 text-xs" />}
                        onClick={() => onAdjust(pkg, 'ADD')}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-emerald-50 rounded"
                        title="Nhập thêm"
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<WarningOutlined className="text-xs" />}
                        disabled={pkg.stockQuantity <= 0}
                        onClick={() => onAdjust(pkg, 'LOSS')}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-rose-50 rounded"
                        title="Báo hỏng"
                      />
                    </>
                  )}
                  {onHistory && (
                    <Button
                      size="small"
                      type="text"
                      icon={<HistoryOutlined className="text-sky-600 text-xs" />}
                      onClick={() => onHistory(Number(pkg.id))}
                      className="h-6 w-6 p-0 flex items-center justify-center hover:bg-sky-50 rounded"
                      title="Lịch sử"
                    />
                  )}
                  {onEdit && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined className="text-slate-600 dark:text-slate-400 text-xs" />}
                      onClick={() => onEdit(pkg)}
                      className="h-6 w-6 p-0 flex items-center justify-center hover:bg-slate-100 rounded"
                    />
                  )}
                  {onDelete && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined className="text-xs" />}
                      onClick={() => onDelete(pkg)}
                      className="h-6 w-6 p-0 flex items-center justify-center hover:bg-rose-50 rounded"
                    />
                  )}
                </div>
              </div>

              {/* Title: Tên bao bì & bì chuẩn */}
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {pkg.name}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                  Bì: <strong className="text-slate-700 dark:text-slate-200">{pkg.defaultTareWeight?.toFixed(2)} kg</strong>
                </div>
              </div>

              {/* Footer: Tồn kho + Đang mượn + Tổng thật */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-gray-500 dark:text-gray-400">
                  Tồn kho:{' '}
                  <strong
                    className={
                      pkg.stockQuantity === 0
                        ? 'text-rose-600 font-bold'
                        : pkg.stockQuantity < 20
                        ? 'text-orange-500 font-semibold'
                        : 'text-emerald-600 font-bold'
                    }
                  >
                    {pkg.stockQuantity.toLocaleString()} {pkg.unit || 'cái'}
                  </strong>
                  {(pkg.loanedQuantity ?? 0) > 0 && (
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 ml-1.5">
                      ({(pkg.loanedQuantity ?? 0).toLocaleString()} mượn)
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-400 mr-1">Tổng:</span>
                  <strong className="text-sky-700 dark:text-sky-400 font-bold">
                    {total.toLocaleString()} {pkg.unit || 'cái'}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}

        {packagings.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">
            Không tìm thấy loại bao bì nào
          </div>
        )}

        {showPagination && packagings.length > 0 && onPaginationChange && (
          <div className="flex justify-center pt-1.5">
            <Pagination
              size="small"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={packagings.length}
              onChange={(page, pageSize) => onPaginationChange(page, pageSize)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table
          dataSource={packagings}
          columns={columns}
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
                }
              : false
          }
          scroll={{ x: 'max-content' }}
        />
      </div>
    </>
  );
};

export default PackagingTable;
