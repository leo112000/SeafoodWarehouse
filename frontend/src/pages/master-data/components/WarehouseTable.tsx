import React, { useMemo } from 'react';
import { Table, Card, Button, Tag, Space, Pagination } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  FireOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { WarehouseItem } from '@/services/warehouseService';

export interface WarehouseTableProps {
  warehouses: WarehouseItem[];
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
  };
  onPaginationChange: (page: number, pageSize: number) => void;
  onEdit?: (record: WarehouseItem) => void;
  onDelete?: (record: WarehouseItem) => void;
  readonly?: boolean;
}

export const WarehouseTable: React.FC<WarehouseTableProps> = ({
  warehouses,
  loading = false,
  pagination,
  onPaginationChange,
  onEdit,
  onDelete,
  readonly = false,
}) => {
  const columns: ColumnsType<WarehouseItem> = useMemo(
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
        title: 'Mã & Tên kho lạnh',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: WarehouseItem) => (
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-100">{text}</div>
            <div className="text-xs text-sky-600 font-mono font-medium">
              Mã: {record.code || 'N/A'}
            </div>
          </div>
        ),
      },
      {
        title: 'Vị trí / Địa chỉ',
        dataIndex: 'location',
        key: 'location',
        render: (text: string) => (
          <span className="text-gray-600 dark:text-gray-300">
            {text || <span className="text-gray-400 italic">--</span>}
          </span>
        ),
      },
      {
        title: 'Sức chứa (Kg)',
        dataIndex: 'capacityKg',
        key: 'capacityKg',
        align: 'right',
        render: (cap: number) => (
          <strong className="text-blue-600 dark:text-blue-400">
            {(cap || 0).toLocaleString()} kg
          </strong>
        ),
        sorter: (a: WarehouseItem, b: WarehouseItem) => (a.capacityKg || 0) - (b.capacityKg || 0),
      },
      {
        title: 'Nhiệt độ (°C)',
        dataIndex: 'temperatureCelsius',
        key: 'temperatureCelsius',
        align: 'center',
        render: (val: number, record: any) => {
          const temp = val ?? record.temperatureCelcius ?? -18;
          return (
            <Tag color="cyan" icon={<FireOutlined />} className="font-mono font-medium">
              {temp}°C
            </Tag>
          );
        },
      },
      {
        title: 'Ghi chú',
        dataIndex: 'description',
        key: 'description',
        render: (desc: string) => (
          <span className="text-gray-500 text-xs line-clamp-1">{desc || '--'}</span>
        ),
      },
      ...(!readonly && (onEdit || onDelete)
        ? [
            {
              title: 'Thao tác',
              key: 'action',
              width: 110,
              align: 'center' as const,
              render: (_: unknown, record: WarehouseItem) => (
                <Space size="small">
                  {onEdit && (
                    <Button
                      type="text"
                      icon={<EditOutlined className="text-sky-600" />}
                      size="small"
                      onClick={() => onEdit(record)}
                    />
                  )}
                  {onDelete && (
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={() => onDelete(record)}
                    />
                  )}
                </Space>
              ),
            },
          ]
        : []),
    ],
    [pagination.current, pagination.pageSize, onEdit, onDelete, readonly]
  );

  const mobileWarehouses = useMemo(() => {
    if (warehouses.length <= pagination.pageSize) return warehouses;
    return warehouses.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize
    );
  }, [warehouses, pagination.current, pagination.pageSize]);

  return (
    <Card className="shadow-sm rounded-2xl">
      {/* Mobile View: Dạng Card chạm lướt kiểu App */}
      <div className="block sm:hidden space-y-1.5">
        {mobileWarehouses.map(
          (w: WarehouseItem & { temperatureCelcius?: number }, idx: number) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={w.id}
                className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-xs transition-colors ${
                  isEven
                    ? 'bg-slate-100/90 dark:bg-slate-800/90'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <Tag color="blue" className="font-mono font-bold text-xs m-0">
                    {w.code || `KHO-${w.id}`}
                  </Tag>
                  <Tag color="cyan" className="m-0 text-[10px] font-semibold">
                    🌡️ {w.temperatureCelsius ?? w.temperatureCelcius ?? -18}°C
                  </Tag>
                </div>
                {!readonly && (onEdit || onDelete) && (
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-sky-600" />}
                        onClick={() => onEdit(w)}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    )}
                    {onDelete && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(w)}
                        className="h-6 w-6 p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                {w.name}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                <EnvironmentOutlined className="text-sky-500 shrink-0" />
                <span className="truncate">{w.location || 'Khu vực chính'}</span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-gray-400 text-[11px]">Sức chứa tối đa:</div>
                <strong className="text-blue-600 dark:text-blue-400 font-bold">
                  {(w.capacityKg || 10000).toLocaleString()} kg
                </strong>
              </div>
            </div>
          );
        })}

        {warehouses.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">
            Chưa có kho bãi nào
          </div>
        )}

        {warehouses.length > 0 && (
          <div className="flex justify-center pt-1.5">
            <Pagination
              size="small"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={warehouses.length}
              onChange={(page, pageSize) => onPaginationChange(page, pageSize)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View: Bảng đầy đủ cột */}
      <div className="hidden sm:block">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={warehouses}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => onPaginationChange(page, pageSize),
          }}
          scroll={{ x: 750 }}
        />
      </div>
    </Card>
  );
};
