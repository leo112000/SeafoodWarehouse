import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Space, App, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined, ShoppingOutlined, CalculatorOutlined, ReloadOutlined, WarningOutlined, PlusCircleOutlined } from '@ant-design/icons';
import type { PackagingType } from '../../types/seafood';
import { packagingService } from '../../services/packagingService';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { ZoomButton, ZoomViewerModal } from '../../components/common/ZoomViewerModal';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';

export const PackagingPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [packagings, setPackagings] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'LOSS'>('ADD');
  const [selectedPkgForAdjust, setSelectedPkgForAdjust] = useState<PackagingType | null>(null);

  const [editingPkg, setEditingPkg] = useState<PackagingType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CONTAINER' | 'CONSUMABLE'>('ALL');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  const fetchPackagings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await packagingService.getAll();
      setPackagings(data);
    } catch {
      message.error('Không thể tải danh sách bao bì.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchPackagings();
  }, [fetchPackagings]);

  // Statistics calculations
  const totalTypes = packagings.length;
  const containerCount = packagings.filter(p => p.category === 'CONTAINER').length;
  const consumableCount = packagings.filter(p => p.category === 'CONSUMABLE').length;
  const totalStock = packagings.reduce((sum, p) => sum + p.stockQuantity, 0);

  const handleOpenAddModal = () => {
    setEditingPkg(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: PackagingType) => {
    setEditingPkg(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      category: record.category,
      defaultTareWeight: record.defaultTareWeight,
      unit: record.unit,
      stockQuantity: record.stockQuantity,
      note: record.note,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: PackagingType) => {
    modal.confirm({
      title: 'Xác nhận xóa bao bì',
      content: `Bạn có chắc chắn muốn xóa danh mục bao bì "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await packagingService.delete(record.id);
          message.success('Đã xóa danh mục bao bì thành công!');
          fetchPackagings();
        } catch {
          message.error('Không thể xóa bao bì.');
        }
      },
    });
  };

  const handleOpenAdjustModal = (pkg?: PackagingType, mode: 'ADD' | 'LOSS' = 'ADD') => {
    setSelectedPkgForAdjust(pkg || packagings[0] || null);
    setAdjustMode(mode);
    adjustForm.resetFields();
    if (pkg) {
      adjustForm.setFieldsValue({ packagingId: pkg.id });
    }
    setIsAdjustModalOpen(true);
  };

  const { isSubmitting: isSubmittingAdjust, handleSubmit: handleAdjustSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const pkgId = Number(values.packagingId || selectedPkgForAdjust?.id);
      const qty = Math.abs(Number(values.quantity || 0));
      const finalQty = adjustMode === 'ADD' ? qty : -qty;

      await packagingService.adjustStock({
        packagingId: pkgId,
        adjustmentQty: finalQty,
        reason: values.reason || (adjustMode === 'ADD' ? 'Nhập bổ sung sọt' : 'Báo hư hỏng / báo mất sọt'),
      });

      message.success(adjustMode === 'ADD' ? 'Đã nhập bổ sung số lượng sọt vào kho!' : 'Đã ghi nhận báo hỏng / báo mất sọt thành công!');
      setIsAdjustModalOpen(false);
      fetchPackagings();
    } catch {
      message.error('Không thể cập nhật số lượng sọt.');
    }
  });

  const { isSubmitting: isSubmittingForm, handleSubmit: handleFormSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const payload = {
        code: values.code.toUpperCase(),
        name: values.name,
        category: values.category,
        defaultTareWeight: values.defaultTareWeight,
        unit: values.unit,
        stockQuantity: values.stockQuantity,
        note: values.note,
      };

      if (editingPkg) {
        await packagingService.update(editingPkg.id, payload);
        message.success('Cập nhật danh mục bao bì thành công!');
      } else {
        await packagingService.create(payload);
        setPagination((prev) => ({ ...prev, current: 1 }));
        message.success('Thêm danh mục bao bì mới thành công!');
      }
      setIsModalOpen(false);
      fetchPackagings();
    } catch {
      message.error('Lỗi khi lưu thông tin bao bì.');
    }
  });

  const filteredPackagings = packagings.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã số',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <span className="font-semibold text-sky-600">{code}</span>,
    },
    {
      title: 'Tên bao bì / sọt',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => (
        <Tag color={cat === 'CONTAINER' ? 'blue' : 'orange'}>
          {cat === 'CONTAINER' ? 'Sọt / Khay luân chuyển' : 'Vật tư 1 lần'}
        </Tag>
      ),
    },
    {
      title: 'Bì chuẩn (kg)',
      dataIndex: 'defaultTareWeight',
      key: 'defaultTareWeight',
      render: (val: number) => `${val.toFixed(2)} kg`,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Tồn kho hiện tại',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      render: (qty: number) => (
        <span className={`font-bold ${qty < 20 ? 'text-red-500 font-extrabold' : 'text-emerald-600'}`}>
          {qty.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (note?: string) => note || <span className="text-gray-400 italic">--</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: PackagingType) => (
        <Space size="small">
          <Button
            size="small"
            icon={<PlusCircleOutlined className="text-emerald-500" />}
            onClick={() => handleOpenAdjustModal(record, 'ADD')}
            title="Nhập thêm sọt"
          >
            Nhập
          </Button>
          <Button
            size="small"
            danger
            icon={<WarningOutlined />}
            onClick={() => handleOpenAdjustModal(record, 'LOSS')}
            title="Báo hỏng"
          >
            Báo hỏng
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ── Page Header: Tiêu đề trang & Nút Làm mới + Thêm mới ngang hàng ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 m-0 truncate">
          Danh Mục Bao Bì
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button icon={<ReloadOutlined />} onClick={fetchPackagings} loading={loading} size="middle">
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            className="bg-sky-500 hover:bg-sky-600 border-none font-medium"
            size="middle"
          >
            <span className="hidden sm:inline">Thêm Mới</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </div>
      </div>

      {/* ── Sub Action Bar: 2 nút Thao tác Sọt ngang hàng nhau ── */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Button
          icon={<PlusCircleOutlined className="text-emerald-500" />}
          onClick={() => handleOpenAdjustModal(undefined, 'ADD')}
          className="w-full flex items-center justify-center font-medium border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
          size="middle"
        >
          <span className="truncate">Nhập Thêm Sọt</span>
        </Button>
        <Button
          danger
          icon={<WarningOutlined />}
          onClick={() => handleOpenAdjustModal(undefined, 'LOSS')}
          className="w-full flex items-center justify-center font-medium"
          size="middle"
        >
          <span className="truncate">Báo Hỏng / Mất</span>
        </Button>
      </div>

      {/* ── Statistics Cards (Gọn gàng, mỏng nhẹ, không bị đẩy chữ) ── */}
      <Row gutter={[8, 8]} className="mb-4">
        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-sky-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Loại bao bì
                </div>
                <div className="text-sm sm:text-xl font-black text-sky-600 mt-0.5 truncate">
                  {totalTypes}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500 shrink-0 hidden sm:flex">
                <InboxOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-blue-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Sọt luân chuyển
                </div>
                <div className="text-sm sm:text-xl font-black text-blue-600 mt-0.5 truncate">
                  {containerCount}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-500 shrink-0 hidden sm:flex">
                <ShoppingOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-orange-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Vật tư 1 lần
                </div>
                <div className="text-sm sm:text-xl font-black text-orange-600 mt-0.5 truncate">
                  {consumableCount}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-orange-50 dark:bg-orange-950/40 rounded-lg text-orange-500 shrink-0 hidden sm:flex">
                <CalculatorOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-emerald-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Tồn kho sọt
                </div>
                <div className="text-sm sm:text-xl font-black text-emerald-600 mt-0.5 truncate">
                  {totalStock.toLocaleString()}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 shrink-0 hidden sm:flex">
                <InboxOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="shadow-sm mb-6"
        title="Danh sách vỏ bao bì & sọt chứa"
        extra={<ZoomButton onClick={() => setIsZoomOpen(true)} />}
      >
        <div className="grid grid-cols-2 lg:flex gap-2 items-center mb-4">
          <Input.Search
            placeholder="Tìm mã, tên sọt..."
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-2 lg:w-64"
          />
          <Select
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            showSearch
            optionFilterProp="label"
            className="col-span-2 sm:col-span-1 lg:w-56"
            options={[
              { value: 'ALL', label: 'Tất cả phân loại' },
              { value: 'CONTAINER', label: 'Sọt / Khay luân chuyển' },
              { value: 'CONSUMABLE', label: 'Vật tư 1 lần' },
            ]}
          />
        </div>

        <Table
          dataSource={filteredPackagings}
          columns={columns}
          rowKey="id"
          loading={loading}
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

      <ZoomViewerModal
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title="Danh sách vỏ bao bì & sọt chứa"
      >
        <Table
          dataSource={filteredPackagings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </ZoomViewerModal>

      <Modal
        title={editingPkg ? 'Chỉnh sửa thông tin bao bì' : 'Thêm danh mục bao bì mới'}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isSubmittingForm}
        cancelButtonProps={{ disabled: isSubmittingForm }}
        okText={editingPkg ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy bỏ"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ category: 'CONTAINER', unit: 'Cái', defaultTareWeight: 1.5, stockQuantity: 100 }}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="Tên hiển thị"
            rules={[{ required: true, message: 'Vui lòng nhập tên bao bì!' }]}
          >
            <Input
              placeholder="VD: Sọt nhựa đỏ tiêu chuẩn, Thùng xốp 20kg..."
              onChange={(e) => {
                if (!editingPkg) {
                  const autoCode = generateCodeFromName(e.target.value, 'PKG');
                  form.setFieldsValue({ code: autoCode });
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã Bao bì / Sọt (Tự sinh theo tên)"
            rules={[{ required: true, message: 'Vui lòng nhập mã!' }]}
          >
            <Input
              placeholder="Tự động sinh (VD: PKG-SOT-NHUA-DO)"
              disabled={!!editingPkg}
              className="font-mono bg-slate-50 dark:bg-slate-800/60"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Phân loại"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 'CONTAINER', label: 'Sọt / Khay luân chuyển' },
                    { value: 'CONSUMABLE', label: 'Vật tư dùng 1 lần' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Đơn vị tính"
                rules={[{ required: true }]}
              >
                <Input placeholder="VD: Cái, Chiếc, Thùng" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="defaultTareWeight"
                label="Trọng lượng bì chuẩn (kg)"
                rules={[{ required: true, message: 'Vui lòng nhập trọng lượng bì!' }]}
              >
                <InputNumber min={0} step={0.1} precision={2} className="w-full" placeholder="1.8" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stockQuantity"
                label="Số lượng tồn kho ban đầu"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
              >
                <InputNumber min={0} step={1} className="w-full" placeholder="100" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú sử dụng">
            <Input.TextArea rows={3} placeholder="VD: Dùng đựng cá cơm nhập kho..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Điều Chỉnh Số Lượng Sọt / Báo Hỏng Báo Mất */}
      <Modal
        title={
          <Space>
            {adjustMode === 'ADD' ? <PlusCircleOutlined className="text-emerald-500" /> : <WarningOutlined className="text-red-500" />}
            <span>{adjustMode === 'ADD' ? 'Nhập Bổ Sung Số Lượng Sọt' : 'Ghi Nhận Báo Hỏng / Báo Mất Sọt'}</span>
          </Space>
        }
        open={isAdjustModalOpen}
        onCancel={() => setIsAdjustModalOpen(false)}
        onOk={() => adjustForm.submit()}
        confirmLoading={isSubmittingAdjust}
        cancelButtonProps={{ disabled: isSubmittingAdjust }}
        okText={adjustMode === 'ADD' ? 'Cập nhật tăng tồn kho' : 'Cập nhật trừ tồn kho'}
        okButtonProps={{ danger: adjustMode === 'LOSS' }}
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjustSubmit}>
          <Form.Item
            name="packagingId"
            label="Chọn Loại Sọt / Bao Bì"
            rules={[{ required: true, message: 'Vui lòng chọn loại sọt!' }]}
            initialValue={selectedPkgForAdjust?.id}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={packagings.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code}) - Tồn hiện tại: ${p.stockQuantity} ${p.unit}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label={adjustMode === 'ADD' ? 'Số lượng sọt nhập thêm (+)' : 'Số lượng sọt hỏng / mất (-)'}
            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
          >
            <InputNumber min={1} precision={0} className="w-full" placeholder="VD: 50" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do / Ghi chú chi tiết"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                adjustMode === 'ADD'
                  ? 'VD: Nhập mua bổ sung 50 sọt nhựa đỏ mới từ nhà cung cấp nhựa...'
                  : 'VD: Sọt bị bể nứt trong quá trình bốc xếp cá / Khách mượn làm thất lạc...'
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PackagingPage;
