import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, App, Modal, Divider, Space, AutoComplete, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, AppstoreAddOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import { useProductStore } from '../../stores/useProductStore';
import { usePackagingStore } from '../../stores/usePackagingStore';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { QRScannerModal } from '../../components/common/QRScannerModal';
import { partnerService, type PartnerItem } from '../../services/partnerService';
import dayjs from 'dayjs';

export const InboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const addReceipt = useInboundStore((state) => state.addReceipt);
  const { products, fetchProducts, addProduct } = useProductStore();
  const { packagings, fetchPackagings } = usePackagingStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [suppliers, setSuppliers] = useState<PartnerItem[]>([]);

  // Fetch packaging, category, products and suppliers data from database on mount
  useEffect(() => {
    fetchProducts();
    fetchPackagings();
    fetchCategories();
    partnerService.getAll('SUPPLIER').then(setSuppliers).catch(() => { });
  }, [fetchProducts, fetchPackagings, fetchCategories]);

  // ── quick-add modal state ────────────────────────────────────────────────────
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Stores which form-list item index triggered the quick-add, so we can auto-select
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

  // ── QR/Barcode scanner state ────────────────────────────────────────────────
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scanItemIndex, setScanItemIndex] = useState<number | null>(null);
  void setScanItemIndex;

  const activeProducts = products.filter((p) => !p.status || p.status.toUpperCase() === 'ACTIVE');

  const handleScanSuccess = (scannedText: string) => {
    try {
      let codeToMatch = scannedText.trim();
      let parsedWeight: number | undefined;
      let parsedLot: string | undefined;
      let parsedExp: string | undefined;

      // Hỗ trợ nếu mã QR là JSON chứa chi tiết lô hàng (tem in nhiệt)
      if (scannedText.startsWith('{') && scannedText.endsWith('}')) {
        try {
          const parsed = JSON.parse(scannedText);
          codeToMatch = parsed.pCode || parsed.code || parsed.lot || codeToMatch;
          parsedWeight = parsed.weight ? Number(parsed.weight) : undefined;
          parsedLot = parsed.lot;
          parsedExp = parsed.exp;
        } catch {}
      }

      // 1. Tìm chính xác tuyệt đối theo Mã sản phẩm hoặc ID trước (Exact Match)
      const inputTrimmed = codeToMatch.trim().toLowerCase();
      let matchedProduct = activeProducts.find(
        (p) => p.code.toLowerCase() === inputTrimmed || String(p.id).toLowerCase() === inputTrimmed
      );

      // 2. Nếu chưa thấy, tìm theo chuỗi chuẩn hóa mã không dấu phân cách
      if (!matchedProduct) {
        const cleanInput = inputTrimmed.replace(/[^a-z0-9]/g, '');
        matchedProduct = activeProducts.find((p) => {
          const pCodeClean = p.code.toLowerCase().replace(/[^a-z0-9]/g, '');
          return pCodeClean === cleanInput;
        });
      }

      // 3. Nếu vẫn chưa thấy, tìm theo tên hải sản
      if (!matchedProduct) {
        matchedProduct = activeProducts.find((p) =>
          p.name.toLowerCase().includes(inputTrimmed)
        );
      }

      if (!matchedProduct) {
        message.warning(`Không tìm thấy hải sản có mã "${scannedText}". Hãy kiểm tra lại mã hoặc bấm [+ Thêm mặt hàng mới]!`);
        return;
      }

      const currentFormValues = form.getFieldsValue();
      const currentItems = Array.isArray(currentFormValues.items) ? [...currentFormValues.items] : [];

      let targetIndex = -1;

      // Nếu bấm nút "Quét dòng này" ở dòng cụ thể
      if (scanItemIndex !== null && scanItemIndex >= 0 && scanItemIndex < currentItems.length) {
        targetIndex = scanItemIndex;
      } else {
        // Nếu bấm nút Quét chung:
        // Tìm dòng đầu tiên mà seafoodCode đang trống/undefined/chuỗi rỗng
        const emptyIdx = currentItems.findIndex(
          (it) => !it || !it.seafoodCode || String(it.seafoodCode).trim() === ''
        );
        if (emptyIdx !== -1) {
          targetIndex = emptyIdx;
        } else {
          // Nếu tất cả các dòng đều đã có hải sản -> thêm dòng mới vào sau
          targetIndex = currentItems.length;
        }
      }

      const existingRow = currentItems[targetIndex] || {
        packagingCode: 'SOT-RED',
        packagingQty: 1,
        totalWeight: 0,
        tareWeight: 1.8,
        netWeight: 0,
        storageCondition: 'Cấp đông',
        unitPrice: 0,
        totalPrice: 0,
      };

      const newBatchCode = parsedLot || `LOT-${matchedProduct.code}-${dayjs().format('YYYYMMDDHHmmss')}`;
      const defaultWeight = parsedWeight !== undefined ? parsedWeight : (existingRow.totalWeight || 0);

      currentItems[targetIndex] = {
        ...existingRow,
        seafoodCode: matchedProduct.code,
        batchCode: newBatchCode,
        totalWeight: defaultWeight,
        unitPrice: matchedProduct.referencePrice || existingRow.unitPrice || 0,
        expiryDate: parsedExp ? dayjs(parsedExp) : existingRow.expiryDate,
      };

      console.log('>>> SCANNED RAW TEXT:', scannedText, '>>> MATCHED:', matchedProduct);

      // Cập nhật lại toàn bộ mảng items vào Form
      form.setFieldsValue({ items: currentItems });
      handleValuesChange({}, { ...currentFormValues, items: currentItems });
      setScanItemIndex(null); // Reset trạng thái
      message.success(`✅ Đã quét mã "${scannedText}" ➔ Khớp: ${matchedProduct.name} (${matchedProduct.code})`);
    } catch (e) {
      console.error(e);
      message.error('Lỗi khi xử lý mã QR.');
    }
  };

  const onFinish = async (values: any) => {
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

    await addReceipt({
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

    const updatedItems = items.map((item: any) => {
      if (!item) return item;

      // Auto-compute tare from packaging type × quantity
      const pkg = packagings.find((p) => p.code === item.packagingCode);
      const pkgQty = Number(item.packagingQty) || 0;
      const computedTare = pkg ? pkgQty * pkg.defaultTareWeight : Number(item.tareWeight) || 0;

      const total = Number(item.totalWeight) || 0;
      const computedNet = Math.max(0, total - computedTare);

      const price = Number(item.unitPrice) || 0;
      const computedTotal = computedNet * price;

      const code = item.seafoodCode || '';
      const existingBatch = item.batchCode || '';
      const computedBatch = code
        ? (existingBatch && existingBatch.startsWith(`LOT-${code}`) ? existingBatch : `LOT-${code}-${dayjs().format('YYYYMMDDHHmmss')}`)
        : '';

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
  const handleQuickAddSubmit = async (values: any) => {
    const cat = categories.find((c) => c.id === values.categoryId);
    const newProduct = await addProduct({
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
    <div className="print-constrained">
      <div className="mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">Tạo Phiếu Nhập Kho</h1>
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
                label="Nhà cung cấp (Tàu cá / Vựa)"
                rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập tên nhà cung cấp!' }]}
                extra="Chọn từ danh sách nhà cung cấp hoặc gõ tên mới."
              >
                <AutoComplete
                  allowClear
                  placeholder="Chọn nhà cung cấp hoặc gõ tên mới..."
                  options={suppliers.map((s) => ({
                    value: s.name,
                    label: `⚓ ${s.name} (${s.code})${s.phone ? ` - ${s.phone}` : ''}`,
                  }))}
                  filterOption={(inputValue, option) => {
                    const text = String(option?.label || '') + ' ' + String(option?.value || '');
                    return text.toLowerCase().includes(inputValue.toLowerCase());
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item
                name="inboundDate"
                label="Ngày nhập kho"
                rules={[{ required: true, message: 'Vui lòng chọn ngày nhập!' }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item
                name="storageLocation"
                label="Kho / Tủ đông nhận"
                rules={[{ required: true, message: 'Vui lòng chọn kho lưu trữ!' }]}
              >
                <Select placeholder="Chọn khu vực lưu trữ" showSearch optionFilterProp="children" popupMatchSelectWidth={false}>
                  <Select.Option value="Kho đông lạnh A1">Kho đông lạnh A1 (Giáp xác)</Select.Option>
                  <Select.Option value="Kho đông lạnh A2">Kho đông lạnh A2 (Cua cá)</Select.Option>
                  <Select.Option value="Kho làm mát B1">Kho làm mát B1 (Tươi sống)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="Danh sách hải sản nhập kho"
          className="shadow-sm mb-6"
          extra={
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={() => {
                setScanItemIndex(null);
                setQrModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 font-medium"
            >
              📷 Quét Mã QR / Barcode
            </Button>
          }
        >
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
                      <Space>
                        <Button
                          size="small"
                          type="dashed"
                          icon={<QrcodeOutlined />}
                          onClick={() => {
                            setScanItemIndex(name);
                            setQrModalOpen(true);
                          }}
                          className="text-sky-600 border-sky-400"
                        >
                          Quét dòng này
                        </Button>
                        {fields.length > 1 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Space>
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
                            popupMatchSelectWidth={false}
                            optionLabelProp="label"
                            optionFilterProp="label"
                            popupRender={(menu) => (
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
                                <div className="py-0.5 flex items-center justify-between gap-2 min-w-[220px]">
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">{p.name}</span>
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
                          name={[name, 'batchCode']}
                          label="Mã Lô (Tự động)"
                        >
                          <Input placeholder="Mã lô hàng" disabled className="text-gray-500 font-semibold" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'packagingCode']}
                          label="Loại Khay/Bì"
                        >
                          <Select
                            placeholder="Chọn loại khay/bì"
                            allowClear
                            showSearch
                            popupMatchSelectWidth={false}
                            optionLabelProp="label"
                            optionFilterProp="label"
                          >
                            {packagings.map((pkg) => (
                              <Select.Option key={pkg.code} value={pkg.code} label={pkg.name}>
                                <div className="py-0.5 flex items-center justify-between gap-2 min-w-[200px]">
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{pkg.name}</span>
                                  <Tag color="blue" className="m-0 text-[11px]">{pkg.defaultTareWeight} kg</Tag>
                                </div>
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={2}>
                        <Form.Item
                          {...restField}
                          name={[name, 'packagingQty']}
                          label="SL Khay/Bì"
                        >
                          <InputNumber min={0} precision={0} className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={2}>
                        <Form.Item
                          {...restField}
                          name={[name, 'totalWeight']}
                          label="Tổng cân (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={2}>
                        <Form.Item
                          {...restField}
                          name={[name, 'tareWeight']}
                          label="Bì/Khay (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={2}>
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
                          <Select showSearch optionFilterProp="children">
                            <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                            <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                            <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                          </Select>
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
        style={{ maxWidth: '95vw' }}
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
            <Col xs={24} sm={9}>
              <Form.Item name="code" label="Mã Hàng" rules={[{ required: true, message: 'Nhập mã!' }]}>
                <Input placeholder="VD: HS-CA-CAHOI" className="font-mono" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={15}>
              <Form.Item name="name" label="Tên Sản Phẩm" rules={[{ required: true, message: 'Nhập tên!' }]}>
                <Input placeholder="VD: Cá Chẽm tươi sống" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item name="categoryId" label="Danh Mục" rules={[{ required: true, message: 'Chọn danh mục!' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Danh mục"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={7}>
              <Form.Item name="unit" label="Đơn Vị" rules={[{ required: true }]}>
                <Input placeholder="Kg / Con" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={7}>
              <Form.Item name="storageType" label="Bảo Quản" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 'ALIVE', label: 'Tươi sống' },
                    { value: 'FRESH', label: 'Ướp đá' },
                    { value: 'FROZEN', label: 'Cấp đông' },
                    { value: 'DRY', label: 'Khô' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12} sm={12}>
              <Form.Item name="targetTemperature" label="Nhiệt Độ Bảo Quản (°C)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} placeholder="-18" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12}>
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

      <QRScannerModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Quét Mã Vạch / QR Code Hải Sản"
      />
    </div>
  );
};
export default InboundPage;
