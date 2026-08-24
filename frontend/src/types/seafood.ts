export interface InvoiceItem {
  batchCode: string;
  productName: string; // Tên hải sản
  storageType: string; // Tươi sống / Ướp đá / Cấp đông
  grossWeight: number; // Kg thô
  tareWeight: number;  // Bì
  netWeight: number;   // Kg thực
  expiryDate: string;
  unitPrice: number;
  totalAmount: number;
  packagingCode?: string; // Mã bao bì
  packagingQty?: number;  // Số lượng bao bì
}

export interface SupplyItem {
  name: string;          // Tên vật phẩm bán kèm / phụ phí (VD: Thùng xốp 30kg, Đá gel giữ lạnh)
  packagingCode?: string;// Mã vật tư nếu có (VD: THUNG-30KG, DA-GEL)
  unit: string;           // Đơn vị tính (Cái, Thùng, Hộp, Bộ)
  quantity: number;      // Số lượng
  unitPrice: number;     // Đơn giá bán
  totalAmount: number;   // Thành tiền (quantity * unitPrice)
}

export interface InvoicePrintData {
  type: 'INBOUND' | 'OUTBOUND';
  invoiceNo: string;        // Mã phiếu (PNK-... hoặc PXK-...)
  date: string;             // Ngày lập phiếu
  partnerName: string;      // Tên Nhà cung cấp (nếu Nhập) hoặc Khách hàng (nếu Xuất)
  warehouseStaff: string;   // Người lập phiếu / Thủ kho
  note?: string;            // Ghi chú
  items: InvoiceItem[];     // Danh sách hàng hải sản
  supplies?: SupplyItem[];  // Danh sách vật phẩm kèm / phụ phí (Thùng xốp, đá gel...)
  subTotal?: number;        // Tổng tiền hàng hải sản
  suppliesTotal?: number;   // Tổng tiền vật phẩm bán kèm
  discountAmount?: number;  // Số tiền giảm giá / chiết khấu
  discountReason?: string;  // Lý do / Mã giảm giá
  totalNetWeight: number;   // Tổng Kg thực
  totalAmount: number;      // Tổng tiền thanh toán cuối cùng (sau giảm giá)
  storageLocation?: string; // Optional field for warehouse layout compatibility
}

export interface PackagingType {
  id: string;
  code: string;           // Mã vật tư (VD: SOT-RED, THUNG-30KG)
  name: string;           // Tên (VD: Sọt nhựa đỏ, Thùng xốp lớn 30kg)
  category: 'CONTAINER' | 'CONSUMABLE'; // Vật chứa tái sử dụng OR Vật tư dùng 1 lần
  defaultTareWeight: number; // Trọng lượng bì chuẩn (Kg)
  unit: string;           // Cái / Chiếc / Thùng
  stockQuantity: number;  // Tồn kho hiện tại của vật tư này
  note?: string;
}

export interface Product {
  id: string;
  code: string;               // Mã hàng (VD: HS-CA-CAHOI)
  name: string;               // Tên hải sản
  categoryId: string;         // ID Danh mục (Cá, Tôm, Cua, Mực...)
  categoryName?: string;
  unit: string;               // Đơn vị tính (Kg, Con, Thùng...)
  storageType: 'ALIVE' | 'FRESH' | 'FROZEN' | 'DRY'; // Sống / Ướp đá / Cấp đông / Khô
  targetTemperature: number;  // Nhiệt độ bảo quản chuẩn (°C)
  warningDaysBeforeExpiry: number; // Cảnh báo cận date trước X ngày
  minStock: number;           // Mức tồn kho tối thiểu
  maxStock: number;           // Mức tồn kho tối đa
  referencePrice: number;     // Đơn giá tham chiếu (VNĐ)
  status: 'ACTIVE' | 'INACTIVE';
  note?: string;
}

export interface Category {
  id: string;
  code: string;           // Mã danh mục (VD: CA, TOM, CUA)
  name: string;           // Tên danh mục (VD: Cá, Tôm, Cua)
  description?: string;   // Mô tả
  productCount: number;   // Số sản phẩm thuộc danh mục
  createdAt: string;      // Ngày tạo
}

export interface Permission {
  code: string;        // Mã quyền (VD: Pages.Products.Create)
  displayName: string; // Tên hiển thị (VD: Tạo mới sản phẩm)
  category: string;    // Nhóm quyền (Danh mục, Kho, Báo cáo, Hệ thống)
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'PRINT';
  module: string;
  description: string;
  ipAddress: string;
  browser: string;
  status: 'SUCCESS' | 'FAILED';
  executionDurationMs?: number;
  oldValues?: string;
  newValues?: string;
}

export interface Role {
  id: string;
  name: string;        // Tên role (Admin, Manager, Stockkeeper, Sales)
  description: string;
  isSystemDefault?: boolean;
  permissions: string[]; // Danh sách mã permission code được gán
}
