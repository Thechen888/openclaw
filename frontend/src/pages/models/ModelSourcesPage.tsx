import { useState } from 'react';
import { Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Tooltip, Chip, Grid } from '@mui/material';
import { Add, Edit, Delete, Refresh, Visibility, PlayArrow } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, FilterBar, DataTable, StatusBadge, useTableState, EmptyState, LoadingState, CrudDialog } from '../../components/shared';
import { modelSourcesApi, modelPoliciesApi } from '../../api/client';

// =================== Model Sources Page ===================
export default function ModelSourcesPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ provider: '', model_name: '', display_name: '', api_endpoint: '', auth_type: 'api_key', status: 'active' });

  const { data, isLoading } = useQuery({
    queryKey: ['model-sources', params],
    queryFn: () => modelSourcesApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (data: any) => modelSourcesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-sources'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => modelSourcesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-sources'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => modelSourcesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['model-sources'] }),
  });

  const resetForm = () => setForm({ provider: '', model_name: '', display_name: '', api_endpoint: '', auth_type: 'api_key', status: 'active' });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Box>
      <PageHeader title="模型源" subtitle="管理AI模型API连接"
        actions={<Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>添加模型源</Button>} />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>供应商</TableCell>
              <TableCell>模型名称</TableCell>
              <TableCell>显示名称</TableCell>
              <TableCell>端点</TableCell>
              <TableCell>能力</TableCell>
              <TableCell>健康</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState title="暂无模型源" description="添加第一个模型源以开始使用" /></TableCell></TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 500 }}>{item.provider}</TableCell>
                <TableCell><code style={{ fontSize: 12 }}>{item.model_name}</code></TableCell>
                <TableCell>{item.display_name}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>{item.api_endpoint}</TableCell>
                <TableCell>
                  {(item.capabilities ? JSON.parse(item.capabilities || '[]') : []).map((c: string) => (
                    <Chip key={c} label={c} size="small" sx={{ mr: 0.5, fontSize: 10, height: 18 }} />
                  ))}
                </TableCell>
                <TableCell><StatusBadge status={item.health_status} /></TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditItem(item); setForm(item); setDialogOpen(true); }}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="测试"><IconButton size="small" color="primary"><PlayArrow fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate(item.id); }}><Delete fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      <CrudDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editItem ? '编辑模型源' : '添加模型源'} onSave={handleSave} saving={createMutation.isPending || updateMutation.isPending}>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={6}><TextField fullWidth label="供应商" value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} /></Grid>
          <Grid size={6}><TextField fullWidth label="模型名称" value={form.model_name} onChange={e => setForm({...form, model_name: e.target.value})} /></Grid>
          <Grid size={12}><TextField fullWidth label="显示名称" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} /></Grid>
          <Grid size={12}><TextField fullWidth label="API端点" value={form.api_endpoint} onChange={e => setForm({...form, api_endpoint: e.target.value})} /></Grid>
          <Grid size={6}>
            <TextField fullWidth label="认证类型" select value={form.auth_type} onChange={e => setForm({...form, auth_type: e.target.value})}>
              <option value="api_key">API Key</option>
              <option value="bearer">Bearer</option>
              <option value="oauth2">OAuth2</option>
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="状态" select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </TextField>
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
