import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Switch, Space, App } from 'antd';
import { UserAddOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { UserInfo } from '../../stores/useAuthStore';

interface UserRecord extends UserInfo {
  status: 'Active' | 'Blocked';
  tenantName?: string;
}

export const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: 'u-1',
      name: 'Đặng Lâm Cường (Admin)',
      email: 'admin@gmail.com',
      roles: ['Admin'],
      status: 'Active',
      tenantName: 'Default',
    },
    {
      id: 'u-2',
      name: 'Trần Minh Thuận (Thủ kho)',
      email: 'thukho@gmail.com',
      roles: ['Thukho'],
      status: 'Active',
      tenantName: 'Default',
    },
    {
      id: 'u-3',
      name: 'Nguyễn Văn Nam (Nhân viên)',
      email: 'nhanvien@gmail.com',
      roles: ['Nhanvien'],
      status: 'Active',
      tenantName: 'Default',
    },
    {
      id: 'u-4',
      name: 'Lê Thị Mai (Nhân viên)',
      email: 'lemai@gmail.com',
      roles: ['Nhanvien'],
      status: 'Blocked',
      tenantName: 'TenantA',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();

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
      roles: record.roles,
      status: record.status === 'Active',
      tenantName: record.tenantName,
    });
    setIsModalOpen(true);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = (values: any) => {
    const status: 'Active' | 'Blocked' = values.status ? 'Active' : 'Blocked';
    if (editingUser) {
      // Edit mode
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: values.name,
                email: values.email,
                roles: values.roles,
                status,
                tenantName: values.tenantName || 'Default',
              }
            : u
        )
      );
      message.success('Cập nhật thông tin nhân viên thành công!');
    } else {
      // Add mode
      const newUser: UserRecord = {
        id: `u-${Math.random().toString(36).substring(2, 9)}`,
        name: values.name,
        email: values.email,
        roles: values.roles,
        status,
        tenantName: values.tenantName || 'Default',
      };
      setUsers((prev) => [...prev, newUser]);
      message.success('Thêm nhân viên mới thành công!');
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (record: UserRecord) => {
    const nextStatus = record.status === 'Active' ? 'Blocked' : 'Active';
    setUsers((prev) =>
      prev.map((u) => (u.id === record.id ? { ...u, status: nextStatus } : u))
    );
    message.success(`Đã thay đổi trạng thái của ${record.name} thành ${nextStatus === 'Active' ? 'Hoạt động' : 'Bị chặn'}`);
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
      title: 'Tenant',
      dataIndex: 'tenantName',
      key: 'tenantName',
      render: (tenant?: string) => <Tag color="purple">{tenant || 'Default'}</Tag>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: UserInfo['roles']) => (
        <>
          {roles.map((role) => {
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
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={handleOpenAddModal}
          className="bg-sky-500 hover:bg-sky-600 border-none"
        >
          Thêm người dùng
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table dataSource={users} columns={columns} rowKey="id" pagination={{ pageSize: 5 }} />
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
