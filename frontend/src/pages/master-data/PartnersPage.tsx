import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, App, Typography, Tabs, Radio, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined, HomeOutlined, NumberOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { partnerService, type PartnerItem, type CreatePartnerDto } from '../../services/partnerService';

const { Title, Paragraph } = Typography;

export const PartnersPage: React.FC = () => {
  const { message } = App.useApp();
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUPPLIER' | 'CUSTOMER'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [form] = Form.useForm();

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === 'ALL' ? undefined : activeTab;
      const data = await partnerService.getAll(typeParam, search);
      setPartners(data);
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách đối tác.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, message]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleOpenModal = (item?: PartnerItem) => {
    if (item) {
      setEditingPartner(item);
      form.setFieldsValue(item);
    } else {
      setEditingPartner(null);
      form.resetFields();
      form.setFieldsValue({
        type: activeTab === 'CUSTOMER' ? 'CUSTOMER' : 'SUPPLIER',
        isActive: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingPartner) {
        await partnerService.update(editingPartner.id, values);
        message.success('Cập nhật thông tin đối tác thành công!');
      } else {
        await partnerService.create(values as CreatePartnerDto);
        message.success('Thêm đối tác mới thành công!');
      }
      setModalOpen(false);
      fetchPartners();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Có lỗi xảy ra khi lưu đối tác.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await partnerService.delete(id);
      message.success('Đã xóa đối tác thành công.');
      fetchPartners();
    } catch (err: any) {
      message.error(err?.message || 'Không thể xóa đối tác.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã & Tên đối tác',
      key: 'name',
      render: (_: any, record: PartnerItem) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {record.type === 'SUPPLIER' ? (
              <Tag color="cyan">Tàu cá / NCC</Tag>
            ) : (
              <Tag color="purple">Khách hàng / Đại lý</Tag>
            )}
            {record.name}
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">Mã: {record.code}</div>
        </div>
      ),
    },
    {
      title: 'Người đại diện / Liên hệ',
      key: 'contact',
      render: (_: any, record: PartnerItem) => (
        <div className="text-xs space-y-1">
          {record.contactPerson && (
            <div className="font-medium text-gray-700 dark:text-gray-200">
              <UserOutlined className="mr-1 text-sky-500" />
              {record.contactPerson}
            </div>
          )}
          {record.phone && (
            <div>
              <PhoneOutlined className="mr-1 text-emerald-500" />
              {record.phone}
            </div>
          )}
          {record.email && (
            <div>
              <MailOutlined className="mr-1 text-blue-500" />
              {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Địa chỉ / Cầu cảng',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => (
        <span className="text-xs text-gray-600 dark:text-gray-300">
          <HomeOutlined className="mr-1 text-amber-500" />
          {text || 'Chưa cập nhật'}
        </span>
      ),
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      render: (text: string) => text ? <Tag icon={<NumberOutlined />}>{text}</Tag> : <span className="text-gray-400 text-xs">N/A</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: PartnerItem) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Xóa đối tác này?"
            description="Bạn có chắc chắn muốn xóa đối tác này khỏi danh bạ?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Title level={2} className="m-0 flex items-center gap-2">
            <TeamOutlined className="text-sky-600" /> Danh Bạ Đối Tác (Nhà Cung Cấp & Khách Hàng)
          </Title>
          <Paragraph type="secondary" className="mb-0">
            Quản lý đội tàu đánh bắt xa bờ, hợp tác xã nuôi trồng, chuỗi nhà hàng và đại lý thu mua hải sản.
          </Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm Đối Tác Mới
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            items={[
              { key: 'ALL', label: 'Tất cả đối tác' },
              { key: 'SUPPLIER', label: '⚓ Nhà cung cấp (Tàu cá / HTX)' },
              { key: 'CUSTOMER', label: '🏪 Khách hàng (Nhà hàng / Đại lý)' },
            ]}
          />
          <Input.Search
            placeholder="Tìm theo tên, mã hoặc SĐT..."
            allowClear
            onSearch={(val) => setSearch(val)}
            style={{ maxWidth: 300 }}
          />
        </div>

        <Table
          dataSource={partners}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingPartner ? `Sửa Đối Tác: ${editingPartner.name}` : 'Thêm Đối Tác Mới'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="type" label="Loại đối tác" rules={[{ required: true }]}>
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="SUPPLIER">⚓ Nhà cung cấp (Tàu cá / Vựa)</Radio.Button>
              <Radio.Button value="CUSTOMER">🏪 Khách hàng (Nhà hàng / Đại lý)</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="code" label="Mã đối tác" rules={[{ required: true, message: 'Nhập mã đối tác!' }]}>
              <Input placeholder="VD: NCC-TAU-01..." className="uppercase" />
            </Form.Item>
            <Form.Item name="name" label="Tên đối tác" rules={[{ required: true, message: 'Nhập tên đối tác!' }]}>
              <Input placeholder="VD: Tàu cá ĐN-90123 / Nhà hàng Biển Đông" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="contactPerson" label="Người đại diện / Bếp trưởng">
              <Input placeholder="VD: Thuyền trưởng Hải / Bếp trưởng Tài" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="VD: 0912 345 678" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="email" label="Email liên hệ">
              <Input placeholder="VD: contact@doitau.vn" />
            </Form.Item>
            <Form.Item name="taxCode" label="Mã số thuế (nếu có)">
              <Input placeholder="VD: 0401 234 567" />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Địa chỉ / Vị trí cầu cảng">
            <Input.TextArea rows={2} placeholder="VD: Cầu cảng số 3, Cảng cá Thọ Quang, Đà Nẵng" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Thông tin giao dịch đặc biệt, phương thức thanh toán..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartnersPage;
