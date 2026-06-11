import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { mockAdapter } from '../mock/mockAdapter';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  ...(import.meta.env.VITE_MOCK_ENABLED === 'true' ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = import.meta.env.BASE_URL + 'login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API Types
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  [key: string]: any;
}

// API Functions
export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/me'),
};

export const usersApi = {
  list: (params?: ListParams) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const orgsApi = {
  list: (params?: ListParams) => api.get('/organizations', { params }),
  get: (id: string) => api.get(`/organizations/${id}`),
  create: (data: any) => api.post('/organizations', data),
  update: (id: string, data: any) => api.put(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  members: (id: string) => api.get(`/organizations/${id}/members`),
  addMember: (id: string, data: any) => api.post(`/organizations/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/organizations/${id}/members/${userId}`),
};

export const modelSourcesApi = {
  list: (params?: ListParams) => api.get('/models/sources', { params }),
  get: (id: string) => api.get(`/models/sources/${id}`),
  create: (data: any) => api.post('/models/sources', data),
  update: (id: string, data: any) => api.put(`/models/sources/${id}`, data),
  delete: (id: string) => api.delete(`/models/sources/${id}`),
};

export const modelPoliciesApi = {
  list: (params?: ListParams) => api.get('/models/policies', { params }),
  get: (id: string) => api.get(`/models/policies/${id}`),
  create: (data: any) => api.post('/models/policies', data),
  update: (id: string, data: any) => api.put(`/models/policies/${id}`, data),
  delete: (id: string) => api.delete(`/models/policies/${id}`),
};

export const connectorsApi = {
  list: (params?: ListParams) => api.get('/connectors', { params }),
  get: (id: string) => api.get(`/connectors/${id}`),
  create: (data: any) => api.post('/connectors', data),
  update: (id: string, data: any) => api.put(`/connectors/${id}`, data),
  delete: (id: string) => api.delete(`/connectors/${id}`),
};

export const skillsApi = {
  list: (params?: ListParams) => api.get('/skills', { params }),
  get: (id: string) => api.get(`/skills/${id}`),
  create: (data: any) => api.post('/skills', data),
  update: (id: string, data: any) => api.put(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
};

export const agentsApi = {
  list: (params?: ListParams) => api.get('/agents', { params }),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  executions: (id: string, params?: ListParams) => api.get(`/agents/${id}/executions`, { params }),
  execution: (execId: string) => api.get(`/agents/executions/${execId}`),
};

export const tokensApi = {
  list: (params?: ListParams) => api.get('/tokens', { params }),
  get: (id: string) => api.get(`/tokens/${id}`),
  create: (data: any) => api.post('/tokens', data),
  update: (id: string, data: any) => api.put(`/tokens/${id}`, data),
};

export const chatAccountsApi = {
  list: (params?: ListParams) => api.get('/accounts/chat', { params }),
  bind: (id: string, userId: string) => api.put(`/accounts/chat/${id}/bindUser`, { user_id: userId }),
};

export const thirdPartyAccountsApi = {
  list: (params?: ListParams) => api.get('/accounts/third-party', { params }),
  bind: (id: string, userId: string) => api.put(`/accounts/third-party/${id}/bindUser`, { user_id: userId }),
};

export const matchingApi = {
  results: (params?: ListParams) => api.get('/account-matching/results', { params }),
  runs: (params?: ListParams) => api.get('/account-matching/runs', { params }),
  strategies: () => api.get('/account-matching/strategies'),
  createStrategy: (data: any) => api.post('/account-matching/strategies', data),
};

export const approvalsApi = {
  list: (params?: ListParams) => api.get('/approvals', { params }),
  get: (id: string) => api.get(`/approvals/${id}`),
  approve: (id: string) => api.post(`/approvals/${id}/approve`),
  reject: (id: string, reason?: string) => api.post(`/approvals/${id}/reject`, { reason }),
};

export const quotasApi = {
  list: (params?: ListParams) => api.get('/quotas', { params }),
  get: (userId: string) => api.get(`/quotas/${userId}`),
  update: (userId: string, data: any) => api.put(`/quotas/${userId}`, data),
};

export const auditApi = {
  list: (params?: ListParams) => api.get('/audit/logs', { params }),
};

export const statsApi = {
  dashboard: () => api.get('/stats/dashboard'),
  usageStats: () => api.get('/stats/usage'),
};

export const callLogsApi = {
  list: (params?: ListParams) => api.get('/models/call-logs', { params }),
};

export const costStatsApi = {
  summary: () => api.get('/models/cost-stats'),
};

export const chatAdaptersApi = {
  list: (params?: ListParams) => api.get('/connectors/chat-adapters', { params }),
  create: (data: any) => api.post('/connectors/chat-adapters', data),
  update: (id: string, data: any) => api.put(`/connectors/chat-adapters/${id}`, data),
  delete: (id: string) => api.delete(`/connectors/chat-adapters/${id}`),
};

export const agentRunsApi = {
  list: (params?: ListParams) => api.get('/agents/runs', { params }),
};

export const marketplaceApi = {
  list: (params?: ListParams) => api.get('/skills/marketplace', { params }),
  install: (id: string) => api.post(`/skills/marketplace/${id}/install`),
};

export const k8sApi = {
  pods: () => api.get('/system/k8s/pods'),
  nodes: () => api.get('/system/k8s/nodes'),
};

export const queuesApi = {
  stats: () => api.get('/system/queues'),
  retry: (taskId: string) => api.post(`/system/queues/failed/${taskId}/retry`),
  clearFailed: () => api.delete('/system/queues/failed'),
};

export const systemRestartApi = {
  restart: (service: string) => api.post(`/system/restart/${service}`),
};

export const systemApi = {
  health: () => api.get('/system/health'),
};
