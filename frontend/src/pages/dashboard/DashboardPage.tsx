import React from 'react';
import { Card, Row, Col, Button, Table, Typography, Tag, Tooltip, Drawer, Segmented } from 'antd';
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
import { EMPTY_DASHBOARD_DATA, type DashboardData, type RecentTransaction } from '@/services/mockDashboardData';
import { dashboardService } from '@/services/dashboardService';
import { TRANSACTION_STATUS, TRANSACTION_TYPE, type TransactionType } from '@/constants';
import { formatCurrency, formatWeight, formatDateTime } from '@/utils/format';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import type { ExcelExportColumn } from '@/utils/exportUtils';
import { useTabStore } from '@/stores/useTabStore';
import { signalRService } from '@/services/signalrService';

const { Text } = Typography;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = React.useState(false);
  const [drawerTx, setDrawerTx] = React.useState<RecentTransaction | null>(null);
  const [drawerVisible, setDrawerVisible] = React.useState(false);
  const [chartMetric, setChartMetric] = React.useState<'KG' | 'VND'>('KG');
  const activeKey = useTabStore((state) => state.activeKey);
  const isFirstMountRef = React.useRef(true);

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

  // Tự động refetch ngay khi chuyển tab về Dashboard ('/' hoặc '/dashboard')
  React.useEffect(() => {
    if (activeKey === '/' || activeKey === '/dashboard' || isFirstMountRef.current) {
      isFirstMountRef.current = false;
      fetchData();
    }
  }, [activeKey, fetchData]);

  // Lắng nghe sự kiện SignalR real-time (tạo/hủy nhập kho, xuất kho, thông báo mới)
  React.useEffect(() => {
    const unsubStock = signalRService.onStockUpdated(() => {
      fetchData();
    });
    const unsubNotif = signalRService.onNotification(() => {
      fetchData();
    });
    return () => {
      unsubStock();
      unsubNotif();
    };
  }, [fetchData]);

  // Tự động refetch khi người dùng quay lại cửa sổ trình duyệt
  React.useEffect(() => {
    const handleFocus = () => {
      if (activeKey === '/' || activeKey === '/dashboard') {
        fetchData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeKey, fetchData]);

  // Auto-refresh mỗi 30 giây nền
  React.useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { alerts, kpis, dailyFlow, categoryStock } = data;
  const recentTransactions = React.useMemo(() => {
    return (data.recentTransactions || []).filter((tx) => tx.status !== TRANSACTION_STATUS.CANCELLED);
  }, [data.recentTransactions]);

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
      render: (type: TransactionType, record: any) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag color={type === TRANSACTION_TYPE.INBOUND ? 'blue' : 'green'} className="font-semibold">
            {type === TRANSACTION_TYPE.INBOUND ? 'NHẬP KHO' : 'XUẤT KHO'}
          </Tag>
          {record.status === TRANSACTION_STATUS.CANCELLED && (
            <Tag color="error" className="font-bold text-xs px-1.5 py-0.5 m-0 border-0">
              ĐÃ HỦY
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Mã Lô Sản Phẩm',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (code: string) => {
        if (!code || code === 'N/A') {
          return <span className="text-gray-400 font-mono text-xs">N/A</span>;
        }
        const codes = code.split(',').map((c) => c.trim()).filter(Boolean);
        if (codes.length <= 1) {
          return (
            <Tag color="cyan" className="font-mono font-medium text-xs">
              {codes[0]}
            </Tag>
          );
        }
        const firstCode = codes[0];
        const remainingCount = codes.length - 1;
        return (
          <Tooltip
            title={
              <div className="space-y-1 py-0.5 max-w-[280px]">
                <div className="font-bold text-xs border-b border-slate-600 pb-1 text-slate-200">
                  Danh sách {codes.length} mã lô hàng:
                </div>
                {codes.map((c, idx) => (
                  <div key={idx} className="font-mono text-xs text-sky-300 truncate">
                    • {c}
                  </div>
                ))}
              </div>
            }
          >
            <span className="inline-flex items-center gap-1 cursor-pointer">
              <Tag color="cyan" className="font-mono font-medium text-xs m-0">
                {firstCode}
              </Tag>
              <Tag color="blue" className="font-semibold text-[11px] m-0 px-1.5">
                +{remainingCount}
              </Tag>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Hải Sản / Mặt Hàng',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string, record: any) => {
        const names = (name || 'Hải sản').split(',').map((n) => n.trim()).filter(Boolean);
        const firstName = names[0] || 'Hải sản';
        const count = names.length > 1 ? names.length - 1 : (record.itemCount && record.itemCount > 1 ? record.itemCount - 1 : 0);

        if (count === 0) {
          return <Text strong className="text-slate-800 dark:text-slate-100">{firstName}</Text>;
        }

        return (
          <Tooltip
            title={
              <div className="space-y-1 py-0.5 max-w-[280px]">
                <div className="font-bold text-xs border-b border-slate-600 pb-1 text-slate-200">
                  Danh sách mặt hàng ({names.length} món):
                </div>
                {names.map((n, idx) => (
                  <div key={idx} className="text-xs text-slate-100 truncate">
                    • {n}
                  </div>
                ))}
              </div>
            }
          >
            <span className="inline-flex items-center gap-1.5 cursor-pointer">
              <Text strong className="text-slate-800 dark:text-slate-100">{firstName}</Text>
              <Tag color="purple" className="font-semibold text-[11px] m-0 px-1.5">
                +{count} món
              </Tag>
            </span>
          </Tooltip>
        );
      },
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
      render: (time: string) => <Text type="secondary">{formatDateTime(time)}</Text>,
      responsive: ['sm'] as any,
    },
  ];

  const recentTransactionsExportColumns: ExcelExportColumn[] = [
    { header: 'Mã Phiếu', key: 'id', width: 18 },
    { header: 'Thời Gian', key: 'date', width: 18, formatter: (val: string) => formatDateTime(val) },
    { header: 'Loại Phiếu', key: 'type', width: 15, formatter: (val: string) => val === 'INBOUND' ? 'Nhập kho' : 'Xuất kho' },
    { header: 'Đối Tác', key: 'partner', width: 25 },
    { header: 'Mặt Hàng', key: 'product', width: 25 },
    { header: 'Khối Lượng (kg)', key: 'weightKg', width: 18, formatter: (val: number) => `${val.toLocaleString()} kg` },
    { header: 'Giá Trị (VNĐ)', key: 'amount', width: 20, formatter: (val: number) => formatCurrency(val) },
    { header: 'Trạng Thái', key: 'status', width: 15, formatter: (val: string) => val === 'COMPLETED' ? 'Hoàn tất' : val === 'PENDING' ? 'Đang xử lý' : 'Đã hủy' },
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
              <div className="shrink-0">
                <Segmented
                  size="small"
                  value={chartMetric}
                  onChange={(v) => setChartMetric(v as 'KG' | 'VND')}
                  options={[
                    {
                      label: (
                        <span className="inline-flex items-center justify-center gap-1 leading-none py-0.5 px-0.5">
                          <span>📦</span>
                          <span className="hidden sm:inline font-medium">Khối lượng (Kg)</span>
                          <span className="sm:hidden font-bold">Kg</span>
                        </span>
                      ),
                      value: 'KG',
                    },
                    {
                      label: (
                        <span className="inline-flex items-center justify-center gap-1 leading-none py-0.5 px-0.5">
                          <span>💰</span>
                          <span className="hidden sm:inline font-medium">Doanh số (VNĐ)</span>
                          <span className="sm:hidden font-bold">VNĐ</span>
                        </span>
                      ),
                      value: 'VND',
                    },
                  ]}
                />
              </div>
            }
            className="shadow-sm rounded-2xl"
            styles={{
              header: { padding: '8px 12px', minHeight: 46 },
              body: { padding: '12px 16px' },
            }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dailyFlow} margin={{ top: 12, right: 10, left: 6, bottom: 0 }}>
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
                      width={44}
                      tickLine={false}
                      tickMargin={4}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}`)}
                      label={{
                        value: 'Kg',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 12,
                        style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 600 },
                      }}
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
                      width={52}
                      tickLine={false}
                      tickMargin={4}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `${(val / 1_000_000).toFixed(1)} tr`}
                      label={{
                        value: 'Tr. VNĐ',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 12,
                        style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b', fontWeight: 600 },
                      }}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-x-2 gap-y-1 mt-2">
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
          <div className="flex items-center gap-2">
            <ExportExcelButton
              data={recentTransactions}
              columns={recentTransactionsExportColumns}
              fileName="Giao_Dich_Gan_Day_Dashboard"
              sheetName="Giao dịch"
            />
            <Text type="secondary" className="text-xs hidden md:inline">
              💡 Nhấp vào dòng để xem chi tiết
            </Text>
          </div>
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
                <span className="text-[11px] text-gray-400">{formatDateTime(tx.time)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {tx.productName?.split(',')?.[0]?.trim() || 'Hải sản'}
                    {tx.itemCount && tx.itemCount > 1 ? (
                      <span className="text-violet-600 font-medium ml-1">+{tx.itemCount - 1} món</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {tx.partnerName || (tx.batchCode ? `Lô: ${tx.batchCode.split(',')?.[0]?.trim()}${tx.batchCode.includes(',') ? ` (+${tx.batchCode.split(',').length - 1})` : ''}` : 'Nội bộ')}
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
            width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : typeof window !== 'undefined' && window.innerWidth < 1024 ? 420 : 500,
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
                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDateTime(drawerTx.time)}</span>
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
    </div>
  );
};

export default DashboardPage;
