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

const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const getStoredUser = (): UserInfo | null => {
  if (typeof window !== 'undefined') {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        return JSON.parse(userJson) as UserInfo;
      } catch {
        return null;
      }
    }
  }
  return null;
};

const getStoredTenant = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('tenantName');
  }
  return null;
};

const getStoredTenantId = (): number | null => {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem('tenantId');
    return val ? parseInt(val, 10) : null;
  }
  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  tenantName: getStoredTenant(),
  tenantId: getStoredTenantId(),
  isAuthenticated: !!getStoredToken(),
  login: (token, user, tenantName, tenantId) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantName');
    localStorage.removeItem('tenantId');
    set({
      token: null,
      user: null,
      tenantName: null,
      tenantId: null,
      isAuthenticated: false,
    });
  },
}));

