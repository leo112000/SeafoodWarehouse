import React, { useState, useMemo, useCallback } from 'react';
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
  getReportData,
  type ReportMode,
  type ReportFilter,
  type TopItem,
  type TimeSeriesPoint,
  type StockByCategory,
  type ReportData,
} from '../../services/mockReportData';
import { reportService } from '../../services/reportService';
import { formatCurrency, formatWeight } from '../../utils/format';
import { exportReportToExcel } from '../../utils/excelExporter';

dayjs.extend(isoWeek);

const { Title, Paragraph, Text } = Typography;
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

const MODE_LABELS: Record<ReportMode, string> = {
  week: 'theo Tuần',
  month: 'theo Tháng',
  quarter: 'theo Quý',
  year: 'theo Năm',
  custom: 'Tùy chỉnh',
};

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
    className="shadow-md h-full"
    style={{ borderTop: `4px solid ${color}` }}
    bodyStyle={{ padding: '20px' }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</div>
      <div style={{ color, fontSize: 24, opacity: 0.85 }}>{icon}</div>
    </div>
    <div className="mb-1">
      <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{primaryValue}</span>
      <span className="text-xs text-gray-400 ml-1">{primaryLabel}</span>
    </div>
    <div className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-3">
      {secondaryValue}
      <span className="text-xs text-gray-400 ml-1">{secondaryLabel}</span>
    </div>
    {trendText && (
      <div className={`text-xs font-medium flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
        }`}>
        {trend === 'up' ? <ArrowUpOutlined /> : trend === 'down' ? <ArrowDownOutlined /> : null}
        {trendText}
      </div>
    )}
  </Card>
);

// ─── Top Items Table Columns ──────────────────────────────────────────────────

