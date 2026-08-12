import React from 'react';
import { Card, Table, Tag, Badge, Row, Col, Typography, Alert, Space } from 'antd';
import { AlertOutlined, ExclamationCircleOutlined, DashboardOutlined } from '@ant-design/icons';
import { useBatchStore } from '../../stores/useBatchStore';
import { formatWeight } from '../../utils/format';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

// Mock low stock thresholds
const STOCK_THRESHOLDS: Record<string, number> = {
  TOMHUM: 60,  // Tôm Hùm Bông: alert if < 60kg
  CUAHD: 20,   // Cua Hoàng Đế: alert if < 20kg
  CAHOI: 100,  // Cá Hồi Na Uy: alert if < 100kg
  MUCLA: 30,   // Mực Lá Đại: alert if < 30kg
};

// Mock freezer telemetry
const FREEZER_TELEMETRY = [
  { id: 'FRZ-A1', name: 'Kho đông lạnh A1 (Giáp xác)', targetTemp: -18, actualTemp: -14, status: 'Warning', deviation: 4 },
  { id: 'FRZ-A2', name: 'Kho đông lạnh A2 (Cua cá)', targetTemp: -20, actualTemp: -19.5, status: 'Normal', deviation: 0.5 },
  { id: 'FRZ-B1', name: 'Kho làm mát B1 (Tươi sống)', targetTemp: 2, actualTemp: 6.2, status: 'Critical', deviation: 4.2 },
];

export const AlertsPage: React.FC = () => {
  const batches = useBatchStore((state) => state.batches);

  // 1. Compute Expiry Alerts
  const today = dayjs();
  const expiryAlerts = batches
    .filter((b) => b.quantity > 0)
    .map((b) => {
      const expiry = dayjs(b.expiryDate);
      const daysLeft = expiry.diff(today, 'day');
      return { ...b, daysLeft };
    })
    .filter((b) => b.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 2. Compute Low Stock Alerts
  // Aggregate stock quantities per seafoodCode
  const stockMap: Record<string, { name: string; qty: number }> = {};
  batches.forEach((b) => {
    if (!stockMap[b.seafoodCode]) {
      stockMap[b.seafoodCode] = { name: b.seafoodName, qty: 0 };
    }
    stockMap[b.seafoodCode].qty += b.quantity;
  });

  const lowStockAlerts = Object.entries(STOCK_THRESHOLDS)
    .map(([code, threshold]) => {
      const stock = stockMap[code] || { name: code, qty: 0 };
      return {
        seafoodCode: code,
        seafoodName: stock.name,
        currentStock: stock.qty,
        threshold,
        isLow: stock.qty < threshold,
      };
    })
    .filter((item) => item.isLow);

  // Columns for Tables
  const expiryColumns = [
    {
      title: 'Mã Lô Hàng',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Hải Sản',
      dataIndex: 'seafoodName',
      key: 'seafoodName',
    },
    {
      title: 'Hạn Sử Dụng',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
    },
    {
      title: 'Số Ngày Còn Lại',
      dataIndex: 'daysLeft',
      key: 'daysLeft',
      render: (days: number) => {
        let color = 'red';
        let label = 'Nguy cấp';
        if (days > 3 && days <= 5) {
          color = 'orange';
          label = 'Cảnh báo';
        } else if (days > 5) {
          color = 'yellow';
          label = 'Lưu ý';
        }
        return (
          <Tag color={color} className="font-semibold">
            {days <= 0 ? 'Đã hết hạn!' : `${days} ngày (${label})`}
          </Tag>
        );
      },
    },
    {
      title: 'Tồn Kho Lô',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number) => formatWeight(val),
    },
  ];

  const lowStockColumns = [
    {
      title: 'Mặt Hàng',
      dataIndex: 'seafoodName',
      key: 'seafoodName',
    },
    {
      title: 'Tồn kho hiện tại',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (val: number) => <span className="text-red-500 font-bold">{formatWeight(val)}</span>,
    },
    {
      title: 'Định mức tối thiểu',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (val: number) => formatWeight(val),
    },
    {
      title: 'Mức độ thiếu hụt',
      key: 'deficit',
      render: (_: any, record: any) => {
        const deficit = record.threshold - record.currentStock;
        return <Tag color="volcano">Thiếu {formatWeight(deficit)}</Tag>;
      },
    },
  ];

  const tempColumns = [
    {
      title: 'Thiết Bị / Phòng Đông',
      dataIndex: 'name',
      key: 'name',
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
        return <span className={isCritical ? 'text-red-500 font-bold' : 'text-orange-500 font-semibold'}>{t}°C</span>;
      },
    },
    {
      title: 'Độ Lệch',
      dataIndex: 'deviation',
      key: 'deviation',
      render: (val: number) => <Tag color="red">+{val}°C</Tag>,
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

  const hasAlerts = expiryAlerts.length > 0 || lowStockAlerts.length > 0 || FREEZER_TELEMETRY.some(f => f.status !== 'Normal');

  return (
    <div>
      <div className="mb-6">
        <Title level={2} className="m-0">Hệ Thống Cảnh Báo Kho Hải Sản</Title>
        <Paragraph type="secondary">Giám sát các chỉ số chất lượng, nhiệt độ lưu kho và thời hạn sử dụng các lô hải sản.</Paragraph>
      </div>

      {hasAlerts && (
        <Alert
          message="Hệ thống ghi nhận sự cố: Cần hành động ngay để kiểm soát chất lượng hải sản!"
          type="error"
          showIcon
          className="mb-6"
          description={
            <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
              {expiryAlerts.length > 0 && <li>Có {expiryAlerts.length} lô hải sản sắp hết hạn (dưới 7 ngày).</li>}
              {lowStockAlerts.length > 0 && <li>Có {lowStockAlerts.length} mặt hàng có trữ lượng dưới định mức tối thiểu.</li>}
              {FREEZER_TELEMETRY.some(f => f.status !== 'Normal') && <li>Ghi nhận tủ đông lệch nhiệt độ bảo quản quy chuẩn.</li>}
            </ul>
          }
        />
      )}

      <Space direction="vertical" size={24} className="w-full">
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined className="text-red-500" />
              <span>Cảnh Báo Hải Sản Cận Hạn Sử Dụng (Dưới 7 Ngày)</span>
            </Space>
          }
          className="shadow-sm"
        >
          <Table
            dataSource={expiryAlerts}
            columns={expiryColumns}
            rowKey="batchCode"
            pagination={false}
            size="small"
            locale={{ emptyText: 'Không có lô hàng nào sắp hết hạn.' }}
            scroll={{ x: 'max-content' }}
          />
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <AlertOutlined className="text-orange-500" />
                  <span>Cảnh Báo Trữ Lượng Tồn Kho Thấp</span>
                </Space>
              }
              className="shadow-sm h-full"
            >
              <Table
                dataSource={lowStockAlerts}
                columns={lowStockColumns}
                rowKey="seafoodCode"
                pagination={false}
                size="small"
                locale={{ emptyText: 'Đầy đủ trữ lượng hàng trong kho.' }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <DashboardOutlined className="text-blue-500" />
                  <span>Cảnh Báo Độ Lệch Nhiệt Độ Tủ Bảo Quản</span>
                </Space>
              }
              className="shadow-sm h-full"
            >
              <Table
                dataSource={FREEZER_TELEMETRY.filter((f) => f.status !== 'Normal')}
                columns={tempColumns}
                rowKey="id"
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
