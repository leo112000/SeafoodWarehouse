import React, { useEffect, useState } from 'react';
import { Avatar, Badge, Button, Divider, Drawer, Dropdown, Layout, Menu, Popconfirm, Popover, Tag, theme } from 'antd';
import { AppstoreOutlined, BarChartOutlined, BellOutlined, DashboardOutlined, DatabaseOutlined, EnvironmentOutlined, FolderOutlined, HistoryOutlined, InboxOutlined, KeyOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MoonOutlined, SafetyCertificateOutlined, SettingOutlined, SunOutlined, TeamOutlined, UserOutlined, QrcodeOutlined, CompassOutlined } from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { usePermission } from '../components/PermissionGuard';
import { UserProfileModal } from '../components/user/UserProfileModal';
import { ChangePasswordModal } from '../components/user/ChangePasswordModal';
import { HandheldScannerModal } from '../components/common/HandheldScannerModal';
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
  const [pdaScannerOpen, setPdaScannerOpen] = useState(false);
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
    ...(canAccessWarehouse ? [{ key: '/inventory-menu', icon: <DatabaseOutlined />, label: 'Quản lý kho', children: [
      { key: '/inventory', label: <Link to="/inventory">Tồn kho hiện tại</Link> },
      { key: '/inventory/map', icon: <CompassOutlined />, label: <Link to="/inventory/map">🗺️ Sơ đồ kho 2D</Link> },
      { key: '/inventory/inbound', label: <Link to="/inventory/inbound">Nhập kho hải sản</Link> },
      { key: '/inventory/outbound', label: <Link to="/inventory/outbound">Xuất kho hải sản</Link> },
      { key: '/inventory/history', label: <Link to="/inventory/history">Lịch sử giao dịch Nhập/Xuất</Link> },
      { key: '/inventory/wastage', label: <Link to="/inventory/wastage">Hao hụt & Phân loại</Link> },
      ...(canViewPackagingReturn ? [{ key: '/inventory/packaging-return', label: <Link to="/inventory/packaging-return">Thu hồi & Giao mượn vỏ sọt</Link> }] : []),
    ] },
    { key: '/master-data', icon: <FolderOutlined />, label: 'Dữ liệu nền', children: [
      ...(canViewCategories ? [{ key: '/master-data/categories', icon: <FolderOutlined />, label: <Link to="/master-data/categories">Nhóm danh mục</Link> }] : []),
      ...(canViewProducts ? [{ key: '/master-data/products', icon: <AppstoreOutlined />, label: <Link to="/master-data/products">Danh mục hải sản</Link> }] : []),
      ...(canAccessWarehouse ? [{ key: '/master-data/warehouses', icon: <EnvironmentOutlined />, label: <Link to="/master-data/warehouses">Danh mục kho bãi</Link> }] : []),
      ...(canViewPackaging ? [{ key: '/master-data/packaging', icon: <InboxOutlined />, label: <Link to="/master-data/packaging">Danh mục bao bì</Link> }] : []),
      { key: '/master-data/partners', icon: <TeamOutlined />, label: <Link to="/master-data/partners">Đối tác (Tàu cá & Khách hàng)</Link> },
    ] },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo & Phân tích', children: [
      { key: '/reports/summary', label: <Link to="/reports/summary">Thống kê tổng hợp</Link> },
      { key: '/reports/alerts', label: <Link to="/reports/alerts">Cảnh báo & Hao hụt</Link> },
    ] }] : []),
    ...((canManageUsers || canManageRoles || canManageSettings || canViewAuditLogs || canManageTenants) ? [{ key: '/system', icon: <SettingOutlined />, label: 'Hệ thống', children: [
      ...(canManageTenants ? [{ key: '/system/tenants', icon: <SettingOutlined />, label: <Link to="/system/tenants">Cửa hàng & Chi nhánh</Link> }] : []),
      ...(canManageUsers ? [{ key: '/system/users', icon: <UserOutlined />, label: <Link to="/system/users">Quản lý nhân viên</Link> }] : []),
      ...(canManageRoles ? [{ key: '/system/roles', icon: <SafetyCertificateOutlined />, label: <Link to="/system/roles">Vai trò & phân quyền</Link> }] : []),
      ...(canViewAuditLogs ? [{ key: '/system/audit-logs', icon: <HistoryOutlined />, label: <Link to="/system/audit-logs">Nhật ký hệ thống</Link> }] : []),
      ...(canManageSettings ? [{ key: '/system/settings', icon: <SettingOutlined />, label: <Link to="/system/settings">Cài đặt</Link> }] : []),
    ] }] : []),
  ];

  const notifications = (
    <div className="w-84 p-1">
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
              className={`p-2.5 rounded-md transition-colors cursor-pointer border-l-4 ${
                !n.isRead ? 'bg-sky-50 dark:bg-gray-800/80 font-medium' : 'bg-gray-50/50 dark:bg-gray-900/40 opacity-75'
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
    <Popconfirm title="Đăng xuất khỏi hệ thống?" description="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?" okText="Đồng ý" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={handleLogout}><Button type="text" danger icon={<LogoutOutlined />} className="w-full text-left" style={{ justifyContent: 'flex-start' }}>Đăng xuất</Button></Popconfirm>
  </div>;

  return (
    <>
      <Layout className="min-h-screen">
        {!isMobile ? (
          <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
            <div className="p-4 text-white text-center font-bold text-lg overflow-hidden whitespace-nowrap">
              {collapsed ? '🚢' : '🚢 KHO HẢI SẢN'}
            </div>
            <Menu
              theme="dark"
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
          </Sider>
        ) : (
          <Drawer
            title="🚢 KHO HẢI SẢN"
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            bodyStyle={{ padding: 0 }}
            width={250}
          >
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
          </Drawer>
        )}
        <Layout>
          <Header
            className="p-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-800"
            style={{ background: colorBgContainer, lineHeight: 'normal' }}
          >
            <Button
              type="text"
              icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => (isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed))}
              className="text-lg w-16 h-16"
            />
            <div className="flex items-center gap-2 sm:gap-3 pr-3 sm:pr-6">
              <Button
                type="primary"
                icon={<QrcodeOutlined />}
                onClick={() => setPdaScannerOpen(true)}
                className="bg-sky-600 font-semibold text-xs h-9 flex items-center shadow-sm"
              >
                <span className="hidden sm:inline">📱 Quét PDA</span>
              </Button>
              <Button
                type="text"
                icon={currentTheme === 'dark' ? <SunOutlined className="text-yellow-400" /> : <MoonOutlined />}
                onClick={toggleTheme}
                className="text-lg flex items-center justify-center w-10 h-10"
                aria-label="Đổi giao diện"
              />
              <Popover content={notifications} trigger="click" placement="bottomRight">
                <Badge count={unreadCount} size="small">
                  <Button
                    type="text"
                    icon={<BellOutlined />}
                    className="text-lg flex items-center justify-center w-10 h-10"
                    aria-label="Thông báo"
                  />
                </Badge>
              </Popover>
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
                    className="flex items-center rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Mở menu tài khoản"
                  >
                    <Avatar className="bg-sky-500">{user.name.charAt(0).toLocaleUpperCase()}</Avatar>
                  </button>
                </Dropdown>
              )}
            </div>
          </Header>
          <Content
            className="m-3 md:m-6 p-4 md:p-6 min-h-[280px]"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
      <UserProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        tenantName={tenantName}
      />
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      <HandheldScannerModal open={pdaScannerOpen} onClose={() => setPdaScannerOpen(false)} />
    </>
  );
};

export default MainLayout;
