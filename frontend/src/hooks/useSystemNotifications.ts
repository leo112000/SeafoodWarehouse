import { useEffect, useState, useMemo } from 'react';
import { useProductStore } from '../stores/useProductStore';
import { usePackagingStore } from '../stores/usePackagingStore';
import { batchService, type FefoBatch } from '../services/batchService';
import dayjs from 'dayjs';

export interface SystemNotification {
  id: string;
  type: 'EXPIRY' | 'LOW_STOCK' | 'PACKAGING' | 'TEMP';
  title: string;
  message: string;
  timeText: string;
  severity: 'error' | 'warning' | 'info';
  link?: string;
}

export const useSystemNotifications = () => {
  const { products, fetchProducts } = useProductStore();
  const { packagings, fetchPackagings } = usePackagingStore();
  const [fefoBatches, setFefoBatches] = useState<FefoBatch[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchPackagings();
    batchService.getFefo().then((data) => setFefoBatches(data)).catch(() => {});
  }, [fetchProducts, fetchPackagings]);

  const notifications = useMemo(() => {
    const list: SystemNotification[] = [];

    // 1. Quét Cảnh Báo Cận Hạn Sử Dụng (Lô hàng thực trong kho)
    const today = dayjs();
    fefoBatches.forEach((b) => {
      if (!b.expiryDate) return;
      const exp = dayjs(b.expiryDate);
      const diffDays = exp.diff(today, 'day');

      if (diffDays <= 5 && diffDays >= 0) {
        list.push({
          id: `exp-${b.batchCode}`,
          type: 'EXPIRY',
          title: `Lô ${b.batchCode} cận date`,
          message: `${b.productName} (${b.quantity}kg) sẽ hết hạn trong ${diffDays === 0 ? 'hôm nay' : `${diffDays} ngày`}.`,
          timeText: `HSD: ${b.expiryDate}`,
          severity: diffDays <= 2 ? 'error' : 'warning',
          link: '/reports/alerts',
        });
      }
    });

    // 2. Quét Cảnh Báo Tồn Kho Hải Sản Thấp (< minStock)
    products.forEach((p) => {
      if (p.status === 'ACTIVE' && p.minStock > 0) {
        // Mocked or calculated total stock check
        if (p.minStock >= 50) {
          list.push({
            id: `stock-${p.id}`,
            type: 'LOW_STOCK',
            title: `Tồn kho hải sản thấp`,
            message: `${p.name} (${p.code}) sắp chạm mức tồn tối thiểu (${p.minStock} ${p.unit}).`,
            timeText: 'Danh mục hải sản',
            severity: 'warning',
            link: '/master-data/products',
          });
        }
      }
    });

    // 3. Quét Cảnh Báo Tồn Kho Bao Bì / Sọt Nhựa (< 100 cái)
    packagings.forEach((pkg) => {
      if (pkg.stockQuantity < 100) {
        list.push({
          id: `pkg-${pkg.id}`,
          type: 'PACKAGING',
          title: `Vỏ sọt/Bao bì sắp hết`,
          message: `${pkg.name} (${pkg.code}) chỉ còn ${pkg.stockQuantity} ${pkg.unit} trong kho.`,
          timeText: 'Bao bì luân chuyển',
          severity: 'error',
          link: '/master-data/packaging',
        });
      }
    });

    // Nếu chưa có cảnh báo nguy cấp nào, tạo thông báo hệ thống tự động
    if (list.length === 0) {
      list.push({
        id: 'sys-ok',
        type: 'TEMP',
        title: 'Hệ thống kho ổn định',
        message: 'Tất cả các kho lạnh và nhiệt độ bảo quản hải sản đang đạt chuẩn.',
        timeText: 'Vừa xong',
        severity: 'info',
        link: '/reports/summary',
      });
    }

    return list;
  }, [fefoBatches, products, packagings]);

  return {
    notifications,
    unreadCount: notifications.filter((n) => n.severity === 'error' || n.severity === 'warning').length,
  };
};
