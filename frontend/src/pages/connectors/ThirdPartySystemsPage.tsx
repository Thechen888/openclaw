import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, OpenInNew } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { connectorsApi } from '../../api/client';

const SYSTEM_TYPES = ['crm', 'erp', 'helpdesk', 'project_management', 'hr', 'finance', 'custom'];
const PROVIDERS = ['salesforce', 'hubspot', 'jira', 'zendesk', 'sap', 'custom'];

export default function ThirdPartySystemsPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', system_type: 'crm', provider: '', api_base_url: '', status: 'active', description: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['connectors', params],
    queryFn: () => connectorsApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => connectorsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['connectors'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => connectorsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['connectors'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectorsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connectors'] }),
  });

  const resetForm = () => setForm({ name: '', system_type: 'crm', provider: '', api_base_url: '', status: 'active', description: '' });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Box>
      <PageHeader
        title="第三方系统"
        subtitle="管理外部系统集成与连接器"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加系统
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
              <TableCell>系统类型</TableCell>
              <TableCell>服务商</TableCell>
              <TableCell>API地址</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无连接器" description="添加第三方系统以开始使用" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Tooltip title={item.system_type}>
                    <Box component="span" sx={{
                      display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                      bgcolor: 'secondary.light', color: 'secondary.contrastText', textTransform: 'uppercase',
                    }}>
                      {item.system_type}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.provider || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, fontFamily: 'monospace' }}>
                  {item.api_base_url || '-'}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  {item.api_base_url && (
                    <Tooltip title="打开API">
                      <IconButton size="small" href={item.api_base_url} target="_blank"><OpenInNew fontSize="small" /></IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="编辑">
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此连接器？')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? '编辑第三方系统' : '添加第三方系统'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="系统类型" value={form.system_type} onChange={e => setForm({ ...form, system_type: e.target.value })}>
              {SYSTEM_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="服务商" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
              <MenuItem value="">请选择...</MenuItem>
              {PROVIDERS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="API地址" value={form.api_base_url} onChange={e => setForm({ ...form, api_base_url: e.target.value })} placeholder="https://api.example.com/v1" />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline rows={2} label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
