import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Input, Space, Alert, Typography, Select, Tag, Row, Col, Switch } from 'antd';
import {
  QrcodeOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  SoundOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { audioFeedback } from '../../utils/audioFeedback';
import { useInventoryStore } from '../../stores/useInventoryStore';
import dayjs from 'dayjs';

const { Text } = Typography;

interface HandheldScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectBatch?: (batchCode: string) => void;
}

export const HandheldScannerModal: React.FC<HandheldScannerModalProps> = ({
  open,
  onClose,
  onSelectBatch,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ value: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [continuousScan, setContinuousScan] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [containerId] = useState(() => `handheld-scanner-${Math.random().toString(36).slice(2, 8)}`);

  const { items } = useInventoryStore();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const matchedItem = items.find(
    (i) =>
      i.batchCode?.toLowerCase() === lastScannedCode?.toLowerCase() ||
      i.productCode?.toLowerCase() === lastScannedCode?.toLowerCase() ||
      `LOT-${i.lotBatchId}`.toLowerCase() === lastScannedCode?.toLowerCase()
  );

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
    setIsStarted(false);
  };

  const startCamera = async (targetId?: string) => {
    try {
      await stopCamera();
      const box = document.getElementById(containerId);
      if (!box) return;

      const html5Qrcode = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = html5Qrcode;

      const config = targetId ? { deviceId: { exact: targetId } } : { facingMode: 'environment' };

      await html5Qrcode.start(
        config,
        {
          fps: 15,
          qrbox: (w, h) => {
            const minEdge = Math.min(w, h);
            return { width: Math.floor(minEdge * 0.8), height: Math.floor(minEdge * 0.8) };
          },
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce quét lặp lại trong vòng 1500ms
          if (now - lastScannedTimeRef.current < 1500 && decodedText === lastScannedCode) {
            return;
          }
          lastScannedTimeRef.current = now;
          handleScannedCode(decodedText);
        },
        () => {}
      );

      setIsStarted(true);
      setCameraError(null);
    } catch (err: any) {
      setIsStarted(false);
      setCameraError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập thiết bị.');
    }
  };

  const initDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices.map((d) => ({ value: d.id, label: d.label || `Camera ${d.id.slice(0, 5)}` })));
        const backCam = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('sau'));
        const chosen = backCam ? backCam.id : devices[0].id;
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
    setLastScannedCode(null);
    setCameraError(null);
    const timer = setTimeout(initDevices, 300);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [open]);

  const handleScannedCode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);

    if (soundEnabled) {
      audioFeedback.playSuccess();
    }

    if (!continuousScan) {
      stopCamera();
      if (onSelectBatch) onSelectBatch(cleanCode);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        stopCamera();
        onClose();
      }}
      footer={null}
      destroyOnClose
      centered
      width={680}
      title={
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <span className="font-bold text-base">Chế Độ Máy Quét Cầm Tay (PDA Scanner Mode)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <SoundOutlined />
              <span>Âm báo:</span>
              <Switch size="small" checked={soundEnabled} onChange={setSoundEnabled} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Quét liên tục:</span>
              <Switch size="small" checked={continuousScan} onChange={setContinuousScan} />
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4 my-2">
        <Row gutter={[16, 16]}>
          {/* Cột Camera Viewfinder */}
          <Col xs={24} md={12}>
            <div className="relative rounded-2xl overflow-hidden shadow-inner bg-slate-950 border-2 border-sky-500 min-h-[260px] flex items-center justify-center">
              <div id={containerId} className="w-full h-full" />
              {isStarted && <div className="laser-scan-line pointer-events-none" />}
            </div>

            {cameras.length > 1 && (
              <div className="mt-2 flex items-center gap-2">
                <Select
                  size="small"
                  className="flex-1 text-xs"
                  showSearch
                  optionFilterProp="label"
                  value={selectedCameraId}
                  onChange={(id) => {
                    setSelectedCameraId(id);
                    startCamera(id);
                  }}
                  options={cameras}
                />
                <Button size="small" icon={<ReloadOutlined />} onClick={initDevices} />
              </div>
            )}

            {cameraError && (
              <Alert message={cameraError} type="warning" showIcon className="mt-2 text-xs" />
            )}
          </Col>

          {/* Cột Kết Quả Quét Tức Thì */}
          <Col xs={24} md={12}>
            <div className="h-full flex flex-col justify-between space-y-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[180px]">
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
                  Kết Quả Quét Thời Gian Thực:
                </div>

                {lastScannedCode ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color="cyan" className="font-mono text-sm px-2 py-0.5 font-bold m-0">
                        {lastScannedCode}
                      </Tag>
                      <CheckCircleFilled className="text-emerald-500 text-base" />
                    </div>

                    {matchedItem ? (
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="font-bold text-base text-slate-800 dark:text-slate-100">
                          {matchedItem.productName}
                        </div>
                        <div className="text-gray-500">
                          Kho: <strong className="text-slate-700 dark:text-slate-300">{matchedItem.warehouseName || 'Kho chính'}</strong> &bull; Vị trí: <Tag color="blue" className="m-0 text-[10px]">{matchedItem.storageBin || 'A1-01'}</Tag>
                        </div>
                        <div className="text-gray-500">
                          Số lượng tồn: <strong className="text-emerald-600 font-extrabold text-sm">{matchedItem.quantity} {matchedItem.unit || 'kg'}</strong>
                        </div>
                        <div className="text-gray-500">
                          Hạn dùng: <span className="font-medium">{matchedItem.expirationDate ? dayjs(matchedItem.expirationDate).format('DD/MM/YYYY') : 'Không xác định'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        ⚠️ Mã quét hợp lệ nhưng chưa gắn với lô hàng tồn hiện tại. Có thể dùng để tạo phiếu Nhập/Xuất kho mới.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    <QrcodeOutlined style={{ fontSize: 32 }} className="mb-2 text-sky-400 opacity-60" />
                    <div>Hướng camera vào mã QR / Barcode trên thùng hàng hoặc sọt hải sản</div>
                  </div>
                )}
              </div>

              {/* Nhập mã nhanh thủ công */}
              <div className="space-y-1.5">
                <Text type="secondary" className="text-xs">Nhập mã bằng bàn phím số / Máy bắn tia:</Text>
                <Space.Compact className="w-full">
                  <Input
                    placeholder="Mã lô, mã SP..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onPressEnter={() => {
                      if (manualCode.trim()) {
                        handleScannedCode(manualCode.trim());
                        setManualCode('');
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    className="bg-sky-600"
                    onClick={() => {
                      if (manualCode.trim()) {
                        handleScannedCode(manualCode.trim());
                        setManualCode('');
                      }
                    }}
                  >
                    Tìm
                  </Button>
                </Space.Compact>
              </div>
            </div>
          </Col>
        </Row>

        {/* Nút thao tác điều hướng nhanh */}
        {lastScannedCode && (
          <div className="pt-2 border-t flex flex-wrap items-center justify-end gap-2">
            <Button
              type="primary"
              className="bg-emerald-600 border-none font-semibold"
              icon={<ArrowRightOutlined />}
              onClick={() => {
                stopCamera();
                onClose();
                window.location.href = `/inventory/outbound?batchCode=${encodeURIComponent(lastScannedCode)}`;
              }}
            >
              Tạo Phiếu Xuất Kho Với Mã Này
            </Button>
            <Button
              className="font-semibold"
              onClick={() => {
                stopCamera();
                onClose();
                window.location.href = `/inventory/inbound?batchCode=${encodeURIComponent(lastScannedCode)}`;
              }}
            >
              Tạo Phiếu Nhập Kho
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
