import React from 'react';
import { Modal, Table, Tag, Button, Radio, Space } from 'antd';
import { HistoryOutlined, PlusCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import type { PackagingAdjustHistory } from '@/services/packagingService';
import { formatDateTime } from '@/utils/dateUtils';

interface PackagingHistoryModalProps {
  open: boolean;
  onClose: () => void;
  historyList: PackagingAdjustHistory[];
  loading: boolean;
  filter: 'ALL' | 'ADD' | 'LOSS';
  onFilterChange: (val: 'ALL' | 'ADD' | 'LOSS') => void;
  onReload: () => void;
}

export const PackagingHistoryModal: React.FC<PackagingHistoryModalProps> = ({
  open, onClose, historyList, loading, filter, onFilterChange, onReload,
}) => {
  const filteredHistory = filter === 'ALL' ? historyList : historyList.filter((h) => h.action === filter);

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: 'Thoi gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      render: (t: string) => <span className="text-xs text-gray-500">{formatDateTime(t)}</span>,
    },
    {
      title: 'Thao tac',
      dataIndex: 'action',
      key: 'action',
      width: 155,
      render: (act: string) => (
        act === 'ADD' ? (
          <Tag color="green" icon={<PlusCircleOutlined />}>Nhap them sot (+)</Tag>
        ) : (
          <Tag color="red" icon={<WarningOutlined />}>Bao hong / mat (-)</Tag>
        )
      ),
    },
    {
      title: 'Loai Bao Bi / Sot',
      key: 'pkg',
      width: 180,
      render: (_: any, record: PackagingAdjustHistory) => (
        <div>
          <span className="font-semibold text-xs text-sky-700 dark:text-sky-400">{record.packagingCode}</span>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{record.packagingName}</div>
        </div>
      ),
    },
    {
      title: 'So luong',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right' as const,
      render: (q: number, record: PackagingAdjustHistory) => (
        <span className={`font-bold text-sm ${record.action === 'ADD' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {record.action === 'ADD' ? `+${q.toLocaleString()}` : `-${q.toLocaleString()}`}
        </span>
      ),
    },
    {
      title: 'Bien dong ton',
      key: 'stockChange',
      width: 125,
      align: 'center' as const,
      render: (_: any, record: PackagingAdjustHistory) => (
        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {record.beforeStock} &rarr; <strong>{record.afterStock}</strong>
        </span>
      ),
    },
    {
      title: 'Ly do / Tra soat',
      dataIndex: 'reason',
      key: 'reason',
      render: (r: string) => <span className="text-xs text-slate-700 dark:text-slate-200">{r || '--'}</span>,
    },
    {
      title: 'Nguoi thuc hien',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 120,
      render: (u: string) => <Tag color="blue" className="text-xs">{u || 'Thu kho'}</Tag>,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined className="text-sky-500" />
          <span className="font-bold">Lich Su Nhap & Bao Hong Bao Bi / Sot</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      destroyOnHidden
    >
      <div className="space-y-3 mt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-800">
          <Radio.Group
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="ALL">Tat ca ({historyList.length})</Radio.Button>
            <Radio.Button value="ADD">Nhap them ({historyList.filter((h) => h.action === 'ADD').length})</Radio.Button>
            <Radio.Button value="LOSS">Bao hong / mat ({historyList.filter((h) => h.action === 'LOSS').length})</Radio.Button>
          </Radio.Group>
          <Button size="small" icon={<ReloadOutlined />} onClick={onReload} loading={loading}>
            Tai lai
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredHistory}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (t) => `Tong ${t} lan dieu chinh` }}
          size="small"
          scroll={{ x: 850 }}
        />
      </div>
    </Modal>
  );
};

export default PackagingHistoryModal;
