import React from 'react';
import { Card, Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Typography, App } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useInboundStore } from '../../stores/useInboundStore';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;

const SEAFOOD_OPTIONS = [
  { label: 'Tôm Hùm Bông', value: 'TOMHUM', name: 'Tôm Hùm Bông' },
  { label: 'Cua Hoàng Đế', value: 'CUAHD', name: 'Cua Hoàng Đế' },
  { label: 'Cá Hồi Na Uy', value: 'CAHOI', name: 'Cá Hồi Na Uy' },
  { label: 'Mực Lá Đại', value: 'MUCLA', name: 'Mực Lá Đại' },
  { label: 'Cá Thu Phấn', value: 'CATHU', name: 'Cá Thu Phấn' },
];

export const InboundPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const addReceipt = useInboundStore((state) => state.addReceipt);

  const onFinish = (values: any) => {
    // Format dates before saving
    const formattedItems = (values.items || []).map((item: any) => {
      const selectedSeafood = SEAFOOD_OPTIONS.find((s) => s.value === item.seafoodCode);
      return {
        ...item,
        seafoodName: selectedSeafood ? selectedSeafood.name : 'Chưa xác định',
        catchDate: item.catchDate ? item.catchDate.format('YYYY-MM-DD') : '',
        expiryDate: item.expiryDate ? item.expiryDate.format('YYYY-MM-DD') : '',
        netWeight: Math.max(0, (item.totalWeight || 0) - (item.tareWeight || 0)),
        totalPrice: Math.max(0, (item.totalWeight || 0) - (item.tareWeight || 0)) * (item.unitPrice || 0),
      };
    });

    const totalAmount = formattedItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    addReceipt({
      supplier: values.supplier,
      inboundDate: values.inboundDate ? values.inboundDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      storageLocation: values.storageLocation,
      items: formattedItems,
      totalAmount,
    });

    message.success('Tạo phiếu nhập kho thành công!');
    navigate('/inventory/inbound-history');
  };

  const handleValuesChange = (_changedValues: any, allValues: any) => {
    const items = allValues.items || [];
    let isChanged = false;
    const dateStr = allValues.inboundDate ? allValues.inboundDate.format('YYYYMMDD') : '';

    const updatedItems = items.map((item: any) => {
      if (!item) return item;
      
      const total = Number(item.totalWeight) || 0;
      const tare = Number(item.tareWeight) || 0;
      const computedNet = Math.max(0, total - tare);
      
      const price = Number(item.unitPrice) || 0;
      const computedTotal = computedNet * price;

      const code = item.seafoodCode || '';
      const computedBatch = code && dateStr ? `LOT-${code}-${dateStr}` : '';

      let updatedItem = { ...item };

      if (item.netWeight !== computedNet) {
        updatedItem.netWeight = computedNet;
        isChanged = true;
      }
      if (item.totalPrice !== computedTotal) {
        updatedItem.totalPrice = computedTotal;
        isChanged = true;
      }
      if (item.batchCode !== computedBatch) {
        updatedItem.batchCode = computedBatch;
        isChanged = true;
      }

      return updatedItem;
    });

    if (isChanged) {
      form.setFieldsValue({ items: updatedItems });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Title level={2} className="m-0">Tạo Phiếu Nhập Kho Hải Sản</Title>
        <Paragraph type="secondary">Nhập thông tin nhà cung cấp, lô hàng và các chỉ số đo lường bảo quản hải sản.</Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        initialValues={{
          inboundDate: dayjs(),
          items: [
            {
              seafoodCode: undefined,
              totalWeight: 0,
              tareWeight: 0,
              netWeight: 0,
              storageCondition: 'Cấp đông',
              unitPrice: 0,
              totalPrice: 0,
              batchCode: '',
            },
          ],
        }}
      >
        <Card title="Thông tin chung" className="shadow-sm mb-6">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="supplier"
                label="Nhà cung cấp (Vựa / Tàu cá)"
                rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp!' }]}
              >
                <Input placeholder="Vựa hải sản Hùng Vương, Tàu cá QT-..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="inboundDate"
                label="Ngày nhập kho"
                rules={[{ required: true, message: 'Vui lòng chọn ngày nhập!' }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="storageLocation"
                label="Kho / Tủ đông nhận"
                rules={[{ required: true, message: 'Vui lòng chọn kho lưu trữ!' }]}
              >
                <Select placeholder="Chọn khu vực lưu trữ">
                  <Select.Option value="Kho đông lạnh A1">Kho đông lạnh A1 (Giáp xác)</Select.Option>
                  <Select.Option value="Kho đông lạnh A2">Kho đông lạnh A2 (Cua cá)</Select.Option>
                  <Select.Option value="Kho làm mát B1">Kho làm mát B1 (Tươi sống)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Danh sách hải sản nhập kho" className="shadow-sm mb-6">
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-4">
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    type="inner"
                    size="small"
                    className="border border-sky-100 dark:border-gray-800"
                    extra={
                      fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                        />
                      )
                    }
                  >
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'seafoodCode']}
                          label="Loại hải sản"
                          rules={[{ required: true, message: 'Chọn loại!' }]}
                        >
                          <Select placeholder="Chọn loại hải sản">
                            {SEAFOOD_OPTIONS.map((opt) => (
                              <Select.Option key={opt.value} value={opt.value}>
                                {opt.label}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'totalWeight']}
                          label="Tổng cân (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'tareWeight']}
                          label="Bì/Khay (kg)"
                          rules={[{ required: true, message: 'Nhập!' }]}
                        >
                          <InputNumber min={0} className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'netWeight']}
                          label="Cân thực (kg)"
                        >
                          <InputNumber disabled className="w-full" precision={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'storageCondition']}
                          label="Bảo quản"
                          rules={[{ required: true, message: 'Chọn!' }]}
                        >
                          <Select>
                            <Select.Option value="Tươi sống">Tươi sống</Select.Option>
                            <Select.Option value="Ướp đá">Ướp đá</Select.Option>
                            <Select.Option value="Cấp đông">Cấp đông</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'batchCode']}
                          label="Mã Lô (Tự động)"
                        >
                          <Input placeholder="Mã lô hàng" disabled className="text-gray-500 font-semibold" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[12, 12]} className="mt-2">
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'catchDate']}
                          label="Ngày đánh bắt"
                        >
                          <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'expiryDate']}
                          label="Hạn sử dụng"
                          rules={[{ required: true, message: 'Chọn HSD!' }]}
                        >
                          <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitPrice']}
                          label="Đơn giá (đ/kg)"
                          rules={[{ required: true, message: 'Nhập giá!' }]}
                        >
                          <InputNumber
                            min={0}
                            className="w-full"
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'totalPrice']}
                          label="Thành tiền (đ)"
                        >
                          <InputNumber
                            disabled
                            className="w-full"
                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  className="py-4 hover:border-sky-400 hover:text-sky-500"
                >
                  Thêm hải sản nhập kho
                </Button>
              </div>
            )}
          </Form.List>
        </Card>

        <div className="flex justify-end gap-4">
          <Button size="large" onClick={() => navigate('/inventory/inbound-history')}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            className="bg-sky-500 hover:bg-sky-600 border-none"
          >
            Lưu phiếu nhập
          </Button>
        </div>
      </Form>
    </div>
  );
};
export default InboundPage;
