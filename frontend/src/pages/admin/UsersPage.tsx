import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Switch, Space, App, Pagination } from 'antd';
import { UserAddOutlined, EditOutlined, SafetyCertificateOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { userService, type UserRecord } from '@/services/userService';
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit';

export const UsersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      message.error('Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: UserRecord) => {
    setEditingUser(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      phone: record.phone,
      roles: record.roles,
      status: record.status === 'Active',
      tenantName: record.tenantName,
    });
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  const { isSubmitting, handleSubmit: handleFormSubmit } = useAsyncSubmit(async (values: any) => {
    const status: 'Active' | 'Blocked' = values.status ? 'Active' : 'Blocked';
    try {
      if (editingUser) {
        // Edit mode
        await userService.update(editingUser.id, {
          name: values.name,
          email: values.email,
          password: values.password,
          phone: values.phone,
          roles: values.roles,
          status,
          tenantName: values.tenantName || 'Default',
        });
        message.success('Cập nhật thông tin nhân viên thành công!');
      } else {
        // Add mode
        await userService.create({
          name: values.name,
          email: values.email,
          password: values.password,
          phone: values.phone,
          roles: values.roles,
          status,
          tenantName: values.tenantName || 'Default',
        });
        setPagination((prev) => ({ ...prev, current: 1 }));
        message.success('Thêm nhân viên mới thành công!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch {
      message.error('Lỗi khi lưu thông tin nhân viên.');
    }
  });

  const handleToggleStatus = async (record: UserRecord) => {
    try {
      await userService.toggleStatus(record.id);
      message.success(`Đã thay đổi trạng thái của ${record.name}`);
      fetchUsers();
    } catch {
      message.error('Không thể thay đổi trạng thái.');
    }
  };

  const handleDeleteUser = (record: UserRecord) => {
    modal.confirm({
      title: 'Xác nhận xóa tài khoản',
      content: `Bạn có chắc muốn xóa nhân viên "${record.name}" (${record.email})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await userService.delete(record.id);
          message.success('Đã xóa nhân viên thành công!');
          fetchUsers();
        } catch {
          message.error('Không thể xóa nhân viên.');
        }
      },
    });
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
      title: 'Họ và Tên',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold text-gray-800 dark:text-gray-100">{text}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => phone || 'Chưa cập nhật',
    },
    {
      title: 'Cửa hàng / Chi nhánh',
      dataIndex: 'tenantName',
      key: 'tenantName',
      render: (tenant?: string) => {
        const isHost = !tenant || tenant.includes('Host');
        return (
          <Tag color={isHost ? 'gold' : 'cyan'} className="font-medium">
            {tenant || '👑 Host (Toàn hệ thống)'}
          </Tag>
        );
      },
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <>
          {(roles || []).map((role) => {
            let color = 'blue';
            let label = 'Quản trị viên';
            if (role === 'Thukho') {
              color = 'orange';
              label = 'Thủ kho';
            } else if (role === 'Nhanvien') {
              color = 'green';
              label = 'Nhân viên';
            }
            return (
              <Tag color={color} key={role} className="font-medium">
                {label}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'Active' | 'Blocked') => {
        const isActive = status === 'Active';
        return (
          <Tag color={isActive ? 'success' : 'error'} className="font-semibold">
            {isActive ? 'Hoạt động' : 'Bị chặn'}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: UserRecord) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />
          <Button
            type="link"
            danger={record.status === 'Active'}
            onClick={() => handleToggleStatus(record)}
            className="text-xs"
          >
            {record.status === 'Active' ? 'Chặn' : 'Kích hoạt'}
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 m-0 truncate">Quản lý Phân Quyền & Nhân Viên</h1>
        </div>
        <Space size="small">
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleOpenAddModal}
            className="bg-sky-500 hover:bg-sky-600 border-none"
          >
            Thêm người dùng
          </Button>
        </Space>
      </div>

      <Card
        className="shadow-sm"
        title="Danh sách tài khoản nhân viên"
      >
        {/* Mobile View: Dạng Card chạm lướt kiểu App như ở Dashboard */}
        <div className="block sm:hidden space-y-2.5">
          {users
            .slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
            .map((u) => {
              const isHost = !u.tenantName || u.tenantName.includes('Host');
              const isActive = u.status === 'Active';
              return (
                <div
                  key={u.id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag color={isHost ? 'gold' : 'cyan'} className="font-medium text-xs m-0">
                        {u.tenantName || '👑 Host'}
                      </Tag>
                      <Tag color={isActive ? 'success' : 'error'} className="font-semibold text-[10px] m-0">
                        {isActive ? '● Hoạt động' : '○ Bị chặn'}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-sky-600" />}
                        onClick={() => handleOpenEditModal(u)}
                        className="h-7 w-7 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteUser(u)}
                        className="h-7 w-7 p-0 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-0.5">
                    {u.name}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    {u.email}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {(u.roles || []).map((role) => {
                      let color = 'blue';
                      let label = 'Quản trị viên';
                      if (role === 'Thukho') {
                        color = 'orange';
                        label = 'Thủ kho';
                      } else if (role === 'Nhanvien') {
                        color = 'green';
                        label = 'Nhân viên';
                      }
                      return (
                        <Tag color={color} key={role} className="m-0 text-[10px] font-medium">
                          {label}
                        </Tag>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-gray-400">Liên hệ: <span className="font-medium text-slate-700 dark:text-slate-300">{u.phone || u.email}</span></span>
                    <Button
                      type="link"
                      danger={isActive}
                      size="small"
                      className="p-0 text-xs font-semibold"
                      onClick={() => handleToggleStatus(u)}
                    >
                      {isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                    </Button>
                  </div>
                </div>
              );
            })}

          {users.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">Chưa có tài khoản nào</div>
          )}

          {users.length > 0 && (
            <div className="flex justify-center pt-2">
              <Pagination
                size="small"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={users.length}
                onChange={(page, pageSize) => setPagination({ current: page, pageSize })}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table
            dataSource={users}
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
        </div>
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-sky-500" />
            <span>{editingUser ? 'Cập nhật phân quyền nhân viên' : 'Thêm tài khoản nhân viên mới'}</span>
          </div>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={handleModalCancel}
        confirmLoading={isSubmitting}
        cancelButtonProps={{ disabled: isSubmitting }}
        okText={editingUser ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy bỏ"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ status: true, roles: ['Nhanvien'] }}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
          >
            <Input placeholder="Nhập họ và tên nhân viên" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email đăng nhập"
            rules={[
              { required: true, message: 'Vui lòng nhập Email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input placeholder="vi-du@gmail.com" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Đổi mật khẩu mới' : 'Mật khẩu khởi tạo'}
            rules={
              editingUser
                ? []
                : [
                    { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' },
                  ]
            }
          >
            <Input.Password
              placeholder={editingUser ? 'Để trống nếu không muốn đổi mật khẩu' : 'Mặc định: 123456'}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input placeholder="0901234567" />
          </Form.Item>

          <Form.Item
            name="tenantName"
            label="TenantName (Cửa hàng / Chi nhánh)"
          >
            <Input placeholder="Default" />
          </Form.Item>

          <Form.Item
            name="roles"
            label="Vai trò hệ thống"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một vai trò!' }]}
          >
            <Select mode="multiple" placeholder="Chọn vai trò" showSearch optionFilterProp="children">
              <Select.Option value="Admin">Quản trị viên (Admin)</Select.Option>
              <Select.Option value="Thukho">Thủ kho (Thukho)</Select.Option>
              <Select.Option value="Nhanvien">Nhân viên (Nhanvien)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Bị chặn" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
