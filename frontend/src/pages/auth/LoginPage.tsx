import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, App, Tooltip } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
  ArrowRightOutlined,
  CheckCircleFilled,
  SunOutlined,
  MoonOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTenantStore } from '@/stores/useTenantStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { authService, TenantAvailabilityState } from '@/services/authService';
import { getErrorMessage } from '@/services/api';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const login = useAuthStore((state) => state.login);
  const { setActiveTenantByCode } = useTenantStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const from = location.state?.from?.pathname || '/';

  // Lấy tenant đã ghi nhớ từ trước (nếu có)
  const rememberedTenant = localStorage.getItem('rememberedTenant') || '';
  const isDark = theme === 'dark';

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      let targetTenantId: number | undefined = undefined;
      let targetTenantName: string | undefined = undefined;

      const rawTenant = values.tenant ? values.tenant.trim() : '';

      // 1. Nếu có nhập Tenant -> Gọi kiểm tra Tenant trước khi đăng nhập
      if (rawTenant) {
        const checkResult = await authService.isTenantAvailable(rawTenant);

        if (checkResult.state === TenantAvailabilityState.NotFound) {
          form.setFields([
            {
              name: 'tenant',
              errors: [`Không tìm thấy Chi nhánh / Doanh nghiệp với mã '${rawTenant}'.`],
            },
          ]);
          setLoading(false);
          return;
        }

        if (checkResult.state === TenantAvailabilityState.InActive) {
          form.setFields([
            {
              name: 'tenant',
              errors: [`Chi nhánh '${checkResult.tenantName || rawTenant}' đang tạm ngưng hoạt động.`],
            },
          ]);
          setLoading(false);
          return;
        }

        targetTenantId = checkResult.tenantId ?? undefined;
        targetTenantName = checkResult.tenantCode || rawTenant;

        // Ghi nhớ Tenant cho các lần đăng nhập tiếp theo
        if (targetTenantName) {
          localStorage.setItem('rememberedTenant', targetTenantName);
          localStorage.setItem('tenantName', targetTenantName);
        }
        if (targetTenantId) {
          localStorage.setItem('tenantId', targetTenantId.toString());
        }
      } else {
        // Đăng nhập quyền Host (Tenant = null)
        localStorage.removeItem('rememberedTenant');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantName');
      }

      // 2. Thực hiện đăng nhập
      const response = await authService.login({
        email: values.email.trim(),
        password: values.password,
        tenantName: targetTenantName,
        tenantId: targetTenantId,
      });

      const userTenantCode = response.user.tenantCode || targetTenantName || undefined;
      const userTenantId = response.user.tenantId ?? targetTenantId ?? undefined;

      login(
        response.token,
        response.user,
        userTenantCode,
        userTenantId,
        response.refreshToken
      );

      if (userTenantCode) {
        await setActiveTenantByCode(userTenantCode);
      } else {
        localStorage.removeItem('tenantName');
        localStorage.removeItem('tenantId');
      }

      message.success('Đăng nhập thành công! Chào mừng trở lại.');
      navigate(from, { replace: true });
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Có lỗi xảy ra khi đăng nhập.');
      if (errMsg.toLowerCase().includes('mật khẩu') || errMsg.toLowerCase().includes('password')) {
        form.setFields([{ name: 'password', errors: [errMsg] }]);
      } else if (errMsg.toLowerCase().includes('email') || errMsg.toLowerCase().includes('tài khoản')) {
        form.setFields([{ name: 'email', errors: [errMsg] }]);
      } else if (
        errMsg.toLowerCase().includes('tenant') ||
        errMsg.toLowerCase().includes('chi nhánh') ||
        errMsg.toLowerCase().includes('doanh nghiệp')
      ) {
        form.setFields([{ name: 'tenant', errors: [errMsg] }]);
      } else {
        message.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen relative flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-x-hidden transition-colors duration-500 ${isDark
        ? 'bg-[#0b1329] text-slate-100'
        : 'bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#eff6ff] text-slate-800'
        }`}
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-sky-400/20 dark:bg-sky-500/10 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] rounded-full bg-cyan-400/15 dark:bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Subtle Matrix Dot Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(${isDark ? '#38bdf8' : '#0284c7'} 1.5px, transparent 1.5px)`,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Main Glassmorphism Presentation Container */}
      <div
        className={`relative z-10 w-full max-w-md lg:max-w-5xl rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 backdrop-blur-xl ${isDark
          ? 'bg-slate-900/80 border-slate-700/60 shadow-black/40'
          : 'bg-white/90 border-sky-100/90 shadow-sky-900/10'
          }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Visual Showcase & Smart Cold Storage Hero - Chỉ hiển thị trên PC/Tablet màn hình lớn */}
          <div className="relative lg:col-span-6 hidden lg:flex flex-col justify-between p-8 md:p-12 overflow-hidden bg-slate-950 min-h-[640px]">
            {/* High-Resolution Hero Cold Chain Terminal Background */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105 hover:scale-100 opacity-60 mix-blend-luminosity"
              style={{
                backgroundImage: `url('/login_hero.jpg')`,
              }}
            />

            {/* Gradient Overlays for Readability & Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329] via-[#0b1329]/70 to-[#0b1329]/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1329]/90 to-transparent" />

            {/* Top Brand & Status Badges */}
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>HỆ THỐNG WMS KHO HẢI SẢN V2.5</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">
                Nền Tảng Quản Trị Chuỗi Lạnh & Kho Đa Chi Nhánh
              </h2>
              <p className="text-sky-200/75 text-xs md:text-sm max-w-md leading-relaxed">
                Tự động hóa luồng nhập xuất, giám sát cảm biến nhiệt độ âm sâu HACCP và đồng bộ dữ liệu thời gian thực.
              </p>
            </div>

            {/* Center Floating Glass Telemetry Cards - Hiển thị trên màn hình lớn */}
            <div className="relative z-10 my-8 space-y-3">
              {/* Floating Badge 1: Temperature Monitor */}
              <div className="animate-float-slow backdrop-blur-md bg-slate-900/60 border border-sky-500/20 rounded-2xl p-3 max-w-xs shadow-lg shadow-sky-950/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 text-lg">
                  ❄️
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Kho Lạnh A-01 (Đông Sâu)</div>
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <span>-22.5°C</span>
                    <span className="text-[10px] text-emerald-400 font-normal">● Chuẩn HACCP</span>
                  </div>
                </div>
              </div>

              {/* Floating Badge 2: Logistics & Vessel Inbound */}
              <div className="animate-float-reverse ml-6 backdrop-blur-md bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-3 max-w-xs shadow-lg shadow-cyan-950/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-lg">
                  🚢
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Tàu Cập Cảng Biển Đông</div>
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>1,210 Pallet / Giờ</span>
                    <span className="text-[10px] text-cyan-400 font-normal">● Bốc dỡ sẵn sàng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Capabilities Tags - Hiển thị trên màn hình lớn */}
            <div className="relative z-10 flex flex-wrap gap-2 pt-4 border-t border-slate-800/80">
              <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <CheckCircleFilled className="text-emerald-400 text-xs" />
                Multi-Tenant độc lập
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <CheckCircleFilled className="text-sky-400 text-xs" />
                Kiểm soát lô & HSD
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <CheckCircleFilled className="text-indigo-400 text-xs" />
                Bảo mật mã hóa kép
              </span>
            </div>
          </div>

          {/* Right Column: Modern Authentication Form - Chiếm trọn card trên mobile */}
          <div className="relative lg:col-span-6 p-6 sm:p-8 md:p-12 flex flex-col justify-center">
            {/* Nút Giao diện Sáng/Tối đặt ở góc trên bên phải của thẻ login */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 md:top-8 md:right-8 z-20">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 shadow-sm ${isDark
                  ? 'bg-slate-800/90 hover:bg-slate-700 text-sky-400 border-slate-700'
                  : 'bg-slate-100/90 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
              >
                {isDark ? <SunOutlined className="text-amber-400" /> : <MoonOutlined className="text-indigo-600" />}
                <span className="hidden sm:inline">{isDark ? 'Giao diện Sáng' : 'Giao diện Tối'}</span>
                <span className="sm:hidden">{isDark ? 'Sáng' : 'Tối'}</span>
              </button>
            </div>

            {/* Nhận diện thương hiệu nhỏ gọn chỉ hiện trên điện thoại */}
            <div className="lg:hidden flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-md shadow-sky-500/25">
                🚢
              </div>
              <div>
                <div className="font-black text-sm text-sky-600 dark:text-sky-400 tracking-wide leading-none">
                  KHO HẢI SẢN
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Hệ thống Quản lý Chuỗi lạnh
                </div>
              </div>
            </div>

            <div className="mb-5 pr-20 sm:pr-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1.5">
                <ThunderboltFilled />
                <span>Cổng Xác Thực An Toàn</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white m-0">
                Đăng Nhập
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 mb-0">
                Vui lòng điền thông tin tài khoản để truy cập hệ thống.
              </p>
            </div>

            <Form
              form={form}
              name="login_form"
              initialValues={{
                remember: true,
                tenant: rememberedTenant,
              }}
              onFinish={onFinish}
              layout="vertical"
              size="large"
              requiredMark={false}
            >
              {/* Field 1: Chi nhánh / Tenant */}
              <Form.Item
                name="tenant"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GlobalOutlined className="text-sky-600" />
                      <span>MÃ CHI NHÁNH / DOANH NGHIỆP</span>
                    </span>
                    <Tooltip title="Nếu bạn là Quản trị viên cấp cao toàn hệ thống (Host SuperAdmin), hãy để trống ô này.">
                      <span className="text-[11px] text-sky-600 dark:text-sky-400 cursor-pointer flex items-center gap-1">
                        <InfoCircleOutlined />
                        <span>Trợ giúp</span>
                      </span>
                    </Tooltip>
                  </div>
                }
                extra={
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Để trống nếu đăng nhập tài khoản Quản trị toàn hệ thống (Host).
                  </span>
                }
                className="mb-4"
              >
                <Input
                  prefix={<GlobalOutlined className="text-slate-400 mr-1" />}
                  placeholder="VD: BIENDONG, KHO_DANANG, KHO_CANTHO..."
                  allowClear
                  className="rounded-xl h-12 text-sm transition-all focus:border-sky-500 focus:shadow-sm"
                />
              </Form.Item>

              {/* Field 2: Email */}
              <Form.Item
                name="email"
                label={
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    EMAIL TÀI KHOẢN
                  </span>
                }
                rules={[
                  { required: true, message: 'Vui lòng nhập Email tài khoản!' },
                  { type: 'email', message: 'Địa chỉ Email không đúng định dạng!' },
                ]}
                className="mb-4"
              >
                <Input
                  prefix={<UserOutlined className="text-slate-400 mr-1" />}
                  placeholder="admin@seafood.com"
                  className="rounded-xl h-12 text-sm transition-all focus:border-sky-500 focus:shadow-sm"
                />
              </Form.Item>

              {/* Field 3: Mật khẩu */}
              <Form.Item
                name="password"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      MẬT KHẨU
                    </span>
                  </div>
                }
                rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                className="mb-3"
              >
                <Input.Password
                  prefix={<LockOutlined className="text-slate-400 mr-1" />}
                  placeholder="Nhập mật khẩu của bạn"
                  className="rounded-xl h-12 text-sm transition-all focus:border-sky-500 focus:shadow-sm"
                />
              </Form.Item>

              {/* Ghi nhớ đăng nhập */}
              <div className="flex items-center justify-between mb-5">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Ghi nhớ chi nhánh & phiên đăng nhập
                  </Checkbox>
                </Form.Item>
              </div>

              {/* Submit Button */}
              <Form.Item className="mb-4">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<ArrowRightOutlined />}
                  className="w-full h-12 rounded-xl text-base font-semibold border-none bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/30 transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Xác Thực & Đăng Nhập
                </Button>
              </Form.Item>
            </Form>

            {/* Security Compliance Footer */}
            <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              <SafetyCertificateOutlined className="text-emerald-500 text-sm" />
              <span>Bảo mật kết nối SSL 256-bit | Tiêu chuẩn an toàn dữ liệu ISO/IEC 27001</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
