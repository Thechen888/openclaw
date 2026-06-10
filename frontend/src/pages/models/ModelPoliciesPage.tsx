import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Chip, Grid, MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { modelPoliciesApi, modelSourcesApi } from '../../api/client';

const ROTATION_METHODS = ['round_robin', 'least_cost', 'least_latency', 'priority', 'random'];
const TASK_TYPES = ['chat', 'completion', 'embedding', 'image', 'audio', 'moderation'];

export default function ModelPoliciesPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', task_type: 'chat', rotation_method: 'round_robin', status: 'active', upstream_ids: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['model-policies', params],
    queryFn: () => modelPoliciesApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const { data: sourcesData } = useQuery({
    queryKey: ['model-sources-all'],
    queryFn: () => modelSourcesApi.list({ page_size: 200 }),
  });
  const sources = sourcesData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: any) => modelPoliciesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-policies'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => modelPoliciesApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-policies'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => modelPoliciesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-policies'] }),
  });

  const resetForm = () => setForm({ name: '', task_type: 'chat', rotation_method: 'round_robin', status: 'active', upstream_ids: '' });

  const handleSave = () => {
    const payload = { ...form, upstream_ids: form.upstream_ids ? form.upstream_ids.split(',').map((s: string) => s.trim()) : [] };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box>
      <PageHeader
        title="模型策略"
        subtitle="配置模型路由、轮换和回退策略"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加策略
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
              <TableCell>任务类型</TableCell>
              <TableCell>轮换方式</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>上游源</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无模型策略" description="创建策略以定义模型路由规则" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Chip label={item.task_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell>
                  <Chip label={item.rotation_method} size="small" color="info" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Chip
                    label={`${item.upstream_ids?.length || item.upstreams_count || 0} 个源`}
                    size="small"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => {
                      setEditItem(item);
                      setForm({ ...item, upstream_ids: (item.upstream_ids || []).join(', ') });
                      setDialogOpen(true);
                    }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此策略？')) deleteMutation.mutate(item.id); }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editItem ? '编辑模型策略' : '添加模型策略'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="策略名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="任务类型" value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}>
              {TASK_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="轮换方式" value={form.rotation_method} onChange={e => setForm({ ...form, rotation_method: e.target.value })}>
              {ROTATION_METHODS.map(m => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="上游源ID（逗号分隔）"
              value={form.upstream_ids}
              onChange={e => setForm({ ...form, upstream_ids: e.target.value })}
              helperText="输入模型源ID，用逗号分隔，按优先级排序"
            />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
