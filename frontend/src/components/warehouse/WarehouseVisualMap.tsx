import React, { useState } from 'react';
import { Card, Row, Col, Tag, Tooltip, Button, Drawer, Progress, Empty } from 'antd';
import {
  InboxOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  WarningFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { InventoryItemDto } from '../../services/inventoryService';

export interface WarehouseZone {
  id: string;
  code: string;
  name: string;
  tempCategory: 'DEEP_FREEZE' | 'COLD_STORAGE' | 'LIVE_TANK' | 'DRY_CHILL';
  tempRange: string;
  currentTemp: number;
  totalCapacityKg: number;
  racks: WarehouseRack[];
}

export interface WarehouseRack {
  id: string;
  code: string;
  name: string;
  bins: WarehouseBin[];
}

export interface WarehouseBin {
  id: string;
  code: string;
  maxWeightKg: number;
  allowedCategories?: string[];
  status?: 'NORMAL' | 'NEAR_EXPIRY' | 'FULL' | 'EMPTY';
}

interface WarehouseVisualMapProps {
  warehouseId?: number;
  warehouseName?: string;
  inventoryItems: InventoryItemDto[];
  onQuickAction?: (actionType: 'OUTBOUND' | 'TRANSFER', item: InventoryItemDto) => void;
}

export const WarehouseVisualMap: React.FC<WarehouseVisualMapProps> = ({
  warehouseName = 'Tổng Kho Lạnh Thủy Hải Sản',
  inventoryItems,
  onQuickAction,
}) => {
  const [selectedBin, setSelectedBin] = useState<{ binCode: string; zoneName: string; rackName: string } | null>(null);

  // Mẫu sơ đồ phân khu Kho lạnh hải sản chuẩn công nghiệp
  const zones: WarehouseZone[] = [
    {
      id: 'ZONE-A',
      code: 'A',
      name: 'Khu Cấp Đông Sâu (Cá & Mực)',
      tempCategory: 'DEEP_FREEZE',
      tempRange: '-25°C ~ -18°C',
      currentTemp: -21.4,
      totalCapacityKg: 50000,
      racks: [
        {
          id: 'RACK-A1',
          code: 'Kệ A1',
          name: 'Dãy Kệ Cá Thu & Cá Hồi',
          bins: [
            { id: 'A1-01', code: 'A1-01', maxWeightKg: 1000 },
            { id: 'A1-02', code: 'A1-02', maxWeightKg: 1000 },
            { id: 'A1-03', code: 'A1-03', maxWeightKg: 1000 },
            { id: 'A1-04', code: 'A1-04', maxWeightKg: 1000 },
          ],
        },
        {
          id: 'RACK-A2',
          code: 'Kệ A2',
          name: 'Dãy Kệ Mực & Bạch Tuộc Cấp Đông',
          bins: [
            { id: 'A2-01', code: 'A2-01', maxWeightKg: 1000 },
            { id: 'A2-02', code: 'A2-02', maxWeightKg: 1000 },
            { id: 'A2-03', code: 'A2-03', maxWeightKg: 1000 },
            { id: 'A2-04', code: 'A2-04', maxWeightKg: 1000 },
          ],
        },
      ],
    },
    {
      id: 'ZONE-B',
      code: 'B',
      name: 'Khu Kho Mát & Trữ Đông Vừa (Tôm & Cua)',
      tempCategory: 'COLD_STORAGE',
      tempRange: '-18°C ~ -10°C',
      currentTemp: -14.8,
      totalCapacityKg: 40000,
      racks: [
        {
          id: 'RACK-B1',
          code: 'Kệ B1',
          name: 'Dãy Kệ Tôm Sú & Tôm Thẻ',
          bins: [
            { id: 'B1-01', code: 'B1-01', maxWeightKg: 800 },
            { id: 'B1-02', code: 'B1-02', maxWeightKg: 800 },
            { id: 'B1-03', code: 'B1-03', maxWeightKg: 800 },
            { id: 'B1-04', code: 'B1-04', maxWeightKg: 800 },
          ],
        },
        {
          id: 'RACK-B2',
          code: 'Kệ B2',
          name: 'Dãy Kệ Cua & Ghẹ Trữ Lạnh',
          bins: [
            { id: 'B2-01', code: 'B2-01', maxWeightKg: 800 },
            { id: 'B2-02', code: 'B2-02', maxWeightKg: 800 },
            { id: 'B2-03', code: 'B2-03', maxWeightKg: 800 },
            { id: 'B2-04', code: 'B2-04', maxWeightKg: 800 },
          ],
        },
      ],
    },
    {
      id: 'ZONE-C',
      code: 'C',
      name: 'Khu Bể Thở & Hải Sản Sống Oxy',
      tempCategory: 'LIVE_TANK',
      tempRange: '15°C ~ 18°C (Nước mặn)',
      currentTemp: 16.5,
      totalCapacityKg: 15000,
      racks: [
        {
          id: 'RACK-C1',
          code: 'Kệ C1',
          name: 'Dãy Bể Oxy Tôm Hùm & Cua Huỳnh Đế',
          bins: [
            { id: 'C1-01', code: 'C1-01', maxWeightKg: 500 },
            { id: 'C1-02', code: 'C1-02', maxWeightKg: 500 },
            { id: 'C1-03', code: 'C1-03', maxWeightKg: 500 },
            { id: 'C1-04', code: 'C1-04', maxWeightKg: 500 },
          ],
        },
      ],
    },
  ];

  // Map danh sách items theo từng ô chứa binCode
  const getItemsInBin = (binCode: string) => {
    return inventoryItems.filter(
      (item) =>
        (item.storageBin && item.storageBin.toUpperCase() === binCode.toUpperCase()) ||
        (!item.storageBin && binCode === 'A1-01') // Fallback default
    );
  };

  const getBinStats = (bin: WarehouseBin) => {
    const items = getItemsInBin(bin.code);
    const totalKg = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const fillPercent = Math.min(100, Math.round((totalKg / bin.maxWeightKg) * 100));

    const hasNearExpiry = items.some((i) => {
      if (!i.expirationDate) return false;
      const days = dayjs(i.expirationDate).diff(dayjs(), 'day');
      return days >= 0 && days <= 15;
    });

    const hasExpired = items.some((i) => {
      if (!i.expirationDate) return false;
      return dayjs(i.expirationDate).diff(dayjs(), 'day') < 0;
    });

    return {
      items,
      totalKg,
      fillPercent,
      hasNearExpiry,
      hasExpired,
      count: items.length,
    };
  };

  const selectedBinItems = selectedBin ? getItemsInBin(selectedBin.binCode) : [];
  const selectedBinTotalKg = selectedBinItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Sơ Đồ */}
      <div className="p-4 bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <h2 className="text-xl font-bold text-white m-0">{warehouseName}</h2>
            <Tag color="cyan" className="font-semibold ml-2">Bản đồ tương tác 2D</Tag>
          </div>
          <p className="text-xs text-sky-200 mt-1 mb-0">
            Giám sát nhiệt độ buồng lạnh, tỷ lệ lấp đầy từng dãy kệ và vị trí chi tiết của từng lô hải sản.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 bg-sky-950/60 p-2.5 rounded-lg border border-sky-700/50 text-xs">
          <span className="text-gray-300 font-medium">Trạng thái ô:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Trống/Dưới 50%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 50% - 85%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Đầy/Quá tải (&gt;85%)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 animate-pulse inline-block" /> Có Lô Cận Date</span>
        </div>
      </div>

      {/* Danh sách các Phân Khu (Zones) */}
      <div className="space-y-6">
        {zones.map((zone) => {
          const zoneItems = inventoryItems.filter(
            (i) => i.storageBin && i.storageBin.toUpperCase().startsWith(zone.code)
          );
          const zoneTotalKg = zoneItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
          const zonePercent = Math.min(100, Math.round((zoneTotalKg / zone.totalCapacityKg) * 100));

          return (
            <Card
              key={zone.id}
              className="shadow-sm border-t-4 border-t-sky-600 rounded-xl overflow-hidden"
              title={
                <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                      {zone.code}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-100 text-base">{zone.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag color="geekblue" className="m-0 font-medium">
                      ❄️ Chuẩn: {zone.tempRange}
                    </Tag>
                    <Tag color={zone.currentTemp <= -18 ? 'success' : 'warning'} className="m-0 font-bold">
                      🌡️ Cảm biến: {zone.currentTemp}°C
                    </Tag>
                  </div>
                </div>
              }
              extra={
                <div className="flex items-center gap-2 w-48 text-xs">
                  <span className="text-gray-500 whitespace-nowrap">Lấp đầy:</span>
                  <Progress percent={zonePercent} size="small" status={zonePercent > 85 ? 'exception' : 'active'} />
                </div>
              }
            >
              <div className="space-y-4">
                {zone.racks.map((rack) => (
                  <div key={rack.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <AppstoreOutlined className="text-sky-500" />
                        {rack.name} ({rack.code})
                      </span>
                      <span className="text-[11px] text-gray-400">4 Ô Chứa Tiêu Chuẩn</span>
                    </div>

                    <Row gutter={[12, 12]}>
                      {rack.bins.map((bin) => {
                        const stats = getBinStats(bin);

                        // Phân màu theo tình trạng
                        let bgClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-500';
                        let badgeColor = '#10b981';

                        if (stats.hasExpired || stats.hasNearExpiry) {
                          bgClass = 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 hover:border-purple-500';
                          badgeColor = '#a855f7';
                        } else if (stats.fillPercent >= 85) {
                          bgClass = 'bg-red-50/70 dark:bg-red-950/40 border-red-300 dark:border-red-800 hover:border-red-500';
                          badgeColor = '#ef4444';
                        } else if (stats.fillPercent >= 50) {
                          bgClass = 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 hover:border-amber-500';
                          badgeColor = '#f59e0b';
                        }

                        return (
                          <Col xs={12} sm={6} md={6} key={bin.id}>
                            <div
                              onClick={() => setSelectedBin({ binCode: bin.code, zoneName: zone.name, rackName: rack.name })}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md relative ${bgClass}`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{bin.code}</span>
                                {stats.hasNearExpiry && (
                                  <Tooltip title="Có lô hàng cận hạn sử dụng!">
                                    <WarningFilled className="text-purple-600 text-sm animate-bounce" />
                                  </Tooltip>
                                )}
                              </div>

                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                  <span>Tồn:</span>
                                  <strong className="text-slate-900 dark:text-slate-100">{stats.totalKg.toLocaleString()} / {bin.maxWeightKg} kg</strong>
                                </div>
                                <Progress
                                  percent={stats.fillPercent}
                                  strokeColor={badgeColor}
                                  showInfo={false}
                                  size={['100%', 6]}
                                />
                                <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
                                  <span>{stats.count} lô hàng</span>
                                  <span className="font-medium" style={{ color: badgeColor }}>{stats.fillPercent}%</span>
                                </div>
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Drawer Chi Tiết Ô Chứa Hàng (Bin Details) */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <div>
              <div className="font-bold text-base">Chi Tiết Ô Lưu Trữ: {selectedBin?.binCode}</div>
              <div className="text-xs text-gray-400 font-normal">{selectedBin?.zoneName} &bull; {selectedBin?.rackName}</div>
            </div>
          </div>
        }
        placement="right"
        width={450}
        onClose={() => setSelectedBin(null)}
        open={!!selectedBin}
      >
        {selectedBin && (
          <div className="space-y-4">
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">Tổng khối lượng đang chứa</span>
                <div className="text-xl font-black text-sky-900 dark:text-sky-100 mt-0.5">
                  {selectedBinTotalKg.toLocaleString()} <span className="text-xs font-normal">kg</span>
                </div>
              </div>
              <Tag color="blue" className="m-0 text-xs px-2.5 py-1 font-semibold">
                {selectedBinItems.length} Lô Hải Sản
              </Tag>
            </div>

            <div className="font-bold text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <InboxOutlined className="text-sky-500" />
              Danh sách các lô tại vị trí này:
            </div>

            {selectedBinItems.length === 0 ? (
              <Empty description="Ô này hiện đang trống, sẵn sàng tiếp nhận hàng nhập kho mới." className="my-8" />
            ) : (
              <div className="space-y-3">
                {selectedBinItems.map((item) => {
                  const daysToExpire = item.expirationDate ? dayjs(item.expirationDate).diff(dayjs(), 'day') : 999;
                  const isExpiring = daysToExpire >= 0 && daysToExpire <= 15;
                  const isExpired = daysToExpire < 0;

                  return (
                    <Card
                      key={item.id}
                      size="small"
                      className="shadow-sm border-l-4 rounded-lg"
                      style={{
                        borderLeftColor: isExpired ? '#ef4444' : isExpiring ? '#a855f7' : '#0284c7',
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-gray-800 dark:text-gray-100">
                            {item.productName || `Hải sản #${item.productId}`}
                          </div>
                          <span className="text-xs text-sky-600 font-mono font-semibold">
                            {item.batchCode || `LOT-${item.lotBatchId}`}
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-600 text-sm">
                          {item.quantity?.toLocaleString()} {item.unit || 'kg'}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Hạn sử dụng:</span>
                          <span className="font-medium">
                            {item.expirationDate ? dayjs(item.expirationDate).format('DD/MM/YYYY') : 'N/A'}
                            {isExpiring && <Tag color="warning" className="ml-1 text-[10px]">Cận hạn {daysToExpire} ngày</Tag>}
                            {isExpired && <Tag color="error" className="ml-1 text-[10px]">Đã quá hạn</Tag>}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Đơn giá nhập:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {item.unitPrice?.toLocaleString()} VNĐ/kg
                          </span>
                        </div>
                      </div>

                      {onQuickAction && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="small"
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            className="w-full bg-emerald-600 text-xs"
                            onClick={() => {
                              onQuickAction('OUTBOUND', item);
                              setSelectedBin(null);
                            }}
                          >
                            Xuất nhanh lô này
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
