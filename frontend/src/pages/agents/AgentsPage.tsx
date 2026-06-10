import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Tabs, Tab, Chip, Typography,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, PlayArrow, SmartToy } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { agentsApi, modelPoliciesApi } from '../../api/client';

const OWNER_TABS = [
  { label: '全部', value: '' },
  { label: '个人', value: 'personal' },
  { label: '组织', value: 'organization' },
];

export default function AgentsPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [ownerTab, setOwnerTab] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', owner_type: 'personal', status: 'active', model_policy_id: '', description: '', system_prompt: '',
  });

  const queryParams = { ...params, owner_type: ownerTab || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents', queryParams],
    queryFn: () => agentsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const { data: policiesData } = useQuery({
    queryKey: ['model-policies-all'],
    queryFn: () => modelPoliciesApi.list({ page_size: 200 }),
  });
  const policies = policiesData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d: any) => agentsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => agentsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });

  const resetForm = () => setForm({ name: '', owner_type: 'personal', status: 'active', model_policy_id: '', description: '', system_prompt: '' });

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const formatTime = (t?: string) => t ? new Date(t).toLocaleString() : '从未';

  return (
    <Box>
      <PageHeader
        title="智能体"
        subtitle="配置AI智能体的模型策略与触发器"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加智能体
            </Button>
          </>
        }
      />

      <Tabs value={ownerTab} onChange={(_, v) => { setOwnerTab(v); setPage(1); }} sx={{ mb: 2 }}>
        {OWNER_TABS.map(tab => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>归属类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>模型策略</TableCell>
              <TableCell>触发器</TableCell>
              <TableCell>上次运行</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无智能体" description="创建智能体以自动化任务" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToy sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.owner_type}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>
                  {item.policy_name || item.model_policy_id ? (
                    <Chip label={item.policy_name || item.model_policy_id} size="small" sx={{ fontSize: 11, height: 22 }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">无</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${item.triggers_count ?? item.triggers?.length ?? 0}`}
                    size="small"
                    sx={{ fontSize: 11, height: 22, minWidth: 28 }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{formatTime(item.last_run_at)}</TableCell>
                <TableCell>
                  <Tooltip title="立即运行">
                    <IconButton size="small" color="primary"><PlayArrow fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="编辑">
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此智能体？')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? '编辑智能体' : '添加智能体'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="归属类型" value={form.owner_type} onChange={e => setForm({ ...form, owner_type: e.target.value })}>
              <MenuItem value="personal">个人</MenuItem>
              <MenuItem value="organization">组织</MenuItem>
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth select label="模型策略" value={form.model_policy_id} onChange={e => setForm({ ...form, model_policy_id: e.target.value })}>
              <MenuItem value="">无</MenuItem>
              {policies.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="系统提示词" multiline rows={3} value={form.system_prompt} onChange={e => setForm({ ...form, system_prompt: e.target.value })} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline rows={2} label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
