import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

/**
 * useInvoicePrint - Wraps react-to-print to provide a typed print trigger
 * for the InvoicePrintTemplate component.
 *
 * Usage:
 *   const { printRef, handlePrint } = useInvoicePrint({ documentTitle: 'Phiếu nhập kho' });
 *   <InvoicePrintTemplate ref={printRef} data={...} />
 *   <Button onClick={handlePrint}>In phiếu</Button>
 */
export const useInvoicePrint = (options?: { documentTitle?: string; onAfterPrint?: () => void }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: options?.documentTitle ?? 'Phiếu Kho Hải Sản',
    onAfterPrint: options?.onAfterPrint,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
      body { margin: 0; }
    `,
  });

  return { printRef, handlePrint };
};
