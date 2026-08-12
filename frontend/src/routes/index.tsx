import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { Placeholder } from '../components/Placeholder';
import { LoginPage } from '../pages/auth/LoginPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import { InboundPage } from '../pages/inventory/InboundPage';
import { InboundHistoryPage } from '../pages/inventory/InboundHistoryPage';
import { OutboundPage } from '../pages/inventory/OutboundPage';
import { WastagePage } from '../pages/inventory/WastagePage';
import OutboundHistoryPage from '../pages/inventory/OutboundHistoryPage';
import AlertsPage from '../pages/reports/AlertsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import PackagingPage from '../pages/master-data/PackagingPage';
import PackagingReturnPage from '../pages/inventory/PackagingReturnPage';
import ProductsPage from '../pages/master-data/ProductsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '',
        element: <DashboardPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'inventory',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <Placeholder title="Quản lý kho chi tiết" description="Chức năng đang được phát triển..." />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/inbound',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <InboundPage />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/inbound-history',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <InboundHistoryPage />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/outbound',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <OutboundPage />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/outbound-history',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <OutboundHistoryPage />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/wastage',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <WastagePage />
          </RoleGuard>
        ),
      },
      {
        path: 'inventory/packaging-return',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <PackagingReturnPage />
          </RoleGuard>
        ),
      },
      {
        path: 'alerts',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <AlertsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <ReportsPage />
          </RoleGuard>
        ),
      },
      // Canonical report sub-paths (used by sidebar menu)
      {
        path: 'reports/summary',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <ReportsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'reports/alerts',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <AlertsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'master-data/packaging',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <PackagingPage />
          </RoleGuard>
        ),
      },
      {
        path: 'master-data/products',
        element: (
          <RoleGuard allowedRoles={['Admin', 'Thukho']}>
            <ProductsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <RoleGuard allowedRoles={['Admin']}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <RoleGuard allowedRoles={['Admin']}>
            <Placeholder title="Cài đặt hệ thống" description="Cấu hình hệ thống và phân quyền." />
          </RoleGuard>
        ),
      },
    ],
  },
]);
export default router;
