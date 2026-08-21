import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Input, Space, App,
  Row, Col, Statistic, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, AppstoreOutlined, CalendarOutlined,
  ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { Category } from '../../types/seafood';
import { useCategoryStore } from '../../stores/useCategoryStore';

// ─── component ─────────────────────────────────────────────────────────────────

export const CategoriesPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── statistics ───────────────────────────────────────────────────────────────
  const totalCategories = categories.length;
  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + c.productCount, 0),
    [categories]
  );
  const recentCount = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return categories.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
  }, [categories]);

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (record: Category) => {
    setEditingCategory(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (record: Category) => {
    if (record.productCount > 0) {
      modal.warning({
        title: 'Không thể xóa danh mục',
        content: `Danh mục "${record.name}" đang chứa ${record.productCount} sản phẩm. Vui lòng di chuyển hoặc xóa hết sản phẩm trước khi xóa danh mục.`,
        okText: 'Đã hiểu',
      });
      return;
    }
    modal.confirm({
      title: 'Xác nhận xóa danh mục',
      content: `Bạn có chắc chắn muốn xóa danh mục "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await deleteCategory(record.id);
          message.success('Đã xóa danh mục thành công!');
        } catch {
          message.error('Không thể xóa danh mục.');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        code: (values.code as string).toUpperCase(),
        name: values.name,
        description: values.description,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        message.success('Cập nhật danh mục thành công!');
      } else {
        await addCategory(payload);
        message.success('Thêm danh mục mới thành công!');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingCategory(null);
    } catch {
      message.error('Lỗi khi lưu thông tin danh mục.');
    }
  };

  // ── table columns ─────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Mã Danh Mục',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => (
        <Tag color="geekblue" className="font-mono font-semibold text-xs">{code}</Tag>
      ),
    },
    {
      title: 'Tên Danh Mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <strong className="text-slate-800 dark:text-slate-200">{name}</strong>
      ),
    },
    {
      title: 'Mô Tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc?: string) =>
        desc ? (
          <span className="text-slate-500">{desc}</span>
        ) : (
          <span className="text-gray-400 italic">--</span>
        ),
    },
    {
      title: 'Số Sản Phẩm',
      dataIndex: 'productCount',
      key: 'productCount',
      align: 'center' as const,
      width: 140,
      render: (count: number) => (
        <Tag
          color={count === 0 ? 'default' : count >= 10 ? 'green' : 'blue'}
          className="font-bold"
        >
          {count} sản phẩm
        </Tag>
      ),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => {
        try {
          return new Date(date).toLocaleDateString('vi-VN');
        } catch {
          return '--';
        }
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 100,
      render: (_: any, record: Category) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">
            Nhóm Danh Mục Sản Phẩm
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý nhóm danh mục để phân loại hải sản và hàng hóa trong kho.
          </p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openAdd}
          >
            Thêm Danh Mục
          </Button>
        </Space>
      </div>

      {/* ── Statistics Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng nhóm danh mục"
              value={totalCategories}
              prefix={<FolderOutlined className="text-sky-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng sản phẩm"
              value={totalProducts}
              prefix={<AppstoreOutlined className="text-green-500 mr-2" />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Thêm mới (30 ngày)"
              value={recentCount}
              prefix={<CalendarOutlined className="text-purple-500 mr-2" />}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Filter + Table ── */}
      <Card bordered={false} className="shadow-sm">
        <div className="flex flex-wrap gap-3 mb-5 items-center">
          <Input.Search
            placeholder="Tìm theo tên hoặc mã danh mục..."
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            className="w-72"
            prefix={<SearchOutlined className="text-gray-400" />}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (t) => `Tổng ${t} danh mục`,
          }}
          className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* ── Add / Edit Modal ── */}
      <Modal
        title={editingCategory ? `Chỉnh sửa — ${editingCategory.name}` : 'Thêm Danh Mục Mới'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingCategory(null); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="code"
                label="Mã Danh Mục"
                rules={[
                  { required: true, message: 'Nhập mã danh mục!' },
                  { max: 50, message: 'Tối đa 50 ký tự!' },
                ]}
              >
                <Input
                  placeholder="VD: CA, TOM"
                  disabled={!!editingCategory}
                  className="font-mono"
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Tên Danh Mục"
                rules={[
                  { required: true, message: 'Nhập tên danh mục!' },
                  { max: 150, message: 'Tối đa 150 ký tự!' },
                ]}
              >
                <Input placeholder="VD: Cá, Tôm, Cua" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Mô Tả"
            rules={[{ max: 500, message: 'Tối đa 500 ký tự!' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Mô tả ngắn về nhóm danh mục này..."
            />
          </Form.Item>

          {/* Footer */}
          <Form.Item className="mb-0">
            <div className="flex justify-end gap-3">
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); setEditingCategory(null); }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={editingCategory ? <EditOutlined /> : <PlusOutlined />}
              >
                {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
