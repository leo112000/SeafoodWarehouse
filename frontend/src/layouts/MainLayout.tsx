import React, { useEffect, useState } from 'react';
import { App, Avatar, Badge, Button, Divider, Drawer, Dropdown, Layout, Menu, Popover, Tag, theme, Tooltip } from 'antd';
import { AppstoreOutlined, BarChartOutlined, BellOutlined, DashboardOutlined, DatabaseOutlined, EnvironmentOutlined, FolderOutlined, HistoryOutlined, InboxOutlined, KeyOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MoonOutlined, SafetyCertificateOutlined, SettingOutlined, SunOutlined, TeamOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermission } from '@/components/PermissionGuard';
import { UserProfileModal } from '@/components/user/UserProfileModal';
import { ChangePasswordModal } from '@/components/user/ChangePasswordModal';
import { MultiTabBar } from '@/components/layout/MultiTabBar';
import { TabContentRenderer } from '@/components/layout/TabContentRenderer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useTabStore } from '@/stores/useTabStore';
import { useBrandStore } from '@/stores/useBrandStore';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';

const { Header, Sider, Content, Footer } = Layout;

const roleMeta = (role: string) => role === 'Admin' ? { label: 'Admin', color: 'blue' } : role === 'Thukho' ? { label: 'Thủ kho', color: 'orange' } : { label: 'Nhân viên', color: 'green' };

