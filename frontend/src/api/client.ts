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

export const rolesApi = {
  list: (params?: ListParams) => api.get('/roles', { params }),
  get: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
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
  fork: (id: string, data: { name: string }) => api.post(`/skills/${id}/fork`, data),
  // 前台：我创建的
  my: (params?: ListParams) => api.get('/skills/my', { params }),
  // 前台：我安装的
  installed: (params?: ListParams) => api.get('/skills/installed', { params }),
  uninstall: (id: string) => api.post(`/skills/installed/${id}/uninstall`),
  // 发布与下架
  publish: (id: string, data: any) => api.post(`/skills/${id}/publish`, data),
  delist: (id: string, data?: any) => api.post(`/skills/${id}/delist`, data),
};

// 发布审核中心
export const reviewApi = {
  list: (params?: ListParams & { type?: string; status?: string }) => api.get('/review/records', { params }),
  approve: (id: string, scopeConfig?: { scope_type: string; scope_role_ids?: string[] }) => api.post(`/review/${id}/approve`, scopeConfig || {}),
  reject: (id: string, reason?: string) => api.post(`/review/${id}/reject`, { reason }),
};

// 统一资源权限
export const resourceAclApi = {
  listAll: (params?: { resource_type?: string }) => api.get('/resource-acl', { params }),
  list: (resourceType: string, resourceId: string) => api.get(`/resource-acl/${resourceType}/${resourceId}`),
  add: (resourceType: string, resourceId: string, data: any) => api.post(`/resource-acl/${resourceType}/${resourceId}`, data),
  update: (resourceType: string, resourceId: string, aclId: string, data: any) => api.put(`/resource-acl/${resourceType}/${resourceId}/${aclId}`, data),
  remove: (resourceType: string, resourceId: string, aclId: string) => api.delete(`/resource-acl/${resourceType}/${resourceId}/${aclId}`),
};

// 前台权限管理（角色级）
export const frontPermApi = {
  resources: (params?: ListParams & { resource_type?: string; status?: string; idle?: string }) => api.get('/front-perm/resources', { params }),
  getAcl: (resourceType: string, resourceId: string) => api.get(`/front-perm/acl/${resourceType}/${resourceId}`),
  addAcl: (resourceType: string, resourceId: string, data: any) => api.post(`/front-perm/acl/${resourceType}/${resourceId}`, data),
  removeAcl: (resourceType: string, resourceId: string, aclId: string) => api.delete(`/front-perm/acl/${resourceType}/${resourceId}/${aclId}`),
  roles: () => api.get('/front-perm/roles'),
  toggle: (id: string) => api.post(`/front-perm/resources/${id}/toggle`),
  delist: (id: string, data: { reason: string }) => api.post(`/front-perm/resources/${id}/delist`, data),
  delete: (id: string) => api.delete(`/front-perm/resources/${id}`),
  transfer: (id: string, data: any) => api.post(`/front-perm/resources/${id}/transfer`, data),
};

