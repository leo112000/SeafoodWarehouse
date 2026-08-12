import React, { useState } from 'react';
import { Table, Row, Col, DatePicker, Select, Input, Button, Modal } from 'antd';
import { SearchOutlined, PrinterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { OutboundTransaction } from '../../stores/useOutboundStore';
import InvoiceModal from '../../components/invoice/InvoiceModal';
import { formatCurrency, formatWeight, formatDate } from '../../utils/format';
import { useOutboundStore } from '../../stores/useOutboundStore';
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
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return {
    type: 'OUTBOUND',
    invoiceNo: tx.id,
    date: tx.date,
    partnerName: tx.customerName,
    warehouseStaff: tx.createdBy,
    note: tx.reason,
    items,
    totalNetWeight,
    totalAmount,
  };
};

const OutboundHistoryPage: React.FC = () => {
  const { transactions } = useOutboundStore();
  const [filtered, setFiltered] = useState<OutboundTransaction[]>(transactions);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<OutboundTransaction | null>(null);
  const [printVisible, setPrintVisible] = useState(false);

  // Simple client‑side filter (placeholder for real API / store filtering)
  const handleSearch = (value: string) => {
    const lower = value.toLowerCase();
    setFiltered(
      transactions.filter(
        (tx) =>
          tx.id.toLowerCase().includes(lower) ||
          tx.customerName.toLowerCase().includes(lower) ||
          tx.reason.toLowerCase().includes(lower),
      ),
    );
  };

  const columns = [
    { title: 'Mã phiếu xuất', dataIndex: 'id', key: 'id' },
    { title: 'Ngày xuất kho', dataIndex: 'date', key: 'date', render: (d: string) => formatDate(d) },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName' },
    { title: 'Lý do xuất', dataIndex: 'reason', key: 'reason' },
    { title: 'Tổng khối lượng (Kg)', dataIndex: 'totalWeightKg', key: 'totalWeightKg', render: (w: number) => formatWeight(w) },
    { title: 'Tổng giá trị (VNĐ)', dataIndex: 'totalAmount', key: 'totalAmount', render: (a: number) => formatCurrency(a) },
    { title: 'Người lập phiếu', dataIndex: 'createdBy', key: 'createdBy' },
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
    { title: 'Mã lô', dataIndex: 'batchCode', key: 'batchCode' },
    { title: 'Loại hải sản', dataIndex: 'species', key: 'species' },
    { title: 'Số kg', dataIndex: 'quantityKg', key: 'quantityKg', render: (v: number) => formatWeight(v) },
    { title: 'Hạn sử dụng', dataIndex: 'expiryDate', key: 'expiryDate', render: (d: string) => formatDate(d) },
    { title: 'Đơn giá (VNĐ)', dataIndex: 'unitPrice', key: 'unitPrice', render: (p: number) => formatCurrency(p) },
    { title: 'Thành tiền (VNĐ)', dataIndex: 'amount', key: 'amount', render: (a: number) => formatCurrency(a) },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <RangePicker style={{ width: '100%' }} />
        </Col>
        <Col span={6}>
          <Select placeholder="Khách hàng / Đại lý" style={{ width: '100%' }} allowClear />
        </Col>
        <Col span={6}>
          <Input placeholder="Mã phiếu / Mã lô" style={{ width: '100%' }} />
        </Col>
        <Col span={6}>
          <Input.Search
            placeholder="Tìm kiếm..."
            allowClear
            onSearch={handleSearch}
            style={{ width: '100%' }}
            enterButton
          />
        </Col>
      </Row>
      <Table rowKey="id" dataSource={filtered} columns={columns} pagination={{ pageSize: 10 }} />

      {/* Detail modal */}
      <Modal
        open={detailVisible}
        title={selectedTx?.id}
        footer={null}
        onCancel={() => setDetailVisible(false)}
        width={800}
      >
        {selectedTx && (
          <Table rowKey="batchCode" dataSource={selectedTx.batches} columns={batchColumns} pagination={false} />
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
    </div>
  );
};

export default OutboundHistoryPage;
