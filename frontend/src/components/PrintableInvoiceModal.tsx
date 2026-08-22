import React from 'react';
import { Modal, Button, Typography } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface InvoiceItem {
  productName: string;
  lotNumber?: string;
  grossWeightKg?: number;
  packagingWeightKg?: number;
  netWeightKg: number;
  unitPrice?: number;
  totalPrice?: number;
  note?: string;
}

export interface PrintableInvoiceProps {
  open: boolean;
  onClose: () => void;
  type: 'INBOUND' | 'OUTBOUND';
  invoiceCode: string;
  createdDate: string | Date;
  partnerName: string;
  partnerPhone?: string;
  partnerAddress?: string;
  warehouseName: string;
  createdByName: string;
  items: InvoiceItem[];
  tenantName?: string;
  note?: string;
}

export const PrintableInvoiceModal: React.FC<PrintableInvoiceProps> = ({
  open,
  onClose,
  type,
  invoiceCode,
  createdDate,
  partnerName,
  partnerPhone,
  partnerAddress,
  warehouseName,
  createdByName,
  items,
  tenantName,
  note,
}) => {
  const isOutbound = type === 'OUTBOUND';
  const title = isOutbound ? 'PHIẾU XUẤT KHO HẢI SẢN' : 'PHIẾU NHẬP KHO HẢI SẢN';

  const handlePrint = () => {
    window.print();
  };

  const totalNetWeight = items.reduce((sum, item) => sum + (item.netWeightKg || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="close" onClick={onClose} className="print:hidden">
          Đóng
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} className="print:hidden">
          In Phiếu (A4/A5)
        </Button>,
      ]}
    >
      <div id="printable-invoice" className="p-4 text-gray-900 bg-white print:p-0">
        {/* Header Công ty / Chi nhánh */}
        <div className="flex justify-between items-start border-b pb-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-sky-700 m-0">
              {tenantName || 'HỆ THỐNG QUẢN LÝ KHO THỦY HẢI SẢN WMS'}
            </h2>
            <div className="text-xs text-gray-500 mt-1">Kho vận hành: <span className="font-semibold text-gray-800">{warehouseName}</span></div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-gray-800">Số: {invoiceCode}</div>
            <div className="text-xs text-gray-500">
              Ngày: {dayjs(createdDate).format('DD/MM/YYYY HH:mm')}
            </div>
          </div>
        </div>

        {/* Tiêu đề phiếu */}
        <div className="text-center my-4">
          <h1 className="text-2xl font-extrabold tracking-wide uppercase text-gray-900 m-0">
            {title}
          </h1>
          <p className="text-xs italic text-gray-500 mt-1">
            (Liên 1: Lưu kho - Liên 2: Giao đối tác)
          </p>
        </div>

        {/* Thông tin đối tác */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md mb-4 text-sm border">
          <div>
            <div><Text strong>{isOutbound ? 'Khách hàng / Đại lý:' : 'Nhà cung cấp / Tàu cá:'}</Text> <span className="font-semibold text-sky-900">{partnerName}</span></div>
            {partnerPhone && <div><Text strong>Điện thoại:</Text> {partnerPhone}</div>}
          </div>
          <div>
            {partnerAddress && <div><Text strong>Địa chỉ / Vị trí cảng:</Text> {partnerAddress}</div>}
            <div><Text strong>Người lập phiếu:</Text> {createdByName}</div>
          </div>
        </div>

        {/* Bảng chi tiết sản phẩm */}
        <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
          <thead>
            <tr className="bg-gray-100 text-gray-800">
              <th className="border border-gray-300 p-2 text-center w-12">STT</th>
              <th className="border border-gray-300 p-2 text-left">Tên mặt hàng hải sản</th>
              <th className="border border-gray-300 p-2 text-center">Mã Lô</th>
              <th className="border border-gray-300 p-2 text-right">Khối lượng cả bì (kg)</th>
              <th className="border border-gray-300 p-2 text-right">Trừ bì sọt (kg)</th>
              <th className="border border-gray-300 p-2 text-right font-bold text-sky-800">Khối lượng tịnh (kg)</th>
              {totalAmount > 0 && <th className="border border-gray-300 p-2 text-right">Đơn giá (VNĐ)</th>}
              {totalAmount > 0 && <th className="border border-gray-300 p-2 text-right">Thành tiền (VNĐ)</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-2 font-medium">{item.productName}</td>
                <td className="border border-gray-300 p-2 text-center font-mono text-xs">{item.lotNumber || '-'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.grossWeightKg?.toLocaleString('vi-VN') || '-'}</td>
                <td className="border border-gray-300 p-2 text-right">{item.packagingWeightKg?.toLocaleString('vi-VN') || '-'}</td>
                <td className="border border-gray-300 p-2 text-right font-bold text-sky-800">{item.netWeightKg.toLocaleString('vi-VN')}</td>
                {totalAmount > 0 && (
                  <td className="border border-gray-300 p-2 text-right">{item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') : '-'}</td>
                )}
                {totalAmount > 0 && (
                  <td className="border border-gray-300 p-2 text-right font-semibold">{item.totalPrice ? item.totalPrice.toLocaleString('vi-VN') : '-'}</td>
                )}
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={5} className="border border-gray-300 p-2 text-right uppercase">Tổng khối lượng tịnh:</td>
              <td className="border border-gray-300 p-2 text-right text-sky-900 font-extrabold">{totalNetWeight.toLocaleString('vi-VN')} kg</td>
              {totalAmount > 0 && <td className="border border-gray-300 p-2 text-right uppercase">Tổng tiền:</td>}
              {totalAmount > 0 && <td className="border border-gray-300 p-2 text-right text-emerald-800 font-extrabold">{totalAmount.toLocaleString('vi-VN')} đ</td>}
            </tr>
          </tbody>
        </table>

        {note && (
          <div className="text-xs italic mb-4">
            <span className="font-semibold text-gray-700">Ghi chú:</span> {note}
          </div>
        )}

        {/* Chữ ký 2 bên */}
        <div className="grid grid-cols-3 gap-4 text-center mt-8 pt-4">
          <div>
            <div className="font-bold text-sm text-gray-800">Người giao hàng</div>
            <div className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</div>
            <div className="h-16"></div>
          </div>
          <div>
            <div className="font-bold text-sm text-gray-800">Thủ kho hải sản</div>
            <div className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</div>
            <div className="h-16"></div>
            <div className="font-medium text-xs text-gray-700">{createdByName}</div>
          </div>
          <div>
            <div className="font-bold text-sm text-gray-800">Người nhận hàng</div>
            <div className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</div>
            <div className="h-16"></div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
