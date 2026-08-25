import React, { useState, useMemo, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Modal, Form, Select, InputNumber,
  Input, Row, Col, Statistic, App, Tabs, Badge, Tooltip,
} from 'antd';
import {
  RollbackOutlined, PlusOutlined, WarningOutlined,
  CheckCircleOutlined, InboxOutlined, HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePackagingReturnStore, type PackagingLoan } from '../../stores/usePackagingReturnStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePackagingStore } from '../../stores/usePackagingStore';

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">
            Quản Lý Cho Mượn & Trả Vỏ Khay/Sọt
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi công nợ vỏ sọt theo từng đối tác và ghi nhận trả lại kho.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            icon={<PlusOutlined />}
            onClick={() => setLoanModalOpen(true)}
          >
            Tạo phiếu cho mượn
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
            className="bg-orange-500 hover:bg-orange-400 border-none"
          >
            Ghi nhận Trả Vỏ Khay/Sọt
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng số vỏ đã giao mượn"
              value={totalLoaned}
              suffix="cái"
              prefix={<InboxOutlined className="text-sky-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Đã thu hồi về kho"
              value={totalReturned}
              suffix="cái"
              prefix={<CheckCircleOutlined className="text-green-500 mr-2" />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Còn nợ ngoài kho"
              value={totalDebt}
              suffix="cái"
              prefix={<WarningOutlined className="text-orange-500 mr-2" />}
              valueStyle={{ color: totalDebt > 0 ? '#f97316' : '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Đối tác còn công nợ"
              value={pendingLoans}
              suffix="phiếu"
              prefix={<HistoryOutlined className="text-red-500 mr-2" />}
              valueStyle={{ color: pendingLoans > 0 ? '#ef4444' : '#22c55e' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Main Tabs ── */}
      <Card bordered={false} className="shadow-sm">
        <Tabs
          defaultActiveKey="ledger"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-slate-500">Lọc theo đối tác:</span>
                    <Select
                      value={partnerFilter}
                      onChange={setPartnerFilter}
                      className="w-56"
                      options={[
                        { value: 'ALL', label: 'Tất cả đối tác' },
                        ...partners.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                  </div>
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
              ),
            },
          ]}
        />
      </Card>

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
        destroyOnClose
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
        destroyOnClose
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
                <Select options={[
                  { value: 'CUSTOMER', label: 'Khách hàng' },
                  { value: 'SUPPLIER', label: 'Nhà cung cấp' },
                ]} />
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
                <Select placeholder="Chọn loại bao bì" options={
                  packagings.map((p) => ({ value: p.code, label: `${p.name} (${p.defaultTareWeight} kg)` }))
                } />
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
