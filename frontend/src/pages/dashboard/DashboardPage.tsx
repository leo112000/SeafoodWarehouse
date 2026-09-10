import React from 'react';
import { Card, Row, Col, Button, Table, Typography, Space, Tag, Tooltip, Drawer, Segmented } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  InboxOutlined,
  UploadOutlined,
  WarningOutlined,
  DatabaseOutlined,
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
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

const { Text } = Typography;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = React.useState(false);
  const [drawerTx, setDrawerTx] = React.useState<RecentTransaction | null>(null);
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [zoomTarget, setZoomTarget] = React.useState<'flowChart' | 'categoryPie' | 'recentTransactions' | null>(null);
  const [chartMetric, setChartMetric] = React.useState<'KG' | 'VND'>('KG');

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getDashboardData();
      if (res) {
        setData(res);
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
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">Tổng Quan</h1>
        </div>
        <Tooltip title="Làm mới dữ liệu ngay">
          <Button
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            onClick={fetchData}
            loading={loading}
          >
            Làm mới
          </Button>
        </Tooltip>
      </div>

      {/* Khối 1: Header Cảnh Báo Khẩn (Alert Banner mỏng & hiện đại) */}
      {(alerts.expiringBatchesCount > 0 || alerts.lowStockProductsCount > 0) && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-rose-800 dark:text-rose-200">CẢNH BÁO CẦN XỬ LÝ:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {alerts.expiringBatchesCount > 0 && (
              <Tag
                color="error"
                className="cursor-pointer font-medium hover:opacity-80 m-0 text-xs"
                onClick={() => navigate('/reports/alerts')}
              >
                ⚠️ {alerts.expiringBatchesCount} lô cận date
              </Tag>
            )}
            {alerts.lowStockProductsCount > 0 && (
              <Tag
                color="orange"
                className="cursor-pointer font-medium hover:opacity-80 m-0 text-xs"
                onClick={() => navigate('/reports/alerts')}
              >
                📦 {alerts.lowStockProductsCount} SP sắp hết
              </Tag>
            )}
          </div>
        </div>
      )}

      {/* Khối 2: 4 Thẻ KPI - Chia theo cặp logic: [Nhập - Xuất] và [Tồn kho - Hao hụt] trên cùng dòng */}
      <Row gutter={[12, 12]}>
        {/* Cặp 1: Giao dịch hôm nay (Nhập kho - Xuất kho) */}
        <Col xs={12} lg={6}>
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-indigo-500/15 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs uppercase font-semibold text-indigo-100 tracking-tight truncate">Nhập Kho Hôm Nay</div>
                <div className="text-lg sm:text-2xl font-black mt-0.5 truncate">
                  {kpis.todayInboundKg.value?.toLocaleString()} <span className="text-xs font-normal text-indigo-100">kg</span>
                </div>
              </div>
              <div className="p-1.5 sm:p-2.5 bg-white/15 backdrop-blur-md rounded-xl text-white text-base sm:text-xl shrink-0">
                <InboxOutlined />
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] sm:text-xs text-indigo-100 flex items-center justify-between truncate">
              <span>{kpis.todayInboundReceipts.value} phiếu</span>
              <strong className="text-white ml-1 truncate">{formatCurrency(kpis.todayInboundValue?.value || 0)}</strong>
            </div>
          </div>
        </Col>

        <Col xs={12} lg={6}>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-emerald-500/15 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs uppercase font-semibold text-emerald-100 tracking-tight truncate">Xuất Kho Hôm Nay</div>
                <div className="text-lg sm:text-2xl font-black mt-0.5 truncate">
                  {kpis.todayOutboundKg.value?.toLocaleString()} <span className="text-xs font-normal text-emerald-100">kg</span>
                </div>
              </div>
              <div className="p-1.5 sm:p-2.5 bg-white/15 backdrop-blur-md rounded-xl text-white text-base sm:text-xl shrink-0">
                <UploadOutlined />
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] sm:text-xs text-emerald-100 flex items-center justify-between truncate">
              <span>{kpis.todayOutboundTransactions.value} đơn</span>
              <strong className="text-white ml-1 truncate">{formatCurrency(kpis.todayOutboundValue?.value || 0)}</strong>
            </div>
          </div>
        </Col>

        {/* Cặp 2: Trữ lượng & Chất lượng kho (Tồn kho - Tỷ lệ hao hụt) */}
        <Col xs={12} lg={6}>
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-sky-500/15 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs uppercase font-semibold text-sky-100 tracking-tight truncate">Tổng Tồn Kho Hiện Tại</div>
                <div className="text-lg sm:text-2xl font-black mt-0.5 truncate">
                  {kpis.totalStockKg.value?.toLocaleString()} <span className="text-xs font-normal text-sky-100">kg</span>
                </div>
              </div>
              <div className="p-1.5 sm:p-2.5 bg-white/15 backdrop-blur-md rounded-xl text-white text-base sm:text-xl shrink-0">
                <DatabaseOutlined />
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] sm:text-xs text-sky-100 flex items-center justify-between truncate">
              <span>Ước tính giá trị</span>
              <strong className="text-white ml-1 truncate">{formatCurrency(kpis.totalStockValue.value)}</strong>
            </div>
          </div>
        </Col>

        <Col xs={12} lg={6}>
          <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-3 sm:p-4 text-white shadow-md shadow-rose-500/15 relative overflow-hidden h-full flex flex-col justify-between">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs uppercase font-semibold text-rose-100 tracking-tight truncate">Tỷ Lệ Hao Hụt Tháng</div>
                <div className="text-lg sm:text-2xl font-black mt-0.5 truncate">
                  {kpis.monthlyLossRate.value}%
                </div>
              </div>
              <div className="p-1.5 sm:p-2.5 bg-white/15 backdrop-blur-md rounded-xl text-white text-base sm:text-xl shrink-0">
                <WarningOutlined />
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-white/20 text-[10px] sm:text-xs text-rose-100 flex items-center justify-between truncate">
              <span>Định mức an toàn</span>
              <strong className="text-white ml-1 truncate">&le; 2.0%</strong>
            </div>
          </div>
        </Col>
      </Row>

      {/* Khối 3: Biểu Đồ Thống Kê (Chiều cao tối ưu, thoáng và bao quát) */}
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={15}>
          <Card
            title={
              <div className="flex items-center gap-1.5 min-w-0">
                <LineChartOutlined className="text-blue-500 shrink-0 text-sm sm:text-base" />
                <span className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  Biểu Đồ 7 Ngày <span className="hidden sm:inline">Gần Nhất</span>
                </span>
              </div>
            }
            extra={
              <Space size="small">
                <Segmented
                  size="small"
                  value={chartMetric}
                  onChange={(v) => setChartMetric(v as 'KG' | 'VND')}
                  options={[
                    {
                      label: (
                        <span>
                          <span className="hidden sm:inline">📦 Khối lượng (Kg)</span>
                          <span className="sm:hidden font-semibold">📦 Kg</span>
                        </span>
                      ),
                      value: 'KG',
                    },
                    {
                      label: (
                        <span>
                          <span className="hidden sm:inline">💰 Doanh số (VNĐ)</span>
                          <span className="sm:hidden font-semibold">💰 VNĐ</span>
                        </span>
                      ),
                      value: 'VND',
                    },
                  ]}
                />
                <ZoomButton onClick={() => setZoomTarget('flowChart')} />
              </Space>
            }
            className="shadow-sm rounded-2xl"
            styles={{
              header: { padding: '8px 12px', minHeight: 46 },
              body: { padding: '12px 16px' },
            }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dailyFlow} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: string) => {
                    if (!val) return '';
                    const parts = val.split(/[-/]/);
                    if (parts.length === 3) {
                      return parts[0].length === 4 ? `${parts[2]}/${parts[1]}` : `${parts[0]}/${parts[1]}`;
                    }
                    return val;
                  }}
                />
                {chartMetric === 'KG' ? (
                  <>
                    <YAxis
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}`)}
                      label={{ value: 'Kg', angle: -90, position: 'insideLeft', offset: 15 }}
                    />
                    <RechartTooltip
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} kg`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar name="Nhập kho (kg)" dataKey="inboundKg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar name="Xuất kho (kg)" dataKey="outboundKg" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </>
                ) : (
                  <>
                    <YAxis
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => `${(val / 1_000_000).toFixed(1)} tr`}
                      label={{ value: 'Tr. VNĐ', angle: -90, position: 'insideLeft', offset: 15 }}
                    />
                    <RechartTooltip
                      formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar name="Tiền nhập (VNĐ)" dataKey="inboundAmount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar name="Tiền xuất (VNĐ)" dataKey="outboundAmount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title={
              <div className="flex items-center gap-1.5 min-w-0">
                <DatabaseOutlined className="text-orange-500 shrink-0 text-sm sm:text-base" />
                <span className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  Cơ Cấu Tồn Kho
                </span>
              </div>
            }
            extra={<ZoomButton onClick={() => setZoomTarget('categoryPie')} />}
            className="shadow-sm rounded-2xl h-full"
            styles={{
              header: { padding: '8px 12px', minHeight: 46 },
              body: { padding: '12px 16px' },
            }}
          >
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={categoryStock}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
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
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
              {categoryStock.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 ml-1">{item.value}k</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Khối 4: Lịch Sử Giao Dịch Mới Nhất (Tối ưu App Mobile & Desktop) */}
      <Card
        title={
          <div className="flex items-center gap-1.5 min-w-0">
            <HistoryOutlined className="text-indigo-500 shrink-0 text-sm sm:text-base" />
            <span className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              Lịch Sử Giao Dịch <span className="hidden sm:inline">Mới Nhất</span>
            </span>
          </div>
        }
        extra={
          <Space>
            <Text type="secondary" className="text-xs hidden sm:inline">
              💡 Nhấp vào dòng để xem chi tiết phiếu bên góc phải
            </Text>
            <ZoomButton onClick={() => setZoomTarget('recentTransactions')} />
          </Space>
        }
        className="shadow-sm rounded-2xl"
        styles={{
          header: { padding: '8px 12px', minHeight: 46 },
          body: { padding: '12px' },
        }}
      >
        {/* Mobile View: Dạng Card chạm lướt kiểu App */}
        <div className="block sm:hidden space-y-2.5">
          {recentTransactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              onClick={() => {
                setDrawerTx(tx);
                setDrawerVisible(true);
              }}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs active:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag color={tx.type === 'INBOUND' ? 'blue' : 'green'} className="font-bold text-[11px] m-0 px-1.5 py-0.5">
                    {tx.type === 'INBOUND' ? '📥 NHẬP' : '📤 XUẤT'}
                  </Tag>
                  <span className="font-bold text-xs text-sky-600 tracking-tight">{tx.id}</span>
                </div>
                <span className="text-[11px] text-gray-400">{tx.time}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {tx.productName || 'Hải sản'}
                    {tx.itemCount && tx.itemCount > 1 ? (
                      <span className="text-violet-600 font-medium ml-1">+{tx.itemCount} món</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {tx.partnerName || (tx.batchCode ? `Lô: ${tx.batchCode}` : 'Nội bộ')}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{formatWeight(tx.weightKg)}</div>
                  <div className="font-semibold text-emerald-600 text-[11px]">{formatCurrency(tx.amount)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / Tablet View: Bảng đầy đủ cột */}
        <div className="hidden sm:block">
          <Table
            dataSource={recentTransactions.slice(0, 5)}
            columns={transactionColumns}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 800 }}
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
        </div>
      </Card>

      {/* Drawer xem chi tiết Phiếu Nhập / Xuất Kho (Dạng Bottom Sheet trên mobile, Trượt phải trên máy tính) */}
      <Drawer
        title={
          <div className="flex items-center gap-2.5">
            <Tag color={drawerTx?.type === 'INBOUND' ? 'blue' : 'green'} className="text-xs font-bold px-2.5 py-0.5 m-0">
              {drawerTx?.type === 'INBOUND' ? '📥 PHIẾU NHẬP KHO' : '📤 PHIẾU XUẤT KHO'}
            </Tag>
            <span className="font-bold text-sky-600 dark:text-sky-400 text-sm tracking-wide">{drawerTx?.id}</span>
          </div>
        }
        placement={typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom' : 'right'}
        height={typeof window !== 'undefined' && window.innerWidth < 640 ? '85vh' : undefined}
        onClose={() => {
          setDrawerVisible(false);
          setDrawerTx(null);
        }}
        open={drawerVisible}
        styles={{
          wrapper: {
            width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 500,
            borderTopLeftRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 0,
            borderTopRightRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? 20 : 0,
            overflow: 'hidden',
          },
          body: { padding: '16px' }
        }}
      >
        {drawerTx && (
          <div className="space-y-4">
            {/* Header thông tin phiếu */}
            <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Thời gian tạo:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{drawerTx.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  {drawerTx.type === 'INBOUND' ? 'Nhà cung cấp:' : 'Khách hàng / Đại lý:'}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{drawerTx.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Người lập phiếu:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{drawerTx.createdBy || 'Thủ kho'}</span>
              </div>
            </div>

            {/* Bảng chi tiết hải sản */}
            <div>
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                <span>1. Danh sách hải sản ({drawerTx.items?.length || 1} món)</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{formatWeight(drawerTx.weightKg)}</span>
              </div>
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse min-w-[340px]">
                  <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
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
                        <tr key={idx} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="p-2">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{item.productName}</div>
                            <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400">{item.batchCode}</div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="font-bold text-gray-800 dark:text-gray-200">{formatWeight(item.netWeight)}</div>
                            {item.tareWeight > 0 && (
                              <div className="text-[10px] text-gray-400">Bì: {item.tareWeight}kg</div>
                            )}
                          </td>
                          <td className="p-2 text-right text-gray-800 dark:text-gray-200">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.totalAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2" colSpan={4}>
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{drawerTx.productName}</div>
                          <div className="font-mono text-xs text-sky-600 dark:text-sky-400">{drawerTx.batchCode}</div>
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
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>2. Vật phẩm bán kèm &amp; Thùng xốp</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">{formatCurrency(drawerTx.suppliesTotal || 0)}</span>
                </div>
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse min-w-[320px]">
                    <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2">Vật phẩm</th>
                        <th className="p-2 text-center">SL</th>
                        <th className="p-2 text-right">Đơn giá</th>
                        <th className="p-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drawerTx.supplies.map((sup, sIdx) => (
                        <tr key={sIdx} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 font-medium text-gray-800 dark:text-gray-200">{sup.name}</td>
                          <td className="p-2 text-center text-gray-800 dark:text-gray-200">{sup.quantity} {sup.unit}</td>
                          <td className="p-2 text-right text-gray-800 dark:text-gray-200">{formatCurrency(sup.unitPrice)}</td>
                          <td className="p-2 text-right font-semibold text-sky-600 dark:text-sky-400">{formatCurrency(sup.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tổng kết tài chính phiếu */}
            <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tiền hàng hải sản:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(drawerTx.subTotal || drawerTx.amount)}</span>
              </div>
              {drawerTx.suppliesTotal && drawerTx.suppliesTotal > 0 ? (
                <div className="flex justify-between text-sky-700 dark:text-sky-400">
                  <span>Tiền thùng xốp / phụ phí:</span>
                  <span className="font-semibold">+{formatCurrency(drawerTx.suppliesTotal)}</span>
                </div>
              ) : null}
              {drawerTx.discountAmount && drawerTx.discountAmount > 0 ? (
                <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
                  <span>Chiết khấu {drawerTx.discountReason ? `(${drawerTx.discountReason})` : ''}:</span>
                  <span>-{formatCurrency(drawerTx.discountAmount)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
                <span className="text-gray-900 dark:text-white">TỔNG THANH TOÁN:</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400">{formatCurrency(drawerTx.amount)}</span>
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

      {/* Modal Phóng To & Quay Ngang Toàn Màn Hình */}
      <ZoomViewerModal
        open={zoomTarget !== null}
        onClose={() => setZoomTarget(null)}
        title={
          zoomTarget === 'flowChart'
            ? 'Sản Lượng Nhập – Xuất 7 Ngày Gần Nhất'
            : zoomTarget === 'categoryPie'
            ? 'Cơ Cấu Tồn Kho Hải Sản'
            : 'Lịch Sử Giao Dịch Chi Tiết'
        }
        subtitle={
          zoomTarget === 'flowChart'
            ? 'Tương quan khối lượng nhập/xuất và dòng tiền giao dịch'
            : zoomTarget === 'categoryPie'
            ? 'Tỷ lệ phân bố tồn kho theo từng ngành hàng'
            : 'Bảng dữ liệu mở rộng các phiếu nhập và xuất kho mới nhất'
        }
      >
        {({ isRotated }) => (
          <>
            {zoomTarget === 'flowChart' && (
              <div className="w-full h-full min-h-[300px] p-2 flex flex-col">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyFlow} margin={{ top: 20, right: 35, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 13, fontWeight: 600 }} />
                    <YAxis yAxisId="left" tickLine={false} tick={{ fontSize: 12 }} label={{ value: 'Khối lượng (Kg)', angle: -90, position: 'insideLeft', offset: 10 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => `${(val / 1_000_000).toFixed(1)} tr`}
                      label={{ value: 'Doanh số (Triệu VNĐ)', angle: 90, position: 'insideRight', offset: 15 }}
                    />
                    <RechartTooltip
                      formatter={(value: any, name: any) => {
                        if (String(name).includes('Tiền')) {
                          return [formatCurrency(Number(value)), name];
                        }
                        return [`${Number(value).toLocaleString()} kg`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                    <Bar yAxisId="left" name="Nhập kho (kg)" dataKey="inboundKg" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="left" name="Xuất kho (kg)" dataKey="outboundKg" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" name="Tiền nhập (VNĐ)" dataKey="inboundAmount" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" name="Tiền xuất (VNĐ)" dataKey="outboundAmount" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {zoomTarget === 'categoryPie' && (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-6 p-4">
                <div className="w-full md:w-1/2 h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStock}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {categoryStock.map((entry, index) => (
                          <Cell key={`cell-zoom-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartTooltip formatter={(value) => `${value} kg`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryStock.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                      </div>
                      <span className="font-bold text-base text-gray-900 dark:text-gray-100">{item.value.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {zoomTarget === 'recentTransactions' && (
              <div className="w-full h-full flex flex-col">
                <Table
                  dataSource={recentTransactions}
                  columns={transactionColumns}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
                  size="middle"
                  scroll={{ x: 850, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 250px)' }}
                  onRow={(record) => ({
                    onClick: () => {
                      setDrawerTx(record);
                      setDrawerVisible(true);
                    },
                  })}
                  rowClassName="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                />
              </div>
            )}
          </>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default DashboardPage;
