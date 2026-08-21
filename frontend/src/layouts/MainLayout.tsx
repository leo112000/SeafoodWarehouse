import React, { useEffect, useState } from 'react';
import { Avatar, Badge, Button, Divider, Drawer, Dropdown, Layout, Menu, Popconfirm, Popover, Tag, theme } from 'antd';
import { AppstoreOutlined, BarChartOutlined, BellOutlined, DashboardOutlined, DatabaseOutlined, FolderOutlined, HistoryOutlined, InboxOutlined, KeyOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MoonOutlined, SafetyCertificateOutlined, SettingOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { usePermission } from '../components/PermissionGuard';
import { UserProfileModal } from '../components/user/UserProfileModal';
import { ChangePasswordModal } from '../components/user/ChangePasswordModal';
import { useSystemNotifications } from '../hooks/useSystemNotifications';

const { Header, Sider, Content } = Layout;

const roleMeta = (role: string) => role === 'Admin' ? { label: 'Admin', color: 'blue' } : role === 'Thukho' ? { label: 'Thủ kho', color: 'orange' } : { label: 'Nhân viên', color: 'green' };

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
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
  const canManageSettings = usePermission('Pages.Settings.Manage');
  const canManageRoles = usePermission('Pages.Roles.Manage');
  const canViewAuditLogs = usePermission('Pages.AuditLogs.View');
  const canAccessWarehouse = canCreateInbound || canViewInbound || canCreateOutbound || canViewOutbound || canCreateWastage || canViewProducts || canViewPackaging || canViewCategories || canViewReports;

  // Real-time system notifications from database
  const { notifications: systemNotifications, unreadCount } = useSystemNotifications();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => { setDrawerVisible(false); }, [location.pathname]);

  const handleLogout = () => { setProfileOpen(false); logout(); navigate('/login', { replace: true }); };
  const openProfile = () => { setProfileOpen(false); setProfileModalOpen(true); };
  const openChangePassword = () => { setProfileOpen(false); setChangePasswordOpen(true); };
  const openAuditLogs = () => { setProfileOpen(false); navigate('/system/audit-logs'); };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Bảng điều khiển</Link> },
    ...(canAccessWarehouse ? [{ key: '/inventory', icon: <DatabaseOutlined />, label: 'Quản lý kho', children: [
      { key: '/inventory/inbound', label: <Link to="/inventory/inbound">Nhập kho hải sản</Link> },
      { key: '/inventory/inbound-history', label: <Link to="/inventory/inbound-history">Lịch sử nhập kho</Link> },
      { key: '/inventory/outbound', label: <Link to="/inventory/outbound">Xuất kho hải sản</Link> },
      { key: '/inventory/outbound-history', label: <Link to="/inventory/outbound-history">Lịch sử xuất kho</Link> },
      { key: '/inventory/wastage', label: <Link to="/inventory/wastage">Hao hụt & Phân loại</Link> },
      ...(canViewPackagingReturn ? [{ key: '/inventory/packaging-return', label: <Link to="/inventory/packaging-return">Thu hồi & Giao mượn vỏ sọt</Link> }] : []),
    ] },
    { key: '/master-data', icon: <FolderOutlined />, label: 'Dữ liệu nền', children: [
      ...(canViewCategories ? [{ key: '/master-data/categories', icon: <FolderOutlined />, label: <Link to="/master-data/categories">Nhóm danh mục</Link> }] : []),
      ...(canViewProducts ? [{ key: '/master-data/products', icon: <AppstoreOutlined />, label: <Link to="/master-data/products">Danh mục hải sản</Link> }] : []),
      ...(canViewPackaging ? [{ key: '/master-data/packaging', icon: <InboxOutlined />, label: <Link to="/master-data/packaging">Danh mục bao bì</Link> }] : []),
    ] },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo & Phân tích', children: [
      { key: '/reports/summary', label: <Link to="/reports/summary">Thống kê tổng hợp</Link> },
      { key: '/reports/alerts', label: <Link to="/reports/alerts">Cảnh báo & Hao hụt</Link> },
    ] }] : []),
    ...((canManageUsers || canManageRoles || canManageSettings || canViewAuditLogs) ? [{ key: '/system', icon: <SettingOutlined />, label: 'Hệ thống', children: [
      ...(canManageUsers ? [{ key: '/system/users', icon: <UserOutlined />, label: <Link to="/system/users">Quản lý nhân viên</Link> }] : []),
      ...(canManageRoles ? [{ key: '/system/roles', icon: <SafetyCertificateOutlined />, label: <Link to="/system/roles">Vai trò & phân quyền</Link> }] : []),
      ...(canViewAuditLogs ? [{ key: '/system/audit-logs', icon: <HistoryOutlined />, label: <Link to="/system/audit-logs">Nhật ký hệ thống</Link> }] : []),
      ...(canManageSettings ? [{ key: '/system/settings', icon: <SettingOutlined />, label: <Link to="/system/settings">Cài đặt</Link> }] : []),
    ] }] : []),
  ];

  const notifications = (
    <div className="w-80 p-1">
      <div className="flex items-center justify-between mb-3 border-b pb-2">
        <strong className="text-gray-800 dark:text-gray-100">Thông báo kho hàng</strong>
        <Tag color="blue" className="m-0 font-medium">{unreadCount} cảnh báo</Tag>
      </div>
      <div className="space-y-3 text-sm max-h-80 overflow-y-auto">
        {systemNotifications.map((n) => (
          <div
            key={n.id}
            className="p-2 rounded-md hover:bg-sky-50 dark:hover:bg-gray-800 transition-colors cursor-pointer border-l-2"
            style={{
              borderColor: n.severity === 'error' ? '#ef4444' : n.severity === 'warning' ? '#f59e0b' : '#10b981',
            }}
            onClick={() => n.link && navigate(n.link)}
          >
            <div className="flex items-center justify-between">
              <strong className="block text-gray-800 dark:text-gray-200 text-xs font-semibold">{n.title}</strong>
              <span className="text-[10px] text-gray-400">{n.timeText}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 mb-0 line-clamp-2">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
  const profileContent = user && <div className="w-64 p-1" style={{ textAlign: 'left' }}>
    <div className="flex items-center gap-3 px-2 py-2"><Avatar size={48} className="bg-sky-500">{user.name.charAt(0).toLocaleUpperCase()}</Avatar><div className="min-w-0"><div className="font-semibold truncate">{user.name}</div><div className="text-xs text-gray-500 truncate">{user.email}</div><div className="mt-1 flex flex-wrap gap-1">{user.roles.map((role) => { const meta = roleMeta(role); return <Tag key={role} color={meta.color} className="m-0">{meta.label}</Tag>; })}</div></div></div>
    <div className="px-2 text-xs text-gray-500">Kho / Tenant: <span className="font-medium text-gray-700 dark:text-gray-200">{tenantName || 'Kho Lạnh Cảng Cá'}</span></div>
    <Divider className="my-3" />
    <div className="flex flex-col"><Button type="text" icon={<UserOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openProfile}>Thông tin cá nhân</Button><Button type="text" icon={<KeyOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openChangePassword}>Đổi mật khẩu</Button><Button type="text" icon={<HistoryOutlined />} className="text-left" style={{ justifyContent: 'flex-start' }} onClick={openAuditLogs}>Nhật ký cá nhân</Button></div>
    <Divider className="my-3" />
    <Popconfirm title="Đăng xuất khỏi hệ thống?" description="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?" okText="Đồng ý" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={handleLogout}><Button type="text" danger icon={<LogoutOutlined />} className="w-full text-left" style={{ justifyContent: 'flex-start' }}>Đăng xuất</Button></Popconfirm>
  </div>;

  return <><Layout className="min-h-screen">
    {!isMobile ? <Sider trigger={null} collapsible collapsed={collapsed} theme="dark"><div className="p-4 text-white text-center font-bold text-lg overflow-hidden whitespace-nowrap">{collapsed ? '🚢' : '🚢 KHO HẢI SẢN'}</div><Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} defaultOpenKeys={location.pathname.startsWith('/master-data') ? ['/master-data'] : location.pathname.startsWith('/reports') ? ['/reports'] : location.pathname.startsWith('/system') ? ['/system'] : []} items={menuItems} /></Sider> : <Drawer title="🚢 KHO HẢI SẢN" placement="left" onClose={() => setDrawerVisible(false)} open={drawerVisible} bodyStyle={{ padding: 0 }} width={250}><Menu theme="light" mode="inline" selectedKeys={[location.pathname]} defaultOpenKeys={location.pathname.startsWith('/master-data') ? ['/master-data'] : location.pathname.startsWith('/reports') ? ['/reports'] : location.pathname.startsWith('/system') ? ['/system'] : []} items={menuItems} /></Drawer>}
    <Layout><Header className="p-0 flex items-center justify-between" style={{ background: colorBgContainer, lineHeight: 'normal' }}><Button type="text" icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)} className="text-lg w-16 h-16" />
      <div className="flex items-center gap-2 sm:gap-3 pr-3 sm:pr-6"><Button type="text" icon={currentTheme === 'dark' ? <SunOutlined className="text-yellow-400" /> : <MoonOutlined />} onClick={toggleTheme} className="text-lg flex items-center justify-center w-10 h-10" aria-label="Đổi giao diện" /><Popover content={notifications} trigger="click" placement="bottomRight"><Badge count={unreadCount} size="small"><Button type="text" icon={<BellOutlined />} className="text-lg flex items-center justify-center w-10 h-10" aria-label="Thông báo" /></Badge></Popover>
        {user && <Dropdown trigger={['click']} open={profileOpen} onOpenChange={setProfileOpen} popupRender={() => <div className="rounded-lg shadow-lg" style={{ background: currentTheme === 'dark' ? '#1f2937' : '#f0f9ff', border: `1px solid ${currentTheme === 'dark' ? '#374151' : '#bae6fd'}` }}>{profileContent}</div>} placement="bottomRight"><button type="button" className="flex items-center rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Mở menu tài khoản"><Avatar className="bg-sky-500">{user.name.charAt(0).toLocaleUpperCase()}</Avatar></button></Dropdown>}
      </div></Header><Content className="m-3 md:m-6 p-4 md:p-6 min-h-[280px]" style={{ background: colorBgContainer, borderRadius: borderRadiusLG }}><Outlet /></Content></Layout>
  </Layout><UserProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={user} tenantName={tenantName} /><ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} /></>;
};

export default MainLayout;
