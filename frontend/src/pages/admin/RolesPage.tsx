import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { App, Button, Card, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Role } from '../../types/seafood';
import { PERMISSION_CATEGORIES, PERMISSIONS } from '../../stores/useRoleStore';
import { roleService } from '../../services/roleService';

type RoleFormValues = Pick<Role, 'name' | 'description' | 'permissions'>;

export const RolesPage: React.FC = () => {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [form] = Form.useForm<RoleFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roleService.getAll();
      setRoles(data);
    } catch {
      message.error('Không thể tải danh sách vai trò.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const permissionsByCategory = useMemo(() => PERMISSION_CATEGORIES.map((category) => ({
    category,
    permissions: PERMISSIONS.filter((permission) => permission.category === category),
  })), []);

  const openCreate = () => {
    setEditingRole(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setIsModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({ name: role.name, description: role.description, permissions: role.permissions });
    setIsModalOpen(true);
  };

  const submit = async (values: RoleFormValues) => {
    const normalizedName = values.name.trim();
    if (roles.some((role) => role.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase() && role.id !== editingRole?.id)) {
      form.setFields([{ name: 'name', errors: ['Tên vai trò đã tồn tại.'] }]);
      return;
    }
    const payload = { name: normalizedName, description: values.description.trim(), permissions: values.permissions ?? [] };
    
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, payload);
        message.success('Đã cập nhật vai trò và quyền hạn.');
      } else {
        await roleService.create(payload);
        message.success('Đã tạo vai trò mới.');
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch {
      message.error('Lỗi khi lưu thông tin vai trò.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await roleService.delete(id);
      message.success('Đã xóa vai trò thành công!');
      fetchRoles();
    } catch (err: any) {
      message.error(err.message || 'Không thể xóa vai trò mặc định.');
    }
  };

  const columns = [
    { title: 'Vai trò', dataIndex: 'name', key: 'name', render: (name: string, role: Role) => <Space><strong>{name}</strong>{role.isSystemDefault && <Tag color="blue">Mặc định</Tag>}</Space> },
    { title: 'Mô tả', dataIndex: 'description', key: 'description' },
    {
      title: 'Số quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => <Tag color="purple">{(permissions || []).length} / {PERMISSIONS.length} quyền</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, role: Role) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(role)} />
          {!role.isSystemDefault && (
            <Popconfirm title="Xóa vai trò" description="Bạn có chắc muốn xóa vai trò này không?" onConfirm={() => handleDelete(role.id)} okText="Xóa" cancelText="Hủy">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 m-0">Quản Lý Vai Trò & Phân Quyền</h1>
          <p className="text-gray-500 mt-1">Cấu hình vai trò và gán quyền chi tiết cho nhân viên trong hệ thống.</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRoles} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-sky-500 hover:bg-sky-600 border-none">
            Thêm vai trò mới
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table dataSource={roles} columns={columns} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-sky-500" />
            <span>{editingRole ? 'Chỉnh sửa vai trò & phân quyền' : 'Tạo mới vai trò'}</span>
          </div>
        }
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        okText={editingRole ? 'Lưu thay đổi' : 'Tạo mới'}
        cancelText="Hủy bỏ"
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submit} className="mt-4">
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Vui lòng nhập tên vai trò!' }]}>
            <Input placeholder="VD: QuanLyKho" disabled={editingRole?.isSystemDefault} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả công việc" rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}>
            <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn chức năng của vai trò..." />
          </Form.Item>
          <Form.Item name="permissions" label="Danh sách quyền hạn được cấp">
            <Checkbox.Group className="w-full">
              <div className="space-y-4 w-full">
                {permissionsByCategory.map(({ category, permissions }) => (
                  <Card key={category} type="inner" title={category} size="small">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {permissions.map((p) => (
                        <Checkbox key={p.code} value={p.code}>
                          {p.displayName}
                        </Checkbox>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RolesPage;
