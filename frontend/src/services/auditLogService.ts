import { api } from './api';
import type { AuditAction, AuditStatus } from '../constants';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  module: string;
  description: string;
  ipAddress: string;
  browser: string;
  status: AuditStatus;
  executionDurationMs?: number;
  oldValues?: string;
  newValues?: string;
}

export const auditLogService = {
  async getAll(): Promise<AuditLogItem[]> {
    try {
      const response = await api.get('/auditlogs');
      if (response.data && response.data.data) {
        return response.data.data.map((log: any) => ({
          id: String(log.id),
          timestamp: log.timestamp || new Date().toISOString(),
          userName: log.userName || 'Hệ thống',
          userRole: log.userRole || 'Nhân viên',
          action: (log.action as AuditLogItem['action']) || 'UPDATE',
          module: log.targetModule || 'Kho hàng',
          description: log.details || 'Thao tác hệ thống',
          ipAddress: log.ipAddress || '127.0.0.1',
          browser: log.browser || 'Chrome / Windows',
          status: (log.status as AuditLogItem['status']) || 'SUCCESS',
          executionDurationMs: log.executionDurationMs || 50,
          oldValues: log.oldValues,
          newValues: log.newValues,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  async logAction(data: {
    userName: string;
    userRole?: string;
    action: AuditLogItem['action'];
    module: string;
    description: string;
  }): Promise<void> {
    try {
      await api.post('/auditlogs', {
        userName: data.userName,
        userRole: data.userRole || 'Nhân viên',
        action: data.action,
        targetModule: data.module,
        details: data.description,
        ipAddress: '127.0.0.1',
        browser: 'Chrome 127 / Windows 11',
        status: 'SUCCESS',
      });
    } catch {
      // Continue without blocking UI
    }
  },
};
