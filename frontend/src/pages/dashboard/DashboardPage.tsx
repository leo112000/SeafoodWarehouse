import React from 'react';
import { Card, Row, Col, Alert, Button, Table, Typography, Space, Tag, Tooltip, Drawer } from 'antd';
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
  ComposedChart,
  Bar,
  Line,
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
import { EMPTY_DASHBOARD_DATA, type DashboardData, type RecentTransaction } from '../../services/mockDashboardData';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency, formatWeight } from '../../utils/format';

const { Title, Paragraph, Text } = Typography;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [drawerTx, setDrawerTx] = React.useState<RecentTransaction | null>(null);
  const [drawerVisible, setDrawerVisible] = React.useState(false);

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
      title: 'Mã Phiếu',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: any) => (
        <span
          className="font-bold text-sky-600 hover:text-sky-700 cursor-pointer hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setDrawerTx(record);
            setDrawerVisible(true);
          }}
        >
          {id}
        </span>
      ),
    },
    {
      title: 'Loại Giao Dịch',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'INBOUND' | 'OUTBOUND') => (
        <Tag color={type === 'INBOUND' ? 'blue' : 'green'} className="font-semibold">
          {type === 'INBOUND' ? 'NHẬP KHO' : 'XUẤT KHO'}
        </Tag>
      ),
    },
    {
      title: 'Mã Lô Sản Phẩm',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (code: string) => (
        <Tag color="cyan" className="font-mono font-medium">
          {code || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Hải Sản / Mặt Hàng',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record: any) => (
        <div>
          <Text strong>{name || 'Hải sản'}</Text>
          {record.itemCount && record.itemCount > 1 ? (
            <Tag color="purple" className="ml-1.5 text-xs">+{record.itemCount} món</Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Đối Tác',
      dataIndex: 'partnerName',
      key: 'partnerName',
      render: (partner: string) => <Text type="secondary">{partner}</Text>,
      responsive: ['md'] as any,
    },
    {
      title: 'Khối Lượng',
      dataIndex: 'weightKg',
      key: 'weightKg',
      render: (val: number) => <Text strong>{formatWeight(val)}</Text>,
    },
    {
      title: 'Giá Trị',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => <span className="font-semibold text-emerald-600">{formatCurrency(val)}</span>,
      responsive: ['md'] as any,
    },
    {
      title: 'Thời Gian',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => <Text type="secondary">{time}</Text>,
      responsive: ['sm'] as any,
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
              <span>{kpis.todayInboundReceipts.value} phiếu nhập:</span>
              <strong className="text-white text-sm">
                {formatCurrency(kpis.todayInboundValue?.value || 0)}
              </strong>
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
              <span>{kpis.todayOutboundTransactions.value} đơn xuất:</span>
              <strong className="text-white text-sm">
                {formatCurrency(kpis.todayOutboundValue?.value || 0)}
              </strong>
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
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={dailyFlow} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickLine={false} />
                <YAxis yAxisId="left" tickLine={false} label={{ value: 'Kg', angle: -90, position: 'insideLeft', offset: 15 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1_000_000).toFixed(1)} tr`}
                  label={{ value: 'Triệu VNĐ', angle: 90, position: 'insideRight', offset: 15 }}
                />
                <RechartTooltip
                  formatter={(value: any, name: any) => {
                    if (String(name).includes('Tiền')) {
                      return [formatCurrency(Number(value)), name];
                    }
                    return [`${Number(value).toLocaleString()} kg`, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" name="Nhập kho (kg)" dataKey="inboundKg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" name="Xuất kho (kg)" dataKey="outboundKg" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" name="Tiền nhập (VNĐ)" dataKey="inboundAmount" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" name="Tiền xuất (VNĐ)" dataKey="outboundAmount" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </ComposedChart>
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
            extra={
              <Text type="secondary" className="text-xs">
                💡 Nhấp vào dòng để xem chi tiết phiếu bên góc phải
              </Text>
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
              rowClassName={(record) =>
                record.id === drawerTx?.id && drawerVisible
                  ? '!bg-sky-100 dark:!bg-sky-950/60 !border-l-4 !border-l-sky-600 font-medium transition-colors'
                  : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
              }
              onRow={(record) => ({
                onClick: () => {
                  setDrawerTx(record);
                  setDrawerVisible(true);
                },
              })}
            />
          </Card>
        </Col>
      </Row>

      {/* Drawer xem chi tiết Phiếu Nhập / Xuất Kho khi bấm vào dòng */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5">
            <Tag color={drawerTx?.type === 'INBOUND' ? 'blue' : 'green'} className="text-xs font-bold px-2.5 py-0.5 m-0">
              {drawerTx?.type === 'INBOUND' ? '📥 PHIẾU NHẬP KHO' : '📤 PHIẾU XUẤT KHO'}
            </Tag>
            <span className="font-bold text-sky-600 text-sm tracking-wide">{drawerTx?.id}</span>
          </div>
        }
        placement="right"
        width={500}
        onClose={() => {
          setDrawerVisible(false);
          setDrawerTx(null);
        }}
        open={drawerVisible}
        bodyStyle={{ padding: '20px' }}
      >
        {drawerTx && (
          <div className="space-y-4">
            {/* Header thông tin phiếu */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Thời gian tạo:</span>
                <span className="font-semibold text-gray-800">{drawerTx.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {drawerTx.type === 'INBOUND' ? 'Nhà cung cấp:' : 'Khách hàng / Đại lý:'}
                </span>
                <span className="font-bold text-gray-900">{drawerTx.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Người lập phiếu:</span>
                <span className="font-medium text-gray-800">{drawerTx.createdBy || 'Thủ kho'}</span>
              </div>
            </div>

            {/* Bảng chi tiết hải sản */}
            <div>
              <div className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>1. Danh sách hải sản ({drawerTx.items?.length || 1} món)</span>
                <span className="text-blue-600 font-semibold">{formatWeight(drawerTx.weightKg)}</span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-2">Mã Lô / Tên</th>
                      <th className="p-2 text-right">Khối lượng</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawerTx.items && drawerTx.items.length > 0 ? (
                      drawerTx.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="p-2">
                            <div className="font-semibold text-gray-800">{item.productName}</div>
                            <div className="font-mono text-[10px] text-sky-600">{item.batchCode}</div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="font-bold">{formatWeight(item.netWeight)}</div>
                            {item.tareWeight > 0 && (
                              <div className="text-[10px] text-gray-400">Bì: {item.tareWeight}kg</div>
                            )}
                          </td>
                          <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-600">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2" colSpan={4}>
                          <div className="font-semibold">{drawerTx.productName}</div>
                          <div className="font-mono text-xs text-sky-600">{drawerTx.batchCode}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng thùng xốp & phụ phí (nếu có) */}
            {drawerTx.supplies && drawerTx.supplies.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>2. Vật phẩm bán kèm &amp; Thùng xốp</span>
                  <span className="text-sky-600 font-semibold">{formatCurrency(drawerTx.suppliesTotal || 0)}</span>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                      <tr>
                        <th className="p-2">Vật phẩm</th>
                        <th className="p-2 text-center">SL</th>
                        <th className="p-2 text-right">Đơn giá</th>
                        <th className="p-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawerTx.supplies.map((sup, sIdx) => (
                        <tr key={sIdx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="p-2 font-medium text-gray-800">{sup.name}</td>
                          <td className="p-2 text-center">{sup.quantity} {sup.unit}</td>
                          <td className="p-2 text-right">{formatCurrency(sup.unitPrice)}</td>
                          <td className="p-2 text-right font-semibold text-sky-600">{formatCurrency(sup.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tổng kết tài chính phiếu */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Tiền hàng hải sản:</span>
                <span className="font-semibold">{formatCurrency(drawerTx.subTotal || drawerTx.amount)}</span>
              </div>
              {drawerTx.suppliesTotal && drawerTx.suppliesTotal > 0 ? (
                <div className="flex justify-between text-sky-700">
                  <span>Tiền thùng xốp / phụ phí:</span>
                  <span className="font-semibold">+{formatCurrency(drawerTx.suppliesTotal)}</span>
                </div>
              ) : null}
              {drawerTx.discountAmount && drawerTx.discountAmount > 0 ? (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Chiết khấu {drawerTx.discountReason ? `(${drawerTx.discountReason})` : ''}:</span>
                  <span>-{formatCurrency(drawerTx.discountAmount)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm font-bold">
                <span className="text-gray-900">TỔNG THANH TOÁN:</span>
                <span className="text-base text-emerald-600">{formatCurrency(drawerTx.amount)}</span>
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <Button
                className="w-full"
                type="dashed"
                onClick={() => setDrawerVisible(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default DashboardPage;
