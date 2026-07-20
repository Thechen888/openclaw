import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, Tabs, Tab,
  Avatar, Stack, Alert,
} from '@mui/material';
import {
  Add, Edit, Refresh, Key, Visibility, VisibilityOff, ContentCopy, Delete, Close,
  Security, Person,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { tokensApi } from '../../api/client';

const CRED_TYPES = [
  { value: 'api_key', label: 'API密钥' },
  { value: 'oauth2', label: 'OAuth2' },
  { value: 'bearer', label: 'Bearer' },
  { value: 'basic', label: 'Basic' },
  { value: 'jwt', label: 'JWT' },
];

// 不同凭证类型需要填写的字段定义
interface CredFieldDef {
  key: string;
  label: string;
  type?: string;
  helper?: string;
  multiline?: boolean;
}

const CRED_FIELDS: Record<string, CredFieldDef[]> = {
  api_key: [
    { key: 'api_key', label: 'API Key' },
    { key: 'api_secret', label: 'API Secret（可选）' },
  ],
  oauth2: [
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' },
    { key: 'auth_url', label: '授权地址 (Auth URL)' },
    { key: 'token_url', label: '令牌地址 (Token URL)' },
    { key: 'redirect_uri', label: '回调地址 (Redirect URI)' },
    { key: 'scope', label: '权限范围 (Scope)', helper: '多个 scope 用空格分隔' },
  ],
  bearer: [
    { key: 'bearer_token', label: 'Bearer Token' },
    { key: 'issuer', label: '签发方（可选）' },
  ],
  basic: [
    { key: 'username', label: '用户名' },
    { key: 'password', label: '密码', type: 'password' },
  ],
  jwt: [
    { key: 'private_key', label: '私钥 (Private Key)', type: 'password', multiline: true },
    { key: 'algorithm', label: '算法', helper: '如 RS256' },
    { key: 'issuer', label: '签发方 (Issuer)' },
    { key: 'audience', label: '接收方 (Audience)' },
    { key: 'subject', label: '主题 (Subject，可选）' },
  ],
};

function defaultCredentialConfig(type: string) {
  const fields = CRED_FIELDS[type] || [];
  const obj: Record<string, string> = {};
  fields.forEach(f => { obj[f.key] = ''; });
  return obj;
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'revoked', label: '已吊销' },
];

function maskToken(val?: string) {
  if (!val || val.length < 10) return '***';
  return val.slice(0, 6) + '***' + val.slice(-4);
}

function getCredLabel(v: string) {
  return CRED_TYPES.find(c => c.value === v)?.label || v;
}

function getStatusLabel(v: string) {
  const map: Record<string, string> = { active: '启用', disabled: '禁用', revoked: '已吊销' };
  return map[v] || v;
}

