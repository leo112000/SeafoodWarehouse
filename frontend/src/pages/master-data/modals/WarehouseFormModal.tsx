import React from 'react';
import { Modal, Form, Input, InputNumber, App } from 'antd';
import type { WarehouseItem } from '@/services/warehouseService';
import { warehouseService } from '@/services/warehouseService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { getErrorMessage } from '@/services/api';

export interface WarehouseFormModalProps {
  open: boolean;
  onClose: () => void;
  editingWarehouse: (WarehouseItem & { temperatureCelcius?: number }) | null;
  onSuccess: () => void;
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  open,
  onClose,
  editingWarehouse,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && editingWarehouse) {
      form.setFieldsValue({
        code: editingWarehouse.code,
        name: editingWarehouse.name,
        location: editingWarehouse.location,
        capacityKg: editingWarehouse.capacityKg,
        temperatureCelcius:
          editingWarehouse.temperatureCelsius ??
          editingWarehouse.temperatureCelcius ??
          -18,
        description: editingWarehouse.description || '',
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingWarehouse, form]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingWarehouse) {
        await warehouseService.update(String(editingWarehouse.id), values);
        message.success('Cập nhật kho lạnh thành công');
      } else {
        await warehouseService.create(values as Omit<WarehouseItem, 'id'>);
        message.success('Tạo mới kho lạnh thành công');
      }

      handleClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      const errMsg = getErrorMessage(err, 'Có lỗi xảy ra khi lưu kho.');
      const isNameErr =
        errMsg.toLowerCase().includes('tên') || errMsg.toLowerCase().includes('name');

      if (isNameErr) {
        form.setFields([{ name: 'name', errors: [errMsg] }]);
      } else {
        form.setFields([{ name: 'code', errors: [errMsg] }]);
      }
      message.warning(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingWarehouse ? 'Cập Nhật Kho Lạnh' : 'Thêm Mới Kho Lạnh'}
      open={open}
      onOk={handleSave}
      onCancel={handleClose}
      confirmLoading={loading}
      okText="Lưu"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="name"
          label="Tên kho lạnh"
          rules={[{ required: true, message: 'Vui lòng nhập tên kho' }]}
        >
          <Input
            placeholder="Ví dụ: Kho Lạnh Cảng Cá A1"
            onChange={(e) => {
              if (!editingWarehouse) {
                const autoCode = generateCodeFromName(e.target.value, 'KHO');
                form.setFieldsValue({ code: autoCode });
              }
            }}
          />
        </Form.Item>
        <Form.Item name="code" label="Mã kho lạnh">
          <Input
            placeholder="Tự động sinh theo tên (VD: KHO-CANG-CA-A1)"
            className="font-mono bg-slate-50 dark:bg-slate-800/60"
          />
        </Form.Item>
        <Form.Item name="location" label="Vị trí / Khu vực">
          <Input placeholder="Ví dụ: Khung A, Khu vực bến cảng" />
        </Form.Item>
        <Form.Item name="capacityKg" label="Sức chứa tối đa (kg)">
          <InputNumber className="w-full" min={1} placeholder="Ví dụ: 50000" />
        </Form.Item>
        <Form.Item name="temperatureCelcius" label="Nhiệt độ bảo quản (°C)">
          <InputNumber className="w-full" placeholder="Ví dụ: -18" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả kho lạnh">
          <Input.TextArea
            rows={3}
            placeholder="Ví dụ: Kho chuyên bảo quản tôm cá xuất khẩu, dàn lạnh Nhật Bản công suất cao..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
