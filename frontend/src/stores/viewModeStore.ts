import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'front' | 'admin';

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

// 前台/后台切换：前台面向业务用户，后台面向平台管理员
export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'admin',
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () => set((s) => ({ viewMode: s.viewMode === 'admin' ? 'front' : 'admin' })),
    }),
    { name: 'view-mode-storage' }
  )
);

// 各视图默认落地页
export const VIEW_DEFAULT_PATH: Record<ViewMode, string> = {
  front: '/agents',
  admin: '/',
};
