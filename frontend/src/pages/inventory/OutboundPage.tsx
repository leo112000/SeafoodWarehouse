import React, { useState } from 'react';
import {
  Card, Form, Input, Button, DatePicker, Select, InputNumber,
  Row, Col, Typography, App, Alert,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBatchStore } from '../../stores/useBatchStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { formatCurrency, formatWeight } from '../../utils/format';
import { InvoiceModal } from '../../components/invoice/InvoiceModal';
import dayjs from 'dayjs';
import type { InvoicePrintData } from '../../types';

const { Title, Paragraph } = Typography;

const SEAFOOD_OPTIONS = [
  { label: 'Tôm Hùm Bông', value: 'TOMHUM', name: 'Tôm Hùm Bông' },
  { label: 'Cua Hoàng Đế', value: 'CUAHD', name: 'Cua Hoàng Đế' },
  { label: 'Cá Hồi Na Uy', value: 'CAHOI', name: 'Cá Hồi Na Uy' },
  { label: 'Mực Lá Đại', value: 'MUCLA', name: 'Mực Lá Đại' },
];

export const OutboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const batches = useBatchStore((state) => state.batches);
  const deductStock = useBatchStore((state) => state.deductStock);
  const user = useAuthStore((state) => state.user);

  // Invoice modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Track selected seafood type per form field index to populate options and warnings
  const [selectedSeafoods, setSelectedSeafoods] = useState<Record<number, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<number, string>>({});

  // Helper: Get sorted batches for a seafood type (FEFO order)
  const getFefoBatches = (seafoodCode: string) => {
    return batches
      .filter((b) => b.seafoodCode === seafoodCode && b.quantity > 0)
      .sort((a, b) => dayjs(a.expiryDate).unix() - dayjs(b.expiryDate).unix());
  };

  // Helper: check if a chosen batch violates FEFO (i.e. there's a batch with closer HSD and quantity > 0)
  const isFefoViolated = (seafoodCode: string, chosenBatchCode: string) => {
    const sorted = getFefoBatches(seafoodCode);
    if (sorted.length === 0) return false;
    const index = sorted.findIndex((b) => b.batchCode === chosenBatchCode);
    return index > 0;
  };

  const handleSeafoodChange = (value: string, index: number) => {
    setSelectedSeafoods((prev) => ({ ...prev, [index]: value }));
    // Reset batch choice for this index
    const items = form.getFieldValue('items') || [];
    if (items[index]) {
      items[index].batchCode = undefined;
      items[index].quantity = 0;
      items[index].unitPrice = 0;
      items[index].totalPrice = 0;
      items[index].expiryDate = '';
      form.setFieldsValue({ items });
    }
  };

  const handleBatchChange = (value: string, index: number) => {
    setSelectedBatches((prev) => ({ ...prev, [index]: value }));
    const selectedBatch = batches.find((b) => b.batchCode === value);
    const items = form.getFieldValue('items') || [];

    if (items[index] && selectedBatch) {
      items[index].unitPrice = selectedBatch.unitPrice;
      items[index].expiryDate = selectedBatch.expiryDate;
      items[index].quantity = Math.min(items[index].quantity || 0, selectedBatch.quantity);
      items[index].totalPrice = (items[index].quantity || 0) * selectedBatch.unitPrice;
      form.setFieldsValue({ items });
    }
  };

  const handleQtyChange = (qty: number | null, index: number) => {
    const items = form.getFieldValue('items') || [];
    const item = items[index];
    if (item) {
      const price = item.unitPrice || 0;
      item.totalPrice = (qty || 0) * price;
      form.setFieldsValue({ items });
    }
  };

  const onFinish = (values: any) => {
    const items = values.items || [];
    if (items.length === 0) {
      message.error('Vui lòng thêm ít nhất một mặt hàng xuất kho!');
      return;
    }

    // Process stock deduction
    items.forEach((item: any) => {
      deductStock(item.batchCode, item.quantity);
    });

    const receiptId = `OUT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const outboundDate = (values.outboundDate as dayjs.Dayjs).format('YYYY-MM-DD');

    // Build InvoicePrintData directly
    const printData: InvoicePrintData = {
      type: 'OUTBOUND',
      invoiceNo: receiptId,
      date: outboundDate,
      partnerName: values.customer,
      warehouseStaff: user?.name ?? 'Thủ kho',
      note: `Lý do xuất: ${values.reason}`,
      items: items.map((item: any) => {
        const batchDetails = batches.find((b) => b.batchCode === item.batchCode);
        return {
          batchCode: item.batchCode,
          seafoodName: batchDetails?.seafoodName ?? 'Chưa rõ',
          storageCondition: 'Cấp đông',   // outbound doesn't carry this field; use sensible default
          totalWeight: item.quantity,       // outbound records net qty directly
          tareWeight: 0,
          netWeight: item.quantity,
          expiryDate: item.expiryDate ?? batchDetails?.expiryDate ?? '',
          unitPrice: item.unitPrice ?? 0,
          totalPrice: item.totalPrice ?? 0,
        };
      }),
    };

    setInvoiceData(printData);
    setIsInvoiceModalOpen(true);
    message.success('Xuất kho thành công! Vui lòng in phiếu để bàn giao.');

    // Reset the form for next entry
    form.resetFields();
    setSelectedSeafoods({});
    setSelectedBatches({});
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Title level={2} className="m-0">Tạo Phiếu Xuất Kho Hải Sản (Quy tắc FEFO)</Title>
        <Paragraph type="secondary">
          Cảnh báo và ưu tiên các lô hàng hải sản cận Hạn sử dụng (HSD) lên đầu để giảm thiểu hư hỏng.
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          outboundDate: dayjs(),
          reason: 'Bán hàng',
          items: [
            {
              seafoodCode: undefined,
              batchCode: undefined,
              quantity: 0,
              unitPrice: 0,
              totalPrice: 0,
              expiryDate: '',
            },
          ],
        }}
      >
        <Card title="Thông tin phiếu xuất" className="shadow-sm mb-6">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="customer"
                label="Khách hàng nhận (Siêu thị / Nhà hàng)"
                rules={[{ required: true, message: 'Nhập thông tin khách hàng!' }]}
              >
                <Input placeholder="Nhà hàng Biển Đông, Siêu thị WinMart..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="outboundDate"
                label="Ngày xuất kho"
                rules={[{ required: true, message: 'Chọn ngày xuất!' }]}
              >
                <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="reason"
                label="Lý do xuất kho"
                rules={[{ required: true, message: 'Chọn lý do xuất!' }]}
              >
                <Select>
                  <Select.Option value="Bán hàng">Bán hàng (Thương mại)</Select.Option>
                  <Select.Option value="Chuyển kho">Chuyển kho nội bộ</Select.Option>
                  <Select.Option value="Tiêu hủy">Tiêu hủy (Hỏng / Hết hạn)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Chi tiết sản phẩm xuất" className="shadow-sm mb-6">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-4">
                {fields.map(({ key, name, ...restField }) => {
                  const seafood = selectedSeafoods[name];
                  const chosenBatch = selectedBatches[name];
                  const availableBatches = seafood ? getFefoBatches(seafood) : [];
                  const activeBatchDetails = batches.find((b) => b.batchCode === chosenBatch);
                  const isViolation = seafood && chosenBatch && isFefoViolated(seafood, chosenBatch);

                  return (
                    <Card
                      key={key}
                      type="inner"
                      size="small"
                      className="border border-sky-100 dark:border-gray-800"
                      extra={
                        fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              remove(name);
                              setSelectedSeafoods((prev) => {
                                const copy = { ...prev };
                                delete copy[name];
                                return copy;
                              });
                              setSelectedBatches((prev) => {
                                const copy = { ...prev };
                                delete copy[name];
                                return copy;
                              });
                            }}
                          />
                        )
                      }
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'seafoodCode']}
                            label="Loại hải sản"
                            rules={[{ required: true, message: 'Chọn hải sản!' }]}
                          >
                            <Select
                              placeholder="Chọn loại hải sản"
                              onChange={(val) => handleSeafoodChange(val, name)}
                            >
                              {SEAFOOD_OPTIONS.map((opt) => (
                                <Select.Option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'batchCode']}
                            label="Chọn Lô hàng (Ưu tiên FEFO)"
                            rules={[{ required: true, message: 'Chọn lô hàng!' }]}
                          >
                            <Select
                              placeholder="Chọn mã lô hàng"
                              disabled={!seafood}
                              onChange={(val) => handleBatchChange(val, name)}
                            >
                              {availableBatches.map((b) => (
                                <Select.Option key={b.batchCode} value={b.batchCode}>
                                  {b.batchCode} (HSD: {b.expiryDate}) - Tồn: {b.quantity}kg
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            label="Số lượng xuất (kg)"
                            rules={[
                              { required: true, message: 'Nhập số lượng!' },
                              () => ({
                                validator(_, value) {
                                  if (!value || value <= 0) {
                                    return Promise.reject(new Error('Phải lớn hơn 0'));
                                  }
                                  if (activeBatchDetails && value > activeBatchDetails.quantity) {
                                    return Promise.reject(
                                      new Error(`Tồn kho tối đa khả dụng là ${activeBatchDetails.quantity}kg`)
                                    );
                                  }
                                  return Promise.resolve();
                                },
                              }),
                            ]}
                          >
                            <InputNumber
                              min={0.1}
                              precision={1}
                              className="w-full"
                              onChange={(qty) => handleQtyChange(qty, name)}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={5}>
                          <Form.Item
                            {...restField}
                            name={[name, 'totalPrice']}
                            label="Thành tiền (đ)"
                          >
                            <InputNumber
                              disabled
                              className="w-full"
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      {isViolation && (
                        <Alert
                          message="Cảnh báo quy tắc FEFO: Có lô khác sắp hết hạn hơn nhưng vẫn còn hàng tồn. Hãy ưu tiên xuất lô cận HSD trước."
                          type="error"
                          showIcon
                          className="mt-2"
                        />
                      )}

                      {/* Show available stock info */}
                      {activeBatchDetails && (
                        <div className="mt-2 text-xs text-gray-400">
                          📦 Tồn kho lô này: <strong className="text-sky-600">{formatWeight(activeBatchDetails.quantity)}</strong>
                          &nbsp;|&nbsp; Đơn giá: <strong>{formatCurrency(activeBatchDetails.unitPrice)}</strong>
                          &nbsp;|&nbsp; HSD: <strong>{activeBatchDetails.expiryDate}</strong>
                        </div>
                      )}
                    </Card>
                  );
                })}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  className="py-4"
                >
                  Thêm mặt hàng xuất kho
                </Button>
              </div>
            )}
          </Form.List>
        </Card>

        <div className="flex justify-end gap-4">
          <Button size="large" onClick={() => navigate('/')}>
            Quay lại
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
          >
            Xác nhận xuất kho
          </Button>
        </div>
      </Form>

      {/* ── Invoice Print Modal (auto-opens after successful submit) ── */}
      <InvoiceModal
        open={isInvoiceModalOpen}
        data={invoiceData}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          navigate('/');
        }}
      />
    </div>
  );
};
export default OutboundPage;
