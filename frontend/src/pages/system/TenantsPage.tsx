import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, App, Badge, Row, Col, Tooltip, Pagination } from 'antd';
import { ShopOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PhoneOutlined, MailOutlined, HomeOutlined, NumberOutlined, LoginOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { tenantService, type TenantItem, type CreateTenantDto } from '@/services/tenantService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTenantStore } from '@/stores/useTenantStore';
import { authService } from '@/services/authService';
import { getErrorMessage } from '@/services/api';

export const TenantsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { tenants, fetchTenants, setActiveTenantByCode } = useTenantStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
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

  const handleDelete = (tenant: TenantItem) => {
    modal.confirm({
      title: 'Xác nhận xóa đơn vị thuê',
      content: `Bạn có chắc chắn muốn xóa doanh nghiệp "${tenant.name}" (${tenant.code})? Toàn bộ dữ liệu của doanh nghiệp này sẽ chuyển sang trạng thái đã xóa.`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await tenantService.delete(tenant.id);
          message.success('Đã xóa đơn vị thuê thành công');
          await fetchTenants();
        } catch (err: any) {
          message.error(err?.message || 'Có lỗi xảy ra khi xóa đơn vị thuê.');
        } finally {
          setLoading(false);
        }
      },
    });
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
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            Xóa
          </Button>
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
      >
        {/* Mobile View: Dạng Card chạm lướt kiểu App như ở Dashboard */}
        <div className="block sm:hidden space-y-2.5">
          {tenants
            .slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
            .map((t) => (
              <div
                key={t.id}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Tag color="cyan" className="font-mono font-bold text-xs m-0">
                      {t.code}
                    </Tag>
                    <Tag color={t.isActive ? 'success' : 'default'} className="m-0 text-[10px] font-semibold">
                      {t.isActive ? '● Hoạt động' : '○ Tạm dừng'}
                    </Tag>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip title="Chuyển không gian làm việc">
                      <Button
                        type="text"
                        size="small"
                        icon={<LoginOutlined className="text-sky-600" />}
                        loading={impersonatingId === t.id}
                        onClick={() => handleLoginToTenant(t)}
                        className="h-7 w-7 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    </Tooltip>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined className="text-amber-600" />}
                      onClick={() => handleOpenModal(t)}
                      className="h-7 w-7 p-0 flex items-center justify-center hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg"
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(t)}
                      className="h-7 w-7 p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                  <ShopOutlined className="text-sky-600 shrink-0" />
                  <span className="truncate">{t.name}</span>
                </div>

                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t.address && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <HomeOutlined className="text-slate-400 shrink-0" />
                      <span className="truncate">{t.address}</span>
                    </div>
                  )}
                  {t.phone && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <PhoneOutlined className="text-emerald-500 shrink-0" />
                      <span className="truncate">{t.phone}</span>
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <MailOutlined className="text-blue-500 shrink-0" />
                      <span className="truncate">{t.email}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-[11px] text-gray-400">Mã định danh: #{t.id}</span>
                  <Button
                    type="link"
                    size="small"
                    className="p-0 text-xs text-sky-600 font-semibold"
                    onClick={() => handleLoginToTenant(t)}
                  >
                    Vào chi nhánh →
                  </Button>
                </div>
              </div>
            ))}

          {tenants.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">Chưa có chi nhánh nào</div>
          )}

          {tenants.length > 0 && (
            <div className="flex justify-center pt-2">
              <Pagination
                size="small"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={tenants.length}
                onChange={(page, pageSize) => setPagination({ current: page, pageSize })}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
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
        </div>
      </Card>

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
            <Form.Item name="code" label="Mã chi nhánh" rules={[{ required: true, message: 'Vui lòng nhập mã chi nhánh!' }]}>
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
