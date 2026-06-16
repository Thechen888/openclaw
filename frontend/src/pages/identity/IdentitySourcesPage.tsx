import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import {
  Add, Edit, Delete, Refresh, Sync, NetworkCheck,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import api from '../../api/client';

type SourceType = 'LDAP' | 'STARLARK' | 'LOCAL' | 'OAUTH2';
type ConflictStrategy = 'primary' | 'admin' | 'merge';

// ---- 类型中文化 ----
const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'LDAP',     label: 'LDAP 目录服务' },
  { value: 'STARLARK', label: 'Starlark 脚本' },
  { value: 'LOCAL',    label: '本地用户库' },
  { value: 'OAUTH2',   label: 'OAuth2 认证' },
];

const SOURCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_TYPES.map(t => [t.value, t.label])
);

const CONFLICT_STRATEGIES: { value: ConflictStrategy; label: string }[] = [
  { value: 'primary', label: '主源优先' },
  { value: 'admin',   label: '管理员确认' },
  { value: 'merge',   label: '合并' },
];

const conflictLabel = (v: string) =>
  CONFLICT_STRATEGIES.find(s => s.value === v)?.label || v;

const typeColor = (t: string): 'primary' | 'secondary' | 'default' | 'warning' => {
  switch (t) {
    case 'LDAP':     return 'primary';
    case 'STARLARK': return 'secondary';
    case 'OAUTH2':   return 'warning';
    default:         return 'default';
  }
};

// ---- Cron 预设 ----
const CRON_PRESETS = [
  { label: '每小时',   value: '0 * * * *' },
  { label: '每2小时',  value: '0 */2 * * *' },
  { label: '每天凌晨', value: '0 2 * * *' },
  { label: '每周一',   value: '0 2 * * 1' },
  { label: '自定义',   value: '__custom__' },
];

interface IdentitySource {
  id: string;
  name: string;
  type: SourceType;
  priority: number;
  sync_cron: string;
  conflict_strategy: ConflictStrategy;
  status: string;
  is_builtin?: boolean;
  // LDAP
  ldap_server?: string;
  ldap_port?: number;
  bind_dn?: string;
  bind_password?: string;
  base_dn?: string;
  filter?: string;
  // STARLARK
  script?: string;
  // OAUTH2
  oauth_endpoint?: string;
  client_id?: string;
  client_secret?: string;
  scope?: string;
}

// 按类型构建干净的空 form（切换类型时不会残留旧字段）
const buildEmptyForm = (type: SourceType): IdentitySource => {
  const base: IdentitySource = {
    id: '', name: '', type, priority: 0,
    sync_cron: '', conflict_strategy: 'primary', status: 'active',
  };
  if (type === 'LDAP')     return { ...base, ldap_server: '', ldap_port: 636, bind_dn: '', bind_password: '', base_dn: '', filter: '(objectClass=person)' };
  if (type === 'STARLARK') return { ...base, script: '' };
  if (type === 'OAUTH2')   return { ...base, oauth_endpoint: '', client_id: '', client_secret: '', scope: 'openid profile email' };
  return base; // LOCAL
};

// 从 item 中提取干净的表单字段（剔除服务端字段）
const extractFormFields = (item: IdentitySource): IdentitySource => {
  const { id: _id, is_builtin: _ib, ...rest } = item;
  return { ...buildEmptyForm(item.type), ...rest };
};

