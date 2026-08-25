import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Select, InputNumber, Row, Col, Space, Typography, Table, Tag, DatePicker, Radio, App } from 'antd';
import { SaveOutlined, ReloadOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { useBatchStore } from '../../stores/useBatchStore';
import { formatCurrency, formatWeight } from '../../utils/format';

const { Title, Paragraph } = Typography;

interface WastageLog {
  id: string;
  date: string;
  type: 'Hao hụt' | 'Chuyển phân loại';
  seafoodName: string;
  batchCode: string;
  weight: number;
  reason: string;
  details?: string;
}

export const WastagePage: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const batches = useBatchStore((state) => state.batches);

  const [mode, setMode] = useState<'wastage' | 'reclass'>('wastage');
  const [selectedBatchCode, setSelectedBatchCode] = useState<string | null>(null);

  // Wastage logs local history
  const [logs, setLogs] = useState<WastageLog[]>([
  ]);

  const activeBatch = batches.find((b) => b.batchCode === selectedBatchCode);

  const handleModeChange = (e: any) => {
    setMode(e.target.value);
    form.resetFields();
    form.setFieldsValue({ mode: e.target.value });
    setSelectedBatchCode(null);
  };

  const fetchWastageLogs = async () => {
    try {
      const res = await api.get('/wastage');
      if (res.data?.data) {
        setLogs(res.data.data);
      }
    } catch {
      // Fallback
    }
  };

  const handleFormSubmit = async (values: any) => {
    try {
      await api.post('/wastage', {
        mode,
        sourceBatchCode: values.sourceBatchCode,
        weight: values.weight,
        reason: values.reason || (mode === 'wastage' ? 'Hao hụt tự nhiên/hư hỏng' : 'Chuyển phân loại ngợp'),
        newUnitPrice: values.newUnitPrice,
        newExpiryDate: values.newExpiryDate ? values.newExpiryDate.format('YYYY-MM-DD') : null
      });

      message.success(mode === 'wastage' ? `Đã ghi nhận hao hụt ${values.weight}kg vào CSDL!` : `Đã chuyển phân loại ${values.weight}kg sang lô ngợp trong CSDL!`);
      
      form.resetFields();
      setSelectedBatchCode(null);
      fetchMonthlyStats();
      fetchWastageLogs();
    } catch {
      message.error('Lỗi khi ghi nhận hao hụt vào CSDL!');
    }
  };

  // Dynamic monthly stats report from backend DB
  const [monthlyStats, setMonthlyStats] = useState<Array<{ month: string; totalInbound: number; totalWastage: number; rate: number }>>([]);

  const fetchMonthlyStats = async () => {
    try {
      const res = await api.get('/reports/wastage-monthly');
      if (res.data?.data) {
        setMonthlyStats(res.data.data);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchMonthlyStats();
    fetchWastageLogs();
  }, []);

  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });

  const logColumns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { title: 'Mã số', dataIndex: 'id', key: 'id' },
    { title: 'Ngày ghi nhận', dataIndex: 'date', key: 'date' },
    { title: 'Loại hình', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color={t === 'Hao hụt' ? 'red' : 'blue'}>{t}</Tag> },
    { title: 'Mặt hàng hải sản', dataIndex: 'seafoodName', key: 'seafoodName' },
    { title: 'Mã lô nguồn', dataIndex: 'batchCode', key: 'batchCode' },
    { title: 'Khối lượng (kg)', dataIndex: 'weight', key: 'weight', render: (w: number) => formatWeight(w) },
    { title: 'Lý do / Mô tả', dataIndex: 'reason', key: 'reason' },
  ];

  return (
    <div className="print-constrained">
      <div className="mb-6">
        <Title level={2} className="m-0">Hao Hụt & Chuyển Phân Loại Hải Sản</Title>
        <Paragraph type="secondary">Ghi nhận lượng hải sản hao hụt tự nhiên (ngợp, chết) hoặc điều chuyển phân loại bảo quản để bảo toàn giá trị kinh tế.</Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Ghi nhận sự cố & Phân loại" className="shadow-sm">
            <div className="mb-6 text-center">
              <Radio.Group value={mode} onChange={handleModeChange} buttonStyle="solid" size="large">
                <Radio.Button value="wastage">Báo Cáo Hao Hụt</Radio.Button>
                <Radio.Button value="reclass">Chuyển Phân Loại</Radio.Button>
              </Radio.Group>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormSubmit}
              initialValues={{ mode: 'wastage' }}
            >
              <Form.Item
                name="sourceBatchCode"
                label="Lô hàng nguồn chịu tác động"
                rules={[{ required: true, message: 'Vui lòng chọn lô hàng!' }]}
              >
                <Select
                  placeholder="Chọn mã lô hàng"
                  onChange={(val) => setSelectedBatchCode(val)}
                >
                  {batches
                    .filter((b) => b.quantity > 0)
                    .map((b) => (
                      <Select.Option key={b.batchCode} value={b.batchCode}>
                        {b.batchCode} ({b.seafoodName}) - Tồn: {b.quantity}kg
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>

              {activeBatch && (
                <div className="p-3 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-gray-800 rounded mb-4 text-xs">
                  <Row gutter={8}>
                    <Col span={12}>Tên hải sản: <strong>{activeBatch.seafoodName}</strong></Col>
                    <Col span={12}>HSD lô gốc: <strong>{activeBatch.expiryDate}</strong></Col>
                    <Col span={12} className="mt-1">Khối lượng khả dụng: <strong>{formatWeight(activeBatch.quantity)}</strong></Col>
                    <Col span={12} className="mt-1">Đơn giá gốc: <strong>{formatCurrency(activeBatch.unitPrice)}</strong></Col>
                  </Row>
                </div>
              )}

              <Form.Item
                name="weight"
                label={mode === 'wastage' ? 'Khối lượng hao hụt (kg)' : 'Khối lượng chuyển phân loại (kg)'}
                rules={[
                  { required: true, message: 'Nhập khối lượng!' },
                  () => ({
                    validator(_, value) {
                      if (!value || value <= 0) return Promise.reject(new Error('Khối lượng phải lớn hơn 0'));
                      if (activeBatch && value > activeBatch.quantity) {
                        return Promise.reject(new Error(`Vượt quá tồn kho lô hiện tại (${activeBatch.quantity}kg)`));
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={0.1} precision={1} className="w-full" />
              </Form.Item>

              {mode === 'wastage' ? (
                <Form.Item
                  name="reason"
                  label="Lý do hao hụt"
                  rules={[{ required: true, message: 'Chọn hoặc nhập lý do!' }]}
                >
                  <Select placeholder="Chọn lý do sự cố">
                    <Select.Option value="Chết ngạt (Tươi sống)">Chết ngạt (Tươi sống)</Select.Option>
                    <Select.Option value="Hỏng chất lượng (Hôi ươn)">Hỏng chất lượng (Hôi ươn)</Select.Option>
                    <Select.Option value="Biến đổi màu sắc">Biến đổi màu sắc</Select.Option>
                    <Select.Option value="Hao hụt tự nhiên (Mất nước)">Hao hụt tự nhiên (Mất nước)</Select.Option>
                  </Select>
                </Form.Item>
              ) : (
                <div className="p-4 border border-dashed border-sky-200 dark:border-gray-800 rounded mb-4 space-y-4">
                  <div className="font-semibold text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <SwapOutlined />
                    <span>Thông tin phân loại mới (Hạ cấp sang ngợp ướp đá)</span>
                  </div>

                  <Form.Item
                    name="newUnitPrice"
                    label="Đơn giá mới (đ/kg)"
                    rules={[{ required: true, message: 'Nhập đơn giá mới!' }]}
                  >
                    <InputNumber
                      min={0}
                      className="w-full"
                      placeholder="VD: 800,000"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="newExpiryDate"
                    label="Hạn sử dụng mới (Lô ngợp có HSD ngắn hơn)"
                    rules={[{ required: true, message: 'Chọn HSD mới!' }]}
                  >
                    <DatePicker className="w-full" format="YYYY-MM-DD" />
                  </Form.Item>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setSelectedBatchCode(null); }}>
                  Làm mới
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  className="bg-sky-500 hover:bg-sky-600 border-none"
                >
                  {mode === 'wastage' ? 'Ghi nhận hao hụt' : 'Xác nhận chuyển đổi'}
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <WarningOutlined className="text-red-500" />
                <span>Báo Cáo Tỷ Lệ Hao Hụt Theo Tháng</span>
              </Space>
            }
            className="shadow-sm h-full"
          >
            <Table
              dataSource={monthlyStats}
              columns={[
                {
                  title: 'STT',
                  key: 'stt',
                  width: 55,
                  align: 'center' as const,
                  render: (_: any, __: any, index: number) => index + 1,
                },
                { title: 'Tháng', dataIndex: 'month', key: 'month' },
                { title: 'Tổng khối lượng nhập (kg)', dataIndex: 'totalInbound', key: 'totalInbound', render: (val) => `${val.toLocaleString()} kg` },
                { title: 'Hao hụt (kg)', dataIndex: 'totalWastage', key: 'totalWastage', render: (val) => `${val} kg` },
                {
                  title: 'Tỷ lệ hao hụt (%)',
                  dataIndex: 'rate',
                  key: 'rate',
                  render: (val) => <Tag color={val > 1.2 ? 'red' : 'green'}>{val}%</Tag>,
                },
              ]}
              rowKey="month"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-slate-900 border border-yellow-100 dark:border-gray-800 text-xs text-gray-500 rounded">
              * Tỷ lệ hao hụt an toàn tiêu chuẩn của kho hải sản được khuyến nghị ở mức <strong>&lt; 1.5%</strong>. Nếu vượt quá, vui lòng rà soát lại kỹ quy trình bảo quản và nhiệt độ tủ đông.
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Lịch sử nhật ký hao hụt & chuyển đổi phân loại" className="shadow-sm mt-6">
        <Table
          dataSource={logs}
          columns={logColumns}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};
export default WastagePage;
