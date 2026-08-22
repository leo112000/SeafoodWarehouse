import React from 'react';
import { Modal, Button } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { PrinterOutlined, QrcodeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export interface LotQrLabelProps {
  open: boolean;
  onClose: () => void;
  lotNumber: string;
  productName: string;
  productCode?: string;
  netWeightKg: number;
  receivedDate: string | Date;
  expirationDate?: string | Date;
  warehouseName?: string;
  supplierName?: string;
  storageTemp?: string;
  tenantName?: string;
}

export const LotQrLabelModal: React.FC<LotQrLabelProps> = ({
  open,
  onClose,
  lotNumber,
  productName,
  productCode,
  netWeightKg,
  receivedDate,
  expirationDate,
  warehouseName,
  supplierName,
  storageTemp = '-18°C ~ -25°C',
  tenantName,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    lot: lotNumber,
    pCode: productCode,
    pName: productName,
    weight: netWeightKg,
    exp: expirationDate ? dayjs(expirationDate).format('YYYY-MM-DD') : '',
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={480}
      title={
        <span className="flex items-center gap-2 text-sky-600 font-bold">
          <QrcodeOutlined /> In Tem Mã QR Lô Hải Sản (Dán Thùng)
        </span>
      }
      footer={[
        <Button key="close" onClick={onClose} className="print:hidden">
          Đóng
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} className="print:hidden">
          In Tem Nhiệt (Thermal Print)
        </Button>,
      ]}
    >
      <div className="flex justify-center my-4">
        {/* Tem nhãn in nhiệt 100mm x 75mm */}
        <div
          id="printable-qr-label"
          className="w-96 border-2 border-dashed border-gray-400 bg-white p-4 text-gray-900 rounded-lg shadow-sm print:border-none print:shadow-none"
        >
          <div className="text-center border-b pb-2 mb-3">
            <div className="font-extrabold text-sm uppercase text-sky-800">
              {tenantName || 'KHO THỦY HẢI SẢN TƯƠI SỐNG'}
            </div>
            <div className="text-xs font-semibold text-gray-600">TEM TRUY XUẤT NGUỒN GỐC LÔ HÀNG</div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="bg-gray-50 p-2 border rounded-md">
              <QRCodeSVG value={qrData} size={110} level="M" />
              <div className="text-center font-mono text-[10px] mt-1 font-bold text-gray-700">{lotNumber}</div>
            </div>

            <div className="flex-1 text-xs space-y-1">
              <div>
                <span className="text-gray-500">Sản phẩm:</span>{' '}
                <span className="font-bold text-sm text-gray-900 block leading-tight">{productName}</span>
              </div>
              <div>
                <span className="text-gray-500">Khối lượng tịnh:</span>{' '}
                <span className="font-extrabold text-sky-700 text-sm">{netWeightKg.toLocaleString('vi-VN')} kg</span>
              </div>
              <div>
                <span className="text-gray-500">Ngày đóng gói/nhập:</span>{' '}
                <span className="font-medium text-gray-800">{dayjs(receivedDate).format('DD/MM/YYYY')}</span>
              </div>
              {expirationDate && (
                <div>
                  <span className="text-gray-500">Hạn sử dụng (Best before):</span>{' '}
                  <span className="font-bold text-amber-700">{dayjs(expirationDate).format('DD/MM/YYYY')}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Bảo quản:</span>{' '}
                <span className="font-medium text-gray-800">{storageTemp}</span>
              </div>
            </div>
          </div>

          <div className="border-t mt-3 pt-2 text-[10px] text-gray-500 flex justify-between">
            <div>Kho: {warehouseName || 'Kho chính'}</div>
            <div>{supplierName ? `Nguồn: ${supplierName}` : 'Đạt chuẩn VSATTP'}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
