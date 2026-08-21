import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, Typography, Space, App, Divider, Row, Col, Alert, Tooltip } from 'antd';
import { SettingOutlined, SaveOutlined, UndoOutlined, InfoCircleOutlined, DashboardOutlined, AlertOutlined } from '@ant-design/icons';
import { settingService, type SystemSetting } from '../../services/settingService';

const { Title, Paragraph, Text } = Typography;

export const SystemSettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<SystemSetting>();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingService.getSettings();
      form.setFieldsValue(data);
    } catch {
      message.error('Không thể tải cài đặt hệ thống từ Cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (values: SystemSetting) => {
    setSaving(true);
    try {
      await settingService.updateSettings(values);
      message.success('Đã lưu cấu hình cài đặt hệ thống thành công vào CSDL!');
      await loadSettings();
    } catch {
      message.error('Có lỗi xảy ra khi lưu cấu hình hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    const defaults: SystemSetting = {
      expiringAlertDays: 15,
      tempDeviationThreshold: 3.0,
      defaultSeafoodPrice: 250000,
      autoRefreshIntervalSeconds: 30,
      lowStockWarningPercent: 100,
    };
    form.setFieldsValue(defaults);
    message.info('Đã khôi phục các tham số cấu hình về giá trị mặc định.');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <Title level={2} className="m-0 flex items-center gap-2">
            <SettingOutlined className="text-sky-600" /> Cài Đặt Hệ Thống Kho
          </Title>
          <Paragraph type="secondary" className="mb-0">
            Quản lý và thiết lập các thông số cảnh báo vận hành, thời hạn lô hàng và định mức kho lưu trữ lâu dài trong CSDL.
          </Paragraph>
        </div>
      </div>

      <Alert
        message="Thông tin cấu hình lưu trong CSDL Settings"
        description="Các thông số dưới đây sẽ được áp dụng tự động cho Bảng điều khiển (Dashboard), trang Cảnh báo vận hành và báo cáo kho hải sản."
        type="info"
        showIcon
        className="mb-6 shadow-sm border-sky-200"
      />

      <Card loading={loading} className="shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            expiringAlertDays: 15,
            tempDeviationThreshold: 3.0,
            defaultSeafoodPrice: 250000,
            autoRefreshIntervalSeconds: 30,
            lowStockWarningPercent: 100,
          }}
        >
          <Title level={4} className="mt-0 text-gray-700 flex items-center gap-2">
            <AlertOutlined className="text-amber-500" /> Thông Số Cảnh Báo Vận Hành
          </Title>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="expiringAlertDays"
                label={
                  <Space>
                    <Text strong>Số ngày cảnh báo lô hàng sắp hết hạn</Text>
                    <Tooltip title="Các lô hàng có thời gian còn lại nhỏ hơn hoặc bằng số ngày này sẽ được đưa vào danh sách cảnh báo cận date.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập số ngày cảnh báo!' }]}
              >
                <InputNumber
                  min={1}
                  max={180}
                  addonAfter="ngày"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="tempDeviationThreshold"
                label={
                  <Space>
                    <Text strong>Ngưỡng độ lệch nhiệt độ kho (°C)</Text>
                    <Tooltip title="Nếu nhiệt độ kho lạnh thực tế lệch vượt quá ngưỡng này so với nhiệt độ chuẩn, hệ thống sẽ phát cảnh báo bão động nguy cấp.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập ngưỡng lệch nhiệt độ!' }]}
              >
                <InputNumber
                  min={0.1}
                  max={20}
                  step={0.5}
                  addonAfter="°C"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={4} className="mt-0 text-gray-700 flex items-center gap-2">
            <DashboardOutlined className="text-sky-500" /> Thông Số Tính Toán & Tần Suất Làm Mới
          </Title>
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="defaultSeafoodPrice"
                label={
                  <Space>
                    <Text strong>Đơn giá ước tính mặc định</Text>
                    <Tooltip title="Được sử dụng để tính ước tính tổng giá trị kho hàng đối với các sản phẩm chưa thiết lập đơn giá tham chiếu.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập đơn giá mặc định!' }]}
              >
                <InputNumber<number>
                  min={0}
                  step={10000}
                  addonAfter="VNĐ / kg"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number((value || '').replace(/\,/g, ''))}
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="autoRefreshIntervalSeconds"
                label={
                  <Space>
                    <Text strong>Tần suất tự động làm mới Dashboard</Text>
                    <Tooltip title="Khoảng thời gian (giây) giữa các lần tự động tải lại dữ liệu Dashboard real-time.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập tần suất làm mới!' }]}
              >
                <InputNumber
                  min={5}
                  max={300}
                  addonAfter="giây"
                  className="w-full"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              icon={<UndoOutlined />}
              onClick={handleResetDefault}
              disabled={saving}
            >
              Khôi Phục Mặc Định
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              className="bg-sky-600 hover:bg-sky-500"
            >
              Lưu Cấu Hình
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
