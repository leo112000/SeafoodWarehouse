import React, { useEffect, useState } from 'react';
import { Select, Button, Typography, Spin } from 'antd';
import { ReloadOutlined, TableOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { WarehouseVisualMap } from '../../components/warehouse/WarehouseVisualMap';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import type { InventoryItemDto } from '../../services/inventoryService';

const { Title, Paragraph } = Typography;

export const WarehouseMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, loading, fetchInventory } = useInventoryStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchInventory({ pageSize: 200 });
    fetchWarehouses();
  }, []);

  const handleQuickAction = (actionType: 'OUTBOUND' | 'TRANSFER', item: InventoryItemDto) => {
    if (actionType === 'OUTBOUND') {
      navigate(`/inventory/outbound?batchCode=${encodeURIComponent(item.batchCode || '')}`);
    }
  };

  const currentWarehouseName = warehouses.find((w) => w.id === selectedWarehouseId)?.name || 'Tổng Kho Lạnh Thủy Hải Sản';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="m-0">Sơ Đồ Kho Lạnh Trực Quan (2D Visual Map)</Title>
          <Paragraph type="secondary" className="mb-0 text-sm">
            Trực quan hóa không gian lưu trữ thực tế, giám sát nhiệt độ và vị trí từng ô kệ kho hải sản.
          </Paragraph>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            placeholder="Chọn Kho lạnh"
            value={selectedWarehouseId}
            onChange={(val) => setSelectedWarehouseId(val)}
            allowClear
            className="w-56"
            options={warehouses.map((w) => ({ value: w.id, label: `🏢 ${w.name}` }))}
          />
          <Button
            icon={<ReloadOutlined spin={loading} />}
            onClick={() => fetchInventory({ pageSize: 200, warehouseId: selectedWarehouseId ? Number(selectedWarehouseId) : undefined })}
          >
            Làm mới
          </Button>
          <Button
            icon={<TableOutlined />}
            onClick={() => navigate('/inventory')}
          >
            Dạng Bảng Dữ Liệu
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-20">
          <Spin size="large" tip="Đang nạp sơ đồ kho..." />
        </div>
      ) : (
        <WarehouseVisualMap
          warehouseId={selectedWarehouseId ? Number(selectedWarehouseId) : undefined}
          warehouseName={currentWarehouseName}
          inventoryItems={items}
          onQuickAction={handleQuickAction}
        />
      )}
    </div>
  );
};

export default WarehouseMapPage;
