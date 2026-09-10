import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, App, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined, HomeOutlined, NumberOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { partnerService, type PartnerItem, type CreatePartnerDto } from '../../services/partnerService';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

export const PartnersPage: React.FC = () => {
  const { message } = App.useApp();
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [form] = Form.useForm();

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partnerService.getAll('SUPPLIER', search);
      setPartners(data);
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }, [search, message]);

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
        type: 'SUPPLIER',
        isActive: true,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.type = 'SUPPLIER';
      setLoading(true);
      if (editingPartner) {
        await partnerService.update(editingPartner.id, values);
        message.success('Cập nhật thông tin nhà cung cấp thành công!');
      } else {
        await partnerService.create(values as CreatePartnerDto);
        setPagination((prev) => ({ ...prev, current: 1 }));
        message.success('Thêm nhà cung cấp mới thành công!');
      }
      setModalOpen(false);
      fetchPartners();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await partnerService.delete(id);
      message.success('Đã xóa nhà cung cấp thành công.');
      fetchPartners();
    } catch (err: any) {
      message.error(err?.message || 'Không thể xóa thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: 'Mã & Tên Nhà Cung Cấp',
      key: 'name',
      render: (_: any, record: PartnerItem) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Tag color="cyan">⚓ Tàu cá / Vựa</Tag>
            {record.name}
          </div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">Mã: {record.code}</div>
        </div>
      ),
    },
    {
      title: 'Thuyền trưởng / Người liên hệ',
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
      title: 'Vị trí cầu cảng / Địa chỉ vựa',
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
            title="Xóa nhà cung cấp này?"
            description="Bạn có chắc chắn muốn xóa nhà cung cấp này khỏi danh sách?"
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
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate flex items-center gap-2">
          <TeamOutlined className="text-sky-600" /> Nhà Cung Cấp
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
          className="bg-sky-500 hover:bg-sky-600 border-none font-medium flex-shrink-0"
          size="middle"
        >
          <span className="hidden sm:inline">Thêm Nhà Cung Cấp</span>
          <span className="sm:hidden">Thêm mới</span>
        </Button>
      </div>

      <Card
        className="shadow-sm rounded-2xl"
        extra={<ZoomButton onClick={() => setIsZoomed(true)} />}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            Danh sách đối tác cung cấp (Tàu cá đánh bắt xa bờ / Vựa thu mua / Hợp tác xã)
          </span>
          <Input.Search
            placeholder="Tìm theo tên tàu, mã hoặc SĐT..."
            allowClear
            onSearch={(val) => {
              setSearch(val);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ maxWidth: 300 }}
          />
        </div>

        <Table
          dataSource={partners}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
        />
      </Card>

      <Modal
        title={editingPartner ? `Sửa Nhà Cung Cấp: ${editingPartner.name}` : 'Thêm Nhà Cung Cấp Mới'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="Tên nhà cung cấp (Tàu cá / Vựa / HTX)"
              rules={[{ required: true, message: 'Nhập tên nhà cung cấp!' }]}
            >
              <Input
                placeholder="VD: Tàu cá ĐN-90123 / HTX Hải Sản Thọ Quang"
                onChange={(e) => {
                  if (!editingPartner) {
                    const autoCode = generateCodeFromName(e.target.value, 'NCC');
                    form.setFieldsValue({ code: autoCode });
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="code"
              label="Mã nhà cung cấp (Tự sinh)"
              rules={[{ required: true, message: 'Nhập mã quản lý!' }]}
            >
              <Input
                placeholder="Tự động sinh (VD: NCC-TAU-CA-DN90123)"
                className="uppercase font-mono bg-slate-50 dark:bg-slate-800/60"
                disabled={!!editingPartner}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="contactPerson" label="Thuyền trưởng / Chủ vựa / Người đại diện">
              <Input placeholder="VD: Thuyền trưởng Nguyễn Văn A" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="VD: 0912 345 678" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="email" label="Email liên hệ (nếu có)">
              <Input placeholder="VD: contact@doitau.vn" />
            </Form.Item>
            <Form.Item name="taxCode" label="Mã số thuế (nếu có)">
              <Input placeholder="VD: 0401 234 567" />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Vị trí cầu cảng / Địa chỉ vựa">
            <Input.TextArea rows={2} placeholder="VD: Cầu cảng số 3, Cảng cá Thọ Quang, Đà Nẵng" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <Input.TextArea rows={2} placeholder="Thông tin giao dịch đặc biệt, phương thức thanh toán, công nợ..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Phóng To Bảng & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="👥 Danh Sách Nhà Cung Cấp"
        subtitle={`Hiển thị ${partners.length} nhà cung cấp trong hệ thống`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              dataSource={partners}
              columns={columns}
              rowKey="id"
              loading={loading}
              scroll={{ x: 900, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              }}
              size="middle"
            />
          </div>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default PartnersPage;
