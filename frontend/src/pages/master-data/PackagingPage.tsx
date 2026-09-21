import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Select, App, Row, Col } from 'antd';
import {
  PlusOutlined,
  PlusCircleOutlined,
  InboxOutlined,
  ShoppingOutlined,
  CalculatorOutlined,
  ReloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  WarningOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { PackagingType } from '@/types/seafood';
import { packagingService, type PackagingAdjustHistory } from '@/services/packagingService';
import { exportToExcel } from '@/utils/exportUtils';
import {
  PackagingImportModal,
  PackagingFormModal,
  PackagingAdjustModal,
  PackagingHistoryModal,
} from './modals';
import { PackagingTable } from './components';

export const PackagingPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const [packagings, setPackagings] = useState<PackagingType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'LOSS'>('ADD');
  const [selectedPkgForAdjust, setSelectedPkgForAdjust] = useState<PackagingType | null>(null);

  // Lịch sử điều chỉnh (Nhập thêm & Báo hỏng)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<PackagingAdjustHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyActionFilter, setHistoryActionFilter] = useState<'ALL' | 'ADD' | 'LOSS'>('ALL');

  const [editingPkg, setEditingPkg] = useState<PackagingType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CONTAINER' | 'CONSUMABLE'>('ALL');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const handleExportExcel = () => {
    if (packagings.length === 0) {
      message.warning('Không có dữ liệu bao bì để xuất.');
      return;
    }
    const cols = [
      { header: 'Mã bao bì', key: 'code', width: 18 },
      { header: 'Tên bao bì', key: 'name', width: 30 },
      {
        header: 'Phân loại',
        key: 'category',
        width: 20,
        formatter: (val: any) => (val === 'CONTAINER' ? 'Vỏ sọt luân chuyển' : 'Vật tư tiêu hao'),
      },
      { header: 'Trọng lượng bì (Kg)', key: 'defaultTareWeight', width: 20 },
      { header: 'Đơn vị tính', key: 'unit', width: 14 },
      { header: 'Tồn tại kho', key: 'stockQuantity', width: 16 },
      { header: 'Đang cho mượn', key: 'loanedQuantity', width: 18, formatter: (val: any) => val || 0 },
      {
        header: 'Tổng số lượng thật',
        key: 'totalQuantity',
        width: 20,
        formatter: (_val: any, row: any) => row.totalQuantity ?? (row.stockQuantity + (row.loanedQuantity || 0)),
      },
      { header: 'Ghi chú', key: 'note', width: 35 },
    ];
    exportToExcel(packagings, cols, 'Danh_Muc_Bao_Bi', 'Bao bì');
    message.success('Đã xuất file Excel danh mục bao bì thành công!');
  };

  const fetchPackagings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await packagingService.getAll();
      setPackagings(data);
    } catch {
      message.error('Không thể tải danh sách bao bì.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchPackagings();
  }, [fetchPackagings]);

  // Statistics calculations
  const totalTypes = packagings.length;
  const containerCount = packagings.filter(p => p.category === 'CONTAINER').length;
  const consumableCount = packagings.filter(p => p.category === 'CONSUMABLE').length;
  const totalStock = packagings.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalLoaned = packagings.reduce((sum, p) => sum + (p.loanedQuantity || 0), 0);
  const totalAssets = packagings.reduce((sum, p) => sum + (p.totalQuantity ?? (p.stockQuantity + (p.loanedQuantity || 0))), 0);

  const handleOpenAddModal = () => {
    setEditingPkg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: PackagingType) => {
    setEditingPkg(record);
    setIsModalOpen(true);
  };

  const handleDelete = (record: PackagingType) => {
    modal.confirm({
      title: 'Xác nhận xóa bao bì',
      content: `Bạn có chắc chắn muốn xóa danh mục bao bì "${record.name}" (${record.code})?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await packagingService.delete(record.id);
          message.success('Đã xóa danh mục bao bì thành công!');
          fetchPackagings();
        } catch {
          message.error('Không thể xóa bao bì.');
        }
      },
    });
  };

  const handleOpenAdjustModal = (pkg?: PackagingType, mode: 'ADD' | 'LOSS' = 'ADD') => {
    let target = pkg;
    if (!target) {
      if (mode === 'LOSS') {
        target = packagings.find((p) => p.stockQuantity > 0) || packagings[0] || null;
      } else {
        target = packagings[0] || null;
      }
    }
    setSelectedPkgForAdjust(target);
    setAdjustMode(mode);
    setIsAdjustModalOpen(true);
  };

  const fetchAdjustHistory = useCallback(async (pkgId?: number) => {
    setLoadingHistory(true);
    try {
      const data = await packagingService.getAdjustHistory(pkgId);
      setHistoryList(data);
    } catch {
      message.error('Không thể tải lịch sử nhập & báo hỏng.');
    } finally {
      setLoadingHistory(false);
    }
  }, [message]);

  const handleOpenHistoryModal = (pkgId?: number) => {
    fetchAdjustHistory(pkgId);
    setIsHistoryModalOpen(true);
  };

  const filteredPackagings = packagings.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });



  return (
    <div>
      {/* ── Page Header: Tiêu đề trang & Nút Làm mới + Thêm mới ngang hàng ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 m-0 truncate">
          Danh Mục Bao Bì
        </h1>
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
          <Button
            icon={<FileExcelOutlined className="text-emerald-600" />}
            size="middle"
            onClick={handleExportExcel}
            className="font-medium hover:border-emerald-500 hover:text-emerald-600"
          >
            <span className="hidden sm:inline">Xuất Excel</span>
            <span className="sm:hidden">Xuất</span>
          </Button>
          <Button
            icon={<UploadOutlined className="text-emerald-600" />}
            size="middle"
            onClick={() => setIsImportModalOpen(true)}
            className="font-medium border-emerald-500 text-emerald-600 hover:text-emerald-500 hover:border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            <span className="hidden sm:inline">Nhập Excel</span>
            <span className="sm:hidden">Nhập</span>
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchPackagings} loading={loading} size="middle">
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            className="bg-sky-500 hover:bg-sky-600 border-none font-medium"
            size="middle"
          >
            <span className="hidden sm:inline">Thêm Mới</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </div>
      </div>

      {/* ── Sub Action Bar: 3 nút Thao tác Sọt ngang hàng nhau ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <Button
          icon={<PlusCircleOutlined className="text-emerald-500" />}
          onClick={() => handleOpenAdjustModal(undefined, 'ADD')}
          className="w-full flex items-center justify-center font-medium border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
          size="middle"
        >
          <span className="truncate">Nhập Thêm Sọt</span>
        </Button>
        <Button
          danger
          icon={<WarningOutlined />}
          onClick={() => handleOpenAdjustModal(undefined, 'LOSS')}
          className="w-full flex items-center justify-center font-medium"
          size="middle"
        >
          <span className="truncate">Báo Hỏng / Mất</span>
        </Button>
        <Button
          icon={<HistoryOutlined className="text-sky-500" />}
          onClick={() => handleOpenHistoryModal()}
          className="w-full flex items-center justify-center font-medium border-sky-300 dark:border-sky-800 hover:border-sky-500 text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30"
          size="middle"
        >
          <span className="truncate">Lịch Sử Nhập & Báo Hỏng</span>
        </Button>
      </div>

      {/* ── Statistics Cards (Gọn gàng, mỏng nhẹ, không bị đẩy chữ) ── */}
      <Row gutter={[8, 8]} className="mb-4">
        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-sky-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Loại bao bì
                </div>
                <div className="text-sm sm:text-xl font-black text-sky-600 mt-0.5 truncate">
                  {totalTypes}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500 shrink-0 hidden sm:flex">
                <InboxOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-blue-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Sọt luân chuyển
                </div>
                <div className="text-sm sm:text-xl font-black text-blue-600 mt-0.5 truncate">
                  {containerCount}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-500 shrink-0 hidden sm:flex">
                <ShoppingOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-orange-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Vật tư 1 lần
                </div>
                <div className="text-sm sm:text-xl font-black text-orange-600 mt-0.5 truncate">
                  {consumableCount}
                </div>
              </div>
              <div className="p-1 sm:p-2 bg-orange-50 dark:bg-orange-950/40 rounded-lg text-orange-500 shrink-0 hidden sm:flex">
                <CalculatorOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            bordered={false}
            className="shadow-xs rounded-xl h-full border-l-4 border-l-emerald-500"
            styles={{ body: { padding: '8px 8px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 font-semibold uppercase tracking-tight truncate">
                  Tồn kho sọt
                </div>
                <div className="text-sm sm:text-xl font-black text-emerald-600 mt-0.5 truncate">
                  {totalStock.toLocaleString()}
                </div>
                {totalLoaned > 0 && (
                  <div className="text-[10px] text-gray-400 truncate mt-0.5">
                    Tổng thật: <strong>{totalAssets.toLocaleString()}</strong> ({totalLoaned} mượn)
                  </div>
                )}
              </div>
              <div className="p-1 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 shrink-0 hidden sm:flex">
                <InboxOutlined className="text-sm sm:text-base" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="shadow-sm mb-6"
        title="Danh sách vỏ bao bì & sọt chứa"
      >
        <div className="grid grid-cols-2 lg:flex gap-2 items-center mb-4">
          <Input.Search
            placeholder="Tìm mã, tên sọt..."
            allowClear
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="col-span-2 lg:w-64"
          />
          <Select
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            showSearch
            optionFilterProp="label"
            className="col-span-2 sm:col-span-1 lg:w-56"
            options={[
              { value: 'ALL', label: 'Tất cả phân loại' },
              { value: 'CONTAINER', label: 'Sọt / Khay luân chuyển' },
              { value: 'CONSUMABLE', label: 'Vật tư 1 lần' },
            ]}
          />
        </div>

        <PackagingTable
          packagings={filteredPackagings}
          loading={loading}
          pagination={pagination}
          onPaginationChange={(page, pageSize) => setPagination({ current: page, pageSize })}
          onAdjust={handleOpenAdjustModal}
          onHistory={handleOpenHistoryModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDelete}
        />
      </Card>

      {/* Modal Thêm / Chỉnh Sửa Danh Mục Bao Bì */}
      <PackagingFormModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPkg(null);
        }}
        editingPkg={editingPkg}
        onSuccess={fetchPackagings}
      />

      {/* Modal Điều Chỉnh Số Lượng Sọt / Báo Hỏng Báo Mất */}
      <PackagingAdjustModal
        open={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        mode={adjustMode}
        packagings={packagings}
        selectedPkg={selectedPkgForAdjust}
        onSuccess={fetchPackagings}
      />

      {/* Modal Import Excel */}
      <PackagingImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchPackagings}
      />

      {/* Modal Lịch Sử Nhập & Báo Hỏng Bao Bì / Sọt */}
      <PackagingHistoryModal
        open={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        historyList={historyList}
        loading={loadingHistory}
        filter={historyActionFilter}
        onFilterChange={setHistoryActionFilter}
        onReload={() => fetchAdjustHistory()}
      />
    </div>
  );
};

export default PackagingPage;