export const MainLayout: React.FC = () => {
  const { websiteName, logoUrl, loadBrand } = useBrandStore();
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { modal } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const currentTheme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);
  const tenantName = useAuthStore((state) => state.tenantName);
  const logout = useAuthStore((state) => state.logout);
  const canCreateInbound = usePermission('Pages.Inbound.Create');
  const canViewInbound = usePermission('Pages.Inbound.View');
  const canCreateOutbound = usePermission('Pages.Outbound.Create');
  const canViewOutbound = usePermission('Pages.Outbound.View');
  const canCreateWastage = usePermission('Pages.Wastage.Create');
  const canViewProducts = usePermission('Pages.Products.View');
  const canViewPackaging = usePermission('Pages.Packaging.View');
  const canViewPackagingReturn = usePermission('Pages.PackagingReturn.View');
  const canViewCategories = usePermission('Pages.Categories.View');
  const canViewReports = usePermission('Pages.Reports.View');
  const canManageUsers = usePermission('Pages.Users.Manage');
  const canManageRoles = usePermission('Pages.Roles.Manage');
  const canManageSettings = usePermission('Pages.Settings.Manage');
  const canViewAuditLogs = usePermission('Pages.AuditLogs.View');
  const canManageTenantsPermission = usePermission('Pages.Tenants.Manage');
  const isHostAdmin = (user?.tenantId === null || user?.tenantId === undefined) && (user?.roles?.includes('Admin') ?? false);
  const canManageTenants = isHostAdmin && canManageTenantsPermission;
  const canAccessWarehouse = canCreateInbound || canViewInbound || canCreateOutbound || canViewOutbound || canCreateWastage || canViewProducts || canViewPackaging || canViewCategories || canViewReports;

  // Real-time system notifications from database
  const { notifications: systemNotifications, unreadCount, markAsRead, markAllAsRead } = useSystemNotifications();

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const addTab = useTabStore((state) => state.addTab);
  const setActiveKey = useTabStore((state) => state.setActiveKey);
  // Map route to human-readable title
  const getRouteTitle = (path: string): string => {
    switch (path) {
      case '/':
      case '/dashboard': return 'Bảng điều khiển';
      case '/inventory': return 'Tồn kho hiện tại';
      case '/inventory/inbound': return 'Nhập kho hải sản';
      case '/inventory/outbound': return 'Xuất kho hải sản';
      case '/inventory/history': return 'Lịch sử giao dịch';
      case '/inventory/wastage': return 'Hao hụt & Phân loại';
      case '/inventory/packaging-return': return 'Thu hồi vỏ sọt';
      case '/master-data/categories': return 'Nhóm danh mục';
      case '/master-data/products': return 'Danh mục hải sản';
      case '/master-data/warehouses': return 'Danh mục kho bãi';
      case '/master-data/packaging': return 'Danh mục bao bì';
      case '/master-data/partners': return 'Nhà Cung Cấp';
      case '/reports/summary': return 'Thống kê tổng hợp';
      case '/reports/alerts': return 'Cảnh báo & Hao hụt';
      case '/system/tenants': return 'Cửa hàng & Chi nhánh';
      case '/system/users': return 'Quản lý nhân viên';
      case '/system/roles': return 'Vai trò & Phân quyền';
      case '/system/audit-logs': return 'Nhật ký hệ thống';
      case '/system/settings': return 'Cài đặt hệ thống';
      default: return path.split('/').filter(Boolean).pop() || 'Trang';
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setDrawerVisible(false);
    if (location.pathname && location.pathname !== '/login') {
      addTab({
        key: location.pathname,
        title: getRouteTitle(location.pathname),
      });
      setActiveKey(location.pathname);
    }
  }, [location.pathname, addTab, setActiveKey]);

  const handleLogout = () => {
    setProfileOpen(false);
    modal.confirm({
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
      okText: 'Đăng xuất',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        logout();
        navigate('/login', { replace: true });
      },
    });
  };
  const openProfile = () => { setProfileOpen(false); setProfileModalOpen(true); };
  const openChangePassword = () => { setProfileOpen(false); setChangePasswordOpen(true); };
  const openAuditLogs = () => { setProfileOpen(false); navigate('/system/audit-logs'); };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">1. Bảng điều khiển</Link> },
    ...(canAccessWarehouse ? [{
      key: '/inventory-menu',
      icon: <DatabaseOutlined />,
      label: '2. Quản lý kho',
      children: [
        { key: '/inventory', label: <Link to="/inventory">2.1. Tồn kho hiện tại</Link> },
        { key: '/inventory/inbound', label: <Link to="/inventory/inbound">2.2. Nhập kho hải sản</Link> },
        { key: '/inventory/outbound', label: <Link to="/inventory/outbound">2.3. Xuất kho hải sản</Link> },
        { key: '/inventory/history', label: <Link to="/inventory/history">2.4. Lịch sử Nhập/Xuất</Link> },
        { key: '/inventory/wastage', label: <Link to="/inventory/wastage">2.5. Hao hụt & Phân loại</Link> },
        ...(canViewPackagingReturn ? [{ key: '/inventory/packaging-return', label: <Link to="/inventory/packaging-return">2.6. Thu hồi vỏ sọt</Link> }] : []),
      ]
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '3. Báo cáo & Phân tích',
      children: [
        { key: '/reports/summary', label: <Link to="/reports/summary">3.1. Thống kê tổng hợp</Link> },
        { key: '/reports/alerts', label: <Link to="/reports/alerts">3.2. Hệ thống cảnh báo</Link> },
      ]
    },
    {
      key: '/master-data',
      icon: <FolderOutlined />,
      label: '4. Dữ liệu nền',
      children: [
        ...(canViewCategories ? [{ key: '/master-data/categories', icon: <FolderOutlined />, label: <Link to="/master-data/categories">4.1. Nhóm danh mục</Link> }] : []),
        ...(canViewProducts ? [{ key: '/master-data/products', icon: <AppstoreOutlined />, label: <Link to="/master-data/products">4.2. Danh mục hải sản</Link> }] : []),
        ...(canAccessWarehouse ? [{ key: '/master-data/warehouses', icon: <EnvironmentOutlined />, label: <Link to="/master-data/warehouses">4.3. Danh mục kho bãi</Link> }] : []),
        ...(canViewPackaging ? [{ key: '/master-data/packaging', icon: <InboxOutlined />, label: <Link to="/master-data/packaging">4.4. Danh mục bao bì</Link> }] : []),
        { key: '/master-data/partners', icon: <TeamOutlined />, label: <Link to="/master-data/partners">4.5. Nhà Cung Cấp</Link> },
      ]
    }] : []),
    ...((canManageUsers || canManageRoles || canManageSettings || canViewAuditLogs || canManageTenants) ? [{
      key: '/system',
      icon: <SettingOutlined />,
      label: '5. Hệ thống',
      children: [
        ...(canManageTenants ? [{ key: '/system/tenants', icon: <SettingOutlined />, label: <Link to="/system/tenants">5.1. Cửa hàng & Chi nhánh</Link> }] : []),
        ...(canManageUsers ? [{ key: '/system/users', icon: <UserOutlined />, label: <Link to="/system/users">5.2. Quản lý nhân viên</Link> }] : []),
        ...(canManageRoles ? [{ key: '/system/roles', icon: <SafetyCertificateOutlined />, label: <Link to="/system/roles">5.3. Vai trò & phân quyền</Link> }] : []),
        ...(canViewAuditLogs ? [{ key: '/system/audit-logs', icon: <HistoryOutlined />, label: <Link to="/system/audit-logs">5.4. Nhật ký hệ thống</Link> }] : []),
        ...(canManageSettings ? [{ key: '/system/settings', icon: <SettingOutlined />, label: <Link to="/system/settings">5.5. Cài đặt hệ thống</Link> }] : []),
      ]
    }] : []),
  ];

  const notifications = (
    <div className="w-80 max-w-[calc(100vw-32px)] p-1">
      <div className="flex items-center justify-between mb-3 border-b pb-2">
        <div className="flex items-center gap-2">
          <strong className="text-gray-800 dark:text-gray-100 text-sm">Thông báo hệ thống</strong>
          {unreadCount > 0 && <Tag color="error" className="m-0 font-medium">{unreadCount} mới</Tag>}
        </div>
        {unreadCount > 0 && (
          <Button type="link" size="small" className="p-0 text-xs text-sky-600" onClick={markAllAsRead}>
            Đọc tất cả
          </Button>
        )}
      </div>
      <div className="space-y-2 text-sm max-h-80 overflow-y-auto pr-1">
        {systemNotifications.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">Không có thông báo nào</div>
        ) : (
          systemNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-2.5 rounded-md transition-colors cursor-pointer border-l-4 ${!n.isRead ? 'bg-sky-50 dark:bg-gray-800/80 font-medium' : 'bg-gray-50/50 dark:bg-gray-900/40 opacity-75'
                }`}
              style={{
                borderColor: n.severity === 'error' ? '#ef4444' : n.severity === 'warning' ? '#f59e0b' : '#10b981',
              }}
              onClick={() => {
                if (!n.isRead) markAsRead(n.id);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                  <strong className="block text-gray-800 dark:text-gray-200 text-xs truncate">{n.title}</strong>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{n.timeText}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0 line-clamp-2 leading-relaxed">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
  const profileContent = user && <div className="w-64 p-1" style={{ textAlign: 'left' }}>
    <div className="flex items-center gap-3 px-2 py-2"><Avatar size={48} className="bg-sky-500">{user.name.charAt(0).toLocaleUpperCase()}</Avatar><div className="min-w-0"><div className="font-semibold truncate">{user.name}</div><div className="text-xs text-gray-500 truncate">{user.email}</div><div className="mt-1 flex flex-wrap gap-1">{user.roles.map((role) => { const meta = roleMeta(role); return <Tag key={role} color={meta.color} className="m-0">{meta.label}</Tag>; })}</div></div></div>
    <div className="px-2 text-xs text-gray-500">
      Không gian: <span className="font-medium text-gray-700 dark:text-gray-200">
        {user.tenantId ? (user.tenantName || tenantName || `Tenant #${user.tenantId}`) : '👑 Quản trị Hệ thống (Host)'}
      </span>
    </div>
    <Divider className="my-3" />
    <div className="flex flex-col"><Button type="text" icon={<UserOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openProfile}>Thông tin cá nhân</Button><Button type="text" icon={<KeyOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openChangePassword}>Đổi mật khẩu</Button><Button type="text" icon={<HistoryOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openAuditLogs}>Nhật ký cá nhân</Button></div>
    <Divider className="my-3" />
    <Button type="text" danger icon={<LogoutOutlined />} className="w-full text-left" style={{ justifyContent: 'flex-start' }} onClick={handleLogout}>Đăng xuất</Button>
  </div>;

  return (
    <>
      <Layout className="min-h-screen">
        {!isMobile ? (
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            breakpoint="lg"
            onBreakpoint={(broken) => {
              setCollapsed(broken);
            }}
            width={240}
            collapsedWidth={72}
            theme={currentTheme === 'dark' ? 'dark' : 'light'}
            style={{
              height: '100vh',
              position: 'sticky',
              top: 0,
              left: 0,
              zIndex: 100,
              backgroundColor: currentTheme === 'dark' ? '#0f172a' : '#ffffff',
              borderRight: currentTheme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
            }}
          >
            <div className="flex flex-col h-full">
              <div
                className={`p-3 text-center font-bold text-base overflow-hidden whitespace-nowrap z-10 flex-shrink-0 border-b flex items-center justify-center min-h-[56px] transition-colors ${
                  currentTheme === 'dark'
                    ? 'bg-[#0b1120] text-white border-slate-800'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                {collapsed ? (
                  logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('data:') || logoUrl.startsWith('/')) ? (
                    <img src={logoUrl} alt="Logo" className="w-7 h-7 object-contain rounded" />
                  ) : (
                    <span className="text-xl">{logoUrl || '🚢'}</span>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-2 min-w-0 max-w-full px-1">
                    {logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('data:') || logoUrl.startsWith('/')) ? (
                      <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded flex-shrink-0" />
                    ) : (
                      <span className="text-lg flex-shrink-0">{logoUrl || '🚢'}</span>
                    )}
                    <span
                      className={`truncate tracking-wide font-extrabold text-sm sm:text-base leading-tight ${
                        currentTheme === 'dark' ? 'text-white' : 'text-sky-700'
                      }`}
                    >
                      {websiteName}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <Menu
                  theme={currentTheme === 'dark' ? 'dark' : 'light'}
                  mode="inline"
                  selectedKeys={[location.pathname]}
                  defaultOpenKeys={
                    location.pathname.startsWith('/master-data')
                      ? ['/master-data']
                      : location.pathname.startsWith('/reports')
                        ? ['/reports']
                        : location.pathname.startsWith('/system')
                          ? ['/system']
                          : []
                  }
                  items={menuItems}
                />
              </div>
              {/* Sidebar Footer */}
              <div
                className={`flex-shrink-0 p-3 border-t text-xs text-center transition-colors ${
                  currentTheme === 'dark'
                    ? 'bg-[#0b1120] border-slate-800/80 text-gray-400'
                    : 'bg-slate-50 border-slate-200 text-gray-600'
                }`}
              >
                {collapsed ? (
                  <div className="flex flex-col items-center justify-center py-1">
                    <Tooltip
                      title={
                        <div>
                          <div className="font-semibold text-white">Hotline: 0965540075</div>
                          <div className="text-gray-300">Hỗ trợ kỹ thuật 24/7</div>
                          <div className="text-gray-400 mt-1">Phát triển: Leo11</div>
                        </div>
                      }
                      placement="right"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 cursor-pointer hover:bg-slate-700 transition-colors">
                        <PhoneOutlined />
                      </div>
                    </Tooltip>
                  </div>
                ) : (
                  <div className="space-y-1.5 px-1 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400 font-semibold">
                      <PhoneOutlined className="animate-pulse" />
                      <span>
                        Hotline:{' '}
                        <a href="tel:0965540075" className="text-sky-600 dark:text-sky-300 hover:underline font-bold">
                          0965540075
                        </a>
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>Hỗ trợ kỹ thuật 24/7</span>
                      <span className="text-slate-400 dark:text-slate-500">• v1.0</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-slate-200 dark:border-slate-800/60 w-full text-center">
                      👨‍💻 Người thực hiện: <span className="text-gray-700 dark:text-gray-300 font-medium">{'Leo11'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Sider>
        ) : (
          <Drawer
            title={
              <div className="flex items-center gap-2 overflow-hidden">
                {logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('data:') || logoUrl.startsWith('/')) ? (
                  <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain rounded flex-shrink-0" />
                ) : (
                  <span className="text-xl flex-shrink-0">{logoUrl || '🚢'}</span>
                )}
                <span className="font-bold text-sky-700 dark:text-sky-400 truncate">{websiteName}</span>
              </div>
            }
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            styles={{
              header: {
                paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
              },
              body: { padding: 0 },
              wrapper: { width: 290 }
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <Menu
                  theme={currentTheme === 'dark' ? 'dark' : 'light'}
                  mode="inline"
                  selectedKeys={[location.pathname]}
                  defaultOpenKeys={
                    location.pathname.startsWith('/master-data')
                      ? ['/master-data']
                      : location.pathname.startsWith('/reports')
                        ? ['/reports']
                        : location.pathname.startsWith('/system')
                          ? ['/system']
                          : []
                  }
                  items={menuItems}
                />
              </div>
              <div
                className="flex-shrink-0 p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-gray-400 text-center"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <div className="space-y-1 flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400 font-semibold">
                    <PhoneOutlined />
                    <span>Hotline: <a href="tel:0965540075" className="text-sky-600 dark:text-sky-400 hover:underline">0965540075</a></span>
                  </div>
                  <div className="text-[11px] text-center">
                    👨‍💻 Người thực hiện: <span className="font-medium text-gray-700 dark:text-gray-200">{'Leo11'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Drawer>
        )}
        <Layout className="min-w-0 overflow-x-clip">
          <div
            className="sticky top-0 z-40 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors safe-area-header"
            style={{
              background: colorBgContainer,
            }}
          >
            <Header
              className="p-0 flex items-center justify-between"
              style={{
                background: colorBgContainer,
                lineHeight: 'normal',
                height: isMobile ? '46px' : '52px',
              }}
            >
              <Button
                type="text"
                icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => (isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed))}
                className="text-base sm:text-lg w-9 h-9 sm:w-10 sm:h-10 ml-2 sm:ml-4 flex items-center justify-center rounded-lg"
              />
              <div className="flex items-center gap-1.5 sm:gap-2.5 pr-2.5 sm:pr-5">
                <Button
                  type="text"
                  icon={currentTheme === 'dark' ? <SunOutlined className="text-yellow-400" /> : <MoonOutlined />}
                  onClick={toggleTheme}
                  className="text-base flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg"
                  aria-label="Đổi giao diện"
                />
                {isMobile ? (
                  <>
                    <Badge count={unreadCount} size="small">
                      <Button
                        type="text"
                        icon={<BellOutlined />}
                        onClick={() => setNotificationDrawerOpen(true)}
                        className="text-base flex items-center justify-center w-8 h-8 rounded-lg"
                        aria-label="Thông báo"
                      />
                    </Badge>
                    <Drawer
                      open={notificationDrawerOpen}
                      onClose={() => setNotificationDrawerOpen(false)}
                      placement="bottom"
                      height="75vh"
                      title={
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">🔔 Thông báo hệ thống</span>
                            {unreadCount > 0 && <Tag color="error" className="m-0 text-xs">{unreadCount} mới</Tag>}
                          </div>
                          {unreadCount > 0 && (
                            <Button type="link" size="small" className="p-0 text-xs text-sky-600" onClick={markAllAsRead}>
                              Đọc tất cả
                            </Button>
                          )}
                        </div>
                      }
                      styles={{
                        wrapper: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
                        body: {
                          padding: '12px 16px',
                          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
                        }
                      }}
                    >
                      <div className="space-y-2.5">
                        {systemNotifications.length === 0 ? (
                          <div className="text-center py-12 text-gray-400 text-xs">Không có thông báo nào</div>
                        ) : (
                          systemNotifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 rounded-xl transition-colors cursor-pointer border-l-4 ${
                                !n.isRead ? 'bg-sky-50 dark:bg-gray-800/80 font-medium' : 'bg-gray-50/70 dark:bg-gray-900/40 opacity-75'
                              }`}
                              style={{
                                borderColor: n.severity === 'error' ? '#ef4444' : n.severity === 'warning' ? '#f59e0b' : '#10b981',
                              }}
                              onClick={() => {
                                if (!n.isRead) markAsRead(n.id);
                                setNotificationDrawerOpen(false);
                                if (n.link) navigate(n.link);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />}
                                  <strong className="block text-gray-800 dark:text-gray-200 text-xs truncate">{n.title}</strong>
                                </div>
                                <span className="text-[10px] text-gray-400 shrink-0">{n.timeText}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0 line-clamp-2 leading-relaxed">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </Drawer>
                  </>
                ) : (
                  <Popover
                    content={notifications}
                    trigger="click"
                    placement="bottomRight"
                    overlayStyle={{ maxWidth: 'calc(100vw - 24px)' }}
                  >
                    <Badge count={unreadCount} size="small">
                      <Button
                        type="text"
                        icon={<BellOutlined />}
                        className="text-base flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg"
                        aria-label="Thông báo"
                      />
                    </Badge>
                  </Popover>
                )}
                {user && (
                  <Dropdown
                    trigger={['click']}
                    open={profileOpen}
                    onOpenChange={setProfileOpen}
                    popupRender={() => (
                      <div
                        className="rounded-lg shadow-lg"
                        style={{
                          background: currentTheme === 'dark' ? '#1f2937' : '#ffffff',
                          border: `1px solid ${currentTheme === 'dark' ? '#374151' : '#e5e7eb'}`,
                        }}
                      >
                        {profileContent}
                      </div>
                    )}
                    placement="bottomRight"
                  >
                    <button
                      type="button"
                      className="border-0 bg-transparent p-0 outline-none cursor-pointer flex items-center justify-center rounded-full transition-transform active:scale-95 shadow-none"
                      aria-label="Mở menu tài khoản"
                    >
                      <Avatar
                        size={isMobile ? 30 : 34}
                        className="bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold shadow-sm shadow-sky-500/30 ring-2 ring-sky-400/50 hover:ring-sky-400 transition-all cursor-pointer text-xs sm:text-sm"
                      >
                        {user.name.charAt(0).toLocaleUpperCase()}
                      </Avatar>
                    </button>
                  </Dropdown>
                )}
              </div>
            </Header>
            {!isMobile && <MultiTabBar />}
          </div>
          <Content
            className="m-2 sm:m-2.5 md:m-3.5 lg:m-6 p-2.5 sm:p-3 md:p-4 lg:p-6 min-h-[280px]"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              marginBottom: isMobile ? 'calc(4rem + max(calc(env(safe-area-inset-bottom, 0px) - 16px), 8px))' : '1.5rem',
            }}
          >
            <TabContentRenderer />
          </Content>
          <Footer className="text-center text-xs text-gray-400 py-3 bg-transparent border-t border-gray-100 dark:border-gray-800/40 hidden md:block">
            Hệ Thống Quản Lý Kho Hải Sản • Hotline: <span className="text-sky-600 font-medium">0965540075</span> • Phát triển: <span className="font-medium text-gray-600 dark:text-gray-300">{'Leo11'}</span>
          </Footer>
        </Layout>
      </Layout>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <MobileBottomNav
          onOpenMenu={() => setDrawerVisible(true)}
          isDrawerOpen={drawerVisible}
          onCloseDrawer={() => setDrawerVisible(false)}
        />
      )}
      <UserProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        tenantName={tenantName}
      />
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
};

export default MainLayout;
