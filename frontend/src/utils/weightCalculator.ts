import dayjs from 'dayjs';

export interface PackagingItemLike {
  code: string;
  defaultTareWeight: number;
}

/**
 * Tính khối lượng bì/khay tự động dựa trên loại bao bì và số lượng
 */
export function computeTareWeight(
  packagingCode: string | undefined,
  packagingQty: number | undefined,
  packagings: PackagingItemLike[],
  fallbackTare: number = 0
): number {
  if (!packagingCode) return fallbackTare;
  const pkg = packagings.find((p) => p.code === packagingCode);
  const qty = Number(packagingQty) || 0;
  return pkg ? Number((qty * pkg.defaultTareWeight).toFixed(3)) : fallbackTare;
}

/**
 * Tính khối lượng thực (Net Weight = Gross Weight - Tare Weight)
 */
export function computeNetWeight(grossWeight: number, tareWeight: number): number {
  const gross = Number(grossWeight) || 0;
  const tare = Number(tareWeight) || 0;
  return Math.max(0, Number((gross - tare).toFixed(3)));
}

/**
 * Tính tổng khối lượng thô (Gross Weight = Net Weight + Tare Weight)
 */
export function computeGrossWeight(netWeight: number, tareWeight: number): number {
  const net = Number(netWeight) || 0;
  const tare = Number(tareWeight) || 0;
  return Number((net + tare).toFixed(3));
}

/**
 * Tính thành tiền từ khối lượng thực và đơn giá
 */
export function computeTotalPrice(netWeight: number, unitPrice: number): number {
  const net = Number(netWeight) || 0;
  const price = Number(unitPrice) || 0;
  return Math.round(net * price);
}

/**
 * Sinh mã lô tự động theo chuẩn LOT-[ProductCode]-[Timestamp]
 */
export function generateBatchCode(productCode: string, existingBatch?: string): string {
  if (!productCode) return '';
  if (existingBatch && existingBatch.startsWith(`LOT-${productCode}`)) {
    return existingBatch;
  }
  return `LOT-${productCode}-${dayjs().format('YYYYMMDDHHmmss')}`;
}
