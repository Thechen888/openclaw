import { useMemo, useState } from 'react';
import {
  Box, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  List, ListItem, ListItemIcon, ListItemText, Divider, Alert,
  TableSortLabel, Switch, FormControlLabel,
} from '@mui/material';
import {
  Add, Refresh, AutoStories, Visibility, PlayArrow,
  TrendingUp, TrendingDown, TrendingFlat, Business, Assessment,
  Download, CompareArrows, Edit, Delete, Settings, RocketLaunch,
  SmartToy, Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, StatCard,
} from '../../components/shared';
import { weeklyReportsApi, weeklyConfigApi, agentsApi } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

const STATUS_LABEL: Record<string, string> = {
  published: '已发布',
  draft: '草稿',
  generating: '生成中',
};

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

type SortField = 'title' | 'department_name' | 'week_start' | 'created_at';
type SortOrder = 'asc' | 'desc';

function formatDate(t?: string) {
  return t ? new Date(t).toLocaleDateString() : '-';
}

function formatDateTime(t?: string) {
  return t ? new Date(t).toLocaleString() : '-';
}

function getTrendColor(direction: string, value: number) {
  if (value === 0) return 'text.secondary';
  if (direction === 'lower_better') return value > 0 ? 'error.main' : 'success.main';
  if (direction === 'higher_better') return value > 0 ? 'success.main' : 'error.main';
  return 'text.secondary';
}

function getTrendIcon(direction: string, value: number) {
  if (value === 0) return <TrendingFlat sx={{ fontSize: 16, color: 'text.secondary' }} />;
  const upGood = direction === 'higher_better' || direction === 'neutral';
  if (value > 0) return <TrendingUp sx={{ fontSize: 16, color: upGood ? 'success.main' : 'error.main' }} />;
  return <TrendingDown sx={{ fontSize: 16, color: upGood ? 'error.main' : 'success.main' }} />;
}

