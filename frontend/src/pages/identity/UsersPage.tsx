import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Avatar, Typography,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Person } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { usersApi } from '../../api/client';

const ROLES = ['admin', 'manager', 'member', 'viewer'];

export default function UsersPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    username: '', name: '', email: '', role: 'member', status: 'active', password: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => usersApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const resetForm = () => setForm({ username: '', name: '', email: '', role: 'member', status: 'active', password: '' });

  const handleSave = () => {
    const payload = { ...form };
    if (editItem && !payload.password) delete payload.password;
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleColors: Record<string, string> = {
    admin: 'error', manager: 'warning', member: 'primary', viewer: 'default',
  };

  return (
    <Box>
      <PageHeader
        title="用户"
        subtitle="管理平台用户账号与角色"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加用户
            </Button>
          </>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>User名称</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无用户" description="创建第一个用户账号" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                      {getInitials(item.name || item.username)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.username}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{item.name || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.email || '-'}</TableCell>
                <TableCell>
                  <Box component="span" sx={{
                    display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                    bgcolor: `${roleColors[item.role] || 'default'}.light`,
                    color: `${roleColors[item.role] || 'default'}.contrastText`,
                    textTransform: 'capitalize',
                  }}>
                    {item.role}
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => { setEditItem(item); setForm({ ...item, password: '' }); setDialogOpen(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此用户?')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? 'Edit User' : '添加用户'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={6}>
            <TextField fullWidth label="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editItem} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="邮箱" type="邮箱" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label={editItem ? '密码（留空则不修改）' : 'Password'}
              type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required={!editItem}
            />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="角色" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
