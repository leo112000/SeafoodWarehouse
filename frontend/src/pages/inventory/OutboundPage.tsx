import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, DatePicker, Select, InputNumber,
  Row, Col, Typography, App, Alert, Spin, Tag,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePackagingStore } from '../../stores/usePackagingStore';
import { formatCurrency, formatWeight } from '../../utils/format';
import { InvoiceModal } from '../../components/invoice/InvoiceModal';
import dayjs from 'dayjs';
import type { InvoicePrintData } from '../../types';
import { useOutboundStore } from '../../stores/useOutboundStore';
import { batchService, type FefoBatch } from '../../services/batchService';

const { Title, Paragraph, Text } = Typography;

export const OutboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const user = useAuthStore((state) => state.user);
  const { packagings, fetchPackagings } = usePackagingStore();

  // ── Dữ liệu lô hàng thực từ DB (FEFO order) ──────────────────────────────
  const [fefoBatches, setFefoBatches] = useState<FefoBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const loadFefoBatches = async () => {
    setLoadingBatches(true);
    try {
      const data = await batchService.getFefo();
      setFefoBatches(data);
    } catch {
      message.error('Không tải được danh sách lô hàng từ kho.');
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadFefoBatches();
    fetchPackagings();
  }, []);

  // Danh sách sản phẩm unique từ FEFO batches
  const productOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    fefoBatches.forEach((b) => map.set(b.productCode, b.productName));
    return Array.from(map.entries()).map(([code, name]) => ({ value: code, label: name }));
  }, [fefoBatches]);

  // Invoice modal state
  const [invoiceData, setInvoiceData] = useState<InvoicePrintData | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [selectedSeafoods, setSelectedSeafoods] = useState<Record<number, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<number, string>>({});
  void selectedSeafoods;
  void selectedBatches;
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [_scanItemIndex, setScanItemIndex] = useState<number | null>(null);
  void qrModalOpen;
  void setQrModalOpen;
  void _scanItemIndex;
  void setScanItemIndex;

  /** Lấy lô khả dụng cho 1 loại sản phẩm (đã sắp xếp FEFO từ server) */
  const getBatchesForProduct = (productCode: string): FefoBatch[] =>
    fefoBatches.filter((b) => b.productCode === productCode && b.quantity > 0);

  /** Kiểm tra FEFO violation: có lô nào hết hạn sớm hơn mà vẫn còn hàng không? */
  const isFefoViolated = (productCode: string, chosenBatchCode: string): boolean => {
    const sorted = getBatchesForProduct(productCode);
    const idx = sorted.findIndex((b) => b.batchCode === chosenBatchCode);
    return idx > 0;
  };

  const handleSeafoodChange = (value: string, index: number) => {
    setSelectedSeafoods((prev) => ({ ...prev, [index]: value }));
    const items = form.getFieldValue('items') || [];
    if (items[index]) {
      items[index].batchCode = undefined;
      items[index].quantity = 0;
      items[index].unitPrice = 0;
      items[index].totalPrice = 0;
      items[index].expiryDate = '';
      form.setFieldsValue({ items });
    }
    setSelectedBatches((prev) => { const c = { ...prev }; delete c[index]; return c; });
  };

  const handleBatchChange = (value: string, index: number) => {
    setSelectedBatches((prev) => ({ ...prev, [index]: value }));
    const batch = fefoBatches.find((b) => b.batchCode === value);
    const items = form.getFieldValue('items') || [];
    if (items[index] && batch) {
      items[index].unitPrice = batch.unitPrice;
      items[index].expiryDate = batch.expiryDate;
      items[index].quantity = Math.min(items[index].quantity || 0, batch.quantity);
      items[index].totalPrice = (items[index].quantity || 0) * batch.unitPrice;
      form.setFieldsValue({ items });
    }
  };

  const handleQtyChange = (qty: number | null, index: number) => {
    const items = form.getFieldValue('items') || [];
    const item = items[index];
    if (item) {
      item.totalPrice = (qty || 0) * (item.unitPrice || 0);
      form.setFieldsValue({ items });
    }
  };

  const handlePackagingChange = (index: number) => {
    const items = form.getFieldValue('items') || [];
    const item = items[index];
    if (!item) return;
    const pkg = packagings.find((p) => p.code === item.packagingCode);
    if (pkg) {
      item.tareWeight = (Number(item.packagingQty) || 0) * pkg.defaultTareWeight;
      form.setFieldsValue({ items });
    }
  };

  const addTransaction = useOutboundStore((state) => state.addTransaction);

  const onFinish = async (values: any) => {
    const items = values.items || [];
    if (items.length === 0) {
      message.error('Vui lòng thêm ít nhất một mặt hàng xuất kho!');
      return;
    }

    const receiptId = `OUT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const outboundDate = (values.outboundDate as dayjs.Dayjs).format('YYYY-MM-DD');

    const invoiceItems = items.map((item: any) => {
      const batchDetails = fefoBatches.find((b) => b.batchCode === item.batchCode);
      const pkg = packagings.find((p) => p.code === item.packagingCode);
      const pkgQty = Number(item.packagingQty) || 0;
      const tareWeight = pkg ? pkgQty * pkg.defaultTareWeight : Number(item.tareWeight) || 0;
      const netWeight = item.quantity || 0;
      return {
        batchCode: item.batchCode,
        productName: batchDetails?.productName ?? 'Chưa rõ',
        storageType: 'Cấp đông',
        grossWeight: netWeight + tareWeight,
        tareWeight,
        netWeight,
        expiryDate: item.expiryDate ?? batchDetails?.expiryDate ?? '',
        unitPrice: item.unitPrice ?? 0,
        totalAmount: item.totalPrice ?? 0,
        packagingCode: item.packagingCode,
        packagingQty: pkgQty,
      };
    });

    const totalNetWeight = invoiceItems.reduce((s: number, i: any) => s + i.netWeight, 0);
    const totalAmount = invoiceItems.reduce((s: number, i: any) => s + i.totalAmount, 0);

    // Lưu vào SQL Server qua API
    await addTransaction({
      id: receiptId,
      date: outboundDate,
      customerName: values.customer,
      reason: values.reason,
      totalWeightKg: totalNetWeight,
      totalAmount,
      createdBy: user?.name ?? 'Thủ kho',
      batches: items.map((i: any) => {
        const pkgWeight = packagings.find((p) => p.code === i.packagingCode)?.defaultTareWeight || 0;
        const pQty = i.packagingQty || 0;
        const tareW = pQty * pkgWeight;
        const netW = i.quantity || 0;
        return {
          batchCode: i.batchCode,
          species: i.seafoodCode,
          quantityKg: netW,
          grossWeight: netW + tareW,
          tareWeight: tareW,
          packagingCode: i.packagingCode,
          packagingQty: pQty,
          expiryDate: i.expiryDate || '',
          unitPrice: i.unitPrice || 0,
          amount: i.totalPrice || 0,
        };
      }),
    });

    const printData: InvoicePrintData = {
      type: 'OUTBOUND',
      invoiceNo: receiptId,
      date: outboundDate,
      partnerName: values.customer,
      warehouseStaff: user?.name ?? 'Thủ kho',
      note: `Lý do xuất: ${values.reason}`,
      items: invoiceItems,
      totalNetWeight,
      totalAmount,
    };

    setInvoiceData(printData);
    setIsInvoiceModalOpen(true);
    message.success('Xuất kho thành công! Vui lòng in phiếu để bàn giao.');

    form.resetFields();
    setSelectedSeafoods({});
    setSelectedBatches({});

    // Tải lại lô hàng để cập nhật tồn kho mới
    loadFefoBatches();
  };

  return (
    <div className="print-constrained">
      <div className="mb-6" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={2} className="m-0">Tạo Phiếu Xuất Kho Hải Sản (Quy tắc FEFO)</Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Cảnh báo và ưu tiên các lô hàng hải sản cận Hạn sử dụng (HSD) lên đầu để giảm thiểu hư hỏng.
          </Paragraph>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ReloadOutlined spin={loadingBatches} />} onClick={loadFefoBatches} loading={loadingBatches}>
            Tải lại lô hàng
          </Button>
          <Button
            type="primary"
            className="bg-sky-500 hover:bg-sky-600 border-none"
            onClick={() => {
              setScanItemIndex(null);
              setQrModalOpen(true);
            }}
          >
            Quét mã QR/Barcode
          </Button>
        </div>
      </div>

      {fefoBatches.length === 0 && !loadingBatches && (
        <Alert
          type="warning"
          showIcon
          message="Không có lô hàng nào còn tồn kho trong kho."
          description="Vui lòng nhập hàng trước khi tạo phiếu xuất kho."
          className="mb-4"
        />
      )}

      <Spin spinning={loadingBatches} tip="Đang tải danh sách lô hàng...">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            outboundDate: dayjs(),
            reason: 'Bán hàng',
            items: [{ seafoodCode: undefined, batchCode: undefined, quantity: 0, unitPrice: 0, totalPrice: 0, expiryDate: '' }],
          }}
        >
          <Card title="Thông tin phiếu xuất" className="shadow-sm mb-6">
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="customer" label="Khách hàng nhận (Siêu thị / Nhà hàng)" rules={[{ required: true, message: 'Nhập thông tin khách hàng!' }]}>
                  <Input placeholder="Nhà hàng Biển Đông, Siêu thị WinMart..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="outboundDate" label="Ngày xuất kho" rules={[{ required: true, message: 'Chọn ngày xuất!' }]}>
                  <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="reason" label="Lý do xuất kho" rules={[{ required: true, message: 'Chọn lý do xuất!' }]}>
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
                    const seafoodCode = selectedSeafoods[name];
                    const chosenBatch = selectedBatches[name];
                    const available = seafoodCode ? getBatchesForProduct(seafoodCode) : [];
                    const batchDetail = fefoBatches.find((b) => b.batchCode === chosenBatch);
                    const isViolation = !!(seafoodCode && chosenBatch && isFefoViolated(seafoodCode, chosenBatch));

                    return (
                      <Card
                        key={key}
                        type="inner"
                        size="small"
                        className="border border-sky-100"
                        extra={
                          fields.length > 1 && (
                            <Button type="text" danger icon={<DeleteOutlined />}
                              onClick={() => {
                                remove(name);
                                setSelectedSeafoods((p) => { const c = { ...p }; delete c[name]; return c; });
                                setSelectedBatches((p) => { const c = { ...p }; delete c[name]; return c; });
                              }}
                            />
                          )
                        }
                      >
                        <Row gutter={[12, 12]}>
                          {/* Loại hải sản */}
                          <Col xs={24} md={4}>
                            <Form.Item {...restField} name={[name, 'seafoodCode']} label="Loại hải sản"
                              rules={[{ required: true, message: 'Chọn hải sản!' }]}>
                              <Select
                                placeholder={productOptions.length === 0 ? 'Chưa có hàng tồn kho' : 'Chọn loại hải sản'}
                                disabled={productOptions.length === 0}
                                onChange={(val) => handleSeafoodChange(val, name)}
                                showSearch
                                filterOption={(input, opt) =>
                                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={productOptions}
                              />
                            </Form.Item>
                          </Col>

                          {/* Chọn lô hàng theo FEFO */}
                          <Col xs={24} md={4}>
                            <Form.Item {...restField} name={[name, 'batchCode']}
                              label={
                                <span>
                                  Chọn Lô hàng&nbsp;
                                  <Tag color="orange" style={{ fontSize: 11 }}>Ưu tiên FEFO</Tag>
                                </span>
                              }
                              rules={[{ required: true, message: 'Chọn lô hàng!' }]}>
                              <Select
                                placeholder="Chọn mã lô hàng"
                                disabled={!seafoodCode}
                                onChange={(val) => handleBatchChange(val, name)}
                              >
                                {available.map((b, idx) => (
                                  <Select.Option key={b.batchCode} value={b.batchCode}>
                                    <span style={{ color: idx === 0 ? '#d97706' : undefined }}>
                                      {idx === 0 ? '⚠️ ' : ''}{b.batchCode}
                                    </span>
                                    &nbsp;— HSD: {b.expiryDate} — Tồn: {b.quantity.toFixed(1)}kg
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>

                          {/* Bao bì */}
                          <Col xs={24} md={4}>
                            <Form.Item {...restField} name={[name, 'packagingCode']} label="Loại Khay/Sọt/Bì">
                              <Select placeholder="Chọn loại bao bì" allowClear onChange={() => handlePackagingChange(name)}>
                                {packagings.map((pkg) => (
                                  <Select.Option key={pkg.code} value={pkg.code}>
                                    {pkg.name} ({pkg.defaultTareWeight} kg/cái)
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={2}>
                            <Form.Item {...restField} name={[name, 'packagingQty']} label="SL Bì">
                              <InputNumber min={0} precision={0} className="w-full" onChange={() => handlePackagingChange(name)} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={2}>
                            <Form.Item {...restField} name={[name, 'tareWeight']} label="Bì (kg)">
                              <InputNumber min={0} precision={1} className="w-full" />
                            </Form.Item>
                          </Col>

                          {/* Số lượng */}
                          <Col xs={12} md={2}>
                            <Form.Item {...restField} name={[name, 'quantity']} label="SL xuất (kg)"
                              rules={[
                                { required: true, message: 'Nhập số lượng!' },
                                () => ({
                                  validator(_, value) {
                                    if (!value || value <= 0) return Promise.reject(new Error('Phải lớn hơn 0'));
                                    if (batchDetail && value > batchDetail.quantity) {
                                      return Promise.reject(new Error(`Tối đa ${batchDetail.quantity.toFixed(1)}kg`));
                                    }
                                    return Promise.resolve();
                                  },
                                }),
                              ]}>
                              <InputNumber min={0.1} precision={1} className="w-full" onChange={(qty) => handleQtyChange(qty, name)} />
                            </Form.Item>
                          </Col>

                          {/* Đơn giá - có thể chỉnh sửa */}
                          <Col xs={12} md={3}>
                            <Form.Item {...restField} name={[name, 'unitPrice']} label="Đơn giá (đ/kg)">
                              <InputNumber
                                min={0}
                                className="w-full"
                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(v) => Number(v?.replace(/,/g, '') || 0) as 0}
                                onChange={(price) => {
                                  const items = form.getFieldValue('items') || [];
                                  const item = items[name];
                                  if (item) {
                                    item.totalPrice = (item.quantity || 0) * (price || 0);
                                    form.setFieldsValue({ items });
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>

                          {/* Thành tiền */}
                          <Col xs={12} md={3}>
                            <Form.Item {...restField} name={[name, 'totalPrice']} label="Thành tiền (đ)">
                              <InputNumber disabled className="w-full"
                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Cảnh báo vi phạm FEFO */}
                        {isViolation && (
                          <Alert
                            message="⚠️ Vi phạm quy tắc FEFO: Có lô khác hết hạn sớm hơn còn hàng tồn. Hãy ưu tiên xuất lô đó trước!"
                            type="error"
                            showIcon
                            className="mt-2"
                          />
                        )}

                        {/* Thông tin lô đang chọn */}
                        {batchDetail && (
                          <div className="mt-2 text-xs text-gray-400">
                            📦 Tồn kho lô này:&nbsp;
                            <Text strong className="text-sky-600">{formatWeight(batchDetail.quantity)}</Text>
                            &nbsp;|&nbsp; Đơn giá:&nbsp;
                            <Text strong>{formatCurrency(batchDetail.unitPrice)}</Text>
                            &nbsp;|&nbsp; HSD:&nbsp;
                            <Text strong>{batchDetail.expiryDate}</Text>
                            &nbsp;|&nbsp; NCC:&nbsp;
                            <Text type="secondary">{batchDetail.supplierName}</Text>
                          </div>
                        )}
                      </Card>
                    );
                  })}

                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="py-4">
                    Thêm mặt hàng xuất kho
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

          <div className="flex justify-end gap-4">
            <Button size="large" onClick={() => navigate('/')}>Quay lại</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              disabled={fefoBatches.length === 0}
              style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
            >
              Xác nhận xuất kho
            </Button>
          </div>
        </Form>
      </Spin>

      <InvoiceModal
        open={isInvoiceModalOpen}
        data={invoiceData}
        onClose={() => { setIsInvoiceModalOpen(false); navigate('/'); }}
      />
    </div>
  );
};
export default OutboundPage;
