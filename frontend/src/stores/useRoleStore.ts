import { create } from 'zustand';
import type { Permission, Role } from '../types/seafood';
import { roleService } from '../services/roleService';

export const PERMISSION_CATEGORIES = ['Danh mục', 'Kho', 'Báo cáo', 'Hệ thống'] as const;

export const PERMISSIONS: Permission[] = [
  { code: 'Pages.Dashboard.View', displayName: 'Xem bảng điều khiển', category: 'Danh mục' },
  { code: 'Pages.Products.View', displayName: 'Xem danh mục hải sản', category: 'Danh mục' },
  { code: 'Pages.Products.Create', displayName: 'Tạo mới sản phẩm', category: 'Danh mục' },
  { code: 'Pages.Products.Edit', displayName: 'Cập nhật sản phẩm', category: 'Danh mục' },
  { code: 'Pages.Products.Delete', displayName: 'Xóa sản phẩm', category: 'Danh mục' },
  { code: 'Pages.Packaging.View', displayName: 'Xem danh mục bao bì', category: 'Danh mục' },
  { code: 'Pages.Packaging.Create', displayName: 'Tạo mới bao bì', category: 'Danh mục' },
  { code: 'Pages.Packaging.Edit', displayName: 'Cập nhật bao bì', category: 'Danh mục' },
  { code: 'Pages.Packaging.Delete', displayName: 'Xóa bao bì', category: 'Danh mục' },
  { code: 'Pages.Categories.View', displayName: 'Xem nhóm danh mục', category: 'Danh mục' },
  { code: 'Pages.Categories.Create', displayName: 'Tạo mới danh mục', category: 'Danh mục' },
  { code: 'Pages.Categories.Edit', displayName: 'Cập nhật danh mục', category: 'Danh mục' },
  { code: 'Pages.Categories.Delete', displayName: 'Xóa danh mục', category: 'Danh mục' },
  { code: 'Pages.Warehouses.View', displayName: 'Xem danh sách kho', category: 'Danh mục' },
  { code: 'Pages.Warehouses.Create', displayName: 'Tạo mới kho', category: 'Danh mục' },
  { code: 'Pages.Warehouses.Edit', displayName: 'Cập nhật kho', category: 'Danh mục' },
  { code: 'Pages.Warehouses.Delete', displayName: 'Xóa kho', category: 'Danh mục' },
  { code: 'Pages.Inbound.Create', displayName: 'Lập phiếu nhập kho', category: 'Kho' },
  { code: 'Pages.Inbound.View', displayName: 'Xem lịch sử nhập kho', category: 'Kho' },
  { code: 'Pages.Outbound.Create', displayName: 'Lập phiếu xuất kho', category: 'Kho' },
  { code: 'Pages.Outbound.View', displayName: 'Xem lịch sử xuất kho', category: 'Kho' },
  { code: 'Pages.Wastage.Create', displayName: 'Ghi nhận hao hụt', category: 'Kho' },
  { code: 'Pages.Wastage.View', displayName: 'Xem hao hụt & phân loại', category: 'Kho' },
  { code: 'Pages.PackagingReturn.Create', displayName: 'Lập phiếu thu hồi bao bì', category: 'Kho' },
  { code: 'Pages.PackagingReturn.View', displayName: 'Xem phiếu thu hồi bao bì', category: 'Kho' },
  { code: 'Pages.Reports.View', displayName: 'Xem báo cáo tổng hợp', category: 'Báo cáo' },
  { code: 'Pages.Alerts.View', displayName: 'Xem cảnh báo & hao hụt', category: 'Báo cáo' },
  { code: 'Pages.Users.Manage', displayName: 'Quản lý nhân viên', category: 'Hệ thống' },
  { code: 'Pages.Roles.Manage', displayName: 'Quản lý vai trò & phân quyền', category: 'Hệ thống' },
  { code: 'Pages.Settings.Manage', displayName: 'Cấu hình hệ thống', category: 'Hệ thống' },
  { code: 'Pages.Tenants.Manage', displayName: 'Quản lý cửa hàng & chi nhánh', category: 'Hệ thống' },
  { code: 'Pages.AuditLogs.View', displayName: 'Xem nhật ký hệ thống', category: 'Hệ thống' },
];

