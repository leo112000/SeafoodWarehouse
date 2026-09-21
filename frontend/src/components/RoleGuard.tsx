import React from 'react';
import { Result, Button } from 'antd';
import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import type { UserInfo } from '@/stores/useAuthStore';

interface RoleGuardProps {
  allowedRoles: UserInfo['roles'];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const user = useAuthStore((state) => state.user);

  const hasRole = user?.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Result
          status="403"
          title="403"
          subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
          extra={
            <Button type="primary">
              <Link to="/">Quay lại trang chủ</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
