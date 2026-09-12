const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public', 'templates');
const rootDir = path.join(__dirname, '..', '..');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function saveWorkbook(wb, filename) {
  XLSX.writeFile(wb, path.join(rootDir, filename));
  XLSX.writeFile(wb, path.join(publicDir, filename));
  console.log('Saved:', filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DANH MỤC HẢI SẢN
// ─────────────────────────────────────────────────────────────────────────────
const sampleProducts = [
  { 'Mã sản phẩm': 'SP-CAHOI-01', 'Tên hải sản (*)': 'Cá Hồi Nauy Fillet Tươi', 'Danh mục (*)': 'Cá biển', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Ướp đá', 'Nhiệt độ (°C)': 2, 'Tồn tối thiểu': 50, 'Tồn tối đa': 500, 'Đơn giá tham chiếu (VNĐ)': 350000, 'Cảnh báo HSD (ngày)': 5, 'Ghi chú': 'Hàng bay nhập khẩu trực tiếp Nauy' },
  { 'Mã sản phẩm': 'SP-CANGU-01', 'Tên hải sản (*)': 'Cá Ngừ Đại Dương Saku Loin', 'Danh mục (*)': 'Cá biển', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Cấp đông', 'Nhiệt độ (°C)': -18, 'Tồn tối thiểu': 80, 'Tồn tối đa': 800, 'Đơn giá tham chiếu (VNĐ)': 290000, 'Cảnh báo HSD (ngày)': 7, 'Ghi chú': 'Chuẩn ăn sống Sashimi AAA' },
  { 'Mã sản phẩm': 'SP-TOMSU-01', 'Tên hải sản (*)': 'Tôm Sú Cà Mau Size 15-20', 'Danh mục (*)': 'Tôm', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Cấp đông', 'Nhiệt độ (°C)': -18, 'Tồn tối thiểu': 100, 'Tồn tối đa': 1000, 'Đơn giá tham chiếu (VNĐ)': 320000, 'Cảnh báo HSD (ngày)': 7, 'Ghi chú': 'Hộp 1kg sinh thái ngập mặn' },
  { 'Mã sản phẩm': 'SP-CUACM-01', 'Tên hải sản (*)': 'Cua Gạch Cà Mau Dây Nhỏ', 'Danh mục (*)': 'Cua', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Tươi sống', 'Nhiệt độ (°C)': 22, 'Tồn tối thiểu': 40, 'Tồn tối đa': 300, 'Đơn giá tham chiếu (VNĐ)': 450000, 'Cảnh báo HSD (ngày)': 3, 'Ghi chú': 'Size 2-3 con/kg, gạch son 100%' },
  { 'Mã sản phẩm': 'SP-MUCONG-01', 'Tên hải sản (*)': 'Mực Ống Côn Đảo Cấp Đông Tàu', 'Danh mục (*)': 'Mực', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Cấp đông', 'Nhiệt độ (°C)': -18, 'Tồn tối thiểu': 60, 'Tồn tối đa': 600, 'Đơn giá tham chiếu (VNĐ)': 260000, 'Cảnh báo HSD (ngày)': 7, 'Ghi chú': 'Cấp đông ngay trên boong tàu' },
  { 'Mã sản phẩm': '', 'Tên hải sản (*)': 'Cá Điêu Hồng Sống', 'Danh mục (*)': 'Cá nước ngọt', 'Đơn vị tính (*)': 'Kg', 'Loại bảo quản': 'Tươi sống', 'Nhiệt độ (°C)': 22, 'Tồn tối thiểu': 50, 'Tồn tối đa': 400, 'Đơn giá tham chiếu (VNĐ)': 75000, 'Cảnh báo HSD (ngày)': 2, 'Ghi chú': 'Để trống mã để tự sinh' },
];
const wbProducts = XLSX.utils.book_new();
const wsProd = XLSX.utils.json_to_sheet(sampleProducts);
wsProd['!cols'] = [{ wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wbProducts, wsProd, 'Danh sách hải sản');
saveWorkbook(wbProducts, 'Mau_Import_Danh_Muc_Hai_San.xlsx');

// ─────────────────────────────────────────────────────────────────────────────
// 2. NHÀ CUNG CẤP (PARTNERS)
// ─────────────────────────────────────────────────────────────────────────────
const samplePartners = [
  { 'Mã nhà cung cấp': 'NCC-MINHPHU', 'Tên nhà cung cấp (*)': 'Tập đoàn Thủy sản Minh Phú', 'Người liên hệ': 'Nguyễn Văn Minh', 'Số điện thoại': '0903123456', 'Email': 'contact@minhphu.com.vn', 'Địa chỉ': 'KCN Sông Đốc, Huyện Trần Văn Thời, Cà Mau', 'Mã số thuế': '2000123456', 'Ghi chú': 'Nhà cung cấp tôm sú, tôm thẻ chuẩn ASC/BAP' },
  { 'Mã nhà cung cấp': 'NCC-GHEKIENGIANG-68', 'Tên nhà cung cấp (*)': 'Hợp tác xã Tàu cá Kiên Giang 68', 'Người liên hệ': 'Trần Văn Kiên', 'Số điện thoại': '0918765432', 'Email': 'taucakiengiang68@gmail.com', 'Địa chỉ': 'Cảng cá Tắc Cậu, Châu Thành, Kiên Giang', 'Mã số thuế': '1700987654', 'Ghi chú': 'Ghe câu mực, cá biển cập cảng sáng sớm hàng ngày' },
  { 'Mã nhà cung cấp': 'NCC-VUAPHANTHIET', 'Tên nhà cung cấp (*)': 'Vựa Hải Sản Tươi Sống Phan Thiết', 'Người liên hệ': 'Lê Thị Thu', 'Số điện thoại': '0987333444', 'Email': 'thu.vuaphanthiet@yahoo.com', 'Địa chỉ': '124 Huỳnh Thúc Kháng, Mũi Né, Phan Thiết', 'Mã số thuế': '3400555666', 'Ghi chú': 'Cung cấp ghẹ xanh, mực lá, cá bớp đánh bắt trong ngày' },
  { 'Mã nhà cung cấp': 'NCC-NAUYSEAFOOD', 'Tên nhà cung cấp (*)': 'Công ty TNHH Hải Sản Bắc Âu', 'Người liên hệ': 'Lars Christian', 'Số điện thoại': '0908889999', 'Email': 'order@nordicseafood.vn', 'Địa chỉ': 'Tầng 12, Tòa nhà Bitexco, Q.1, TP.HCM', 'Mã số thuế': '0312888999', 'Ghi chú': 'Nhập khẩu trực tiếp cá hồi tươi Nauy & cá tuyết' },
  { 'Mã nhà cung cấp': '', 'Tên nhà cung cấp (*)': 'Vựa Cua Gạch Năm Căn Cà Mau', 'Người liên hệ': 'Phạm Hoàng Nam', 'Số điện thoại': '0939112233', 'Email': 'namcan.crab@gmail.com', 'Địa chỉ': 'Thị trấn Năm Căn, Huyện Năm Căn, Cà Mau', 'Mã số thuế': '', 'Ghi chú': 'Để trống mã để hệ thống tự sinh mã NCC' },
];
const wbPartners = XLSX.utils.book_new();
const wsPartners = XLSX.utils.json_to_sheet(samplePartners);
wsPartners['!cols'] = [{ wch: 20 }, { wch: 36 }, { wch: 20 }, { wch: 16 }, { wch: 26 }, { wch: 42 }, { wch: 16 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wbPartners, wsPartners, 'Danh sách nhà cung cấp');
saveWorkbook(wbPartners, 'Mau_Import_Nha_Cung_Cap.xlsx');

// ─────────────────────────────────────────────────────────────────────────────
// 3. NHÓM DANH MỤC (CATEGORIES)
// ─────────────────────────────────────────────────────────────────────────────
const sampleCategories = [
  { 'Mã danh mục': 'DM-CABiEN', 'Tên nhóm danh mục (*)': 'Cá Biển', 'Mô tả': 'Các loại cá đánh bắt từ biển khơi như cá hồi, cá ngừ, cá bớp, cá nục, cá thu' },
  { 'Mã danh mục': 'DM-CANUOCNGOT', 'Tên nhóm danh mục (*)': 'Cá Nước Ngọt', 'Mô tả': 'Cá sông, cá nuôi hồ như cá basa, cá tra, cá điêu hồng, cá chẽm' },
  { 'Mã danh mục': 'DM-TOM', 'Tên nhóm danh mục (*)': 'Tôm', 'Mô tả': 'Tôm sú, tôm thẻ chân trắng, tôm càng xanh, tôm hùm các loại' },
  { 'Mã danh mục': 'DM-CUA', 'Tên nhóm danh mục (*)': 'Cua & Ghẹ', 'Mô tả': 'Cua biển Cà Mau gạch/thịt, ghẹ xanh, cua huỳnh đế' },
  { 'Mã danh mục': 'DM-MUC', 'Tên nhóm danh mục (*)': 'Mực & Bạch Tuộc', 'Mô tả': 'Mực ống, mực lá, mực nang, bạch tuộc 2 da' },
  { 'Mã danh mục': 'DM-NGAOSO', 'Tên nhóm danh mục (*)': 'Ngao - Sò - Ốc', 'Mô tả': 'Sò huyết, sò điệp, ngao hai cùi, ốc hương, tu hài' },
  { 'Mã danh mục': 'DM-KHO', 'Tên nhóm danh mục (*)': 'Hải Sản Khô & Một Nắng', 'Mô tả': 'Tôm khô, mực một nắng, cá khô tẩm gia vị đóng gói' },
];
const wbCategories = XLSX.utils.book_new();
const wsCategories = XLSX.utils.json_to_sheet(sampleCategories);
wsCategories['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 65 }];
XLSX.utils.book_append_sheet(wbCategories, wsCategories, 'Danh mục hải sản');
saveWorkbook(wbCategories, 'Mau_Import_Nhom_Danh_Muc.xlsx');

// ─────────────────────────────────────────────────────────────────────────────
// 4. DANH MỤC KHO BÃI (WAREHOUSES)
// ─────────────────────────────────────────────────────────────────────────────
const sampleWarehouses = [
  { 'Mã kho': 'KHO-DONG-A1', 'Tên kho lạnh (*)': 'Kho Cấp Đông Sâu A1', 'Vị trí': 'Tầng 1 - Khu A (Cạnh cửa nhập số 1)', 'Sức chứa (Kg)': 15000, 'Nhiệt độ (°C)': -20, 'Ghi chú': 'Chuyên lưu trữ cá ngừ saku, tôm sú cấp đông và mực đóng thùng' },
  { 'Mã kho': 'KHO-DONG-A2', 'Tên kho lạnh (*)': 'Kho Cấp Đông Dự Trữ A2', 'Vị trí': 'Tầng 1 - Khu A (Cạnh cửa xuất số 2)', 'Sức chứa (Kg)': 20000, 'Nhiệt độ (°C)': -18, 'Ghi chú': 'Kho hàng xuất khẩu, kiểm soát nhiệt độ tự động 24/7' },
  { 'Mã kho': 'KHO-MAT-B1', 'Tên kho lạnh (*)': 'Kho Mát Bảo Quản Cá Tươi B1', 'Vị trí': 'Tầng trệt - Khu B (Khu sơ chế sạch)', 'Sức chứa (Kg)': 8000, 'Nhiệt độ (°C)': 2, 'Ghi chú': 'Lưu trữ cá hồi Nauy ướp đá, mực tươi trong ngày' },
  { 'Mã kho': 'BE-SONG-C1', 'Tên kho lạnh (*)': 'Hệ Thống Bể Sống Oxy C1', 'Vị trí': 'Khu C - Bể nuôi hải sản sống', 'Sức chứa (Kg)': 5000, 'Nhiệt độ (°C)': 21, 'Ghi chú': 'Bể nuôi tôm càng xanh, cua gạch Cà Mau và ghẹ sống sục khí' },
  { 'Mã kho': 'KHO-KHO-D1', 'Tên kho lạnh (*)': 'Kho Hàng Khô & Bao Bì D1', 'Vị trí': 'Tầng lửng - Khu D', 'Sức chứa (Kg)': 10000, 'Nhiệt độ (°C)': 25, 'Ghi chú': 'Chứa tôm khô, mực một nắng hút chân không và sọt nhựa' },
];
const wbWarehouses = XLSX.utils.book_new();
const wsWarehouses = XLSX.utils.json_to_sheet(sampleWarehouses);
wsWarehouses['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 45 }];
XLSX.utils.book_append_sheet(wbWarehouses, wsWarehouses, 'Danh mục kho bãi');
saveWorkbook(wbWarehouses, 'Mau_Import_Kho_Bai.xlsx');

// ─────────────────────────────────────────────────────────────────────────────
// 5. DANH MỤC BAO BÌ (PACKAGING)
// ─────────────────────────────────────────────────────────────────────────────
const samplePackaging = [
  { 'Mã bao bì': 'BB-SOT-RED', 'Tên bao bì (*)': 'Sọt Nhựa Đỏ Tiêu Chuẩn', 'Phân loại': 'Vỏ sọt luân chuyển', 'Trọng lượng bì (Kg)': 1.8, 'Đơn vị tính': 'Cái', 'Tồn kho ban đầu': 350, 'Ghi chú': 'Sọt nhựa dùng cho khâu cân nhận hàng tại bến' },
  { 'Mã bao bì': 'BB-SOT-BLUE', 'Tên bao bì (*)': 'Sọt Nhựa Xanh Dương Đại', 'Phân loại': 'Vỏ sọt luân chuyển', 'Trọng lượng bì (Kg)': 2.2, 'Đơn vị tính': 'Cái', 'Tồn kho ban đầu': 200, 'Ghi chú': 'Sọt cỡ lớn dùng xếp buồng cấp đông' },
  { 'Mã bao bì': 'BB-THUNG-30KG', 'Tên bao bì (*)': 'Thùng Xốp Lớn Giữ Nhiệt 30Kg', 'Phân loại': 'Vật tư tiêu hao', 'Trọng lượng bì (Kg)': 0.5, 'Đơn vị tính': 'Cái', 'Tồn kho ban đầu': 500, 'Ghi chú': 'Dùng đóng gói giao hàng đi xa kèm đá gel' },
  { 'Mã bao bì': 'BB-CARTON-10KG', 'Tên bao bì (*)': 'Thùng Carton Chống Ẩm 10Kg', 'Phân loại': 'Vật tư tiêu hao', 'Trọng lượng bì (Kg)': 0.3, 'Đơn vị tính': 'Cái', 'Tồn kho ban đầu': 400, 'Ghi chú': 'Quy cách xuất khẩu mực và tôm đông lạnh' },
  { 'Mã bao bì': 'BB-KHAY-NHOM', 'Tên bao bì (*)': 'Khay Cấp Đông Nhôm Chuyên Dụng', 'Phân loại': 'Vỏ sọt luân chuyển', 'Trọng lượng bì (Kg)': 0.8, 'Đơn vị tính': 'Cái', 'Tồn kho ban đầu': 250, 'Ghi chú': 'Khay dẫn nhiệt nhanh xếp tủ đông tiếp xúc' },
];
const wbPackaging = XLSX.utils.book_new();
const wsPackaging = XLSX.utils.json_to_sheet(samplePackaging);
wsPackaging['!cols'] = [{ wch: 18 }, { wch: 32 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wbPackaging, wsPackaging, 'Danh mục bao bì');
saveWorkbook(wbPackaging, 'Mau_Import_Bao_Bi.xlsx');

// ─────────────────────────────────────────────────────────────────────────────
// 6. BẢNG KÊ NHẬP KHO TỔNG HỢP (NHIỀU NHÀ CUNG CẤP)
// ─────────────────────────────────────────────────────────────────────────────
const sampleInboundBatch = [
  { 'Nhà cung cấp (*)': 'Hợp tác xã Tàu cá Kiên Giang 68', 'Hải sản (*)': 'Mực Ống Côn Đảo Cấp Đông Tàu', 'Bao bì': 'Sọt Nhựa Đỏ Tiêu Chuẩn', 'Số lượng sọt': 10, 'Tổng cân (Kg) (*)': 250, 'Trừ bì (Kg)': 18, 'Cân tịnh (Kg)': 232, 'Đơn giá (VNĐ)': 180000, 'Điều kiện bảo quản': 'Cấp đông', 'Ngày đánh bắt': '10/09/2026', 'Hạn sử dụng (*)': '10/03/2027', 'Kho lưu trữ': 'Kho Cấp Đông Sâu A1', 'Ghi chú': 'Mực ống câu đêm cấp đông tàu' },
  { 'Nhà cung cấp (*)': 'Hợp tác xã Tàu cá Kiên Giang 68', 'Hải sản (*)': 'Cá Bớp Biển Cắt Khoanh', 'Bao bì': 'Sọt Nhựa Xanh Dương Đại', 'Số lượng sọt': 5, 'Tổng cân (Kg) (*)': 160, 'Trừ bì (Kg)': 11, 'Cân tịnh (Kg)': 149, 'Đơn giá (VNĐ)': 240000, 'Điều kiện bảo quản': 'Cấp đông', 'Ngày đánh bắt': '09/09/2026', 'Hạn sử dụng (*)': '09/03/2027', 'Kho lưu trữ': 'Kho Cấp Đông Sâu A1', 'Ghi chú': 'Khoanh đều không xương đuôi' },
  { 'Nhà cung cấp (*)': 'Tập đoàn Thủy sản Minh Phú', 'Hải sản (*)': 'Tôm Sú Cà Mau Size 15-20', 'Bao bì': 'Sọt Nhựa Đỏ Tiêu Chuẩn', 'Số lượng sọt': 12, 'Tổng cân (Kg) (*)': 300, 'Trừ bì (Kg)': 21.6, 'Cân tịnh (Kg)': 278.4, 'Đơn giá (VNĐ)': 320000, 'Điều kiện bảo quản': 'Cấp đông', 'Ngày đánh bắt': '11/09/2026', 'Hạn sử dụng (*)': '11/03/2027', 'Kho lưu trữ': 'Kho Cấp Đông Dự Trữ A2', 'Ghi chú': 'Tôm chuẩn xuất khẩu ASC' },
  { 'Nhà cung cấp (*)': 'Tập đoàn Thủy sản Minh Phú', 'Hải sản (*)': 'Tôm Càng Xanh Bến Tre Loại 1', 'Bao bì': 'Sọt Nhựa Xanh Dương Đại', 'Số lượng sọt': 8, 'Tổng cân (Kg) (*)': 200, 'Trừ bì (Kg)': 17.6, 'Cân tịnh (Kg)': 182.4, 'Đơn giá (VNĐ)': 380000, 'Điều kiện bảo quản': 'Tươi sống', 'Ngày đánh bắt': '12/09/2026', 'Hạn sử dụng (*)': '15/09/2026', 'Kho lưu trữ': 'Hệ Thống Bể Sống Oxy C1', 'Ghi chú': 'Hàng sống tại bể' },
  { 'Nhà cung cấp (*)': 'Vựa Hải Sản Tươi Sống Phan Thiết', 'Hải sản (*)': 'Ghẹ Xanh Phan Thiết Sống', 'Bao bì': 'Khay Cấp Đông Nhôm Chuyên Dụng', 'Số lượng sọt': 6, 'Tổng cân (Kg) (*)': 150, 'Trừ bì (Kg)': 4.8, 'Cân tịnh (Kg)': 145.2, 'Đơn giá (VNĐ)': 390000, 'Điều kiện bảo quản': 'Tươi sống', 'Ngày đánh bắt': '12/09/2026', 'Hạn sử dụng (*)': '15/09/2026', 'Kho lưu trữ': 'Hệ Thống Bể Sống Oxy C1', 'Ghi chú': 'Size 3-4 con/kg' },
  { 'Nhà cung cấp (*)': 'Vựa Hải Sản Tươi Sống Phan Thiết', 'Hải sản (*)': 'Mực Lá Phan Rang Size L', 'Bao bì': 'Sọt Nhựa Đỏ Tiêu Chuẩn', 'Số lượng sọt': 5, 'Tổng cân (Kg) (*)': 130, 'Trừ bì (Kg)': 9, 'Cân tịnh (Kg)': 121, 'Đơn giá (VNĐ)': 310000, 'Điều kiện bảo quản': 'Ướp đá', 'Ngày đánh bắt': '11/09/2026', 'Hạn sử dụng (*)': '18/09/2026', 'Kho lưu trữ': 'Kho Mát Bảo Quản Cá Tươi B1', 'Ghi chú': 'Ướp đá vảy dày cơm' },
  { 'Nhà cung cấp (*)': 'Công ty TNHH Hải Sản Bắc Âu', 'Hải sản (*)': 'Cá Hồi Nauy Fillet Tươi', 'Bao bì': 'Thùng Xốp Lớn Giữ Nhiệt 30Kg', 'Số lượng sọt': 10, 'Tổng cân (Kg) (*)': 280, 'Trừ bì (Kg)': 5, 'Cân tịnh (Kg)': 275, 'Đơn giá (VNĐ)': 350000, 'Điều kiện bảo quản': 'Ướp đá', 'Ngày đánh bắt': '10/09/2026', 'Hạn sử dụng (*)': '17/09/2026', 'Kho lưu trữ': 'Kho Mát Bảo Quản Cá Tươi B1', 'Ghi chú': 'Hàng bay nhập khẩu trực tiếp' },
];
const wbInboundBatch = XLSX.utils.book_new();
const wsInboundBatch = XLSX.utils.json_to_sheet(sampleInboundBatch);
wsInboundBatch['!cols'] = [
  { wch: 32 }, { wch: 32 }, { wch: 25 }, { wch: 14 },
  { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 35 }
];
XLSX.utils.book_append_sheet(wbInboundBatch, wsInboundBatch, 'Bảng kê nhập kho');
saveWorkbook(wbInboundBatch, 'Mau_Bang_Ke_Nhap_Kho_Tong_Hop.xlsx');

console.log('All Excel sample templates including Inbound Batch successfully generated!');

