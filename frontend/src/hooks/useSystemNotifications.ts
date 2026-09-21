import { useEffect, useState, useCallback } from 'react';
import { notification as antdNotification } from 'antd';
import { useAuthStore } from '@/stores/useAuthStore';
import { signalRService, type RealtimeNotification } from '@/services/signalrService';
import { notificationService, type UserNotificationItem } from '@/services/notificationService';
import dayjs from 'dayjs';

export interface SystemNotification {
  id: string | number;
  notificationId?: number;
  type: string;
  title: string;
  message: string;
  timeText: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  link?: string;
  isRead: boolean;
}

export const useSystemNotifications = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Load danh sách thông báo và số lượng chưa đọc từ Database
  const fetchDbNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [items, unread] = await Promise.all([
        notificationService.getAll(undefined, 1, 20),
        notificationService.getUnreadCount(),
      ]);

      const mapped: SystemNotification[] = items.map((item: UserNotificationItem) => ({
        id: item.id,
        notificationId: item.notificationId,
        type: item.severity.toUpperCase(),
        title: item.title,
        message: item.message,
        timeText: item.createdAt ? dayjs(item.createdAt).format('HH:mm DD/MM') : 'Vừa xong',
        severity: item.severity,
        link: item.link,
        isRead: item.state === 1,
      }));

      setNotifications(mapped);
      setUnreadCount(unread);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, tenantId]);

  useEffect(() => {
    fetchDbNotifications();
  }, [fetchDbNotifications]);

  // Kết nối và lắng nghe SignalR
  useEffect(() => {
    if (!isAuthenticated) {
      signalRService.stopConnection();
      return;
    }

    signalRService.startConnection(tenantId);

    const processedIds = new Set<string>();

    const unsubscribeNotif = signalRService.onNotification((item: RealtimeNotification) => {
      const notifId = item.id || `${item.type}-${item.title}-${item.message}`;
      if (processedIds.has(notifId)) return;
      processedIds.add(notifId);
      setTimeout(() => processedIds.delete(notifId), 5000);

      // 1. Hiển thị pop-up Ant Design notification ngay góc màn hình
      const notifType = item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : item.severity === 'success' ? 'success' : 'info';
      antdNotification[notifType]({
        message: item.title,
        description: item.message,
        placement: 'topRight',
        duration: 4.5,
      });

      // 2. Refresh lại danh sách từ Database để lấy ID thực và trạng thái chuẩn
      fetchDbNotifications();
    });

    const unsubscribeStock = signalRService.onStockUpdated(() => {
      fetchDbNotifications();
    });

    return () => {
      unsubscribeNotif();
      unsubscribeStock();
    };
  }, [isAuthenticated, tenantId, fetchDbNotifications]);

  // Đánh dấu 1 thông báo là đã đọc
  const markAsRead = async (id: number | string) => {
    const numId = typeof id === 'number' ? id : parseInt(id, 10);
    if (!isNaN(numId)) {
      try {
        await notificationService.markAsRead(numId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
  };

  // Đánh dấu tất cả thông báo là đã đọc
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchDbNotifications,
  };
};
