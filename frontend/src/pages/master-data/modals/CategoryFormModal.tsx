import React from 'react';
import { Modal, Form, Input, Button, App } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { Category } from '@/types/seafood';
import { useCategoryStore } from '@/stores/useCategoryStore';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit';
import { getErrorMessage } from '@/services/api';

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  onSuccess?: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open, onClose, editingCategory, onSuccess,
}) => {
  const { message } = App.useApp();
  const { addCategory, updateCategory } = useCategoryStore();
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open && editingCategory) {
      form.setFieldsValue({ code: editingCategory.code, name: editingCategory.name, description: editingCategory.description });
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingCategory, form]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const { isSubmitting, handleSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const payload = {
        code: (values.code as string).toUpperCase(),
        name: values.name,
        description: values.description,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        message.success('Cap nhat danh muc thanh cong!');
      } else {
        await addCategory(payload);
        message.success('Them danh muc moi thanh cong!');
      }
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Loi khi luu thong tin danh muc.');
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
      title={editingCategory ? `Chinh sua - ${editingCategory.name}` : 'Them Danh Muc Moi'}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
        <Form.Item
          name="name"
          label="Ten Danh Muc"
          rules={[
            { required: true, message: 'Nhap ten danh muc!' },
            { max: 150, message: 'Toi da 150 ky tu!' },
          ]}
        >
          <Input
            placeholder="VD: Ca Bien, Tom Su, Cua Ghe..."
            onChange={(e) => {
              if (!editingCategory) {
                form.setFieldsValue({ code: generateCodeFromName(e.target.value) });
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="code"
          label="Ma Danh Muc"
          rules={[
            { required: true, message: 'Nhap ma danh muc!' },
            { max: 50, message: 'Toi da 50 ky tu!' },
          ]}
        >
          <Input
            placeholder="Tu dong sinh theo ten (VD: CA-BIEN, TOM-SU)"
            disabled={!!editingCategory}
            className="font-mono bg-slate-50 dark:bg-slate-800/60"
          />
        </Form.Item>

        <Form.Item name="description" label="Mo Ta" rules={[{ max: 500, message: 'Toi da 500 ky tu!' }]}>
          <Input.TextArea rows={3} placeholder="Mo ta ngan ve nhom danh muc nay..." />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end gap-3">
            <Button disabled={isSubmitting} onClick={handleClose}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting} disabled={isSubmitting} icon={editingCategory ? <EditOutlined /> : <PlusOutlined />}>
              {isSubmitting ? 'Đang lưu...' : (editingCategory ? 'Cập nhật' : 'Thêm danh mục')}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CategoryFormModal;
