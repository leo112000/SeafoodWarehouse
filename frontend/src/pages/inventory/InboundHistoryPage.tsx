import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, DatePicker, Input, Space, Row, Col, Typography } from 'antd';
import { EyeOutlined, PrinterOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useInboundStore } from '../../stores/useInboundStore';
import type { InboundReceipt } from '../../stores/useInboundStore';
import { formatCurrency, formatWeight, formatDate } from '../../utils/format';
import { InvoiceModal } from '../../components/invoice/InvoiceModal';
import type { InvoicePrintData } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

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
  const receipts = useInboundStore((state) => state.receipts);
  const user = useAuthStore((state) => state.user);

  const [selectedReceipt, setSelectedReceipt] = useState<InboundReceipt | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Invoice print modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Filters state
  const [supplierQuery, setSupplierQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string | null>(null);

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
  };

  // Filter receipt list
  const filteredReceipts = receipts.filter((r) => {
    const matchesSupplier = r.supplier.toLowerCase().includes(supplierQuery.toLowerCase());
    const matchesDate = !filterDate || r.inboundDate === filterDate;
    return matchesSupplier && matchesDate;
  });

  const columns = [
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
    },
    {
      title: 'Kho nhận',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
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
      <div className="mb-6">
        <Title level={2} className="m-0">Lịch Sử Nhập Kho Hải Sản</Title>
        <Paragraph type="secondary">
          Danh sách tất cả các phiếu nhập kho đã được thực hiện, lọc theo ngày và nhà cung cấp.
        </Paragraph>
      </div>

      <Card className="shadow-sm mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm theo nhà cung cấp..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} md={8}>
            <DatePicker
              placeholder="Chọn ngày nhập..."
              className="w-full"
              size="large"
              value={filterDate ? dayjs(filterDate) : null}
              onChange={(date) => setFilterDate(date ? date.format('YYYY-MM-DD') : null)}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
                size="large"
              >
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="shadow-sm">
        <Table
          dataSource={filteredReceipts}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
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
    </div>
  );
};
export default InboundHistoryPage;
