import React from 'react';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import InventoryStockPage from '@/pages/inventory/InventoryStockPage';
import WarehousesPage from '@/pages/master-data/WarehousesPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { InboundPage } from '@/pages/inventory/InboundPage';
import TransactionHistoryPage from '@/pages/inventory/TransactionHistoryPage';
import { OutboundPage } from '@/pages/inventory/OutboundPage';
import { WastagePage } from '@/pages/inventory/WastagePage';
import AlertsPage from '@/pages/reports/AlertsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import PackagingPage from '@/pages/master-data/PackagingPage';
import CategoriesPage from '@/pages/master-data/CategoriesPage';
import PackagingReturnPage from '@/pages/inventory/PackagingReturnPage';
import ProductsPage from '@/pages/master-data/ProductsPage';
import PartnersPage from '@/pages/master-data/PartnersPage';
import RolesPage from '@/pages/admin/RolesPage';
import AuditLogPage from '@/pages/system/AuditLogPage';
import SystemSettingsPage from '@/pages/system/SystemSettingsPage';
import TenantsPage from '@/pages/system/TenantsPage';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useTabStore } from '@/stores/useTabStore';

export const TabContentRenderer: React.FC = () => {
  const { tabs, activeKey } = useTabStore();

  const renderComponentForRoute = (path: string) => {
    switch (path) {
      case '/':
      case '/dashboard':
        return (
          <PermissionGuard permission="Pages.Dashboard.View">
            <DashboardPage />
          </PermissionGuard>
        );

      case '/inventory':
        return (
          <PermissionGuard permission="Pages.Inbound.View">
            <InventoryStockPage />
          </PermissionGuard>
        );

      case '/inventory/inbound':
        return (
          <PermissionGuard permission="Pages.Inbound.Create">
            <InboundPage />
          </PermissionGuard>
        );

      case '/inventory/outbound':
        return (
          <PermissionGuard permission="Pages.Outbound.Create">
            <OutboundPage />
          </PermissionGuard>
        );

      case '/inventory/history':
      case '/inventory/inbound-history':
      case '/inventory/outbound-history':
        return (
          <PermissionGuard permission="Pages.Inbound.View">
            <TransactionHistoryPage />
          </PermissionGuard>
        );

      case '/inventory/wastage':
        return (
          <PermissionGuard permission="Pages.Wastage.Create">
            <WastagePage />
          </PermissionGuard>
        );

      case '/inventory/packaging-return':
        return (
          <PermissionGuard permission="Pages.PackagingReturn.View">
            <PackagingReturnPage />
          </PermissionGuard>
        );

      case '/master-data/categories':
        return (
          <PermissionGuard permission="Pages.Categories.View">
            <CategoriesPage />
          </PermissionGuard>
        );

      case '/master-data/products':
        return (
          <PermissionGuard permission="Pages.Products.View">
            <ProductsPage />
          </PermissionGuard>
        );

      case '/master-data/warehouses':
        return (
          <PermissionGuard permission="Pages.Warehouses.View">
            <WarehousesPage />
          </PermissionGuard>
        );

      case '/master-data/packaging':
        return (
          <PermissionGuard permission="Pages.Packaging.View">
            <PackagingPage />
          </PermissionGuard>
        );

      case '/master-data/partners':
      case '/partners':
        return <PartnersPage />;

      case '/reports':
      case '/reports/summary':
      case '/reports/inventory':
        return (
          <PermissionGuard permission="Pages.Reports.View">
            <ReportsPage />
          </PermissionGuard>
        );

      case '/reports/alerts':
      case '/alerts':
        return (
          <PermissionGuard permission="Pages.Alerts.View">
            <AlertsPage />
          </PermissionGuard>
        );

      case '/system/tenants':
        return (
          <PermissionGuard permission="Pages.Tenants.Manage">
            <TenantsPage />
          </PermissionGuard>
        );

      case '/system/users':
      case '/admin/users':
        return (
          <PermissionGuard permission="Pages.Users.Manage">
            <UsersPage />
          </PermissionGuard>
        );

      case '/system/roles':
      case '/admin/roles':
        return (
          <PermissionGuard permission="Pages.Roles.Manage">
            <RolesPage />
          </PermissionGuard>
        );

      case '/system/audit-logs':
        return (
          <PermissionGuard permission="Pages.AuditLogs.View">
            <AuditLogPage />
          </PermissionGuard>
        );

      case '/system/settings':
      case '/settings':
        return (
          <PermissionGuard permission="Pages.Settings.Manage">
            <SystemSettingsPage />
          </PermissionGuard>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            style={{ display: isActive ? 'block' : 'none' }}
            className="keep-alive-tab-pane"
          >
            {renderComponentForRoute(tab.key)}
          </div>
        );
      })}
    </>
  );
};
export default TabContentRenderer;
