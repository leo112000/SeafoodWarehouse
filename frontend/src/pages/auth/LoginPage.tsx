import React, { useState } from 'react';
import { Card, Form, Input, Button, Checkbox, Typography, App } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import type { UserInfo } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';

const { Title, Paragraph } = Typography;

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const currentTheme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const from = location.state?.from?.pathname || '/';

  // Mock authentication function since the real backend is not fully ready
  const handleMockLogin = async (values: any): Promise<{ token: string; user: UserInfo }> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const { email, password } = values;
        
        // Define mock accounts
        if (email === 'admin@gmail.com' && password === 'admin123') {
          resolve({
            token: 'mock-jwt-token-admin',
            user: {
              id: 'u-1',
              name: 'Đặng Lâm Cường (Admin)',
              email: 'admin@gmail.com',
              roles: ['Admin'],
            },
          });
        } else if (email === 'thukho@gmail.com' && password === 'thukho123') {
          resolve({
            token: 'mock-jwt-token-thukho',
            user: {
              id: 'u-2',
              name: 'Trần Minh Thuận (Thủ kho)',
              email: 'thukho@gmail.com',
              roles: ['Thukho'],
            },
          });
        } else if (email === 'nhanvien@gmail.com' && password === 'nhanvien123') {
          resolve({
            token: 'mock-jwt-token-nhanvien',
            user: {
              id: 'u-3',
              name: 'Nguyễn Văn Nam (Nhân viên)',
              email: 'nhanvien@gmail.com',
              roles: ['Nhanvien'],
            },
          });
        } else {
          reject(new Error('Tài khoản hoặc mật khẩu không chính xác.'));
        }
      }, 800);
    });
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await handleMockLogin(values);
      login(response.token, response.user, values.tenantName);
      message.success('Đăng nhập thành công!');
      navigate(from, { replace: true });
    } catch (err: any) {
      message.error(err.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = currentTheme === 'dark';

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-[#0f172a]' : 'bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#e0f2fe]'
      }`}
    >
      <Card
        className={`w-full max-w-md shadow-xl border ${
          isDark ? 'bg-[#1e293b] border-gray-800' : 'bg-white border-sky-100'
        }`}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚢</div>
          <Title level={3} className="m-0">
            KHO HẢI SẢN
          </Title>
          <Paragraph type="secondary" className="mt-1">
            Hệ thống Quản lý Kho Hàng Hải Sản
          </Paragraph>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item name="tenantName">
            <Input
              prefix={<GlobalOutlined className="text-gray-400" />}
              placeholder="Tenant (Tên miền phụ / Để trống nếu mặc định)"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập Email!' },
              { type: 'email', message: 'Email không hợp lệ!' },
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Email đăng nhập"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item className="mb-4">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Ghi nhớ đăng nhập</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full bg-sky-500 border-none hover:bg-sky-600"
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md text-xs text-gray-500">
          <p className="font-semibold mb-1">Tài khoản demo:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Admin: <code className="font-semibold">admin@gmail.com</code> / <code className="font-semibold">admin123</code></li>
            <li>Thủ kho: <code className="font-semibold">thukho@gmail.com</code> / <code className="font-semibold">thukho123</code></li>
            <li>Nhân viên: <code className="font-semibold">nhanvien@gmail.com</code> / <code className="font-semibold">nhanvien123</code></li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
export default LoginPage;
