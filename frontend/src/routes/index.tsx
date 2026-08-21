import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { Placeholder } from '../components/Placeholder';
import { LoginPage } from '../pages/auth/LoginPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PermissionGuard } from '../components/PermissionGuard';
import { InboundPage } from '../pages/inventory/InboundPage';
import { InboundHistoryPage } from '../pages/inventory/InboundHistoryPage';
import { OutboundPage } from '../pages/inventory/OutboundPage';
import { WastagePage } from '../pages/inventory/WastagePage';
import OutboundHistoryPage from '../pages/inventory/OutboundHistoryPage';
import AlertsPage from '../pages/reports/AlertsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import PackagingPage from '../pages/master-data/PackagingPage';
import CategoriesPage from '../pages/master-data/CategoriesPage';
import PackagingReturnPage from '../pages/inventory/PackagingReturnPage';
import ProductsPage from '../pages/master-data/ProductsPage';
import RolesPage from '../pages/admin/RolesPage';
import AuditLogPage from '../pages/system/AuditLogPage';
import SystemSettingsPage from '../pages/system/SystemSettingsPage';

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
        element: <PermissionGuard permission="Pages.Dashboard.View"><DashboardPage /></PermissionGuard>,
      },
      {
        path: 'dashboard',
        element: <PermissionGuard permission="Pages.Dashboard.View"><DashboardPage /></PermissionGuard>,
      },
      {
        path: 'inventory',
        element: (
          <PermissionGuard permission="Pages.Inbound.View">
            <Placeholder title="Quản lý kho chi tiết" description="Chức năng đang được phát triển..." />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/inbound',
        element: (
          <PermissionGuard permission="Pages.Inbound.Create">
            <InboundPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/inbound-history',
        element: (
          <PermissionGuard permission="Pages.Inbound.View">
            <InboundHistoryPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/outbound',
        element: (
          <PermissionGuard permission="Pages.Outbound.Create">
            <OutboundPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/outbound-history',
        element: (
          <PermissionGuard permission="Pages.Outbound.View">
            <OutboundHistoryPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/packaging-loan',
        element: (
          <PermissionGuard permission="Pages.Packaging.Loan">
            <Placeholder title="Mượn bao bì" description="Chức năng đang được phát triển..." />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/packaging-return',
        element: (
          <PermissionGuard permission="Pages.PackagingReturn.View">
            <PackagingReturnPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory/wastage',
        element: (
          <PermissionGuard permission="Pages.Wastage.Create">
            <WastagePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reports/summary',
        element: (
          <PermissionGuard permission="Pages.Reports.View">
            <ReportsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reports/inventory',
        element: (
          <PermissionGuard permission="Pages.Reports.View">
            <ReportsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reports/alerts',
        element: (
          <PermissionGuard permission="Pages.Alerts.View">
            <AlertsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <PermissionGuard permission="Pages.Reports.View">
            <ReportsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'alerts',
        element: (
          <PermissionGuard permission="Pages.Alerts.View">
            <AlertsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'master-data/categories',
        element: (
          <PermissionGuard permission="Pages.Categories.View">
            <CategoriesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'master-data/warehouses',
        element: (
          <PermissionGuard permission="Pages.Warehouses.View">
            <Placeholder title="Danh mục kho bãi" description="Chức năng đang được phát triển..." />
          </PermissionGuard>
        ),
      },
      {
        path: 'master-data/packaging',
        element: (
          <PermissionGuard permission="Pages.Packaging.View">
            <PackagingPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'master-data/products',
        element: (
          <PermissionGuard permission="Pages.Products.View">
            <ProductsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <PermissionGuard permission="Pages.Users.Manage">
            <UsersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/users',
        element: <PermissionGuard permission="Pages.Users.Manage"><UsersPage /></PermissionGuard>,
      },
      {
        path: 'admin/roles',
        element: (
          <PermissionGuard permission="Pages.Roles.Manage">
            <RolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/roles',
        element: <PermissionGuard permission="Pages.Roles.Manage"><RolesPage /></PermissionGuard>,
      },
      {
        path: 'settings',
        element: (
          <PermissionGuard permission="Pages.Settings.Manage">
            <SystemSettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/settings',
        element: <PermissionGuard permission="Pages.Settings.Manage"><SystemSettingsPage /></PermissionGuard>,
      },
      {
        path: 'system/audit-logs',
        element: <PermissionGuard permission="Pages.AuditLogs.View"><AuditLogPage /></PermissionGuard>,
      },
    ],
  },
]);
export default router;
