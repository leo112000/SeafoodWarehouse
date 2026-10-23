import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, DatePicker, Input, Row, Col, Typography, Tabs, Pagination, Tooltip, App } from 'antd';
import { PrinterOutlined, SearchOutlined, ReloadOutlined, InboxOutlined, UploadOutlined, CloseCircleOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '@/utils/exportUtils';
import { ExportExcelButton } from '@/components/common/ExportExcelButton';
import { formatCurrency, formatWeight, formatDate, formatDateTime } from '@/utils/format';
import { InvoiceModal } from '@/components/invoice/InvoiceModal';
import type { InvoicePrintData } from '@/types';
import {
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  type TransactionType,
} from '@/constants';
import { useTabStore } from '@/stores/useTabStore';
import { signalRService } from '@/services/signalrService';
import { transactionService } from '@/services/transactionService';
import { useTransactionHistoryStore, type UnifiedTransactionItem } from '@/stores/useTransactionHistoryStore';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export type { UnifiedTransactionItem };

export const TransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const {
    items,
    totalCount,
    loading,
    pageNumber,
    pageSize,
    type,
    status,
    search,
    fromDate,
    toDate,
    fetchTransactions,
    setFilter,
    cancelTransaction,
  } = useTransactionHistoryStore();

  const [searchInput, setSearchInput] = useState(search || '');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(
    fromDate && toDate ? [dayjs(fromDate), dayjs(toDate)] : null
  );
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

  // Debounce search input
  useEffect(() => {
    setSearchInput(search || '');
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setFilter({ search: searchInput, pageNumber: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null, preset = 'CUSTOM') => {
    setDateRange(dates);
    setQuickDatePreset(preset);
    setFilter({
      fromDate: dates && dates[0] ? dates[0].startOf('day').toISOString() : undefined,
      toDate: dates && dates[1] ? dates[1].endOf('day').toISOString() : undefined,
      pageNumber: 1,
    });
  };

  const applyQuickDate = (key: string) => {
    switch (key) {
      case 'TODAY':
        handleDateChange([dayjs().startOf('day'), dayjs().endOf('day')], key);
        break;
      case 'YESTERDAY':
        handleDateChange([dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')], key);
        break;
      case 'LAST_7_DAYS':
        handleDateChange([dayjs().subtract(7, 'day').startOf('day'), dayjs().endOf('day')], key);
        break;
      case 'THIS_MONTH':
        handleDateChange([dayjs().startOf('month'), dayjs().endOf('month')], key);
        break;
      case 'LAST_MONTH':
        handleDateChange([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')], key);
        break;
      case 'THIS_YEAR':
        handleDateChange([dayjs().startOf('year'), dayjs().endOf('year')], key);
        break;
      default:
        handleDateChange(null, 'ALL');
        break;
    }
  };

  const [selectedTx, setSelectedTx] = useState<UnifiedTransactionItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invoice print modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Cancel transaction modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  const isCancelingRef = React.useRef(false);

  const activeKey = useTabStore((state) => state.activeKey);
  const isFirstMountRef = React.useRef(true);

  // Lần đầu mount hoặc khi chuyển tab quay lại trang Lịch sử giao dịch
  useEffect(() => {
    const isHistoryTab = activeKey === '/inventory/history' || activeKey === '/inventory/inbound-history' || activeKey === '/inventory/outbound-history';
    if (isHistoryTab || isFirstMountRef.current) {
      isFirstMountRef.current = false;
      fetchTransactions();
    }
  }, [activeKey, fetchTransactions]);

  // Lắng nghe SignalR real-time (tạo nhập, tạo xuất, hủy nhập, hủy xuất)
  useEffect(() => {
    const unsubStock = signalRService.onStockUpdated(() => {
      fetchTransactions();
    });
    const unsubNotif = signalRService.onNotification(() => {
      fetchTransactions();
    });
    return () => {
      unsubStock();
      unsubNotif();
    };
  }, [fetchTransactions]);

  // Tự động refetch khi người dùng focus lại trình duyệt
  useEffect(() => {
    const handleFocus = () => {
      const isHistoryTab = activeKey === '/inventory/history' || activeKey === '/inventory/inbound-history' || activeKey === '/inventory/outbound-history';
      if (isHistoryTab) {
        fetchTransactions();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeKey, fetchTransactions]);

  const handleConfirmCancel = async () => {
    if (!selectedTx) return;
    if (isCancelingRef.current) return;
    if (!cancelReason.trim()) {
      message.error('Vui lòng nhập lý do hủy phiếu.');
      return;
    }

    isCancelingRef.current = true;
    try {
      setCanceling(true);
      await cancelTransaction(selectedTx.id, cancelReason.trim(), selectedTx.type);

      message.success(`Đã hủy phiếu ${selectedTx.id} và hoàn nguyên tồn kho thành công.`);
      setCancelModalOpen(false);
      setIsDetailModalOpen(false);
      setCancelReason('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi hủy phiếu.';
      message.error(msg);
    } finally {
      isCancelingRef.current = false;
      setCanceling(false);
    }
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDateRange(null);
    setQuickDatePreset('ALL');
    setFilter({
      type: 'ALL',
      status: 'ALL',
      search: '',
      fromDate: undefined,
      toDate: undefined,
      pageNumber: 1,
    });
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
      note: (tx as any).reason,
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

  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang tải dữ liệu xuất Excel...', key: 'exportExcel' });
      const fullRes = await transactionService.getTransactionHistory({
        pageNumber: 1,
        pageSize: 2000,
        type,
        status,
        search,
        fromDate,
        toDate,
      });
      const dataToExport = fullRes.items && fullRes.items.length > 0 ? fullRes.items : items;
      const exportData = dataToExport.flatMap((tx) =>
        tx.items.map((item: any) => ({
          id: tx.id,
          type: tx.type === 'INBOUND' ? 'Nhập kho' : 'Xuất kho',
          date: formatDate(tx.date),
          partner: tx.partnerName,
          partnerRole: tx.partnerType === 'SUPPLIER' ? 'Nhà cung cấp' : 'Khách hàng',
          itemCount: tx.items.length,
          reason: (tx.type === 'INBOUND' ? 'Nhập kho hải sản' : 'Bán hàng'),
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
          { header: 'Số Mặt Hàng', key: 'itemCount', width: 15 },
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
      message.success({ content: 'Xuất Excel thành công!', key: 'exportExcel' });
    } catch (err) {
      message.error({ content: 'Không thể xuất Excel.', key: 'exportExcel' });
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (pageNumber - 1) * pageSize + index + 1,
    },
    {
      title: 'Mã phiếu',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: UnifiedTransactionItem) => (
        <span
          className={`font-bold cursor-pointer hover:underline ${
            record.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : 'text-sky-600 dark:text-sky-400'
          }`}
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
      render: (txType: TransactionType, record: UnifiedTransactionItem) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag color={txType === TRANSACTION_TYPE.INBOUND ? 'blue' : 'green'} className="font-semibold px-2 py-0.5 m-0">
            {txType === TRANSACTION_TYPE.INBOUND ? '📥 NHẬP KHO' : '📤 XUẤT KHO'}
          </Tag>
          {record.status === TRANSACTION_STATUS.CANCELLED && (
            <Tag color="error" className="font-bold text-xs px-1.5 py-0.5 m-0 border-0">
              ĐÃ HỦY
            </Tag>
          )}
          {record.type === TRANSACTION_TYPE.INBOUND && record.status !== TRANSACTION_STATUS.CANCELLED && record.hasExports && (
            <Tooltip title={`Lô hàng đã phát sinh xuất bán trong: ${record.exportRefNos?.join(', ') || 'các phiếu xuất'}`}>
              <Tag color="warning" className="font-bold text-[11px] px-1.5 py-0.5 m-0 border-0 cursor-help">
                ĐÃ XUẤT HÀNG
              </Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày thực hiện',
      dataIndex: 'date',
      key: 'date',
      render: (dateStr: string) => <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{formatDateTime(dateStr)}</span>,
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
      title: 'Số mặt hàng',
      key: 'itemCount',
      align: 'center' as const,
      width: 135,
      render: (_: unknown, record: UnifiedTransactionItem) => {
        const count = record.items?.length || 1;
        return (
          <Tooltip
            title={
              <div className="space-y-1.5 py-1 max-w-[280px]">
                <div className="font-bold text-xs border-b border-slate-600 pb-1 text-slate-200 flex justify-between">
                  <span>Chi tiết danh sách hàng:</span>
                  <span className="text-sky-300 font-mono">{count} món</span>
                </div>
                {record.items && record.items.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {record.items.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-100 flex justify-between gap-3 items-center">
                        <span className="truncate">• {item.seafoodName || 'Hải sản'}</span>
                        <span className="text-sky-300 font-mono shrink-0 font-medium">
                          {formatWeight(item.netWeight)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-300">Không có dữ liệu chi tiết</div>
                )}
                {record.supplies && record.supplies.length > 0 && (
                  <div className="pt-1 border-t border-slate-700 text-[11px] text-amber-300 flex justify-between">
                    <span>Vật tư / phụ phẩm kèm:</span>
                    <span className="font-mono">+{record.supplies.length} loại</span>
                  </div>
                )}
              </div>
            }
          >
            <Tag
              color={count > 1 ? 'purple' : 'cyan'}
              className="font-semibold text-xs cursor-pointer m-0 px-2.5 py-0.5 inline-flex items-center gap-1"
            >
              <span>📦</span>
              <span>{count} mặt hàng</span>
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Khối lượng (Kg)',
      dataIndex: 'totalWeightKg',
      key: 'totalWeightKg',
      render: (weight: number, record: UnifiedTransactionItem) => (
        <span className={record.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : ''}>
          {formatWeight(weight)}
        </span>
      ),
    },
    {
      title: 'Tổng thành tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number, record: UnifiedTransactionItem) => (
        <span className={record.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : 'font-semibold text-green-600 dark:text-green-400'}>
          {formatCurrency(amount)}
        </span>
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
      width: 110,
      align: 'center' as const,
      render: (_: unknown, record: UnifiedTransactionItem) => (
        <Button
          type="text"
          icon={<PrinterOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenInvoice(record);
          }}
          className="text-sky-600 dark:text-sky-400 hover:text-sky-500 font-medium"
        >
          In phiếu
        </Button>
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
          activeKey={type}
          onChange={(key) => setFilter({ type: key as any, pageNumber: 1 })}
          items={[
            {
              key: 'ALL',
              label: 'Tất cả',
            },
            {
              key: 'INBOUND',
              label: '📥 Nhập kho',
            },
            {
              key: 'OUTBOUND',
              label: '📤 Xuất kho',
            },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-1.5">
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
                className="px-2.5 py-0.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                {preset.label}
              </Tag.CheckableTag>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">Trạng thái:</span>
            <Tag.CheckableTag
              checked={status === 'ALL'}
              onChange={() => setFilter({ status: 'ALL', pageNumber: 1 })}
              className="px-2.5 py-0.5 text-xs rounded-full cursor-pointer"
            >
              Tất cả
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={status === 'ACTIVE'}
              onChange={() => setFilter({ status: 'ACTIVE', pageNumber: 1 })}
              className="px-2.5 py-0.5 text-xs rounded-full cursor-pointer text-emerald-700 dark:text-emerald-400"
            >
              Hiệu lực
            </Tag.CheckableTag>
            <Tag.CheckableTag
              checked={status === 'CANCELLED'}
              onChange={() => setFilter({ status: 'CANCELLED', pageNumber: 1 })}
              className="px-2.5 py-0.5 text-xs rounded-full cursor-pointer text-red-600 dark:text-red-400"
            >
              Đã hủy
            </Tag.CheckableTag>
          </div>
        </div>

        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo Mã phiếu, Đối tác, Mã lô, Tên hải sản..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size="middle"
              allowClear
            />
          </Col>
          <Col xs={24} sm={14} md={8}>
            <RangePicker
              className="w-full"
              size="middle"
              value={dateRange}
              presets={rangePresets}
              onChange={(dates) => {
                handleDateChange(dates as any, 'CUSTOM');
              }}
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={24} sm={10} md={6}>
            <div className="flex items-center justify-end gap-1.5 w-full">
              {(searchInput || dateRange || type !== 'ALL' || status !== 'ALL') && (
                <Button icon={<ReloadOutlined />} onClick={handleResetFilters} size="middle">
                  Đặt lại bộ lọc
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main Table & Mobile Card View */}
      <Card
        title="📋 Danh Sách Giao Dịch Chi Tiết"
        extra={
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-2.5 py-1 rounded-lg hidden md:inline-flex items-center gap-1.5 font-medium">
              💡 <span>Nhấp vào dòng để xem chi tiết phiếu</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">Tổng {totalCount} giao dịch</span>
            <ExportExcelButton onExport={handleExportExcel} />
          </div>
        }
        className="shadow-sm rounded-2xl overflow-hidden"
        styles={{ body: { padding: '12px' } }}
      >
        {/* Mobile View: Dạng Card Chạm Lướt Kiểu App Hiện Đại */}
        <div className="block sm:hidden space-y-2.5">
          {items.length === 0 && !loading ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              Không tìm thấy giao dịch nào phù hợp
            </div>
          ) : (
            items.map((tx) => (
              <div
                key={tx.id}
                onClick={() => handleOpenDetail(tx)}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer"
              >
                {/* Header card: Tag loại phiếu + Mã số + Thời gian */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag
                      color={tx.type === TRANSACTION_TYPE.INBOUND ? 'blue' : 'green'}
                      className="font-bold text-[11px] m-0 px-1.5 py-0.5 border-0"
                    >
                      {tx.type === TRANSACTION_TYPE.INBOUND ? '📥 NHẬP KHO' : '📤 XUẤT KHO'}
                    </Tag>
                    {tx.status === TRANSACTION_STATUS.CANCELLED && (
                      <Tag color="error" className="font-bold text-[10px] m-0 px-1.5 py-0.5 border-0">
                        ĐÃ HỦY
                      </Tag>
                    )}
                    {tx.type === TRANSACTION_TYPE.INBOUND && tx.status !== TRANSACTION_STATUS.CANCELLED && tx.hasExports && (
                      <Tag color="warning" className="font-bold text-[10px] m-0 px-1.5 py-0.5 border-0">
                        ĐÃ XUẤT
                      </Tag>
                    )}
                    <span className={`font-bold text-xs font-mono tracking-tight ${tx.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : 'text-sky-600 dark:text-sky-400'}`}>
                      {tx.id}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {formatDateTime(tx.date)}
                  </span>
                </div>

                {/* Body card: Tên sản phẩm + Đối tác */}
                <div className="flex items-start justify-between gap-2 text-xs mb-2">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{tx.items?.[0]?.seafoodName || 'Hải sản'}</span>
                      <Tag
                        color={(tx.items?.length || 1) > 1 ? 'purple' : 'cyan'}
                        className="text-[10px] font-semibold m-0 px-1.5 py-0"
                      >
                        📦 {tx.items?.length || 1} món
                      </Tag>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      👤 {tx.partnerName || 'Khách vãng lai'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-bold text-xs ${tx.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {formatWeight(tx.totalWeightKg)}
                    </div>
                    <div className={`font-black text-xs ${tx.status === TRANSACTION_STATUS.CANCELLED ? 'line-through text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(tx.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Footer card: Nút thao tác nhanh */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">
                    {tx.createdBy ? `NV: ${tx.createdBy}` : 'Hệ thống'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInvoice(tx);
                      }}
                      className="text-sky-600 dark:text-sky-400 font-medium hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                    >
                      <PrinterOutlined /> In phiếu
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5">
                      Chi tiết &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Phân trang Mobile */}
          {totalCount > pageSize && (
            <div className="flex justify-center pt-2">
              <Pagination
                size="small"
                current={pageNumber}
                pageSize={pageSize}
                total={totalCount}
                onChange={(page, newSize) => setFilter({ pageNumber: page, pageSize: newSize })}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Desktop / Tablet View: Bảng chi tiết đầy đủ cột */}
        <div className="hidden sm:block">
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            loading={loading}
            onRow={(record: UnifiedTransactionItem) => ({
              onClick: () => handleOpenDetail(record),
              className: `cursor-pointer transition-colors ${
                record.status === TRANSACTION_STATUS.CANCELLED
                  ? 'opacity-70 bg-red-50/20 dark:bg-red-950/15 hover:bg-red-50/40 dark:hover:bg-red-950/30'
                  : 'hover:bg-sky-50/60 dark:hover:bg-slate-800/60'
              }`,
            })}
            pagination={{
              current: pageNumber,
              pageSize: pageSize,
              total: totalCount,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              onChange: (page, newSize) => setFilter({ pageNumber: page, pageSize: newSize }),
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>Chi tiết phiếu giao dịch:</span>
            <span className="font-mono text-sky-600 dark:text-sky-400">{selectedTx?.id}</span>
            {selectedTx?.status === TRANSACTION_STATUS.CANCELLED && (
              <Tag color="error" className="font-bold text-xs m-0 px-2 py-0.5">
                ĐÃ HỦY
              </Tag>
            )}
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
          selectedTx && selectedTx.status !== TRANSACTION_STATUS.CANCELLED && (
            <Tooltip
              title={
                selectedTx.type === TRANSACTION_TYPE.INBOUND && selectedTx.hasExports
                  ? `Không thể hủy phiếu nhập do đã phát sinh xuất bán (${selectedTx.exportRefNos?.join(', ') || 'đã xuất kho'}). Cần hủy phiếu xuất trước.`
                  : undefined
              }
            >
              <span>
                <Button
                  key="cancel"
                  danger
                  disabled={selectedTx.type === 'INBOUND' && selectedTx.hasExports}
                  icon={<CloseCircleOutlined />}
                  onClick={() => setCancelModalOpen(true)}
                >
                  Hủy phiếu này
                </Button>
              </span>
            </Tooltip>
          ),
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
            {/* Banner cảnh báo nếu phiếu nhập đã có hàng xuất bán ra ngoài */}
            {selectedTx.type === TRANSACTION_TYPE.INBOUND && selectedTx.status !== TRANSACTION_STATUS.CANCELLED && selectedTx.hasExports && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="font-bold text-sm flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <WarningOutlined className="text-base" />
                  <span>KHÔNG THỂ HỦY PHIẾU NHẬP - ĐÃ CÓ XUẤT KHO PHÁT SINH</span>
                </div>
                <div>
                  Lô hàng thuộc phiếu nhập này đã được xuất bán ra ngoài
                  {selectedTx.exportRefNos && selectedTx.exportRefNos.length > 0 ? (
                    <span> trong các phiếu xuất: <strong className="text-amber-900 dark:text-amber-200 font-mono font-bold">{selectedTx.exportRefNos.join(', ')}</strong></span>
                  ) : ''}.
                </div>
                <div className="text-amber-700 dark:text-amber-400 font-medium pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                  💡 <strong>Quy tắc an toàn:</strong> Bạn phải hủy các phiếu xuất liên quan trước để hoàn nguyên đủ số lượng tồn kho về lô, sau đó mới có thể hủy phiếu nhập này.
                </div>
              </div>
            )}

            {/* Banner cảnh báo nếu phiếu đã hủy */}
            {selectedTx.status === TRANSACTION_STATUS.CANCELLED && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-1.5">
                <div className="font-bold text-sm flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <CloseCircleOutlined className="text-base" />
                  <span>PHIẾU GIAO DỊCH ĐÃ BỊ HỦY &amp; HOÀN NGUYÊN TỒN KHO</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <span><strong>Người thực hiện:</strong> {selectedTx.cancelledBy || 'Thủ kho'}</span>
                  <span><strong>Thời gian:</strong> {selectedTx.cancelledAt ? formatDateTime(selectedTx.cancelledAt) : 'N/A'}</span>
                </div>
                {selectedTx.cancelReason && (
                  <div className="text-xs pt-1.5 border-t border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300">
                    <strong>Lý do hủy:</strong> {selectedTx.cancelReason}
                  </div>
                )}
              </div>
            )}
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
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{formatDateTime(selectedTx.date)}</div>
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

      {/* Modal Xác Nhận Hủy Phiếu & Hoàn Nguyên Tồn Kho */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <CloseCircleOutlined className="text-lg" />
            <span className="font-bold text-sm sm:text-base">Xác Nhận Hủy Phiếu {selectedTx?.id}</span>
          </div>
        }
        open={cancelModalOpen}
        onCancel={() => {
          if (!canceling) {
            setCancelModalOpen(false);
            setCancelReason('');
          }
        }}
        onOk={handleConfirmCancel}
        okText="Xác Nhận Hủy & Hoàn Nguyên"
        cancelText="Quay lại"
        okButtonProps={{ danger: true, loading: canceling, disabled: !cancelReason.trim() }}
        cancelButtonProps={{ disabled: canceling }}
        destroyOnClose
        centered
        width="100%"
        style={{ maxWidth: 480 }}
      >
        <div className="space-y-3 py-2 text-xs sm:text-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-bold text-xs sm:text-sm flex items-center gap-1">
              <ExclamationCircleOutlined /> Lưu ý quan trọng:
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Thao tác này sẽ chuyển trạng thái phiếu sang <strong>ĐÃ HỦY</strong> và <strong>tự động hoàn nguyên toàn bộ số lượng hải sản ({formatWeight(selectedTx?.totalWeightKg || 0)}) và vật tư</strong> về kho. Dữ liệu sau khi hủy không thể hoàn tác.
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1.5 text-xs">
              Lý do hủy phiếu <span className="text-red-500">*</span>:
            </label>
            <Input.TextArea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy (ví dụ: Cân nhầm số kg, khách đổi ý hủy đơn, nhập sai nhà cung cấp...)"
              maxLength={300}
              showCount
              disabled={canceling}
              className="rounded-lg text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Invoice Print Modal */}
      <InvoiceModal
        open={isInvoiceModalOpen}
        data={invoiceData}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
};

export default TransactionHistoryPage;
