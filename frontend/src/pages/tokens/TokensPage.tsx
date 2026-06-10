import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography, LinearProgress,
} from '@mui/material';
import { Add, Edit, Refresh, Key, Visibility, VisibilityOff } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { tokensApi } from '../../api/client';

const CRED_TYPES = ['api_key', 'oauth2', 'bearer', 'basic', 'jwt'];

export default function TokensPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<any>({
    name: '', owner: '', target_system: '', credential_type: 'api_key', status: 'active', quota_limit: '', expires_at: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tokens', params],
    queryFn: () => tokensApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => tokensApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tokens'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => tokensApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tokens'] }); setDialogOpen(false); resetForm(); },
  });

  const resetForm = () => setForm({ name: '', owner: '', target_system: '', credential_type: 'api_key', status: 'active', quota_limit: '', expires_at: '' });

  const handleSave = () => {
    const payload = { ...form, quota_limit: form.quota_limit ? Number(form.quota_limit) : null };
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

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Target System</TableCell>
              <TableCell>Credential Type</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>Quota Used / Limit</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState title="暂无tokens" description="Create a token to connect to external services" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => {
              const quotaPct = getQuotaPct(item.quota_used, item.quota_limit);
              const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
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
                    <Chip label={item.credential_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                  </TableCell>
                  <TableCell><StatusBadge status={isExpired ? 'error' : item.status} label={isExpired ? 'expired' : undefined} /></TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {(item.quota_used ?? 0).toLocaleString()} / {item.quota_limit ? item.quota_limit.toLocaleString() : 'Unlimited'}
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
                    {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => { setEditItem(item); setForm(item); setDialogOpen(true); }}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editItem ? 'Edit Token' : '添加令牌'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Target System" value={form.target_system} onChange={e => setForm({ ...form, target_system: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Credential Type" value={form.credential_type} onChange={e => setForm({ ...form, credential_type: e.target.value })}>
              {CRED_TYPES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
              <MenuItem value="revoked">Revoked</MenuItem>
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Quota Limit" type="number" value={form.quota_limit} onChange={e => setForm({ ...form, quota_limit: e.target.value })} helperText="Leave blank for unlimited" />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Expires At" type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
