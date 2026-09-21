import React, { useMemo } from 'react';
import { Modal, Form, Select, InputNumber, Input, Space, App } from 'antd';
import { PlusCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { PackagingType } from '@/types/seafood';
import { packagingService } from '@/services/packagingService';
import { useAsyncSubmit } from '@/hooks/useAsyncSubmit';
import { useAuthStore } from '@/stores/useAuthStore';

interface PackagingAdjustModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'ADD' | 'LOSS';
  packagings: PackagingType[];
  selectedPkg: PackagingType | null;
  onSuccess: () => void;
}

export const PackagingAdjustModal: React.FC<PackagingAdjustModalProps> = ({
  open, onClose, mode, packagings, selectedPkg, onSuccess,
}) => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const [adjustForm] = Form.useForm();

  const watchedPkgId = Form.useWatch('packagingId', adjustForm);
  const currentPkg = useMemo(
    () => packagings.find((p) => String(p.id) === String(watchedPkgId ?? selectedPkg?.id)),
    [packagings, watchedPkgId, selectedPkg]
  );
  const availableStock = currentPkg?.stockQuantity ?? 0;

  React.useEffect(() => {
    if (open) {
      adjustForm.resetFields();
      if (selectedPkg) {
        adjustForm.setFieldsValue({ packagingId: selectedPkg.id });
      }
    }
  }, [open, selectedPkg, adjustForm]);

  const { isSubmitting, handleSubmit } = useAsyncSubmit(async (values: any) => {
    try {
      const pkgId = Number(values.packagingId || selectedPkg?.id);
      const targetPkg = packagings.find((p) => Number(p.id) === pkgId);
      const qty = Math.abs(Number(values.quantity || 0));

      if (mode === 'LOSS') {
        const stock = targetPkg?.stockQuantity ?? 0;
        if (stock <= 0) {
          message.error(`Khong the bao hong vi loai sot "${targetPkg?.name}" hien co 0 trong kho.`);
          return;
        }
        if (qty > stock) {
          message.error(`So luong bao hong (${qty}) vuot qua ton kho thuc te (${stock} ${targetPkg?.unit || 'cai'}).`);
          return;
        }
      }

      const finalQty = mode === 'ADD' ? qty : -qty;

      await packagingService.adjustStock({
        packagingId: pkgId,
        adjustmentQty: finalQty,
        reason: values.reason || (mode === 'ADD' ? 'Nhap bo sung sot' : 'Bao hu hong / bao mat sot'),
        performedBy: user?.name ?? 'Thu kho',
      });

      message.success(mode === 'ADD' ? 'Da nhap bo sung so luong sot vao kho!' : 'Da ghi nhan bao hong / bao mat sot thanh cong!');
      onClose();
      onSuccess();
    } catch {
      message.error('Khong the cap nhat so luong sot.');
    }
  });

  return (
    <Modal
      title={
        <Space>
          {mode === 'ADD' ? <PlusCircleOutlined className="text-emerald-500" /> : <WarningOutlined className="text-red-500" />}
          <span>{mode === 'ADD' ? 'Nhap Bo Sung So Luong Sot' : 'Ghi Nhan Bao Hong / Bao Mat Sot'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={() => adjustForm.submit()}
      confirmLoading={isSubmitting}
      cancelButtonProps={{ disabled: isSubmitting }}
      okText={mode === 'ADD' ? 'Cap nhat tang ton kho' : 'Cap nhat tru ton kho'}
      okButtonProps={{
        danger: mode === 'LOSS',
        disabled: isSubmitting || (mode === 'LOSS' && availableStock <= 0),
      }}
    >
      <Form form={adjustForm} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="packagingId"
          label="Chon Loai Sot / Bao Bi"
          rules={[{ required: true, message: 'Vui long chon loai sot!' }]}
          initialValue={selectedPkg?.id}
          extra={
            mode === 'LOSS' && currentPkg && (
              <div className="mt-1.5 text-xs">
                {availableStock <= 0 ? (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium">
                    Loai sot nay hien khong con cai nao trong kho (Ton tai kho: 0).
                  </div>
                ) : (
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Kha dung tai kho de bao hong: <strong>{availableStock}</strong> {currentPkg.unit || 'cai'}
                  </div>
                )}
              </div>
            )
          }
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={packagings.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.code}) - Ton tai kho: ${p.stockQuantity} ${p.unit}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="quantity"
          label={mode === 'ADD' ? 'So luong sot nhap them (+)' : 'So luong sot hong / mat (-)'}
          rules={[
            { required: true, message: 'Vui long nhap so luong!' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (value <= 0) return Promise.reject(new Error('So luong phai lon hon 0'));
                if (mode === 'LOSS') {
                  if (availableStock <= 0) return Promise.reject(new Error('Trong kho khong co sot nao (Ton: 0)'));
                  if (value > availableStock) return Promise.reject(new Error(`Toi da ${availableStock} ${currentPkg?.unit || 'cai'} tai kho`));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            min={1}
            max={mode === 'LOSS' ? Math.max(1, availableStock) : undefined}
            disabled={mode === 'LOSS' && availableStock <= 0}
            precision={0}
            className="w-full"
            placeholder={mode === 'LOSS' ? `Toi da ${availableStock}` : 'VD: 50'}
          />
        </Form.Item>

        <Form.Item name="reason" label="Ly do / Ghi chu chi tiet" rules={[{ required: true, message: 'Vui long nhap ly do!' }]}>
          <Input.TextArea
            rows={3}
            placeholder={
              mode === 'ADD'
                ? 'VD: Nhap mua bo sung 50 sot nhua do moi tu nha cung cap...'
                : 'VD: Sot bi bes nut trong qua trinh boc xep ca / Khach muon lam that lac...'
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PackagingAdjustModal;
