import { api } from './api';

export interface UserNotificationItem {
  id: number;
  notificationId: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  link?: string;
  dataJson?: string;
  state: number; // 0: Unread, 1: Read
  createdAt: string;
  readAt?: string;
}

export const notificationService = {
  getAll: async (state?: number, page = 1, pageSize = 20): Promise<UserNotificationItem[]> => {
    const params = new URLSearchParams();
    if (state !== undefined) params.append('state', state.toString());
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data?.data || [];
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data?.data?.count || 0;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
