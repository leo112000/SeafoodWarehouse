import React, { useEffect, useState } from 'react';
import { Table, Card, Row, Col, Input, Select, Tag, Button, Modal, Descriptions } from 'antd';
import { SearchOutlined, ReloadOutlined, DatabaseOutlined, SafetyCertificateOutlined, AlertOutlined, EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { useProductStore } from '../../stores/useProductStore';
import dayjs from 'dayjs';
import type { InventoryItemDto } from '../../services/inventoryService';
import { settingService } from '../../services/settingService';

const { Option } = Select;

export const InventoryStockPage: React.FC = () => {
  const { items, totalCount, loading, pageNumber, pageSize, fetchInventory } = useInventoryStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const { products, fetchProducts } = useProductStore();

  const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>(undefined);
  const [selectedProduct, setSelectedProduct] = useState<number | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>('');
  const [detailItem, setDetailItem] = useState<InventoryItemDto | null>(null);
  const [expiringAlertDays, setExpiringAlertDays] = useState<number>(15);

  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
    fetchProducts();
    settingService.getSettings().then(s => {
      if (s && s.expiringAlertDays) {
        setExpiringAlertDays(s.expiringAlertDays);
      }
    }).catch(() => {});
  }, []);

  const handleSearch = () => {
    fetchInventory({
      pageNumber: 1,
      warehouseId: selectedWarehouse,
      productId: selectedProduct,
      search: searchText,
    });
  };

  const handleReset = () => {
    setSelectedWarehouse(undefined);
    setSelectedProduct(undefined);
    setSearchText('');
    fetchInventory({
      pageNumber: 1,
      warehouseId: undefined,
      productId: undefined,
      search: '',
    });
  };

  // Metrics
  const totalStockKg = items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalEstValue = items.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.unitPrice || 0)), 0);
  const nearExpiryCount = items.filter(item => {
    if (!item.expirationDate || (item.quantity || 0) <= 0) return false;
    const diffDays = dayjs(item.expirationDate).diff(dayjs(), 'day');
    return diffDays >= 0 && diffDays <= expiringAlertDays;
  }).length;

  const columns = [
    {
      title: 'Mã lô',
      dataIndex: 'batchCode',
      key: 'batchCode',
      render: (text: string, record: InventoryItemDto) => (
        <span className="font-semibold text-sky-600 dark:text-sky-400 cursor-pointer" onClick={() => setDetailItem(record)}>
          {text || `LOT-${record.lotBatchId}`}
        </span>
      ),
    },
    {
      title: 'Sản phẩm hải sản',
      dataIndex: 'productName',
      key: 'productName',
      render: (text: string, record: InventoryItemDto) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{text || `SP #${record.productId}`}</div>
          {record.productCode && <div className="text-xs text-gray-400">Mã: {record.productCode}</div>}
        </div>
      ),
    },
    {
      title: 'Kho lưu trữ',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      render: (text: string, record: InventoryItemDto) => (
        <Tag icon={<EnvironmentOutlined />} color="blue">
          {text || `Kho #${record.warehouseId}`}
        </Tag>
      ),
    },
    {
      title: 'Vị trí kệ',
      dataIndex: 'storageBin',
      key: 'storageBin',
      render: (text: string) => (
        <Tag color="cyan">{text || 'Kệ chính'}</Tag>
      ),
    },
    {
      title: 'Số lượng tồn',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (val: number, record: InventoryItemDto) => (
        <span className="font-bold text-emerald-600 text-base">
          {val?.toLocaleString() || 0} {record.unit || 'kg'}
        </span>
      ),
    },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (dateStr: string) => {
        if (!dateStr) return <span className="text-gray-400">N/A</span>;
        const exp = dayjs(dateStr);
        const now = dayjs();
        const diffDays = exp.diff(now, 'day');

        if (diffDays < 0) {
          return <Tag color="error">Hết hạn ({exp.format('DD/MM/YYYY')})</Tag>;
        } else if (diffDays <= expiringAlertDays) {
          return <Tag color="warning">Hạn ngắn: {diffDays} ngày ({exp.format('DD/MM/YYYY')})</Tag>;
        }
        return <Tag color="success">{exp.format('DD/MM/YYYY')}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: InventoryItemDto) => (
        <Button size="small" icon={<InfoCircleOutlined />} onClick={() => setDetailItem(record)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card className="shadow-sm border-l-4 border-l-sky-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tổng Tồn Kho Hiện Tại</div>
                <div className="text-2xl font-extrabold text-sky-600 mt-1">
                  {totalStockKg.toLocaleString()} <span className="text-sm font-normal text-gray-500">kg</span>
                </div>
              </div>
              <div className="p-3 bg-sky-50 rounded-full text-sky-500">
                <DatabaseOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ước Tính Giá Trị Hàng</div>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {totalEstValue.toLocaleString()} <span className="text-sm font-normal text-gray-500">VNĐ</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-500">
                <SafetyCertificateOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card className="shadow-sm border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Lô Hàng Cận Date ({expiringAlertDays} Ngày)</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">
                  {nearExpiryCount} <span className="text-sm font-normal text-gray-500">lô hàng</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-full text-amber-500">
                <AlertOutlined style={{ fontSize: 24 }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter & Action Bar */}
      <Card className="shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            <Input
              placeholder="Tìm theo Mã lô..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              className="w-full md:w-56"
            />
            <Select
              placeholder="Chọn Kho lạnh"
              allowClear
              value={selectedWarehouse}
              onChange={(val) => setSelectedWarehouse(val)}
              className="w-full md:w-48"
            >
              {warehouses.map((w) => (
                <Option key={w.id} value={w.id}>{w.name}</Option>
              ))}
            </Select>
            <Select
              placeholder="Chọn Loại Hải Sản"
              allowClear
              value={selectedProduct}
              onChange={(val) => setSelectedProduct(val)}
              className="w-full md:w-48"
            >
              {products.map((p) => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Lọc Dữ Liệu
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Đặt lại
            </Button>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card title="📦 Danh Sách Chi Tiết Tồn Kho Hải Sản" className="shadow-sm">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{
            current: pageNumber,
            pageSize: pageSize,
            total: totalCount,
            onChange: (page, pSize) => fetchInventory({ pageNumber: page, pageSize: pSize }),
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} vị trí hàng tồn kho`,
          }}
        />
      </Card>

      {/* Lot Detail Modal */}
      <Modal
        title={`Chi Tiết Lô Hàng: ${detailItem?.batchCode || `LOT-${detailItem?.lotBatchId}`}`}
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button key="close" onClick={() => setDetailItem(null)}>Đóng</Button>
        ]}
        width={600}
      >
        {detailItem && (
          <Descriptions column={2} bordered size="small" className="mt-4">
            <Descriptions.Item label="Mã lô">{detailItem.batchCode || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Sản phẩm">{detailItem.productName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Kho lưu giữ">{detailItem.warehouseName || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Vị trí kệ">{detailItem.storageBin || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Số lượng tồn">{detailItem.quantity} {detailItem.unit || 'kg'}</Descriptions.Item>
            <Descriptions.Item label="Đơn giá nhập">{detailItem.unitPrice?.toLocaleString()} VNĐ/kg</Descriptions.Item>
            <Descriptions.Item label="Ngày sản xuất">{detailItem.productionDate ? dayjs(detailItem.productionDate).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Hạn sử dụng">{detailItem.expirationDate ? dayjs(detailItem.expirationDate).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Phân loại">{detailItem.grade || 'Grade A'}</Descriptions.Item>
            <Descriptions.Item label="Nhà cung cấp">{detailItem.supplierName || 'N/A'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default InventoryStockPage;
