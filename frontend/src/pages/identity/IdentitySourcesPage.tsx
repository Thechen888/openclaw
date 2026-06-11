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
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import api from '../../api/client';

type SourceType = 'LDAP' | 'STARLARK' | 'LOCAL' | 'OAUTH2';
type ConflictStrategy = 'primary' | 'admin' | 'merge';

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'LDAP', label: 'LDAP' },
  { value: 'STARLARK', label: 'STARLARK' },
  { value: 'LOCAL', label: 'LOCAL' },
  { value: 'OAUTH2', label: 'OAUTH2' },
];

const CONFLICT_STRATEGIES: { value: ConflictStrategy; label: string }[] = [
  { value: 'primary', label: '主源优先' },
  { value: 'admin', label: '管理员确认' },
  { value: 'merge', label: '合并' },
];

const conflictLabel = (v: string) =>
  CONFLICT_STRATEGIES.find(s => s.value === v)?.label || v;

const typeColor = (t: string): 'primary' | 'secondary' | 'default' | 'warning' => {
  switch (t) {
    case 'LDAP': return 'primary';
    case 'STARLARK': return 'secondary';
    case 'OAUTH2': return 'warning';
    default: return 'default';
  }
};

interface IdentitySource {
  id: string;
  name: string;
  type: SourceType;
  priority: number;
  sync_cron: string;          // 空字符串表示关闭
  conflict_strategy: ConflictStrategy;
  status: string;
  is_builtin?: boolean;
  // LDAP
  ldap_server?: string;
  ldap_port?: number;
  base_dn?: string;
  filter?: string;
  // STARLARK
  script?: string;
  // OAUTH2
  oauth_endpoint?: string;
  client_id?: string;
  client_secret?: string;
}

const emptyForm: IdentitySource = {
  id: '', name: '', type: 'LDAP', priority: 0,
  sync_cron: '', conflict_strategy: 'primary', status: 'active',
  ldap_server: '', ldap_port: 636, base_dn: '', filter: '',
  script: '', oauth_endpoint: '', client_id: '', client_secret: '',
};

export default function IdentitySourcesPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<IdentitySource | null>(null);
  const [form, setForm] = useState<IdentitySource>({ ...emptyForm });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['identity-sources', params],
    queryFn: () => api.get('/identity/sources', { params }),
  });
  const items: IdentitySource[] = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/identity/sources', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['identity-sources'] }); setDialogOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => api.put(`/identity/sources/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['identity-sources'] }); setDialogOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/identity/sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['identity-sources'] }),
  });
  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/identity/sources/${id}/test-connection`),
    onSuccess: () => alert('连接测试成功'),
    onError: () => alert('连接测试失败'),
  });
  const syncMutation = useMutation({
    mutationFn: (id: string) => api.post(`/identity/sources/${id}/sync`),
    onSuccess: () => alert('已触发立即同步'),
  });

  const handleOpenCreate = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: IdentitySource) => {
    setEditItem(item);
    setForm({ ...emptyForm, ...item });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('请填写名称');
      return;
    }
    const payload = { ...form };
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
        身份源决定平台用户的权威来源。优先级数字越小越高，冲突时按策略处理。支持 LDAP 或 Starlark 脚本方式同步外部用户。
      </Alert>

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>优先级</TableCell>
              <TableCell>启用同步</TableCell>
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
                      label={item.type}
                      size="small"
                      color={typeColor(item.type)}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.priority}
                      size="small"
                      sx={{
                        fontSize: 12, height: 22, minWidth: 32, fontWeight: 600,
                        bgcolor: 'action.hover',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {syncEnabled ? (
                      <Chip
                        label={item.sync_cron}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: 11, height: 22 }}
                      />
                    ) : (
                      <Chip
                        label="关闭"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{conflictLabel(item.conflict_strategy)}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell align="right" sx={{ pr: 3 }}>
                    <Tooltip title="测试连接">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => testMutation.mutate(item.id)}
                          disabled={isLocal}
                        >
                          <NetworkCheck fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="立即同步">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => syncMutation.mutate(item.id)}
                          disabled={!syncEnabled}
                        >
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
                          size="small"
                          color="error"
                          disabled={item.is_builtin}
                          onClick={() => {
                            if (confirm(`确认删除身份源「${item.name}」？`)) deleteMutation.mutate(item.id);
                          }}
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
            <Grid size={8}>
              <TextField
                fullWidth label="名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth select label="类型"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })}
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
            <Grid size={4}>
              <TextField
                fullWidth label="同步计划"
                placeholder="0 */2 * * *"
                value={form.sync_cron}
                onChange={(e) => setForm({ ...form, sync_cron: e.target.value })}
                helperText="Cron表达式"
              />
            </Grid>

            {form.type === 'LDAP' && (
              <>
                <Grid size={8}>
                  <TextField
                    fullWidth label="LDAP服务器"
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

            {form.type === 'STARLARK' && (
              <Grid size={12}>
                <TextField
                  fullWidth multiline rows={6}
                  label="Starlark 同步脚本"
                  placeholder="def sync(ctx):\n  return ctx.http.get('/users')"
                  value={form.script || ''}
                  onChange={(e) => setForm({ ...form, script: e.target.value })}
                  slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
                />
              </Grid>
            )}

            {form.type === 'OAUTH2' && (
              <>
                <Grid size={12}>
                  <TextField
                    fullWidth label="OAuth2 端点"
                    placeholder="https://oauth.example.com"
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
              </>
            )}

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
