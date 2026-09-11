/**
 * Hệ thống Enums & Constants tập trung cho dự án SeafoodWarehouse.
 * 
 * Sử dụng pattern 'as const' object + union types:
 * - Vừa dùng làm Giá trị Runtime (ví dụ: TRANSACTION_STATUS.CANCELLED)
 * - Vừa tự sinh Kiểu Type TypeScript (ví dụ: TransactionStatus)
 * - Khi thay đổi giá trị chuỗi ở đây, toàn bộ logic và type-check trong dự án sẽ tự động cập nhật.
 */

// ==========================================
// 1. GIAO DỊCH & PHIẾU KHO (TRANSACTIONS)
// ==========================================

/** Trạng thái giao dịch / phiếu nhập xuất */
export const TRANSACTION_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

/** Metadata hiển thị giao diện cho trạng thái giao dịch */
export const TRANSACTION_STATUS_META: Record<TransactionStatus, { label: string; badgeClass: string; rowClass?: string }> = {
  [TRANSACTION_STATUS.ACTIVE]: {
    label: 'Hoạt động',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  [TRANSACTION_STATUS.CANCELLED]: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    rowClass: 'opacity-60 line-through bg-slate-50 dark:bg-slate-900/40',
  },
};

/** Loại giao dịch kho (Nhập / Xuất) */
export const TRANSACTION_TYPE = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;

export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_TYPE_META: Record<TransactionType, { label: string; badgeClass: string }> = {
  [TRANSACTION_TYPE.INBOUND]: {
    label: 'Nhập kho',
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  [TRANSACTION_TYPE.OUTBOUND]: {
    label: 'Xuất kho',
    badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
};

/** Trạng thái tồn kho của sản phẩm */
export const STOCK_STATUS = {
  IN_STOCK: 'InStock',
  OUT_OF_STOCK: 'OutofStock',
  LOW_STOCK: 'LowStock',
} as const;

export type StockStatus = typeof STOCK_STATUS[keyof typeof STOCK_STATUS];

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string }> = {
  [STOCK_STATUS.IN_STOCK]: { label: 'Còn hàng', color: 'emerald' },
  [STOCK_STATUS.LOW_STOCK]: { label: 'Sắp hết hàng', color: 'amber' },
  [STOCK_STATUS.OUT_OF_STOCK]: { label: 'Hết hàng', color: 'rose' },
};


// ==========================================
// 2. SẢN PHẨM & HẢI SẢN (PRODUCTS)
// ==========================================

/** Hình thức bảo quản hải sản */
export const STORAGE_TYPE = {
  ALIVE: 'ALIVE',
  FRESH: 'FRESH',
  FROZEN: 'FROZEN',
  DRY: 'DRY',
} as const;

export type StorageType = typeof STORAGE_TYPE[keyof typeof STORAGE_TYPE];

export const STORAGE_TYPE_META: Record<StorageType, { label: string; badgeClass: string; icon?: string }> = {
  [STORAGE_TYPE.ALIVE]: {
    label: 'Tươi sống',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  },
  [STORAGE_TYPE.FRESH]: {
    label: 'Ướp đá',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  },
  [STORAGE_TYPE.FROZEN]: {
    label: 'Cấp đông',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  [STORAGE_TYPE.DRY]: {
    label: 'Đồ khô',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

/** Trạng thái sản phẩm (Hoạt động / Ngừng kinh doanh) */
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];


// ==========================================
// 3. BAO BÌ & VẬT TƯ (PACKAGING)
// ==========================================

/** Phân loại bao bì vật tư (Vật chứa luân chuyển / Vật tư tiêu hao) */
export const PACKAGING_CATEGORY = {
  CONTAINER: 'CONTAINER',
  CONSUMABLE: 'CONSUMABLE',
} as const;

export type PackagingCategory = typeof PACKAGING_CATEGORY[keyof typeof PACKAGING_CATEGORY];

export const PACKAGING_CATEGORY_META: Record<PackagingCategory, { label: string }> = {
  [PACKAGING_CATEGORY.CONTAINER]: { label: 'Vật chứa tái sử dụng (Sọt, khay)' },
  [PACKAGING_CATEGORY.CONSUMABLE]: { label: 'Vật tư dùng 1 lần (Thùng xốp, đá)' },
};


// ==========================================
// 4. ĐỐI TÁC (PARTNERS)
// ==========================================

/** Phân loại đối tác */
export const PARTNER_TYPE = {
  SUPPLIER: 'SUPPLIER',
  CUSTOMER: 'CUSTOMER',
} as const;

export type PartnerType = typeof PARTNER_TYPE[keyof typeof PARTNER_TYPE];

export const PARTNER_TYPE_META: Record<PartnerType, { label: string }> = {
  [PARTNER_TYPE.SUPPLIER]: { label: 'Nhà cung cấp' },
  [PARTNER_TYPE.CUSTOMER]: { label: 'Khách hàng / Đại lý' },
};


// ==========================================
// 5. KHO BÃI & KHU VỰC LƯU TRỮ (WAREHOUSE)
// ==========================================

/** Trạng thái vận hành khu vực kho */
export const WAREHOUSE_ZONE_STATUS = {
  OPERATIONAL: 'OPERATIONAL',
  MAINTENANCE: 'MAINTENANCE',
  FULL: 'FULL',
} as const;

export type WarehouseZoneStatus = typeof WAREHOUSE_ZONE_STATUS[keyof typeof WAREHOUSE_ZONE_STATUS];

/** Phân nhóm nhiệt độ kho bãi */
export const ZONE_TEMPERATURE_CATEGORY = {
  DEEP_FREEZE: 'DEEP_FREEZE',
  COLD_STORAGE: 'COLD_STORAGE',
  LIVE_TANK: 'LIVE_TANK',
  DRY_CHILL: 'DRY_CHILL',
} as const;

export type ZoneTemperatureCategory = typeof ZONE_TEMPERATURE_CATEGORY[keyof typeof ZONE_TEMPERATURE_CATEGORY];

/** Trạng thái ô chứa hàng (Slot) */
export const ZONE_SLOT_STATUS = {
  NORMAL: 'NORMAL',
  NEAR_EXPIRY: 'NEAR_EXPIRY',
  FULL: 'FULL',
  EMPTY: 'EMPTY',
} as const;

export type ZoneSlotStatus = typeof ZONE_SLOT_STATUS[keyof typeof ZONE_SLOT_STATUS];


// ==========================================
// 6. AUDIT LOGS & HỆ THỐNG
// ==========================================

/** Hành động audit nhật ký */
export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
} as const;

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

/** Trạng thái kết quả audit nhật ký */
export const AUDIT_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type AuditStatus = typeof AUDIT_STATUS[keyof typeof AUDIT_STATUS];