const TOP_ITEMS_COLUMNS: ColumnsType<TopItem> = [
  {
    title: '#',
    dataIndex: 'rank',
    key: 'rank',
    width: 48,
    render: (rank: number) => {
      const colors: Record<number, string> = { 1: '#f59e0b', 2: '#9ca3af', 3: '#b45309' };
      return (
        <span
          style={{ color: colors[rank] ?? '#6b7280', fontWeight: rank <= 3 ? 700 : 500 }}
        >
          {rank <= 3 ? '★' : ''} {rank}
        </span>
      );
    },
  },
  {
    title: 'Tên Mặt Hàng',
    dataIndex: 'name',
    key: 'name',
    render: (name: string, record: TopItem) => (
      <div>
        <div className="font-semibold text-gray-800 dark:text-gray-200">{name}</div>
        <Tag color="blue" className="text-xs mt-0.5">{record.categoryName}</Tag>
      </div>
    ),
  },
  {
    title: 'Nhập (kg)',
    dataIndex: 'inboundKg',
    key: 'inboundKg',
    align: 'right',
    render: (val: number) => (
      <span className="text-blue-600 font-semibold">{val.toLocaleString('vi-VN')}</span>
    ),
    sorter: (a, b) => a.inboundKg - b.inboundKg,
  },
  {
    title: 'Xuất (kg)',
    dataIndex: 'outboundKg',
    key: 'outboundKg',
    align: 'right',
    render: (val: number) => (
      <span className="text-orange-600 font-semibold">{val.toLocaleString('vi-VN')}</span>
    ),
    sorter: (a, b) => a.outboundKg - b.outboundKg,
  },
  {
    title: 'Tồn (kg)',
    dataIndex: 'stockKg',
    key: 'stockKg',
    align: 'right',
    render: (val: number) => (
      <span className={val < 50 ? 'text-red-500 font-bold' : 'text-green-600 font-semibold'}>
        {val.toLocaleString('vi-VN')}
      </span>
    ),
    sorter: (a, b) => a.stockKg - b.stockKg,
  },
  {
    title: 'Giá Trị Tồn',
    dataIndex: 'stockValue',
    key: 'stockValue',
    align: 'right',
    render: (val: number) => (
      <span className="font-medium">{formatCurrency(val)}</span>
    ),
    sorter: (a, b) => a.stockValue - b.stockValue,
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

  const filter: ReportFilter = useMemo(() => {
    switch (mode) {
      case 'week': return { mode, singleValue: selectedWeek };
      case 'month': return { mode, singleValue: selectedMonth };
      case 'quarter': return { mode, singleValue: selectedQuarter };
      case 'year': return { mode, singleValue: selectedYear };
      case 'custom': return {
        mode,
        startDate: customRange?.[0]?.format('YYYY-MM-DD'),
        endDate: customRange?.[1]?.format('YYYY-MM-DD'),
      };
      default: return { mode: 'month', singleValue: selectedMonth };
    }
  }, [mode, selectedWeek, selectedMonth, selectedQuarter, selectedYear, customRange]);

  const initialMockData = useMemo(() => getReportData(filter), [filter]);
  const [data, setData] = useState<ReportData>(initialMockData);

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
          setData(initialMockData);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mode, initialMockData]);

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
      <div className="mb-6">
        <Title level={2} className="m-0">Báo Cáo Thống Kê Tổng Hợp</Title>
        <Paragraph type="secondary">
          Phân tích sản lượng nhập – xuất, tồn kho và hao hụt hải sản {MODE_LABELS[mode]}.
        </Paragraph>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────── */}
      <Card className="shadow-sm mb-6" bodyStyle={{ padding: '16px 20px' }}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Mode selector */}
          <Radio.Group
            value={mode}
            onChange={handleModeChange}
            optionType="button"
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="week">Tuần</Radio.Button>
            <Radio.Button value="month">Tháng</Radio.Button>
            <Radio.Button value="quarter">Quý</Radio.Button>
            <Radio.Button value="year">Năm</Radio.Button>
            <Radio.Button value="custom">Tùy Chỉnh</Radio.Button>
          </Radio.Group>

          {/* Period sub-selector */}
          <div className="flex items-center gap-2">
            {mode === 'week' && (
              <>
                <Select
                  value={selectedWeek}
                  onChange={setSelectedWeek}
                  options={WEEK_OPTIONS}
                  className="w-32"
                  showSearch
                />
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={YEAR_OPTIONS}
                  className="w-28"
                />
              </>
            )}
            {mode === 'month' && (
              <>
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  options={MONTH_OPTIONS}
                  className="w-32"
                />
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={YEAR_OPTIONS}
                  className="w-28"
                />
              </>
            )}
            {mode === 'quarter' && (
              <>
                <Select
                  value={selectedQuarter}
                  onChange={setSelectedQuarter}
                  options={QUARTER_OPTIONS}
                  className="w-44"
                />
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={YEAR_OPTIONS}
                  className="w-28"
                />
              </>
            )}
            {mode === 'year' && (
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                options={YEAR_OPTIONS}
                className="w-36"
              />
            )}
            {mode === 'custom' && (
              <RangePicker
                value={customRange}
                onChange={(dates) => setCustomRange(dates as [Dayjs | null, Dayjs | null] | null)}
                format="DD/MM/YYYY"
                className="w-72"
                placeholder={['Từ ngày', 'Đến ngày']}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="ml-auto flex gap-2">
            <Tooltip title="Xuất báo cáo ra file Excel">
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                Xuất Excel
              </Button>
            </Tooltip>
            <Tooltip title="In báo cáo">
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                In Báo Cáo
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400">
          <BarChartOutlined className="mr-1" />
          Đang xem: <span className="font-semibold text-sky-600">{periodLabel}</span>
        </div>
      </Card>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Tổng Nhập Kho"
            primaryValue={summary.totalInboundKg.toLocaleString('vi-VN')}
            primaryLabel="kg"
            secondaryValue={formatCurrency(summary.totalInboundAmount)}
            secondaryLabel="tổng tiền nhập"
            icon={<ArrowDownOutlined />}
            color="#3b82f6"
            trend="up"
            trendText="Tăng so với kỳ trước"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Tổng Xuất Kho"
            primaryValue={summary.totalOutboundKg.toLocaleString('vi-VN')}
            primaryLabel="kg"
            secondaryValue={formatCurrency(summary.totalOutboundAmount)}
            secondaryLabel="doanh thu"
            icon={<ArrowUpOutlined />}
            color="#10b981"
            trend="up"
            trendText="Tăng so với kỳ trước"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Tồn Kho Hiện Tại"
            primaryValue={summary.stockKg.toLocaleString('vi-VN')}
            primaryLabel="kg tồn"
            secondaryValue={formatCurrency(summary.stockValue)}
            secondaryLabel="giá trị tồn kho"
            icon={<RiseOutlined />}
            color="#8b5cf6"
            trend="neutral"
            trendText="Ổn định"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Hao Hụt / Tổn Thất"
            primaryValue={summary.wastageKg.toLocaleString('vi-VN')}
            primaryLabel="kg hỏng"
            secondaryValue={`${summary.lossRate}%`}
            secondaryLabel="tỷ lệ tổn thất"
            icon={<FallOutlined />}
            color="#ef4444"
            trend={summary.lossRate > 2 ? 'down' : 'up'}
            trendText={summary.lossRate > 2 ? 'Cần kiểm soát' : 'Trong ngưỡng an toàn'}
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
          <Text type="secondary" className="text-xs">
            {periodLabel}
          </Text>
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
            const totalIn = rows.reduce((s, r) => s + r.inboundKg, 0);
            const totalOut = rows.reduce((s, r) => s + r.outboundKg, 0);
            const totalStock = rows.reduce((s, r) => s + r.stockKg, 0);
            const totalVal = rows.reduce((s, r) => s + r.stockValue, 0);
            return (
              <Table.Summary.Row className="font-bold bg-gray-50">
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Tổng cộng (Top 10)</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="text-blue-600">{totalIn.toLocaleString('vi-VN')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span className="text-orange-600">{totalOut.toLocaleString('vi-VN')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span className="text-green-600">{totalStock.toLocaleString('vi-VN')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <span>{formatCurrency(totalVal)}</span>
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
    </div>
  );
};

export default ReportsPage;