export const agentsApi = {
  list: (params?: ListParams) => api.get('/agents', { params }),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  save: (id: string, data: any) => api.post(`/agents/${id}/save`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  executions: (id: string, params?: ListParams) => api.get(`/agents/${id}/executions`, { params }),
  execution: (execId: string) => api.get(`/agents/executions/${execId}`),
  // 工作流配置（拖拽画布）
  getWorkflow: (id: string) => api.get(`/agents/workflows/${id}`),
  saveWorkflow: (id: string, data: any) => api.put(`/agents/workflows/${id}`, data),
  // 协作者与权限
  collaborators: (id: string) => api.get(`/agents/${id}/collaborators`),
  addCollaborator: (id: string, data: any) => api.post(`/agents/${id}/collaborators`, data),
  updateCollaborator: (id: string, principalId: string, data: any) => api.put(`/agents/${id}/collaborators/${principalId}`, data),
  removeCollaborator: (id: string, principalId: string) => api.delete(`/agents/${id}/collaborators/${principalId}`),
  transferOwnership: (id: string, data: any) => api.post(`/agents/${id}/transfer`, data),
  fork: (id: string, data: { name: string }) => api.post(`/agents/${id}/fork`, data),
  // 调试
  debugChat: (id: string, data: any) => api.post(`/agents/${id}/debug/chat`, data),
  debugWorkflow: (id: string, data: any) => api.post(`/agents/${id}/debug/workflow`, data),
};

export const outputDeclarationsApi = {
  list: (params?: any) => api.get('/output-declarations', { params }),
  register: (data: any) => api.post('/output-declarations/register', data),
  check: (data: any) => api.post('/output-declarations/check', data),
};

export const tokensApi = {
  list: (params?: ListParams) => api.get('/tokens', { params }),
  get: (id: string) => api.get(`/tokens/${id}`),
  create: (data: any) => api.post('/tokens', data),
  update: (id: string, data: any) => api.put(`/tokens/${id}`, data),
  delete: (id: string) => api.delete(`/tokens/${id}`),
  // 管理员 Token 白名单
  whitelist: {
    list: (params?: ListParams) => api.get('/tokens/whitelist', { params }),
    add: (data: { user_id: string; remark?: string }) => api.post('/tokens/whitelist', data),
    remove: (id: string) => api.delete(`/tokens/whitelist/${id}`),
    check: (userId: string) => api.get(`/tokens/whitelist/check/${userId}`),
  },
  // Token 配额
  quotas: {
    list: (params?: ListParams) => api.get('/tokens/quotas', { params }),
    get: (userId: string) => api.get(`/tokens/quotas/${userId}`),
    update: (userId: string, data: any) => api.put(`/tokens/quotas/${userId}`, data),
    topUp: (userId: string, data: { amount: number; reason?: string }) => api.post(`/tokens/quotas/${userId}/top-up`, data),
    toggle: (userId: string) => api.post(`/tokens/quotas/${userId}/toggle`),
    topUpLogs: (userId: string, params?: ListParams) => api.get(`/tokens/top-up-logs/${userId}`, { params }),
  },
};

// 平台公共 Token 账户
export const tokenAccountsApi = {
  list: () => api.get('/token-accounts'),
  // 成员管理（新接口）
  members: (accountId: string) => api.get(`/token-accounts/${accountId}/members`),
  addMembers: (accountId: string, data: { user_ids: string[]; remark?: string }) => api.post(`/token-accounts/${accountId}/members`, data),
  removeMember: (memberId: string) => api.delete(`/token-accounts/members/${memberId}`),
  // 兼容旧接口（供前台权限管理使用）
  whitelist: (accountId: string) => api.get('/token-accounts/whitelist', { params: { account_id: accountId } }),
};

// 组织树
export const orgTreeApi = {
  get: () => api.get('/org-tree'),
};

// Agent 公共额度
export const publicQuotaApi = {
  get: (resourceId: string) => api.get(`/front-perm/resources/${resourceId}/public-quota`),
  enable: (resourceId: string, data: any) => api.post(`/front-perm/resources/${resourceId}/public-quota`, data),
  disable: (resourceId: string) => api.delete(`/front-perm/resources/${resourceId}/public-quota`),
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
  updateStrategy: (id: string, data: any) => api.put(`/account-matching/strategies/${id}`, data),
  swapStrategy: (id: string, direction: 'up' | 'down') => api.post('/account-matching/strategies/swap', { id, direction }),
  triggerRun: () => api.post('/account-matching/trigger', {}),
  updateResult: (id: string, data: any) => api.put(`/account-matching/results/${id}`, data),
  ignoreResult: (id: string) => api.put(`/account-matching/results/${id}`, { status: 'ignored' }),
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
  clusters: () => api.get('/system/k8s/clusters'),
  cluster: (id: string) => api.get(`/system/k8s/clusters/${id}`),
};

export const queuesApi = {
  stats: () => api.get('/system/queues'),
  retry: (taskId: string) => api.post(`/system/queues/failed/${taskId}/retry`),
  clearFailed: () => api.delete('/system/queues/failed'),
};

export const systemRestartApi = {
  restart: (service: string) => api.post(`/system/restart/${service}`),
};

// Compose Stacks（服务重启）
export const stacksApi = {
  list: (params?: { q?: string }) => api.get('/system/stacks', { params }),
  detail: (id: string) => api.get(`/system/stacks/${id}`),
  compose: (id: string) => api.get(`/system/stacks/${id}/compose`),
  saveCompose: (id: string, yaml: string, validate = true) =>
    api.put(`/system/stacks/${id}/compose`, { yaml, validate }),
  logs: (id: string) => api.get(`/system/stacks/${id}/logs`),
  restart: (id: string) => api.post(`/system/stacks/${id}/restart`),
  start: (id: string) => api.post(`/system/stacks/${id}/start`),
  stop: (id: string) => api.post(`/system/stacks/${id}/stop`),
  pause: (id: string) => api.post(`/system/stacks/${id}/pause`),
  pull: (id: string) => api.post(`/system/stacks/${id}/pull`),
};

export const systemApi = {
  health: () => api.get('/system/health'),
};

// 智能报告：模板
export const reportTemplatesApi = {
  list: () => api.get('/reports/templates'),
  create: (data: any) => api.post('/reports/templates', data),
  update: (id: string, data: any) => api.put(`/reports/templates/${id}`, data),
  delete: (id: string) => api.delete(`/reports/templates/${id}`),
};

// 智能报告：生成配置
export const reportConfigsApi = {
  list: (params?: ListParams) => api.get('/reports/configs', { params }),
  create: (data: any) => api.post('/reports/configs', data),
  update: (id: string, data: any) => api.put(`/reports/configs/${id}`, data),
  delete: (id: string) => api.delete(`/reports/configs/${id}`),
  toggle: (id: string) => api.post(`/reports/configs/${id}/toggle`),
  trigger: (id: string) => api.post(`/reports/configs/${id}/trigger`),
};

// 智能报告：报告实例
export const reportsApi = {
  list: (params?: ListParams & { scope?: string; period?: string; department_id?: string; status?: string }) => api.get('/reports/list', { params }),
  get: (id: string) => api.get(`/reports/${id}`),
  export: (id: string) => api.get(`/reports/${id}/export`),
  fork: (id: string, data: { name: string }) => api.post(`/reports/${id}/fork`, data),
  departments: () => api.get('/reports/departments'),
};

// RAG 知识库
export const ragApi = {
  knowledgeBases: {
    list: (params?: ListParams) => api.get('/rag/knowledge-bases', { params }),
    get: (id: string) => api.get(`/rag/knowledge-bases/${id}`),
    create: (data: any) => api.post('/rag/knowledge-bases', data),
    update: (id: string, data: any) => api.put(`/rag/knowledge-bases/${id}`, data),
    delete: (id: string) => api.delete(`/rag/knowledge-bases/${id}`),
    analytics: (id: string) => api.get(`/rag/knowledge-bases/${id}/analytics`),
    wiki: (id: string) => api.get(`/rag/knowledge-bases/${id}/wiki`),
    // 协作者与权限
    collaborators: (id: string) => api.get(`/rag/knowledge-bases/${id}/collaborators`),
    addCollaborator: (id: string, data: any) => api.post(`/rag/knowledge-bases/${id}/collaborators`, data),
    updateCollaborator: (id: string, principalId: string, data: any) => api.put(`/rag/knowledge-bases/${id}/collaborators/${principalId}`, data),
    removeCollaborator: (id: string, principalId: string) => api.delete(`/rag/knowledge-bases/${id}/collaborators/${principalId}`),
  },
  documents: {
    list: (params?: ListParams) => api.get('/rag/documents', { params }),
    upload: (data: any) => api.post('/rag/documents', data),
    uploadMarkdown: (data: { kb_id: string; title: string; content: string }) => api.post('/rag/documents/markdown', data),
    delete: (id: string) => api.delete(`/rag/documents/${id}`),
    chunks: (id: string) => api.get(`/rag/documents/${id}/chunks`),
    detail: (id: string) => api.get(`/rag/documents/${id}/detail`),
  },
  faq: {
    list: (params?: ListParams & { kb_id?: string }) => api.get('/rag/faq', { params }),
    create: (data: any) => api.post('/rag/faq', data),
    delete: (id: string) => api.delete(`/rag/faq/${id}`),
  },
  chat: {
    send: (data: { kb_id: string; message: string; history?: Array<{ role: string; content: string }> }) =>
      api.post('/rag/chat', data),
  },
  retrieve: (data: { query: string; kb_id: string; top_k?: number }) =>
    api.post('/rag/retrieve', data),
};

// 工作空间
export const workspaceApi = {
  members: {
    list: (params?: ListParams) => api.get('/workspace/members', { params }),
    update: (id: string, data: any) => api.put(`/workspace/members/${id}`, data),
    delete: (id: string) => api.delete(`/workspace/members/${id}`),
    invite: (data: any) => api.post('/workspace/members', data),
  },
  organizations: {
    list: (params?: ListParams) => api.get('/workspace/organizations', { params }),
    create: (data: any) => api.post('/workspace/organizations', data),
    update: (id: string, data: any) => api.put(`/workspace/organizations/${id}`, data),
    delete: (id: string) => api.delete(`/workspace/organizations/${id}`),
  },
  apiKeys: {
    list: (params?: ListParams) => api.get('/workspace/api-keys', { params }),
    create: (data: any) => api.post('/workspace/api-keys', data),
    delete: (id: string) => api.delete(`/workspace/api-keys/${id}`),
  },
  auditLogs: {
    list: (params?: ListParams) => api.get('/workspace/audit-logs', { params }),
  },
};

// AI 对话
export const chatApi = {
  sessions: {
    list: (params?: ListParams) => api.get('/chat/sessions', { params }),
    get: (id: string) => api.get(`/chat/sessions/${id}`),
    create: (data: any) => api.post('/chat/sessions', data),
    update: (id: string, data: any) => api.put(`/chat/sessions/${id}`, data),
    delete: (id: string) => api.delete(`/chat/sessions/${id}`),
    share: (id: string, data: { recipient_ids: string[]; mode: 'view' | 'continue'; message_ids?: string[]; note?: string }) =>
      api.post(`/chat/sessions/${id}/share`, data),
    addMembers: (id: string, userIds: string[], title?: string) => api.post(`/chat/sessions/${id}/members`, { user_ids: userIds, ...(title ? { title } : {}) }),
    removeMember: (id: string, uid: string) => api.delete(`/chat/sessions/${id}/members/${uid}`),
  },
  messages: {
    list: (sessionId: string) => api.get(`/chat/sessions/${sessionId}/messages`),
    send: (sessionId: string, content: string, extra?: { to_ai?: boolean; user_name?: string }) =>
      api.post(`/chat/sessions/${sessionId}/messages`, { content, ...extra }),
  },
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  create: (data: any) => api.post('/notifications', data),
};

export const tokenResaleApi = {
  overview: () => api.get('/token-resale/overview'),
  // 可售资源（模型源转售配置）
  sources: () => api.get('/token-resale/sources'),
  updateSource: (id: string, data: any) => api.put(`/token-resale/sources/${id}`, data),
  toggleSource: (id: string) => api.post(`/token-resale/sources/${id}/toggle`),
  // 客户账户（买方）
  buyers: (params?: ListParams) => api.get('/token-resale/buyers', { params }),
  createBuyer: (data: any) => api.post('/token-resale/buyers', data),
  updateBuyer: (id: string, data: any) => api.put(`/token-resale/buyers/${id}`, data),
  deleteBuyer: (id: string) => api.delete(`/token-resale/buyers/${id}`),
  toggleBuyer: (id: string) => api.post(`/token-resale/buyers/${id}/toggle`),
  depositBuyer: (id: string, data: any) => api.post(`/token-resale/buyers/${id}/deposit`, data),
  // 交易账单
  usage: (params?: ListParams & { buyer_id?: string; source_id?: string }) => api.get('/token-resale/usage', { params }),
  settlements: () => api.get('/token-resale/settlements'),
  // 执行结算：将当前周期 pending 用量归集并关闭
  settle: () => api.post('/token-resale/settle'),
};
