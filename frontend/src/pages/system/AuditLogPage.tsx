import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Descriptions, Drawer, Input, Select, Space, Table, Tag, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import type { AuditLog } from '../../types/seafood';
import { auditLogService } from '../../services/auditLogService';

const { RangePicker } = DatePicker;

const actionMeta: Record<AuditLog['action'], { label: string; color: string }> = {
  CREATE: { label: 'Tạo mới', color: 'green' },
  UPDATE: { label: 'Cập nhật', color: 'blue' },
  DELETE: { label: 'Xóa', color: 'red' },
  LOGIN: { label: 'Đăng nhập', color: 'cyan' },
  LOGOUT: { label: 'Đăng xuất', color: 'default' },
  EXPORT: { label: 'Xuất file', color: 'purple' },
  PRINT: { label: 'In', color: 'orange' },
};

const datePart = (timestamp: string) => timestamp.slice(0, 10);

export const AuditLogPage: React.FC = () => {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState<AuditLog['action']>();
  const [module, setModule] = useState<string>();
  const [status, setStatus] = useState<AuditLog['status']>();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await auditLogService.getAll();
      setLogs(data);
    } catch {
      message.error('Không thể tải nhật ký hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const modules = useMemo(() => [...new Set(logs.map((log) => log.module))], [logs]);

  const filtered = useMemo(() => logs.filter((log) => {
    const query = keyword.trim().toLocaleLowerCase();
    const matchesKeyword = !query || [log.userName, log.description, log.ipAddress, log.module].some((value) => value.toLocaleLowerCase().includes(query));
    const matchesDate = !dateRange || (!dateRange[0] && !dateRange[1]) || ((!dateRange[0] || datePart(log.timestamp) >= dateRange[0].format('YYYY-MM-DD')) && (!dateRange[1] || datePart(log.timestamp) <= dateRange[1].format('YYYY-MM-DD')));
    return matchesKeyword && matchesDate && (!action || log.action === action) && (!module || log.module === module) && (!status || log.status === status);
  }), [action, dateRange, keyword, logs, module, status]);

  const reset = () => {
    setKeyword('');
    setAction(undefined);
    setModule(undefined);
    setStatus(undefined);
    setDateRange(null);
    fetchLogs();
  };

  const exportCsv = () => {
    const rows = [['Thời gian', 'Người thực hiện', 'Vai trò', 'Hành động', 'Module', 'Mô tả', 'IP', 'Thiết bị', 'Trạng thái'], ...filtered.map((log) => [log.timestamp, log.userName, log.userRole, actionMeta[log.action]?.label || log.action, log.module, log.description, log.ipAddress, log.browser, log.status])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'nhat-ky-he-thong.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const columns: ColumnsType<AuditLog> = [
    { title: 'Thời gian', dataIndex: 'timestamp', width: 165, sorter: (a, b) => a.timestamp.localeCompare(b.timestamp) },
    { title: 'Người thực hiện', width: 160, render: (_, log) => <Space direction="vertical" size={0}><strong>{log.userName}</strong><span className="text-xs text-gray-500">{log.userRole}</span></Space> },
    { title: 'Hành động', dataIndex: 'action', width: 115, render: (value: AuditLog['action']) => <Tag color={actionMeta[value]?.color || 'blue'}>{actionMeta[value]?.label || value}</Tag> },
    { title: 'Module', dataIndex: 'module', width: 130 },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress', width: 125 },
    { title: 'Trạng thái', dataIndex: 'status', width: 115, render: (value: AuditLog['status']) => <Tag color={value === 'SUCCESS' ? 'success' : 'error'}>{value === 'SUCCESS' ? 'Thành công' : 'Thất bại'}</Tag> },
    { title: '', width: 64, fixed: 'right', render: (_, log) => <Button type="text" icon={<EyeOutlined />} aria-label={`Xem chi tiết ${log.id}`} onClick={() => setSelected(log)} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 m-0">Nhật ký hệ thống</h1>
          <p className="text-gray-500 mt-1 mb-0">Theo dõi các thao tác quan trọng và sự kiện bảo mật trong hệ thống từ CSDL SQL Server.</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>Làm mới</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} disabled={!filtered.length}>Xuất CSV</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-wrap gap-3 mb-5">
          <Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} placeholder="Tìm người dùng, mô tả, IP..." className="w-full sm:w-64" />
          <RangePicker value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" className="w-full sm:w-auto" />
          <Select allowClear value={action} onChange={setAction} placeholder="Hành động" className="w-full sm:w-36" options={Object.entries(actionMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
          <Select allowClear value={module} onChange={setModule} placeholder="Module" className="w-full sm:w-40" options={modules.map((value) => ({ value, label: value }))} />
          <Select allowClear value={status} onChange={setStatus} placeholder="Trạng thái" className="w-full sm:w-36" options={[{ value: 'SUCCESS', label: 'Thành công' }, { value: 'FAILED', label: 'Thất bại' }]} />
          <Button icon={<ReloadOutlined />} onClick={reset}>Đặt lại</Button>
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} bản ghi` }} scroll={{ x: 1120 }} />
      </Card>

      <Drawer title="Chi tiết nhật ký" width={620} open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions column={1} bordered size="small" items={[
              { key: 'time', label: 'Thời gian', children: selected.timestamp },
              { key: 'user', label: 'Người thực hiện', children: `${selected.userName} (${selected.userRole})` },
              { key: 'action', label: 'Hành động', children: <Tag color={actionMeta[selected.action]?.color || 'blue'}>{actionMeta[selected.action]?.label || selected.action}</Tag> },
              { key: 'module', label: 'Module', children: selected.module },
              { key: 'description', label: 'Mô tả', children: selected.description },
              { key: 'ip', label: 'Địa chỉ IP', children: selected.ipAddress },
              { key: 'browser', label: 'Trình duyệt / thiết bị', children: selected.browser },
              { key: 'status', label: 'Trạng thái', children: <Tag color={selected.status === 'SUCCESS' ? 'success' : 'error'}>{selected.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}</Tag> },
            ]} />
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogPage;
