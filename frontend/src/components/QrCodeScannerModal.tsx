import React, { useEffect, useRef } from 'react';
import { Modal, Alert } from 'antd';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ScanOutlined } from '@ant-design/icons';

interface QrCodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  open,
  onClose,
  onScanSuccess,
  title = 'Quét Mã QR / Barcode Bằng Camera',
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'reader',
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              scanner.clear().catch(() => {});
              onScanSuccess(decodedText);
              onClose();
            },
            () => {
              // Scan frame ignored
            }
          );

          scannerRef.current = scanner;
        } catch (e) {
          console.error('Lỗi khởi tạo QR scanner:', e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        }
      };
    }
  }, [open]);

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title={
        <span className="flex items-center gap-2 text-sky-600 font-bold">
          <ScanOutlined /> {title}
        </span>
      }
      width={480}
      destroyOnClose
    >
      <div className="space-y-3 py-2">
        <Alert
          type="info"
          showIcon
          message="Hướng camera về phía mã QR hoặc mã vạch trên thùng xốp / sọt hải sản để quét tự động."
        />
        <div id="reader" className="w-full rounded-lg overflow-hidden border border-gray-200" />
        <div className="text-center text-xs text-gray-500 italic">
          Hỗ trợ tất cả camera trên điện thoại Android, iPhone, iPad và Laptop.
        </div>
      </div>
    </Modal>
  );
};
