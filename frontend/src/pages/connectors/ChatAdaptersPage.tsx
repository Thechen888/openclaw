import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Sync } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { chatAdaptersApi } from '../../api/client';

const CHAT_TYPES = ['wechat_work', 'dingtalk', 'feishu', 'slack', 'teams', 'telegram', 'whatsapp'];

export default function ChatAdaptersPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', chat_type: 'wechat_work', status: 'active', webhook_url: '', corp_id: '', agent_id: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chat-adapters', params],
    queryFn: () => chatAdaptersApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => chatAdaptersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chat-adapters'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => chatAdaptersApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chat-adapters'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatAdaptersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-adapters'] }),
  });

  const resetForm = () => setForm({ name: '', chat_type: 'wechat_work', status: 'active', webhook_url: '', corp_id: '', agent_id: '' });

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
        title="聊天适配器"
        subtitle="管理聊天平台连接（企业微信、钉钉、飞书等）"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加适配器
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
              <TableCell>聊天类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>上次同步</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="暂无聊天适配器" description="连接你的第一个聊天平台" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Tooltip title={item.chat_type}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                        bgcolor: 'info.light', color: 'info.contrastText', textTransform: 'uppercase',
                      }}
                    >
                      {item.chat_type?.replace(/_/g, ' ')}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{formatTime(item.last_sync_at)}</TableCell>
                <TableCell>
                  <Tooltip title="立即同步">
                    <IconButton size="small" color="primary"><Sync fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => { setEditItem(item); setForm(item); setDialogOpen(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此适配器？')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? '编辑聊天适配器' : '添加聊天适配器'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="聊天类型" value={form.chat_type} onChange={e => setForm({ ...form, chat_type: e.target.value })}>
              {CHAT_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Webhook URL" value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="企业ID" value={form.corp_id} onChange={e => setForm({ ...form, corp_id: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="应用ID" value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
