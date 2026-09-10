import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Row, Col, Alert, Space, Button, App, Statistic } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { batchService, type FefoBatch } from '../../services/batchService';
import { productService } from '../../services/productService';
import { settingService, type SystemSetting } from '../../services/settingService';
import type { Product } from '../../types/seafood';
import { formatWeight } from '../../utils/format';
import dayjs from 'dayjs';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

export const AlertsPage: React.FC = () => {
  const { message } = App.useApp();
  const [fefoBatches, setFefoBatches] = useState<FefoBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zoomAlert, setZoomAlert] = useState<'expiry' | 'lowStock' | null>(null);
  const [settings, setSettings] = useState<SystemSetting>({
    expiringAlertDays: 15,
    tempDeviationThreshold: 3.0,
    defaultSeafoodPrice: 250000,
    autoRefreshIntervalSeconds: 30,
    lowStockWarningPercent: 100,
  });
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAlertData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesData, productsData, settingsData] = await Promise.all([
        batchService.getFefo(),
        productService.getAll(),
        settingService.getSettings(),
      ]);

      setFefoBatches(batchesData || []);
      setProducts(productsData || []);
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch {
      message.error('Không thể tải dữ liệu cảnh báo từ hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchAlertData();
  }, [fetchAlertData]);

  // 1. Tính toán Cảnh báo Hạn Sử Dụng từ Lô Hàng Thực trong CSDL theo Cài đặt hệ thống
  const today = dayjs();
  const expiryAlertDays = settings.expiringAlertDays || 15;
  const expiryAlerts = fefoBatches
    .filter((b) => (b.quantity || 0) > 0 && b.expiryDate)
    .map((b) => {
      const expiry = dayjs(b.expiryDate);
      const daysLeft = expiry.diff(today, 'day');
      return { ...b, daysLeft };
    })
    .filter((b) => b.daysLeft >= 0 && b.daysLeft <= expiryAlertDays) // Cảnh báo các lô cận date còn tồn kho theo Cài đặt hệ thống
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 2. Tính toán Cảnh báo Trữ Lượng Tồn Kho Thấp từ Sản Phẩm Thực trong CSDL
  const lowStockAlerts = products
    .filter((p) => p.status === 'ACTIVE' && p.minStock > 0)
    .map((p) => {
      // Tổng lượng tồn thực của sản phẩm từ các lô
      const totalStockInBatches = fefoBatches
        .filter((b) => b.productCode === p.code || b.productName === p.name)
        .reduce((sum, b) => sum + (b.quantity || 0), 0);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        currentStock: totalStockInBatches,
        minStock: p.minStock,
        isLow: totalStockInBatches < p.minStock,
      };
    })
    .filter((item) => item.isLow);

  // Table Columns Definition (Gộp Cột Gọn Gàng)
  const expiryColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Lô Hàng / Sản Phẩm',
      key: 'batchProduct',
      render: (_: any, record: FefoBatch) => (
        <div>
          <div className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">{record.productName}</div>
          <div className="font-mono text-xs text-sky-600 font-bold">{record.batchCode}</div>
        </div>
      ),
    },
    {
      title: 'Hạn Dùng / Còn Lại',
      key: 'expiryInfo',
      render: (_: any, record: any) => {
        const days = record.daysLeft;
        let color = 'red';
        let label = 'Nguy cấp';
        if (days > 3 && days <= 7) {
          color = 'orange';
          label = 'Cảnh báo';
        } else if (days > 7) {
          color = 'gold';
          label = 'Lưu ý';
        }
        return (
          <div>
            <div className="text-xs text-gray-500">{record.expiryDate}</div>
            <Tag color={color} className="font-bold text-[11px] mt-0.5 border-0">
              {days <= 0 ? 'ĐÃ HẾT HẠN!' : `${days} ngày (${label})`}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Số Lượng Tồn Lô',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200">
          {formatWeight(val)}
        </span>
      ),
    },
  ];

  const lowStockColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Mã & Tên Hải Sản',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <span className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">{name}</span>
          <div className="text-xs text-gray-400 font-mono">{record.code}</div>
        </div>
      ),
    },
    {
      title: 'Tồn Kho / Định Mức',
      key: 'stockDeficit',
      align: 'right' as const,
      render: (_: any, record: any) => {
        const deficit = Math.max(0, record.minStock - record.currentStock);
        return (
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <span className="text-red-500 font-black text-xs sm:text-sm">{record.currentStock}</span>
              <span className="text-gray-400 text-xs">/ {record.minStock} {record.unit}</span>
            </div>
            <Tag color="volcano" className="mt-0.5 text-[11px] border-0 mr-0">
              Thiếu {deficit} {record.unit}
            </Tag>
          </div>
        );
      },
    },
  ];

  const hasAlerts = expiryAlerts.length > 0 || lowStockAlerts.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">Hệ Thống Cảnh Báo</h1>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchAlertData} loading={loading} size="middle">
          Làm mới
        </Button>
      </div>

      {/* ── Statistics Cards (2 thẻ chia đều cân đối) ── */}
      <Row gutter={[10, 10]} className="mb-3">
        <Col xs={12} sm={12} lg={12}>
          <Card variant="borderless" className="shadow-xs rounded-xl" styles={{ body: { padding: '14px 16px' } }}>
            <Statistic
              title={<span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Lô Cận Hạn Sử Dụng</span>}
              value={expiryAlerts.length}
              suffix={<span className="text-xs text-gray-400 font-normal">lô</span>}
              prefix={<ExclamationCircleOutlined className="text-rose-500 mr-1" />}
              styles={{ content: { color: '#f43f5e', fontSize: '1.35rem', fontWeight: 800 } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={12}>
          <Card variant="borderless" className="shadow-xs rounded-xl" styles={{ body: { padding: '14px 16px' } }}>
            <Statistic
              title={<span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Mặt Hàng Trữ Lượng Thấp</span>}
              value={lowStockAlerts.length}
              suffix={<span className="text-xs text-gray-400 font-normal">món</span>}
              prefix={<AlertOutlined className="text-amber-500 mr-1" />}
              styles={{ content: { color: '#f59e0b', fontSize: '1.35rem', fontWeight: 800 } }}
            />
          </Card>
        </Col>
      </Row>

      {hasAlerts && (
        <Alert
          title="Hệ thống ghi nhận cảnh báo cần xử lý:"
          type="error"
          showIcon
          className="mb-4 rounded-xl"
          description={
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
              {expiryAlerts.length > 0 && <li>Có {expiryAlerts.length} lô hải sản cận date (dưới {expiryAlertDays} ngày).</li>}
              {lowStockAlerts.length > 0 && <li>Có {lowStockAlerts.length} mặt hàng có trữ lượng dưới mức tối thiểu.</li>}
            </ul>
          }
        />
      )}

      <Space orientation="vertical" size={14} className="w-full">
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined className="text-red-500 text-base" />
              <span className="text-sm sm:text-base font-bold">Cảnh Báo Hải Sản Cận Hạn Sử Dụng</span>
            </Space>
          }
          extra={<ZoomButton onClick={() => setZoomAlert('expiry')} />}
          className="shadow-sm rounded-2xl overflow-hidden"
          styles={{ body: { padding: '12px' } }}
        >
          {/* Mobile View: Dạng Card Cảnh Báo Kiểu App */}
          <div className="block sm:hidden space-y-2.5">
            {expiryAlerts.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                Hiện tại tất cả các lô hàng đều an toàn (chưa có lô nào sắp hết hạn).
              </div>
            ) : (
              expiryAlerts.map((record) => {
                const days = record.daysLeft;
                let color = 'red';
                let label = 'Nguy cấp';
                if (days > 3 && days <= 7) {
                  color = 'orange';
                  label = 'Cảnh báo';
                } else if (days > 7) {
                  color = 'gold';
                  label = 'Lưu ý';
                }
                return (
                  <div
                    key={record.batchCode}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-sky-600 dark:text-sky-400 font-mono">
                        {record.batchCode}
                      </span>
                      <Tag color={color} className="font-bold text-[11px] m-0 border-0">
                        {days <= 0 ? 'ĐÃ HẾT HẠN!' : `${days} ngày (${label})`}
                      </Tag>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{record.productName}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">HSD: {record.expiryDate}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {formatWeight(record.quantity || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table
              dataSource={expiryAlerts}
              columns={expiryColumns}
              rowKey="batchCode"
              loading={loading}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Hiện tại tất cả các lô hàng trong kho đều an toàn (chưa có lô nào sắp hết hạn).' }}
              scroll={{ x: 500 }}
            />
          </div>
        </Card>

        <Card
          title={
            <Space>
              <AlertOutlined className="text-orange-500 text-base" />
              <span className="text-sm sm:text-base font-bold">Cảnh Báo Trữ Lượng Tồn Kho Thấp</span>
            </Space>
          }
          extra={<ZoomButton onClick={() => setZoomAlert('lowStock')} />}
          className="shadow-sm rounded-2xl overflow-hidden"
          styles={{ body: { padding: '12px' } }}
        >
          {/* Mobile View: Dạng Card Cảnh Báo Kiểu App */}
          <div className="block sm:hidden space-y-2.5">
            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                Tất cả mặt hàng hải sản đều đạt hoặc vượt định mức tồn kho tối thiểu.
              </div>
            ) : (
              lowStockAlerts.map((record) => {
                const deficit = Math.max(0, record.minStock - record.currentStock);
                return (
                  <div
                    key={record.id}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {record.name}
                      </span>
                      <Tag color="volcano" className="text-[11px] m-0 border-0 font-semibold">
                        Thiếu {deficit} {record.unit}
                      </Tag>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] text-gray-400">{record.code}</span>
                      <div className="text-right">
                        <span className="text-red-500 font-black">{record.currentStock}</span>
                        <span className="text-gray-400 text-xs"> / {record.minStock} {record.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            <Table
              dataSource={lowStockAlerts}
              columns={lowStockColumns}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
              locale={{ emptyText: 'Tất cả mặt hàng hải sản đều đạt hoặc vượt định mức tồn kho tối thiểu.' }}
              scroll={{ x: 380 }}
            />
          </div>
        </Card>
      </Space>

      {/* Modal Phóng To Bảng Cảnh Báo & Quay Ngang */}
      <ZoomViewerModal
        open={zoomAlert !== null}
        onClose={() => setZoomAlert(null)}
        title={
          zoomAlert === 'expiry'
            ? 'Cảnh Báo Hải Sản Cận Hạn Sử Dụng'
            : 'Cảnh Báo Trữ Lượng Tồn Kho Thấp'
        }
        subtitle="Chế độ toàn màn hình hỗ trợ kiểm tra chi tiết"
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col p-2">
            {zoomAlert === 'expiry' && (
              <Table
                dataSource={expiryAlerts}
                columns={expiryColumns}
                rowKey="batchCode"
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ x: 900, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              />
            )}
            {zoomAlert === 'lowStock' && (
              <Table
                dataSource={lowStockAlerts}
                columns={lowStockColumns}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="middle"
                scroll={{ x: 800, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              />
            )}
          </div>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default AlertsPage;
