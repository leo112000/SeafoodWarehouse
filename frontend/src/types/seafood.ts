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
}

export interface InvoicePrintData {
  type: 'INBOUND' | 'OUTBOUND';
  invoiceNo: string;        // Mã phiếu (PNK-... hoặc PXK-...)
  date: string;             // Ngày lập phiếu
  partnerName: string;      // Tên Nhà cung cấp (nếu Nhập) hoặc Khách hàng (nếu Xuất)
  warehouseStaff: string;   // Người lập phiếu / Thủ kho
  note?: string;            // Ghi chú
  items: InvoiceItem[];     // Danh sách hàng
  totalNetWeight: number;   // Tổng Kg thực
  totalAmount: number;      // Tổng tiền
  storageLocation?: string; // Optional field for warehouse layout compatibility
}
