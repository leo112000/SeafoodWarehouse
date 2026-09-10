import React, { useEffect, useState } from 'react';
import { Modal, Button, Tag } from 'antd';
import {
  CloseCircleFilled,
  ReloadOutlined,
  SyncOutlined,
  DownOutlined,
  RightOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useServerStatusStore } from '../../stores/useServerStatusStore';

export const AbpErrorModal: React.FC = () => {
  const {
    isOnline,
    errorStatus,
    errorMessage,
    errorDetails,
    isRecovering,
    checking,
    checkConnection,
    businessError,
    closeBusinessError,
  } = useServerStatusStore();

  const [showServerDetails, setShowServerDetails] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);

  // Tự động kiểm tra định kỳ mỗi 5 giây khi máy chủ đang mất kết nối
  useEffect(() => {
    if (isOnline) return;

    const timer = setInterval(() => {
      checkConnection();
    }, 5000);

    return () => clearInterval(timer);
  }, [isOnline, checkConnection]);

  // Tiêu đề lỗi máy chủ chuẩn ABP
  const getServerTitle = () => {
    if (typeof errorStatus === 'number') {
      return `Lỗi ${errorStatus}: Máy chủ Backend gặp sự cố`;
    }
    return 'Mất kết nối máy chủ (Server Offline)';
  };

  return (
    <>
      {/* 1. Thanh thông báo khôi phục kết nối màu xanh khi máy chủ online trở lại */}
      {isRecovering && (
        <aside
          role="status"
          aria-label="Thông báo khôi phục kết nối"
          className="fixed top-0 left-0 right-0 z-[99999] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white shadow-xl px-4 py-2.5 flex items-center justify-center animate-slideDown border-b border-emerald-400"
        >
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
            <CheckCircleOutlined className="text-lg text-emerald-200" />
            <span>Đã khôi phục kết nối đến máy chủ Backend thành công! Dịch vụ đã sẵn sàng.</span>
          </div>
        </aside>
      )}

      {/* 2. MODAL ABP CHẶN THAO TÁC KHI MÁY CHỦ CHẾT (502, 500, 503, 504, Mất mạng) */}
      <Modal
        open={!isOnline}
        centered
        mask={{ closable: false }}
        keyboard={false}
        closable={false}
        width={540}
        zIndex={99999}
        footer={null}
        styles={{
          mask: {
            backdropFilter: 'blur(5px)',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
          },
          body: {
            padding: '24px 28px',
          },
        }}
      >
        <aside
          role="alertdialog"
          aria-modal="true"
          aria-label="Cảnh báo sự cố máy chủ"
          className="text-center"
        >
          {/* Biểu tượng lỗi ABP */}
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mb-3.5 border-2 border-rose-300 dark:border-rose-800 shadow-sm">
            <CloseCircleFilled className="text-4xl text-rose-600 dark:text-rose-500 animate-pulse" />
          </div>

          {/* Tiêu đề lỗi */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {getServerTitle()}
          </h3>

          {/* Tag trạng thái khóa */}
          <div className="flex justify-center mb-3">
            <Tag color="error" className="px-3 py-1 font-medium text-xs rounded-full flex items-center gap-1.5 shadow-sm">
              <LockOutlined />
              <span>Giao diện đã tạm thời khóa để bảo vệ dữ liệu</span>
            </Tag>
          </div>

          {/* Nội dung thông báo thân thiện */}
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed text-center">
            {errorMessage ||
              'Máy chủ Backend hiện không phản hồi hoặc đang bảo trì. Các thao tác ghi nhận dữ liệu đã được ngưng lại nhằm tránh sai lệch hệ thống.'}
          </p>

          {/* Chi tiết kỹ thuật (Collapsible - chuẩn ABP) */}
          <div className="mb-5 text-left">
            <button
              type="button"
              onClick={() => setShowServerDetails((prev) => !prev)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors mx-auto py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {showServerDetails ? <DownOutlined /> : <RightOutlined />}
              <span>Chi tiết kỹ thuật (Technical Details)</span>
            </button>

            {showServerDetails && (
              <div className="mt-2.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto space-y-1">
                {errorDetails?.statusCode && (
                  <div>
                    <span className="font-bold text-slate-500">Mã lỗi: </span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{errorDetails.statusCode}</span>
                  </div>
                )}
                {errorDetails?.url && (
                  <div>
                    <span className="font-bold text-slate-500">Yêu cầu: </span>
                    <span>{errorDetails.method || 'GET'} {errorDetails.url}</span>
                  </div>
                )}
                {errorDetails?.timestamp && (
                  <div>
                    <span className="font-bold text-slate-500">Thời gian: </span>
                    <span>{errorDetails.timestamp}</span>
                  </div>
                )}
                {errorDetails?.serverMessage && (
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-500">Thông điệp máy chủ: </span>
                    <div className="mt-0.5 text-rose-700 dark:text-rose-300 break-words whitespace-pre-wrap">
                      {errorDetails.serverMessage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nút thao tác dưới chân modal */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="primary"
              danger
              size="large"
              icon={<ReloadOutlined spin={checking} />}
              loading={checking}
              onClick={() => checkConnection()}
              className="w-full sm:w-auto font-semibold px-6 shadow-md"
            >
              {checking ? 'Đang kết nối lại...' : 'Thử kết nối lại ngay'}
            </Button>
            <Button
              size="large"
              icon={<SyncOutlined />}
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto font-medium"
            >
              Tải lại trang (F5)
            </Button>
          </div>
        </aside>
      </Modal>

      {/* 3. MODAL ABP CHO CÁC LỖI KHÁC (400, 403, 500, Ngoại lệ nghiệp vụ - Văng popup có nút OK) */}
      <Modal
        open={Boolean(businessError?.isOpen)}
        centered
        mask={{ closable: true }}
        closable={true}
        onCancel={closeBusinessError}
        width={500}
        zIndex={99990}
        footer={null}
        styles={{
          mask: {
            backdropFilter: 'blur(3px)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          },
          body: {
            padding: '24px',
          },
        }}
      >
        {businessError && (
          <div className="text-center" role="alertdialog">
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center mb-3 border border-rose-300 dark:border-rose-800">
              <CloseCircleFilled className="text-3xl text-rose-600 dark:text-rose-500" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {businessError.title || 'Có lỗi xảy ra!'}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              {businessError.message}
            </p>

            {/* Chi tiết lỗi nghiệp vụ hoặc validation nếu có */}
            {businessError.details && (
              <div className="mb-4 text-left">
                <button
                  type="button"
                  onClick={() => setShowBusinessDetails((prev) => !prev)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors mx-auto py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {showBusinessDetails ? <DownOutlined /> : <RightOutlined />}
                  <span>Chi tiết lỗi</span>
                </button>

                {showBusinessDetails && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 max-h-44 overflow-y-auto space-y-1">
                    {businessError.details.statusCode && (
                      <div>
                        <span className="font-bold text-slate-500">Mã trạng thái: </span>
                        <span>{businessError.details.statusCode}</span>
                      </div>
                    )}
                    {businessError.details.url && (
                      <div>
                        <span className="font-bold text-slate-500">Yêu cầu: </span>
                        <span>{businessError.details.method} {businessError.details.url}</span>
                      </div>
                    )}
                    {businessError.details.validationErrors && businessError.details.validationErrors.length > 0 && (
                      <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-500">Danh sách lỗi dữ liệu:</span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-600 dark:text-rose-400">
                          {businessError.details.validationErrors.map((v, i) => (
                            <li key={i}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="primary"
                size="large"
                onClick={closeBusinessError}
                className="font-semibold px-8 shadow-sm bg-sky-600 hover:bg-sky-500"
              >
                Đồng ý
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
