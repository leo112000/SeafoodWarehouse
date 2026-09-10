import React, { useState, useCallback } from 'react';
import {
  Card, Row, Col, Radio, Select, DatePicker, Button, Table, Typography, Space, Tag, Tooltip, App,
} from 'antd';
import type { RadioChangeEvent } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined, PrinterOutlined, ArrowUpOutlined, ArrowDownOutlined,
  RiseOutlined, FallOutlined, BarChartOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  EMPTY_REPORT_DATA,
  type ReportMode,
  type TopItem,
  type TimeSeriesPoint,
  type StockByCategory,
  type ReportData,
} from '../../services/mockReportData';
import { reportService } from '../../services/reportService';
import { formatCurrency, formatWeight } from '../../utils/format';
import { exportReportToExcel } from '../../utils/excelExporter';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

dayjs.extend(isoWeek);

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_WEEK = dayjs().isoWeek();
const CURRENT_MONTH = dayjs().month() + 1;
const CURRENT_YEAR = dayjs().year();

const WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => ({ value: i + 1, label: `Tuần ${i + 1}` }));
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
const QUARTER_OPTIONS = [
  { value: 1, label: 'Quý 1 (Jan–Mar)' },
  { value: 2, label: 'Quý 2 (Apr–Jun)' },
  { value: 3, label: 'Quý 3 (Jul–Sep)' },
  { value: 4, label: 'Quý 4 (Oct–Dec)' },
];
const YEAR_OPTIONS = [2022, 2023, 2024, 2025, 2026].map((y) => ({ value: y, label: `Năm ${y}` }));

// ─── Custom Tooltip for Bar/Line Chart ───────────────────────────────────────

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="mb-1">
          {entry.name}: <strong>{entry.value.toLocaleString('vi-VN')} kg</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Custom Pie Label ─────────────────────────────────────────────────────────

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── KPI Card Component ───────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  primaryValue: string;
  primaryLabel: string;
  secondaryValue: string;
  secondaryLabel: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title, primaryValue, primaryLabel, secondaryValue, secondaryLabel,
  icon, color, trend, trendText,
}) => (
  <Card
    className="shadow-xs rounded-xl h-full"
    style={{ borderTop: `3px solid ${color}` }}
    styles={{ body: { padding: '12px 14px' } }}
  >
    <div className="flex items-start justify-between mb-1.5">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{title}</div>
      <div style={{ color, fontSize: 18, opacity: 0.9 }}>{icon}</div>
    </div>
    <div className="mb-0.5">
      <span className="text-base sm:text-xl font-black text-gray-800 dark:text-gray-100">{primaryValue}</span>
      {primaryLabel && <span className="text-[10px] text-gray-400 ml-1">{primaryLabel}</span>}
    </div>
    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5 truncate">
      {secondaryValue}
      {secondaryLabel && <span className="text-[10px] text-gray-400 ml-1">({secondaryLabel})</span>}
    </div>
    {trendText && (
      <div className={`text-[10px] font-semibold flex items-center gap-1 truncate ${
        trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-gray-400'
      }`}>
        {trend === 'up' ? <ArrowUpOutlined /> : trend === 'down' ? <ArrowDownOutlined /> : null}
        <span className="truncate">{trendText}</span>
      </div>
    )}
  </Card>
);

// ─── Top Items Table Columns (Gộp Cột Gọn Gàng) ───────────────────────────────

