import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, DatePicker, Input, Space, Row, Col, Typography } from 'antd';
import { EyeOutlined, PrinterOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useInboundStore } from '../../stores/useInboundStore';
import { exportToExcel } from '../../utils/exportUtils';
import type { InboundReceipt } from '../../stores/useInboundStore';
import { formatCurrency, formatWeight, formatDate } from '../../utils/format';
import { InvoiceModal } from '../../components/invoice/InvoiceModal';
import type { InvoicePrintData } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import dayjs from 'dayjs';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

const { Title } = Typography;

/** Map an InboundReceipt → InvoicePrintData for the shared InvoiceModal */
const toInvoiceData = (receipt: InboundReceipt, staffName: string): InvoicePrintData => {
  const items = receipt.items.map((item) => ({
    batchCode: item.batchCode,
    productName: item.seafoodName,
    storageType: item.storageCondition,
    grossWeight: item.totalWeight,
    tareWeight: item.tareWeight,
    netWeight: item.netWeight,
    expiryDate: item.expiryDate,
    unitPrice: item.unitPrice,
    totalAmount: item.totalPrice,
  }));

  const totalNetWeight = items.reduce((sum, item) => sum + item.netWeight, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return {
    type: 'INBOUND',
    invoiceNo: receipt.id,
    date: receipt.inboundDate,
    partnerName: receipt.supplier,
    storageLocation: receipt.storageLocation,
    warehouseStaff: staffName,
    items,
    totalNetWeight,
    totalAmount,
  };
};

export const InboundHistoryPage: React.FC = () => {
  const { receipts, fetchReceipts } = useInboundStore();
  const user = useAuthStore((state) => state.user);

  React.useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const [selectedReceipt, setSelectedReceipt] = useState<InboundReceipt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invoice print modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Filters state
  const [supplierQuery, setSupplierQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const handleOpenDetail = (receipt: InboundReceipt) => {
    setSelectedReceipt(receipt);
    setIsDetailModalOpen(true);
  };

  const handleOpenInvoice = (receipt: InboundReceipt) => {
    setInvoiceData(toInvoiceData(receipt, user?.name ?? 'Thủ kho'));
    setIsInvoiceModalOpen(true);
  };

  const handleResetFilters = () => {
    setSupplierQuery('');
    setFilterDate(null);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleExportExcel = () => {
    const exportData = filteredReceipts.flatMap((r) =>
      r.items.map((item) => ({
        id: r.id,
        supplier: r.supplier,
        inboundDate: formatDate(r.inboundDate),
        storageLocation: r.storageLocation || 'Chưa rõ',
        seafoodName: item.seafoodName,
        batchCode: item.batchCode,
        storageCondition: item.storageCondition,
        totalWeight: item.totalWeight,
        tareWeight: item.tareWeight,
        netWeight: item.netWeight,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }))
    );

    exportToExcel(
      exportData,
      [
        { header: 'Mã Phiếu', key: 'id', width: 20 },
        { header: 'Nhà Cung Cấp', key: 'supplier', width: 25 },
        { header: 'Ngày Nhập', key: 'inboundDate', width: 15 },
        { header: 'Kho Lưu', key: 'storageLocation', width: 18 },
        { header: 'Tên Hải Sản', key: 'seafoodName', width: 22 },
        { header: 'Mã Lô (Batch)', key: 'batchCode', width: 20 },
        { header: 'Bảo Quản', key: 'storageCondition', width: 15 },
        { header: 'Tổng Kg (Gross)', key: 'totalWeight', width: 15 },
        { header: 'Kg Bì (Tare)', key: 'tareWeight', width: 15 },
        { header: 'Kg Thực (Net)', key: 'netWeight', width: 15 },
        { header: 'Đơn Giá (VNĐ)', key: 'unitPrice', width: 15, formatter: (val) => formatCurrency(val) },
        { header: 'Thành Tiền (VNĐ)', key: 'totalPrice', width: 18, formatter: (val) => formatCurrency(val) },
      ],
      'LichSu_NhapKho_HaiSan'
    );
  };

  // Filter receipt list
  const filteredReceipts = receipts.filter((r) => {
    const matchesSupplier = r.supplier.toLowerCase().includes(supplierQuery.toLowerCase());
    const matchesDate = !filterDate || r.inboundDate === filterDate;
    return matchesSupplier && matchesDate;
  });

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
      render: (id: string) => <strong className="text-blue-500">{id}</strong>,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (text: string) => <span className="font-semibold text-gray-800 dark:text-gray-100">{text}</span>,
    },
     {
      title: 'Ngày nhập kho',
      dataIndex: 'inboundDate',
      key: 'inboundDate',
      render: (dateStr: string) => formatDate(dateStr).split(' ')[0],
      responsive: ['sm'] as any,
    },
    {
      title: 'Kho nhận',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
      responsive: ['md'] as any,
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
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: InboundReceipt) => (
        <Space size="middle">
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
        return <Tag color={color}>{cond}</Tag>;
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
    <div>
      <div className="mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">Lịch Sử Nhập Kho</h1>
      </div>

      <Card className="shadow-sm mb-6">
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="Tìm theo NCC, mã phiếu, mã lô, tên hải sản..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={supplierQuery}
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              size="middle"
              allowClear
            />
          </Col>
          <Col xs={12} sm={12} md={7}>
            <DatePicker
              placeholder="Chọn ngày nhập..."
              className="w-full"
              size="middle"
              value={filterDate ? dayjs(filterDate) : null}
              onChange={(date) => {
                setFilterDate(date ? date.format('YYYY-MM-DD') : null);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={12} sm={12} md={7}>
            <div className="flex items-center justify-end gap-1.5 w-full">
              {(supplierQuery || filterDate) && (
                <Button icon={<ReloadOutlined />} onClick={handleResetFilters} size="middle">
                  Đặt lại
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      <Card
        title="📥 Danh Sách Phiếu Nhập Kho"
        extra={
          <div className="flex items-center gap-2">
            <Button
              size="small"
              onClick={handleExportExcel}
              className="text-xs flex items-center gap-1 border-slate-200 dark:border-slate-700 font-medium"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Xuất Excel</span>
              <span className="sm:hidden">Excel</span>
            </Button>
            <ZoomButton onClick={() => setIsZoomed(true)} />
          </div>
        }
        className="shadow-sm rounded-2xl"
      >
        <Table
          dataSource={filteredReceipts}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* ── Detail Modal ──────────────────────────────── */}
      <Modal
        title={`Chi tiết phiếu nhập kho: ${selectedReceipt?.id}`}
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
              if (selectedReceipt) {
                setIsDetailModalOpen(false);
                handleOpenInvoice(selectedReceipt);
              }
            }}
          >
            In Phiếu
          </Button>,
        ]}
      >
        {selectedReceipt && (
          <div className="mt-4 space-y-4">
            <Card type="inner" size="small" className="bg-gray-50 dark:bg-slate-900 border-none">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">NHÀ CUNG CẤP</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedReceipt.supplier}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">NGÀY NHẬP KHO</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedReceipt.inboundDate}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">KHO LƯU TRỮ CHÍNH</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-100">{selectedReceipt.storageLocation}</div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="text-xs text-gray-400">TỔNG GIÁ TRỊ</div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(selectedReceipt.totalAmount)}
                  </div>
                </Col>
              </Row>
            </Card>

            <div>
              <Title level={5} className="mb-2">Chi tiết lô hàng hải sản</Title>
              <Table
                dataSource={selectedReceipt.items}
                columns={itemColumns}
                rowKey="batchCode"
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Invoice Print Modal ───────────────────────── */}
      <InvoiceModal
        open={isInvoiceModalOpen}
        data={invoiceData}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Modal Phóng To Bảng Nhập Kho & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="📥 Lịch Sử Phiếu Nhập Kho Hải Sản"
        subtitle={`Hiển thị ${filteredReceipts.length} phiếu nhập kho chi tiết`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              dataSource={filteredReceipts}
              columns={columns}
              rowKey="id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
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
export default InboundHistoryPage;
