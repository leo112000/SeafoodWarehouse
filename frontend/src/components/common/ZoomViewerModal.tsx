import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import {
  FullscreenOutlined,
  CloseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { createPortal } from 'react-dom';

export interface ZoomViewerModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode | ((props: { isRotated: boolean; zoomScale: number }) => React.ReactNode);
}

export const ZoomButton: React.FC<{
  onClick: () => void;
  tooltip?: string;
  className?: string;
}> = ({ onClick, tooltip = 'Phóng to toàn màn hình', className }) => (
  <Tooltip title={tooltip}>
    <Button
      type="text"
      size="small"
      icon={<FullscreenOutlined className="text-sky-600 dark:text-sky-400" />}
      onClick={onClick}
      className={`text-gray-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition-all rounded-lg flex items-center gap-1 px-2 h-7 font-medium ${className || ''}`}
    >
      <span className="text-xs hidden xs:inline sm:inline">Zoom</span>
    </Button>
  </Tooltip>
);

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

export const ZoomViewerModal: React.FC<ZoomViewerModalProps> = ({
  open,
  visible,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const isOpen = open ?? visible ?? false;
  const [zoomScale, setZoomScale] = useState(1);
  const [isRotated, setIsRotated] = useState(false);

  // Mặc định luôn quay ngang khi mở trên điện thoại (màn hình dọc)
  useEffect(() => {
    if (!isOpen) return;

    const checkAndSetLandscape = () => {
      // Nếu màn hình đang ở chiều dọc (điện thoại cầm đứng), tự động xoay ngang 90 độ
      const isPortrait = window.innerWidth < window.innerHeight;
      setIsRotated(isPortrait);
    };

    checkAndSetLandscape();
    setZoomScale(1);

    // Thử kích hoạt API xoay màn hình tự động nếu trình duyệt cho phép
    try {
      const orientation = screen?.orientation as ScreenOrientationWithLock | undefined;
      if (orientation?.lock) {
        orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Bỏ qua nếu thiết bị không hỗ trợ
    }

    const handleResize = () => {
      checkAndSetLandscape();
    };
    window.addEventListener('resize', handleResize);

    // Khóa cuộn trang nền khi mở modal
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Nhấn phím Escape để đóng nhanh
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      try {
        const orientation = screen?.orientation as ScreenOrientationWithLock | undefined;
        if (orientation?.unlock) {
          orientation.unlock();
        }
      } catch {
        // Bỏ qua
      }
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.0, +(prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.7, +(prev - 0.15).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isRotated
            ? 'fixed top-1/2 left-1/2 max-w-[100vh] max-h-[100vw] w-[100vh] h-[100vw] -translate-x-1/2 -translate-y-1/2 rotate-90 rounded-none'
            : 'w-full h-full sm:h-[94vh] sm:max-w-6xl sm:rounded-3xl border border-gray-200/80 dark:border-slate-800'
        }`}
        style={{
          transformOrigin: 'center center',
        }}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/50 shrink-0 gap-2">
          {/* Tiêu đề & Chế độ */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <FullscreenOutlined className="text-base" />
            </span>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                {title}
              </div>
              {subtitle && (
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          {/* Thanh Công Cụ: Tỷ Lệ Thu Phóng + Nút Đóng Dễ Thao Tác */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bộ điều khiển thu phóng */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-0.5 border border-gray-200 dark:border-slate-700">
              <Tooltip title="Thu nhỏ">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomOutOutlined />}
                  disabled={zoomScale <= 0.7}
                  onClick={handleZoomOut}
                  className="w-7 h-7 flex items-center justify-center text-xs"
                />
              </Tooltip>
              <Tooltip title="Nhấp để đặt lại 100%">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
              </Tooltip>
              <Tooltip title="Phóng to">
                <Button
                  type="text"
                  size="small"
                  icon={<ZoomInOutlined />}
                  disabled={zoomScale >= 2.0}
                  onClick={handleZoomIn}
                  className="w-7 h-7 flex items-center justify-center text-xs"
                />
              </Tooltip>
            </div>

            {/* Nút Đóng Nổi Bật Dễ Thao Tác */}
            <Tooltip title="Đóng chế độ phóng to (phím Esc)">
              <Button
                danger
                type="primary"
                icon={<CloseOutlined />}
                onClick={onClose}
                size="middle"
                className="bg-rose-500 hover:bg-rose-600 active:scale-95 font-bold text-xs sm:text-sm px-3 sm:px-4 rounded-xl shadow-md flex items-center gap-1 transition-all"
              >
                <span>Đóng</span>
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Khối Nội Dung Chính (Table hoặc Đồ thị) */}
        <div
          className="flex-1 w-full p-2 sm:p-4 overflow-auto min-h-0 bg-white dark:bg-slate-900"
          style={{
            transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
            transformOrigin: 'top left',
            width: zoomScale !== 1 ? `${(100 / zoomScale).toFixed(2)}%` : '100%',
            height: zoomScale !== 1 ? `${(100 / zoomScale).toFixed(2)}%` : '100%',
          }}
        >
          {typeof children === 'function' ? children({ isRotated, zoomScale }) : children}
        </div>
      </div>
    </div>,
    document.body
  );
};
