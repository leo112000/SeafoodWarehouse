import { create } from 'zustand';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  roles: string[];
  phone?: string;
  createdAt?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'Active' | 'Blocked';
  tenantId?: number | null;
  tenantCode?: string | null;
  tenantName?: string | null;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  tenantName: string | null;
  tenantId: number | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserInfo, tenantName?: string, tenantId?: number | null) => void;
  updateProfile: (profile: Pick<UserInfo, 'name' | 'phone'>) => void;
  logout: () => void;
}

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60; // 604,800 giây

export const decodeJwtPayload = (token: string): any => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payloadBase64.padEnd(payloadBase64.length + (4 - (payloadBase64.length % 4)) % 4, '=');
  let jsonPayload: string;
  try {
    jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    jsonPayload = atob(padded);
  }
  return JSON.parse(jsonPayload);
};

export const isTokenExpired = (token: string | null): boolean => {
  if (!token || typeof token !== 'string') return true;
  try {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload !== 'object') return true;

    const currentTime = Math.floor(Date.now() / 1000);

    // 1. Kiểm tra claim 'exp' tiêu chuẩn của JWT
    if (payload.exp && payload.exp <= currentTime) {
      return true;
    }

    // 2. Kiểm tra nếu token tạo đã quá hạn 7 ngày từ lúc phát hành (claim iat)
    if (payload.iat && (currentTime - payload.iat >= SEVEN_DAYS_SECONDS)) {
      return true;
    }

    // 3. Nếu token không có hạn dùng 'exp' thì xem như không hợp lệ
    if (!payload.exp) {
      return true;
    }

    // 4. Kiểm tra thời gian đăng nhập lưu ở client (loginTime) nếu có
    if (typeof window !== 'undefined') {
      const loginTime = localStorage.getItem('loginTime');
      if (loginTime) {
        const loginTimestamp = parseInt(loginTime, 10);
        if (!isNaN(loginTimestamp) && (Date.now() - loginTimestamp >= SEVEN_DAYS_SECONDS * 1000)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return true;
  }
};

export const clearAuthStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantName');
    localStorage.removeItem('tenantId');
    localStorage.removeItem('loginTime');
  }
};

const initAuthState = () => {
  if (typeof window === 'undefined') {
    return { token: null, user: null, tenantName: null, tenantId: null, isAuthenticated: false };
  }

  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    clearAuthStorage();
    return { token: null, user: null, tenantName: null, tenantId: null, isAuthenticated: false };
  }

  let user: UserInfo | null = null;
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      user = JSON.parse(userJson) as UserInfo;
    } catch {
      user = null;
    }
  }

  const tenantName = localStorage.getItem('tenantName');
  const tenantIdStr = localStorage.getItem('tenantId');
  const tenantId = tenantIdStr ? parseInt(tenantIdStr, 10) : null;

  return {
    token,
    user,
    tenantName,
    tenantId,
    isAuthenticated: true,
  };
};

const initialAuth = initAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  token: initialAuth.token,
  user: initialAuth.user,
  tenantName: initialAuth.tenantName,
  tenantId: initialAuth.tenantId,
  isAuthenticated: initialAuth.isAuthenticated,
  login: (token, user, tenantName, tenantId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTime', Date.now().toString());
    
    const finalTenantName = tenantName || user.tenantCode || user.tenantName || null;
    const finalTenantId = tenantId !== undefined ? tenantId : (user.tenantId || null);

    if (finalTenantName) {
      localStorage.setItem('tenantName', finalTenantName);
    } else {
      localStorage.removeItem('tenantName');
    }

    if (finalTenantId) {
      localStorage.setItem('tenantId', finalTenantId.toString());
    } else {
      localStorage.removeItem('tenantId');
    }

    set({
      token,
      user,
      tenantName: finalTenantName,
      tenantId: finalTenantId,
      isAuthenticated: true,
    });
  },
  updateProfile: (profile) => set((state) => {
    if (!state.user) return state;
    const user = { ...state.user, ...profile };
    localStorage.setItem('user', JSON.stringify(user));
    return { user };
  }),
  logout: () => {
    clearAuthStorage();
    set({
      token: null,
      user: null,
      tenantName: null,
      tenantId: null,
      isAuthenticated: false,
    });
  },
}));

