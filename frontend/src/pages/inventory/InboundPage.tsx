import React, { useState } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, App, Modal, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import { useProductStore } from '../../stores/useProductStore';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

// Shared static packaging types (mirrors PackagingPage data; replace with a store/API later)
const PACKAGING_TYPES = [
  { code: 'SOT-RED',   name: 'Sọt nhựa đỏ tiêu chuẩn',    defaultTareWeight: 1.8 },
  { code: 'SOT-BLUE',  name: 'Sọt nhựa xanh dương lớn',    defaultTareWeight: 2.2 },
  { code: 'THUNG-30KG', name: 'Thùng xốp lớn 30kg',         defaultTareWeight: 0.5 },
  { code: 'THUNG-10KG', name: 'Thùng carton chống ẩm 10kg', defaultTareWeight: 0.3 },
];

const QUICK_ADD_CATEGORIES = [
  { id: 'CA',   name: 'Cá' },
  { id: 'TOM',  name: 'Tôm' },
  { id: 'CUA',  name: 'Cua' },
  { id: 'MUC',  name: 'Mực & Bạch tuộc' },
  { id: 'HAU',  name: 'Hàu & Nhuyễn thể' },
  { id: 'KHAC', name: 'Hải sản khác' },
];

export const InboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const addReceipt = useInboundStore((state) => state.addReceipt);
  const { products, addProduct } = useProductStore();

  // ── quick-add modal state ────────────────────────────────────────────────────
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Stores which form-list item index triggered the quick-add, so we can auto-select
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

  const activeProducts = products.filter((p) => p.status === 'ACTIVE');

  const onFinish = (values: any) => {
    // Format dates before saving
    const formattedItems = (values.items || []).map((item: any) => {
      const selectedProduct = activeProducts.find((p) => p.code === item.seafoodCode);
      return {
        ...item,
        seafoodName: selectedProduct ? selectedProduct.name : item.seafoodCode ?? 'Chưa xác định',
        catchDate: item.catchDate ? item.catchDate.format('YYYY-MM-DD') : '',
        expiryDate: item.expiryDate ? item.expiryDate.format('YYYY-MM-DD') : '',
        netWeight: Math.max(0, (item.totalWeight || 0) - (item.tareWeight || 0)),
        totalPrice: Math.max(0, (item.totalWeight || 0) - (item.tareWeight || 0)) * (item.unitPrice || 0),
      };
    });

    const totalAmount = formattedItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    addReceipt({
      supplier: values.supplier,
      inboundDate: values.inboundDate ? values.inboundDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      storageLocation: values.storageLocation,
      items: formattedItems,
      totalAmount,
    });

    message.success('Tạo phiếu nhập kho thành công!');
    navigate('/inventory/inbound-history');
  };

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    const items = allValues.items || [];
    let isChanged = false;
    const dateStr = allValues.inboundDate ? allValues.inboundDate.format('YYYYMMDD') : '';

    const updatedItems = items.map((item: any) => {
      if (!item) return item;

      // Auto-compute tare from packaging type × quantity
      const pkg = PACKAGING_TYPES.find((p) => p.code === item.packagingCode);
      const pkgQty = Number(item.packagingQty) || 0;
      const computedTare = pkg ? pkgQty * pkg.defaultTareWeight : Number(item.tareWeight) || 0;

      const total = Number(item.totalWeight) || 0;
      const computedNet = Math.max(0, total - computedTare);

      const price = Number(item.unitPrice) || 0;
      const computedTotal = computedNet * price;

      const code = item.seafoodCode || '';
      const computedBatch = code && dateStr ? `LOT-${code}-${dateStr}` : '';

      let updatedItem = { ...item };

      // Only push tare update when a packaging type is selected (don't stomp manual entry)
      if (pkg && item.tareWeight !== computedTare) {
        updatedItem.tareWeight = computedTare;
        isChanged = true;
      }
      if (item.netWeight !== computedNet) {
        updatedItem.netWeight = computedNet;
        isChanged = true;
      }
      if (item.totalPrice !== computedTotal) {
        updatedItem.totalPrice = computedTotal;
        isChanged = true;
      }
      if (item.batchCode !== computedBatch) {
        updatedItem.batchCode = computedBatch;
        isChanged = true;
      }

      return updatedItem;
    });

    if (isChanged) {
      form.setFieldsValue({ items: updatedItems });
    }
  };

  // ── quick-add submit ──────────────────────────────────────────────────────────
  const handleQuickAddSubmit = (values: any) => {
    const cat = QUICK_ADD_CATEGORIES.find((c) => c.id === values.categoryId);
    const newProduct = addProduct({
      code: (values.code as string).toUpperCase(),
      name: values.name,
      categoryId: values.categoryId,
      categoryName: cat?.name,
      unit: values.unit || 'Kg',
      storageType: values.storageType || 'FROZEN',
      targetTemperature: values.targetTemperature ?? -18,
      warningDaysBeforeExpiry: values.warningDaysBeforeExpiry ?? 3,
      minStock: 0,
      maxStock: 9999,
      referencePrice: 0,
      status: 'ACTIVE',
      note: values.note,
    });

    // Auto-select the new product in the triggering form-list row
    if (pendingItemIndex !== null) {
      const items = form.getFieldValue('items') || [];
      items[pendingItemIndex] = { ...items[pendingItemIndex], seafoodCode: newProduct.code };
      form.setFieldsValue({ items });
    }

    message.success(`Đã thêm nhanh "${newProduct.name}" vào danh mục!`);
    setQuickAddOpen(false);
    quickAddForm.resetFields();
    setPendingItemIndex(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Title level={2} className="m-0">Tạo Phiếu Nhập Kho Hải Sản</Title>
        <Paragraph type="secondary">Nhập thông tin nhà cung cấp, lô hàng và các chỉ số đo lường bảo quản hải sản.</Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        initialValues={{
          inboundDate: dayjs(),
          items: [
            {
              seafoodCode: undefined,
              totalWeight: 0,
              tareWeight: 0,
              netWeight: 0,
              storageCondition: 'Cấp đông',
              unitPrice: 0,
              totalPrice: 0,
              batchCode: '',
            },
          ],
        }}
      >
        <Card title="Thông tin chung" className="shadow-sm mb-6">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="supplier"
                label="Nhà cung cấp (Vựa / Tàu cá)"
                rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp!' }]}
              >
                <Input placeholder="Vựa hải sản Hùng Vương, Tàu cá QT-..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="inboundDate"
                label="Ngày nhập kho"
                rules={[{ required: true, message: 'Vui lòng chọn ngày nhập!' }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="storageLocation"
                label="Kho / Tủ đông nhận"
                rules={[{ required: true, message: 'Vui lòng chọn kho lưu trữ!' }]}
              >
                <Select placeholder="Chọn khu vực lưu trữ">
                  <Select.Option value="Kho đông lạnh A1">Kho đông lạnh A1 (Giáp xác)</Select.Option>
                  <Select.Option value="Kho đông lạnh A2">Kho đông lạnh A2 (Cua cá)</Select.Option>
                  <Select.Option value="Kho làm mát B1">Kho làm mát B1 (Tươi sống)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Danh sách hải sản nhập kho" className="shadow-sm mb-6">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-4">
                {fields.map(({ key, name, ...restField }) => (
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
                          onClick={() => remove(name)}
                        />
                      )
                    }
                  >
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'seafoodCode']}
                          label="Loại hải sản"
                          rules={[{ required: true, message: 'Chọn loại!' }]}
                        >
                          <Select
                            placeholder="Chọn loại hải sản"
                            showSearch
                            optionFilterProp="label"
                            dropdownRender={(menu) => (
                              <>
                                {menu}
                                <Divider className="my-1" />
                                <Button
                                  type="link"
                                  icon={<AppstoreAddOutlined />}
                                  className="w-full text-left px-3 py-1 text-sky-600 hover:bg-sky-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setPendingItemIndex(name);
                                    quickAddForm.resetFields();
                                    quickAddForm.setFieldsValue({
                                      storageType: 'FROZEN',
                                      unit: 'Kg',
                                      warningDaysBeforeExpiry: 3,
                                      targetTemperature: -18,
                                    });
                                    setQuickAddOpen(true);
                                  }}
                                >
                                  + Thêm mặt hàng mới
                                </Button>
                              </>
                            )}
                          >
                            {activeProducts.map((p) => (
                              <Select.Option key={p.code} value={p.code} label={p.name}>
                                <div className="flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span className="text-xs text-slate-400 font-mono">({p.code})</span>
                                </div>
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'packagingCode']}
                          label="Loại Khay/Bì"
                        >
                          <Select placeholder="Chọn loại khay/bì" allowClear>
                            {PACKAGING_TYPES.map((pkg) => (
                              <Select.Option key={pkg.code} value={pkg.code}>
                                {pkg.name} ({pkg.defaultTareWeight} kg)
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'packagingQty']}
                          label="SL Khay/Bì"
                        >
                          <InputNumber min={0} precision={0} className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'totalWeight']}
                          label="Tổng cân (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'tareWeight']}
                          label="Bì/Khay (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'netWeight']}
                          label="Cân thực (kg)"
                        >
                          <InputNumber disabled className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={2}>
                        <Form.Item
                          {...restField}
                          name={[name, 'storageCondition']}
                          label="Bảo quản"
                          rules={[{ required: true, message: 'Chọn!' }]}
                        >
                          <Select>
                            <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                            <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                            <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'batchCode']}
                          label="Mã Lô (Tự động)"
                        >
                          <Input placeholder="Mã lô hàng" disabled className="text-gray-500 font-semibold" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[12, 12]} className="mt-2">
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'catchDate']}
                          label="Ngày đánh bắt"
                        >
                          <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'expiryDate']}
                          label="Hạn sử dụng"
                          rules={[{ required: true, message: 'Chọn HSD!' }]}
                        >
                          <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitPrice']}
                          label="Đơn giá (đ/kg)"
                          rules={[{ required: true, message: 'Nhập giá!' }]}
                        >
                          <InputNumber
                            min={0}
                            className="w-full"
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
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
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  className="py-4 hover:border-sky-400 hover:text-sky-500"
                >
                  Thêm hải sản nhập kho
                </Button>
              </div>
            )}
          </Form.List>
        </Card>

        <div className="flex justify-end gap-4">
          <Button size="large" onClick={() => navigate('/inventory/inbound-history')}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            className="bg-sky-500 hover:bg-sky-600 border-none"
          >
            Lưu phiếu nhập
          </Button>
        </div>
      </Form>

      {/* ── Quick-Add Product Modal ────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AppstoreAddOutlined className="text-sky-500" />
            <span>Thêm Nhanh Mặt Hàng Mới Vào Danh Mục</span>
          </div>
        }
        open={quickAddOpen}
        onCancel={() => { setQuickAddOpen(false); quickAddForm.resetFields(); setPendingItemIndex(null); }}
        footer={null}
        destroyOnClose
        width={560}
      >
        <p className="text-slate-500 text-sm mb-4">
          Điền thông tin cơ bản — sản phẩm sẽ được tự động chọn ngay vào dòng nhập kho hiện tại.
        </p>
        <Form
          form={quickAddForm}
          layout="vertical"
          onFinish={handleQuickAddSubmit}
          initialValues={{ storageType: 'FROZEN', unit: 'Kg', warningDaysBeforeExpiry: 3, targetTemperature: -18 }}
        >
          <Row gutter={12}>
            <Col span={9}>
              <Form.Item name="code" label="Mã Hàng" rules={[{ required: true, message: 'Nhập mã!' }]}>
                <Input placeholder="VD: HS-CA-CAHOI" className="font-mono" />
              </Form.Item>
            </Col>
            <Col span={15}>
              <Form.Item name="name" label="Tên Sản Phẩm" rules={[{ required: true, message: 'Nhập tên!' }]}>
                <Input placeholder="VD: Cá Chẽm tươi sống" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="categoryId" label="Danh Mục" rules={[{ required: true, message: 'Chọn danh mục!' }]}>
                <Select options={QUICK_ADD_CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} placeholder="Danh mục" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="unit" label="Đơn Vị" rules={[{ required: true }]}>
                <Input placeholder="Kg / Con" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="storageType" label="Bảo Quản" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'ALIVE',  label: 'Tươi sống' },
                  { value: 'FRESH',  label: 'Ướp đá' },
                  { value: 'FROZEN', label: 'Cấp đông' },
                  { value: 'DRY',    label: 'Khô' },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="targetTemperature" label="Nhiệt Độ Bảo Quản (°C)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="-18" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="warningDaysBeforeExpiry" label="Cảnh Báo HSD (ngày)" rules={[{ required: true }]}>
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
            <Input.TextArea rows={2} placeholder="Xuất xứ, quy cách, lưu ý..." />
          </Form.Item>

          <div className="flex justify-end gap-3">
            <Button onClick={() => { setQuickAddOpen(false); quickAddForm.resetFields(); setPendingItemIndex(null); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} className="bg-sky-500 hover:bg-sky-600 border-none">
              Lưu sản phẩm &amp; chọn ngay
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
export default InboundPage;
