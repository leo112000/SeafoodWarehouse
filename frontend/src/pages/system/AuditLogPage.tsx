import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { DownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Descriptions, Modal, Input, Select, Space, Table, Tag, App, Pagination } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import type { AuditLog } from '@/types/seafood';
import { auditLogService } from '@/services/auditLogService';
import { formatDateTime, formatDate } from '@/utils/dateUtils';

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

const datePart = (timestamp: string) => formatDate(timestamp, 'YYYY-MM-DD');

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
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

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
    setPagination((prev) => ({ ...prev, current: 1 }));
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
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { 
      title: 'Thời gian', 
      dataIndex: 'timestamp', 
      width: 165, 
      sorter: (a, b) => a.timestamp.localeCompare(b.timestamp),
      render: (t: string) => formatDateTime(t)
    },
    { title: 'Người thực hiện', width: 160, render: (_, log) => <Space direction="vertical" size={0}><strong>{log.userName}</strong><span className="text-xs text-gray-500">{log.userRole}</span></Space> },
    { title: 'Hành động', dataIndex: 'action', width: 115, render: (value: AuditLog['action']) => <Tag color={actionMeta[value]?.color || 'blue'}>{actionMeta[value]?.label || value}</Tag> },
    { title: 'Module', dataIndex: 'module', width: 130 },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    { title: 'IP', dataIndex: 'ipAddress', width: 125 },
    { title: 'Trạng thái', dataIndex: 'status', width: 115, render: (value: AuditLog['status']) => <Tag color={value === 'SUCCESS' ? 'success' : 'error'}>{value === 'SUCCESS' ? 'Thành công' : 'Thất bại'}</Tag> },
    { title: '', width: 64, fixed: 'right', render: (_, log) => <Button type="text" icon={<EyeOutlined />} aria-label={`Xem chi tiết ${log.id}`} onClick={() => setSelected(log)} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 m-0 truncate">Nhật ký hệ thống</h1>
        </div>
        <Space size="small">
          <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>Làm mới</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} disabled={!filtered.length}>Xuất CSV</Button>
        </Space>
      </div>

      <Card
        className="shadow-sm"
        title="Nhật ký hoạt động & bảo mật"
      >
        <div className="grid grid-cols-2 lg:flex gap-2 mb-4 items-center">
          <Input
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Tìm người dùng, mô tả, IP..."
            className="col-span-2 lg:w-64"
          />
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            className="col-span-2 lg:w-auto"
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={action}
            onChange={setAction}
            placeholder="Hành động"
            className="col-span-1 lg:w-36"
            options={Object.entries(actionMeta).map(([value, meta]) => ({ value, label: meta.label }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={module}
            onChange={setModule}
            placeholder="Module"
            className="col-span-1 lg:w-40"
            options={modules.map((value) => ({ value, label: value }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            value={status}
            onChange={setStatus}
            placeholder="Trạng thái"
            className="col-span-1 lg:w-36"
            options={[{ value: 'SUCCESS', label: 'Thành công' }, { value: 'FAILED', label: 'Thất bại' }]}
          />
          <Button icon={<ReloadOutlined />} onClick={reset} className="col-span-1 lg:w-auto">Đặt lại</Button>
        </div>
        {/* Mobile View: Dạng Card chạm lướt kiểu App như ở Dashboard */}
        <div className="block sm:hidden space-y-2.5">
          {filtered
            .slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
            .map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1">
                    <Tag color={actionMeta[log.action]?.color || 'blue'} className="m-0 text-[10px] font-semibold">
                      {actionMeta[log.action]?.label || log.action}
                    </Tag>
                    <Tag color={log.status === 'SUCCESS' ? 'success' : 'error'} className="m-0 text-[10px]">
                      {log.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                    </Tag>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined className="text-sky-600" />}
                    onClick={() => setSelected(log)}
                    className="h-7 w-7 p-0 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {log.userName}
                    <span className="font-normal text-gray-400 ml-1">({log.userRole})</span>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 my-1">
                  {log.description}
                </p>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-gray-400">
                  <span>Module: <strong className="text-slate-600 dark:text-slate-300">{log.module}</strong></span>
                  <span>IP: {log.ipAddress}</span>
                </div>
              </div>
            ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">Không tìm thấy nhật ký nào</div>
          )}

          {filtered.length > 0 && (
            <div className="flex justify-center pt-2">
              <Pagination
                size="small"
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={filtered.length}
                onChange={(page, pageSize) => setPagination({ current: page, pageSize })}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
              showTotal: (total) => `${total} bản ghi`,
            }}
            scroll={{ x: 1120 }}
          />
        </div>
      </Card>

      <Modal
        title="Chi tiết nhật ký hệ thống"
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSelected(null)}>
            Đóng
          </Button>,
        ]}
        width={620}
        centered
      >
        {selected && (
          <div className="py-2">
            <Descriptions
              column={{ xs: 1, sm: 2 }}
              bordered
              size="small"
              items={[
                { key: 'time', label: 'Thời gian', children: formatDateTime(selected.timestamp), span: 2 },
                { key: 'user', label: 'Người thực hiện', children: `${selected.userName} (${selected.userRole})` },
                { key: 'action', label: 'Hành động', children: <Tag color={actionMeta[selected.action]?.color || 'blue'}>{actionMeta[selected.action]?.label || selected.action}</Tag> },
                { key: 'module', label: 'Module', children: selected.module },
                { key: 'status', label: 'Trạng thái', children: <Tag color={selected.status === 'SUCCESS' ? 'success' : 'error'}>{selected.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}</Tag> },
                { key: 'ip', label: 'Địa chỉ IP', children: selected.ipAddress },
                { key: 'browser', label: 'Thiết bị / Trình duyệt', children: selected.browser },
                { key: 'description', label: 'Mô tả chi tiết', children: selected.description, span: 2 },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;
