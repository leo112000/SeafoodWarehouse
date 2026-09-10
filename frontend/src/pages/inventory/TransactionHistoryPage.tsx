import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Tag, Button, Modal, DatePicker, Input, Space, Row, Col, Typography, Tabs, Badge, Tooltip } from 'antd';
import { EyeOutlined, PrinterOutlined, SearchOutlined, ReloadOutlined, FileExcelOutlined, InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import { useOutboundStore } from '../../stores/useOutboundStore';
import { exportToExcel } from '../../utils/exportUtils';
import { formatCurrency, formatWeight, formatDate } from '../../utils/format';
import { InvoiceModal } from '../../components/invoice/InvoiceModal';
import type { InvoicePrintData } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import dayjs from 'dayjs';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export interface UnifiedTransactionItem {
  id: string; // Reference / Invoice No
  type: 'INBOUND' | 'OUTBOUND';
  date: string;
  partnerName: string; // Supplier for Inbound, Customer for Outbound
  partnerType: 'SUPPLIER' | 'CUSTOMER';
  storageLocation?: string;
  reason?: string;
  totalWeightKg: number;
  subTotal?: number;
  suppliesTotal?: number;
  discountAmount?: number;
  discountReason?: string;
  totalAmount: number;
  createdBy: string;
  supplies?: Array<{
    name: string;
    packagingCode?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  items: Array<{
    batchCode: string;
    seafoodName: string;
    storageCondition?: string;
    grossWeight?: number;
    tareWeight?: number;
    netWeight: number;
    packagingCode?: string;
    packagingQty?: number;
    expiryDate?: string;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export const TransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { receipts, fetchReceipts } = useInboundStore();
  const { transactions: outboundTxs, fetchTransactions: fetchOutboundTxs } = useOutboundStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'INBOUND' | 'OUTBOUND'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [quickDatePreset, setQuickDatePreset] = useState<string>('ALL');

  const rangePresets: { label: string; value: [dayjs.Dayjs, dayjs.Dayjs] }[] = [
    { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: 'Hôm qua', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
    { label: '7 ngày qua', value: [dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')] },
    { label: '30 ngày qua', value: [dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')] },
    { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
    { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
  ];

  const applyQuickDate = (key: string) => {
    setQuickDatePreset(key);
    switch (key) {
      case 'TODAY':
        setDateRange([dayjs().startOf('day'), dayjs().endOf('day')]);
        break;
      case 'YESTERDAY':
        setDateRange([dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')]);
        break;
      case 'LAST_7_DAYS':
        setDateRange([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')]);
        break;
      case 'THIS_MONTH':
        setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
        break;
      case 'LAST_MONTH':
        setDateRange([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')]);
        break;
      case 'THIS_YEAR':
        setDateRange([dayjs().startOf('year'), dayjs().endOf('year')]);
        break;
      default:
        setDateRange(null);
        break;
    }
  };

  const [selectedTx, setSelectedTx] = useState<UnifiedTransactionItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Invoice print modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    fetchReceipts();
    fetchOutboundTxs();
  }, [fetchReceipts, fetchOutboundTxs]);

  // Transform inbound & outbound into a unified list
  const unifiedTransactions = useMemo<UnifiedTransactionItem[]>(() => {
    const inboundItems: UnifiedTransactionItem[] = (receipts || []).map((r) => {
      const items = r.items.map((item) => ({
        batchCode: item.batchCode,
        seafoodName: item.seafoodName,
        storageCondition: item.storageCondition,
        grossWeight: item.totalWeight,
        tareWeight: item.tareWeight,
        netWeight: item.netWeight,
        expiryDate: item.expiryDate,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      const totalWeightKg = items.reduce((sum, item) => sum + item.netWeight, 0);

      return {
        id: r.id,
        type: 'INBOUND',
        date: r.inboundDate,
        partnerName: r.supplier,
        partnerType: 'SUPPLIER',
        storageLocation: r.storageLocation,
        totalWeightKg,
        totalAmount: r.totalAmount,
        createdBy: user?.name ?? 'Thủ kho',
        items,
      };
    });

    const outboundItems: UnifiedTransactionItem[] = (outboundTxs || []).map((tx) => {
      const items = tx.batches.map((b) => ({
        batchCode: b.batchCode,
        seafoodName: b.species,
        storageCondition: 'Cấp đông',
        netWeight: b.quantityKg,
        expiryDate: b.expiryDate,
        unitPrice: b.unitPrice,
        totalPrice: b.amount,
      }));

      return {
        id: tx.id,
        type: 'OUTBOUND',
        date: tx.date,
        partnerName: tx.customerName,
        partnerType: 'CUSTOMER',
        reason: tx.reason,
        totalWeightKg: tx.totalWeightKg,
        subTotal: tx.subTotal,
        suppliesTotal: tx.suppliesTotal,
        discountAmount: tx.discountAmount,
        discountReason: tx.discountReason,
        totalAmount: tx.totalAmount,
        createdBy: tx.createdBy,
        supplies: tx.supplies,
        items,
      };
    });

    // Merge and sort descending by date/id
    return [...inboundItems, ...outboundItems].sort((a, b) => {
      const dateA = dayjs(a.date);
      const dateB = dayjs(b.date);
      return dateB.diff(dateA);
    });
  }, [receipts, outboundTxs, user?.name]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((tx) => {
      // 1. Tab filter
      if (activeTab === 'INBOUND' && tx.type !== 'INBOUND') return false;
      if (activeTab === 'OUTBOUND' && tx.type !== 'OUTBOUND') return false;

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(query);
        const matchesPartner = tx.partnerName.toLowerCase().includes(query);
        const matchesReason = (tx.reason || '').toLowerCase().includes(query);
        const matchesBatchOrProduct = tx.items.some(
          (i) => i.batchCode.toLowerCase().includes(query) || i.seafoodName.toLowerCase().includes(query)
        );

        if (!matchesId && !matchesPartner && !matchesReason && !matchesBatchOrProduct) {
          return false;
        }
      }

      // 3. Date range filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const txDate = dayjs(tx.date);
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');
        if (txDate.isBefore(startDate) || txDate.isAfter(endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedTransactions, activeTab, searchQuery, dateRange]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange(null);
    setQuickDatePreset('ALL');
    setActiveTab('ALL');
  };

  const handleOpenDetail = (tx: UnifiedTransactionItem) => {
    setSelectedTx(tx);
    setIsDetailModalOpen(true);
  };

  const handleOpenInvoice = (tx: UnifiedTransactionItem) => {
    const printItems = tx.items.map((item) => {
      const netW = item.netWeight || 0;
      const tareW = item.tareWeight || 0;
      const grossW = (item.grossWeight && item.grossWeight > 0) ? item.grossWeight : (netW + tareW);

      return {
        batchCode: item.batchCode,
        productName: item.seafoodName || 'Hải sản',
        storageType: item.storageCondition || 'Cấp đông',
        grossWeight: grossW,
        tareWeight: tareW,
        netWeight: netW,
        packagingCode: item.packagingCode,
        packagingQty: item.packagingQty,
        expiryDate: item.expiryDate || '',
        unitPrice: item.unitPrice,
        totalAmount: item.totalPrice || 0,
      };
    });

    const invoice: InvoicePrintData = {
      type: tx.type,
      invoiceNo: tx.id,
      date: tx.date,
      partnerName: tx.partnerName,
      storageLocation: tx.storageLocation,
      warehouseStaff: tx.createdBy,
      note: tx.reason,
      items: printItems,
      supplies: tx.supplies || [],
      subTotal: tx.subTotal,
      suppliesTotal: tx.suppliesTotal,
      discountAmount: tx.discountAmount,
      discountReason: tx.discountReason,
      totalNetWeight: tx.totalWeightKg,
      totalAmount: tx.totalAmount,
    };

    setInvoiceData(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = filteredTransactions.flatMap((tx) =>
      tx.items.map((item) => ({
        id: tx.id,
        type: tx.type === 'INBOUND' ? 'Nhập kho' : 'Xuất kho',
        date: formatDate(tx.date),
        partner: tx.partnerName,
        partnerRole: tx.partnerType === 'SUPPLIER' ? 'Nhà cung cấp' : 'Khách hàng',
        reason: tx.reason || (tx.type === 'INBOUND' ? 'Nhập kho hải sản' : 'Bán hàng'),
        createdBy: tx.createdBy,
        batchCode: item.batchCode,
        seafoodName: item.seafoodName,
        netWeight: item.netWeight,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }))
    );

    exportToExcel(
      exportData,
      [
        { header: 'Mã Phiếu', key: 'id', width: 20 },
        { header: 'Loại Giao Dịch', key: 'type', width: 15 },
        { header: 'Ngày Thực Hiện', key: 'date', width: 15 },
        { header: 'Đối Tác', key: 'partner', width: 25 },
        { header: 'Vai Trò', key: 'partnerRole', width: 15 },
        { header: 'Lý Do / Ghi Chú', key: 'reason', width: 20 },
        { header: 'Người Lập Phiếu', key: 'createdBy', width: 18 },
        { header: 'Mã Lô', key: 'batchCode', width: 18 },
        { header: 'Tên Hải Sản', key: 'seafoodName', width: 22 },
        { header: 'Số Kg Thực', key: 'netWeight', width: 15 },
        { header: 'Đơn Giá (VNĐ)', key: 'unitPrice', width: 15, formatter: (val) => formatCurrency(val) },
        { header: 'Thành Tiền (VNĐ)', key: 'totalPrice', width: 18, formatter: (val) => formatCurrency(val) },
      ],
      'LichSu_GiaoDich_NhapXuat_Kho'
    );
  };

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: UnifiedTransactionItem) => (
        <span
          className="font-bold text-sky-600 dark:text-sky-400 cursor-pointer hover:underline"
          onClick={() => handleOpenDetail(record)}
        >
          {id}
        </span>
      ),
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'INBOUND' | 'OUTBOUND') => (
        <Tag color={type === 'INBOUND' ? 'blue' : 'green'} className="font-semibold px-2 py-0.5">
          {type === 'INBOUND' ? '📥 NHẬP KHO' : '📤 XUẤT KHO'}
        </Tag>
      ),
    },
    {
      title: 'Ngày thực hiện',
      dataIndex: 'date',
      key: 'date',
      render: (dateStr: string) => formatDate(dateStr).split(' ')[0],
      responsive: ['sm'] as any,
    },
    {
      title: 'Đối tác (NCC / Khách hàng)',
      dataIndex: 'partnerName',
      key: 'partnerName',
      render: (name: string, record: UnifiedTransactionItem) => (
        <div>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{name}</span>
          <div className="text-xs text-gray-400">
            {record.partnerType === 'SUPPLIER' ? 'Nhà cung cấp' : 'Khách hàng'}
          </div>
        </div>
      ),
    },
    {
      title: 'Khối lượng (Kg)',
      dataIndex: 'totalWeightKg',
      key: 'totalWeightKg',
      render: (weight: number) => formatWeight(weight),
    },
    {
      title: 'Tổng thành tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => (
        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: 'Người lập',
      dataIndex: 'createdBy',
      key: 'createdBy',
      responsive: ['md'] as any,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: UnifiedTransactionItem) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(record)}
          >
            Chi tiết
          </Button>
          <Button
            type="text"
            icon={<PrinterOutlined />}
            onClick={() => handleOpenInvoice(record)}
            style={{ color: '#0ea5e9' }}
          >
            In phiếu
          </Button>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: 'Tên hải sản',
      dataIndex: 'seafoodName',
      key: 'seafoodName',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Mã lô (Batch)',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Bảo quản',
      dataIndex: 'storageCondition',
      key: 'storageCondition',
      render: (cond: string) => {
        let color = 'cyan';
        if (cond === 'Ướp đá') color = 'blue';
        if (cond === 'Cấp đông') color = 'purple';
        return <Tag color={color}>{cond || 'Bảo quản lạnh'}</Tag>;
      },
      responsive: ['sm'] as any,
    },
    {
      title: 'Khối lượng thực',
      dataIndex: 'netWeight',
      key: 'netWeight',
      render: (weight: number) => formatWeight(weight),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price: number) => formatCurrency(price),
      responsive: ['md'] as any,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (total: number) => (
        <span className="font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(total)}</span>
      ),
    },
  ];

  const inboundCount = useMemo(() => unifiedTransactions.filter((t) => t.type === 'INBOUND').length, [unifiedTransactions]);
  const outboundCount = useMemo(() => unifiedTransactions.filter((t) => t.type === 'OUTBOUND').length, [unifiedTransactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Lịch Sử Giao Dịch
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => navigate('/inventory/inbound')}
            size="middle"
            className="bg-blue-600 hover:bg-blue-700 font-medium"
          >
            <span className="hidden sm:inline">Nhập kho mới</span>
            <span className="sm:hidden">Nhập</span>
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => navigate('/inventory/outbound')}
            size="middle"
            className="bg-emerald-600 hover:bg-emerald-700 border-none font-medium"
          >
            <span className="hidden sm:inline">Xuất kho mới</span>
            <span className="sm:hidden">Xuất</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Search Filters */}
      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          items={[
            {
              key: 'ALL',
              label: (
                <span>
                  Tất cả<Badge count={unifiedTransactions.length} overflowCount={999} showZero className="ml-2" color="blue" />
                </span>
              ),
            },
            {
              key: 'INBOUND',
              label: (
                <span>
                  📥 Nhập kho<Badge count={inboundCount} overflowCount={999} showZero className="ml-2" color="cyan" />
                </span>
              ),
            },
            {
              key: 'OUTBOUND',
              label: (
                <span>
                  📤 Xuất kho<Badge count={outboundCount} overflowCount={999} showZero className="ml-2" color="green" />
                </span>
              ),
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Lọc nhanh thời gian:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'TODAY', label: 'Hôm nay' },
            { key: 'YESTERDAY', label: 'Hôm qua' },
            { key: 'LAST_7_DAYS', label: '7 ngày qua' },
            { key: 'THIS_MONTH', label: 'Tháng này' },
            { key: 'LAST_MONTH', label: 'Tháng trước' },
            { key: 'THIS_YEAR', label: 'Năm nay' },
          ].map((preset) => (
            <Tag.CheckableTag
              key={preset.key}
              checked={quickDatePreset === preset.key}
              onChange={() => applyQuickDate(preset.key)}
              className="px-3 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-700 cursor-pointer"
            >
              {preset.label}
            </Tag.CheckableTag>
          ))}
        </div>

        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo Mã phiếu, Đối tác, Mã lô, Tên hải sản..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="middle"
              allowClear
            />
          </Col>
          <Col xs={14} sm={12} md={8}>
            <RangePicker
              className="w-full"
              size="middle"
              value={dateRange}
              presets={rangePresets}
              onChange={(dates) => {
                setDateRange(dates as any);
                setQuickDatePreset('CUSTOM');
              }}
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={10} sm={12} md={6}>
            <div className="flex items-center justify-end gap-1.5 w-full">
              {(searchQuery || dateRange || activeTab !== 'ALL') && (
                <Tooltip title="Đặt lại bộ lọc">
                  <Button icon={<ReloadOutlined />} onClick={handleResetFilters} size="middle" />
                </Tooltip>
              )}
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                className="bg-emerald-600 hover:bg-emerald-700 border-none flex-1 sm:flex-initial"
                onClick={handleExportExcel}
                size="middle"
              >
                Xuất Excel
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card
        title="📋 Danh Sách Giao Dịch Chi Tiết"
        extra={<ZoomButton onClick={() => setIsZoomed(true)} />}
        className="shadow-sm rounded-2xl"
      >
        <Table
          dataSource={filteredTransactions}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết phiếu giao dịch: ${selectedTx?.id}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
            onClick={() => {
              if (selectedTx) {
                setIsDetailModalOpen(false);
                handleOpenInvoice(selectedTx);
              }
            }}
          >
            In Phiếu
          </Button>,
        ]}
      >
        {selectedTx && (
          <div className="mt-4 space-y-4">
            <Card type="inner" size="small" className="bg-gray-50 dark:bg-slate-900 border-none">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">LOẠI GIAO DỊCH</div>
                  <Tag color={selectedTx.type === 'INBOUND' ? 'blue' : 'green'} className="font-bold mt-1">
                    {selectedTx.type === 'INBOUND' ? 'NHẬP KHO' : 'XUẤT KHO'}
                  </Tag>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">ĐỐI TÁC (NCC / KHÁCH HÀNG)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedTx.partnerName}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">NGÀY THỰC HIỆN</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedTx.date}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">TỔNG THÀNH TIỀN</div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(selectedTx.totalAmount)}
                  </div>
                </Col>
              </Row>
            </Card>

            <div>
              <Title level={5} className="mb-2">1. Chi tiết danh sách hải sản &amp; lô hàng</Title>
              <Table
                dataSource={selectedTx.items}
                columns={itemColumns}
                rowKey="batchCode"
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </div>

            {selectedTx.supplies && selectedTx.supplies.length > 0 && (
              <div>
                <Title level={5} className="mb-2">2. Vật phẩm bán kèm &amp; Phụ phí đóng gói</Title>
                <Table
                  dataSource={selectedTx.supplies}
                  columns={[
                    {
                      title: 'STT',
                      key: 'stt',
                      width: 60,
                      align: 'center' as const,
                      render: (_: any, __: any, index: number) => index + 1,
                    },
                    { title: 'Tên vật phẩm kèm / Dịch vụ', dataIndex: 'name', key: 'name' },
                    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', render: (u: string) => u || 'Cái' },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity' },
                    { title: 'Đơn giá (VNĐ)', dataIndex: 'unitPrice', key: 'unitPrice', render: (p: number) => formatCurrency(p) },
                    { title: 'Thành tiền (VNĐ)', dataIndex: 'totalAmount', key: 'totalAmount', render: (a: number) => formatCurrency(a) },
                  ]}
                  rowKey="name"
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                />
              </div>
            )}

            {selectedTx.discountAmount !== undefined && selectedTx.discountAmount > 0 && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center text-sm">
                <span className="text-red-700 font-medium">
                  Chiết khấu / Giảm giá áp dụng {selectedTx.discountReason ? `(${selectedTx.discountReason})` : ''}:
                </span>
                <span className="font-bold text-red-600">
                  -{formatCurrency(selectedTx.discountAmount)}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Invoice Print Modal */}
      <InvoiceModal
        open={isInvoiceModalOpen}
        data={invoiceData}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Modal Phóng To Bảng Lịch Sử & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="📋 Lịch Sử Giao Dịch Nhập - Xuất Kho"
        subtitle={`Hiển thị ${filteredTransactions.length} giao dịch chi tiết`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              dataSource={filteredTransactions}
              columns={columns}
              rowKey="id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              scroll={{ x: 1000, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              size="middle"
            />
          </div>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default TransactionHistoryPage;