export default function TokensPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [statusFilter, setStatusFilter] = useState('');
  const [mainTab, setMainTab] = useState(0);
  const queryParams = { ...params, status: statusFilter || undefined };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newTokenValue, setNewTokenValue] = useState<string>('');

  // ---- 白名单 state ----
  const [wlDialogOpen, setWlDialogOpen] = useState(false);
  const [wlForm, setWlForm] = useState({ user_id: '', remark: '' });
  const { data: wlData, refetch: refetchWl } = useQuery({
    queryKey: ['whitelist'],
    queryFn: () => tokensApi.whitelist.list({ page: 1, page_size: 100 }),
  });
  const wlItems = wlData?.data?.data || [];
  const addWlMutation = useMutation({
    mutationFn: (d: { user_id: string; remark?: string }) => tokensApi.whitelist.add(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whitelist'] }); setWlDialogOpen(false); setWlForm({ user_id: '', remark: '' }); enqueueSnackbar('已添加白名单', { variant: 'success' }); },
    onError: () => enqueueSnackbar('添加失败', { variant: 'error' }),
  });
  const removeWlMutation = useMutation({
    mutationFn: (id: string) => tokensApi.whitelist.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whitelist'] }); enqueueSnackbar('已移除', { variant: 'success' }); },
  });

  // ---- 配额管理 state ----
  const [quotaEditItem, setQuotaEditItem] = useState<any>(null);
  const [quotaForm, setQuotaForm] = useState({ daily_limit: 100000, monthly_limit: 3000000, overage_policy: 'block', source: 'platform', remark: '' });
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ user_id: '', amount: 0, reason: '' });
  const { data: quotaData, refetch: refetchQuotas } = useQuery({
    queryKey: ['token-quotas'],
    queryFn: () => tokensApi.quotas.list({ page: 1, page_size: 100 }),
  });
  const quotaItems = quotaData?.data?.data || [];
  const updateQuotaMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => tokensApi.quotas.update(userId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['token-quotas'] }); setQuotaDialogOpen(false); enqueueSnackbar('配额已更新', { variant: 'success' }); },
    onError: () => enqueueSnackbar('更新失败', { variant: 'error' }),
  });
  const topUpMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => tokensApi.quotas.topUp(userId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['token-quotas'] }); setTopUpOpen(false); setTopUpForm({ user_id: '', amount: 0, reason: '' }); enqueueSnackbar('充值成功', { variant: 'success' }); },
    onError: () => enqueueSnackbar('充值失败', { variant: 'error' }),
  });
  const toggleQuotaMutation = useMutation({
    mutationFn: (userId: string) => tokensApi.quotas.toggle(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['token-quotas'] }); enqueueSnackbar('状态已切换', { variant: 'success' }); },
  });
  const [form, setForm] = useState<any>({
    name: '', owner: '', target_system: '', credential_type: 'api_key', status: 'active', quota_limit: '', expires_at: '',
    credential_config: defaultCredentialConfig('api_key'),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tokens', queryParams],
    queryFn: () => tokensApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => tokensApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      setDialogOpen(false);
      resetForm();
      setNewTokenValue(res.data.data?.token_value || '');
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => tokensApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tokensApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] });
      enqueueSnackbar('令牌已删除', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const resetForm = () => setForm({
    name: '', owner: '', target_system: '', credential_type: 'api_key', status: 'active', quota_limit: '', expires_at: '',
    credential_config: defaultCredentialConfig('api_key'),
  });

  const handleSave = () => {
    const payload = {
      name: form.name,
      owner: form.owner,
      target_system: form.target_system,
      credential_type: form.credential_type,
      status: form.status,
      quota_limit: form.quota_limit ? Number(form.quota_limit) : null,
      expires_at: form.expires_at,
      credential_config: form.credential_config,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getQuotaPct = (used?: number, limit?: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min(((used || 0) / limit) * 100, 100);
  };

  const getQuotaColor = (pct: number): 'success' | 'warning' | 'error' => {
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'success';
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    const ctype = item.credential_type || 'api_key';
    setForm({
      name: item.name || '',
      owner: item.owner || '',
      target_system: item.target_system || '',
      credential_type: ctype,
      status: item.status || 'active',
      quota_limit: item.quota_limit ?? '',
      expires_at: item.expires_at || '',
      credential_config: item.credential_config
        ? { ...defaultCredentialConfig(ctype), ...item.credential_config }
        : defaultCredentialConfig(ctype),
    });
    setDialogOpen(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar('已复制到剪贴板', { variant: 'success' });
    });
  };

  const tabLabels = ['API 令牌', '管理员 Token 白名单', 'Token 配额管理'];

  return (
    <Box>
      <PageHeader
        title="Token 管理"
        subtitle="管理API令牌、白名单与用户配额"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => { refetch(); refetchWl(); refetchQuotas(); }}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {tabLabels.map((l, i) => <Tab key={i} label={l} />)}
      </Tabs>

      {/* =================== Tab 0: API 令牌 =================== */}
      {mainTab === 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加令牌
            </Button>
          </Box>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            filters={
              <TextField
                select size="small" label="状态"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                sx={{ minWidth: 120 }}
              >
                {STATUS_OPTIONS.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
            }
          />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>负责人</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>目标系统</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>凭证类型</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>令牌值</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>配额使用 / 上限</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>到期时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState title="暂无令牌" description="创建第一个令牌以连接外部服务" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => {
              const quotaPct = getQuotaPct(item.quota_used, item.quota_limit);
              const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
              const showFull = showSecrets[item.id];
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Key sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{item.owner || item.owner_name || '-'}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{item.target_system || '-'}</TableCell>
                  <TableCell>
                    <Chip label={getCredLabel(item.credential_type)} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', minWidth: 90 }}>
                        {showFull ? item.token_value : maskToken(item.token_value)}
                      </Typography>
                      <Tooltip title={showFull ? '隐藏' : '显示'}>
                        <IconButton size="small" onClick={() => setShowSecrets(prev => ({ ...prev, [item.id]: !prev[item.id] }))}>
                          {showFull ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="复制">
                        <IconButton size="small" onClick={() => item.token_value && handleCopy(item.token_value)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={isExpired ? 'error' : item.status} label={isExpired ? '已过期' : getStatusLabel(item.status)} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {(item.quota_used ?? 0).toLocaleString()} / {item.quota_limit ? item.quota_limit.toLocaleString() : '不限'}
                      </Typography>
                      {item.quota_limit > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={quotaPct}
                          color={getQuotaColor(quotaPct)}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: isExpired ? 'error.main' : 'text.secondary', whiteSpace: 'nowrap' }}>
                    {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : '永不'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm(`确认删除令牌「${item.name}」？`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}
        </>
      )}

      {/* =================== Tab 1: 管理员 Token 白名单 =================== */}
      {mainTab === 1 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => setWlDialogOpen(true)}>添加用户</Button>
          </Box>
          <DataTable pagination={{ page: 1, pageSize: 50, total: wlItems.length, onPageChange: () => {}, onPageSizeChange: () => {} }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>用户 ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>授权时间</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>备注</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wlItems.length === 0 ? (
                <TableRow><TableCell colSpan={5}><EmptyState title="暂无白名单" description="添加有权使用管理员 Token 的用户" /></TableCell></TableRow>
              ) : wlItems.map((item: any) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.user_id}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.granted_at ? new Date(item.granted_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.is_active ? '启用' : '已停用'} color={item.is_active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.remark || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="移除">
                      <IconButton size="small" color="error" onClick={() => { if (confirm('确认移除该用户？')) removeWlMutation.mutate(item.id); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </>
      )}

      {/* =================== Tab 2: Token 配额管理 =================== */}
      {mainTab === 2 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" startIcon={<Person />} onClick={() => setTopUpOpen(true)}>充值 Token</Button>
          </Box>
          <DataTable pagination={{ page: 1, pageSize: 50, total: quotaItems.length, onPageChange: () => {}, onPageSizeChange: () => {} }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>持有人 (User ID)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>每日限额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>每日已用</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>每月限额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>每月已用</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Token 来源</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>累计充值</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>超额策略</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotaItems.length === 0 ? (
                <TableRow><TableCell colSpan={10}><EmptyState title="暂无配额记录" description="用户首次使用后自动生成" /></TableCell></TableRow>
              ) : quotaItems.map((item: any) => {
                const dailyPct = item.daily_limit > 0 ? Math.min((item.daily_used / item.daily_limit) * 100, 100) : 0;
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.user_id}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{item.daily_limit?.toLocaleString() || '-'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{item.daily_used?.toLocaleString() || 0}</Typography>
                        {item.daily_limit > 0 && <LinearProgress variant="determinate" value={dailyPct} color={dailyPct >= 90 ? 'error' : dailyPct >= 70 ? 'warning' : 'success'} sx={{ flex: 1, height: 4, borderRadius: 2 }} />}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{item.monthly_limit?.toLocaleString() || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{item.monthly_used?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.source === 'platform' ? '平台分配' : item.source === 'purchased' ? '购买' : '自有'} variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'primary.main' }}>{item.total_recharged?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.overage_policy === 'block' ? '停用' : '降级'} color={item.overage_policy === 'block' ? 'error' : 'warning'} variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.is_active !== false ? '正常' : '已停用'} color={item.is_active !== false ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="编辑配额">
                          <IconButton size="small" onClick={() => {
                            setQuotaEditItem(item);
                            setQuotaForm({ daily_limit: item.daily_limit || 100000, monthly_limit: item.monthly_limit || 3000000, overage_policy: item.overage_policy || 'block', source: item.source || 'platform', remark: item.remark || '' });
                            setQuotaDialogOpen(true);
                          }}><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={item.is_active !== false ? '停用' : '启用'}>
                          <IconButton size="small" color={item.is_active !== false ? 'warning' : 'success'} onClick={() => toggleQuotaMutation.mutate(item.user_id)}>
                            <Security fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}

      {/* 创建/编辑令牌弹窗 */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editItem ? '编辑令牌' : '添加令牌'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="负责人" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="目标系统" value={form.target_system} onChange={e => setForm({ ...form, target_system: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="凭证类型"
              value={form.credential_type}
              onChange={e => {
                const ct = e.target.value;
                setForm({
                  ...form,
                  credential_type: ct,
                  credential_config: { ...defaultCredentialConfig(ct) },
                });
              }}
            >
              {CRED_TYPES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.filter(s => s.value).map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="配额上限" type="number" value={form.quota_limit} onChange={e => setForm({ ...form, quota_limit: e.target.value })} helperText="留空表示不限" />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="到期时间" type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>

          {/* 凭证类型特有字段 */}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 0.5 }}>
              凭证参数（{CRED_TYPES.find(c => c.value === form.credential_type)?.label}）
            </Typography>
          </Grid>
          {(CRED_FIELDS[form.credential_type] || []).map(field => (
            <Grid key={field.key} size={field.multiline ? 12 : 6}>
              <TextField
                fullWidth
                label={field.label}
                type={field.type || 'text'}
                multiline={field.multiline}
                rows={field.multiline ? 3 : undefined}
                value={form.credential_config?.[field.key] || ''}
                helperText={field.helper}
                onChange={e => {
                  setForm((prev: any) => ({
                    ...prev,
                    credential_config: { ...prev.credential_config, [field.key]: e.target.value },
                  }));
                }}
              />
            </Grid>
          ))}
        </Grid>
      </CrudDialog>

      {/* 新令牌值展示弹窗 */}
      <Dialog open={!!newTokenValue} onClose={() => setNewTokenValue('')} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>令牌已创建</Typography>
          <IconButton size="small" onClick={() => setNewTokenValue('')}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            请立即复制并保存此令牌值，关闭后无法再次查看：
          </Typography>
          <TextField
            fullWidth
            value={newTokenValue}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" startIcon={<ContentCopy />} onClick={() => handleCopy(newTokenValue)}>
                      复制
                    </Button>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewTokenValue('')}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 白名单添加弹窗 */}
      <CrudDialog
        open={wlDialogOpen}
        onClose={() => setWlDialogOpen(false)}
        title="添加管理员 Token 白名单"
        onSave={() => addWlMutation.mutate(wlForm)}
        saving={addWlMutation.isPending}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth label="用户 ID" required
            placeholder="输入用户 UUID"
            value={wlForm.user_id}
            onChange={e => setWlForm({ ...wlForm, user_id: e.target.value })}
          />
          <TextField
            fullWidth label="备注" multiline rows={2}
            placeholder="说明授权原因..."
            value={wlForm.remark}
            onChange={e => setWlForm({ ...wlForm, remark: e.target.value })}
          />
        </Box>
      </CrudDialog>

      {/* 配额编辑弹窗 */}
      <CrudDialog
        open={quotaDialogOpen}
        onClose={() => setQuotaDialogOpen(false)}
        title="编辑 Token 配额"
        onSave={() => quotaEditItem && updateQuotaMutation.mutate({ userId: quotaEditItem.user_id, data: quotaForm })}
        saving={updateQuotaMutation.isPending}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth label="每日限额 (Token)" type="number"
            value={quotaForm.daily_limit}
            onChange={e => setQuotaForm({ ...quotaForm, daily_limit: Number(e.target.value) })}
            helperText="每人每天可用的最大 Token 数"
          />
          <TextField
            fullWidth label="每月限额 (Token)" type="number"
            value={quotaForm.monthly_limit}
            onChange={e => setQuotaForm({ ...quotaForm, monthly_limit: Number(e.target.value) })}
          />
          <TextField
            fullWidth select label="超额策略" value={quotaForm.overage_policy}
            onChange={e => setQuotaForm({ ...quotaForm, overage_policy: e.target.value })}
            helperText="Token 用尽后的处理方式"
          >
            <MenuItem value="block">停用（无法继续使用平台）</MenuItem>
            <MenuItem value="downgrade">降级（切换到个人 Token）</MenuItem>
          </TextField>
          <TextField
            fullWidth select label="Token 来源" value={quotaForm.source}
            onChange={e => setQuotaForm({ ...quotaForm, source: e.target.value })}
          >
            <MenuItem value="platform">平台分配</MenuItem>
            <MenuItem value="purchased">购买</MenuItem>
            <MenuItem value="self">自有</MenuItem>
          </TextField>
          <TextField
            fullWidth label="备注" multiline rows={2}
            value={quotaForm.remark}
            onChange={e => setQuotaForm({ ...quotaForm, remark: e.target.value })}
          />
        </Box>
      </CrudDialog>

      {/* 充值弹窗 */}
      <CrudDialog
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title="充值 Token"
        onSave={() => topUpForm.user_id && topUpForm.amount > 0 && topUpMutation.mutate({ userId: topUpForm.user_id, data: { amount: topUpForm.amount, reason: topUpForm.reason } })}
        saving={topUpMutation.isPending}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">充值将减少用户已用额度，相当于给用户增加可用 Token。充值后自动恢复用户使用权限。</Alert>
          <TextField
            fullWidth label="用户 ID" required
            placeholder="输入用户 UUID"
            value={topUpForm.user_id}
            onChange={e => setTopUpForm({ ...topUpForm, user_id: e.target.value })}
          />
          <TextField
            fullWidth label="充值数量 (Token)" type="number" required
            value={topUpForm.amount || ''}
            onChange={e => setTopUpForm({ ...topUpForm, amount: Number(e.target.value) })}
          />
          <TextField
            fullWidth label="充值原因" multiline rows={2}
            placeholder="说明充值原因..."
            value={topUpForm.reason}
            onChange={e => setTopUpForm({ ...topUpForm, reason: e.target.value })}
          />
        </Box>
      </CrudDialog>
    </Box>
  );
}
