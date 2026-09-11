import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/dateUtils'
import App from './App.tsx'

// Lọc các thông báo Warning deprecation của Ant Design v6 để console sạch sẽ và dễ nhìn
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('Warning: [antd:') || args[0].includes('is deprecated. Please use'))) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