const TOP_ITEMS_COLUMNS: ColumnsType<TopItem> = [
  {
    title: 'STT',
    dataIndex: 'rank',
    key: 'rank',
    width: 50,
    align: 'center' as const,
    render: (rank: number) => {
      const colors: Record<number, string> = { 1: '#f59e0b', 2: '#9ca3af', 3: '#b45309' };
      return (
        <span style={{ color: colors[rank] ?? '#6b7280', fontWeight: rank <= 3 ? 800 : 500 }}>
          {rank <= 3 ? '★' : ''} {rank}
        </span>
      );
    },
  },
  {
    title: 'Hải Sản / Nhóm',
    dataIndex: 'name',
    key: 'name',
    render: (name: string, record: TopItem) => (
      <div>
        <div className="font-bold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">{name}</div>
        <Tag color="blue" className="text-[10px] leading-tight px-1 py-0 mt-0.5 border-0">
          {record.categoryName}
        </Tag>
      </div>
    ),
  },
  {
    title: 'Nhập Kho',
    key: 'inbound',
    align: 'right',
    render: (_, r) => (
      <div>
        <div className="text-blue-600 font-bold text-xs sm:text-sm">{r.inboundKg.toLocaleString('vi-VN')} kg</div>
        <div className="text-[11px] text-gray-500 font-medium">{formatCurrency(r.inboundAmount || 0)}</div>
      </div>
    ),
    sorter: (a, b) => a.inboundKg - b.inboundKg,
  },
  {
    title: 'Xuất Kho',
    key: 'outbound',
    align: 'right',
    render: (_, r) => (
      <div>
        <div className="text-orange-600 font-bold text-xs sm:text-sm">{r.outboundKg.toLocaleString('vi-VN')} kg</div>
        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(r.outboundAmount || 0)}</div>
      </div>
    ),
    sorter: (a, b) => a.outboundKg - b.outboundKg,
  },
  {
    title: 'Tồn Kho Hiện Tại',
    key: 'stock',
    align: 'right',
    render: (_, r) => (
      <div>
        <div className={`font-bold text-xs sm:text-sm ${r.stockKg < 50 ? 'text-red-500' : 'text-emerald-600'}`}>
          {r.stockKg.toLocaleString('vi-VN')} kg
        </div>
        <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{formatCurrency(r.stockValue)}</div>
      </div>
    ),
    sorter: (a, b) => a.stockKg - b.stockKg,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const ReportsPage: React.FC = () => {
  const { message } = App.useApp();

  const [mode, setMode] = useState<ReportMode>('month');
  const [selectedWeek, setSelectedWeek] = useState<number>(CURRENT_WEEK);
  const [selectedMonth, setSelectedMonth] = useState<number>(CURRENT_MONTH);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.ceil(CURRENT_MONTH / 3));
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [customRange, setCustomRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [zoomSection, setZoomSection] = useState<'chart' | 'table' | null>(null);

  const [data, setData] = useState<ReportData>(EMPTY_REPORT_DATA);

  React.useEffect(() => {
    let isMounted = true;
    reportService
      .getReportData(mode)
      .then((res) => {
        if (isMounted && res) {
          setData(res);
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(EMPTY_REPORT_DATA);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mode]);

  const handleModeChange = useCallback((e: RadioChangeEvent) => {
    setMode(e.target.value as ReportMode);
  }, []);

  // Period label for page title
  const periodLabel = (() => {
    switch (mode) {
      case 'week': return `Tuần ${selectedWeek} / ${selectedYear}`;
      case 'month': return `Tháng ${selectedMonth} / ${selectedYear}`;
      case 'quarter': return `Quý ${selectedQuarter} / ${selectedYear}`;
      case 'year': return `Năm ${selectedYear}`;
      case 'custom':
        return customRange?.[0] && customRange?.[1]
          ? `${customRange[0].format('DD/MM/YYYY')} – ${customRange[1].format('DD/MM/YYYY')}`
          : 'Tùy chỉnh';
    }
  })();

  const handleExport = useCallback(() => {
    try {
      exportReportToExcel(data, periodLabel, mode);
      message.success(`Đã xuất file Excel: Bao-Cao-Kho-Hai-San-${mode === 'week' ? 'Tuan' : mode === 'month' ? 'Thang' : mode === 'quarter' ? 'Quy' : mode === 'year' ? 'Nam' : 'TuyChon'}.xlsx`);
    } catch {
      message.error('Xuất Excel thất bại. Vui lòng thử lại.');
    }
  }, [data, periodLabel, mode, message]);
  const handlePrint = () => window.print();

  // ── Derived chart/table data ──────────────────────────────────────────────
  const barData = data.timeSeries.map((p: TimeSeriesPoint) => ({
    name: p.label,
    'Nhập (kg)': p.inboundKg,
    'Xuất (kg)': p.outboundKg,
  }));

  const pieData = data.stockByCategory.map((c: StockByCategory) => ({
    name: c.category,
    value: c.kg,
    color: c.color,
  }));

  const { summary } = data;

  return (
    <div id="reports-page">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Báo Cáo Thống Kê
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tooltip title="Xuất báo cáo ra file Excel">
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="middle"
              className="bg-emerald-600 hover:bg-emerald-700 border-none font-semibold"
            >
              <span className="hidden sm:inline">Xuất Excel</span>
            </Button>
          </Tooltip>
          <Tooltip title="In báo cáo">
            <Button icon={<PrinterOutlined />} onClick={handlePrint} size="middle" />
          </Tooltip>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <Card className="shadow-sm mb-4 rounded-2xl" styles={{ body: { padding: '10px 14px' } }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode selector */}
            <Radio.Group
              value={mode}
              onChange={handleModeChange}
              optionType="button"
              buttonStyle="solid"
              size="middle"
              className="flex-shrink-0"
            >
              <Radio.Button value="week">Tuần</Radio.Button>
              <Radio.Button value="month">Tháng</Radio.Button>
              <Radio.Button value="quarter">Quý</Radio.Button>
              <Radio.Button value="year">Năm</Radio.Button>
              <Radio.Button value="custom">Tùy Chọn</Radio.Button>
            </Radio.Group>

            {/* Period sub-selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {mode === 'week' && (
                <>
                  <Select
                    value={selectedWeek}
                    onChange={setSelectedWeek}
                    options={WEEK_OPTIONS}
                    className="w-28 sm:w-32"
                    showSearch
                    optionFilterProp="label"
                  />
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={YEAR_OPTIONS}
                    className="w-24 sm:w-28"
                    showSearch
                    optionFilterProp="label"
                  />
                </>
              )}
              {mode === 'month' && (
                <>
                  <Select
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    options={MONTH_OPTIONS}
                    className="w-28 sm:w-32"
                    showSearch
                    optionFilterProp="label"
                  />
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={YEAR_OPTIONS}
                    className="w-24 sm:w-28"
                    showSearch
                    optionFilterProp="label"
                  />
                </>
              )}
              {mode === 'quarter' && (
                <>
                  <Select
                    value={selectedQuarter}
                    onChange={setSelectedQuarter}
                    options={QUARTER_OPTIONS}
                    className="w-36 sm:w-44"
                    showSearch
                    optionFilterProp="label"
                  />
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={YEAR_OPTIONS}
                    className="w-24 sm:w-28"
                    showSearch
                    optionFilterProp="label"
                  />
                </>
              )}
              {mode === 'year' && (
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={YEAR_OPTIONS}
                  className="w-28 sm:w-36"
                  showSearch
                  optionFilterProp="label"
                />
              )}
              {mode === 'custom' && (
                <RangePicker
                  value={customRange}
                  onChange={(dates) => setCustomRange(dates as [Dayjs | null, Dayjs | null] | null)}
                  format="DD/MM/YYYY"
                  className="w-64 sm:w-72"
                  placeholder={['Từ ngày', 'Đến ngày']}
                />
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-1">
            <BarChartOutlined className="text-sky-500" />
            <span>Kỳ xem:</span> <strong className="text-sky-600">{periodLabel}</strong>
          </div>
        </div>
      </Card>

      {/* ── KPI Cards (Gộp 2 Cột Trên Mobile) ───────────────────────────── */}
      <Row gutter={[10, 10]} className="mb-4">
        <Col xs={12} sm={12} md={8} lg={4.8} style={{ flex: '1 1 18%', minWidth: 140 }}>
          <KpiCard
            title="Tổng Nhập Kho"
            primaryValue={summary.totalInboundKg.toLocaleString('vi-VN')}
            primaryLabel="kg"
            secondaryValue={formatCurrency(summary.totalInboundAmount)}
            secondaryLabel="tiền nhập"
            icon={<ArrowDownOutlined />}
            color="#3b82f6"
            trend="up"
            trendText="Tăng so với trước"
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4.8} style={{ flex: '1 1 18%', minWidth: 140 }}>
          <KpiCard
            title="Tổng Xuất Kho"
            primaryValue={summary.totalOutboundKg.toLocaleString('vi-VN')}
            primaryLabel="kg"
            secondaryValue={formatCurrency(summary.totalOutboundAmount)}
            secondaryLabel="doanh thu"
            icon={<ArrowUpOutlined />}
            color="#0284c7"
            trend="up"
            trendText="Tăng so với trước"
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4.8} style={{ flex: '1 1 18%', minWidth: 140 }}>
          <KpiCard
            title="Lợi Nhuận Gộp"
            primaryValue={formatCurrency(summary.grossProfit || 0)}
            primaryLabel=""
            secondaryValue={`${summary.profitMarginPercent || 0}%`}
            secondaryLabel="tỷ suất lãi"
            icon={<RiseOutlined />}
            color={(summary.grossProfit || 0) >= 0 ? "#10b981" : "#ef4444"}
            trend={(summary.grossProfit || 0) >= 0 ? "up" : "down"}
            trendText={(summary.grossProfit || 0) >= 0 ? "Kinh doanh lãi" : "Cần chỉnh giá"}
          />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4.8} style={{ flex: '1 1 18%', minWidth: 140 }}>
          <KpiCard
            title="Tồn Kho Hiện Tại"
            primaryValue={summary.stockKg.toLocaleString('vi-VN')}
            primaryLabel="kg tồn"
            secondaryValue={formatCurrency(summary.stockValue)}
            secondaryLabel="giá trị tồn"
            icon={<RiseOutlined />}
            color="#8b5cf6"
            trend="neutral"
            trendText="Ổn định"
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4.8} style={{ flex: '1 1 18%', minWidth: 140 }}>
          <KpiCard
            title="Hao Hụt / Tổn Thất"
            primaryValue={summary.wastageKg.toLocaleString('vi-VN')}
            primaryLabel="kg hỏng"
            secondaryValue={`${summary.lossRate}%`}
            secondaryLabel="tỷ lệ hụt"
            icon={<FallOutlined />}
            color="#ef4444"
            trend={summary.lossRate > 2 ? 'down' : 'up'}
            trendText={summary.lossRate > 2 ? 'Cần kiểm soát' : 'Trong ngưỡng'}
          />
        </Col>
      </Row>

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} className="mb-6">
        {/* Bar/Line Chart */}
        <Col xs={24} xl={15}>
          <Card
            title={
              <Space>
                <BarChartOutlined className="text-blue-500" />
                <span>Biến Động Sản Lượng Nhập – Xuất ({periodLabel})</span>
              </Space>
            }
            extra={<ZoomButton onClick={() => setZoomSection('chart')} />}
            className="shadow-sm h-full"
          >
            <ResponsiveContainer width="100%" height={320}>
              {barData.length > 8 ? (
                <LineChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <RechartTooltip content={<CustomBarTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Nhập (kg)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Xuất (kg)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <RechartTooltip content={<CustomBarTooltip />} />
                  <Legend />
                  <Bar dataKey="Nhập (kg)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Xuất (kg)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Pie Chart */}
        <Col xs={24} xl={9}>
          <Card
            title="Tỷ Trọng Tồn Kho Theo Loại Hải Sản"
            className="shadow-sm h-full"
          >
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartTooltip
                  formatter={(value: any, name: any) => [
                    `${Number(value || 0).toLocaleString('vi-VN')} kg`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="inline-block rounded-sm flex-shrink-0"
                    style={{ width: 10, height: 10, backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.name}</span>
                  <span className="ml-auto font-semibold text-gray-700">
                    {entry.value.toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Top Items Table ────────────────────────────────────────────────── */}
      <Card
        title={
          <Space>
            <BarChartOutlined className="text-orange-500" />
            <span>Top 10 Mặt Hàng Xuất/Nhập Nhiều Nhất Trong Kỳ</span>
          </Space>
        }
        className="shadow-sm"
        extra={
          <Space>
            <Text type="secondary" className="text-xs hidden sm:inline">
              {periodLabel}
            </Text>
            <ZoomButton onClick={() => setZoomSection('table')} />
          </Space>
        }
      >
        <Table<TopItem>
          dataSource={data.topItems}
          columns={TOP_ITEMS_COLUMNS}
          rowKey="name"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(_, index) => index < 3 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
          summary={(rows) => {
            const totalInKg = rows.reduce((s, r) => s + r.inboundKg, 0);
            const totalInAmount = rows.reduce((s, r) => s + (r.inboundAmount || 0), 0);
            const totalOutKg = rows.reduce((s, r) => s + r.outboundKg, 0);
            const totalOutAmount = rows.reduce((s, r) => s + (r.outboundAmount || 0), 0);
            const totalStockKg = rows.reduce((s, r) => s + r.stockKg, 0);
            const totalStockValue = rows.reduce((s, r) => s + r.stockValue, 0);
            return (
              <Table.Summary.Row className="font-bold bg-gray-50 dark:bg-slate-800">
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Tổng cộng (Top 10)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <div className="text-blue-600 font-bold">{totalInKg.toLocaleString('vi-VN')} kg</div>
                  <div className="text-[11px] text-gray-500 font-medium">{formatCurrency(totalInAmount)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <div className="text-orange-600 font-bold">{totalOutKg.toLocaleString('vi-VN')} kg</div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(totalOutAmount)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <div className="text-emerald-600 font-bold">{totalStockKg.toLocaleString('vi-VN')} kg</div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">{formatCurrency(totalStockValue)}</div>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* ── Wastage Summary ────────────────────────────────────────────────── */}
      <Card
        title="Tổng Quan Hao Hụt / Tổn Thất Theo Kỳ"
        className="shadow-sm mt-4"
        size="small"
      >
        <Row gutter={[16, 8]}>
          {data.wastage.slice(0, 8).map((w) => (
            <Col key={w.label} xs={12} sm={8} md={6} lg={4} xl={3}>
              <div className="text-center p-2 rounded border border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-400 mb-1">{w.label}</div>
                <div className="font-bold text-red-500 text-sm">{formatWeight(w.wastageKg)}</div>
                <div className={`text-xs mt-0.5 font-medium ${w.lossRate > 2 ? 'text-red-400' : 'text-green-500'}`}>
                  {w.lossRate}%
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Modal Phóng To Báo Cáo & Quay Ngang */}
      <ZoomViewerModal
        open={zoomSection !== null}
        onClose={() => setZoomSection(null)}
        title={
          zoomSection === 'chart'
            ? `Biến Động Sản Lượng Nhập – Xuất (${periodLabel})`
            : `Top 10 Mặt Hàng Xuất/Nhập Nhiều Nhất (${periodLabel})`
        }
        subtitle={`Dữ liệu thống kê tổng hợp chi tiết theo ${periodLabel}`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col p-2">
            {zoomSection === 'chart' ? (
              <div className="w-full h-full min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  {barData.length > 8 ? (
                    <LineChart data={barData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <RechartTooltip content={<CustomBarTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="Nhập (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Xuất (kg)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={barData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <RechartTooltip content={<CustomBarTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                      <Bar dataKey="Nhập (kg)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Xuất (kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <Table<TopItem>
                dataSource={data.topItems}
                columns={TOP_ITEMS_COLUMNS}
                rowKey="name"
                pagination={false}
                size="middle"
                scroll={{ x: 850, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
                rowClassName={(_, index) => index < 3 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
              />
            )}
          </div>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default ReportsPage;
