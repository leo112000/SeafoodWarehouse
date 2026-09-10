import React, { useState, useMemo, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Select, InputNumber,
  Input, Row, Col, App, Tabs, Badge, Tooltip, Pagination,
} from 'antd';
import {
  RollbackOutlined, PlusOutlined, WarningOutlined,
  CheckCircleOutlined, InboxOutlined, HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePackagingReturnStore, type PackagingLoan } from '../../stores/usePackagingReturnStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePackagingStore } from '../../stores/usePackagingStore';
import { ZoomButton, ZoomViewerModal } from '../../components/common/ZoomViewerModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const debtLabel = (loan: PackagingLoan) => {
  const debt = loan.loanedQty - loan.returnedQty;
  if (debt <= 0) return <Tag color="green" icon={<CheckCircleOutlined />}>Đã hoàn trả đủ</Tag>;
  return (
    <Tag color={debt <= 5 ? 'orange' : 'red'} icon={<WarningOutlined />}>
      Còn nợ {debt} cái
    </Tag>
  );
};

// ─── component ────────────────────────────────────────────────────────────────

const PackagingReturnPage: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const { loans, returns, addReturn, addLoan, fetchLoansAndReturns } = usePackagingReturnStore();
  const { packagings, fetchPackagings } = usePackagingStore();

  useEffect(() => {
    fetchPackagings();
    fetchLoansAndReturns();
  }, [fetchPackagings, fetchLoansAndReturns]);

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<PackagingLoan | null>(null);
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState('ledger');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const [returnForm] = Form.useForm();
  const [loanForm] = Form.useForm();

  // ── derived stats ────────────────────────────────────────────────────────────
  const totalLoaned = useMemo(() => loans.reduce((s, l) => s + l.loanedQty, 0), [loans]);
  const totalReturned = useMemo(() => loans.reduce((s, l) => s + l.returnedQty, 0), [loans]);
  const totalDebt = totalLoaned - totalReturned;
  const pendingLoans = loans.filter((l) => l.loanedQty > l.returnedQty).length;

  // ── unique partner list for filter ───────────────────────────────────────────
  const partners = useMemo(() => {
    const set = new Set(loans.map((l) => l.partnerName));
    return Array.from(set);
  }, [loans]);

  const filteredLoans = useMemo(
    () => (partnerFilter === 'ALL' ? loans : loans.filter((l) => l.partnerName === partnerFilter)),
    [loans, partnerFilter]
  );

  // ── handlers ─────────────────────────────────────────────────────────────────

  const openReturnModal = (loan: PackagingLoan) => {
    const debt = loan.loanedQty - loan.returnedQty;
    if (debt <= 0) {
      message.info('Công nợ vỏ sọt của đối tác này đã hoàn tất!');
      return;
    }
    setSelectedLoan(loan);
    returnForm.setFieldsValue({ returnedQty: debt, note: '' });
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = (values: any) => {
    if (!selectedLoan) return;
    const debt = selectedLoan.loanedQty - selectedLoan.returnedQty;
    if (values.returnedQty > debt) {
      message.error(`Số lượng trả vượt quá số nợ (${debt} cái).`);
      return;
    }
    addReturn({
      loanId: selectedLoan.id,
      returnedQty: values.returnedQty,
      returnDate: dayjs().format('YYYY-MM-DD'),
      recordedBy: user?.name ?? 'Thủ kho',
      note: values.note,
    });
    message.success(`Đã ghi nhận ${values.returnedQty} cái trả về từ ${selectedLoan.partnerName}!`);
    setReturnModalOpen(false);
    returnForm.resetFields();
    setSelectedLoan(null);
  };

  const handleLoanSubmit = (values: any) => {
    const pkg = packagings.find((p) => p.code === values.packagingCode);
    if (!pkg) return;
    addLoan({
      partnerName: values.partnerName,
      partnerType: values.partnerType,
      packagingCode: pkg.code,
      packagingName: pkg.name,
      loanedQty: values.loanedQty,
      date: dayjs().format('YYYY-MM-DD'),
      note: values.note,
    });
    message.success('Đã tạo phiếu cho mượn vỏ sọt thành công!');
    setLoanModalOpen(false);
    loanForm.resetFields();
  };

  const [loanPagination, setLoanPagination] = useState({ current: 1, pageSize: 10 });
  const [returnPagination, setReturnPagination] = useState({ current: 1, pageSize: 10 });

  const pagedLoans = useMemo(() => {
    const start = (loanPagination.current - 1) * loanPagination.pageSize;
    return filteredLoans.slice(start, start + loanPagination.pageSize);
  }, [filteredLoans, loanPagination.current, loanPagination.pageSize]);

  const pagedReturns = useMemo(() => {
    const start = (returnPagination.current - 1) * returnPagination.pageSize;
    return returns.slice(start, start + returnPagination.pageSize);
  }, [returns, returnPagination.current, returnPagination.pageSize]);

  // ── loan table columns ────────────────────────────────────────────────────────

  const loanColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (loanPagination.current - 1) * loanPagination.pageSize + index + 1,
    },
    {
      title: 'Đối Tác',
      dataIndex: 'partnerName',
      key: 'partnerName',
      render: (name: string, record: PackagingLoan) => (
        <div>
          <strong>{name}</strong>
          <br />
          <Tag color={record.partnerType === 'CUSTOMER' ? 'blue' : 'purple'} className="mt-1">
            {record.partnerType === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Loại Khay / Sọt',
      dataIndex: 'packagingName',
      key: 'packagingName',
      render: (name: string, record: PackagingLoan) => (
        <div>
          <Tag color="blue" className="font-mono text-xs">{record.packagingCode}</Tag>
          <br />
          <span className="text-sm">{name}</span>
        </div>
      ),
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'date',
      key: 'date',
      render: (d: string) => <span className="text-slate-500 text-sm">{d}</span>,
    },
    {
      title: 'Đã Giao',
      dataIndex: 'loanedQty',
      key: 'loanedQty',
      align: 'right' as const,
      render: (q: number) => <span className="font-semibold">{q} cái</span>,
    },
    {
      title: 'Đã Trả',
      dataIndex: 'returnedQty',
      key: 'returnedQty',
      align: 'right' as const,
      render: (q: number) => <span className="text-green-600 font-semibold">{q} cái</span>,
    },
    {
      title: 'Còn Nợ',
      key: 'debt',
      align: 'center' as const,
      render: (_: any, record: PackagingLoan) => {
        const debt = record.loanedQty - record.returnedQty;
        return (
          <Badge
            count={debt}
            showZero
            color={debt === 0 ? 'green' : debt <= 5 ? 'orange' : 'red'}
            overflowCount={999}
          />
        );
      },
      sorter: (a: PackagingLoan, b: PackagingLoan) =>
        (b.loanedQty - b.returnedQty) - (a.loanedQty - a.returnedQty),
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      render: (_: any, record: PackagingLoan) => debtLabel(record),
    },
    {
      title: 'Ghi Chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (n: string) => <span className="text-slate-400 text-xs">{n || '—'}</span>,
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: PackagingLoan) => {
        const debt = record.loanedQty - record.returnedQty;
        return (
          <Tooltip title={debt <= 0 ? 'Đã hoàn trả đủ' : 'Ghi nhận trả vỏ khay'}>
            <Button
              type="primary"
              size="small"
              icon={<RollbackOutlined />}
              disabled={debt <= 0}
              onClick={() => openReturnModal(record)}
              className={debt > 0 ? 'bg-orange-500 hover:bg-orange-400 border-none' : ''}
            >
              Ghi nhận trả
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  // ── returns history columns ───────────────────────────────────────────────────

  const returnColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (returnPagination.current - 1) * returnPagination.pageSize + index + 1,
    },
    { title: 'Mã Phiếu', dataIndex: 'id', key: 'id', render: (id: string) => <Tag color="geekblue" className="font-mono text-xs">{id}</Tag> },
    { title: 'Đối Tác', dataIndex: 'partnerName', key: 'partnerName', render: (n: string) => <strong>{n}</strong> },
    { title: 'Loại Khay', dataIndex: 'packagingName', key: 'packagingName' },
    { title: 'Số Lượng Trả', dataIndex: 'returnedQty', key: 'returnedQty', align: 'right' as const, render: (q: number) => <span className="font-semibold text-green-600">{q} cái</span> },
    { title: 'Ngày Trả', dataIndex: 'returnDate', key: 'returnDate' },
    { title: 'Người Ghi Nhận', dataIndex: 'recordedBy', key: 'recordedBy' },
    { title: 'Ghi Chú', dataIndex: 'note', key: 'note', ellipsis: true, render: (n: string) => n || '—' },
  ];

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate">
          Quản Lý Vỏ Sọt
        </h1>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            icon={<PlusOutlined />}
            onClick={() => setLoanModalOpen(true)}
            size="middle"
            className="font-medium"
          >
            <span className="hidden sm:inline">Tạo phiếu mượn</span>
            <span className="sm:hidden">Mượn vỏ</span>
          </Button>
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={() => {
              if (filteredLoans.find((l) => l.loanedQty > l.returnedQty)) {
                const firstDebt = filteredLoans.find((l) => l.loanedQty > l.returnedQty)!;
                openReturnModal(firstDebt);
              } else {
                message.info('Không có công nợ vỏ sọt nào đang mở.');
              }
            }}
            className="bg-orange-500 hover:bg-orange-400 border-none font-medium"
            size="middle"
          >
            <span className="hidden sm:inline">Ghi nhận Trả Vỏ</span>
            <span className="sm:hidden">Trả vỏ</span>
          </Button>
        </div>
      </div>

      {/* ── Summary Cards (Thu nhỏ kích thước, gọn gàng, tiết kiệm diện tích) ── */}
      <Row gutter={[6, 6]} className="mb-3">
        <Col xs={12} sm={12} lg={6}>
          <Card
            bordered={false}
            className="shadow-2xs rounded-xl h-full border-l-4 border-l-sky-500 bg-white dark:bg-slate-900"
            styles={{ body: { padding: '6px 10px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-tight truncate">
                  Đã giao mượn
                </div>
                <div className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400 mt-0.5 truncate">
                  {totalLoaned.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cái</span>
                </div>
              </div>
              <div className="p-1 sm:p-1.5 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500 shrink-0">
                <InboxOutlined className="text-xs sm:text-sm" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            bordered={false}
            className="shadow-2xs rounded-xl h-full border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900"
            styles={{ body: { padding: '6px 10px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-tight truncate">
                  Đã thu hồi
                </div>
                <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  {totalReturned.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cái</span>
                </div>
              </div>
              <div className="p-1 sm:p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 shrink-0">
                <CheckCircleOutlined className="text-xs sm:text-sm" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            bordered={false}
            className="shadow-2xs rounded-xl h-full border-l-4 border-l-orange-500 bg-white dark:bg-slate-900"
            styles={{ body: { padding: '6px 10px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-tight truncate">
                  Còn nợ ngoài kho
                </div>
                <div className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400 mt-0.5 truncate">
                  {totalDebt.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cái</span>
                </div>
              </div>
              <div className="p-1 sm:p-1.5 bg-orange-50 dark:bg-orange-950/40 rounded-lg text-orange-500 shrink-0">
                <WarningOutlined className="text-xs sm:text-sm" />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card
            bordered={false}
            className="shadow-2xs rounded-xl h-full border-l-4 border-l-rose-500 bg-white dark:bg-slate-900"
            styles={{ body: { padding: '6px 10px' } }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-tight truncate">
                  Đối tác nợ
                </div>
                <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                  {pendingLoans} <span className="text-[10px] font-normal text-gray-400">phiếu</span>
                </div>
              </div>
              <div className="p-1 sm:p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-500 shrink-0">
                <HistoryOutlined className="text-xs sm:text-sm" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Main Tabs ── */}
      <Card
        variant="borderless"
        className="shadow-sm"
        extra={<ZoomButton onClick={() => setIsZoomOpen(true)} />}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ledger',
              label: (
                <span>
                  Bảng Công Nợ Vỏ Sọt
                  {pendingLoans > 0 && (
                    <Badge count={pendingLoans} className="ml-2" />
                  )}
                </span>
              ),
              children: (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">Lọc đối tác:</span>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      value={partnerFilter}
                      onChange={setPartnerFilter}
                      size="small"
                      className="w-48 sm:w-56"
                      options={[
                        { value: 'ALL', label: 'Tất cả đối tác' },
                        ...partners.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                  </div>
                  {/* Mobile View: Thẻ Công Nợ Vỏ Sọt Kiểu App (Thu gọn kích thước) */}
                  <div className="block sm:hidden space-y-2">
                    {filteredLoans.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">Không có dữ liệu công nợ vỏ</div>
                    ) : (
                      pagedLoans.map((loan) => {
                        const debt = loan.loanedQty - loan.returnedQty;
                        return (
                          <div
                            key={loan.id}
                            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {loan.partnerName}
                                </span>
                                <Tag color={loan.partnerType === 'CUSTOMER' ? 'blue' : 'purple'} className="text-[10px] m-0 px-1 py-0 border-0 shrink-0">
                                  {loan.partnerType === 'CUSTOMER' ? 'Khách' : 'NCC'}
                                </Tag>
                              </div>
                              <div className="shrink-0">{debtLabel(loan)}</div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
                              <div className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                                {loan.packagingName} <span className="font-mono text-gray-400 text-[10px]">({loan.packagingCode})</span>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <span className="text-gray-500">Mượn: <strong className="text-slate-700 dark:text-slate-200">{loan.loanedQty}</strong></span>
                                <span className="text-emerald-600 font-medium">Trả: <strong>{loan.returnedQty}</strong></span>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-gray-400">
                              <span>Ngày: {loan.date}</span>
                              {debt > 0 ? (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<RollbackOutlined className="text-[10px]" />}
                                  onClick={() => openReturnModal(loan)}
                                  className="bg-orange-500 hover:bg-orange-600 border-none font-medium text-[11px] h-6 px-2 rounded-md"
                                >
                                  Trả ({debt})
                                </Button>
                              ) : (
                                <span className="text-green-600 font-medium text-[11px]">Đã xong</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {filteredLoans.length > loanPagination.pageSize && (
                      <div className="flex justify-center pt-1.5">
                        <Pagination
                          size="small"
                          current={loanPagination.current}
                          pageSize={loanPagination.pageSize}
                          total={filteredLoans.length}
                          onChange={(page, pageSize) => setLoanPagination({ current: page, pageSize })}
                          showSizeChanger={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden sm:block">
                    <Table
                      columns={loanColumns}
                      dataSource={filteredLoans}
                      rowKey="id"
                      pagination={{
                        current: loanPagination.current,
                        pageSize: loanPagination.pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        onChange: (page, pageSize) => setLoanPagination({ current: page, pageSize }),
                      }}
                      rowClassName={(record) => {
                        const debt = record.loanedQty - record.returnedQty;
                        if (debt > 5) return 'bg-red-50 dark:bg-red-950';
                        if (debt > 0) return 'bg-orange-50 dark:bg-orange-950';
                        return '';
                      }}
                      className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800"
                      scroll={{ x: 'max-content' }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined className="mr-1" />
                  Lịch Sử Trả Vỏ ({returns.length})
                </span>
              ),
              children: (
                <div>
                  {/* Mobile View: Thẻ Lịch Sử Trả Vỏ Kiểu App (Thu gọn kích thước) */}
                  <div className="block sm:hidden space-y-2">
                    {returns.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">Chưa có lịch sử trả vỏ nào</div>
                    ) : (
                      pagedReturns.map((ret) => (
                        <div
                          key={ret.id}
                          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {ret.partnerName}
                            </span>
                            <Tag color="green" className="font-bold text-[11px] m-0 px-1.5 py-0 border-0">
                              +{ret.returnedQty} cái
                            </Tag>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="truncate">{ret.packagingName}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{ret.returnDate}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                            <span>NV: {ret.recordedBy}</span>
                            {ret.note && <span className="italic truncate max-w-[140px]">{ret.note}</span>}
                          </div>
                        </div>
                      ))
                    )}

                    {returns.length > returnPagination.pageSize && (
                      <div className="flex justify-center pt-1.5">
                        <Pagination
                          size="small"
                          current={returnPagination.current}
                          pageSize={returnPagination.pageSize}
                          total={returns.length}
                          onChange={(page, pageSize) => setReturnPagination({ current: page, pageSize })}
                          showSizeChanger={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden sm:block">
                    <Table
                      columns={returnColumns}
                      dataSource={returns}
                      rowKey="id"
                      pagination={{
                        current: returnPagination.current,
                        pageSize: returnPagination.pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        onChange: (page, pageSize) => setReturnPagination({ current: page, pageSize }),
                      }}
                      locale={{ emptyText: 'Chưa có lịch sử trả vỏ nào.' }}
                      scroll={{ x: 'max-content' }}
                    />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <ZoomViewerModal
        open={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        title={activeTab === 'ledger' ? 'Bảng Công Nợ Vỏ Sọt' : 'Lịch Sử Trả Vỏ'}
      >
        {activeTab === 'ledger' ? (
          <Table
            columns={loanColumns}
            dataSource={filteredLoans}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Table
            columns={returnColumns}
            dataSource={returns}
            rowKey="id"
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        )}
      </ZoomViewerModal>

      {/* ── Return Modal ── */}
      <Modal
        title={
          selectedLoan
            ? `Ghi Nhận Trả Vỏ — ${selectedLoan.partnerName}`
            : 'Ghi Nhận Trả Vỏ Khay/Sọt'
        }
        open={returnModalOpen}
        onCancel={() => { setReturnModalOpen(false); returnForm.resetFields(); setSelectedLoan(null); }}
        footer={null}
        destroyOnHidden
      >
        {selectedLoan && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Loại khay/sọt:</span>
              <strong>{selectedLoan.packagingName}</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-slate-600">Tổng đã giao:</span>
              <strong>{selectedLoan.loanedQty} cái</strong>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-slate-600">Đã trả trước:</span>
              <strong className="text-green-600">{selectedLoan.returnedQty} cái</strong>
            </div>
            <div className="flex justify-between mt-1 border-t border-orange-200 pt-1">
              <span className="font-semibold text-orange-700">Còn nợ:</span>
              <strong className="text-orange-700 text-base">
                {selectedLoan.loanedQty - selectedLoan.returnedQty} cái
              </strong>
            </div>
          </div>
        )}

        <Form
          form={returnForm}
          layout="vertical"
          onFinish={handleReturnSubmit}
        >
          <Form.Item
            name="returnedQty"
            label="Số lượng trả lại kho (cái)"
            rules={[
              { required: true, message: 'Nhập số lượng trả!' },
              {
                validator: (_, v) => {
                  if (!selectedLoan) return Promise.resolve();
                  const debt = selectedLoan.loanedQty - selectedLoan.returnedQty;
                  if (v > debt) return Promise.reject(new Error(`Tối đa ${debt} cái`));
                  if (v <= 0) return Promise.reject(new Error('Phải lớn hơn 0'));
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} size="large" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Tình trạng vỏ, ghi chú thêm..." />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end">
            <div className="flex gap-3 justify-end">
              <Button onClick={() => { setReturnModalOpen(false); returnForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" icon={<RollbackOutlined />}
                className="bg-orange-500 hover:bg-orange-400 border-none">
                Xác nhận trả
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── New Loan Modal ── */}
      <Modal
        title="Tạo Phiếu Cho Mượn Vỏ Khay/Sọt"
        open={loanModalOpen}
        onCancel={() => { setLoanModalOpen(false); loanForm.resetFields(); }}
        footer={null}
        width={850}
        destroyOnHidden
      >
        <Form
          form={loanForm}
          layout="vertical"
          onFinish={handleLoanSubmit}
          initialValues={{ partnerType: 'CUSTOMER', loanedQty: 1 }}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="partnerName"
                label="Tên Đối Tác"
                rules={[{ required: true, message: 'Nhập tên đối tác!' }]}
              >
                <Input placeholder="VD: Nhà hàng Hải Sản Biển Xanh" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="partnerType" label="Loại đối tác" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 'CUSTOMER', label: 'Khách hàng' },
                    { value: 'SUPPLIER', label: 'Nhà cung cấp' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="packagingCode"
                label="Loại Khay / Sọt"
                rules={[{ required: true, message: 'Chọn loại khay!' }]}
              >
                <Select
                  placeholder="Chọn loại bao bì"
                  showSearch
                  optionFilterProp="label"
                  options={
                    packagings.map((p) => ({ value: p.code, label: `${p.name} (${p.defaultTareWeight} kg)` }))
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="loanedQty"
                label="Số lượng giao mượn"
                rules={[{ required: true, message: 'Nhập số lượng!' }]}
              >
                <InputNumber min={1} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú kèm phiếu xuất, lý do mượn..." />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex gap-3 justify-end">
              <Button onClick={() => { setLoanModalOpen(false); loanForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Tạo phiếu cho mượn
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PackagingReturnPage;
