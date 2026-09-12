const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const sampleProducts = [
  {
    'Mã sản phẩm': 'SP-CAHOI-01',
    'Tên hải sản (*)': 'Cá Hồi Nauy Fillet Tươi',
    'Danh mục (*)': 'Cá biển',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Ướp đá',
    'Nhiệt độ (°C)': 2,
    'Tồn tối thiểu': 50,
    'Tồn tối đa': 500,
    'Đơn giá tham chiếu (VNĐ)': 350000,
    'Cảnh báo HSD (ngày)': 5,
    'Ghi chú': 'Hàng bay nhập khẩu trực tiếp Nauy, size 1.5 - 2kg/fillet'
  },
  {
    'Mã sản phẩm': 'SP-CANGU-01',
    'Tên hải sản (*)': 'Cá Ngừ Đại Dương Saku Loin',
    'Danh mục (*)': 'Cá biển',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 80,
    'Tồn tối đa': 800,
    'Đơn giá tham chiếu (VNĐ)': 290000,
    'Cảnh báo HSD (ngày)': 7,
    'Ghi chú': 'Chuẩn ăn sống Sashimi AAA, hút chân không từng thanh'
  },
  {
    'Mã sản phẩm': 'SP-TOMSU-01',
    'Tên hải sản (*)': 'Tôm Sú Cà Mau Size 15-20',
    'Danh mục (*)': 'Tôm',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 100,
    'Tồn tối đa': 1000,
    'Đơn giá tham chiếu (VNĐ)': 320000,
    'Cảnh báo HSD (ngày)': 7,
    'Ghi chú': 'Cấp đông bán lẻ hộp 1kg, chuẩn sinh thái rừng ngập mặn'
  },
  {
    'Mã sản phẩm': 'SP-TOMCANG-01',
    'Tên hải sản (*)': 'Tôm Càng Xanh Bến Tre Loại 1',
    'Danh mục (*)': 'Tôm',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Tươi sống',
    'Nhiệt độ (°C)': 20,
    'Tồn tối thiểu': 30,
    'Tồn tối đa': 200,
    'Đơn giá tham chiếu (VNĐ)': 380000,
    'Cảnh báo HSD (ngày)': 2,
    'Ghi chú': 'Hàng sống tại hồ, sục khí oxy 24/7'
  },
  {
    'Mã sản phẩm': 'SP-CUACM-01',
    'Tên hải sản (*)': 'Cua Gạch Cà Mau Dây Nhỏ',
    'Danh mục (*)': 'Cua',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Tươi sống',
    'Nhiệt độ (°C)': 22,
    'Tồn tối thiểu': 40,
    'Tồn tối đa': 300,
    'Đơn giá tham chiếu (VNĐ)': 450000,
    'Cảnh báo HSD (ngày)': 3,
    'Ghi chú': 'Size 2-3 con/kg, gạch son đầy 100%, trói dây không trọng lượng'
  },
  {
    'Mã sản phẩm': 'SP-GHEXANH-01',
    'Tên hải sản (*)': 'Ghẹ Xanh Phan Thiết Sống',
    'Danh mục (*)': 'Cua',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Tươi sống',
    'Nhiệt độ (°C)': 20,
    'Tồn tối thiểu': 30,
    'Tồn tối đa': 250,
    'Đơn giá tham chiếu (VNĐ)': 390000,
    'Cảnh báo HSD (ngày)': 2,
    'Ghi chú': 'Size 3-4 con/kg, thịt chắc ngọt'
  },
  {
    'Mã sản phẩm': 'SP-MUCONG-01',
    'Tên hải sản (*)': 'Mực Ống Côn Đảo Cấp Đông Tàu',
    'Danh mục (*)': 'Mực',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 60,
    'Tồn tối đa': 600,
    'Đơn giá tham chiếu (VNĐ)': 260000,
    'Cảnh báo HSD (ngày)': 7,
    'Ghi chú': 'Cấp đông trực tiếp khi vừa câu lên boong tàu, mực chớp nháy'
  },
  {
    'Mã sản phẩm': 'SP-MUCLN-01',
    'Tên hải sản (*)': 'Mực Lá Phan Rang Size L',
    'Danh mục (*)': 'Mực',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Ướp đá',
    'Nhiệt độ (°C)': 1,
    'Tồn tối thiểu': 50,
    'Tồn tối đa': 400,
    'Đơn giá tham chiếu (VNĐ)': 310000,
    'Cảnh báo HSD (ngày)': 4,
    'Ghi chú': 'Dày cơm, size 0.8 - 1.2kg/con'
  },
  {
    'Mã sản phẩm': 'SP-MUCMN-01',
    'Tên hải sản (*)': 'Mực Một Nắng Cô Tô',
    'Danh mục (*)': 'Khô',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 20,
    'Tồn tối đa': 200,
    'Đơn giá tham chiếu (VNĐ)': 420000,
    'Cảnh báo HSD (ngày)': 15,
    'Ghi chú': 'Phơi 1 nắng chuẩn, dẻo thơm, đóng gói 1kg hút chân không'
  },
  {
    'Mã sản phẩm': 'SP-CABOP-01',
    'Tên hải sản (*)': 'Cá Bớp Biển Cắt Khoanh',
    'Danh mục (*)': 'Cá biển',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 70,
    'Tồn tối đa': 500,
    'Đơn giá tham chiếu (VNĐ)': 240000,
    'Cảnh báo HSD (ngày)': 7,
    'Ghi chú': 'Khoanh đều không dính xương đuôi, cấp đông IQF'
  },
  {
    'Mã sản phẩm': '',
    'Tên hải sản (*)': 'Cá Chẽm Phi Lê Tươi',
    'Danh mục (*)': 'Cá nước ngọt',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Ướp đá',
    'Nhiệt độ (°C)': 2,
    'Tồn tối thiểu': 40,
    'Tồn tối đa': 300,
    'Đơn giá tham chiếu (VNĐ)': 195000,
    'Cảnh báo HSD (ngày)': 3,
    'Ghi chú': 'Để trống mã để hệ thống tự sinh mã tự động SP-CACHEM-01'
  },
  {
    'Mã sản phẩm': '',
    'Tên hải sản (*)': 'Cá Điêu Hồng Sống',
    'Danh mục (*)': 'Cá nước ngọt',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Tươi sống',
    'Nhiệt độ (°C)': 22,
    'Tồn tối thiểu': 50,
    'Tồn tối đa': 400,
    'Đơn giá tham chiếu (VNĐ)': 75000,
    'Cảnh báo HSD (ngày)': 2,
    'Ghi chú': 'Hàng sống tại bể nước ngọt, size 0.8 - 1.2kg'
  },
  {
    'Mã sản phẩm': 'SP-SOHUYET-01',
    'Tên hải sản (*)': 'Sò Huyết Cồ Rạch Giá',
    'Danh mục (*)': 'Cua',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Tươi sống',
    'Nhiệt độ (°C)': 20,
    'Tồn tối thiểu': 30,
    'Tồn tối đa': 200,
    'Đơn giá tham chiếu (VNĐ)': 230000,
    'Cảnh báo HSD (ngày)': 2,
    'Ghi chú': 'Size lớn 40-50 con/kg, còn sống nguyên bùn mát'
  },
  {
    'Mã sản phẩm': 'SP-BACHTUOC-01',
    'Tên hải sản (*)': 'Bạch Tuộc 2 Da Cấp Đông',
    'Danh mục (*)': 'Mực',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Cấp đông',
    'Nhiệt độ (°C)': -18,
    'Tồn tối thiểu': 50,
    'Tồn tối đa': 600,
    'Đơn giá tham chiếu (VNĐ)': 160000,
    'Cảnh báo HSD (ngày)': 10,
    'Ghi chú': 'Size 10-20 con/kg, giòn ngọt phù hợp chế biến nướng/lẩu'
  },
  {
    'Mã sản phẩm': 'SP-TOMKHO-01',
    'Tên hải sản (*)': 'Tôm Khô Đất Cà Mau Thượng Hạng',
    'Danh mục (*)': 'Khô',
    'Đơn vị tính (*)': 'Kg',
    'Loại bảo quản': 'Khô',
    'Nhiệt độ (°C)': 25,
    'Tồn tối thiểu': 15,
    'Tồn tối đa': 150,
    'Đơn giá tham chiếu (VNĐ)': 1250000,
    'Cảnh báo HSD (ngày)': 30,
    'Ghi chú': 'Tôm đất sống luộc phơi tự nhiên, không phẩm màu, bao bì gói 500g'
  }
];

