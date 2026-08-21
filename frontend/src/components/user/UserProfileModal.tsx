import React, { useEffect, useState } from 'react';
import { App, Button, Descriptions, Form, Input, Modal, Space, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { UserInfo } from '../../stores/useAuthStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: UserInfo | null;
  tenantName: string | null;
}

interface ProfileFormValues {
  name: string;
  phone?: string;
}

const roleLabel = (role: string) => role === 'Thukho' ? 'Thủ kho' : role === 'Admin' ? 'Admin' : 'Nhân viên';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onClose, user, tenantName }) => {
  const { message } = App.useApp();
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [form] = Form.useForm<ProfileFormValues>();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({ name: user.name, phone: user.phone });
      setEditing(false);
    }
  }, [form, open, user]);

  const save = (values: ProfileFormValues) => {
    updateProfile({ name: values.name.trim(), phone: values.phone?.trim() || undefined });
    message.success('Đã cập nhật thông tin tài khoản.');
    setEditing(false);
  };

  return <Modal title="Thông tin tài khoản" open={open} onCancel={onClose} footer={null} destroyOnClose>
    {user && (editing ? <Form form={form} layout="vertical" onFinish={save} className="mt-5">
      <Form.Item name="name" label="Họ và tên" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập họ và tên.' }]}><Input /></Form.Item>
      <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^(?:\+84|0)\d{9,10}$/, message: 'Số điện thoại chưa hợp lệ.' }]}><Input placeholder="Ví dụ: 0901234567" /></Form.Item>
      <Space className="w-full justify-end"><Button onClick={() => setEditing(false)}>Hủy</Button><Button type="primary" htmlType="submit">Lưu thay đổi</Button></Space>
    </Form> : <>
      <Descriptions column={1} bordered size="small" className="mt-5" items={[
        { key: 'name', label: 'Họ tên', children: user.name },
        { key: 'email', label: 'Email', children: user.email },
        { key: 'phone', label: 'Số điện thoại', children: user.phone || 'Chưa cập nhật' },
        { key: 'role', label: 'Vai trò', children: <Space wrap size={[4, 4]}>{user.roles.map((role) => <Tag color={role === 'Admin' ? 'blue' : 'orange'} key={role}>{roleLabel(role)}</Tag>)}</Space> },
        { key: 'created', label: 'Ngày tạo tài khoản', children: user.createdAt || '01/01/2026' },
        { key: 'status', label: 'Trạng thái hoạt động', children: <Tag color={user.status === 'INACTIVE' || user.status === 'Blocked' ? 'error' : 'success'}>{user.status === 'INACTIVE' || user.status === 'Blocked' ? 'Ngừng hoạt động' : 'Đang hoạt động'}</Tag> },
        { key: 'tenant', label: 'Kho / Tenant', children: tenantName || 'Kho Lạnh Cảng Cá' },
      ]} />
      <div className="mt-5 text-right"><Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>Chỉnh sửa thông tin</Button></div>
    </>)}
  </Modal>;
};

export default UserProfileModal;
