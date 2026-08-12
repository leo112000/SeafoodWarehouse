import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Tag, Space } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  AlertOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  LogoutOutlined,
  InboxOutlined,
  AppstoreOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const currentTheme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Define dynamic menu items based on user roles
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">Bảng điều khiển</Link>,
    },
    ...(user?.roles.some((r) => r === 'Admin' || r === 'Thukho')
      ? [
          {
            key: '/inventory',
            icon: <DatabaseOutlined />,
            label: 'Quản lý kho',
            children: [
              {
                key: '/inventory/inbound',
                label: <Link to="/inventory/inbound">Nhập kho hải sản</Link>,
              },
              {
                key: '/inventory/inbound-history',
                label: <Link to="/inventory/inbound-history">Lịch sử nhập kho</Link>,
              },
              {
                key: '/inventory/outbound',
                label: <Link to="/inventory/outbound">Xuất kho hải sản</Link>,
              },
              {
                key: '/inventory/outbound-history',
                label: <Link to="/inventory/outbound-history">Lịch sử xuất kho</Link>,
              },
              {
                key: '/inventory/wastage',
                label: <Link to="/inventory/wastage">Hao hụt & Phân loại</Link>,
              },
            ],
          },
          {
            key: '/master-data/packaging',
            icon: <InboxOutlined />,
            label: <Link to="/master-data/packaging">Danh mục bao bì</Link>,
          },
          {
            key: '/master-data/products',
            icon: <AppstoreOutlined />,
            label: <Link to="/master-data/products">Danh mục hải sản</Link>,
          },
          {
            key: '/reports',
            icon: <BarChartOutlined />,
            label: 'Báo Cáo & Phân Tích',
            children: [
              {
                key: '/reports/summary',
                label: <Link to="/reports/summary">Thống kê Tổng hợp</Link>,
              },
              {
                key: '/reports/alerts',
                label: <Link to="/reports/alerts">Cảnh báo & Hao hụt</Link>,
              },
            ],
          },
        ]
      : []),
    ...(user?.roles.includes('Admin')
      ? [
          {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: <Link to="/admin/users">Quản lý nhân viên</Link>,
          },
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: <Link to="/settings">Cài đặt</Link>,
          },
        ]
      : []),
  ];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'Admin':
        return { label: 'Admin', color: 'blue' };
      case 'Thukho':
        return { label: 'Thủ kho', color: 'orange' };
      default:
        return { label: 'Nhân viên', color: 'green' };
    }
  };

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div className="p-4 text-white text-center font-bold text-lg overflow-hidden whitespace-nowrap">
          {collapsed ? '🚢' : '🚢 KHO HẢI SẢN'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={location.pathname.startsWith('/reports') ? ['/reports'] : []}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="p-0 flex items-center justify-between" style={{ background: colorBgContainer }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg w-16 h-16"
          />
          <div className="flex items-center gap-4 pr-6">
            <Button
              type="text"
              icon={currentTheme === 'dark' ? <SunOutlined className="text-yellow-400" /> : <MoonOutlined />}
              onClick={toggleTheme}
              className="text-lg flex items-center justify-center w-10 h-10"
            />
            {user && (
              <div className="flex items-center gap-4 border-l border-gray-200 dark:border-gray-700 pl-4">
                <Space direction="vertical" size={0} className="text-right">
                  <span className={`font-semibold text-sm leading-tight block ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                    {user.name}
                  </span>
                  <Space size={4}>
                    {user.roles.map((role) => {
                      const { label, color } = getRoleLabel(role);
                      return (
                        <Tag color={color} key={role} style={{ margin: 0 }} className="text-[10px] py-0 px-1 font-medium">
                          {label}
                        </Tag>
                      );
                    })}
                  </Space>
                </Space>
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  className="flex items-center justify-center w-10 h-10 hover:bg-red-50 dark:hover:bg-red-950"
                  title="Đăng xuất"
                />
              </div>
            )}
          </div>
        </Header>
        <Content
          className="m-6 p-6 min-h-[280px]"
          style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
export default MainLayout;
