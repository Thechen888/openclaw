import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Extension } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { skillsApi } from '../../api/client';

const SKILL_TYPES = ['tool', 'knowledge', 'workflow', 'prompt', 'integration'];
const CATEGORIES = ['general', 'data', 'communication', 'automation', 'analytics', 'security'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const riskColors: Record<string, string> = {
  low: 'success', medium: 'warning', high: 'error', critical: 'error',
};

export default function SkillsPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', type: 'tool', category: 'general', risk_level: 'low', status: 'active', owner: '', description: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills', params],
    queryFn: () => skillsApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => skillsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); setDialogOpen(false); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => skillsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills'] }); setDialogOpen(false); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  });

  const resetForm = () => setForm({ name: '', type: 'tool', category: 'general', risk_level: 'low', status: 'active', owner: '', description: '' });

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
        title="技能"
        subtitle="管理智能体技能、工具和知识库"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setEditItem(null); setDialogOpen(true); }}>
              添加技能
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
              <TableCell>Category</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无skills" description="Create a skill or browse the marketplace" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Extension sx={{ fontSize: 18, color: 'secondary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={item.type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12, textTransform: 'capitalize' }}>{item.category || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={item.risk_level || 'low'}
                    size="small"
                    color={(riskColors[item.risk_level] || 'default') as any}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.owner || item.owner_name || '-'}</TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => { setEditItem(item); setForm(item); setDialogOpen(true); }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('Delete this skill?')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? 'Edit Skill' : '添加技能'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField fullWidth label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {SKILL_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Risk Level" value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })}>
              {RISK_LEVELS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField fullWidth select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} helperText="User or org ID that owns this skill" />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
