import React from 'react';
import { formatCurrency } from '../../utils/format';
import type { InvoicePrintData, InvoiceItem } from '../../types';


/* =============================================
   Helpers
   ============================================= */
const numberToVietnamese = (amount: number): string => {
  // Simplified Vi-VN number to words for amounts up to hundreds of millions
  if (amount === 0) return 'Không đồng';
  
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
    'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
  
  const hundreds = (n: number): string => {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const t = n % 100;
    let result = h > 0 ? units[h] + ' trăm' : '';
    if (t >= 10 && t <= 19) {
      result += (result ? ' ' : '') + teens[t - 10];
    } else {
      const tens = Math.floor(t / 10);
      const ones = t % 10;
      if (tens > 0) result += (result ? ' ' : '') + units[tens] + ' mươi';
      if (ones > 0) result += (result ? ' ' : '') + units[ones];
    }
    return result;
  };

  const billions = Math.floor(amount / 1_000_000_000);
  const millions = Math.floor((amount % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((amount % 1_000_000) / 1_000);
  const remainder = amount % 1_000;

  let result = '';
  if (billions > 0) result += hundreds(billions) + ' tỷ';
  if (millions > 0) result += (result ? ' ' : '') + hundreds(millions) + ' triệu';
  if (thousands > 0) result += (result ? ' ' : '') + hundreds(thousands) + ' nghìn';
  if (remainder > 0) result += (result ? ' ' : '') + hundreds(remainder);

  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
};

/* =============================================
   Component
   ============================================= */
export const InvoicePrintTemplate = React.forwardRef<HTMLDivElement, { data: InvoicePrintData }>(
  ({ data }, ref) => {
    const totalAmount = data.totalAmount;
    const totalNetWeight = data.totalNetWeight;
    const isInbound = data.type === 'INBOUND';

    return (
      <div ref={ref} className="invoice-print-wrapper">
        {/* ── Print-only global styles ─────────────────────────── */}
        <style>{`
          .invoice-print-wrapper {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            color: #000;
            background: #fff;
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 12mm 15mm;
            box-sizing: border-box;
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }

            body * { visibility: hidden; }
            .invoice-print-wrapper,
            .invoice-print-wrapper * { visibility: visible; }
            .invoice-print-wrapper { position: fixed; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
          }

          /* ── Layout ────────────────────────────── */
          .inv-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
            border-bottom: 2px solid #003580;
            padding-bottom: 12px;
          }
          .inv-company h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #003580;
            margin: 0 0 4px;
          }
          .inv-company p { margin: 2px 0; font-size: 10pt; color: #444; }

          .inv-logo {
            width: 80px;
            height: 80px;
            border: 2px solid #003580;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #003580;
            font-size: 30px;
            font-weight: bold;
          }

          .inv-title {
            text-align: center;
            margin: 12px 0;
          }
          .inv-title h1 {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #003580;
            margin: 0 0 4px;
          }
          .inv-title .inv-no {
            font-size: 11pt;
            color: #555;
          }

          .inv-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 24px;
            margin: 12px 0 16px;
            padding: 10px 14px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #f8fafc;
          }
          .inv-info-row { display: flex; gap: 6px; font-size: 11pt; }
          .inv-info-label { color: #555; white-space: nowrap; }
          .inv-info-value { font-weight: 600; color: #111; }

          /* ── Table ─────────────────────────────── */
          .inv-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10pt;
          }
          .inv-table thead tr {
            background: #003580;
            color: #fff;
          }
          .inv-table thead th {
            border: 1px solid #003580;
            padding: 6px 8px;
            text-align: center;
            font-weight: 600;
            vertical-align: middle;
          }
          .inv-table tbody td {
            border: 1px solid #bbb;
            padding: 5px 8px;
            vertical-align: middle;
          }
          .inv-table tbody tr:nth-child(even) { background: #f0f4ff; }
          .inv-table tfoot td {
            border: 1px solid #bbb;
            padding: 5px 8px;
            font-weight: bold;
          }
          .inv-table .text-right { text-align: right; }
          .inv-table .text-center { text-align: center; }

          /* ── Summary ────────────────────────────── */
          .inv-summary {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px 14px;
            margin-bottom: 12px;
            background: #f8fafc;
          }
          .inv-summary-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            font-size: 11pt;
          }
          .inv-summary-row.total {
            font-size: 13pt;
            font-weight: bold;
            border-top: 2px solid #003580;
            margin-top: 6px;
            padding-top: 8px;
            color: #003580;
          }
          .inv-amount-words {
            font-size: 10.5pt;
            font-style: italic;
            color: #333;
            margin-top: 6px;
            border-top: 1px dashed #bbb;
            padding-top: 6px;
          }

          /* ── Note & Signatures ──────────────────── */
          .inv-note {
            margin-bottom: 14px;
            font-size: 10.5pt;
            color: #444;
          }
          .inv-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-top: 24px;
          }
          .inv-sig-block {
            text-align: center;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px;
          }
          .inv-sig-title {
            font-weight: bold;
            font-size: 11pt;
            color: #003580;
            margin-bottom: 4px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
          }
          .inv-sig-role { font-size: 10pt; color: #666; margin-bottom: 40px; }
          .inv-sig-name { font-size: 10pt; color: #333; }
        `}</style>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="inv-header">
          <div className="inv-company">
            <h2>KHO HẢI SẢN BIỂN ĐÔNG</h2>
            <p>📍 123 Đường Cảng Cá, Phường Thọ Quang, Đà Nẵng</p>
            <p>📞 0236 123 4567 &nbsp;|&nbsp; 📧 kho@biendongsea.vn</p>
            <p>🏢 MST: 0401 345 678</p>
          </div>
          <div className="inv-logo">
            <span>🚢</span>
          </div>
        </div>

        {/* ── Title ─────────────────────────────────────── */}
        <div className="inv-title">
          <h1>{isInbound ? 'Phiếu Nhập Kho' : 'Phiếu Xuất Kho'}</h1>
          <div className="inv-no">Số phiếu: <strong>{data.invoiceNo}</strong></div>
        </div>

        {/* ── General Info ──────────────────────────────── */}
        <div className="inv-info">
          <div className="inv-info-row">
            <span className="inv-info-label">Ngày lập:</span>
            <span className="inv-info-value">{data.date}</span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">Thủ kho thực hiện:</span>
            <span className="inv-info-value">{data.warehouseStaff}</span>
          </div>
          <div className="inv-info-row">
            <span className="inv-info-label">{isInbound ? 'Nhà cung cấp:' : 'Khách hàng:'}</span>
            <span className="inv-info-value">{data.partnerName}</span>
          </div>
          {data.storageLocation && (
            <div className="inv-info-row">
              <span className="inv-info-label">{isInbound ? 'Kho nhận:' : 'Kho xuất:'}</span>
              <span className="inv-info-value">{data.storageLocation}</span>
            </div>
          )}
        </div>

        {/* ── Items Table ───────────────────────────────── */}
        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ width: '3%' }}>STT</th>
              <th style={{ width: '18%' }}>Mã Lô (Batch)</th>
              <th style={{ width: '16%' }}>Tên Hải Sản</th>
              <th style={{ width: '10%' }}>Bảo quản</th>
              <th style={{ width: '7%' }}>Cân thô (kg)</th>
              <th style={{ width: '7%' }}>Bì (kg)</th>
              <th style={{ width: '7%' }}>Thực (kg)</th>
              <th style={{ width: '10%' }}>Hạn SD</th>
              <th style={{ width: '11%' }}>Đơn giá (đ)</th>
              <th style={{ width: '11%' }}>Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.batchCode + idx}>
                <td className="text-center">{idx + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{item.batchCode}</td>
                <td><strong>{item.productName}</strong></td>
                <td className="text-center">{item.storageType}</td>
                <td className="text-right">{item.grossWeight.toFixed(1)}</td>
                <td className="text-right">{item.tareWeight.toFixed(1)}</td>
                <td className="text-right"><strong>{item.netWeight.toFixed(1)}</strong></td>
                <td className="text-center" style={{ fontSize: '9pt' }}>{item.expiryDate}</td>
                <td className="text-right">{item.unitPrice.toLocaleString('vi-VN')}</td>
                <td className="text-right"><strong>{item.totalAmount.toLocaleString('vi-VN')}</strong></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="text-right" style={{ borderTop: '2px solid #003580' }}>
                Tổng cộng:
              </td>
              <td className="text-right" style={{ borderTop: '2px solid #003580', color: '#003580' }}>
                <strong>{totalNetWeight.toFixed(1)}</strong>
              </td>
              <td colSpan={2} style={{ borderTop: '2px solid #003580' }} />
              <td className="text-right" style={{ borderTop: '2px solid #003580', color: '#003580' }}>
                <strong>{totalAmount.toLocaleString('vi-VN')}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Summary block ─────────────────────────────── */}
        <div className="inv-summary">
          <div className="inv-summary-row">
            <span>Tổng số mặt hàng:</span>
            <span>{data.items.length} loại hải sản</span>
          </div>
          <div className="inv-summary-row">
            <span>Tổng khối lượng thực tế:</span>
            <span><strong>{totalNetWeight.toFixed(1)} kg</strong></span>
          </div>
          <div className="inv-summary-row total">
            <span>TỔNG GIÁ TRỊ:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <div className="inv-amount-words">
            Bằng chữ: <em>{numberToVietnamese(totalAmount)}</em>
          </div>
        </div>

        {/* ── Note ─────────────────────────────────────── */}
        {data.note && (
          <div className="inv-note">
            <strong>Ghi chú:</strong> {data.note}
          </div>
        )}

        {/* ── Signatures ───────────────────────────────── */}
        <div className="inv-signatures">
          <div className="inv-sig-block">
            <div className="inv-sig-title">Người lập phiếu</div>
            <div className="inv-sig-role">(Ký, ghi rõ họ tên)</div>
            <div className="inv-sig-name">&nbsp;</div>
          </div>
          <div className="inv-sig-block">
            <div className="inv-sig-title">Thủ kho</div>
            <div className="inv-sig-role">(Ký, ghi rõ họ tên)</div>
            <div className="inv-sig-name">{data.warehouseStaff}</div>
          </div>
          <div className="inv-sig-block">
            <div className="inv-sig-title">
              {isInbound ? 'Đại diện giao hàng' : 'Khách hàng nhận'}
            </div>
            <div className="inv-sig-role">(Ký, ghi rõ họ tên)</div>
            <div className="inv-sig-name">&nbsp;</div>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';
