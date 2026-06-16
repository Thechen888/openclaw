import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
} from '@mui/material';
import {
  Add, Edit, Refresh, Key, Visibility, VisibilityOff, ContentCopy, Delete, Close,
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
  const queryParams = { ...params, status: statusFilter || undefined };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [newTokenValue, setNewTokenValue] = useState<string>('');
  const [form, setForm] = useState<any>({
    name: '', owner: '', target_system: '', credential_type: 'api_key', status: 'active', quota_limit: '', expires_at: '',
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
    setForm({
      name: item.name || '',
      owner: item.owner || '',
      target_system: item.target_system || '',
      credential_type: item.credential_type || 'api_key',
      status: item.status || 'active',
      quota_limit: item.quota_limit ?? '',
      expires_at: item.expires_at || '',
    });
    setDialogOpen(true);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar('已复制到剪贴板', { variant: 'success' });
    });
  };

  return (
    <Box>
      <PageHeader
        title="API令牌"
        subtitle="管理API密钥、OAuth令牌和凭证"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加令牌
            </Button>
          </>
        }
      />

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

      {/* 创建/编辑弹窗 */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editItem ? '编辑令牌' : '添加令牌'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
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
            <TextField fullWidth select label="凭证类型" value={form.credential_type} onChange={e => setForm({ ...form, credential_type: e.target.value })}>
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
    </Box>
  );
}
