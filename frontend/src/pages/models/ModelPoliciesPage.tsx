import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Chip, Grid, MenuItem, Switch, FormControlLabel,
  FormControl, InputLabel, Select, OutlinedInput, Checkbox, ListItemText, Typography,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Star } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { modelPoliciesApi, modelSourcesApi } from '../../api/client';

// 一期只保留两种路由方式
const ROTATION_OPTIONS = [
  { value: 'priority', label: '优先级 (主备切换)', desc: '按顺序优先使用第 1 个，失败自动切到下一个' },
  { value: 'round_robin', label: '轮询 (负载均衡)', desc: '多个模型源均匀分配请求' },
];

const DEFAULT_FORM = {
  name: '',
  rotation_method: 'priority',
  status: 'active',
  is_default: false,
  upstream_ids: [] as string[],
  timeout_seconds: 30,
  retry_count: 1,
};

export default function ModelPoliciesPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...DEFAULT_FORM });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['model-policies', params],
    queryFn: () => modelPoliciesApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  // 拉取所有模型源用于多选下拉
  const { data: sourcesData } = useQuery({
    queryKey: ['model-sources-all'],
    queryFn: () => modelSourcesApi.list({ page_size: 200 }),
  });
  const sources: any[] = sourcesData?.data?.data || [];

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

  const resetForm = () => setForm({ ...DEFAULT_FORM });

  const handleSave = () => {
    if (!form.name.trim()) { enqueueSnackbar('请输入策略名称', { variant: 'warning' }); return; }
    if (form.upstream_ids.length === 0) { enqueueSnackbar('请至少选择一个上游模型源', { variant: 'warning' }); return; }
    const payload = { ...form };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // 根据模型源 ID 获取显示名
  const getSourceName = (id: string) => {
    const s = sources.find((x: any) => x.id === id);
    return s ? s.display_name || s.model_name : id;
  };

  return (
    <Box>
      <PageHeader
        title="模型策略"
        subtitle="配置模型路由与故障回退规则"
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
              <TableCell>路由方式</TableCell>
              <TableCell>上游模型</TableCell>
              <TableCell>失败处理</TableCell>
              <TableCell>状态</TableCell>
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
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {item.is_default && <Star sx={{ fontSize: 16, color: '#f59e0b' }} />}
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{item.name}</Typography>
                    {item.is_default && <Chip label="默认" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#f59e0b22', color: '#f59e0b' }} />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.rotation_method === 'priority' ? '优先级' : '轮询'}
                    size="small" color="info" variant="outlined"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(item.upstream_ids || []).slice(0, 2).map((id: string) => (
                      <Chip key={id} label={getSourceName(id)} size="small" sx={{ fontSize: 10, height: 20 }} />
                    ))}
                    {(item.upstream_ids || []).length > 2 && (
                      <Chip label={`+${(item.upstream_ids || []).length - 2}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    超时 {item.timeout_seconds || 30}s · 重试 {item.retry_count ?? 1} 次
                  </Typography>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => {
                      setEditItem(item);
                      setForm({
                        name: item.name,
                        rotation_method: item.rotation_method || 'priority',
                        status: item.status,
                        is_default: item.is_default || false,
                        upstream_ids: item.upstream_ids || [],
                        timeout_seconds: item.timeout_seconds || 30,
                        retry_count: item.retry_count ?? 1,
                      });
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
          {/* 策略名称 */}
          <Grid size={12}>
            <TextField fullWidth label="策略名称" placeholder="如：通用对话策略、视觉理解策略" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Grid>

          {/* 路由方式 */}
          <Grid size={6}>
            <TextField fullWidth select label="路由方式" value={form.rotation_method} onChange={e => setForm({ ...form, rotation_method: e.target.value })}>
              {ROTATION_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box>
                    <Typography sx={{ fontSize: 13 }}>{opt.label}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{opt.desc}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 状态 */}
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>

          {/* 上游模型源多选 */}
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>上游模型源</InputLabel>
              <Select
                multiple
                value={form.upstream_ids}
                onChange={(e) => setForm({ ...form, upstream_ids: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                input={<OutlinedInput label="上游模型源" />}
                renderValue={(selected: string[]) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => (
                      <Chip key={id} label={getSourceName(id)} size="small" sx={{ height: 22, fontSize: 11 }} />
                    ))}
                  </Box>
                )}
              >
                {sources.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Checkbox checked={form.upstream_ids.includes(s.id)} size="small" />
                    <ListItemText
                      primary={`${s.provider} · ${s.display_name || s.model_name}`}
                      secondary={(() => { try { return JSON.parse(s.capabilities || '[]').join(' / '); } catch { return ''; } })()}
                      slotProps={{ secondary: { sx: { fontSize: 11 } } }}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, ml: 1 }}>
              {form.rotation_method === 'priority' ? '选择顺序即为优先级顺序，第 1 个为主用模型' : '所选模型将均匀分配请求'}
            </Typography>
          </Grid>

          {/* 失败处理 */}
          <Grid size={6}>
            <TextField
              fullWidth
              label="单源超时（秒）"
              type="number"
              value={form.timeout_seconds}
              onChange={e => setForm({ ...form, timeout_seconds: parseInt(e.target.value) || 30 })}
              helperText="单个模型源请求超时时间"
              slotProps={{ htmlInput: { min: 5, max: 120 } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth
              label="重试次数"
              type="number"
              value={form.retry_count}
              onChange={e => setForm({ ...form, retry_count: parseInt(e.target.value) || 1 })}
              helperText="失败后切换到下一个源的次数"
              slotProps={{ htmlInput: { min: 0, max: 5 } }}
            />
          </Grid>

          {/* 默认策略开关 */}
          <Grid size={12}>
            <FormControlLabel
              control={<Switch checked={form.is_default} onChange={(_, v) => setForm({ ...form, is_default: v })} />}
              label={
                <Box>
                  <Typography sx={{ fontSize: 13 }}>设为默认策略</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Agent 未指定策略时自动使用此策略（全局仅一条）</Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
