import React from 'react';

export interface PageHeaderProps {
  /** Tiêu đề trang */
  title: React.ReactNode;
  /** Mô tả phụ ngắn gọn bên dưới tiêu đề */
  subtitle?: React.ReactNode;
  /** Icon đứng trước tiêu đề */
  icon?: React.ReactNode;
  /** Huy hiệu / Badge hiển thị cạnh tiêu đề */
  badge?: React.ReactNode;
  /** Cụm nút tác vụ bên phải (Xuất Excel, Thêm mới, Nhập Excel, Tải lại...) */
  extra?: React.ReactNode;
  /** Class tùy biến ngoài cùng */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  extra,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg sm:text-xl shrink-0 flex items-center text-sky-600 dark:text-sky-400">{icon}</span>}
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
            {title}
          </h1>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {extra && (
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
          {extra}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
