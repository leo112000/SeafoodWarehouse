import React from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  SunOutlined,
  DropboxOutlined,
  FireOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export type StatusCategory = 'common' | 'storage' | 'transaction' | 'stock' | 'auto';

export interface StatusBadgeProps {
  /** Giá trị trạng thái */
  status: string | boolean | null | undefined;
  /** Nhóm phân loại trạng thái để tự ánh xạ màu & icon */
  category?: StatusCategory;
  /** Tùy biến nhãn hiển thị thay thế */
  text?: React.ReactNode;
  /** Tùy biến màu thẻ Antd (success, warning, error, default, processing hoặc hex) */
  color?: string;
  /** Icon hiển thị */
  icon?: React.ReactNode;
  /** Class tùy biến */
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon?: React.ReactNode;
}

const STATUS_DICTIONARY: Record<string, StatusConfig> = {
  // Trạng thái chung / Entity
  ACTIVE: { label: 'Đang hoạt động', color: 'success', icon: <CheckCircleOutlined /> },
  INACTIVE: { label: 'Ngừng hoạt động', color: 'default', icon: <CloseCircleOutlined /> },
  ENABLED: { label: 'Kích hoạt', color: 'success', icon: <CheckCircleOutlined /> },
  DISABLED: { label: 'Đã khóa', color: 'default', icon: <CloseCircleOutlined /> },
  TRUE: { label: 'Hoạt động', color: 'success', icon: <CheckCircleOutlined /> },
  FALSE: { label: 'Ngừng hoạt động', color: 'default', icon: <CloseCircleOutlined /> },

  // Loại bảo quản hải sản
  ALIVE: { label: 'Tươi sống', color: 'green', icon: <SunOutlined /> },
  FRESH: { label: 'Ướp đá', color: 'cyan', icon: <DropboxOutlined /> },
  FROZEN: { label: 'Cấp đông', color: 'blue', icon: <FireOutlined /> },

  // Giao dịch & Lô hàng
  COMPLETED: { label: 'Hoàn thành', color: 'success', icon: <CheckCircleOutlined /> },
  SUCCESS: { label: 'Thành công', color: 'success', icon: <CheckCircleOutlined /> },
  PENDING: { label: 'Chờ xử lý', color: 'warning', icon: <ClockCircleOutlined /> },
  PROCESSING: { label: 'Đang xử lý', color: 'processing', icon: <SyncOutlined spin /> },
  CANCELLED: { label: 'Đã hủy', color: 'error', icon: <CloseCircleOutlined /> },
  FAILED: { label: 'Thất bại', color: 'error', icon: <CloseCircleOutlined /> },
  DRAFT: { label: 'Bản nháp', color: 'default' },

  // Cảnh báo tồn kho
  SAFE: { label: 'An toàn', color: 'success', icon: <CheckCircleOutlined /> },
  NORMAL: { label: 'Bình thường', color: 'blue' },
  LOW: { label: 'Sắp hết hàng', color: 'warning', icon: <WarningOutlined /> },
  OUT_OF_STOCK: { label: 'Hết hàng', color: 'error', icon: <CloseCircleOutlined /> },
  OVERSTOCK: { label: 'Vượt tồn tối đa', color: 'purple', icon: <WarningOutlined /> },
  EXPIRING_SOON: { label: 'Sắp hết hạn', color: 'volcano', icon: <ClockCircleOutlined /> },
  EXPIRED: { label: 'Đã hết hạn', color: 'red', icon: <CloseCircleOutlined /> },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  color,
  icon,
  className = '',
}) => {
  if (status === null || status === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  const rawKey = String(status).trim().toUpperCase();
  const matched = STATUS_DICTIONARY[rawKey];

  const finalLabel = text ?? matched?.label ?? String(status);
  const finalColor = color ?? matched?.color ?? 'default';
  const finalIcon = icon !== undefined ? icon : matched?.icon;

  return (
    <Tag
      color={finalColor}
      icon={finalIcon}
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium inline-flex items-center gap-1 ${className}`}
    >
      {finalLabel}
    </Tag>
  );
};

export default StatusBadge;
