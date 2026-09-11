import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Button, Typography, Space, App, Divider, Row, Col, Alert, Tooltip, Upload } from 'antd';
import { SettingOutlined, SaveOutlined, UndoOutlined, InfoCircleOutlined, AlertOutlined, ShopOutlined, PictureOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { settingService, type SystemSetting } from '../../services/settingService';
import { useBrandStore } from '../../stores/useBrandStore';

const { Title, Text } = Typography;

interface SettingsFormValues extends SystemSetting {
  websiteName: string;
  logoUrl?: string;
}

const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tối ưu kích thước logo xuống tối đa 128x128 để Base64 siêu nhẹ (~10-20KB), lưu DB nhanh và mượt mà
        const maxDim = 128;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const SystemSettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<SettingsFormValues>();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const { websiteName, logoUrl, loadBrand, updateBrand } = useBrandStore();

  // Watch fields for live preview
  const watchedName = Form.useWatch('websiteName', form) || websiteName || 'KHO HẢI SẢN';
  const watchedLogo = Form.useWatch('logoUrl', form) ?? logoUrl;

  const loadSettings = async () => {
    setLoading(true);
    try {
      await loadBrand();
      const brandState = useBrandStore.getState();
      const data = await settingService.getSettings();

      form.setFieldsValue({
        websiteName: data.websiteName || brandState.websiteName || 'KHO HẢI SẢN',
        logoUrl: data.logoUrl !== undefined && data.logoUrl !== null ? data.logoUrl : (brandState.logoUrl || ''),
        expiringAlertDays: Number(data.expiringAlertDays) || 15,
        tempDeviationThreshold: Number(data.tempDeviationThreshold) || 3.0,
        defaultSeafoodPrice: Number(data.defaultSeafoodPrice) || 250000,
        autoRefreshIntervalSeconds: Number(data.autoRefreshIntervalSeconds) || 30,
        lowStockWarningPercent: Number(data.lowStockWarningPercent) || 100,
      });
    } catch {
      message.error('Không thể tải cài đặt hệ thống từ Cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (values: SettingsFormValues) => {
    setSaving(true);
    try {
      // 1. Cập nhật tên website và logo thương hiệu vào store
      await updateBrand(values.websiteName, values.logoUrl);

      // 2. Cập nhật thông số hệ thống và tên/logo trực tiếp vào CSDL
      await settingService.updateSettings({
        websiteName: values.websiteName,
        logoUrl: values.logoUrl,
        expiringAlertDays: values.expiringAlertDays,
        tempDeviationThreshold: values.tempDeviationThreshold || 3.0,
        defaultSeafoodPrice: values.defaultSeafoodPrice || 250000,
        autoRefreshIntervalSeconds: values.autoRefreshIntervalSeconds,
        lowStockWarningPercent: values.lowStockWarningPercent,
      });

      message.success('Đã lưu cài đặt hệ thống và nhận diện thương hiệu thành công!');
      await loadSettings();
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi lưu cấu hình hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    const defaults: SettingsFormValues = {
      websiteName: 'KHO HẢI SẢN',
      logoUrl: '',
      expiringAlertDays: 15,
      tempDeviationThreshold: 3.0,
      defaultSeafoodPrice: 250000,
      autoRefreshIntervalSeconds: 30,
      lowStockWarningPercent: 100,
    };
    form.setFieldsValue(defaults);
    message.info('Đã khôi phục các tham số cấu hình về giá trị mặc định.');
  };

  const isImageLogo = watchedLogo && (watchedLogo.startsWith('http') || watchedLogo.startsWith('data:') || watchedLogo.startsWith('/'));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 truncate flex items-center gap-2">
            <SettingOutlined className="text-sky-600" /> Cài Đặt Hệ Thống Kho
          </h1>
        </div>
      </div>

      <Alert
        message="Cài đặt hệ thống & Giao diện thương hiệu"
        description="Bạn có thể tùy chỉnh tên hiển thị góc trái màn hình, logo website và các thông số vận hành tự động cho kho hải sản."
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
            websiteName: 'KHO HẢI SẢN',
            logoUrl: '',
            expiringAlertDays: 15,
            autoRefreshIntervalSeconds: 30,
            lowStockWarningPercent: 100,
          }}
        >
          {/* KHỐI 1: TÊN & LOGO WEBSITE */}
          <Title level={4} className="mt-0 text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <ShopOutlined className="text-sky-500" /> Nhận Diện Thương Hiệu & Logo Website
          </Title>

          {/* Hộp xem trước trực quan */}
          <div className="p-3 bg-slate-900 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border border-slate-800">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <PictureOutlined /> Xem trước hiển thị trên thanh Menu (Góc trên bên trái):
            </div>
            <div className="flex items-center gap-2 bg-[#001529] px-3 py-2 rounded-lg border border-slate-700 shadow-inner">
              {isImageLogo ? (
                <img src={watchedLogo} alt="Logo Preview" className="w-6 h-6 object-contain rounded flex-shrink-0" />
              ) : (
                <span className="text-xl flex-shrink-0">{watchedLogo || '🚢'}</span>
              )}
              <span className="font-extrabold text-white text-sm sm:text-base tracking-wide truncate max-w-xs">
                {watchedName}
              </span>
            </div>
          </div>

          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Form.Item
                name="websiteName"
                label={
                  <Space>
                    <Text strong>Tên website / Thương hiệu kho</Text>
                    <Tooltip title="Tên xuất hiện ở góc trên bên trái thanh menu sidebar.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập tên website / kho!' }]}
              >
                <Input
                  placeholder="Ví dụ: KHO HẢI SẢN, HẢI SẢN BIỂN ĐÔNG..."
                  className="w-full font-semibold"
                  maxLength={100}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="logoUrl"
                label={
                  <Space>
                    <Text strong>Logo website (Tải ảnh lên / URL ảnh / Icon emoji)</Text>
                    <Tooltip title="Bạn có thể bấm 'Tải ảnh' để chọn file ảnh từ máy tính (PNG, JPG, SVG, WebP), hoặc dán link ảnh, hoặc gõ icon như 🚢, 🐟. Để trống sẽ dùng mặc định 🚢.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  placeholder="Dán link ảnh hoặc gõ icon (🚢, 🐟...)"
                  className="w-full"
                  allowClear
                  addonAfter={
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={async (file) => {
                        try {
                          const base64 = await processImageFile(file);
                          form.setFieldValue('logoUrl', base64);
                          message.success(`Đã chọn ảnh '${file.name}' làm logo thành công!`);
                        } catch {
                          message.error('Không thể đọc file ảnh.');
                        }
                        return false;
                      }}
                    >
                      <span className="cursor-pointer flex items-center gap-1 hover:text-sky-600 select-none font-medium px-1">
                        <UploadOutlined /> Tải ảnh
                      </span>
                    </Upload>
                  }
                />
              </Form.Item>
              {isImageLogo && (
                <div className="flex items-center gap-2 -mt-3 mb-3 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/80 p-1.5 px-3 rounded-md border border-gray-200 dark:border-slate-700">
                  <img src={watchedLogo} alt="Logo" className="w-5 h-5 object-contain rounded border border-gray-300 dark:border-slate-600 bg-white flex-shrink-0" />
                  <span className="truncate flex-1 font-medium">
                    {watchedLogo.startsWith('data:') ? 'Ảnh đã tải lên từ máy tính' : 'Ảnh từ đường dẫn URL'}
                  </span>
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    className="p-0 h-auto text-xs font-semibold"
                    onClick={() => form.setFieldValue('logoUrl', '')}
                  >
                    Gỡ ảnh
                  </Button>
                </div>
              )}
            </Col>
          </Row>

          <Divider />

          {/* KHỐI 2: THÔNG SỐ VẬN HÀNH & CẢNH BÁO */}
          <Title level={4} className="mt-0 text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <AlertOutlined className="text-amber-500" /> Thông Số Vận Hành & Cảnh Báo
          </Title>
          <Row gutter={24}>
            <Col xs={24} md={8}>
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
            <Col xs={24} md={8}>
              <Form.Item
                name="lowStockWarningPercent"
                label={
                  <Space>
                    <Text strong>Ngưỡng cảnh báo tồn kho thấp (kg)</Text>
                    <Tooltip title="Mức khối lượng tồn kho tối thiểu (kg) để hệ thống cảnh báo khi sản phẩm sắp hết hàng.">
                      <InfoCircleOutlined className="text-gray-400" />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: 'Vui lòng nhập ngưỡng tồn kho tối thiểu!' }]}
              >
                <InputNumber
                  min={1}
                  max={10000}
                  addonAfter="kg"
                  className="w-full"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
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
              className="bg-sky-600 hover:bg-sky-500 font-semibold"
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
