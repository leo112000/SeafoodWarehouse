import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, App, Modal, Divider, AutoComplete, Tag, Segmented, Table, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, AppstoreAddOutlined, BranchesOutlined, TableOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import { useProductStore } from '../../stores/useProductStore';
import { usePackagingStore } from '../../stores/usePackagingStore';
import { useCategoryStore } from '../../stores/useCategoryStore';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { partnerService, type PartnerItem } from '../../services/partnerService';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { computeTareWeight, computeNetWeight, computeTotalPrice, generateBatchCode } from '../../utils/weightCalculator';
import { formatCurrency } from '../../utils/format';
import dayjs from 'dayjs';
import { InboundBatchGrid } from './InboundBatchGrid';

const calcDefaultExpiry = (baseDate: dayjs.Dayjs, condition: string, warningDays?: number): string => {
  if (condition === 'Tươi sống') return baseDate.add(2, 'day').format('YYYY-MM-DD');
  if (condition === 'Ướp đá') return baseDate.add(warningDays || 5, 'day').format('YYYY-MM-DD');
  return baseDate.add(180, 'day').format('YYYY-MM-DD');
};

export const InboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const [quickAddForm] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const addReceipt = useInboundStore((state) => state.addReceipt);
  const { products, fetchProducts, addProduct } = useProductStore();
  const { packagings, fetchPackagings } = usePackagingStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const [suppliers, setSuppliers] = useState<PartnerItem[]>([]);
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [singleViewMode, setSingleViewMode] = useState<'TABLE' | 'CARDS'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'CARDS' : 'TABLE';
  });

  // Fetch packaging, category, products, warehouses and suppliers data from database on mount
  useEffect(() => {
    fetchProducts();
    fetchPackagings();
    fetchCategories();
    fetchWarehouses();
    partnerService.getAll('SUPPLIER').then(setSuppliers).catch(() => { });
  }, [fetchProducts, fetchPackagings, fetchCategories, fetchWarehouses]);

  // Tự động chọn kho lưu trữ đầu tiên khi tải danh sách kho
  useEffect(() => {
    if (warehouses.length > 0 && !form.getFieldValue('storageLocation')) {
      form.setFieldValue('storageLocation', warehouses[0].name);
    }
  }, [warehouses, form]);

  // ── quick-add modal state ────────────────────────────────────────────────────
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  // Stores which form-list item index triggered the quick-add, so we can auto-select
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

  const activeProducts = products.filter((p) => !p.status || p.status.toUpperCase() === 'ACTIVE');

  const { isSubmitting, handleSubmit: onFinish } = useAsyncSubmit(async (values: any) => {
    // Format dates before saving
    const formattedItems = (values.items || []).map((item: any) => {
      const selectedProduct = activeProducts.find((p) => p.code === item.seafoodCode);
      return {
        ...item,
        seafoodName: selectedProduct ? selectedProduct.name : item.seafoodCode ?? 'Chưa xác định',
        catchDate: '',
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
  });

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    const items = allValues.items || [];
    let isChanged = false;

    const updatedItems = items.map((item: any) => {
      if (!item) return item;

      let updatedItem = { ...item };
      const p = activeProducts.find((prod) => prod.code === item.seafoodCode);

      if (p) {
        if ((!item.unitPrice || item.unitPrice === 0) && p.referencePrice) {
          updatedItem.unitPrice = p.referencePrice;
          isChanged = true;
        }
        if (!item.storageCondition) {
          let condition: 'Cấp đông' | 'Ướp đá' | 'Tươi sống' = 'Cấp đông';
          if (p.storageType === 'ALIVE') condition = 'Tươi sống';
          else if (p.storageType === 'FRESH') condition = 'Ướp đá';
          updatedItem.storageCondition = condition;
          isChanged = true;
        }
        if (!item.expiryDate) {
          const baseDate = allValues.inboundDate || dayjs();
          updatedItem.expiryDate = dayjs(calcDefaultExpiry(baseDate, updatedItem.storageCondition || 'Cấp đông', p.warningDaysBeforeExpiry));
          isChanged = true;
        }
      }

      const pkg = packagings.find((pkgItem) => pkgItem.code === item.packagingCode);
      const computedTare = computeTareWeight(item.packagingCode, item.packagingQty, packagings, Number(item.tareWeight) || 0);
      const computedNet = computeNetWeight(item.totalWeight, computedTare);
      const computedTotal = computeTotalPrice(computedNet, updatedItem.unitPrice || item.unitPrice);
      const computedBatch = generateBatchCode(item.seafoodCode || '', item.batchCode);

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
  const { isSubmitting: isQuickAdding, handleSubmit: handleQuickAddSubmit } = useAsyncSubmit(async (values: any) => {
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
  });

  return (
    <div className="print-constrained">
      {/* ── Page Header: Tiêu đề & Nút chuyển đổi 2 chế độ ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate flex items-center gap-2">
            <span>Tạo Phiếu Nhập Kho Hải Sản</span>
          </h1>
          <span className="text-xs text-gray-500">
            {mode === 'SINGLE'
              ? 'Chế độ nhập lẻ từng phiếu trực tiếp cho từng tàu cá / nhà cung cấp'
              : 'Chế độ bảng kê tổng hợp cuối ca — Tự động gom nhóm & tách thành nhiều phiếu riêng biệt'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={mode}
            onChange={(val) => setMode(val as 'SINGLE' | 'BATCH')}
            options={[
              { label: 'Nhập đơn lẻ (1 NCC)', value: 'SINGLE', icon: <SaveOutlined /> },
              { label: 'Bảng kê cuối ngày (Nhiều NCC)', value: 'BATCH', icon: <BranchesOutlined className="text-emerald-500" /> },
            ]}
            className="bg-slate-100 dark:bg-slate-800 font-medium p-1"
          />
        </div>
      </div>

      {/* Chế độ 2: Bảng kê nhập nhanh cuối ngày chẻ đơn */}
      {mode === 'BATCH' ? (
        <InboundBatchGrid />
      ) : (
        /* Chế độ 1: Nhập đơn lẻ truyền thống */
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
                <Select
                  placeholder="Chọn khu vực lưu trữ"
                  showSearch
                  optionFilterProp="children"
                  popupMatchSelectWidth={false}
                  filterOption={(inputValue, option) => {
                    const text = String(option?.children || '') + ' ' + String(option?.value || '');
                    return text.toLowerCase().includes(inputValue.toLowerCase());
                  }}
                >
                  {warehouses.map((w) => (
                    <Select.Option key={w.id} value={w.name}>
                      {w.name} {w.location ? `(${w.location})` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-100">Danh sách hải sản nhập kho</span>
              <Segmented
                value={singleViewMode}
                onChange={(val) => setSingleViewMode(val as 'TABLE' | 'CARDS')}
                options={[
                  { label: 'Bảng (PC)', value: 'TABLE', icon: <TableOutlined /> },
                  { label: 'Thẻ (Điện thoại)', value: 'CARDS', icon: <AppstoreOutlined /> },
                ]}
                className="bg-slate-100 dark:bg-slate-800 font-medium"
              />
            </div>
          }
          className="shadow-sm mb-6"
          bodyStyle={{ padding: '12px' }}
        >
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {singleViewMode === 'TABLE' ? (
                  <>
                    <style>{`
                      .inbound-items-table .ant-table-thead > tr > th {
                        text-align: left !important;
                      }
                      .inbound-items-table .ant-table-tbody > tr > td {
                        vertical-align: top !important;
                        padding-top: 8px !important;
                        padding-bottom: 6px !important;
                      }
                    `}</style>
                    <Table
                      dataSource={fields}
                      rowKey="key"
                      pagination={false}
                      size="middle"
                      scroll={{ x: 1290 }}
                      className="inbound-items-table"
                      bordered={false}
                      columns={[
                        {
                          title: '#',
                          key: 'stt',
                          width: 45,
                          align: 'center',
                          render: (_, __, idx) => (
                            <div className="h-8 flex items-center justify-center">
                              <span className="text-gray-400 font-mono font-medium">{idx + 1}</span>
                            </div>
                          ),
                        },
                        {
                          title: 'Mặt Hàng Hải Sản (*)',
                          key: 'seafoodCode',
                          width: 175,
                          render: (_, field) => (
                            <div>
                              <Form.Item
                                name={[field.name, 'seafoodCode']}
                                rules={[{ required: true, message: 'Chọn sản phẩm!' }]}
                                className="mb-1"
                              >
                                <Select
                                  placeholder="Chọn loại hải sản"
                                  showSearch
                                  optionFilterProp="label"
                                  popupMatchSelectWidth={false}
                                  dropdownRender={(menu) => (
                                    <>
                                      {menu}
                                      <Divider style={{ margin: '4px 0' }} />
                                      <Button
                                        type="link"
                                        icon={<AppstoreAddOutlined />}
                                        className="w-full text-left px-3 py-1 text-sky-600 hover:bg-sky-50"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setPendingItemIndex(field.name);
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
                                        Thêm mặt hàng mới
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
                              <Form.Item shouldUpdate noStyle>
                                {() => {
                                  const items = form.getFieldValue('items') || [];
                                  const row = items[field.name];
                                  const code = row?.seafoodCode;
                                  if (!code) return null;
                                  const bCode = row?.batchCode || generateBatchCode(code);
                                  return (
                                    <div
                                      className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400 truncate leading-4"
                                      title={bCode}
                                    >
                                      🏷️ {bCode}
                                    </div>
                                  );
                                }}
                              </Form.Item>
                            </div>
                          ),
                        },
                        {
                          title: 'Hạn Dùng (*)',
                          key: 'expiryDate',
                          width: 135,
                          render: (_, field) => (
                            <Form.Item
                              name={[field.name, 'expiryDate']}
                              rules={[{ required: true, message: 'Chọn HSD!' }]}
                              className="mb-0"
                            >
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="HSD" />
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Bao Bì',
                          key: 'packagingCode',
                          width: 125,
                          render: (_, field) => (
                            <Form.Item name={[field.name, 'packagingCode']} className="mb-0">
                              <Select placeholder="Chọn bì" allowClear showSearch optionFilterProp="children" popupMatchSelectWidth={false}>
                                {packagings.map((pkg) => (
                                  <Select.Option key={pkg.code} value={pkg.code}>
                                    {pkg.name} ({pkg.defaultTareWeight}kg)
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Số Sọt',
                          key: 'packagingQty',
                          width: 70,
                          render: (_, field) => (
                            <Form.Item name={[field.name, 'packagingQty']} className="mb-0">
                              <InputNumber min={1} precision={0} placeholder="1" className="w-full font-mono text-center" />
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Tổng Cân (Kg) (*)',
                          key: 'totalWeight',
                          width: 105,
                          render: (_, field) => (
                            <Form.Item
                              name={[field.name, 'totalWeight']}
                              rules={[{ required: true, message: 'Nhập tổng cân!' }]}
                              className="mb-0"
                            >
                              <InputNumber min={0} step={0.1} precision={2} placeholder="0.0" className="w-full font-bold font-mono text-sky-600" />
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Trừ Bì (Kg)',
                          key: 'tareWeight',
                          width: 90,
                          render: (_, field) => (
                            <Form.Item name={[field.name, 'tareWeight']} className="mb-0">
                              <InputNumber min={0} step={0.1} precision={2} placeholder="0.0" className="w-full font-mono text-gray-500" />
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Cân Thực (Kg)',
                          key: 'netWeight',
                          width: 105,
                          render: (_, field) => (
                            <Form.Item shouldUpdate noStyle>
                              {() => {
                                const items = form.getFieldValue('items') || [];
                                const net = items[field.name]?.netWeight || 0;
                                return (
                                  <div className="h-8 flex items-center">
                                    <span className={`font-mono font-bold ${net > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300'}`}>
                                      {net > 0 ? net.toFixed(2) : '--'}
                                    </span>
                                  </div>
                                );
                              }}
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Bảo Quản (*)',
                          key: 'storageCondition',
                          width: 105,
                          render: (_, field) => (
                            <Form.Item name={[field.name, 'storageCondition']} className="mb-0">
                              <Select popupMatchSelectWidth={false}>
                                <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                                <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                                <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                              </Select>
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Đơn Giá (đ/kg) (*)',
                          key: 'unitPrice',
                          width: 125,
                          render: (_, field) => (
                            <Form.Item
                              name={[field.name, 'unitPrice']}
                              rules={[{ required: true, message: 'Nhập đơn giá!' }]}
                              className="mb-0"
                            >
                              <InputNumber
                                min={0}
                                step={1000}
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(val) => Number((val || '').replace(/,/g, '')) as any}
                                placeholder="0"
                                className="w-full font-mono"
                              />
                            </Form.Item>
                          ),
                        },
                        {
                          title: 'Thành Tiền (đ)',
                          key: 'totalPrice',
                          width: 130,
                          align: 'right',
                          render: (_, field) => (
                            <Form.Item shouldUpdate noStyle>
                              {() => {
                                const items = form.getFieldValue('items') || [];
                                const total = items[field.name]?.totalPrice || 0;
                                return (
                                  <div className="h-8 flex items-center justify-end">
                                    <span className={`font-semibold font-mono ${total > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-gray-300'}`}>
                                      {total > 0 ? formatCurrency(total) : '--'}
                                    </span>
                                  </div>
                                );
                              }}
                            </Form.Item>
                          ),
                        },
                        {
                          title: '',
                          key: 'actions',
                          width: 48,
                          align: 'center',
                          render: (_, field) => (
                            <div className="h-8 flex items-center justify-center">
                              {fields.length > 1 && (
                                <Tooltip title="Xóa dòng này">
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => remove(field.name)}
                                  />
                                </Tooltip>
                              )}
                            </div>
                          ),
                        },
                      ]}
                    />
                  </>
                ) : (
                  /* ── Chế độ Thẻ (Điện thoại) ── */
                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <Card
                        key={field.key}
                        size="small"
                        className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl"
                        bodyStyle={{ padding: '12px' }}
                      >
                        <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200/80 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <Tag color="blue" className="font-bold font-mono">
                              #{idx + 1}
                            </Tag>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                              Mặt hàng cân #{idx + 1}
                            </span>
                          </div>
                          {fields.length > 1 && (
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(field.name)}
                            >
                              <span className="text-xs">Xóa</span>
                            </Button>
                          )}
                        </div>

                        <Row gutter={[12, 8]}>
                          {/* Mặt hàng hải sản */}
                          <Col xs={24} sm={14}>
                            <Form.Item
                              name={[field.name, 'seafoodCode']}
                              label={<span className="text-xs font-medium">Mặt hàng hải sản <span className="text-red-500">*</span></span>}
                              rules={[{ required: true, message: 'Chọn sản phẩm!' }]}
                              className="mb-1"
                            >
                              <Select
                                placeholder="Chọn loại hải sản"
                                showSearch
                                optionFilterProp="label"
                                popupMatchSelectWidth={false}
                                dropdownRender={(menu) => (
                                  <>
                                    {menu}
                                    <Divider style={{ margin: '4px 0' }} />
                                    <Button
                                      type="link"
                                      icon={<AppstoreAddOutlined />}
                                      className="w-full text-left px-3 py-1 text-sky-600 hover:bg-sky-50"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setPendingItemIndex(field.name);
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
                                      Thêm mặt hàng mới
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
                            <Form.Item shouldUpdate noStyle>
                              {() => {
                                const items = form.getFieldValue('items') || [];
                                const row = items[field.name];
                                const code = row?.seafoodCode;
                                if (!code) return null;
                                const bCode = row?.batchCode || generateBatchCode(code);
                                return (
                                  <div className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400 mt-[-2px] mb-2">
                                    🏷️ Lô: {bCode}
                                  </div>
                                );
                              }}
                            </Form.Item>
                          </Col>

                          {/* Hạn sử dụng */}
                          <Col xs={12} sm={10}>
                            <Form.Item
                              name={[field.name, 'expiryDate']}
                              label={<span className="text-xs font-medium">Hạn sử dụng <span className="text-red-500">*</span></span>}
                              rules={[{ required: true, message: 'Chọn HSD!' }]}
                              className="mb-2"
                            >
                              <DatePicker className="w-full" format="YYYY-MM-DD" placeholder="Chọn HSD" />
                            </Form.Item>
                          </Col>

                          {/* Bao bì */}
                          <Col xs={12} sm={8}>
                            <Form.Item
                              name={[field.name, 'packagingCode']}
                              label={<span className="text-xs font-medium">Bao bì</span>}
                              className="mb-2"
                            >
                              <Select placeholder="Chọn bì" allowClear showSearch optionFilterProp="children">
                                {packagings.map((pkg) => (
                                  <Select.Option key={pkg.code} value={pkg.code}>
                                    {pkg.name} ({pkg.defaultTareWeight}kg)
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>

                          {/* Số sọt */}
                          <Col xs={12} sm={8}>
                            <Form.Item
                              name={[field.name, 'packagingQty']}
                              label={<span className="text-xs font-medium">Số sọt / khay</span>}
                              className="mb-2"
                            >
                              <InputNumber min={1} precision={0} placeholder="1" className="w-full font-mono" />
                            </Form.Item>
                          </Col>

                          {/* Bảo quản */}
                          <Col xs={12} sm={8}>
                            <Form.Item
                              name={[field.name, 'storageCondition']}
                              label={<span className="text-xs font-medium">Bảo quản</span>}
                              className="mb-2"
                            >
                              <Select>
                                <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                                <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                                <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                              </Select>
                            </Form.Item>
                          </Col>

                          {/* Tổng cân - Trừ bì - Cân thực */}
                          <Col xs={24}>
                            <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              <Row gutter={8} align="middle">
                                <Col xs={8}>
                                  <Form.Item
                                    name={[field.name, 'totalWeight']}
                                    label={<span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tổng cân (kg) <span className="text-red-500">*</span></span>}
                                    rules={[{ required: true, message: 'Nhập cân!' }]}
                                    className="mb-0"
                                  >
                                    <InputNumber min={0} step={0.1} precision={2} placeholder="0.0" className="w-full font-bold font-mono text-sky-600" />
                                  </Form.Item>
                                </Col>
                                <Col xs={8}>
                                  <Form.Item
                                    name={[field.name, 'tareWeight']}
                                    label={<span className="text-xs font-medium text-gray-500">Trừ bì (kg)</span>}
                                    className="mb-0"
                                  >
                                    <InputNumber min={0} step={0.1} precision={2} placeholder="0.0" className="w-full font-mono" />
                                  </Form.Item>
                                </Col>
                                <Col xs={8}>
                                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Cân thực (kg):</div>
                                  <Form.Item shouldUpdate noStyle>
                                    {() => {
                                      const items = form.getFieldValue('items') || [];
                                      const net = items[field.name]?.netWeight || 0;
                                      return (
                                        <div className="h-8 flex items-center">
                                          <span className={`text-base font-extrabold font-mono ${net > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                                            {net > 0 ? net.toFixed(2) : '--'}
                                          </span>
                                        </div>
                                      );
                                    }}
                                  </Form.Item>
                                </Col>
                              </Row>
                            </div>
                          </Col>

                          {/* Đơn giá & Thành tiền */}
                          <Col xs={12} sm={12}>
                            <Form.Item
                              name={[field.name, 'unitPrice']}
                              label={<span className="text-xs font-medium">Đơn giá (đ/kg) <span className="text-red-500">*</span></span>}
                              rules={[{ required: true, message: 'Nhập đơn giá!' }]}
                              className="mb-1"
                            >
                              <InputNumber
                                min={0}
                                step={1000}
                                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(val) => Number((val || '').replace(/,/g, '')) as any}
                                placeholder="0"
                                className="w-full font-mono"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={12} sm={12}>
                            <div className="text-xs font-medium text-gray-500 mb-1">Thành tiền (đ):</div>
                            <Form.Item shouldUpdate noStyle>
                              {() => {
                                const items = form.getFieldValue('items') || [];
                                const total = items[field.name]?.totalPrice || 0;
                                return (
                                  <div className="h-8 flex items-center justify-end">
                                    <span className={`text-base font-bold font-mono ${total > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-gray-400'}`}>
                                      {total > 0 ? formatCurrency(total) : '--'}
                                    </span>
                                  </div>
                                );
                              }}
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Thanh tổng kết số liệu cân & thành tiền ngay dưới bảng */}
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const items = form.getFieldValue('items') || [];
                    const totalWeight = items.reduce((sum: number, it: any) => sum + (Number(it?.netWeight) || 0), 0);
                    const totalMoney = items.reduce((sum: number, it: any) => sum + (Number(it?.totalPrice) || 0), 0);
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Số mặt hàng:</span>
                          <strong className="text-slate-800 dark:text-slate-100 font-mono text-sm">{items.length}</strong>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Tổng cân thực:</span>
                            <strong className="text-emerald-600 font-mono text-sm">{totalWeight.toFixed(1)} kg</strong>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Tổng tiền hàng:</span>
                            <strong className="text-sky-600 font-mono text-base font-bold">{formatCurrency(totalMoney)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </Form.Item>

                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      seafoodCode: undefined,
                      packagingCode: packagings[0]?.code || 'SOT-RED',
                      packagingQty: 1,
                      totalWeight: 0,
                      tareWeight: packagings[0]?.defaultTareWeight || 1.8,
                      netWeight: 0,
                      storageCondition: 'Cấp đông',
                      unitPrice: 0,
                      totalPrice: 0,
                      batchCode: '',
                    })
                  }
                  block
                  icon={<PlusOutlined />}
                  className="h-10 text-sky-600 border-sky-300 hover:border-sky-500"
                >
                  Thêm dòng hải sản nhập kho
                </Button>
              </div>
            )}
          </Form.List>
        </Card>

        <div className="flex justify-end gap-4">
          <Button size="large" disabled={isSubmitting} onClick={() => navigate('/inventory/inbound-history')}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="bg-sky-500 hover:bg-sky-600 border-none"
          >
            {isSubmitting ? 'Đang lưu phiếu...' : 'Lưu phiếu nhập'}
          </Button>
        </div>
      </Form>
      )}

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
            <Button disabled={isQuickAdding} onClick={() => { setQuickAddOpen(false); quickAddForm.resetFields(); setPendingItemIndex(null); }}>Hủy</Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={isQuickAdding} disabled={isQuickAdding} className="bg-sky-500 hover:bg-sky-600 border-none">
              {isQuickAdding ? 'Đang lưu...' : 'Lưu sản phẩm & chọn ngay'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
export default InboundPage;