export default function IdentitySourcesPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<IdentitySource | null>(null);
  const [form, setForm] = useState<IdentitySource>(buildEmptyForm('LDAP'));
  const [cronMode, setCronMode] = useState<string>('0 */2 * * *'); // 预设选中值

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['identity-sources', params],
    queryFn: () => api.get('/identity/sources', { params }),
  });
  const items: IdentitySource[] = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/identity/sources', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['identity-sources'] });
      setDialogOpen(false);
      enqueueSnackbar('身份源已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => api.put(`/identity/sources/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['identity-sources'] });
      setDialogOpen(false);
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/identity/sources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['identity-sources'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });
  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/identity/sources/${id}/test-connection`),
    onSuccess: () => enqueueSnackbar('连接测试成功', { variant: 'success' }),
    onError:  () => enqueueSnackbar('连接测试失败，请检查配置', { variant: 'error' }),
  });
  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/identity/sources/${id}/sync`),
    onSuccess: () => enqueueSnackbar('已触发立即同步', { variant: 'info' }),
    onError:   () => enqueueSnackbar('触发同步失败', { variant: 'error' }),
  });

  const handleOpenCreate = () => {
    setEditItem(null);
    const f = buildEmptyForm('LDAP');
    setForm(f);
    setCronMode('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: IdentitySource) => {
    setEditItem(item);
    const f = extractFormFields(item);
    setForm(f);
    // 判断 cron 是否是预设之一
    const preset = CRON_PRESETS.find(p => p.value !== '__custom__' && p.value === item.sync_cron);
    setCronMode(preset ? item.sync_cron : (item.sync_cron ? '__custom__' : ''));
    setDialogOpen(true);
  };

  // 切换类型时重建干净表单，保留通用字段
  const handleTypeChange = (newType: SourceType) => {
    setForm(prev => ({
      ...buildEmptyForm(newType),
      name: prev.name,
      priority: prev.priority,
      conflict_strategy: prev.conflict_strategy,
      sync_cron: prev.sync_cron,
      status: prev.status,
    }));
  };

  // Cron 预设切换
  const handleCronPreset = (val: string) => {
    setCronMode(val);
    if (val !== '__custom__') {
      setForm(prev => ({ ...prev, sync_cron: val }));
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      enqueueSnackbar('请填写名称', { variant: 'warning' });
      return;
    }
    // 只提交与当前类型相关的字段，不带 id/is_builtin
    const { id: _id, is_builtin: _ib, ...payload } = form as any;
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box>
      <PageHeader
        title="身份源配置"
        subtitle="配置主账号权威来源和同步策略"
        actions={
          <>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
              添加身份源
            </Button>
          </>
        }
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        身份源决定平台用户的权威来源。<strong>优先级数字越小越高</strong>，冲突时按策略处理。支持 LDAP 目录服务或 Starlark 脚本方式同步外部用户。
      </Alert>

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>优先级</TableCell>
              <TableCell>同步计划</TableCell>
              <TableCell>冲突策略</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right" sx={{ pr: 3 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无身份源" description="添加身份源以接入外部用户体系" />
                </TableCell>
              </TableRow>
            ) : items.map((item) => {
              const isLocal = item.type === 'LOCAL';
              const syncEnabled = !!item.sync_cron && !isLocal;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={SOURCE_TYPE_LABEL[item.type] ?? item.type}
                      size="small"
                      color={typeColor(item.type)}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="数字越小优先级越高">
                      <Chip
                        label={`P${item.priority}`}
                        size="small"
                        sx={{ fontSize: 12, height: 22, minWidth: 36, fontWeight: 600, bgcolor: 'action.hover' }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {syncEnabled ? (
                      <Chip
                        label={CRON_PRESETS.find(p => p.value === item.sync_cron)?.label ?? item.sync_cron}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22 }}
                      />
                    ) : (
                      <Chip label="未启用" size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{conflictLabel(item.conflict_strategy)}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    <Tooltip title="测试连接">
                      <span>
                        <IconButton size="small" onClick={() => testMutation.mutate(item.id)} disabled={isLocal}>
                          <NetworkCheck fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="立即同步">
                      <span>
                        <IconButton size="small" onClick={() => syncMutation.mutate(item.id)} disabled={!syncEnabled}>
                          <Sync fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={item.is_builtin ? '内置身份源不可删除' : '删除'}>
                      <span>
                        <IconButton
                          size="small" color="error" disabled={item.is_builtin}
                          onClick={() => { if (confirm(`确认删除身份源「${item.name}」？`)) deleteMutation.mutate(item.id); }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editItem ? '编辑身份源' : '添加身份源'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {/* 基础字段 */}
            <Grid size={8}>
              <TextField
                fullWidth label="名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：公司 LDAP"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth select label="类型"
                value={form.type}
                onChange={(e) => handleTypeChange(e.target.value as SourceType)}
              >
                {SOURCE_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={4}>
              <TextField
                fullWidth label="优先级"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                helperText="数字越小优先级越高"
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth select label="冲突策略"
                value={form.conflict_strategy}
                onChange={(e) => setForm({ ...form, conflict_strategy: e.target.value as ConflictStrategy })}
              >
                {CONFLICT_STRATEGIES.map(s => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Cron 同步计划 */}
            <Grid size={4}>
              <TextField
                fullWidth select label="同步频率"
                value={cronMode}
                onChange={(e) => handleCronPreset(e.target.value)}
              >
                <MenuItem value="">不同步</MenuItem>
                {CRON_PRESETS.map(p => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {cronMode === '__custom__' && (
              <Grid size={12}>
                <TextField
                  fullWidth label="自定义 Cron 表达式"
                  placeholder="0 */2 * * *"
                  value={form.sync_cron}
                  onChange={(e) => setForm({ ...form, sync_cron: e.target.value })}
                  helperText="标准五位 Cron 表达式，例：0 */2 * * * 表示每2小时"
                  slotProps={{ input: { sx: { fontFamily: 'monospace' } } }}
                />
              </Grid>
            )}

            {/* LDAP 专属字段 */}
            {form.type === 'LDAP' && (
              <>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    服务器连接
                  </Typography>
                </Grid>
                <Grid size={8}>
                  <TextField
                    fullWidth label="LDAP 服务器"
                    placeholder="ldaps://ldap.example.com"
                    value={form.ldap_server || ''}
                    onChange={(e) => setForm({ ...form, ldap_server: e.target.value })}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    fullWidth label="端口" type="number"
                    value={form.ldap_port ?? 636}
                    onChange={(e) => setForm({ ...form, ldap_port: Number(e.target.value) })}
                  />
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    管理员凭据（用于查询用户树）
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth label="Bind DN（管理员账号）"
                    placeholder="cn=admin,dc=example,dc=com"
                    value={form.bind_dn || ''}
                    onChange={(e) => setForm({ ...form, bind_dn: e.target.value })}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth label="Bind Password" type="password"
                    placeholder="管理员密码"
                    value={form.bind_password || ''}
                    onChange={(e) => setForm({ ...form, bind_password: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    用户查询范围
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth label="Base DN"
                    placeholder="ou=users,dc=example,dc=com"
                    value={form.base_dn || ''}
                    onChange={(e) => setForm({ ...form, base_dn: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth label="过滤条件"
                    placeholder="(objectClass=person)"
                    value={form.filter || ''}
                    onChange={(e) => setForm({ ...form, filter: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {/* STARLARK 专属字段 */}
            {form.type === 'STARLARK' && (
              <Grid size={12}>
                <TextField
                  fullWidth multiline rows={12}
                  label="Starlark 同步脚本"
                  placeholder={'def sync(ctx):\n  users = ctx.http.get(\'/users\')\n  return users'}
                  value={form.script || ''}
                  onChange={(e) => setForm({ ...form, script: e.target.value })}
                  slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
                />
              </Grid>
            )}

            {/* OAUTH2 专属字段 */}
            {form.type === 'OAUTH2' && (
              <>
                <Grid size={12}>
                  <TextField
                    fullWidth label="OAuth2 授权端点"
                    placeholder="https://oauth.example.com/authorize"
                    value={form.oauth_endpoint || ''}
                    onChange={(e) => setForm({ ...form, oauth_endpoint: e.target.value })}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth label="Client ID"
                    value={form.client_id || ''}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth label="Client Secret" type="password"
                    value={form.client_secret || ''}
                    onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth label="Scope（权限范围）"
                    placeholder="openid profile email"
                    value={form.scope || ''}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    helperText="多个 scope 用空格分隔，常用：openid profile email"
                  />
                </Grid>
              </>
            )}

            {/* LOCAL 说明 */}
            {form.type === 'LOCAL' && (
              <Grid size={12}>
                <Alert severity="info">
                  本地身份源直接使用平台内置用户库，无需额外配置。
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
