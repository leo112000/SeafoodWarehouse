import * as signalR from '@microsoft/signalr';
import { isTokenExpired } from '../stores/useAuthStore';

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  link?: string;
  createdAt: string;
  tenantId?: number | null;
}

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private isStarting = false;
  private currentTenantId: number | null | undefined = undefined;
  private listeners: ((notification: RealtimeNotification) => void)[] = [];
  private stockListeners: ((event: { eventType: string; tenantId?: number }) => void)[] = [];

  public async startConnection(tenantId?: number | null) {
    // Tránh kết nối lại trùng lặp nếu đang kết nối với cùng tenantId
    if (
      this.connection &&
      this.currentTenantId === tenantId &&
      (this.connection.state === signalR.HubConnectionState.Connected ||
       this.connection.state === signalR.HubConnectionState.Connecting ||
       this.isStarting)
    ) {
      return;
    }

    this.currentTenantId = tenantId;

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {}
      this.connection = null;
    }

    // URL hub: luôn đảm bảo bắt đầu bằng /hubs/notifications hoặc VITE_API_URL nếu là absolute URL (https://...)
    let hubBase = '/hubs/notifications';
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.startsWith('http')) {
      hubBase = `${envUrl.replace(/\/api\/?$/, '')}/hubs/notifications`;
    }

    const hubUrl = `${hubBase}${tenantId ? `?tenantId=${tenantId}` : ''}`;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          const token = localStorage.getItem('token');
          if (token && isTokenExpired(token)) {
            return '';
          }
          return token || '';
        },
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('ReceiveNotification', (message: RealtimeNotification) => {
      this.listeners.forEach((listener) => listener(message));
    });

    conn.on('StockUpdated', (data: { eventType: string; tenantId?: number }) => {
      this.stockListeners.forEach((listener) => listener(data));
    });

    this.connection = conn;
    this.isStarting = true;

    try {
      await conn.start();
      console.log('✅ SignalR Realtime connected successfully to /hubs/notifications');
    } catch (err: any) {
      // Chỉ log nếu không phải do component unmount/stop chủ động
      if (conn === this.connection) {
        console.warn('⚠️ SignalR connection warning:', err?.message || err);
      }
    } finally {
      this.isStarting = false;
    }
  }

  public async stopConnection() {
    if (this.connection) {
      const conn = this.connection;
      this.connection = null;
      this.currentTenantId = undefined;
      try {
        await conn.stop();
      } catch {}
    }
  }

  public onNotification(callback: (notification: RealtimeNotification) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public onStockUpdated(callback: (event: { eventType: string; tenantId?: number }) => void) {
    this.stockListeners.push(callback);
    return () => {
      this.stockListeners = this.stockListeners.filter((l) => l !== callback);
    };
  }
}

export const signalRService = new SignalRService();
