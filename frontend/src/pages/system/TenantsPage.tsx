import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, App, Badge, Row, Col, Popconfirm, Tooltip } from 'antd';
import { ShopOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined, HomeOutlined, NumberOutlined, LoginOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { tenantService, type TenantItem, type CreateTenantDto } from '../../services/tenantService';
import { generateCodeFromName } from '../../utils/codeGenerator';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { authService } from '../../services/authService';
import { ZoomButton, ZoomViewerModal } from '../../components/common/ZoomViewerModal';
import { getErrorMessage } from '../../services/api';

export const TenantsPage: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { tenants, fetchTenants, setActiveTenantByCode } = useTenantStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleOpenModal = (tenant?: TenantItem) => {
    if (tenant) {
      setEditingTenant(tenant);
      form.setFieldsValue(tenant);
    } else {
      setEditingTenant(null);
      form.resetFields();
      form.setFieldsValue({ isActive: true });
    }
    setModalOpen(true);
  };

  // Đăng nhập trực tiếp vào tài khoản Admin của Tenant được chọn
  const handleLoginToTenant = async (tenant: TenantItem) => {
    try {
      setImpersonatingId(tenant.id);
      const result = await authService.impersonateTenant(tenant.id);

      login(result.token, result.user, tenant.code, tenant.id);
      await setActiveTenantByCode(tenant.code);

      message.success(`Đã chuyển và đăng nhập vào tài khoản Admin của ${tenant.name}!`);
      navigate('/', { replace: true });
    } catch (err: any) {
      message.error(err.message || 'Không thể đăng nhập vào Tenant này.');
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleDelete = async (tenant: TenantItem) => {
    try {
      setLoading(true);
      await tenantService.delete(tenant.id);
      await fetchTenants();
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi xóa đơn vị thuê.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editingTenant) {
        await tenantService.update(editingTenant.id, values);
      } else {
        await tenantService.create(values as CreateTenantDto);
        setPagination((prev) => ({ ...prev, current: 1 }));
      }
      setModalOpen(false);
      fetchTenants();
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error from Antd form
      const errMsg = getErrorMessage(err, 'Có lỗi xảy ra khi lưu thông tin đơn vị thuê.');
      const isNameErr = errMsg.toLowerCase().includes('tên') || errMsg.toLowerCase().includes('name');

      if (isNameErr) {
        form.setFields([{ name: 'name', errors: [errMsg] }]);
      } else {
        form.setFields([{ name: 'code', errors: [errMsg] }]);
      }
      message.warning(errMsg);
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
      title: 'Mã & Tên Doanh Nghiệp',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TenantItem) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShopOutlined className="text-sky-600" />
            {name}
          </div>
          <div className="text-xs text-gray-400 font-mono">Mã: {record.code}</div>
        </div>
      ),
    },
    {
      title: 'Địa chỉ trụ sở / Kho',
      dataIndex: 'address',
      key: 'address',
      render: (text: string) => (
        <span className="text-gray-700 dark:text-gray-300">
          <HomeOutlined className="mr-1 text-sky-500" />
          {text || 'Chưa cập nhật'}
        </span>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: any, record: TenantItem) => (
        <div className="text-xs space-y-1">
          {record.phone && <div><PhoneOutlined className="mr-1 text-emerald-500" />{record.phone}</div>}
          {record.email && <div><MailOutlined className="mr-1 text-blue-500" />{record.email}</div>}
        </div>
      ),
    },
    {
      title: 'Mã số thuế (MST)',
      dataIndex: 'taxCode',
      key: 'taxCode',
      render: (text: string) => (
        <Tag color="blue" icon={<NumberOutlined />}>
          {text || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Badge status={active ? 'success' : 'default'} text={active ? 'Hoạt động' : 'Tạm khóa'} />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: TenantItem) => (
        <Space>
          <Tooltip title={`Đăng nhập trực tiếp vào tài khoản Admin của ${record.name}`}>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<LoginOutlined />}
              loading={impersonatingId === record.id}
              onClick={() => handleLoginToTenant(record)}
            >
              Đăng nhập Tenant
            </Button>
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title={`Xác nhận xóa doanh nghiệp "${record.name}"?`}
            description="Toàn bộ dữ liệu của doanh nghiệp này sẽ được chuyển sang trạng thái đã xóa."
            onConfirm={() => handleDelete(record)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate flex items-center gap-2">
            <SafetyCertificateOutlined className="text-sky-600" /> Quản Lý Đơn Vị Thuê (SaaS Tenants)
          </h1>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Đăng Ký Mới
        </Button>
      </div>

      <Card
        className="shadow-sm"
        title="Danh sách doanh nghiệp & chi nhánh"
        extra={<ZoomButton onClick={() => setIsZoomOpen(true)} />}
      >
        <Table
          dataSource={tenants}
          columns={columns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 850 }}
        />
      </Card>

      <ZoomViewerModal
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title="Danh sách doanh nghiệp & chi nhánh"
      >
        <Table
          dataSource={tenants}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </ZoomViewerModal>

      <Modal
        title={editingTenant ? `Sửa Thông Tin ${editingTenant.name}` : 'Thêm Cửa Hàng / Chi Nhánh Mới'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={loading}
        okText="Lưu thông tin"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Tên Cửa Hàng / Kho Hải Sản" rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng!' }]}>
            <Input
              placeholder="VD: KHO HẢI SẢN BIỂN ĐÔNG"
              onChange={(e) => {
                if (!editingTenant) {
                  const autoCode = generateCodeFromName(e.target.value, 'CN');
                  form.setFieldsValue({ code: autoCode });
                }
              }}
            />
          </Form.Item>

          {!editingTenant && (
            <Form.Item name="code" label="Mã chi nhánh (Tự sinh theo tên)" rules={[{ required: true, message: 'Vui lòng nhập mã chi nhánh!' }]}>
              <Input placeholder="Tự động sinh (VD: CN-BIEN-DONG)" className="uppercase font-mono bg-slate-50 dark:bg-slate-800/60" />
            </Form.Item>
          )}

          <Form.Item name="address" label="Địa chỉ kho / Cửa hàng">
            <Input.TextArea rows={2} placeholder="VD: 123 Đường Cảng Cá, Phường Thọ Quang, Đà Nẵng" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại liên hệ">
                <Input placeholder="VD: 0236 123 4567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email làm việc">
                <Input placeholder="VD: kho@biendongsea.vn" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="taxCode" label="Mã số thuế (MST)">
            <Input placeholder="VD: 0401 345 678" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TenantsPage;