const instructions = [
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': 'QUY TẮC NHẬP LIỆU' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '1. Dấu (*) là các trường BẮT BUỘC phải có dữ liệu.' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '2. Cột "Mã sản phẩm": Bạn có thể nhập mã riêng của bạn hoặc ĐỂ TRỐNG để hệ thống tự động sinh mã chuẩn.' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '3. Cột "Danh mục": Nhập tên danh mục (ví dụ: Cá biển, Tôm, Cua, Mực, Cá nước ngọt...). Hệ thống sẽ tự động ghép nối.' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '4. Cột "Loại bảo quản": Hỗ trợ các giá trị: "Cấp đông", "Ướp đá", "Tươi sống", "Khô".' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '5. Cột "Đơn giá tham chiếu": Nhập dạng số (ví dụ: 350000), không cần thêm ký tự đ hay VNĐ.' },
  { 'HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT DANH MỤC HẢI SẢN': '6. Sau khi điền xong dữ liệu ở Sheet "Danh sách hải sản", lưu file và upload vào hệ thống.' }
];

const wb = XLSX.utils.book_new();

// 1. Sheet Danh sách hải sản
const wsData = XLSX.utils.json_to_sheet(sampleProducts);
wsData['!cols'] = [
  { wch: 18 }, // Mã
  { wch: 35 }, // Tên
  { wch: 16 }, // Danh mục
  { wch: 14 }, // ĐVT
  { wch: 16 }, // Bảo quản
  { wch: 14 }, // Nhiệt độ
  { wch: 14 }, // Tồn min
  { wch: 14 }, // Tồn max
  { wch: 22 }, // Đơn giá
  { wch: 18 }, // Cảnh báo HSD
  { wch: 50 }  // Ghi chú
];
XLSX.utils.book_append_sheet(wb, wsData, 'Danh sách hải sản');

// 2. Sheet Hướng dẫn
const wsGuide = XLSX.utils.json_to_sheet(instructions);
wsGuide['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsGuide, 'Hướng dẫn nhập liệu');

// Ghi ra 2 nơi: thư mục gốc workspace & thư mục public/templates của frontend
const rootTarget = path.join(__dirname, '..', '..', 'Mau_Import_Danh_Muc_Hai_San.xlsx');
const publicDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicTarget = path.join(publicDir, 'Mau_Import_Danh_Muc_Hai_San.xlsx');

XLSX.writeFile(wb, rootTarget);
XLSX.writeFile(wb, publicTarget);
console.log('Successfully generated Excel template files at:', rootTarget, 'and', publicTarget);
