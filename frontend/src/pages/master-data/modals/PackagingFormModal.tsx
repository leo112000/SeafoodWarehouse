import React from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, App } from 'antd';
import type { PackagingType } from '@/types/seafood';
import { packagingService } from '@/services/packagingService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit';
import { getErrorMessage } from '@/services/api';

interface PackagingFormModalProps {
  open: boolean;
  onClose: () => void;
  editingPkg: PackagingType | null;
  onSuccess: () => void;
}

export const PackagingFormModal: React.FC<PackagingFormModalProps> = ({
  open, onClose, editingPkg, onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && editingPkg) {
      form.setFieldsValue({
        code: editingPkg.code,
        name: editingPkg.name,
        category: editingPkg.category,
        defaultTareWeight: editingPkg.defaultTareWeight,
        unit: editingPkg.unit,
        stockQuantity: editingPkg.stockQuantity,
        note: editingPkg.note,
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingPkg, form]);

  const { isSubmitting: isSubmittingForm, handleSubmit: handleFormSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const payload = {
        code: values.code.toUpperCase(),
        name: values.name,
        category: values.category,
        defaultTareWeight: values.defaultTareWeight,
        unit: values.unit,
        stockQuantity: values.stockQuantity,
        note: values.note,
      };

      if (editingPkg) {
        await packagingService.update(editingPkg.id, payload);
        message.success('Cap nhat thanh cong!');
      } else {
        await packagingService.create(payload);
        message.success('Them moi thanh cong!');
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Loi khi luu thong tin bao bi.');
      const isNameErr = errMsg.toLowerCase().includes('ten') || errMsg.toLowerCase().includes('name');
      if (isNameErr) {
        form.setFields([{ name: 'name', errors: [errMsg] }]);
      } else {
        form.setFields([{ name: 'code', errors: [errMsg] }]);
      }
      message.warning(errMsg);
    }
  });

  return (
    <Modal
      title={editingPkg ? 'Chinh sua thong tin bao bi' : 'Them danh muc bao bi moi'}
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={isSubmittingForm}
      cancelButtonProps={{ disabled: isSubmittingForm }}
      okText={editingPkg ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy bỏ"
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
        initialValues={{ category: 'CONTAINER', unit: 'Cai', defaultTareWeight: 1.5, stockQuantity: 100 }}
        className="mt-4"
      >
        <Form.Item name="name" label="Ten hien thi" rules={[{ required: true, message: 'Vui long nhap ten bao bi!' }]}>
          <Input
            placeholder="VD: Sot nhua do tieu chuan, Thung xop 20kg..."
            onChange={(e) => {
              if (!editingPkg) {
                form.setFieldsValue({ code: generateCodeFromName(e.target.value, 'PKG') });
              }
            }}
          />
        </Form.Item>

        <Form.Item name="code" label="Ma Bao bi / Sot" rules={[{ required: true, message: 'Vui long nhap ma!' }]}>
          <Input
            placeholder="Tu dong sinh (VD: PKG-SOT-NHUA-DO)"
            disabled={!!editingPkg}
            className="font-mono bg-slate-50 dark:bg-slate-800/60"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="category" label="Phan loai" rules={[{ required: true }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={[
                  { value: 'CONTAINER', label: 'Sot / Khay luan chuyen' },
                  { value: 'CONSUMABLE', label: 'Vat tu dung 1 lan' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="unit" label="Don vi tinh" rules={[{ required: true }]}>
              <Input placeholder="VD: Cai, Chiec, Thung" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="defaultTareWeight" label="Trong luong bi chuan (kg)" rules={[{ required: true, message: 'Vui long nhap trong luong bi!' }]}>
              <InputNumber min={0} step={0.1} precision={2} className="w-full" placeholder="1.8" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="stockQuantity" label="So luong ton kho ban dau" rules={[{ required: true, message: 'Vui long nhap so luong!' }]}>
              <InputNumber min={0} step={1} className="w-full" placeholder="100" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="note" label="Ghi chu su dung">
          <Input.TextArea rows={3} placeholder="VD: Dung dung ca com nhap kho..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PackagingFormModal;
