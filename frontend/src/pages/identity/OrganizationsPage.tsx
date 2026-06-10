import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, People } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { orgsApi } from '../../api/client';

const ORG_TYPES = ['company', 'department', 'team', 'project'];

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', type: 'company', status: 'active', description: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orgs', params],
    queryFn: () => orgsApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => orgsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgs'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => orgsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orgs'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => orgsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgs'] }),
  });

  const resetForm = () => setForm({ name: '', type: 'company', status: 'active', description: '' });

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
        title="组织"
        subtitle="管理组织单元、团队和部门"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加组织
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
              <TableCell>Type</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="暂无organizations" description="Create the first organization" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Chip label={item.type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Tooltip title="View members">
                      <Box component="span" sx={{ fontWeight: 500, cursor: 'pointer' }}>
                        {item.members_count ?? item.member_count ?? 0}
                      </Box>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => { setEditItem(item); setForm(item); setDialogOpen(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('Delete this organization?')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? 'Edit Organization' : '添加组织'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {ORG_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
