import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapse: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapse: () => set((s) => ({ collapsed: !s.collapsed })),
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    { name: 'sidebar-storage' }
  )
);
