import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Input, Space, Alert, Typography, Select } from 'antd';
import { QrcodeOutlined, BarcodeOutlined, CameraOutlined, ReloadOutlined } from '@ant-design/icons';
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
  title = 'Quét Mã QR Code & Mã Vạch (Barcode)',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ value: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [containerId] = useState(() => `scanner-box-${Math.random().toString(36).slice(2, 8)}`);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingRef = useRef<boolean>(false);
  const openTimeRef = useRef<number>(0);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }

    // Stop and clear all existing video tracks in the container
    try {
      const container = document.getElementById(containerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((v) => {
          if (v.srcObject) {
            const stream = v.srcObject as MediaStream;
            stream.getTracks().forEach((t) => t.stop());
            v.srcObject = null;
          }
        });
        container.innerHTML = '';
      }
    } catch {}
    setIsStarted(false);
  };

  const startCamera = async (targetId?: string) => {
    try {
      await stopCamera();

      // Đợi DOM sẵn sàng
      const box = document.getElementById(containerId);
      if (!box) return;

      const html5Qrcode = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = html5Qrcode;

      const config = targetId
        ? { deviceId: { exact: targetId } }
        : { facingMode: 'environment' };

      await html5Qrcode.start(
        config,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.max(180, Math.floor(minEdge * 0.75));
            return { width: edgeSize, height: edgeSize };
          },
        },
        (decodedText) => {
          // Bỏ qua giải mã quá sớm trong 1000ms đầu khi camera vừa mở để tránh dính frame cũ
          if (Date.now() - openTimeRef.current < 1000) return;
          handleSuccess(decodedText);
        },
        () => {}
      );

      setIsStarted(true);
      setCameraError(null);
    } catch (err: any) {
      console.error('Lỗi mở camera:', err);
      setIsStarted(false);
      setCameraError('Không thể khởi động Camera. Hãy chọn thiết bị khác trong danh sách hoặc bấm "Thử kết nối lại".');
    }
  };

  const initDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const opts = devices.map((d) => ({
          value: d.id,
          label: d.label || `Camera (${d.id.slice(0, 8)})`,
        }));
        setCameras(opts);

        // Ưu tiên chọn DroidCam hoặc Camera sau
        const droidCam = devices.find((d) =>
          d.label.toLowerCase().includes('droidcam') || d.label.toLowerCase().includes('source')
        );
        const backCam = devices.find((d) =>
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('sau')
        );
        const chosen = droidCam ? droidCam.id : (backCam ? backCam.id : devices[0].id);
        setSelectedCameraId(chosen);
        await startCamera(chosen);
      } else {
        await startCamera();
      }
    } catch {
      await startCamera();
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    openTimeRef.current = Date.now();
    isHandlingRef.current = false;
    setCameraError(null);
    setManualCode('');

    const timer = setTimeout(() => {
      initDevices();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open]);

  const handleSuccess = (code: string) => {
    if (!code || isHandlingRef.current) return;
    isHandlingRef.current = true;
    console.log('📷 ĐÃ QUÉT ĐƯỢC MÃ:', code);
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
      <div className="flex flex-col items-center justify-center my-2 space-y-3">
        {/* Dropdown danh sách camera */}
        {cameras.length > 1 && (
          <div className="w-full flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-500 font-medium whitespace-nowrap">Chọn Camera:</span>
            <Select
              size="small"
              className="flex-1"
              value={selectedCameraId}
              onChange={(newId) => {
                setSelectedCameraId(newId);
                startCamera(newId);
              }}
              options={cameras}
            />
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={initDevices}
              title="Tìm lại camera"
            />
          </div>
        )}

        {/* Khung Camera trực tiếp */}
        <div
          id={containerId}
          className="w-full max-w-[340px] min-h-[260px] bg-black rounded-xl overflow-hidden shadow-md border-2 border-sky-500 flex items-center justify-center text-white"
        />

        {isStarted && (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            🎯 Đưa <span className="font-semibold text-sky-600">Mã QR</span> hoặc <span className="font-semibold text-emerald-600">Mã vạch</span> vào giữa khung để quét tự động.
          </div>
        )}

        {cameraError && (
          <Alert
            message="Không nhận được hình ảnh Camera"
            description={
              <div className="text-xs space-y-1 mt-1 text-slate-700 dark:text-slate-300">
                <p>{cameraError}</p>
                <div className="pt-2">
                  <Button
                    size="small"
                    type="primary"
                    icon={<CameraOutlined />}
                    onClick={() => startCamera(selectedCameraId)}
                    className="bg-sky-600"
                  >
                    Thử kết nối lại
                  </Button>
                </div>
              </div>
            }
            type="warning"
            showIcon
            className="w-full text-left"
          />
        )}

        <div className="w-full mt-2 border-t pt-3">
          <Text type="secondary" className="text-xs mb-1 block">
            <BarcodeOutlined /> Hoặc nhập mã thủ công:
          </Text>
          <Space.Compact className="w-full">
            <Input
              placeholder="Nhập mã barcode/QR..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onPressEnter={handleManualSubmit}
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

