import React, { useState, useEffect } from 'react';
import { Table, Row, Col, DatePicker, Input, Button, Modal, Card } from 'antd';
import { PrinterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';
import type { OutboundTransaction } from '../../stores/useOutboundStore';
import InvoiceModal from '../../components/invoice/InvoiceModal';
import { formatCurrency, formatWeight, formatDate } from '../../utils/format';
import { useOutboundStore } from '../../stores/useOutboundStore';
import { exportToExcel } from '../../utils/exportUtils';
import type { InvoicePrintData } from '../../types';

const { RangePicker } = DatePicker;

/** Map an OutboundTransaction → InvoicePrintData for the shared InvoiceModal */
const toInvoiceData = (tx: OutboundTransaction): InvoicePrintData => {
  const items = tx.batches.map((b) => ({
    batchCode: b.batchCode,
    productName: b.species,
    storageType: 'Cấp đông',
    grossWeight: b.quantityKg,
    tareWeight: 0,
    netWeight: b.quantityKg,
    expiryDate: b.expiryDate,
    unitPrice: b.unitPrice,
    totalAmount: b.amount,
  }));

  const totalNetWeight = items.reduce((sum, item) => sum + item.netWeight, 0);

  const parts = (tx.customerName || '').split(' - ');
  const pName = parts.length > 1 ? parts[0].trim() : tx.customerName;
  const pPhone = parts.length > 1 ? parts.slice(1).join(' - ').trim() : undefined;

  return {
    type: 'OUTBOUND',
    invoiceNo: tx.id,
    date: tx.date,
    partnerName: pName,
    partnerPhone: pPhone,
    warehouseStaff: tx.createdBy,
    note: tx.reason,
    items,
    supplies: tx.supplies || [],
    subTotal: tx.subTotal,
    suppliesTotal: tx.suppliesTotal,
    discountAmount: tx.discountAmount,
    discountReason: tx.discountReason,
    totalNetWeight,
    totalAmount: tx.totalAmount,
  };
};

const OutboundHistoryPage: React.FC = () => {
  const { transactions, fetchTransactions } = useOutboundStore();
  const [selectedTx, setSelectedTx] = useState<OutboundTransaction | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [printVisible, setPrintVisible] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [filtered, setFiltered] = useState<OutboundTransaction[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [customerFilter, setCustomerFilter] = useState<string>('');

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setFiltered(transactions);
  }, [transactions]);

  const handleSearch = (value: string) => {
    if (!value) {
      setFiltered(transactions);
      return;
    }
    const q = value.toLowerCase();
    setFiltered(
      transactions.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.batches.some((b) => b.batchCode.toLowerCase().includes(q) || b.species.toLowerCase().includes(q))
      )
    );
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleExportExcel = () => {
    const exportData = filtered.flatMap((t) =>
      t.batches.map((b) => ({
        id: t.id,
        date: formatDate(t.date),
        customerName: t.customerName,
        createdBy: t.createdBy,
        batchCode: b.batchCode,
        species: b.species,
        quantityKg: b.quantityKg,
        unitPrice: b.unitPrice,
        amount: b.amount,
        expiryDate: formatDate(b.expiryDate),
        subTotal: t.subTotal || t.totalAmount,
        suppliesTotal: t.suppliesTotal || 0,
        discountAmount: t.discountAmount || 0,
        discountReason: t.discountReason || '',
        totalAmount: t.totalAmount,
      }))
    );

    exportToExcel(
      exportData,
      [
        { header: 'Mã Phiếu', key: 'id', width: 18 },
        { header: 'Ngày Xuất', key: 'date', width: 18 },
        { header: 'Khách Hàng', key: 'customerName', width: 25 },
        { header: 'Người Lập', key: 'createdBy', width: 18 },
        { header: 'Mã Lô', key: 'batchCode', width: 18 },
        { header: 'Tên Mặt Hàng', key: 'species', width: 20 },
        { header: 'Khối Lượng (kg)', key: 'quantityKg', width: 15 },
        { header: 'Đơn Giá (VNĐ)', key: 'unitPrice', width: 15, formatter: (val) => formatCurrency(val) },
        { header: 'Thành Tiền (VNĐ)', key: 'amount', width: 18, formatter: (val) => formatCurrency(val) },
        { header: 'Hạn Sử Dụng', key: 'expiryDate', width: 15 },
        { header: 'Tiền Hàng (VNĐ)', key: 'subTotal', width: 18, formatter: (val) => formatCurrency(val) },
        { header: 'Tiền Thùng/Phụ Phí (VNĐ)', key: 'suppliesTotal', width: 18, formatter: (val) => formatCurrency(val) },
        { header: 'Chiết Khấu (VNĐ)', key: 'discountAmount', width: 15, formatter: (val) => formatCurrency(val) },
        { header: 'Lý Do Chiết Khấu', key: 'discountReason', width: 20 },
        { header: 'Tổng Thanh Toán (VNĐ)', key: 'totalAmount', width: 20, formatter: (val) => formatCurrency(val) },
      ],
      'LichSu_XuatKho_HaiSan'
    );
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { title: 'Mã phiếu xuất', dataIndex: 'id', key: 'id', render: (id: string) => <span className="font-bold text-sky-600">{id}</span> },
    { title: 'Ngày xuất kho', dataIndex: 'date', key: 'date', render: (d: string) => formatDate(d), responsive: ['sm'] as any },
    {
      title: 'Khách hàng / Người nhận',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string) => {
        if (!name) return <span className="text-gray-400">Khách lẻ</span>;
        const parts = name.split(' - ');
        if (parts.length > 1) {
          return (
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{parts[0]}</span>
              <div className="text-xs text-sky-600 font-mono mt-0.5">
                📞 {parts.slice(1).join(' - ')}
              </div>
            </div>
          );
        }
        return <span className="font-medium text-gray-800 dark:text-gray-200">{name}</span>;
      },
    },
    { title: 'Tổng khối lượng (Kg)', dataIndex: 'totalWeightKg', key: 'totalWeightKg', render: (w: number) => formatWeight(w) },
    {
      title: 'Tiền hàng / Phụ phí',
      key: 'subTotal',
      render: (_: any, r: OutboundTransaction) => (
        <div className="text-xs">
          <div>Hải sản: {formatCurrency(r.subTotal || r.totalAmount)}</div>
          {r.suppliesTotal && r.suppliesTotal > 0 ? (
            <div className="text-sky-600 font-medium">+Thùng: {formatCurrency(r.suppliesTotal)}</div>
          ) : null}
        </div>
      ),
      responsive: ['md'] as any,
    },
    {
      title: 'Chiết khấu / Giảm giá',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      render: (d: number, r: OutboundTransaction) =>
        d && d > 0 ? (
          <span className="text-red-500 font-medium">
            -{formatCurrency(d)}
            {r.discountReason ? <div className="text-xs text-gray-400 font-normal">({r.discountReason})</div> : null}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
      responsive: ['lg'] as any,
    },
    {
      title: 'Tổng thanh toán (VNĐ)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (a: number) => <strong className="text-emerald-600 font-bold">{formatCurrency(a)}</strong>,
    },
    { title: 'Người lập phiếu', dataIndex: 'createdBy', key: 'createdBy', responsive: ['md'] as any },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: OutboundTransaction) => (
        <>
          <Button
            type="text"
            shape="circle"
            icon={<InfoCircleOutlined />}
            onClick={() => {
              setSelectedTx(record);
              setDetailVisible(true);
            }}
          />
          <Button
            type="text"
            shape="circle"
            icon={<PrinterOutlined />}
            onClick={() => {
              setSelectedTx(record);
              setPrintVisible(true);
            }}
          />
        </>
      ),
    },
  ];

  const batchColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    { title: 'Mã lô', dataIndex: 'batchCode', key: 'batchCode' },
    { title: 'Loại hải sản', dataIndex: 'species', key: 'species' },
    { title: 'Số kg', dataIndex: 'quantityKg', key: 'quantityKg', render: (v: number) => formatWeight(v) },
    { title: 'Hạn sử dụng', dataIndex: 'expiryDate', key: 'expiryDate', render: (d: string) => formatDate(d), responsive: ['sm'] as any },
    { title: 'Đơn giá (VNĐ)', dataIndex: 'unitPrice', key: 'unitPrice', render: (p: number) => formatCurrency(p), responsive: ['md'] as any },
    { title: 'Thành tiền (VNĐ)', dataIndex: 'amount', key: 'amount', render: (a: number) => formatCurrency(a) },
  ];

  const supplyColumns = [
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
  ];

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">Lịch Sử Xuất Kho</h1>
      </div>

      <Card className="shadow-xs rounded-xl mb-4" styles={{ body: { padding: '12px' } }}>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker style={{ width: '100%' }} size="middle" placeholder={['Từ ngày', 'Đến ngày']} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Lọc theo tên khách hàng..."
              style={{ width: '100%' }}
              size="middle"
              allowClear
              value={customerFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCustomerFilter(val);
                if (!val) {
                  setFiltered(transactions);
                } else {
                  setFiltered(transactions.filter((t) => t.customerName?.toLowerCase().includes(val.toLowerCase())));
                }
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
            />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Input placeholder="Mã phiếu / Mã lô" style={{ width: '100%' }} size="middle" />
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Input.Search
              placeholder="Tìm..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
              size="middle"
            />
          </Col>
        </Row>
      </Card>

      <Card
        title="📤 Danh Sách Phiếu Xuất Kho Hải Sản"
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
          rowKey="id"
          dataSource={filtered}
          columns={columns}
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

      {/* Detail modal */}
      <Modal
        open={detailVisible}
        title={
          <div>
            <span style={{ fontWeight: 'bold' }}>Chi tiết phiếu xuất: {selectedTx?.id}</span>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 'normal', marginTop: 4 }}>
              Khách hàng: <strong>{selectedTx?.customerName}</strong> &nbsp;·&nbsp; Ngày xuất: {selectedTx?.date}
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ textAlign: 'left', fontSize: 13 }}>
              {selectedTx?.discountAmount && selectedTx.discountAmount > 0 ? (
                <span style={{ color: '#dc2626', marginRight: 16 }}>
                  Giảm giá: -{formatCurrency(selectedTx.discountAmount)} {selectedTx.discountReason ? `(${selectedTx.discountReason})` : ''}
                </span>
              ) : null}
              <span style={{ fontWeight: 'bold', fontSize: 15, color: '#003580' }}>
                Tổng thanh toán: {formatCurrency(selectedTx?.totalAmount || 0)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setDetailVisible(false)}>Đóng</Button>
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
                onClick={() => {
                  setDetailVisible(false);
                  setPrintVisible(true);
                }}
              >
                In Phiếu
              </Button>
            </div>
          </div>
        }
        onCancel={() => setDetailVisible(false)}
        width={850}
      >
        {selectedTx && (
          <div className="space-y-4">
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#0284c7' }}>1. Danh sách hải sản xuất kho:</div>
              <Table rowKey="batchCode" dataSource={selectedTx.batches} columns={batchColumns} pagination={false} scroll={{ x: 'max-content' }} size="small" />
            </div>

            {selectedTx.supplies && selectedTx.supplies.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#0284c7' }}>2. Vật phẩm bán kèm &amp; Phụ phí:</div>
                <Table rowKey="name" dataSource={selectedTx.supplies} columns={supplyColumns} pagination={false} scroll={{ x: 'max-content' }} size="small" />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Print modal */}
      {selectedTx && (
        <InvoiceModal
          open={printVisible}
          onClose={() => setPrintVisible(false)}
          data={toInvoiceData(selectedTx)}
        />
      )}

      {/* Modal Phóng To Bảng Xuất Kho & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="📤 Lịch Sử Phiếu Xuất Kho Hải Sản"
        subtitle={`Hiển thị ${filtered.length} phiếu xuất kho chi tiết`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              rowKey="id"
              dataSource={filtered}
              columns={columns}
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

export default OutboundHistoryPage;
