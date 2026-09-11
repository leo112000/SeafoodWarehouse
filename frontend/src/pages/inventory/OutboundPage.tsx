import React, { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, DatePicker, Select, InputNumber,
  Row, Col, Typography, App, Alert, Spin, Tag,
  Tooltip,
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
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';

const { Text } = Typography;

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

  const { isSubmitting, handleSubmit: onFinish } = useAsyncSubmit(async (values: any) => {
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
    const subTotal = invoiceItems.reduce((s: number, i: any) => s + i.totalAmount, 0);

    // Vật phẩm bán kèm (Thùng xốp, phụ kiện...)
    const formSupplies = values.supplies || [];
    const suppliesItems = formSupplies
      .filter((s: any) => s && s.name && s.quantity > 0)
      .map((s: any) => ({
        name: s.name,
        packagingCode: s.packagingCode,
        unit: s.unit || 'Cái',
        quantity: Number(s.quantity) || 1,
        unitPrice: Number(s.unitPrice) || 0,
        totalAmount: (Number(s.quantity) || 1) * (Number(s.unitPrice) || 0),
      }));
    const suppliesTotal = suppliesItems.reduce((sum: number, s: any) => sum + s.totalAmount, 0);

    // Giảm giá / Chiết khấu
    const discountAmount = Number(values.discountAmount) || 0;
    const discountReason = values.discountReason || '';
    const finalTotalAmount = Math.max(0, subTotal + suppliesTotal - discountAmount);

    const rawCustomer = values.customer?.trim() || 'Khách lẻ';
    const phone = values.customerPhone?.trim() || '';
    const customerName = phone ? `${rawCustomer} - ${phone}` : rawCustomer;

    // Lưu vào SQL Server qua API
    await addTransaction({
      id: receiptId,
      date: outboundDate,
      customerName: customerName,
      reason: values.reason,
      totalWeightKg: totalNetWeight,
      totalAmount: finalTotalAmount,
      subTotal,
      discountAmount,
      discountReason,
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
      supplies: suppliesItems,
    } as any);

    const printData: InvoicePrintData = {
      type: 'OUTBOUND',
      invoiceNo: receiptId,
      date: outboundDate,
      partnerName: rawCustomer,
      partnerPhone: phone || undefined,
      warehouseStaff: user?.name ?? 'Thủ kho',
      note: `Lý do xuất: ${values.reason}`,
      items: invoiceItems,
      supplies: suppliesItems,
      subTotal,
      suppliesTotal,
      discountAmount,
      discountReason,
      totalNetWeight,
      totalAmount: finalTotalAmount,
    };

    setInvoiceData(printData);
    setIsInvoiceModalOpen(true);
    message.success('Xuất kho thành công! Vui lòng in phiếu để bàn giao.');

    form.resetFields();
    setSelectedSeafoods({});
    setSelectedBatches({});
    loadFefoBatches();
  });

  return (
    <div className="print-constrained">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Tạo Phiếu Xuất Kho (FEFO)
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tooltip title="Tải lại lô hàng">
            <Button icon={<ReloadOutlined spin={loadingBatches} />} onClick={loadFefoBatches} loading={loadingBatches} size="middle">
              <span className="hidden sm:inline">Tải lại</span>
            </Button>
          </Tooltip>
          <Button
            type="primary"
            className="bg-sky-500 hover:bg-sky-600 border-none font-medium"
            onClick={() => {
              setScanItemIndex(null);
              setQrModalOpen(true);
            }}
            size="middle"
          >
            <span className="hidden sm:inline">Quét QR</span>
            <span className="sm:hidden">Quét</span>
          </Button>
        </div>
      </div>

      {fefoBatches.length === 0 && !loadingBatches && (
        <Alert
          type="warning"
          showIcon
          title="Không có lô hàng nào còn tồn kho trong kho."
          description="Vui lòng nhập hàng trước khi tạo phiếu xuất kho."
          className="mb-4"
        />
      )}

      <Spin spinning={loadingBatches} description="Đang tải danh sách lô hàng...">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            outboundDate: dayjs(),
            reason: 'Bán hàng',
            discountAmount: 0,
            discountReason: '',
            items: [{ seafoodCode: undefined, batchCode: undefined, quantity: 0, unitPrice: 0, totalPrice: 0, expiryDate: '' }],
            supplies: [],
          }}
        >
          <Card title="Thông tin phiếu xuất" className="shadow-sm mb-6">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="customer"
                  label="Khách hàng / Người nhận"
                  rules={[{ required: true, message: 'Vui lòng nhập tên người nhận!' }]}
                >
                  <Input
                    placeholder="VD: Anh Nam, Chị Mai, Nhà hàng Biển Đông..."
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Form.Item
                  name="customerPhone"
                  label="Số điện thoại"
                >
                  <Input
                    placeholder="VD: 0912 345 678"
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={12} md={7}>
                <Form.Item name="outboundDate" label="Ngày xuất kho" rules={[{ required: true, message: 'Chọn ngày xuất!' }]}>
                  <DatePicker showTime className="w-full" format="YYYY-MM-DD HH:mm" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Form.Item name="reason" label="Lý do xuất kho" rules={[{ required: true, message: 'Chọn lý do xuất!' }]}>
                  <Select showSearch optionFilterProp="children" popupMatchSelectWidth={false}>
                    <Select.Option value="Bán hàng">Bán hàng (Thương mại)</Select.Option>
                    <Select.Option value="Chuyển kho">Chuyển kho nội bộ</Select.Option>
                    <Select.Option value="Tiêu hủy">Tiêu hủy (Hỏng / Hết hạn)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 1. Danh sách hải sản xuất kho */}
          <Card title="1. Chi tiết hải sản xuất kho (Theo Lô &amp; FEFO)" className="shadow-sm mb-6">
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
                                popupMatchSelectWidth={false}
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
                                showSearch
                                popupMatchSelectWidth={false}
                                optionLabelProp="label"
                                filterOption={(input, option) => {
                                  const text = String(option?.value ?? '') + ' ' + String(option?.label ?? '');
                                  return text.toLowerCase().includes(input.toLowerCase());
                                }}
                                onChange={(val) => handleBatchChange(val, name)}
                              >
                                {available.map((b, idx) => (
                                  <Select.Option
                                    key={b.batchCode}
                                    value={b.batchCode}
                                    label={`${b.batchCode} (${b.quantity.toFixed(1)}kg)`}
                                  >
                                    <div className="py-1 min-w-[260px]">
                                      <div className="flex items-center justify-between gap-2 font-semibold text-slate-800 dark:text-slate-200">
                                        <span className={idx === 0 ? 'text-amber-600 font-bold' : ''}>
                                          {idx === 0 ? '⚡ ' : ''}{b.batchCode}
                                        </span>
                                        <Tag color="cyan" className="m-0 text-[11px]">Tồn: {b.quantity.toFixed(1)}kg</Tag>
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between gap-2">
                                        <span>HSD: {b.expiryDate}</span>
                                        {b.unitPrice ? <span>{formatCurrency(b.unitPrice)}/kg</span> : null}
                                      </div>
                                    </div>
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>

                          {/* Bao bì */}
                          <Col xs={24} md={4}>
                            <Form.Item {...restField} name={[name, 'packagingCode']} label="Loại Khay/Sọt/Bì">
                              <Select
                                placeholder="Chọn loại bao bì"
                                allowClear
                                showSearch
                                popupMatchSelectWidth={false}
                                optionLabelProp="label"
                                filterOption={(input, option) => {
                                  const text = String(option?.value ?? '') + ' ' + String(option?.label ?? '');
                                  return text.toLowerCase().includes(input.toLowerCase());
                                }}
                                onChange={() => handlePackagingChange(name)}
                              >
                                {packagings.map((pkg) => (
                                  <Select.Option key={pkg.code} value={pkg.code} label={pkg.name}>
                                    <div className="py-0.5 flex items-center justify-between gap-2 min-w-[220px]">
                                      <span className="font-medium text-slate-800 dark:text-slate-200">{pkg.name}</span>
                                      <Tag color="blue" className="m-0 text-[11px]">{pkg.defaultTareWeight} kg/cái</Tag>
                                    </div>
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={2}>
                            <Form.Item {...restField} name={[name, 'packagingQty']} label="SL Bì">
                              <InputNumber min={0} precision={0} className="w-full" inputMode="numeric" onChange={() => handlePackagingChange(name)} />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={2}>
                            <Form.Item {...restField} name={[name, 'tareWeight']} label="Bì (kg)">
                              <InputNumber min={0} precision={1} className="w-full" inputMode="decimal" />
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
                              <InputNumber min={0.1} precision={1} className="w-full" inputMode="decimal" onChange={(qty) => handleQtyChange(qty, name)} />
                            </Form.Item>
                          </Col>

                          {/* Đơn giá - có thể chỉnh sửa */}
                          <Col xs={12} md={3}>
                            <Form.Item {...restField} name={[name, 'unitPrice']} label="Đơn giá (đ/kg)">
                              <InputNumber
                                min={0}
                                className="w-full"
                                inputMode="numeric"
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
                    Thêm mặt hàng hải sản xuất kho
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

          {/* 2. Vật phẩm bán kèm & Phụ phí (Thùng xốp, đá gel...) */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <span>📦 2. Vật phẩm bán kèm &amp; Phụ phí đóng gói (Thùng xốp, đá gel...)</span>
                <Tag color="cyan">Tùy chọn</Tag>
              </div>
            }
            className="shadow-sm mb-6"
          >
            <Form.List name="supplies">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <Card key={key} size="small" type="inner" className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <Row gutter={[12, 12]} align="middle">
                        <Col xs={24} md={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'name']}
                            label="Tên vật phẩm / Dịch vụ kèm"
                            rules={[{ required: true, message: 'Nhập tên vật phẩm!' }]}
                          >
                            <Input
                              placeholder="Nhập tên vật phẩm / dịch vụ kèm (VD: Thùng xốp, đá gel, phí ship...)"
                              allowClear
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={3}>
                          <Form.Item {...restField} name={[name, 'unit']} label="Đơn vị">
                            <Input placeholder="Cái/Thùng" defaultValue="Cái" />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={3}>
                          <Form.Item
                            {...restField}
                            name={[name, 'quantity']}
                            label="Số lượng"
                            rules={[{ required: true, message: 'SL!' }]}
                          >
                            <InputNumber
                              min={1}
                              precision={0}
                              className="w-full"
                              inputMode="numeric"
                              onChange={(qty) => {
                                const supplies = form.getFieldValue('supplies') || [];
                                const item = supplies[name];
                                if (item) {
                                  item.totalAmount = (qty || 0) * (item.unitPrice || 0);
                                  form.setFieldsValue({ supplies });
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Item {...restField} name={[name, 'unitPrice']} label="Đơn giá (đ)">
                            <InputNumber
                              min={0}
                              className="w-full"
                              inputMode="numeric"
                              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(v) => Number(v?.replace(/,/g, '') || 0) as 0}
                              onChange={(price) => {
                                const supplies = form.getFieldValue('supplies') || [];
                                const item = supplies[name];
                                if (item) {
                                  item.totalAmount = (item.quantity || 0) * (price || 0);
                                  form.setFieldsValue({ supplies });
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={10} md={4}>
                          <Form.Item {...restField} name={[name, 'totalAmount']} label="Thành tiền (đ)">
                            <InputNumber
                              disabled
                              className="w-full font-semibold"
                              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={2} md={2} className="flex items-end justify-center pt-6">
                          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Button
                    type="dashed"
                    onClick={() => add({ name: '', unit: 'Cái', quantity: 1, unitPrice: 0, totalAmount: 0 })}
                    block
                    icon={<PlusOutlined />}
                  >
                    Thêm thùng xốp / đá gel / vật phẩm kèm
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

          {/* 3. Chiết khấu & Tổng kết đơn hàng */}
          <Card
            title={<span className="font-bold text-slate-800 dark:text-slate-100">3. Chiết khấu &amp; Tổng kết thanh toán</span>}
            className="shadow-sm mb-6 bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="discountAmount" label="Số tiền giảm giá / Chiết khấu (VNĐ)">
                      <InputNumber
                        min={0}
                        className="w-full"
                        inputMode="numeric"
                        placeholder="Ví dụ: 50,000"
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(v) => Number(v?.replace(/,/g, '') || 0) as 0}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="discountReason" label="Lý do / Mã Voucher giảm giá">
                      <Input placeholder="VIP-10%, Khai trương, Khách quen..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const formValues = form.getFieldsValue();
                    const items = formValues.items || [];
                    const supplies = formValues.supplies || [];
                    const discount = Number(formValues.discountAmount) || 0;

                    const seafoodTotal = items.reduce((s: number, i: any) => s + (Number(i?.totalPrice) || 0), 0);
                    const totalWeight = items.reduce((s: number, i: any) => s + (Number(i?.quantity) || 0), 0);
                    const suppliesTotal = supplies.reduce((s: number, sup: any) => s + (Number(sup?.totalAmount) || (Number(sup?.quantity || 0) * Number(sup?.unitPrice || 0))), 0);
                    const grandTotal = Math.max(0, seafoodTotal + suppliesTotal - discount);

                    return (
                      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Tổng khối lượng hải sản:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{totalWeight.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Tiền hàng hải sản:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(seafoodTotal)}</span>
                        </div>
                        {suppliesTotal > 0 && (
                          <div className="flex justify-between text-sm text-sky-600 dark:text-sky-400">
                            <span>Tiền thùng xốp / vật phẩm kèm:</span>
                            <span className="font-semibold">+{formatCurrency(suppliesTotal)}</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between items-center text-sm px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
                            <span>🎁 Chiết khấu {formValues.discountReason ? `(${formValues.discountReason})` : ''}:</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrency(discount)}</span>
                          </div>
                        )}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center">
                          <span className="font-bold text-base text-slate-900 dark:text-white">TỔNG THANH TOÁN:</span>
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <div className="flex justify-end gap-4">
            <Button size="large" disabled={isSubmitting} onClick={() => navigate('/')}>Quay lại</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              loading={isSubmitting}
              disabled={isSubmitting || fefoBatches.length === 0}
              style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
            >
              {isSubmitting ? 'Đang xuất kho...' : 'Xác nhận xuất kho & In hóa đơn'}
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
