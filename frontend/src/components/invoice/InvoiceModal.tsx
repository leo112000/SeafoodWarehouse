import React, { useRef } from 'react';
import { Modal, Button, Tooltip, App } from 'antd';
import { PrinterOutlined, FilePdfOutlined, CloseOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import type { InvoicePrintData } from '../../types';

interface InvoiceModalProps {
  open: boolean;
  data: InvoicePrintData | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ open, data, onClose }) => {
  const { message } = App.useApp();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: data
      ? `${data.type === 'INBOUND' ? 'Phieu-Nhap-Kho' : 'Phieu-Xuat-Kho'}-${data.invoiceNo}`
      : 'Hoa-Don',
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
      body { margin: 0; }
    `,
    onAfterPrint: () => {
      message.success('Đã gửi lệnh in thành công!');
    },
  });

  const handleDownloadPdf = () => {
    // Trigger browser print-to-PDF flow (same as print but user selects "Save as PDF")
    message.info('Chọn "Lưu dưới dạng PDF" trong hộp thoại in để xuất file PDF.');
    handlePrint();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      style={{ maxWidth: '95vw' }}
      centered
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PrinterOutlined style={{ color: '#0ea5e9', fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            Xem trước &amp; In{' '}
            {data?.type === 'INBOUND' ? 'Phiếu Nhập Kho' : 'Phiếu Xuất Kho'}
          </span>
          {data && (
            <span style={{ fontSize: 13, color: '#888', fontWeight: 400, marginLeft: 4 }}>
              — {data.invoiceNo}
            </span>
          )}
        </div>
      }
      footer={[
        <Button key="close" icon={<CloseOutlined />} onClick={onClose}>
          Đóng
        </Button>,
        <Tooltip key="pdf-tip" title="Trong hộp thoại in, chọn 'Lưu dưới dạng PDF'">
          <Button
            key="pdf"
            icon={<FilePdfOutlined />}
            onClick={handleDownloadPdf}
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            Tải PDF
          </Button>
        </Tooltip>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
        >
          In Hóa Đơn (A4)
        </Button>,
      ]}
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto',
          background: '#f5f5f5',
          padding: '16px',
        },
      }}
    >
      {data && (
        <div
          style={{
            background: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            borderRadius: 6,
            overflowX: 'auto',
          }}
        >
          <div style={{ minWidth: '700px' }}>
            <InvoicePrintTemplate ref={printRef} data={data} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default InvoiceModal;
