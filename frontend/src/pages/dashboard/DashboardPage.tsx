import React from 'react';
import { Card, Row, Col, Alert, Button, Table, Typography, Space, Tag, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  AlertOutlined,
  ArrowRightOutlined,
  InboxOutlined,
  UploadOutlined,
  WarningOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  HistoryOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { EMPTY_DASHBOARD_DATA, type DashboardData } from '../../services/mockDashboardData';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency, formatWeight } from '../../utils/format';

const { Title, Paragraph, Text } = Typography;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getDashboardData();
      if (res) {
        setData(res);
        setLastUpdated(new Date());
      }
    } catch {
      // Backend API error
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    // Auto-refresh mỗi 30 giây
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { alerts, kpis, dailyFlow, categoryStock, recentTransactions } = data;

  const transactionColumns = [
    {
      title: 'Mã Giao Dịch',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text strong>{id}</Text>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'INBOUND' | 'OUTBOUND') => (
        <Tag color={type === 'INBOUND' ? 'blue' : 'green'} className="font-semibold">
          {type === 'INBOUND' ? 'NHẬP KHO' : 'XUẤT KHO'}
        </Tag>
      ),
    },
    {
      title: 'Thời Gian',
      dataIndex: 'time',
      key: 'time',
      responsive: ['sm'] as any,
    },
    {
      title: 'Đối Tác',
      dataIndex: 'partnerName',
      key: 'partnerName',
    },
    {
      title: 'Khối Lượng',
      dataIndex: 'weightKg',
      key: 'weightKg',
      render: (val: number) => formatWeight(val),
    },
    {
      title: 'Giá Trị',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => formatCurrency(val),
      responsive: ['md'] as any,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={2} className="m-0">Bảng Điều Khiển Tổng Quan</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Giám sát trực quan dữ liệu nhập xuất, tồn kho hải sản và cảnh báo vận hành thời gian thực.
          </Paragraph>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: '#999' }}>
              Cập nhật lúc: {lastUpdated.toLocaleTimeString('vi-VN')} &nbsp;·&nbsp; Tự động làm mới mỗi 30s
            </span>
          )}
        </div>
        <Tooltip title="Làm mới dữ liệu ngay">
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchData}
            loading={loading}
          >
            Làm mới
          </Button>
        </Tooltip>
      </div>

      {/* Khối 1: Header Cảnh Báo Khẩn (Alert Banner) */}
      {(alerts.expiringBatchesCount > 0 || alerts.deviatedFreezersCount > 0 || alerts.lowStockProductsCount > 0) && (
        <Alert
          message={<Text strong className="text-red-800">CẢNH BÁO HỆ THỐNG CẦN XỬ LÝ GẤP</Text>}
          description={
            <Row gutter={[16, 16]} className="mt-2">
              <Col xs={24} md={8}>
                <div
                  onClick={() => navigate('/reports/alerts')}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 rounded p-3 cursor-pointer transition flex items-center justify-between"
                >
                  <Space>
                    <WarningOutlined className="text-red-500 text-lg" />
                    <Text className="text-red-700 font-medium">
                      {alerts.expiringBatchesCount} lô hàng sắp hết hạn
                    </Text>
                  </Space>
                  <ArrowRightOutlined className="text-red-400" />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div
                  onClick={() => navigate('/reports/alerts')}
                  className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded p-3 cursor-pointer transition flex items-center justify-between"
                >
                  <Space>
                    <AlertOutlined className="text-orange-500 text-lg" />
                    <Text className="text-orange-700 font-medium">
                      {alerts.deviatedFreezersCount} tủ đông lệch nhiệt độ
                    </Text>
                  </Space>
                  <ArrowRightOutlined className="text-orange-400" />
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div
                  onClick={() => navigate('/reports/alerts')}
                  className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded p-3 cursor-pointer transition flex items-center justify-between"
                >
                  <Space>
                    <WarningOutlined className="text-yellow-600 text-lg" />
                    <Text className="text-yellow-700 font-medium">
                      {alerts.lowStockProductsCount} mặt sản phẩm sắp hết
                    </Text>
                  </Space>
                  <ArrowRightOutlined className="text-yellow-500" />
                </div>
              </Col>
            </Row>
          }
          type="error"
          showIcon
          className="shadow-sm border-red-200"
        />
      )}

      {/* Khối 2: 4 Thẻ KPI Statistic Sang Trọng */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl p-4 text-white shadow-lg shadow-sky-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold text-blue-100 tracking-wider">Tổng Tồn Kho Hiện Tại</div>
                <div className="text-2xl font-black mt-1">
                  {kpis.totalStockKg.value?.toLocaleString()} <span className="text-sm font-normal text-blue-100">kg</span>
                </div>
              </div>
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-white text-2xl">
                <DatabaseOutlined />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-xs text-blue-100 flex items-center justify-between">
              <span>Ước tính giá trị:</span>
              <strong className="text-white text-sm">{formatCurrency(kpis.totalStockValue.value)}</strong>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold text-indigo-100 tracking-wider">Nhập Kho Hôm Nay</div>
                <div className="text-2xl font-black mt-1">
                  {kpis.todayInboundKg.value?.toLocaleString()} <span className="text-sm font-normal text-indigo-100">kg</span>
                </div>
              </div>
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-white text-2xl">
                <InboxOutlined />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-xs text-indigo-100 flex items-center justify-between">
              <span>Số lượng phiếu nhập:</span>
              <strong className="text-white text-sm">{kpis.todayInboundReceipts.value} phiếu</strong>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold text-emerald-100 tracking-wider">Xuất Kho Hôm Nay</div>
                <div className="text-2xl font-black mt-1">
                  {kpis.todayOutboundKg.value?.toLocaleString()} <span className="text-sm font-normal text-emerald-100">kg</span>
                </div>
              </div>
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-white text-2xl">
                <UploadOutlined />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-xs text-emerald-100 flex items-center justify-between">
              <span>Số lượng giao dịch:</span>
              <strong className="text-white text-sm">{kpis.todayOutboundTransactions.value} đơn</strong>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-semibold text-rose-100 tracking-wider">Tỷ Lệ Hao Hụt Tháng</div>
                <div className="text-2xl font-black mt-1">
                  {kpis.monthlyLossRate.value}%
                </div>
              </div>
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-white text-2xl">
                <WarningOutlined />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-xs text-rose-100 flex items-center justify-between">
              <span>Định mức an toàn:</span>
              <strong className="text-white text-sm">&le; 2.0%</strong>
            </div>
          </div>
        </Col>
      </Row>

      {/* Khối 3: Biểu Đồ Thống Kê */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <LineChartOutlined className="text-blue-500" />
                <span>Sản Lượng Nhập – Xuất 7 Ngày Gần Nhất</span>
              </Space>
            }
            className="shadow-sm"
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyFlow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickLine={false} />
                <YAxis tickLine={false} />
                <RechartTooltip />
                <Legend />
                <Bar name="Nhập kho (kg)" dataKey="inboundKg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="Xuất kho (kg)" dataKey="outboundKg" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <DatabaseOutlined className="text-orange-500" />
                <span>Cơ Cấu Tồn Kho</span>
              </Space>
            }
            className="shadow-sm h-full"
          >
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryStock}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryStock.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartTooltip formatter={(value) => `${value} kg`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {categoryStock.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm text-gray-600">
                  <Space>
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </Space>
                  <span className="font-semibold text-gray-800">{item.value} kg</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Khối 4: Phím Tắt & Lịch Sử Giao Dịch */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={7} lg={6}>
          <Card
            title={
              <Space>
                <CalendarOutlined className="text-blue-500" />
                <span>Thao Tác Nhanh</span>
              </Space>
            }
            className="shadow-sm h-full"
          >
            <div className="flex flex-col gap-2.5">
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                onClick={() => navigate('/inventory/map')}
                size="large"
                className="w-full bg-sky-600 hover:bg-sky-700 font-semibold"
              >
                🗺️ Sơ Đồ Kho Lạnh 2D
              </Button>
              <Button
                type="primary"
                icon={<InboxOutlined />}
                onClick={() => navigate('/inventory/inbound')}
                size="large"
                className="w-full bg-blue-600 hover:bg-blue-700 font-semibold"
              >
                Nhập kho hải sản
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => navigate('/inventory/outbound')}
                size="large"
                className="w-full bg-emerald-600 hover:bg-emerald-700 border-none font-semibold"
              >
                Xuất kho hải sản
              </Button>
              <Button
                danger
                type="primary"
                icon={<WarningOutlined />}
                onClick={() => navigate('/inventory/wastage')}
                size="large"
                className="w-full font-semibold"
              >
                Báo hao hụt / Phân loại
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={17} lg={18}>
          <Card
            title={
              <Space>
                <HistoryOutlined className="text-indigo-500" />
                <span>Lịch Sử Giao Dịch Mới Nhất</span>
              </Space>
            }
            className="shadow-sm"
          >
            <Table
              dataSource={recentTransactions}
              columns={transactionColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
