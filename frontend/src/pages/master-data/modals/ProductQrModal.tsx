import React from 'react';
import { Modal, Button } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import type { Product } from '@/types/seafood';

interface ProductQrModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductQrModal: React.FC<ProductQrModalProps> = ({ open, onClose, product }) => {
  return (
    <Modal
      title={
        <span className="text-sky-600 font-bold flex items-center gap-2">
          🏷️ Mã QR Hải Sản: {product?.name ?? ''}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Đóng</Button>,
        <Button key="print" type="primary" onClick={() => window.print()}>In Tem Dán</Button>,
      ]}
      width={420}
    >
      {product && (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-3 border-2 border-dashed border-sky-400 rounded-lg shadow-sm">
            <div className="font-extrabold text-sm uppercase text-sky-800 mb-1">
              KHO THỦY HẢI SẢN WMS
            </div>
            <div className="text-xs font-bold text-gray-800 mb-2">{product.name}</div>
            <div className="flex justify-center my-2">
              <QRCodeSVG value={product.code} size={150} level="H" />
            </div>
            <div className="font-mono text-sm font-bold text-sky-700 mt-1">Mã: {product.code}</div>
            <div className="text-[11px] text-gray-500 mt-1">
              {`Đơn vị: ${product.unit} | Bảo quản: ${product.storageType}`}
            </div>
          </div>
          <p className="text-xs text-gray-500 italic mt-3">
            Dùng điện thoại mở mục "Nhập kho" → Bấm "Quét Mã QR" để nhận diện tự động!
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ProductQrModal;
