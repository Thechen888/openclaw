import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, Typography, LinearProgress,
  InputAdornment,
} from '@mui/material';
import { Edit, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { quotasApi } from '../../api/client';

export default function QuotasPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotas'] });
      setDialogOpen(false);
      enqueueSnackbar('配额已更新', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({
        userId: editItem.user_id || editItem.id,
        data: { quota_limit: Number(form.quota_limit), quota_type: form.quota_type },
      });
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

  const formatG = (val?: number) =>
    val === undefined || val === null ? '-' : `${Number(val).toFixed(1)} G`;

  return (
    <Box>
      <PageHeader
        title="磁盘配额"
        subtitle="管理用户磁盘空间配额与使用情况"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>用户</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>配额类型</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">已用 (G)</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">上限 (G)</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>使用情况</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无配额记录" description="尚未为任何用户设置磁盘配额" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => {
              const pct = getUsagePct(item.used, item.quota_limit);
              const status = pct >= 100 ? 'error' : pct >= 90 ? 'degraded' : 'active';
              const statusLabel = status === 'error' ? '已超限' : status === 'degraded' ? '预警' : '正常';
              return (
                <TableRow key={item.id || idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {item.user_name || item.username || item.user_id || '-'}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {item.quota_type || item.name || '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500 }}>
                    {formatG(item.used)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {item.quota_limit ? formatG(item.quota_limit) : '不限'}
                  </TableCell>
                  <TableCell sx={{ minWidth: 180 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color={getUsageColor(pct)}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 42, textAlign: 'right', fontWeight: 600 }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} label={statusLabel} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="编辑配额">
                      <IconButton size="small" onClick={() => {
                        setEditItem(item);
                        setForm({ quota_limit: item.quota_limit ?? '', quota_type: item.quota_type || item.name || '' });
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
        title={`编辑配额 — ${editItem?.user_name || editItem?.username || ''}`}
        onSave={handleSave}
        saving={updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField fullWidth label="配额类型" value={form.quota_type} disabled />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label="配额上限"
              type="number"
              value={form.quota_limit}
              onChange={e => setForm({ ...form, quota_limit: e.target.value })}
              helperText="填 0 表示不限"
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">G</InputAdornment>,
                },
              }}
            />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
