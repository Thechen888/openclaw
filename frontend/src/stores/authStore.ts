import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  is_admin?: boolean;
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
          // Mock模式：任意用户名密码均可登录
          const mockUser = { id: 'u-1', username, name: '张伟', role: 'admin', is_admin: true };
          set({ user: mockUser, accessToken: 'mock-jwt-token-admin', isAuthenticated: true });
          axios.defaults.headers.common['Authorization'] = `Bearer mock-jwt-token-admin`;
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
      },
      checkAuth: async () => {
        const token = get().accessToken;
        if (!token) { set({ isLoading: false }); return; }
        if (import.meta.env.VITE_MOCK_ENABLED === 'true') {
          set({ user: { id: 'u-1', username: 'admin', name: '张伟', role: 'admin', is_admin: true }, isAuthenticated: true, isLoading: false });
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
    { name: 'auth-storage', partialize: (state) => ({ accessToken: state.accessToken }) }
  )
);