export default function WeeklyReportsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuthStore();
  const isAdmin = !!user?.is_admin;
  const userOrgId = (user as any)?.org_id || (user as any)?.organization_id || '';

  // 主 Tab：生成配置 / 周报列表
  const [mainTab, setMainTab] = useState(0);

  // ---- 周报列表状态 ----
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [typeTab, setTypeTab] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({ field: 'created_at', order: 'desc' });

  // ---- 配置管理状态 ----
  const { page: cfgPage, pageSize: cfgPageSize, search: cfgSearch, setPage: setCfgPage, setPageSize: setCfgPageSize, setSearch: setCfgSearch, params: cfgParams } = useTableState();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [configForm, setConfigForm] = useState({
    name: '',
    department_id: '',
    agent_id: '',
    schedule_day: 5,
    schedule_time: '18:00',
    enabled: true,
  });

  // ---- 数据查询 ----
  const queryParams = useMemo(() => ({
    ...params,
    type: typeTab || undefined,
    department_id: deptFilter || undefined,
    user_org_id: isAdmin ? undefined : userOrgId,
  }), [params, typeTab, deptFilter, isAdmin, userOrgId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['weekly-reports', queryParams],
    queryFn: () => weeklyReportsApi.list(queryParams),
  });
  const items = useMemo(() => data?.data?.data || [], [data]);
  const total = data?.data?.pagination?.total || 0;

  const { data: allData } = useQuery({
    queryKey: ['weekly-reports-all', { type: typeTab || undefined, user_org_id: isAdmin ? undefined : userOrgId }],
    queryFn: () => weeklyReportsApi.list({
      page: 1, page_size: 9999,
      type: typeTab || undefined,
      user_org_id: isAdmin ? undefined : userOrgId,
    }),
    enabled: !isLoading,
  });
  const allItems: any[] = allData?.data?.data || items;

  const { data: deptsData } = useQuery({
    queryKey: ['weekly-departments'],
    queryFn: () => weeklyReportsApi.departments(),
  });
  const departments: any[] = deptsData?.data?.data || [];

  // 全部智能体列表（用于配置中选择绑定的 Agent）
  const { data: agentsData } = useQuery({
    queryKey: ['weekly-agents'],
    queryFn: () => agentsApi.list({ page: 1, page_size: 200 }),
  });
  const agents: any[] = agentsData?.data?.data || [];

  // ---- 配置列表查询 ----
  const { data: cfgData, isLoading: cfgLoading, refetch: cfgRefetch } = useQuery({
    queryKey: ['weekly-configs', cfgParams],
    queryFn: () => weeklyConfigApi.list(cfgParams),
  });
  const cfgItems = useMemo(() => cfgData?.data?.data || [], [cfgData]);
  const cfgTotal = cfgData?.data?.pagination?.total || 0;

  // ---- Mutations ----
  const regenerateMutation = useMutation({
    mutationFn: (id: string) => weeklyReportsApi.generate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-reports'] });
      qc.invalidateQueries({ queryKey: ['weekly-reports-all'] });
      enqueueSnackbar('周报已重新生成', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('重新生成失败', { variant: 'error' }),
  });

  const exportMutation = useMutation({
    mutationFn: (id: string) => weeklyReportsApi.export(id),
    onSuccess: (res: any) => {
      const blob = new Blob([res.data.data.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      enqueueSnackbar('导出成功', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('导出失败', { variant: 'error' }),
  });

  const configCreateMutation = useMutation({
    mutationFn: (d: any) => editingConfig ? weeklyConfigApi.update(editingConfig.id, d) : weeklyConfigApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-configs'] });
      setConfigDialogOpen(false);
      enqueueSnackbar(editingConfig ? '配置已更新' : '配置已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存配置失败', { variant: 'error' }),
  });

  const configDeleteMutation = useMutation({
    mutationFn: (id: string) => weeklyConfigApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-configs'] });
      enqueueSnackbar('配置已删除', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const configToggleMutation = useMutation({
    mutationFn: (id: string) => weeklyConfigApi.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-configs'] });
    },
    onError: () => enqueueSnackbar('切换失败', { variant: 'error' }),
  });

  const configTriggerMutation = useMutation({
    mutationFn: (id: string) => weeklyConfigApi.trigger(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-configs'] });
      qc.invalidateQueries({ queryKey: ['weekly-reports'] });
      qc.invalidateQueries({ queryKey: ['weekly-reports-all'] });
      qc.invalidateQueries({ queryKey: ['weekly-agents'] });
      enqueueSnackbar('已触发 Agent 生成周报', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('触发失败', { variant: 'error' }),
  });

  // ---- Handlers ----
  const handleOpenDetail = (item: any) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleRegenerate = (item: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    regenerateMutation.mutate(item.id);
  };

  const handleSort = (field: SortField) => {
    setSort(prev => ({ field, order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc' }));
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a: any, b: any) => {
      const order = sort.order === 'asc' ? 1 : -1;
      if (sort.field === 'week_start') return order * (new Date(a.week_start || 0).getTime() - new Date(b.week_start || 0).getTime());
      if (sort.field === 'created_at') return order * (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      return order * String(a[sort.field] || '').localeCompare(String(b[sort.field] || ''));
    });
    return sorted;
  }, [items, sort]);

  const handleOpenConfigDialog = (config?: any) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        name: config.name || '',
        department_id: config.department_id || '',
        agent_id: config.agent_id || '',
        schedule_day: config.schedule_day ?? 5,
        schedule_time: config.schedule_time || '18:00',
        enabled: config.enabled !== false,
      });
    } else {
      setEditingConfig(null);
      setConfigForm({ name: '', department_id: '', agent_id: '', schedule_day: 5, schedule_time: '18:00', enabled: true });
    }
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!configForm.name.trim()) {
      enqueueSnackbar('请填写配置名称', { variant: 'warning' });
      return;
    }
    if (!configForm.agent_id) {
      enqueueSnackbar('请选择绑定的 Agent', { variant: 'warning' });
      return;
    }
    configCreateMutation.mutate(configForm);
  };

  const stats = [
    { title: '生效配置数', value: cfgItems.filter((c: any) => c.enabled).length, icon: <Settings />, color: 'primary' },
    { title: '本周已生成', value: allItems.length, icon: <AutoStories />, color: 'success' },
    { title: '绑定 Agent', value: new Set(cfgItems.map((c: any) => c.agent_id)).size, icon: <SmartToy />, color: 'info' },
  ];

  const compareReports = useMemo(() => {
    if (!detailItem || detailItem.type === 'operation') return [];
    return allItems
      .filter((r: any) => r.type === 'department' && r.department_id === detailItem.department_id && r.id !== detailItem.id)
      .sort((a: any, b: any) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime())
      .slice(0, 3);
  }, [detailItem, allItems]);

  // 选中的 Agent 信息（用于弹窗中显示）
  const selectedAgent = agents.find((a: any) => a.id === configForm.agent_id);

  return (
    <Box>
      <PageHeader
        title="智能周报"
        subtitle="各部门绑定专属 Agent，由 Agent 自动拉取数据并 AI 生成周报"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => { refetch(); cfgRefetch(); }}><Refresh /></IconButton></Tooltip>
            {mainTab === 0 && (
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenConfigDialog()}>
                新增配置
              </Button>
            )}
          </>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid key={s.title} size={{ xs: 12, sm: 4 }}>
            <StatCard title={s.title} value={s.value} icon={s.icon} color={s.color as any} />
          </Grid>
        ))}
      </Grid>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<Settings />} iconPosition="start" label="生成配置" />
        <Tab icon={<AutoStories />} iconPosition="start" label="周报列表" />
      </Tabs>

      {/* ==================== Tab 0: 生成配置 ==================== */}
      {mainTab === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            每条配置绑定一个 Agent，由 Agent 的工作流负责拉取部门数据、AI 分析并生成周报。Agent 的定时触发器控制自动生成频率，也可点击「立即生成」手动触发。
          </Alert>
          <FilterBar
            search={cfgSearch}
            onSearchChange={setCfgSearch}
          />
          {cfgLoading ? <LoadingState /> : (
            <DataTable pagination={{ page: cfgPage, pageSize: cfgPageSize, total: cfgTotal, onPageChange: setCfgPage, onPageSizeChange: setCfgPageSize }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>配置名称</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>绑定 Agent</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>生成时间</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>上次生成</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cfgItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState title="暂无配置" description="点击右上角新增配置，绑定 Agent 后系统将自动生成周报" />
                    </TableCell>
                  </TableRow>
                ) : cfgItems.map((config: any) => (
                  <TableRow key={config.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{config.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={config.type === 'operation' ? '运营周报' : '部门周报'}
                        size="small"
                        color={config.type === 'operation' ? 'success' : 'info'}
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{config.department_name || '-'}</TableCell>
                    <TableCell>
                      {config.agent_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SmartToy sx={{ fontSize: 16, color: 'primary.main' }} />
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {config.agent_name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">未绑定</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        {DAY_LABELS[config.schedule_day] || '-'} {config.schedule_time || ''}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{formatDateTime(config.last_generated_at)}</TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={config.enabled}
                        onChange={() => configToggleMutation.mutate(config.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="立即生成">
                        <IconButton size="small" color="primary" onClick={() => configTriggerMutation.mutate(config.id)} disabled={configTriggerMutation.isPending}>
                          <RocketLaunch fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="编辑配置">
                        <IconButton size="small" onClick={() => handleOpenConfigDialog(config)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除配置">
                        <IconButton size="small" color="error" onClick={() => configDeleteMutation.mutate(config.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}

          {/* 配置编辑弹窗 */}
          <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600 }}>{editingConfig ? '编辑配置' : '新增配置'}</DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
                配置保存后，绑定的 Agent 将按其定时触发器自动生成周报。也可在配置列表中点击「立即生成」手动触发 Agent 执行。
              </Alert>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth label="配置名称"
                    value={configForm.name}
                    onChange={e => setConfigForm({ ...configForm, name: e.target.value })}
                    placeholder="如：技术研发部周报自动生成"
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth select label="选择部门"
                    value={configForm.department_id}
                    onChange={e => setConfigForm({ ...configForm, department_id: e.target.value })}
                    helperText="部门来源于系统组织架构；留空表示运营汇总（跨部门聚合）"
                  >
                    <MenuItem value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assessment fontSize="small" />
                        运营汇总（跨部门聚合）
                      </Box>
                    </MenuItem>
                    {departments.map((d: any) => (
                      <MenuItem key={d.id} value={d.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Business fontSize="small" />
                          {d.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={12}>
                  <TextField
                    fullWidth select label="绑定 Agent"
                    value={configForm.agent_id}
                    onChange={e => setConfigForm({ ...configForm, agent_id: e.target.value })}
                    helperText="选择负责生成该部门周报的智能体，Agent 的工作流负责数据拉取和 AI 分析"
                  >
                    <MenuItem value="" disabled>请选择 Agent</MenuItem>
                    {agents.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SmartToy fontSize="small" color={a.status === 'active' ? 'success' : 'disabled'} />
                          <Box>
                            <Typography variant="body2" component="span">{a.name}</Typography>
                            <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                              {a.status === 'active' ? '启用' : a.status === 'draft' ? '草稿' : a.status}
                              {a.triggers_count > 0 ? ` · ${a.triggers_count}个触发器` : ' · 无触发器'}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth select label="生成日期"
                    value={configForm.schedule_day}
                    onChange={e => setConfigForm({ ...configForm, schedule_day: Number(e.target.value) })}
                    helperText="每周几自动触发 Agent"
                  >
                    {DAY_LABELS.map((label, idx) => (
                      <MenuItem key={idx} value={idx}>{label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth label="生成时间"
                    type="time"
                    value={configForm.schedule_time}
                    onChange={e => setConfigForm({ ...configForm, schedule_time: e.target.value })}
                    helperText="Agent 触发时间"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                {selectedAgent && (
                  <Grid size={12}>
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Agent 信息
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: 12 }}>
                        {selectedAgent.description || '无描述'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          模型策略：{selectedAgent.policy_name || '无'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          触发器：{selectedAgent.triggers_count || 0} 个
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          上次运行：{formatDateTime(selectedAgent.last_run_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                {configForm.department_id === '' && (
                  <Grid size={12}>
                    <Alert severity="warning" sx={{ fontSize: 12 }}>
                      运营汇总周报将自动聚合所有部门周报数据，请绑定负责汇总的 Agent。
                    </Alert>
                  </Grid>
                )}
                <Grid size={12}>
                  <FormControlLabel
                    control={<Switch checked={configForm.enabled} onChange={e => setConfigForm({ ...configForm, enabled: e.target.checked })} />}
                    label="启用自动生成"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setConfigDialogOpen(false)}>取消</Button>
              <Button variant="contained" onClick={handleSaveConfig} disabled={configCreateMutation.isPending}>
                {configCreateMutation.isPending ? '保存中...' : '保存'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* ==================== Tab 1: 周报列表 ==================== */}
      {mainTab === 1 && (
        <>
          <Tabs value={typeTab} onChange={(_, v) => { setTypeTab(v); setPage(1); }} sx={{ mb: 2 }}>
            <Tab label="全部" value="" />
            <Tab label="部门周报" value="department" />
            <Tab label="运营周报" value="operation" />
          </Tabs>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            filters={
              <TextField
                select size="small" label="部门"
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="">全部</MenuItem>
                {departments.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </TextField>
            }
          />

          {isLoading ? <LoadingState /> : (
            <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <TableSortLabel active={sort.field === 'title'} direction={sort.order} onClick={() => handleSort('title')}>周报标题</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <TableSortLabel active={sort.field === 'department_name'} direction={sort.order} onClick={() => handleSort('department_name')}>部门</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <TableSortLabel active={sort.field === 'week_start'} direction={sort.order} onClick={() => handleSort('week_start')}>周期</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>生成 Agent</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>核心指标</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    <TableSortLabel active={sort.field === 'created_at'} direction={sort.order} onClick={() => handleSort('created_at')}>创建人</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState title="暂无周报" description="系统将按配置自动生成，也可在「生成配置」页手动触发" />
                    </TableCell>
                  </TableRow>
                ) : sortedItems.map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoStories sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.type === 'operation' ? '运营周报' : '部门周报'}
                        size="small"
                        color={item.type === 'operation' ? 'success' : 'info'}
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{item.department_name || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {formatDate(item.week_start)} ~ {formatDate(item.week_end)}
                    </TableCell>
                    <TableCell>
                      {item.agent_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SmartToy sx={{ fontSize: 14, color: 'primary.main' }} />
                          <Typography variant="caption">{item.agent_name}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} label={STATUS_LABEL[item.status] || item.status} /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {item.metrics?.slice(0, 2).map((m: any) => (
                          <Chip
                            key={m.source_id}
                            label={`${m.name} ${m.value}${m.unit}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {item.creator}
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {formatDateTime(item.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="查看详情">
                        <IconButton size="small" onClick={() => handleOpenDetail(item)}><Visibility fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="重新生成">
                        <IconButton size="small" color="primary" onClick={(e) => handleRegenerate(item, e)} disabled={regenerateMutation.isPending}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* 周报详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{detailItem?.title}</DialogTitle>
        <DialogContent>
          {detailItem && (
            <Grid container spacing={2}>
              <Grid size={12}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip label={detailItem.type === 'operation' ? '运营周报' : '部门周报'} size="small" color={detailItem.type === 'operation' ? 'success' : 'info'} />
                  <Chip label={`周期：${formatDate(detailItem.week_start)} ~ ${formatDate(detailItem.week_end)}`} size="small" variant="outlined" />
                  <Chip label={`创建人：${detailItem.creator}`} size="small" variant="outlined" />
                  <Chip label={`生成时间：${formatDateTime(detailItem.created_at)}`} size="small" variant="outlined" />
                  {detailItem.agent_name && (
                    <Chip
                      icon={<SmartToy sx={{ fontSize: 14 }} />}
                      label={`Agent：${detailItem.agent_name}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>核心指标</Typography>
                <Grid container spacing={1.5}>
                  {detailItem.metrics?.map((m: any) => (
                    <Grid key={m.source_id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">{m.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{m.value}{m.unit}</Typography>
                          {getTrendIcon(m.trend_direction || 'neutral', m.week_over_week)}
                        </Box>
                        <Typography variant="caption" color={getTrendColor(m.trend_direction || 'neutral', m.week_over_week)}>
                          环比 {m.week_over_week >= 0 ? '+' : ''}{m.week_over_week}{m.unit}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              <Grid size={12}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>AI 总结</Typography>
                <Typography variant="body2" color="text.secondary">{detailItem.summary}</Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>本周亮点</Typography>
                <List dense>
                  {detailItem.highlights?.map((h: string, idx: number) => (
                    <ListItem key={idx} disablePadding>
                      <ListItemIcon sx={{ minWidth: 28 }}><TrendingUp sx={{ fontSize: 16, color: 'success.main' }} /></ListItemIcon>
                      <ListItemText primary={<Typography variant="body2">{h}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>风险与问题</Typography>
                <List dense>
                  {detailItem.risks?.map((r: string, idx: number) => (
                    <ListItem key={idx} disablePadding>
                      <ListItemIcon sx={{ minWidth: 28 }}><TrendingDown sx={{ fontSize: 16, color: 'error.main' }} /></ListItemIcon>
                      <ListItemText primary={<Typography variant="body2">{r}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>下周计划</Typography>
                <List dense>
                  {detailItem.next_week_plan?.map((p: string, idx: number) => (
                    <ListItem key={idx} disablePadding>
                      <ListItemIcon sx={{ minWidth: 28 }}><Assessment sx={{ fontSize: 16, color: 'primary.main' }} /></ListItemIcon>
                      <ListItemText primary={<Typography variant="body2">{p}</Typography>} />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              {compareReports.length > 0 && (
                <Grid size={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareArrows fontSize="small" /> 历史对比
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {compareReports.map((r: any) => (
                      <Box key={r.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          第{r.week}周 ({formatDate(r.week_start)} ~ {formatDate(r.week_end)})
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {r.metrics?.map((m: any) => (
                            <Chip
                              key={m.source_id}
                              label={`${m.name}: ${m.value}${m.unit}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10, height: 20 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button startIcon={<Download />} onClick={() => detailItem && exportMutation.mutate(detailItem.id)} disabled={exportMutation.isPending}>
            导出 Markdown
          </Button>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
