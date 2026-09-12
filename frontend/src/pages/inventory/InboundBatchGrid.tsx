import React, { useState, useMemo, useEffect } from 'react';
import {
  Card, Table, Button, InputNumber, Select,
  Tag, Row, Col, Typography, App, Tooltip, DatePicker, Segmented
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CopyOutlined, SaveOutlined,
  TeamOutlined,
  ClearOutlined, AppstoreOutlined, TableOutlined,
  DownOutlined, UpOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import { useProductStore } from '../../stores/useProductStore';
import { usePackagingStore } from '../../stores/usePackagingStore';
import { useWarehouseStore } from '../../stores/useWarehouseStore';
import { partnerService, type PartnerItem } from '../../services/partnerService';
import { formatCurrency } from '../../utils/format';
import { computeTareWeight, computeNetWeight, computeTotalPrice, generateBatchCode } from '../../utils/weightCalculator';

const { Text } = Typography;

export interface BatchGridRow {
  id: string;
  seafoodCode: string;
  packagingCode: string;
  packagingQty: number;
  totalWeight: number;
  tareWeight: number;
  netWeight: number;
  unitPrice: number;
  totalPrice: number;
  storageCondition: 'Cấp đông' | 'Ướp đá' | 'Tươi sống';
  expiryDate?: string;
  storageLocation?: string;
  note?: string;
}

export interface SupplierBatchGroup {
  id: string;
  supplier: string;
  items: BatchGridRow[];
}

const calcDefaultExpiry = (baseDate: dayjs.Dayjs, condition: string, warningDays?: number): string => {
  if (condition === 'Tươi sống') return baseDate.add(warningDays || 3, 'day').format('YYYY-MM-DD');
  if (condition === 'Ướp đá') return baseDate.add(warningDays || 7, 'day').format('YYYY-MM-DD');
  return baseDate.add(180, 'day').format('YYYY-MM-DD');
};

export const InboundBatchGrid: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal, notification } = App.useApp();
  const { addReceipt } = useInboundStore();
  const { products, fetchProducts } = useProductStore();
  const { packagings, fetchPackagings } = usePackagingStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();

  const [suppliers, setSuppliers] = useState<PartnerItem[]>([]);
  const [inboundDate, setInboundDate] = useState<dayjs.Dayjs>(dayjs());
  const [defaultWarehouse, setDefaultWarehouse] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'CARDS' : 'TABLE';
  });

  // Danh sách các khối Nhà Cung Cấp
  const [groups, setGroups] = useState<SupplierBatchGroup[]>([]);

  // Quản lý trạng thái thu gọn / mở rộng của từng khối NCC
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => { next[g.id] = true; });
    setCollapsedMap(next);
  };

  const expandAll = () => {
    setCollapsedMap({});
  };

  const isAllCollapsed = groups.length > 0 && groups.every((g) => !!collapsedMap[g.id]);

  useEffect(() => {
    fetchProducts();
    fetchPackagings();
    fetchWarehouses();
    partnerService.getAll('SUPPLIER').then(setSuppliers).catch(() => { });
  }, [fetchProducts, fetchPackagings, fetchWarehouses]);

  useEffect(() => {
    if (warehouses.length > 0 && !defaultWarehouse) {
      setDefaultWarehouse(warehouses[0].name);
    }
  }, [warehouses, defaultWarehouse]);

  function createEmptyRow(defaultPkg = 'SOT-RED', defaultTare = 1.8): BatchGridRow {
    return {
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      seafoodCode: '',
      packagingCode: defaultPkg,
      packagingQty: 1,
      totalWeight: 0,
      tareWeight: defaultTare,
      netWeight: 0,
      unitPrice: 0,
      totalPrice: 0,
      storageCondition: 'Cấp đông',
      expiryDate: calcDefaultExpiry(inboundDate, 'Cấp đông'),
      note: '',
    };
  }

  function createEmptyGroup(supplierName = '', defaultPkg = 'SOT-RED', defaultTare = 1.8): SupplierBatchGroup {
    return {
      id: `grp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      supplier: supplierName,
      items: [
        createEmptyRow(defaultPkg, defaultTare),
        createEmptyRow(defaultPkg, defaultTare),
      ],
    };
  }

  // Khởi tạo 1 nhóm ban đầu khi tải xong danh mục bao bì
  useEffect(() => {
    if (groups.length === 0 && packagings.length > 0) {
      const initialPkg = packagings[0]?.code || 'SOT-RED';
      const initialTare = packagings[0]?.defaultTareWeight || 1.8;
      setGroups([createEmptyGroup('', initialPkg, initialTare)]);
    }
  }, [packagings]);

  // Thêm 1 nhóm Nhà cung cấp / tàu mới
  const handleAddSupplierGroup = () => {
    const initialPkg = packagings[0]?.code || 'SOT-RED';
    const initialTare = packagings[0]?.defaultTareWeight || 1.8;
    setGroups((prev) => [...prev, createEmptyGroup('', initialPkg, initialTare)]);
  };

  // Đổi tên Nhà cung cấp trong khối
  const handleSupplierChange = (grpIdx: number, val: string) => {
    setGroups((prev) => {
      const next = [...prev];
      next[grpIdx] = { ...next[grpIdx], supplier: val };
      return next;
    });
  };

  // Xóa cả khối Nhà cung cấp
  const handleDeleteGroup = (grpIdx: number) => {
    if (groups.length <= 1) {
      message.warning('Bảng kê cần giữ ít nhất 1 khối Nhà cung cấp.');
      return;
    }
    modal.confirm({
      title: 'Xóa khối Nhà cung cấp này?',
      content: `Toàn bộ các dòng cân của khối "${groups[grpIdx]?.supplier || `Nhà cung cấp #${grpIdx + 1}`}" sẽ bị xóa.`,
      okText: 'Xóa khối',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => {
        setGroups((prev) => prev.filter((_, idx) => idx !== grpIdx));
      },
    });
  };

  // Thêm 1 dòng cân vào trong khối Nhà cung cấp (tự động mở rộng nếu đang thu gọn)
  const handleAddRow = (grpIdx: number) => {
    const grp = groups[grpIdx];
    if (grp && collapsedMap[grp.id]) {
      setCollapsedMap((prev) => ({ ...prev, [grp.id]: false }));
    }
    const lastRow = grp?.items[grp.items.length - 1];
    const defaultPkg = lastRow ? lastRow.packagingCode : (packagings[0]?.code || 'SOT-RED');
    const defaultTare = lastRow ? lastRow.tareWeight : (packagings[0]?.defaultTareWeight || 1.8);
    setGroups((prev) => {
      const next = [...prev];
      const target = next[grpIdx];
      next[grpIdx] = {
        ...target,
        items: [...target.items, createEmptyRow(defaultPkg, defaultTare)],
      };
      return next;
    });
  };

  // Nhân bản dòng cân trong khối
  const handleDuplicateRow = (grpIdx: number, rowIdx: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const targetGroup = next[grpIdx];
      const targetItem = targetGroup.items[rowIdx];
      const duplicated: BatchGridRow = {
        ...targetItem,
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      const newItems = [...targetGroup.items];
      newItems.splice(rowIdx + 1, 0, duplicated);
      next[grpIdx] = { ...targetGroup, items: newItems };
      return next;
    });
    message.success('Đã nhân bản dòng cân.');
  };

  // Xóa dòng cân trong khối
  const handleDeleteRow = (grpIdx: number, rowIdx: number) => {
    setGroups((prev) => {
      const next = [...prev];
      const targetGroup = next[grpIdx];
      if (targetGroup.items.length <= 1) {
        const defaultPkg = packagings[0]?.code || 'SOT-RED';
        const defaultTare = packagings[0]?.defaultTareWeight || 1.8;
        next[grpIdx] = { ...targetGroup, items: [createEmptyRow(defaultPkg, defaultTare)] };
      } else {
        next[grpIdx] = {
          ...targetGroup,
          items: targetGroup.items.filter((_, idx) => idx !== rowIdx),
        };
      }
      return next;
    });
  };

  // Cập nhật ô dữ liệu trong dòng cân
  const handleCellChange = (grpIdx: number, rowIdx: number, field: keyof BatchGridRow, value: any) => {
    setGroups((prev) => {
      const next = [...prev];
      const targetGroup = next[grpIdx];
      const items = [...targetGroup.items];
      const item = { ...items[rowIdx], [field]: value };

      if (field === 'seafoodCode') {
        const p = products.find((prod) => prod.code === value);
        if (p) {
          if (!item.unitPrice || item.unitPrice === 0) {
            item.unitPrice = p.referencePrice || 0;
          }
          let condition: 'Cấp đông' | 'Ướp đá' | 'Tươi sống' = 'Cấp đông';
          if (p.storageType === 'ALIVE') condition = 'Tươi sống';
          else if (p.storageType === 'FRESH') condition = 'Ướp đá';
          item.storageCondition = condition;
          if (!item.expiryDate) {
            item.expiryDate = calcDefaultExpiry(inboundDate, condition, p.warningDaysBeforeExpiry);
          }
        }
      }

      if (field === 'packagingCode' || field === 'packagingQty') {
        const computedTare = computeTareWeight(
          item.packagingCode,
          item.packagingQty || 1,
          packagings,
          item.tareWeight
        );
        item.tareWeight = computedTare;
      }

      item.netWeight = computeNetWeight(item.totalWeight || 0, item.tareWeight || 0);
      item.totalPrice = computeTotalPrice(item.netWeight, item.unitPrice || 0);

      items[rowIdx] = item;
      next[grpIdx] = { ...targetGroup, items };
      return next;
    });
  };

  // Tổng hợp thống kê trực tiếp theo từng khối
  const summary = useMemo(() => {
    let totalValidGroups = 0;
    let totalValidItems = 0;
    let totalWeight = 0;
    let totalAmount = 0;

    const groupDetails = groups.map((g) => {
      const validItems = g.items.filter((it) => it.seafoodCode?.trim() && (it.totalWeight || 0) > 0);
      const grpWeight = validItems.reduce((s, it) => s + it.netWeight, 0);
      const grpAmount = validItems.reduce((s, it) => s + it.totalPrice, 0);

      if (g.supplier?.trim() && validItems.length > 0) {
        totalValidGroups++;
      }
      totalValidItems += validItems.length;
      totalWeight += grpWeight;
      totalAmount += grpAmount;

      return {
        ...g,
        validItems,
        grpWeight,
        grpAmount,
      };
    });

    return {
      groupDetails,
      totalValidGroups,
      totalValidItems,
      totalWeight,
      totalAmount,
    };
  }, [groups]);

  // Thực hiện Lưu & Tự Động Tách Đơn theo từng khối Nhà cung cấp
  const handleSaveAndSplit = async () => {
    const validGroups = summary.groupDetails.filter((g) => g.supplier?.trim() && g.validItems.length > 0);

    if (validGroups.length === 0) {
      message.warning('Vui lòng chọn Tên Nhà cung cấp và điền ít nhất 1 dòng cân hợp lệ (có hải sản và tổng cân).');
      return;
    }

    modal.confirm({
      title: `Xác nhận tạo ${validGroups.length} Phiếu Nhập Kho?`,
      content: (
        <div className="space-y-2 mt-2">
          <p>
            Hệ thống sẽ tự động tách <strong>{summary.totalValidItems}</strong> mặt hàng thành{' '}
            <strong className="text-emerald-600">{validGroups.length} Phiếu Nhập Kho</strong> riêng biệt cho từng đối tác:
          </p>
          <ul className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
            {validGroups.map((g, idx) => (
              <li key={g.id} className="flex justify-between py-0.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                <span>{idx + 1}. <strong>{g.supplier}</strong> ({g.validItems.length} mặt hàng)</span>
                <strong>{g.grpWeight.toFixed(1)} kg | {formatCurrency(g.grpAmount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ),
      okText: `Tạo ${validGroups.length} Phiếu Nhập`,
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-emerald-600 hover:bg-emerald-500' },
      onOk: async () => {
        setIsSubmitting(true);
        const dateStr = inboundDate.format('YYYY-MM-DD');

        try {
          for (const grp of validGroups) {
            const formattedItems = grp.validItems.map((it) => {
              const p = products.find((prod) => prod.code === it.seafoodCode);
              return {
                seafoodCode: it.seafoodCode,
                seafoodName: p ? p.name : it.seafoodCode,
                totalWeight: it.totalWeight,
                tareWeight: it.tareWeight,
                netWeight: it.netWeight,
                storageCondition: it.storageCondition,
                catchDate: '',
                expiryDate: it.expiryDate || calcDefaultExpiry(inboundDate, it.storageCondition),
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
                batchCode: generateBatchCode(it.seafoodCode),
              };
            });

            await addReceipt({
              supplier: grp.supplier,
              inboundDate: dateStr,
              storageLocation: defaultWarehouse || warehouses[0]?.name || 'Kho chính',
              items: formattedItems,
              totalAmount: grp.grpAmount,
            });
          }

          notification.success({
            message: 'Đã Tạo Xong Các Phiếu Nhập Kho!',
            description: `Tạo thành công ${validGroups.length} phiếu nhập kho cho ${validGroups.length} nhà cung cấp tương ứng.`,
            duration: 6,
          });

          // Reset lại bảng kê
          const initialPkg = packagings[0]?.code || 'SOT-RED';
          const initialTare = packagings[0]?.defaultTareWeight || 1.8;
          setGroups([createEmptyGroup('', initialPkg, initialTare)]);
          navigate('/inventory/inbound-history');
        } catch (err: any) {
          notification.error({
            message: 'Có lỗi khi lưu các phiếu nhập',
            description: err?.message || 'Vui lòng kiểm tra lại kết nối.',
          });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // Cấu hình các cột hiển thị bên trong từng Khối Nhà cung cấp
  const getTableColumns = (grpIdx: number) => [
    {
      title: '#',
      key: 'stt',
      width: 45,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => <span className="font-mono text-gray-400">{idx + 1}</span>,
    },
    {
      title: 'Mặt Hàng Hải Sản (*)',
      key: 'seafoodCode',
      width: 190,
      render: (_: any, r: BatchGridRow, rowIdx: number) => {
        const batchPreview = r.seafoodCode ? generateBatchCode(r.seafoodCode) : '';
        return (
          <div className="space-y-0.5">
            <Select
              showSearch
              value={r.seafoodCode || undefined}
              placeholder="Chọn mặt hàng..."
              optionFilterProp="label"
              onChange={(val) => handleCellChange(grpIdx, rowIdx, 'seafoodCode', val)}
              options={products.map((p) => ({
                value: p.code,
                label: `${p.name} (${p.code})`,
              }))}
              className="w-full"
              dropdownMatchSelectWidth={false}
              size="middle"
            />
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 min-h-[16px] mt-0.5">
              {batchPreview ? (
                <>
                  <span className="text-slate-400 font-medium">🏷️ Lô:</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold tracking-tight">{batchPreview}</span>
                </>
              ) : (
                <span className="invisible text-xs">--</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Hạn Dùng (*)',
      key: 'expiryDate',
      width: 135,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <DatePicker
          className="w-full text-xs"
          format="YYYY-MM-DD"
          placeholder="Chọn HSD"
          value={r.expiryDate ? dayjs(r.expiryDate) : undefined}
          onChange={(d) => handleCellChange(grpIdx, rowIdx, 'expiryDate', d ? d.format('YYYY-MM-DD') : '')}
          size="middle"
        />
      ),
    },
    {
      title: 'Bao Bì',
      key: 'packagingCode',
      width: 130,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <Select
          placeholder="Chọn bì"
          allowClear
          showSearch
          popupMatchSelectWidth={false}
          value={r.packagingCode || undefined}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'packagingCode', val)}
          className="w-full text-xs"
          size="middle"
        >
          {packagings.map((pkg) => (
            <Select.Option key={pkg.code} value={pkg.code}>
              {pkg.name} ({pkg.defaultTareWeight}kg)
            </Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Số Sọt',
      key: 'packagingQty',
      width: 70,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <InputNumber
          min={1}
          precision={0}
          value={r.packagingQty}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'packagingQty', val || 1)}
          className="w-full font-mono text-center"
          size="middle"
        />
      ),
    },
    {
      title: 'Tổng Cân (Kg) (*)',
      key: 'totalWeight',
      width: 105,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <InputNumber
          min={0}
          step={0.1}
          precision={2}
          value={r.totalWeight}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'totalWeight', val || 0)}
          className="w-full font-mono font-bold text-sky-600"
          placeholder="0.0"
          size="middle"
        />
      ),
    },
    {
      title: 'Trừ Bì (Kg)',
      key: 'tareWeight',
      width: 90,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <InputNumber
          min={0}
          step={0.1}
          precision={2}
          value={r.tareWeight}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'tareWeight', val || 0)}
          className="w-full font-mono text-gray-500"
          size="middle"
        />
      ),
    },
    {
      title: 'Cân Thực (Kg)',
      key: 'netWeight',
      width: 105,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow) => (
        <div className="h-8 flex items-center justify-end">
          <span className={`font-mono font-bold ${r.netWeight > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
            {r.netWeight > 0 ? r.netWeight.toFixed(2) : '--'}
          </span>
        </div>
      ),
    },
    {
      title: 'Bảo Quản (*)',
      key: 'storageCondition',
      width: 105,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <Select
          value={r.storageCondition}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'storageCondition', val)}
          popupMatchSelectWidth={false}
          className="w-full text-xs"
          size="middle"
        >
          <Select.Option value="Cấp đông">Cấp đông</Select.Option>
          <Select.Option value="Ướp đá">Ướp đá</Select.Option>
          <Select.Option value="Tươi sống">Tươi sống</Select.Option>
        </Select>
      ),
    },
    {
      title: 'Đơn Giá (đ/kg) (*)',
      key: 'unitPrice',
      width: 125,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow, rowIdx: number) => (
        <InputNumber
          min={0}
          step={1000}
          value={r.unitPrice}
          onChange={(val) => handleCellChange(grpIdx, rowIdx, 'unitPrice', val || 0)}
          formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/,/g, '')) as any}
          className="w-full font-mono text-right"
          size="middle"
        />
      ),
    },
    {
      title: 'Thành Tiền (đ)',
      key: 'totalPrice',
      width: 130,
      align: 'right' as const,
      render: (_: any, r: BatchGridRow) => (
        <div className="h-8 flex items-center justify-end">
          <span className={`font-semibold font-mono ${r.totalPrice > 0 ? 'text-slate-900 dark:text-slate-100' : 'text-gray-300'}`}>
            {r.totalPrice > 0 ? formatCurrency(r.totalPrice) : '--'}
          </span>
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 75,
      align: 'center' as const,
      render: (_: any, __: BatchGridRow, rowIdx: number) => (
        <div className="h-8 flex items-center justify-center gap-1">
          <Tooltip title="Nhân bản dòng này">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined className="text-sky-500" />}
              onClick={() => handleDuplicateRow(grpIdx, rowIdx)}
            />
          </Tooltip>
          <Tooltip title="Xóa dòng">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteRow(grpIdx, rowIdx)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Thanh điều khiển chung & Nút chức năng ── */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Cấu hình chung cho ca nhập */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Ngày nhập:
              </span>
              <DatePicker
                value={inboundDate}
                onChange={(d) => setInboundDate(d || dayjs())}
                format="YYYY-MM-DD"
                allowClear={false}
                size="middle"
                className="w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Kho lưu:
              </span>
              <Select
                value={defaultWarehouse}
                onChange={setDefaultWarehouse}
                options={warehouses.map((w) => ({ value: w.name, label: w.name }))}
                className="w-48"
                size="middle"
              />
            </div>

            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'TABLE' | 'CARDS')}
              options={[
                { label: 'Bảng (PC)', value: 'TABLE', icon: <TableOutlined /> },
                { label: 'Thẻ (Điện thoại)', value: 'CARDS', icon: <AppstoreOutlined /> },
              ]}
              className="bg-slate-100 dark:bg-slate-800 font-medium"
            />
          </div>

          {/* Các nút thao tác */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-start lg:justify-end">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddSupplierGroup}
              className="bg-sky-500 hover:bg-sky-600 font-medium"
            >
              Thêm NCC / Tàu mới
            </Button>
            {groups.length > 1 && (
              <Button
                icon={isAllCollapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={isAllCollapsed ? expandAll : collapseAll}
                className="font-medium"
              >
                {isAllCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}
              </Button>
            )}
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={() => {
                modal.confirm({
                  title: 'Làm lại bảng kê cuối ngày?',
                  content: 'Tất cả các khối nhà cung cấp và dòng cân hiện tại sẽ bị xóa để nhập mới.',
                  okText: 'Xóa làm lại',
                  okButtonProps: { danger: true },
                  cancelText: 'Hủy',
                  onOk: () => {
                    const initialPkg = packagings[0]?.code || 'SOT-RED';
                    const initialTare = packagings[0]?.defaultTareWeight || 1.8;
                    setGroups([createEmptyGroup('', initialPkg, initialTare)]);
                  },
                });
              }}
            >
              Làm lại
            </Button>
          </div>
        </div>
      </div>

      {/* ── Danh Sách Các Khối Nhóm Nhà Cung Cấp (Grouped Panels) ── */}
      <div className="space-y-4">
        {summary.groupDetails.map((grp, grpIdx) => {
          const isCollapsed = !!collapsedMap[grp.id];
          return (
            <Card
              key={grp.id}
              bordered={false}
              className="shadow-sm rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              {/* Header của từng khối Nhà cung cấp */}
              <div
                className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/90 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('button') && !target.closest('.ant-select') && !target.closest('.ant-input')) {
                    toggleCollapse(grp.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[280px]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500 text-white font-bold text-xs shadow-xs">
                      #{grpIdx + 1}
                    </span>
                    <TeamOutlined className="text-sky-600 text-lg hidden sm:inline" />
                  </div>

                  <div className="flex-1 max-w-sm" onClick={(e) => e.stopPropagation()}>
                    <Select
                      showSearch
                      value={grp.supplier || undefined}
                      placeholder="Chọn hoặc gõ tên Nhà cung cấp / Tàu cá..."
                      optionFilterProp="label"
                      onChange={(val) => handleSupplierChange(grpIdx, val)}
                      options={suppliers.map((s) => ({ value: s.name, label: s.name }))}
                      className="w-full font-semibold"
                      size="middle"
                      popupMatchSelectWidth={false}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag color="blue" className="font-semibold text-xs">
                      {grp.validItems.length} mặt hàng
                    </Tag>
                    <Tag color="green" className="font-semibold text-xs">
                      Cân thực: <strong className="font-mono">{grp.grpWeight.toFixed(1)} kg</strong>
                    </Tag>
                    <Tag color="cyan" className="font-semibold text-xs">
                      Tiền: <strong className="font-mono">{formatCurrency(grp.grpAmount)}</strong>
                    </Tag>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {groups.length > 1 && (
                    <Tooltip title="Xóa toàn bộ khối nhà cung cấp này">
                      <Button
                        size="middle"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteGroup(grpIdx)}
                      />
                    </Tooltip>
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={isCollapsed ? <DownOutlined /> : <UpOutlined />}
                    className="text-xs text-slate-600 dark:text-slate-300 font-medium"
                    onClick={() => toggleCollapse(grp.id)}
                  >
                    {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                  </Button>
                </div>
              </div>

              {/* Nội dung bên trong khối: Bảng hoặc Thẻ (chỉ hiển thị khi mở rộng) */}
              {!isCollapsed && (
                <>
                  {viewMode === 'TABLE' ? (
                    <>
                      <style>{`
                        .grouped-batch-table .ant-table-thead > tr > th {
                          text-align: left !important;
                          background-color: #f8fafc !important;
                        }
                        .dark .grouped-batch-table .ant-table-thead > tr > th {
                          background-color: #0f172a !important;
                        }
                        .grouped-batch-table .ant-table-tbody > tr > td {
                          vertical-align: top !important;
                          padding-top: 8px !important;
                          padding-bottom: 6px !important;
                        }
                      `}</style>
                      <Table
                        columns={getTableColumns(grpIdx)}
                        dataSource={grp.items}
                        rowKey="id"
                        pagination={false}
                        size="middle"
                        scroll={{ x: 1250 }}
                        bordered={false}
                        className="grouped-batch-table"
                      />
                    </>
                  ) : (
                    /* ── Chế độ Thẻ (Điện thoại) cho từng khối NCC ── */
                    <div className="p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
                      {grp.items.map((r, rowIdx) => {
                        const batchPreview = r.seafoodCode ? generateBatchCode(r.seafoodCode) : '';
                        return (
                          <Card
                            key={r.id}
                            size="small"
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                            bodyStyle={{ padding: '12px' }}
                          >
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2">
                                <Tag color="cyan" className="font-mono font-bold">#{rowIdx + 1}</Tag>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                  {r.seafoodCode ? (products.find((p) => p.code === r.seafoodCode)?.name || r.seafoodCode) : 'Chưa chọn hải sản'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<CopyOutlined className="text-sky-500" />}
                                  onClick={() => handleDuplicateRow(grpIdx, rowIdx)}
                                />
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteRow(grpIdx, rowIdx)}
                                />
                              </div>
                            </div>

                            <Row gutter={[8, 8]}>
                              <Col span={14}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Mặt hàng (*):</div>
                                <Select
                                  showSearch
                                  value={r.seafoodCode || undefined}
                                  placeholder="Chọn hải sản..."
                                  optionFilterProp="label"
                                  onChange={(val) => handleCellChange(grpIdx, rowIdx, 'seafoodCode', val)}
                                  options={products.map((p) => ({ value: p.code, label: `${p.name} (${p.code})` }))}
                                  className="w-full"
                                />
                                {batchPreview && (
                                  <div className="text-xs font-mono font-bold text-sky-600 mt-1">🏷️ Lô: {batchPreview}</div>
                                )}
                              </Col>
                              <Col span={10}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">HSD (*):</div>
                                <DatePicker
                                  format="YYYY-MM-DD"
                                  placeholder="Chọn HSD"
                                  value={r.expiryDate ? dayjs(r.expiryDate) : undefined}
                                  onChange={(d) => handleCellChange(grpIdx, rowIdx, 'expiryDate', d ? d.format('YYYY-MM-DD') : '')}
                                  className="w-full"
                                />
                              </Col>
                              <Col span={8}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Bao bì:</div>
                                <Select
                                  value={r.packagingCode || undefined}
                                  onChange={(val) => handleCellChange(grpIdx, rowIdx, 'packagingCode', val)}
                                  options={packagings.map((pkg) => ({ value: pkg.code, label: `${pkg.name} (${pkg.defaultTareWeight}kg)` }))}
                                  className="w-full"
                                />
                              </Col>
                              <Col span={8}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Số sọt:</div>
                                <InputNumber
                                  min={1}
                                  value={r.packagingQty}
                                  onChange={(val) => handleCellChange(grpIdx, rowIdx, 'packagingQty', val || 1)}
                                  className="w-full font-mono text-center"
                                />
                              </Col>
                              <Col span={8}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Bảo quản:</div>
                                <Select
                                  value={r.storageCondition}
                                  onChange={(val) => handleCellChange(grpIdx, rowIdx, 'storageCondition', val)}
                                  className="w-full"
                                >
                                  <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                                  <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                                  <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                                </Select>
                              </Col>
                              <Col span={24}>
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-gray-500">Tổng cân: </span>
                                    <InputNumber
                                      min={0}
                                      step={0.1}
                                      precision={2}
                                      value={r.totalWeight}
                                      onChange={(val) => handleCellChange(grpIdx, rowIdx, 'totalWeight', val || 0)}
                                      className="font-bold text-sky-600 w-20"
                                      size="small"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Trừ bì: </span>
                                    <span className="font-mono text-gray-600 dark:text-gray-400">{r.tareWeight.toFixed(2)} kg</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Thực: </span>
                                    <strong className="text-emerald-600 font-mono text-sm">{r.netWeight > 0 ? r.netWeight.toFixed(2) : '--'} kg</strong>
                                  </div>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Đơn giá (đ/kg):</div>
                                <InputNumber
                                  min={0}
                                  step={1000}
                                  value={r.unitPrice}
                                  onChange={(val) => handleCellChange(grpIdx, rowIdx, 'unitPrice', val || 0)}
                                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                  parser={(val) => Number((val || '').replace(/,/g, '')) as any}
                                  className="w-full font-mono text-right"
                                />
                              </Col>
                              <Col span={12}>
                                <div className="text-[11px] font-medium text-gray-500 mb-0.5">Thành tiền:</div>
                                <div className="h-8 flex items-center justify-end font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {r.totalPrice > 0 ? formatCurrency(r.totalPrice) : '--'}
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Nút thêm dòng nhanh ở cuối bảng của khối */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddRow(grpIdx)}
                      className="font-medium text-xs text-sky-600 border-sky-300"
                    >
                      Thêm lần cân cho {grp.supplier || `Nhà cung cấp #${grpIdx + 1}`}
                    </Button>
                    <span className="text-[11px] text-gray-400">
                      {grp.validItems.length}/{grp.items.length} dòng đã nhập đủ thông tin
                    </span>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Nút to thêm Nhà cung cấp mới */}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAddSupplierGroup}
        className="w-full h-12 rounded-xl text-base font-semibold text-sky-600 border-sky-300 hover:border-sky-500 bg-sky-50/40 dark:bg-sky-950/20"
      >
        Thêm Nhà Cung Cấp / Tàu Mới
      </Button>

      {/* ── Khối Thống Kê Toàn Ca & Nút Tự Động Tách Phiếu Nhập ── */}
      <Card
        bordered={false}
        className="shadow-md rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs">
                {summary.totalValidGroups}
              </span>
              <Text strong className="text-base text-slate-800 dark:text-slate-100">
                Dự kiến tách thành {summary.totalValidGroups} Phiếu Nhập Kho riêng biệt:
              </Text>
            </div>

            {/* Danh sách thẻ đối tác dự kiến tách */}
            {summary.groupDetails.filter((g) => g.supplier?.trim() && g.validItems.length > 0).length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {summary.groupDetails
                  .filter((g) => g.supplier?.trim() && g.validItems.length > 0)
                  .map((g, idx) => (
                    <div
                      key={g.id}
                      className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-lg text-xs shadow-2xs"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <TeamOutlined className="text-sky-500" /> #{idx + 1}. {g.supplier}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {g.validItems.length} mặt hàng | <strong className="text-emerald-600">{g.grpWeight.toFixed(1)} kg</strong> | <strong>{formatCurrency(g.grpAmount)}</strong>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic pt-1">
                (Chọn Tên Nhà cung cấp và nhập mặt hàng ở các khối trên để hệ thống tự động tổng hợp tính toán)
              </div>
            )}
          </div>

          {/* Cột Tổng Tiền & Nút Bấm Lưu Hàng Loạt */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0 w-full lg:w-auto">
            <div className="text-right">
              <div className="text-xs text-gray-500">
                Tổng cộng: <strong>{summary.totalValidItems}</strong> mặt hàng | Cân tịnh: <strong className="text-emerald-600 text-sm">{summary.totalWeight.toFixed(1)} kg</strong>
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(summary.totalAmount)}
              </div>
            </div>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              size="large"
              disabled={summary.totalValidGroups === 0}
              loading={isSubmitting}
              onClick={handleSaveAndSplit}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold px-6 h-12 rounded-xl shadow-md text-sm w-full sm:w-auto"
            >
              Lưu & Tách Thành {summary.totalValidGroups} Phiếu Nhập Kho
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
