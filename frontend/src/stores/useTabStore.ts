import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabItem {
  key: string;      // URL path, e.g. '/inventory/inbound'
  title: string;    // Display title, e.g. 'Nhập kho hải sản'
  closable: boolean;// Dashboard tab is fixed (closable = false)
}

interface TabState {
  tabs: TabItem[];
  activeKey: string;
  maxTabs: number;
  addTab: (tab: { key: string; title: string }) => boolean; // returns true if added/switched, false if limit reached
  removeTab: (key: string) => string; // returns next active route
  closeOtherTabs: (key: string) => void;
  closeAllTabs: () => string;
  setActiveKey: (key: string) => void;
}

const DEFAULT_TAB: TabItem = {
  key: '/',
  title: 'Bảng điều khiển',
  closable: false,
};

const MAX_TABS_LIMIT = 7;

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [DEFAULT_TAB],
      activeKey: '/',
      maxTabs: MAX_TABS_LIMIT,

      addTab: (newTab) => {
        const { tabs } = get();
        const existingIndex = tabs.findIndex((t) => t.key === newTab.key);

        if (existingIndex !== -1) {
          // Tab already exists, switch to it safely
          set({ activeKey: newTab.key });
          return true;
        }

        // Đã đạt giới hạn 5 tab -> Không tự ý đóng tab cũ, chặn và báo cho người dùng
        if (tabs.length >= MAX_TABS_LIMIT) {
          return false;
        }

        const updatedTabs = [
          ...tabs,
          {
            key: newTab.key,
            title: newTab.title,
            closable: newTab.key !== '/' && newTab.key !== '/dashboard',
          },
        ];

        set({ tabs: updatedTabs, activeKey: newTab.key });
        return true;
      },

      removeTab: (targetKey) => {
        const { tabs, activeKey } = get();
        if (targetKey === '/' || targetKey === '/dashboard') return activeKey;

        const targetIndex = tabs.findIndex((t) => t.key === targetKey);
        if (targetIndex === -1) return activeKey;

        const nextTabs = tabs.filter((t) => t.key !== targetKey);
        let nextActiveKey = activeKey;

        // If closing the currently active tab, switch to adjacent tab
        if (activeKey === targetKey) {
          const fallbackIndex = targetIndex > 0 ? targetIndex - 1 : 0;
          nextActiveKey = nextTabs[fallbackIndex]?.key || '/';
        }

        set({ tabs: nextTabs, activeKey: nextActiveKey });
        return nextActiveKey;
      },

      closeOtherTabs: (keepKey) => {
        const { tabs } = get();
        const nextTabs = tabs.filter((t) => !t.closable || t.key === keepKey);
        set({ tabs: nextTabs, activeKey: keepKey });
      },

      closeAllTabs: () => {
        set({ tabs: [DEFAULT_TAB], activeKey: '/' });
        return '/';
      },

      setActiveKey: (key) => set({ activeKey: key }),
    }),
    {
      name: 'seafood-tabs-storage',
      partialize: (state) => ({ tabs: state.tabs, activeKey: state.activeKey }),
    }
  )
);
