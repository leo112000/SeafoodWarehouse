import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Input, Space, Alert, Typography } from 'antd';
import { QrcodeOutlined, BarcodeOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

const { Text } = Typography;

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onClose,
  onScanSuccess,
  title = 'Quét mã Barcode / QR Code',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  void isScanning;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    setCameraError(null);
    setManualCode('');

    // Start camera scanning when modal opens
    const timer = setTimeout(() => {
      startCamera();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5Qrcode = new Html5Qrcode(containerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' }, // Dùng camera sau nếu là điện thoại
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Ignore frame decode errors
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      setCameraError('Không thể mở Camera. Vui lòng cho phép truy cập camera hoặc dùng máy quét cầm tay.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore stop error
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccess = (code: string) => {
    if (!code) return;
    stopCamera();
    onScanSuccess(code.trim());
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
    }
  };

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined className="text-sky-500 text-lg" />
          <span>{title}</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        stopCamera();
        onClose();
      }}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      destroyOnClose
      centered
      width={480}
    >
      <div className="flex flex-col items-center justify-center my-2">
        <div
          id={containerId}
          className="w-full max-w-[360px] h-[260px] bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-sky-500"
        />

        {cameraError && (
          <Alert
            message="Thông báo Camera"
            description={cameraError}
            type="warning"
            showIcon
            className="mt-3 w-full"
          />
        )}

        <div className="w-full mt-4 border-t pt-3">
          <Text type="secondary" className="text-xs mb-1 block">
            <BarcodeOutlined /> Nhập thủ công hoặc quét bằng Máy quét mã vạch cầm tay:
          </Text>
          <Space.Compact className="w-full">
            <Input
              placeholder="Nhập mã barcode/QR..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onPressEnter={handleManualSubmit}
              autoFocus
            />
            <Button type="primary" onClick={handleManualSubmit}>
              Xác nhận
            </Button>
          </Space.Compact>
        </div>
      </div>
    </Modal>
  );
};
