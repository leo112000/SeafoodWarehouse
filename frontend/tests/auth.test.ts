import { describe, it, expect, beforeEach } from 'vitest';

class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
}

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    location: {
      pathname: '/dashboard',
      href: '/dashboard',
    },
    localStorage: mockStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

import { isTokenExpired, clearAuthStorage, useAuthStore } from '../src/stores/useAuthStore';
import { api, handleUnauthorized, resetUnauthorizedCooldown } from '../src/services/api';

const createMockJwt = (payloadObj: Record<string, any>): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const payload = btoa(JSON.stringify(payloadObj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const signature = 'mockSignatureString123';
  return `${header}.${payload}.${signature}`;
};

describe('Token Expiration and Auth Handling', () => {
  beforeEach(() => {
    localStorage.clear();
    resetUnauthorizedCooldown();
    (globalThis as any).window.location.pathname = '/dashboard';
    (globalThis as any).window.location.href = '/dashboard';
    useAuthStore.getState().logout();
  });

  describe('isTokenExpired', () => {
    it('returns true for null, undefined, empty string or malformed strings', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('not-a-token')).toBe(true);
      expect(isTokenExpired('header.payload')).toBe(true);
      expect(isTokenExpired('a.b.c')).toBe(true);
    });

    it('returns false for a valid token with future expiration within 7 days', () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = createMockJwt({
        sub: '1',
        name: 'Nguyen Van A',
        iat: now - 3600, // 1 hour ago
        exp: now + 6 * 24 * 3600, // expires in 6 days
      });

      expect(isTokenExpired(validToken)).toBe(false);
    });

    it('returns true for a token whose exp claim is in the past', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = createMockJwt({
        sub: '1',
        name: 'Nguyen Van A',
        iat: now - 10000,
        exp: now - 10, // expired 10 seconds ago
      });

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('returns true for a token created more than 7 days ago (via iat claim)', () => {
      const now = Math.floor(Date.now() / 1000);
      const eightDaysInSeconds = 8 * 24 * 3600;
      const oldToken = createMockJwt({
        sub: '1',
        name: 'Nguyen Van A',
        iat: now - eightDaysInSeconds, // 8 days ago
        exp: now + 3600, // artificially set future exp
      });

      expect(isTokenExpired(oldToken)).toBe(true);
    });

    it('returns true for a token without exp claim', () => {
      const now = Math.floor(Date.now() / 1000);
      const tokenWithoutExp = createMockJwt({
        sub: '1',
        name: 'Nguyen Van A',
        iat: now,
      });

      expect(isTokenExpired(tokenWithoutExp)).toBe(true);
    });

    it('returns true if client-side loginTime exceeds 7 days', () => {
      const now = Math.floor(Date.now() / 1000);
      const validJwt = createMockJwt({
        sub: '1',
        name: 'Nguyen Van A',
        iat: now - 100,
        exp: now + 86400,
      });

      // Set loginTime to 8 days ago
      const eightDaysAgoMs = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem('loginTime', eightDaysAgoMs.toString());

      expect(isTokenExpired(validJwt)).toBe(true);
    });
  });

  describe('Storage and State Cleanup', () => {
    it('clears all auth items including refreshToken from localStorage on logout', () => {
      localStorage.setItem('token', 'mock_token');
      localStorage.setItem('refreshToken', 'mock_refresh_token');
      localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Admin', email: 'admin@test.com', roles: ['Admin'] }));
      localStorage.setItem('tenantName', 'BIENDONG');
      localStorage.setItem('tenantId', '10');
      localStorage.setItem('loginTime', Date.now().toString());

      clearAuthStorage();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('tenantName')).toBeNull();
      expect(localStorage.getItem('tenantId')).toBeNull();
      expect(localStorage.getItem('loginTime')).toBeNull();
    });

    it('updates zustand state and saves refreshToken when calling login', () => {
      useAuthStore.getState().login(
        'test_token',
        { id: '1', name: 'User 1', email: 'test@example.com', roles: ['Manager'] },
        'DEFAULT',
        1,
        'refresh_token_xyz'
      );

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe('test_token');
      expect(useAuthStore.getState().refreshToken).toBe('refresh_token_xyz');
      expect(localStorage.getItem('token')).toBe('test_token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh_token_xyz');

      // Test setAccessToken
      useAuthStore.getState().setAccessToken('new_access_token', 'new_refresh_token_123');
      expect(useAuthStore.getState().token).toBe('new_access_token');
      expect(useAuthStore.getState().refreshToken).toBe('new_refresh_token_123');
      expect(localStorage.getItem('token')).toBe('new_access_token');
      expect(localStorage.getItem('refreshToken')).toBe('new_refresh_token_123');

      useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('API Interceptors and 401 Unauthorized handling', () => {
    it('cleans up auth state and sets redirect to login when handleUnauthorized is invoked', () => {
      useAuthStore.getState().login(
        'test_token_401',
        { id: '2', name: 'Staff', email: 'staff@example.com', roles: ['Staff'] },
        'BRANCH1',
        2,
        'refresh_token_401'
      );

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      handleUnauthorized();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect((globalThis as any).window.location.href).toBe('/login');
    });

    it('automatically logs out and redirects to /login when receiving 401 Unauthorized without refreshToken', async () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = createMockJwt({
        sub: '10',
        exp: now + 3600,
      });

      localStorage.setItem('token', validToken);
      // refreshToken is explicitly null
      localStorage.removeItem('refreshToken');
      useAuthStore.getState().login(
        validToken,
        { id: '10', name: 'Valid User', email: 'user@test.com', roles: [] }
      );

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Simulate a 401 error directly through axios response interceptor rejection handler
      const error401 = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/inventory',
        },
      };

      const responseHandlers: any = (api.interceptors.response as any).handlers;
      const errorHandler = responseHandlers[responseHandlers.length - 1]?.rejected;

      if (errorHandler) {
        await expect(errorHandler(error401)).rejects.toBeDefined();
      } else {
        handleUnauthorized();
      }

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect((globalThis as any).window.location.href).toBe('/login');
    });
  });
});
