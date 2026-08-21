import React from 'react';
import { App, Form, Input, Modal } from 'antd';
import { LockOutlined } from '@ant-design/icons';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<ChangePasswordValues>();
  const submit = () => {
    message.success('Đã cập nhật mật khẩu thành công.');
    form.resetFields();
    onClose();
  };

  return <Modal title="Đổi mật khẩu" open={open} onCancel={onClose} onOk={() => form.submit()} okText="Cập nhật mật khẩu" cancelText="Hủy" destroyOnClose>
    <Form form={form} layout="vertical" onFinish={submit} className="mt-5">
      <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại.' }]}><Input.Password prefix={<LockOutlined />} autoComplete="current-password" /></Form.Item>
      <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới.' }, { min: 6, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
      <Form.Item name="confirmPassword" label="Xác nhận mật khẩu mới" dependencies={['newPassword']} rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu mới.' }, ({ getFieldValue }) => ({ validator: (_, value: string) => !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error('Mật khẩu xác nhận không khớp.')) } )]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
    </Form>
  </Modal>;
};

export default ChangePasswordModal;
