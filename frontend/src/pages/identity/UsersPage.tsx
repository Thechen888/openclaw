import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Avatar, Typography, Chip,
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { usersApi, orgsApi } from '../../api/client';

// =================== 常量 ===================
const ROLE_LABELS: Record<string, string> = {
  admin:   '管理员',
  manager: '经理',
  member:  '成员',
  viewer:  '观察员',
};
const ROLES = Object.entries(ROLE_LABELS);

const ROLE_COLORS: Record<string, 'error' | 'warning' | 'primary' | 'default'> = {
  admin:   'error',
  manager: 'warning',
  member:  'primary',
  viewer:  'default',
};

const EMPTY_FORM = {
  username: '', name: '', email: '', role: 'member', org_id: '', status: 'active', password: '',
};

/** 提取可提交字段，编辑时剔除服务端字段 */
function extractUserFields(item: any) {
  const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = item;
  return { ...payload, password: '' };
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.slice(0, 2);
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });

  // 用户列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params),
  });
  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  // 所有组织（用于下拉选择，全量加载）
  const { data: orgsData } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => orgsApi.list(),
  });
  const allOrgs: any[] = orgsData?.data?.data || orgsData?.data || [];

  const orgMap = Object.fromEntries(allOrgs.map((o: any) => [o.id, o.name]));

  const createMutation = useMutation({
    mutationFn: (d: any) => usersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('用户已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => usersApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditItem(null); };

  const handleSave = () => {
    const payload = { ...form };
    if (editItem && !payload.password) delete payload.password;
    if (!payload.org_id) delete payload.org_id;
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Box>
      <PageHeader
        title="用户"
        subtitle="管理平台用户账号与角色"
        actions={
          <>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => { resetForm(); setDialogOpen(true); }}
            >
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
              <TableCell sx={{ fontWeight: 700 }}>账号</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>姓名</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>邮箱</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>角色</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>所属组织</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
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
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.email || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={ROLE_LABELS[item.role] || item.role}
                    size="small"
                    color={ROLE_COLORS[item.role] || 'default'}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                </TableCell>
                <TableCell>
                  {item.org_id ? (
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {orgMap[item.org_id] || item.org_id}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>—</Typography>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditItem(item);
                        setForm(extractUserFields(item));
                        setDialogOpen(true);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm(`确认删除用户「${item.name || item.username}」?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
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
        onClose={() => { setDialogOpen(false); resetForm(); }}
        title={editItem ? `编辑用户 — ${editItem.name || editItem.username}` : '添加用户'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={6}>
            <TextField
              fullWidth label="账号名" required
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              disabled={!!editItem}
              helperText={editItem ? '账号名不可修改' : ''}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="姓名"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="邮箱" type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              label={editItem ? '密码（留空则不修改）' : '密码'}
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required={!editItem}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="角色"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="状态"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth select label="所属组织（可选）"
              value={form.org_id || ''}
              onChange={e => setForm({ ...form, org_id: e.target.value || '' })}
            >
              <MenuItem value="">— 暂不归属 —</MenuItem>
              {allOrgs.map((o: any) => (
                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
