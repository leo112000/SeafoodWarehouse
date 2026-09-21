import React, { useMemo } from 'react';
import { Table, Tag, Button, Space, Tooltip, Pagination } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  SunOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Product } from '@/types/seafood';
import { formatCurrency } from '@/utils/format';
import { StatusBadge } from '@/components/common/StatusBadge';

export const STORAGE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; temp: string }
> = {
  FROZEN: { label: 'Đông lạnh', color: 'blue', icon: <FireOutlined />, temp: '-18°C ~ -25°C' },
  FRESH: { label: 'Ướp đá', color: 'cyan', icon: <SunOutlined />, temp: '0°C ~ 4°C' },
  CHILLED: { label: 'Mát / Chilled', color: 'cyan', icon: <SunOutlined />, temp: '0°C ~ 4°C' },
  DRY: { label: 'Khô ráo', color: 'orange', icon: <ExperimentOutlined />, temp: '15°C ~ 25°C' },
  ALIVE: { label: 'Tươi sống', color: 'green', icon: <FireOutlined />, temp: '18°C ~ 22°C' },
};

const StorageTag: React.FC<{ type: Product['storageType'] }> = ({ type }) => {
  const cfg = STORAGE_TYPE_CONFIG[type] ?? {
    label: type,
    color: 'default',
    icon: null,
    temp: '',
  };
  return (
    <Tooltip title={`Nhiệt độ yêu cầu: ${cfg.temp}`}>
      <Tag icon={cfg.icon} color={cfg.color} className="font-medium">
        {cfg.label}
      </Tag>
    </Tooltip>
  );
};

export interface ProductTableProps {
  products: Product[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  onEdit?: (record: Product) => void;
  onDelete?: (record: Product) => void;
  onViewQr?: (record: Product) => void;
  showPagination?: boolean;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading = false,
  pagination = { current: 1, pageSize: 10 },
  onPaginationChange,
  onEdit,
  onDelete,
  onViewQr,
  showPagination = true,
}) => {
  const columns: ColumnsType<Product> = useMemo(
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
      title: 'Mã Hàng',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">
          {code}
        </Tag>
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
              <Tag color="default" className="mt-1 text-xs">
                {record.categoryName}
              </Tag>
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
      align: 'right',
      render: (t: number) => (
        <span
          className={`font-semibold ${
            t < 0
              ? 'text-blue-600'
              : t < 10
              ? 'text-cyan-600'
              : 'text-orange-500'
          }`}
        >
          {t}°C
        </span>
      ),
    },
    {
      title: 'Đơn Vị',
      dataIndex: 'unit',
      key: 'unit',
      align: 'center',
    },
    {
      title: 'Tồn Kho (Min / Max)',
      key: 'stock',
      render: (_: unknown, record: Product) => (
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
      align: 'center',
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
      align: 'right',
      render: (p: number) => (
        <span className="font-semibold text-emerald-600">
          {formatCurrency(p)}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: Product['status']) => <StatusBadge status={status} />,
    },
    {
      title: 'Mã Barcode / QR',
      key: 'qr',
      align: 'center',
      render: (_: unknown, record: Product) =>
        onViewQr ? (
          <Button
            size="small"
            type="dashed"
            className="text-sky-600 border-sky-400 font-mono text-xs hover:bg-sky-50"
            onClick={() => onViewQr(record)}
          >
            🏷️ Xem Mã ({record.code})
          </Button>
        ) : null,
    },
    {
      title: 'Hành Động',
      key: 'action',
      width: 100,
      render: (_: unknown, record: Product) => (
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
  ], [pagination.current, pagination.pageSize, onEdit, onDelete, onViewQr]);

  const mobileProducts = useMemo(() => {
    if (products.length <= pagination.pageSize) return products;
    return products.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize
    );
  }, [products, pagination.current, pagination.pageSize]);

  return (
    <>
      {/* Mobile View: Dạng Card chạm lướt kiểu App */}
      <div className="block sm:hidden space-y-1.5">
        {mobileProducts.map((p, idx) => {
          const storageCfg =
            STORAGE_TYPE_CONFIG[p.storageType] || {
              label: p.storageType,
              color: 'default',
            };
            const isEven = idx % 2 === 1;
            return (
              <div
                key={p.id}
                className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-xs transition-colors ${
                  isEven
                    ? 'bg-slate-100/90 dark:bg-slate-800/90'
                    : 'bg-white dark:bg-slate-900'
                } ${p.status === 'INACTIVE' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Tag color="geekblue" className="font-mono font-bold text-xs m-0">
                      {p.code}
                    </Tag>
                    <StatusBadge status={p.status} className="m-0 text-[10px]" />
                  </div>
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-sky-600" />}
                        onClick={() => onEdit(p)}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    )}
                    {onDelete && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(p)}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    )}
                  </div>
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                  {p.name}
                </div>

                <div className="flex flex-wrap items-center gap-1 text-xs mb-1.5">
                  <Tag color={storageCfg.color} className="m-0 text-[10px] leading-4 px-1.5 py-0">
                    {storageCfg.label}
                  </Tag>
                  {p.categoryName && (
                    <Tag className="m-0 text-[10px] leading-4 px-1.5 py-0 text-gray-500 bg-gray-50 dark:bg-slate-800">
                      📁 {p.categoryName}
                    </Tag>
                  )}
                  {p.targetTemperature !== undefined &&
                    p.targetTemperature !== null && (
                      <span className="text-gray-400 text-[10px]">
                        🌡️{' '}
                        {p.targetTemperature > 0
                          ? `+${p.targetTemperature}`
                          : p.targetTemperature}
                        °C
                      </span>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                    Đơn vị:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {p.unit || 'Kg'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-[11px] mr-1">
                      Giá tham chiếu:
                    </span>
                    <strong className="text-emerald-600 font-bold text-xs">
                      {formatCurrency(p.referencePrice || 0)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}

        {products.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">
            Không tìm thấy sản phẩm nào
          </div>
        )}

        {showPagination && products.length > 0 && onPaginationChange && (
          <div className="flex justify-center pt-1.5">
            <Pagination
              size="small"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={products.length}
              onChange={(page, pageSize) => onPaginationChange(page, pageSize)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={products}
          loading={loading}
          pagination={
            showPagination && onPaginationChange
              ? {
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: products.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  onChange: (page, pageSize) => onPaginationChange(page, pageSize),
                }
              : false
          }
          scroll={{ x: 1200 }}
        />
      </div>
    </>
  );
};
