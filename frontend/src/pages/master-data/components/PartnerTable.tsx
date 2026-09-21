import React, { useMemo } from 'react';
import { Table, Tag, Button, Space, Pagination } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  NumberOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PartnerItem } from '@/services/partnerService';

export interface PartnerTableProps {
  partners: PartnerItem[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
  };
  onPaginationChange?: (page: number, pageSize: number) => void;
  onEdit?: (record: PartnerItem) => void;
  onDelete?: (record: PartnerItem) => void;
  showPagination?: boolean;
}

export const PartnerTable: React.FC<PartnerTableProps> = ({
  partners,
  loading = false,
  pagination = { current: 1, pageSize: 10 },
  onPaginationChange,
  onEdit,
  onDelete,
  showPagination = true,
}) => {
  const columns: ColumnsType<PartnerItem> = useMemo(
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
      title: 'Mã & Tên Nhà Cung Cấp',
      key: 'name',
      render: (_: unknown, record: PartnerItem) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Tag color="cyan">⚓ Tàu cá / Vựa</Tag>
            {record.name}
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">
            Mã: {record.code}
          </div>
        </div>
      ),
    },
    {
      title: 'Thuyền trưởng / Người liên hệ',
      key: 'contact',
      render: (_: unknown, record: PartnerItem) => (
        <div className="text-xs space-y-1">
          {record.contactPerson && (
            <div className="font-medium text-gray-700 dark:text-gray-200">
              <UserOutlined className="mr-1 text-sky-500" />
              {record.contactPerson}
            </div>
          )}
          {record.phone && (
            <div>
              <PhoneOutlined className="mr-1 text-emerald-500" />
              {record.phone}
            </div>
          )}
          {record.email && (
            <div>
              <MailOutlined className="mr-1 text-blue-500" />
              {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vị trí cầu cảng / Địa chỉ vựa',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <HomeOutlined className="mr-1 text-amber-500" />
          {text || 'Chưa cập nhật'}
        </span>
      ),
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      render: (text: string) =>
        text ? (
          <Tag icon={<NumberOutlined />}>{text}</Tag>
        ) : (
          <span className="text-gray-400 text-xs">N/A</span>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: unknown, record: PartnerItem) => (
        <Space size="small">
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
  ], [pagination.current, pagination.pageSize, onEdit, onDelete]);

  const mobilePartners = useMemo(() => {
    if (partners.length <= pagination.pageSize) return partners;
    return partners.slice(
      (pagination.current - 1) * pagination.pageSize,
      pagination.current * pagination.pageSize
    );
  }, [partners, pagination.current, pagination.pageSize]);

  return (
    <>
      {/* Mobile View: Dạng Card chạm lướt kiểu App */}
      <div className="block sm:hidden space-y-1.5">
        {mobilePartners.map((p, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <div
                key={p.id}
                className={`p-2.5 border border-slate-200 dark:border-slate-800 border-b-2 border-b-sky-500/70 dark:border-b-sky-500 rounded-xl shadow-xs transition-colors ${
                  isEven
                    ? 'bg-slate-100/90 dark:bg-slate-800/90'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5">
                  <Tag color="geekblue" className="font-mono font-bold text-xs m-0">
                    {p.code}
                  </Tag>
                  <Tag color="blue" className="m-0 text-[10px] font-semibold">
                    🚢 Nhà cung cấp
                  </Tag>
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

              <div className="space-y-0.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                {p.phone && (
                  <div className="flex items-center gap-1.5">
                    <PhoneOutlined className="text-emerald-500 text-xs" />
                    <a
                      href={`tel:${p.phone}`}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      {p.phone}
                    </a>
                  </div>
                )}
                {p.address && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <HomeOutlined className="text-sky-500 shrink-0" />
                    <span className="truncate">{p.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[11px] text-gray-400">Trạng thái:</span>
                <Tag
                  color={p.isActive ? 'success' : 'default'}
                  className="m-0 text-[10px] font-semibold"
                >
                  {p.isActive ? 'Đang hợp tác' : 'Tạm ngưng'}
                </Tag>
              </div>
            </div>
          );
        })}

        {partners.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-xs">
            Chưa có nhà cung cấp nào
          </div>
        )}

        {showPagination && partners.length > 0 && onPaginationChange && (
          <div className="flex justify-center pt-1.5">
            <Pagination
              size="small"
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={partners.length}
              onChange={(page, pageSize) => onPaginationChange(page, pageSize)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table
          columns={columns}
          dataSource={partners}
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
          scroll={{ x: 750 }}
        />
      </div>
    </>
  );
};
