import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Typography, LinearProgress,
} from '@mui/material';
import { Edit, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { quotasApi } from '../../api/client';

export default function QuotasPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ quota_limit: '', quota_type: '' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['quotas', params],
    queryFn: () => quotasApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const updateMutation = useMutation({
    mutationFn: ({ userId, data: d }: any) => quotasApi.update(userId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotas'] }); setDialogOpen(false); },
  });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ userId: editItem.user_id || editItem.id, data: { ...form, quota_limit: Number(form.quota_limit) } });
    }
  };

  const getUsagePct = (used?: number, limit?: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min(((used || 0) / limit) * 100, 100);
  };

  const getUsageColor = (pct: number): 'success' | 'warning' | 'error' => {
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <PageHeader
        title="磁盘配额"
        subtitle="管理用户资源配额和使用限制"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Quota</TableCell>
              <TableCell align="right">Used</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无quotas" description="暂无quota records found" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => {
              const pct = getUsagePct(item.used, item.quota_limit);
              const status = pct >= 100 ? 'error' : pct >= 90 ? 'degraded' : 'active';
              return (
                <TableRow key={item.id || idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.user_name || item.username || item.user_id || '-'}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.quota_type || item.name || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Limit: {item.quota_limit ? item.quota_limit.toLocaleString() : 'Unlimited'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                    {(item.used ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color={getUsageColor(pct)}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 40, textAlign: 'right', fontWeight: 600 }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell><StatusBadge status={status} label={status === 'active' ? 'OK' : status === 'degraded' ? 'Warning' : 'Exceeded'} /></TableCell>
                  <TableCell>
                    <Tooltip title="Edit Quota">
                      <IconButton size="small" onClick={() => {
                        setEditItem(item);
                        setForm({ quota_limit: item.quota_limit || '', quota_type: item.quota_type || item.name || '' });
                        setDialogOpen(true);
                      }}>
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
        title="Edit Quota"
        onSave={handleSave}
        saving={updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="Quota Type" value={form.quota_type} disabled />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="Quota Limit" type="number" value={form.quota_limit}
              onChange={e => setForm({ ...form, quota_limit: e.target.value })}
              helperText="Set to 0 for unlimited"
            />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
