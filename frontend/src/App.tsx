import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { queryClient, handleUnauthorized } from './services/api';
import { router } from './routes';
import { useThemeStore } from './stores/useThemeStore';
import { isTokenExpired } from './stores/useAuthStore';
import { ServerStatusBanner } from './components/common/ServerStatusBanner';

const App: React.FC = () => {
  const currentTheme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        handleUnauthorized();
      }
    };

    // Kiểm tra ngay khi mở web
    checkTokenExpiry();

    // Tự động kiểm tra lại khi người dùng quay lại tab trình duyệt
    window.addEventListener('focus', checkTokenExpiry);
    return () => {
      window.removeEventListener('focus', checkTokenExpiry);
    };
  }, []);

  useEffect(() => {
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#0284c7', // Ocean sky primary
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            borderRadius: 8,
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
          },
          components: {
            Card: {
              headerFontSize: 15,
            },
            Input: {
              controlHeight: 36,
              borderRadius: 8,
            },
            Button: {
              controlHeight: 36,
              borderRadius: 8,
            },
            Table: {
              borderRadius: 8,
            }
          }
        }}
      >
        <AntdApp
          message={{ top: 72 }}
          notification={{ top: 72, placement: 'topRight' }}
        >
          <ServerStatusBanner />
          <RouterProvider router={router} />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
