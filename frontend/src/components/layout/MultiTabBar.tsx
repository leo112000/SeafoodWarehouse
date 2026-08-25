import React from 'react';
import { Tabs, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
  CloseOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTabStore, type TabItem } from '../../stores/useTabStore';

export const MultiTabBar: React.FC = () => {
  const { tabs, activeKey, removeTab, closeOtherTabs, closeAllTabs, maxTabs } = useTabStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (key: string) => {
    navigate(key);
  };

  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      const nextRoute = removeTab(targetKey);
      if (location.pathname === targetKey) {
        navigate(nextRoute);
      }
    }
  };

  const getContextMenuItems = (tab: TabItem): MenuProps['items'] => [
    {
      key: 'close-current',
      label: 'Đóng tab này',
      icon: <CloseOutlined />,
      disabled: !tab.closable,
      onClick: () => {
        const nextRoute = removeTab(tab.key);
        if (location.pathname === tab.key) navigate(nextRoute);
      },
    },
    {
      key: 'close-others',
      label: 'Đóng các tab khác',
      icon: <MinusCircleOutlined />,
      disabled: tabs.length <= 1,
      onClick: () => {
        closeOtherTabs(tab.key);
        if (location.pathname !== tab.key) navigate(tab.key);
      },
    },
    {
      key: 'close-all',
      label: 'Đóng tất cả tab',
      icon: <CloseCircleOutlined />,
      disabled: tabs.length <= 1,
      onClick: () => {
        const fallback = closeAllTabs();
        navigate(fallback);
      },
    },
  ];

  const handleMiddleClick = (e: React.MouseEvent, tab: TabItem) => {
    // button === 1 is Middle Click (Scroll wheel click)
    if (e.button === 1 && tab.closable) {
      e.preventDefault();
      e.stopPropagation();
      const nextRoute = removeTab(tab.key);
      if (location.pathname === tab.key) {
        navigate(nextRoute);
      }
    }
  };

  const items = tabs.map((tab) => ({
    key: tab.key,
    label: (
      <Dropdown
        menu={{ items: getContextMenuItems(tab) }}
        trigger={['contextMenu']}
      >
        <span
          onMouseDown={(e) => handleMiddleClick(e, tab)}
          className="select-none inline-block px-1 cursor-pointer"
          title={tab.closable ? `${tab.title} (Nhấn chuột giữa để đóng)` : tab.title}
        >
          {tab.key === '/' || tab.key === '/dashboard' ? '🏠 ' : ''}
          {tab.title}
        </span>
      </Dropdown>
    ),
    closable: tab.closable,
  }));

  return (
    <div className="bg-slate-100/90 dark:bg-slate-900/90 px-3 pt-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex-1 overflow-hidden">
        <Tabs
          type="editable-card"
          hideAdd
          size="small"
          activeKey={activeKey}
          onChange={handleTabChange}
          onEdit={handleTabEdit}
          items={items}
          className="seafood-multi-tabs mb-0"
        />
      </div>

      <div className="hidden sm:flex items-center gap-2 pl-3 pb-1 text-xs text-gray-400">
        <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-medium">
          {tabs.length}/{maxTabs} tabs
        </span>
        {tabs.length > 1 && (
          <Button
            type="text"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => {
              const fallback = closeAllTabs();
              navigate(fallback);
            }}
            title="Đóng tất cả tab"
            className="text-gray-400 hover:text-red-500"
          />
        )}
      </div>
    </div>
  );
};
export default MultiTabBar;
