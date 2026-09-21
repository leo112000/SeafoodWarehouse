import React from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Switch, Row, Col, Button, App,
} from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { Product, Category } from '@/types/seafood';
import { useProductStore } from '@/stores/useProductStore';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit';
import { getErrorMessage } from '@/services/api';

const STORAGE_TYPE_CONFIG: Record<Product['storageType'], { label: string; temp: string }> = {
  ALIVE:  { label: 'Tươi sống', temp: '18–22°C' },
  FRESH:  { label: 'Ướp đá',    temp: '0–4°C' },
  FROZEN: { label: 'Cấp đông',  temp: '≤ -18°C' },
  DRY:    { label: 'Khô',       temp: 'Nhiệt độ phòng' },
};

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
  onSuccess?: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  onClose,
  editingProduct,
  categories,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const { addProduct, updateProduct } = useProductStore();
  const [form] = Form.useForm();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const { isSubmitting, handleSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const cat = categories.find(c => c.id === values.categoryId || c.code === values.categoryId);
      const productData: Omit<Product, 'id'> = {
        code: (values.code as string).toUpperCase(),
        name: values.name,
        categoryId: values.categoryId,
        categoryName: cat?.name,
        unit: values.unit,
        storageType: values.storageType,
        targetTemperature: values.targetTemperature,
        warningDaysBeforeExpiry: values.warningDaysBeforeExpiry,
        minStock: values.minStock,
        maxStock: values.maxStock,
        referencePrice: values.referencePrice,
        status: values.statusSwitch ? 'ACTIVE' : 'INACTIVE',
        note: values.note,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        message.success('Cập nhật sản phẩm thành công!');
      } else {
        await addProduct(productData);
        message.success('Thêm sản phẩm mới thành công!');
      }
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Lỗi khi lưu sản phẩm.');
      const isNameErr = errMsg.toLowerCase().includes('tên') || errMsg.toLowerCase().includes('name');
      if (isNameErr) {
        form.setFields([{ name: 'name', errors: [errMsg] }]);
      } else {
        form.setFields([{ name: 'code', errors: [errMsg] }]);
      }
      message.warning(errMsg);
    }
  });

  React.useEffect(() => {
    if (open && editingProduct) {
      form.setFieldsValue({ ...editingProduct, statusSwitch: editingProduct.status === 'ACTIVE' });
    } else if (open && !editingProduct) {
      form.resetFields();
      form.setFieldsValue({ storageType: 'FROZEN', unit: 'Kg', warningDaysBeforeExpiry: 3 });
    }
  }, [open, editingProduct, form]);

  return (
    <Modal
      title={editingProduct ? `Chỉnh sửa — ${editingProduct.name}` : 'Thêm Sản Phẩm Mới'}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={680}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
        initialValues={{ statusSwitch: true, storageType: 'FROZEN', unit: 'Kg', warningDaysBeforeExpiry: 3 }}
      >
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item name="name" label="Tên Sản Phẩm" rules={[{ required: true, message: 'Nhập tên sản phẩm!' }]}>
              <Input
                placeholder="VD: Cá Hồi Na Uy, Tôm Càng Xanh..."
                onChange={(e) => {
                  if (!editingProduct) {
                    form.setFieldsValue({ code: generateCodeFromName(e.target.value, 'SP') });
                  }
                }}
              />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="code" label="Mã Hàng" rules={[{ required: true, message: 'Nhập mã hàng!' }]}>
              <Input
                placeholder="Tự động sinh"
                disabled={!!editingProduct}
                className="font-mono bg-slate-50 dark:bg-slate-800/60"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="categoryId" label="Danh Mục" rules={[{ required: true, message: 'Chọn danh mục!' }]}>
              <Select
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Chọn danh mục"
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="unit" label="Đơn Vị Tính" rules={[{ required: true, message: 'Nhập đơn vị!' }]}>
              <Input placeholder="Kg / Con / Thùng" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="storageType" label="Loại Bảo Quản" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={Object.entries(STORAGE_TYPE_CONFIG).map(([k, v]) => ({
                  value: k, label: `${v.label} (${v.temp})`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="targetTemperature" label="Nhiệt Độ Bảo Quản (°C)" rules={[{ required: true, message: 'Nhập nhiệt độ!' }]}>
              <InputNumber style={{ width: '100%' }} placeholder="-18" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="warningDaysBeforeExpiry" label="Cảnh Báo HSD (ngày)" rules={[{ required: true, message: 'Nhập số ngày!' }]}>
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="referencePrice" label="Đơn Giá Tham Chiếu (VNĐ)" rules={[{ required: true, message: 'Nhập giá!' }]}>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="minStock" label="Tồn Kho Tối Thiểu" rules={[{ required: true, message: 'Nhập mức tối thiểu!' }]}>
              <InputNumber min={0} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="maxStock"
              label="Tồn Kho Tối Đa"
              rules={[
                { required: true, message: 'Nhập mức tối đa!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const min = getFieldValue('minStock');
                    if (!value || !min || value >= min) return Promise.resolve();
                    return Promise.reject(new Error('Tối đa phải lớn hơn tối thiểu!'));
                  },
                }),
              ]}
            >
              <InputNumber min={0} precision={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="note" label="Ghi Chú">
          <Input.TextArea rows={2} placeholder="Xuất xứ, quy cách đóng gói, lưu ý bảo quản..." />
        </Form.Item>

        <Form.Item name="statusSwitch" label="Trạng Thái Kinh Doanh" valuePropName="checked">
          <Switch checkedChildren="Đang hoạt động" unCheckedChildren="Ngừng kinh doanh" />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-3">
            <Button disabled={isSubmitting} onClick={handleClose}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isSubmitting} icon={editingProduct ? <EditOutlined /> : <PlusOutlined />}>
              {isSubmitting ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm sản phẩm')}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProductFormModal;
