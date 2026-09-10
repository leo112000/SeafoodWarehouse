import React, { useEffect, useState } from 'react';
import { Table, Card, Row, Col, Input, Select, Tag, Button, Modal, Descriptions, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, DatabaseOutlined, SafetyCertificateOutlined, AlertOutlined, EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useInventoryStore } from '../../stores/useInventoryStore';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { useProductStore } from '../../stores/useProductStore';
import dayjs from 'dayjs';
import type { InventoryItemDto } from '../../services/inventoryService';
import { settingService } from '../../services/settingService';
import { ZoomViewerModal, ZoomButton } from '../../components/common/ZoomViewerModal';

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
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
    fetchProducts();
    settingService.getSettings().then(s => {
      if (s && s.expiringAlertDays) {
        setExpiringAlertDays(s.expiringAlertDays);
      }
    }).catch(() => { });
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

  const handleExportExcel = () => {
    const exportData = items.map((item, idx) => ({
      'STT': idx + 1,
      'Mã Lô Hàng': item.batchCode,
      'Tên Hải Sản': item.productName,
      'Mã Sản Phẩm': item.productCode,
      'Kho Lưu Trữ': item.warehouseName || `Kho #${item.warehouseId}`,
      'Vị Trí Kệ': item.storageBin || 'Kệ chính',
      'Số Lượng Tồn (kg)': item.quantity,
      'Đơn Vị': item.unit || 'kg',
      'Đơn Giá (VNĐ)': item.unitPrice || 0,
      'Thành Tiền (VNĐ)': (item.quantity || 0) * (item.unitPrice || 0),
      'Ngày Sản Xuất/Nhập': item.productionDate ? dayjs(item.productionDate).format('DD/MM/YYYY') : '',
      'Hạn Sử Dụng': item.expirationDate ? dayjs(item.expirationDate).format('DD/MM/YYYY') : '',
    }));
    import('../../utils/excelExport').then(({ exportToExcel }) => {
      exportToExcel(exportData, 'Bao_Cao_Ton_Kho_Hai_San', 'Ton_Kho');
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
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pageNumber - 1) * pageSize + index + 1,
    },
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
      {/* ── Page Header: Tiêu đề trang & Nút xuất Excel ngang hàng ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
            Tồn Kho Hiện Tại
          </h1>
        </div>
        <Button
          type="default"
          size="middle"
          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium flex items-center justify-center gap-1.5 shrink-0"
          onClick={handleExportExcel}
        >
          <span>📥</span>
          <span className="hidden sm:inline">Xuất Excel</span>
          <span className="sm:hidden">Xuất Excel</span>
        </Button>
      </div>

      {/* Metrics Row: 3 thẻ chia 3 cột trên cùng 1 dòng, tối ưu chiều dọc tối đa */}
      <Row gutter={[8, 8]}>
        <Col xs={8} sm={8}>
          <Card className="shadow-xs border-l-4 border-l-sky-500 rounded-xl h-full" styles={{ body: { padding: '10px 8px' } }}>
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">Tổng Tồn Kho</div>
                <div className="text-sm sm:text-2xl font-black text-sky-600 mt-0.5 truncate">
                  {totalStockKg.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-gray-500">kg</span>
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500 shrink-0 hidden sm:flex">
                <DatabaseOutlined className="text-base sm:text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card className="shadow-xs border-l-4 border-l-emerald-500 rounded-xl h-full" styles={{ body: { padding: '10px 8px' } }}>
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">Ước Tính Giá Trị</div>
                <div className="text-sm sm:text-2xl font-black text-emerald-600 mt-0.5 truncate">
                  {totalEstValue >= 1_000_000
                    ? `${(totalEstValue / 1_000_000).toFixed(1)} tr`
                    : `${totalEstValue.toLocaleString()}`}{' '}
                  <span className="text-[10px] sm:text-xs font-normal text-gray-500">VNĐ</span>
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 shrink-0 hidden sm:flex">
                <SafetyCertificateOutlined className="text-base sm:text-xl" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={8} sm={8}>
          <Card className="shadow-xs border-l-4 border-l-amber-500 rounded-xl h-full" styles={{ body: { padding: '10px 8px' } }}>
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">Cận Date ({expiringAlertDays}n)</div>
                <div className="text-sm sm:text-2xl font-black text-amber-600 mt-0.5 truncate">
                  {nearExpiryCount} <span className="text-[10px] sm:text-xs font-normal text-gray-500">lô</span>
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-500 shrink-0 hidden sm:flex">
                <AlertOutlined className="text-base sm:text-xl" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter & Action Bar: Chia 2 cột trên mobile, dàn ngang trên desktop */}
      <Card className="shadow-xs rounded-xl" styles={{ body: { padding: '10px 12px' } }}>
        <div className="grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
          {/* Ô 1: Tìm theo mã lô */}
          <div className="col-span-1 lg:w-48">
            <Input
              placeholder="Tìm theo Mã lô..."
              prefix={<SearchOutlined className="text-gray-400 text-xs" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              size="middle"
              className="w-full"
            />
          </div>

          {/* Ô 2: Chọn Kho lạnh */}
          <div className="col-span-1 lg:w-40">
            <Select
              placeholder="Chọn Kho"
              allowClear
              showSearch
              optionFilterProp="children"
              value={selectedWarehouse}
              onChange={(val) => setSelectedWarehouse(val)}
              className="w-full"
              size="middle"
            >
              {warehouses.map((w) => (
                <Option key={w.id} value={w.id}>{w.name}</Option>
              ))}
            </Select>
          </div>

          {/* Ô 3: Chọn Loại Hải Sản */}
          <div className="col-span-1 lg:w-40">
            <Select
              placeholder="Chọn Loại Hải Sản"
              allowClear
              showSearch
              optionFilterProp="children"
              value={selectedProduct}
              onChange={(val) => setSelectedProduct(val)}
              className="w-full"
              size="middle"
            >
              {products.map((p) => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
            </Select>
          </div>

          {/* Ô 4: Nút Lọc & Đặt lại */}
          <div className="col-span-1 flex items-center gap-1.5">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              size="middle"
              className="flex-1 font-semibold"
            >
              Lọc
            </Button>
            <Tooltip title="Đặt lại bộ lọc">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                size="middle"
                className="px-2.5"
              />
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card
        title="📦 Danh Sách Chi Tiết Tồn Kho Hải Sản"
        extra={<ZoomButton onClick={() => setIsZoomed(true)} />}
        className="shadow-sm rounded-2xl overflow-hidden"
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          scroll={{ x: 950 }}
          pagination={{
            current: pageNumber,
            pageSize: pageSize,
            total: totalCount,
            onChange: (page, pSize) => fetchInventory({ pageNumber: page, pageSize: pSize }),
            showSizeChanger: true,
            responsive: true,
            showTotal: (total) => `Tổng ${total} vị trí hàng`,
          }}
        />
      </Card>

      {/* Lot Detail Modal */}
      <Modal
        title={`Chi Tiết Lô Hàng: ${detailItem?.batchCode || `LOT-${detailItem?.lotBatchId}`}`}
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailItem(null)}>Đóng</Button>
        ]}
        width={600}
        centered
      >
        {detailItem && (
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="mt-4">
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

      {/* Modal Phóng To Bảng Tồn Kho & Quay Ngang */}
      <ZoomViewerModal
        open={isZoomed}
        onClose={() => setIsZoomed(false)}
        title="📦 Danh Sách Chi Tiết Tồn Kho Hải Sản"
        subtitle={`Hiển thị ${items.length} lô hàng trên tổng số ${totalCount} vị trí lưu trữ`}
      >
        {({ isRotated }) => (
          <div className="w-full h-full flex flex-col">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={items}
              loading={loading}
              scroll={{ x: 1000, y: isRotated ? 'calc(100vw - 190px)' : 'calc(100vh - 240px)' }}
              pagination={{
                current: pageNumber,
                pageSize: pageSize,
                total: totalCount,
                onChange: (page, pSize) => fetchInventory({ pageNumber: page, pageSize: pSize }),
                showSizeChanger: true,
                responsive: true,
                showTotal: (total) => `Tổng ${total} vị trí hàng`,
              }}
            />
          </div>
        )}
      </ZoomViewerModal>
    </div>
  );
};

export default InventoryStockPage;
