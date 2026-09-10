import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  SwapOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ExportOutlined,
  WarningOutlined,
  HistoryOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  FolderOutlined,
  SafetyCertificateOutlined,
  CloseOutlined,
  AlertOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { Popover, Modal } from 'antd';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePermission } from '../PermissionGuard';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenMenu,
  isDrawerOpen = false,
  onCloseDrawer,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTheme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);
  const isDark = currentTheme === 'dark';
  const [tradePopoverOpen, setTradePopoverOpen] = useState(false);
  const [reportsPopoverOpen, setReportsPopoverOpen] = useState(false);
  const [appsModalOpen, setAppsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Quyền truy cập để ẩn hiện menu tương ứng
  const canViewProducts = usePermission('Pages.Products.View');
  const canViewWarehouses = usePermission('Pages.Warehouses.View');
  const canViewPackaging = usePermission('Pages.Packaging.View');
  const canViewCategories = usePermission('Pages.Categories.View');
  const canManageUsers = usePermission('Pages.Users.Manage');
  const canManageRoles = usePermission('Pages.Roles.Manage');
  const canManageSettings = usePermission('Pages.Settings.Manage');
  const canManageTenants = (user?.tenantId === null || user?.tenantId === undefined) && (user?.roles?.includes('Admin') ?? false);

  const pathname = location.pathname;

  // Tự động hiện lại và đóng các popup/modal khi đổi trang
  useEffect(() => {
    setIsVisible(true);
    setAppsModalOpen(false);
    setTradePopoverOpen(false);
    setReportsPopoverOpen(false);
    lastScrollY.current = typeof window !== 'undefined'
      ? (window.scrollY || document.documentElement?.scrollTop || 0)
      : 0;
  }, [pathname]);

  // Lắng nghe scroll để ẩn/hiện mượt mà giống Facebook
  useEffect(() => {
    const threshold = 12; // Ngưỡng cuộn tối thiểu (px) để tránh giật khi chạm nhẹ
    const minScrollToShow = 40; // Gần đỉnh trang luôn hiển thị

    const handleScroll = () => {
      if (ticking.current) return;

      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY || document.documentElement?.scrollTop || document.body?.scrollTop || 0;
        const diff = currentScrollY - lastScrollY.current;

        // Nếu modal hoặc popover đang mở hoặc Drawer đang mở thì luôn giữ hiện thanh
        if (tradePopoverOpen || reportsPopoverOpen || appsModalOpen || isDrawerOpen) {
          setIsVisible(true);
          lastScrollY.current = currentScrollY;
          ticking.current = false;
          return;
        }

        if (currentScrollY <= minScrollToShow) {
          // Khi ở gần đỉnh trang, luôn hiện
          setIsVisible(true);
        } else if (diff > threshold) {
          // Lướt xuống (Scroll Down) -> Ẩn thanh đi giải phóng không gian
          setIsVisible(false);
        } else if (diff < -threshold) {
          // Vuốt lên (Scroll Up) -> Hiện thanh lại
          setIsVisible(true);
        }

        lastScrollY.current = Math.max(0, currentScrollY);
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tradePopoverOpen, reportsPopoverOpen, appsModalOpen, isDrawerOpen]);

  // Trạng thái active của các nút
  const isHomeActive = pathname === '/' || pathname === '/dashboard';
  const isInventoryActive = pathname === '/inventory';
  const isTradeActive = pathname.includes('/inbound') || pathname.includes('/outbound') || pathname.includes('/history') || pathname.includes('/wastage') || pathname.includes('/packaging-return');
  const isReportsActive = pathname.startsWith('/reports');
  const isOtherActive = !isHomeActive && !isInventoryActive && !isTradeActive && !isReportsActive;

  // Popup danh sách thao tác Nhập/Xuất tròn trịa
  const tradeMenuContent = (
    <div className="w-68 p-1.5 space-y-1.5">
      <div className="text-[11px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
        Tác nghiệp Kho Hải Sản
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setTradePopoverOpen(false);
            onCloseDrawer?.();
            navigate('/inventory/inbound');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all active:scale-98 border border-emerald-100/60 dark:border-emerald-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <InboxOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Nhập kho hải sản</div>
            <div className="text-[10px] text-gray-400">Tạo lô hàng nhập từ ghe/tàu</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTradePopoverOpen(false);
            onCloseDrawer?.();
            navigate('/inventory/outbound');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-98 border border-amber-100/60 dark:border-amber-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <ExportOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Xuất kho hải sản</div>
            <div className="text-[10px] text-gray-400">Xuất bán đại lý & đối tác</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTradePopoverOpen(false);
            onCloseDrawer?.();
            navigate('/inventory/history');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all active:scale-98 border border-sky-100/60 dark:border-sky-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
            <HistoryOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Lịch sử Nhập / Xuất</div>
            <div className="text-[10px] text-gray-400">Xem tất cả phiếu giao dịch</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTradePopoverOpen(false);
            onCloseDrawer?.();
            navigate('/inventory/wastage');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-98 border border-rose-100/60 dark:border-rose-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
            <WarningOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Hao hụt & Phân loại</div>
            <div className="text-[10px] text-gray-400">Báo cáo hao hụt & chuyển loại</div>
          </div>
        </button>
      </div>
    </div>
  );

  // Popup danh sách thao tác Báo cáo & Thống kê tròn trịa
  const reportsMenuContent = (
    <div className="w-68 p-1.5 space-y-1.5">
      <div className="text-[11px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
        Báo Cáo & Phân Tích
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setReportsPopoverOpen(false);
            onCloseDrawer?.();
            navigate('/reports/summary');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all active:scale-98 border border-purple-100/60 dark:border-purple-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
            <BarChartOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Báo cáo tổng hợp</div>
            <div className="text-[10px] text-gray-400">Thống kê doanh thu & xuất nhập</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setReportsPopoverOpen(false);
            onCloseDrawer?.();
            navigate('/reports/alerts');
          }}
          className="flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-98 border border-amber-100/60 dark:border-amber-900/40"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <AlertOutlined className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-100">Hệ thống cảnh báo</div>
            <div className="text-[10px] text-gray-400">Hạn dùng & tồn an toàn</div>
          </div>
        </button>
      </div>
    </div>
  );

  // Danh sách các mục ứng dụng khác (Hiển thị dạng lưới tròn trịa App Launcher)
  const allModules = [
    {
      title: 'Danh mục hải sản',
      desc: 'Sản phẩm & đơn giá',
      path: '/master-data/products',
      icon: <AppstoreOutlined className="text-xl" />,
      color: 'from-sky-500 to-blue-600',
      visible: canViewProducts,
    },
    {
      title: 'Danh mục kho bãi',
      desc: 'Quản lý kho lạnh & bể',
      path: '/master-data/warehouses',
      icon: <EnvironmentOutlined className="text-xl" />,
      color: 'from-emerald-500 to-teal-600',
      visible: canViewWarehouses,
    },
    {
      title: 'Nhà Cung Cấp',
      desc: 'Tàu cá & vựa hải sản',
      path: '/master-data/partners',
      icon: <TeamOutlined className="text-xl" />,
      color: 'from-indigo-500 to-blue-500',
      visible: true,
    },
    {
      title: 'Danh mục bao bì',
      desc: 'Sọt nhựa & mượn trả',
      path: '/master-data/packaging',
      icon: <FolderOutlined className="text-xl" />,
      color: 'from-orange-500 to-amber-600',
      visible: canViewPackaging,
    },
    {
      title: 'Nhóm danh mục',
      desc: 'Phân loại nhóm hải sản',
      path: '/master-data/categories',
      icon: <FolderOutlined className="text-xl" />,
      color: 'from-cyan-500 to-blue-500',
      visible: canViewCategories,
    },
    {
      title: 'Quản lý nhân viên',
      desc: 'Tài khoản & người dùng',
      path: '/system/users',
      icon: <TeamOutlined className="text-xl" />,
      color: 'from-blue-600 to-indigo-700',
      visible: canManageUsers,
    },
    {
      title: 'Vai trò & Phân quyền',
      desc: 'Thiết lập quyền hạn',
      path: '/system/roles',
      icon: <SafetyCertificateOutlined className="text-xl" />,
      color: 'from-pink-500 to-rose-600',
      visible: canManageRoles,
    },
    {
      title: 'Chi nhánh / Tenant',
      desc: 'Hệ thống chuỗi chi nhánh',
      path: '/system/tenants',
      icon: <ShopOutlined className="text-xl" />,
      color: 'from-teal-500 to-emerald-600',
      visible: canManageTenants,
    },
    {
      title: 'Cài đặt hệ thống',
      desc: 'Thông tin kho & cấu hình',
      path: '/system/settings',
      icon: <SettingOutlined className="text-xl" />,
      color: 'from-slate-600 to-gray-800',
      visible: canManageSettings,
    },
  ].filter((item) => item.visible);

  return (
    <>
      {/* Floating Capsule Bottom Dock (Thanh điều hướng nổi bo tròn - Chuyển sang dọc ở góc phải khi Drawer mở) */}
      <nav
        className={`md:hidden fixed z-[9999] select-none transition-all duration-300 ease-in-out ${
          isDrawerOpen
            ? 'bottom-4 right-2.5 inset-x-auto flex flex-col items-end'
            : 'bottom-4 inset-x-0 flex justify-center items-center'
        } ${
          isVisible || isDrawerOpen
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          willChange: 'transform, opacity',
        }}
      >
        <div
          className={`flex items-center justify-center rounded-full border backdrop-blur-2xl transition-all duration-300 ring-1 ${
            isDrawerOpen
              ? 'flex-col py-2 px-1.5 gap-1.5 w-[52px] shadow-[0_20px_50px_rgba(0,0,0,0.28)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
              : 'flex-row h-[58px] px-4 sm:px-5 gap-2 sm:gap-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]'
          } ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-gray-400 ring-white/5'
              : 'bg-white/96 border-slate-200/90 text-gray-500 shadow-slate-900/12 ring-black/[0.04]'
          }`}
        >
          {/* 1. Trang chủ / Tổng quan */}
          <button
            type="button"
            onClick={() => {
              setTradePopoverOpen(false);
              setReportsPopoverOpen(false);
              setAppsModalOpen(false);
              onCloseDrawer?.();
              navigate('/');
            }}
            title="Tổng quan"
            aria-label="Tổng quan"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-0 outline-none transition-all duration-250 active:scale-90 ${
              isHomeActive && !appsModalOpen
                ? 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/40 scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <DashboardOutlined className="text-xl" />
          </button>

          {/* 2. Tồn kho */}
          <button
            type="button"
            onClick={() => {
              setTradePopoverOpen(false);
              setReportsPopoverOpen(false);
              setAppsModalOpen(false);
              onCloseDrawer?.();
              navigate('/inventory');
            }}
            title="Tồn kho"
            aria-label="Tồn kho"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-0 outline-none transition-all duration-250 active:scale-90 ${
              isInventoryActive && !appsModalOpen
                ? 'bg-gradient-to-tr from-teal-400 to-emerald-600 text-white shadow-md shadow-emerald-500/40 scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <DatabaseOutlined className="text-xl" />
          </button>

          {/* 3. Nhập / Xuất Kho */}
          <Popover
            content={tradeMenuContent}
            trigger="click"
            placement={isDrawerOpen ? 'left' : 'top'}
            open={tradePopoverOpen}
            onOpenChange={(open) => {
              setTradePopoverOpen(open);
              if (open) {
                setReportsPopoverOpen(false);
                setAppsModalOpen(false);
              }
            }}
            styles={{
              container: {
                borderRadius: 20,
                padding: 6,
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              }
            }}
          >
            <button
              type="button"
              title="Tác nghiệp Nhập/Xuất"
              aria-label="Nhập/Xuất"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-0 outline-none transition-all duration-250 active:scale-90 ${
                isTradeActive && !appsModalOpen
                  ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/40 scale-105'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <SwapOutlined className="text-xl" />
            </button>
          </Popover>

          {/* 4. Báo Cáo & Thống Kê */}
          <Popover
            content={reportsMenuContent}
            trigger="click"
            placement={isDrawerOpen ? 'left' : 'top'}
            open={reportsPopoverOpen}
            onOpenChange={(open) => {
              setReportsPopoverOpen(open);
              if (open) {
                setTradePopoverOpen(false);
                setAppsModalOpen(false);
              }
            }}
            styles={{
              container: {
                borderRadius: 20,
                padding: 6,
                boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
              }
            }}
          >
            <button
              type="button"
              title="Báo cáo & Thống kê"
              aria-label="Báo cáo & Thống kê"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-0 outline-none transition-all duration-250 active:scale-90 ${
                isReportsActive && !appsModalOpen
                  ? 'bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-md shadow-purple-500/40 scale-105'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChartOutlined className="text-xl" />
            </button>
          </Popover>

          {/* 5. Nút Mở Tất Cả Mục (App Launcher Grid) */}
          <button
            type="button"
            onClick={() => {
              setTradePopoverOpen(false);
              setReportsPopoverOpen(false);
              const willOpen = !appsModalOpen;
              setAppsModalOpen(willOpen);
              if (willOpen) {
                onCloseDrawer?.();
              }
            }}
            title="Tất cả chức năng"
            aria-label="Tất cả chức năng"
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-0 outline-none transition-all duration-250 active:scale-90 ${
              appsModalOpen || isOtherActive
                ? 'bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/40 scale-105'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <AppstoreOutlined className="text-xl" />
          </button>
        </div>
      </nav>

      {/* Modal Lưới Ứng Dụng Đầy Đủ (App Launcher Grid Modal tròn trịa) */}
      <Modal
        open={appsModalOpen}
        onCancel={() => setAppsModalOpen(false)}
        footer={null}
        closable={false}
        centered
        width={420}
        styles={{
          body: {
            borderRadius: 28,
            padding: '20px 16px 24px',
            background: isDark ? '#0f172a' : '#ffffff',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          },
        }}
      >
        <div className="space-y-4">
          {/* Header Modal */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <AppstoreOutlined className="text-base" />
              </div>
              <div>
                <div className="font-bold text-sm text-gray-800 dark:text-gray-100">Tất cả chức năng</div>
                <div className="text-[11px] text-gray-400">Chọn phân hệ bạn muốn truy cập</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAppsModalOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>

          {/* Lưới Icon Tròn Trịa (App Grid) */}
          <div className="grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {allModules.map((mod) => {
              const isActive = pathname.startsWith(mod.path);
              return (
                <button
                  key={mod.path}
                  type="button"
                  onClick={() => {
                    setAppsModalOpen(false);
                    onCloseDrawer?.();
                    navigate(mod.path);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all active:scale-95 border ${
                    isActive
                      ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 shadow-sm'
                      : 'bg-gray-50/80 dark:bg-slate-850 border-gray-100 dark:border-slate-800 hover:border-sky-200'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${mod.color} text-white flex items-center justify-center shrink-0 shadow-md`}
                  >
                    {mod.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">
                      {mod.title}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">
                      {mod.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nút mở Menu đầy đủ (Drawer) */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setAppsModalOpen(false);
                onOpenMenu();
              }}
              className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span>Xem Menu chi tiết (Drawer)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
export default MobileBottomNav;
