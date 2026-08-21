import { create } from 'zustand';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  roles: string[];
  phone?: string;
  createdAt?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'Active' | 'Blocked';
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  tenantName: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserInfo, tenantName?: string) => void;
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

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  tenantName: getStoredTenant(),
  isAuthenticated: !!getStoredToken(),
  login: (token, user, tenantName) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (tenantName) {
      localStorage.setItem('tenantName', tenantName);
    } else {
      localStorage.removeItem('tenantName');
    }
    set({
      token,
      user,
      tenantName: tenantName || null,
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
    set({
      token: null,
      user: null,
      tenantName: null,
      isAuthenticated: false,
    });
  },
}));