const allPermissionCodes = PERMISSIONS.map((permission) => permission.code);

export const createDefaultRoles = (): Role[] => [
  { id: '1', name: 'Admin', description: 'Toàn quyền quản trị hệ thống.', isSystemDefault: true, permissions: allPermissionCodes },
  {
    id: '2', name: 'Thukho', description: 'Thực hiện nghiệp vụ nhập, xuất và kiểm kê kho.', isSystemDefault: true,
    permissions: PERMISSIONS.filter((permission) => permission.category !== 'Hệ thống').map((permission) => permission.code),
  },
  {
    id: '3', name: 'Nhanvien', description: 'Nhân viên có quyền xem bảng điều khiển.', isSystemDefault: true,
    permissions: ['Pages.Dashboard.View'],
  },
];

const tenantKey = (tenantName?: string | null) => tenantName?.trim() || 'Default';

interface RoleState {
  rolesByTenant: Record<string, Role[]>;
  loading: boolean;
  fetchRoles: () => Promise<void>;
  ensureTenant: (tenantName?: string | null) => void;
  addRole: (tenantName: string | null | undefined, role: Omit<Role, 'id'>) => Promise<void>;
  updateRole: (tenantName: string | null | undefined, id: string, role: Omit<Role, 'id' | 'isSystemDefault'>) => Promise<void>;
  deleteRole: (tenantName: string | null | undefined, id: string) => Promise<void>;
}

export const useRoleStore = create<RoleState>((set) => ({
  rolesByTenant: { Default: createDefaultRoles() },
  loading: false,

  fetchRoles: async () => {
    set({ loading: true });
    try {
      const apiRoles = await roleService.getAll();
      if (apiRoles && apiRoles.length > 0) {
        set({ rolesByTenant: { Default: apiRoles } });
      }
    } catch {
      // Fallback on error
    } finally {
      set({ loading: false });
    }
  },

  ensureTenant: (tenantName) => set((state) => {
    const key = tenantKey(tenantName);
    return state.rolesByTenant[key] ? state : { rolesByTenant: { ...state.rolesByTenant, [key]: createDefaultRoles() } };
  }),

  addRole: async (tenantName, roleData) => {
    const key = tenantKey(tenantName);
    let created: Role | null = null;
    try {
      created = await roleService.create({
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
      });
    } catch {
      // Offline fallback
    }

    set((state) => {
      const roles = state.rolesByTenant[key] ?? createDefaultRoles();
      const newRole: Role = created || { ...roleData, id: `role-${Date.now()}` };
      return { rolesByTenant: { ...state.rolesByTenant, [key]: [...roles, newRole] } };
    });
  },

  updateRole: async (tenantName, id, roleData) => {
    const key = tenantKey(tenantName);
    try {
      await roleService.update(id, {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions,
      });
    } catch {
      // Continue updating local store
    }

    set((state) => {
      const roles = state.rolesByTenant[key] ?? createDefaultRoles();
      return {
        rolesByTenant: {
          ...state.rolesByTenant,
          [key]: roles.map((current) => (current.id === id ? { ...current, ...roleData } : current)),
        },
      };
    });
  },

  deleteRole: async (tenantName, id) => {
    const key = tenantKey(tenantName);
    try {
      await roleService.delete(id);
    } catch {
      // Continue local delete
    }

    set((state) => {
      const roles = state.rolesByTenant[key] ?? createDefaultRoles();
      return { rolesByTenant: { ...state.rolesByTenant, [key]: roles.filter((role) => role.id !== id) } };
    });
  },
}));

export const getPermissionsForRoles = (roles: readonly string[], tenantName?: string | null): string[] => {
  const rolesByTenant = useRoleStore.getState().rolesByTenant;
  const tenantRoles = rolesByTenant[tenantKey(tenantName)] ?? createDefaultRoles();
  return [...new Set(tenantRoles.filter((role) => roles.includes(role.name)).flatMap((role) => role.permissions))];
};
