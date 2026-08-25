import React, { useState } from 'react';
import { Card, Form, Input, Button, Checkbox, Typography, App, Modal } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { authService, TenantAvailabilityState } from '../../services/authService';

const { Title, Paragraph, Text } = Typography;

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantInput, setTenantInput] = useState('');
  const [tenantChecking, setTenantChecking] = useState(false);
  const [selectedTenantInfo, setSelectedTenantInfo] = useState<{ id?: number | null; code?: string | null; name?: string | null } | null>(() => {
    const code = localStorage.getItem('tenantName');
    const id = localStorage.getItem('tenantId');
    return code ? { id: id ? parseInt(id, 10) : null, code, name: code } : null;
  });

  const login = useAuthStore((state) => state.login);
  const { setActiveTenantByCode } = useTenantStore();
  const currentTheme = useThemeStore((state) => state.theme);
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const from = location.state?.from?.pathname || '/';

  const handleOpenTenantModal = () => {
    setTenantInput(selectedTenantInfo?.code || '');
    setTenantModalOpen(true);
  };

  const handleSaveTenant = async () => {
    const trimmed = tenantInput.trim();
    if (!trimmed) {
      // Chuyển về Host / Không chọn tenant
      localStorage.removeItem('tenantName');
      localStorage.removeItem('tenantId');
      setSelectedTenantInfo(null);
      setTenantModalOpen(false);
      message.info('Đã chuyển sang chế độ Toàn hệ thống (Host / Không chỉ định Tenant).');
      return;
    }

    setTenantChecking(true);
    try {
      const result = await authService.isTenantAvailable(trimmed);

      if (result.state === TenantAvailabilityState.NotFound) {
        message.error(`Không tìm thấy Cửa hàng / Chi nhánh với mã '${trimmed}'.`);
        return;
      }

      if (result.state === TenantAvailabilityState.InActive) {
        message.warning(`Cửa hàng / Chi nhánh '${result.tenantName || trimmed}' đang tạm ngưng hoạt động.`);
        return;
      }

      // Available
      const info = {
        id: result.tenantId,
        code: result.tenantCode || trimmed,
        name: result.tenantName || trimmed,
      };

      setSelectedTenantInfo(info);
      if (info.code) {
        localStorage.setItem('tenantName', info.code);
        if (info.id) localStorage.setItem('tenantId', info.id.toString());
        await setActiveTenantByCode(info.code);
      }

      message.success(`Đã chọn chi nhánh: ${info.name}`);
      setTenantModalOpen(false);
    } catch {
      message.error('Lỗi khi kiểm tra thông tin chi nhánh.');
    } finally {
      setTenantChecking(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Nếu có tenant đã chọn, gửi kèm tenantId và tenantName lên API
      const response = await authService.login({
        email: values.email,
        password: values.password,
        tenantName: selectedTenantInfo?.code || undefined,
        tenantId: selectedTenantInfo?.id || undefined,
      });

      login(
        response.token,
        response.user,
        response.user.tenantCode || selectedTenantInfo?.code || undefined,
        response.user.tenantId || selectedTenantInfo?.id || undefined
      );

      if (response.user.tenantCode) {
        await setActiveTenantByCode(response.user.tenantCode);
      }

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
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🚢</div>
          <Title level={3} className="m-0">
            KHO HẢI SẢN
          </Title>
          <Paragraph type="secondary" className="mt-1">
            Hệ thống Quản lý Kho Hàng Hải Sản Multi-Tenant
          </Paragraph>
        </div>

        {/* Thanh chuyển đổi Tenant theo chuẩn ABP */}
        <div className="mb-5 p-3 rounded-lg bg-sky-50 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <GlobalOutlined className="text-sky-600 text-sm" />
            <div>
              <span className="text-gray-500 dark:text-gray-400">Chi nhánh / Tenant: </span>
              {selectedTenantInfo ? (
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {selectedTenantInfo.name} ({selectedTenantInfo.code})
                </span>
              ) : (
                <span className="font-medium text-gray-500 italic">Chưa chọn (Mặc định / Host)</span>
              )}
            </div>
          </div>
          <Button
            type="link"
            size="small"
            icon={<SwapOutlined />}
            onClick={handleOpenTenantModal}
            className="p-0 font-semibold text-sky-600"
          >
            Đổi
          </Button>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
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
              className="w-full bg-sky-500 border-none hover:bg-sky-600 font-semibold"
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Modal Chuyển đổi Tenant (ABP Change Tenant Modal) */}
      <Modal
        title="Chuyển Đổi Cửa Hàng / Chi Nhánh"
        open={tenantModalOpen}
        onOk={handleSaveTenant}
        onCancel={() => setTenantModalOpen(false)}
        confirmLoading={tenantChecking}
        okText="Xác nhận"
        cancelText="Hủy"
        width={450}
      >
        <div className="py-2 space-y-3">
          <Text type="secondary" className="text-xs">
            Nhập Mã hoặc Tên chi nhánh của bạn. Để trống nếu bạn muốn đăng nhập với quyền Quản trị toàn hệ thống (Host).
          </Text>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mã / Tên Cửa Hàng (Tenancy Name)</label>
            <Input
              prefix={<GlobalOutlined className="text-gray-400" />}
              placeholder="VD: BIENDONG, KHO_DANANG..."
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              onPressEnter={handleSaveTenant}
              allowClear
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default LoginPage;
