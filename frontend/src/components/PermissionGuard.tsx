import React from 'react';
import { Button, Result } from 'antd';
import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { createDefaultRoles, useRoleStore } from '@/stores/useRoleStore';

interface PermissionGuardProps {
  permission: string;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

export const usePermission = (permission: string): boolean => {
  const user = useAuthStore((state) => state.user);
  const tenantName = useAuthStore((state) => state.tenantName);
  const rolesByTenant = useRoleStore((state) => state.rolesByTenant);

  if (!user) return false;

  // Quyền quản lý Cửa hàng & Chi nhánh (Pages.Tenants.Manage) chỉ dành RIÊNG cho Host Super Admin (tenantId == null / undefined)
  if (permission === 'Pages.Tenants.Manage') {
    return (user.tenantId === null || user.tenantId === undefined) && user.roles.includes('Admin');
  }

  if (user.roles.includes('Admin')) return true;

  const tenantRoles = rolesByTenant[tenantName?.trim() || 'Default'] ?? createDefaultRoles();

  return tenantRoles.filter((role) => user.roles.includes(role.name)).some((role) => role.permissions.includes(permission));
};

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ permission, children, fallback = null }) => {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Result status="403" title="403" subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
          extra={<Button type="primary"><Link to="/">Quay lại trang chủ</Link></Button>} />
      </div>
    );
  }
  return children ? <>{children}</> : <Outlet />;
};
