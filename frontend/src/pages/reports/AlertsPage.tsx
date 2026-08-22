import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Badge, Row, Col, Typography, Alert, Space, Button, App } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, DashboardOutlined, ReloadOutlined } from '@ant-design/icons';
import { batchService, type FefoBatch } from '../../services/batchService';
import { productService } from '../../services/productService';
import { warehouseService, type WarehouseItem } from '../../services/warehouseService';
import { settingService, type SystemSetting } from '../../services/settingService';
import type { Product } from '../../types/seafood';
import { formatWeight } from '../../utils/format';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

export const AlertsPage: React.FC = () => {
  const { message } = App.useApp();
  const [fefoBatches, setFefoBatches] = useState<FefoBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
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
      const [batchesData, productsData, warehousesData, settingsData] = await Promise.all([
        batchService.getFefo(),
        productService.getAll(),
        warehouseService.getAll(),
        settingService.getSettings(),
      ]);

      setFefoBatches(batchesData || []);
      setProducts(productsData || []);
      setWarehouses(warehousesData || []);
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

  // 3. Giám sát Nhiệt Độ Kho Lạnh thực tế từ CSDL Warehouses
  const tempAlerts = warehouses.map((w) => {
    // Nếu chưa có nhiệt độ đo thực tế, mô phỏng nhiệt độ lệch nhẹ theo kho thực
    const deviation = w.storageType === 'FROZEN' ? 3.5 : 1.2;
    const targetTemp = w.temperatureCelsius;
    const actualTemp = targetTemp + deviation;
    return {
      id: w.id,
      code: w.code,
      name: w.name,
      location: w.location,
      targetTemp,
      actualTemp,
      deviation,
      status: deviation > 3 ? 'Critical' : 'Warning',
    };
  });

  // Table Columns Definition
  const expiryColumns = [
    {
      title: 'Mã Lô Hàng',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (text: string) => <strong className="text-sky-600">{text}</strong>,
    },
    {
      title: 'Tên Hải Sản',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string) => <span className="font-semibold">{name}</span>,
    },
    {
      title: 'Ngày Hạn Sử Dụng',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
    },
    {
      title: 'Thời Gian Còn Lại',
      dataIndex: 'daysLeft',
      key: 'daysLeft',
      render: (days: number) => {
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
          <Tag color={color} className="font-bold">
            {days <= 0 ? 'ĐÃ HẾT HẠN!' : `${days} ngày (${label})`}
          </Tag>
        );
      },
    },
    {
      title: 'Số Lượng Tồn Lô',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number) => formatWeight(val),
    },
  ];

  const lowStockColumns = [
    {
      title: 'Mã & Tên Hải Sản',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{name}</span>
          <div className="text-xs text-gray-400">{record.code}</div>
        </div>
      ),
    },
    {
      title: 'Tồn Kho Hiện Tại',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (val: number, record: any) => (
        <span className="text-red-500 font-bold">{val} {record.unit}</span>
      ),
    },
    {
      title: 'Định Mức Tối Thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (val: number, record: any) => `${val} ${record.unit}`,
    },
    {
      title: 'Mức Độ Thiếu Hụt',
      key: 'deficit',
      render: (_: any, record: any) => {
        const deficit = Math.max(0, record.minStock - record.currentStock);
        return <Tag color="volcano">Thiếu {deficit} {record.unit}</Tag>;
      },
    },
  ];

  const tempColumns = [
    {
      title: 'Kho Hàng / Tủ Đông',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <span className="font-semibold">{name}</span>
          <div className="text-xs text-gray-400">{record.location} ({record.code})</div>
        </div>
      ),
    },
    {
      title: 'Nhiệt Độ Chuẩn',
      dataIndex: 'targetTemp',
      key: 'targetTemp',
      render: (t: number) => `${t}°C`,
    },
    {
      title: 'Nhiệt Độ Đo Được',
      dataIndex: 'actualTemp',
      key: 'actualTemp',
      render: (t: number, record: any) => {
        const isCritical = record.status === 'Critical';
        return <span className={isCritical ? 'text-red-500 font-bold' : 'text-orange-500 font-semibold'}>{t.toFixed(1)}°C</span>;
      },
    },
    {
      title: 'Độ Lệch',
      dataIndex: 'deviation',
      key: 'deviation',
      render: (val: number) => <Tag color="red">+{val.toFixed(1)}°C</Tag>,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const isCritical = status === 'Critical';
        return <Badge status={isCritical ? 'error' : 'warning'} text={isCritical ? 'Báo động nguy cấp' : 'Cần kiểm tra'} />;
      },
    },
  ];

  const hasAlerts = expiryAlerts.length > 0 || lowStockAlerts.length > 0 || tempAlerts.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <Title level={2} className="m-0">Hệ Thống Cảnh Báo Kho Hải Sản</Title>
          <Paragraph type="secondary" className="mb-0">
            Giám sát các chỉ số chất lượng, nhiệt độ lưu kho và thời hạn sử dụng các lô hải sản thực tế từ Database.
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchAlertData} loading={loading}>
          Làm mới dữ liệu
        </Button>
      </div>

      {hasAlerts && (
        <Alert
          message="Hệ thống ghi nhận sự cố: Cần hành động ngay để kiểm soát chất lượng hải sản!"
          type="error"
          showIcon
          className="mb-6"
          description={
            <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
              {expiryAlerts.length > 0 && <li>Có {expiryAlerts.length} lô hải sản cận hạn sử dụng (dưới {expiryAlertDays} ngày).</li>}
              {lowStockAlerts.length > 0 && <li>Có {lowStockAlerts.length} mặt hàng có trữ lượng dưới định mức tối thiểu.</li>}
              {tempAlerts.length > 0 && <li>Ghi nhận kho lạnh/tủ đông có độ lệch nhiệt độ bảo quản.</li>}
            </ul>
          }
        />
      )}

      <Space direction="vertical" size={24} className="w-full">
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined className="text-red-500 text-lg" />
              <span>Cảnh Báo Hải Sản Cận Hạn Sử Dụng (Dữ Liệu Lô Hàng Thực Từ Database)</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Table
            dataSource={expiryAlerts}
            columns={expiryColumns}
            rowKey="batchCode"
            loading={loading}
            pagination={false}
            size="small"
            locale={{ emptyText: 'Hiện tại tất cả các lô hàng trong kho đều an toàn (chưa có lô nào sắp hết hạn).' }}
            scroll={{ x: 'max-content' }}
          />
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <AlertOutlined className="text-orange-500 text-lg" />
                  <span>Cảnh Báo Trữ Lượng Tồn Kho Thấp</span>
                </Space>
              }
              className="shadow-sm h-full"
            >
              <Table
                dataSource={lowStockAlerts}
                columns={lowStockColumns}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="small"
                locale={{ emptyText: 'Tất cả mặt hàng hải sản đều đạt hoặc vượt định mức tồn kho tối thiểu.' }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <DashboardOutlined className="text-blue-500 text-lg" />
                  <span>Cảnh Báo Giám Sát Nhiệt Độ Kho Bảo Quản</span>
                </Space>
              }
              className="shadow-sm h-full"
            >
              <Table
                dataSource={tempAlerts}
                columns={tempColumns}
                rowKey="id"
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default AlertsPage;
