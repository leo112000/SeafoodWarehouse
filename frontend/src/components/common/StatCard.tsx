import React from 'react';
import { Card, Skeleton } from 'antd';

export type StatCardColor =
  | 'sky'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'purple'
  | 'indigo'
  | 'gray';

export interface StatCardProps {
  /** Tiêu đề thống kê (ví dụ: 'Tổng nhóm', 'Tồn kho') */
  title: React.ReactNode;
  /** Giá trị số hoặc chuỗi hiển thị */
  value: React.ReactNode;
  /** Icon biểu tượng */
  icon?: React.ReactNode;
  /** Màu sắc chủ đạo (viền trái, màu số, nền icon) */
  color?: StatCardColor;
  /** Đơn vị kèm theo (ví dụ: 'kg', 'VNĐ', 'loại') */
  suffix?: React.ReactNode;
  /** Tiền tố kèm theo */
  prefix?: React.ReactNode;
  /** Dòng chữ phụ nhỏ bên dưới giá trị */
  subText?: React.ReactNode;
  /** Trạng thái đang tải dữ liệu */
  loading?: boolean;
  /** Tùy biến class bổ sung cho Card */
  className?: string;
  /** Sự kiện click khi bấm vào thẻ */
  onClick?: () => void;
}

const COLOR_MAP: Record<
  StatCardColor,
  { border: string; text: string; iconBg: string; iconText: string }
> = {
  sky: {
    border: 'border-l-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    iconText: 'text-sky-500',
  },
  blue: {
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconText: 'text-blue-500',
  },
  emerald: {
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconText: 'text-emerald-500',
  },
  amber: {
    border: 'border-l-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconText: 'text-amber-500',
  },
  orange: {
    border: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconText: 'text-orange-500',
  },
  rose: {
    border: 'border-l-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconText: 'text-rose-500',
  },
  purple: {
    border: 'border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-50 dark:bg-purple-950/40',
    iconText: 'text-purple-500',
  },
  indigo: {
    border: 'border-l-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    iconText: 'text-indigo-500',
  },
  gray: {
    border: 'border-l-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconText: 'text-gray-500',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'sky',
  suffix,
  prefix,
  subText,
  loading = false,
  className = '',
  onClick,
}) => {
  const styles = COLOR_MAP[color] || COLOR_MAP.sky;

  return (
    <Card
      bordered={false}
      className={`shadow-xs rounded-xl h-full border-l-4 ${styles.border} bg-white dark:bg-slate-900 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${className}`}
      styles={{ body: { padding: '8px 10px' } }}
      onClick={onClick}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
      ) : (
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-tight truncate">
              {title}
            </div>
            <div className={`text-sm sm:text-xl font-black ${styles.text} mt-0.5 truncate flex items-baseline gap-1`}>
              {prefix && <span className="text-xs font-semibold">{prefix}</span>}
              <span>{value}</span>
              {suffix && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{suffix}</span>}
            </div>
            {subText && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {subText}
              </div>
            )}
          </div>
          {icon && (
            <div
              className={`p-1.5 sm:p-2 ${styles.iconBg} rounded-lg ${styles.iconText} shrink-0 hidden sm:flex items-center justify-center text-sm sm:text-base`}
            >
              {icon}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
