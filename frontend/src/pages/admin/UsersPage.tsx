import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Switch, Space, App } from 'antd';
import { UserAddOutlined, EditOutlined, SafetyCertificateOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { userService, type UserRecord } from '../../services/userService';

export const UsersPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
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

  const handleFormSubmit = async (values: any) => {
    const status: 'Active' | 'Blocked' = values.status ? 'Active' : 'Blocked';
    try {
      if (editingUser) {
        // Edit mode
        await userService.update(editingUser.id, {
          name: values.name,
          email: values.email,
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
          phone: values.phone,
          roles: values.roles,
          status,
          tenantName: values.tenantName || 'Default',
        });
        message.success('Thêm nhân viên mới thành công!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu thông tin nhân viên.');
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 m-0">Quản lý Phân Quyền & Nhân Viên</h1>
          <p className="text-gray-500 mt-1">
            Quản lý tài khoản, thay đổi quyền hạn (Role-Based Access Control) và trạng thái hoạt động của nhân viên kho.
          </p>
        </div>
        <Space>
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

      <Card className="shadow-sm">
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
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
            <Select mode="multiple" placeholder="Chọn vai trò">
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
