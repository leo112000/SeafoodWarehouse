import React from 'react';
import { Modal, Form, Input, App } from 'antd';
import type { PartnerItem, CreatePartnerDto } from '@/services/partnerService';
import { partnerService } from '@/services/partnerService';
import { generateCodeFromName } from '@/utils/codeGenerator';
import { getErrorMessage } from '@/services/api';

export interface PartnerFormModalProps {
  open: boolean;
  onClose: () => void;
  editingPartner: PartnerItem | null;
  onSuccess: () => void;
}

export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({
  open,
  onClose,
  editingPartner,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open && editingPartner) {
      form.setFieldsValue(editingPartner);
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({
        type: 'SUPPLIER',
        isActive: true,
      });
    }
  }, [open, editingPartner, form]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.type = 'SUPPLIER';
      setLoading(true);

      if (editingPartner) {
        await partnerService.update(editingPartner.id, values);
        message.success('Cập nhật thông tin nhà cung cấp thành công!');
      } else {
        await partnerService.create(values as CreatePartnerDto);
        message.success('Thêm nhà cung cấp mới thành công!');
      }

      handleClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      const errMsg = getErrorMessage(err, 'Có lỗi xảy ra khi lưu thông tin.');
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
      title={
        editingPartner
          ? `Sửa Nhà Cung Cấp: ${editingPartner.name}`
          : 'Thêm Nhà Cung Cấp Mới'
      }
      open={open}
      onOk={handleSave}
      onCancel={handleClose}
      confirmLoading={loading}
      okText="Lưu thông tin"
      cancelText="Hủy"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Form.Item
            name="name"
            label="Tên nhà cung cấp (Tàu cá / Vựa / HTX)"
            rules={[{ required: true, message: 'Nhập tên nhà cung cấp!' }]}
          >
            <Input
              placeholder="VD: Tàu cá ĐN-90123 / HTX Hải Sản Thọ Quang"
              onChange={(e) => {
                if (!editingPartner) {
                  const autoCode = generateCodeFromName(e.target.value, 'NCC');
                  form.setFieldsValue({ code: autoCode });
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="code"
            label="Mã nhà cung cấp (Tự sinh)"
            rules={[{ required: true, message: 'Nhập mã quản lý!' }]}
          >
            <Input
              placeholder="Tự động sinh (VD: NCC-TAU-CA-DN90123)"
              className="uppercase font-mono bg-slate-50 dark:bg-slate-800/60"
              disabled={!!editingPartner}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Form.Item
            name="contactPerson"
            label="Thuyền trưởng / Chủ vựa / Người đại diện"
          >
            <Input placeholder="VD: Thuyền trưởng Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="VD: 0912 345 678" />
          </Form.Item>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Form.Item name="email" label="Email liên hệ (nếu có)">
            <Input placeholder="VD: contact@doitau.vn" />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế (nếu có)">
            <Input placeholder="VD: 0401 234 567" />
          </Form.Item>
        </div>

        <Form.Item name="address" label="Vị trí cầu cảng / Địa chỉ vựa">
          <Input.TextArea
            rows={2}
            placeholder="VD: Cầu cảng số 3, Cảng cá Thọ Quang, Đà Nẵng"
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú thêm">
          <Input.TextArea
            rows={2}
            placeholder="Thông tin giao dịch đặc biệt, phương thức thanh toán, công nợ..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
