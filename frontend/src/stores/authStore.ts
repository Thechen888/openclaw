import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  is_admin?: boolean;
  org_id?: string;
  usage_scope?: string;
}

// Mock 演示账号：username -> users 表字段（与 mockData.ts 保持一致）
const MOCK_ACCOUNTS: Record<string, AuthUser> = {
  admin:       { id: 'u-1',  username: 'admin',       name: '张伟',   role: 'admin',   is_admin: true, org_id: 'org-1', usage_scope: 'all' },
  chenzhiyuan: { id: 'u-8',  username: 'chenzhiyuan', name: '陈志远', role: 'gm',      is_admin: false, org_id: 'org-1', usage_scope: 'all' },
  lisi:        { id: 'u-2',  username: 'lisi',        name: '李思',   role: 'manager', is_admin: false, org_id: 'org-3', usage_scope: 'dept' },
  wangwu:      { id: 'u-3',  username: 'wangwu',      name: '王五',   role: 'member',  is_admin: false, org_id: 'org-2', usage_scope: 'self' },
};

function resolveMockAccount(username: string): AuthUser {
  return MOCK_ACCOUNTS[username] || MOCK_ACCOUNTS.admin;
}

function syncMockUserId(u: AuthUser) {
  try { localStorage.setItem('mock-current-user-id', u.id); } catch { /* ignore */ }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setToken: (token: string) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      login: async (username: string, password: string) => {
        if (import.meta.env.VITE_MOCK_ENABLED === 'true') {
          // Mock模式：按用户名映射演示账号，未匹配回退张伟(admin)
          const mockUser = resolveMockAccount(username);
          syncMockUserId(mockUser);
          set({ user: mockUser, accessToken: `mock-jwt-token-${mockUser.id}`, isAuthenticated: true });
          axios.defaults.headers.common['Authorization'] = `Bearer mock-jwt-token-${mockUser.id}`;
          return;
        }
        const res = await axios.post(`${API_BASE}/auth/admin/login`, { username, password });
        const { access_token, user } = res.data.data;
        set({ user: { ...user, is_admin: true }, accessToken: access_token, isAuthenticated: true });
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      },
      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false });
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('mock-current-user-id');
      },
      checkAuth: async () => {
        const token = get().accessToken;
        if (!token) { set({ isLoading: false }); return; }
        if (import.meta.env.VITE_MOCK_ENABLED === 'true') {
          let user = get().user;
          if (!user) {
            const storedId = typeof localStorage !== 'undefined' ? localStorage.getItem('mock-current-user-id') : null;
            user = Object.values(MOCK_ACCOUNTS).find(a => a.id === storedId) || MOCK_ACCOUNTS.admin;
            syncMockUserId(user);
          }
          set({ user, isAuthenticated: true, isLoading: false });
          return;
        }
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await axios.get(`${API_BASE}/auth/me`);
          set({ user: res.data.data, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
          delete axios.defaults.headers.common['Authorization'];
        }
      },
      setToken: (token: string) => {
        set({ accessToken: token });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ accessToken: state.accessToken, user: state.user }) }
  )
);
