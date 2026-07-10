import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, IconButton,
  Switch, Select, MenuItem, FormControl, InputLabel, TextField, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip,
  Grid, Stack, Divider, LinearProgress, Avatar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PlayArrow as PlayIcon,
  Download as DownloadIcon, Visibility as ViewIcon, Close as CloseIcon,
  Article as ArticleIcon, Assessment as AssessmentIcon, FilterList as FilterIcon,
  Schedule as ScheduleIcon, DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { reportTemplatesApi, reportConfigsApi, reportsApi } from '../../api/client';
import { PageHeader, DataTable, StatusBadge, EmptyState, LoadingState, useTableState, CrudDialog } from '../../components/shared';

// ===== 常量 =====
const PERIOD_LABELS: Record<string, string> = { daily: '日报', weekly: '周报', monthly: '月报' };
const SCOPE_LABELS: Record<string, string> = { company: '全公司', department: '部门' };
const BLOCK_TYPE_LABELS: Record<string, string> = {
  metrics_card: '指标卡片', chart_image: '图表图片', data_table: '数据表格', rich_text: '富文本', bullet_list: '列表',
};
const BLOCK_TYPE_ICONS: Record<string, string> = {
  metrics_card: '📊', chart_image: '📈', data_table: '📋', rich_text: '📝', bullet_list: '✅',
};
const VAR_TYPE_LABELS: Record<string, string> = { metrics: '指标数组', image: '图片', table: '表格', text: '文本', list: '列表' };

export default function ReportsPage() {
  const [tab, setTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const ts = useTableState();

  // ===== 报告门户 状态 =====
  const [portalScope, setPortalScope] = useState('');
  const [portalPeriod, setPortalPeriod] = useState('');
  const [portalDept, setPortalDept] = useState('');
  const [viewReport, setViewReport] = useState<any>(null);

  // ===== 生成配置 状态 =====
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgForm, setCfgForm] = useState<any>({});
  const [cfgIsNew, setCfgIsNew] = useState(true);

  // ===== 报告模板 状态 =====
  const [tplOpen, setTplOpen] = useState(false);
  const [tplForm, setTplForm] = useState<any>({});
  const [tplIsNew, setTplIsNew] = useState(true);

  // ===== 查询 =====
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['rpt-reports', ts.page, ts.pageSize, portalScope, portalPeriod, portalDept],
    queryFn: () => reportsApi.list({ page: ts.page, page_size: ts.pageSize, scope: portalScope || undefined, period: portalPeriod || undefined, department_id: portalDept || undefined }),
  });
  const { data: configsData, isLoading: configsLoading } = useQuery({
    queryKey: ['rpt-configs', ts.page, ts.pageSize],
    queryFn: () => reportConfigsApi.list({ page: ts.page, page_size: ts.pageSize }),
  });
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['rpt-templates'],
    queryFn: () => reportTemplatesApi.list(),
  });
  const { data: deptsData } = useQuery({
    queryKey: ['rpt-depts'],
    queryFn: () => reportsApi.departments(),
  });

  const rptList = reportsData?.data?.data?.list || reportsData?.data?.data || [];
  const cfgList = configsData?.data?.data?.list || configsData?.data?.data || [];
  const tplList = templatesData?.data?.data || [];
  const deptList = deptsData?.data?.data || [];

  // ===== 变更 =====
  const saveCfgMut = useMutation({
    mutationFn: (d: any) => cfgIsNew ? reportConfigsApi.create(d) : reportConfigsApi.update(d.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rpt-configs'] }); setCfgOpen(false); enqueueSnackbar(cfgIsNew ? '配置已创建' : '配置已更新', { variant: 'success' }); },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });
  const deleteCfgMut = useMutation({
    mutationFn: (id: string) => reportConfigsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rpt-configs'] }); enqueueSnackbar('已删除', { variant: 'success' }); },
  });
  const toggleCfgMut = useMutation({
    mutationFn: (id: string) => reportConfigsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rpt-configs'] }),
  });
  const triggerCfgMut = useMutation({
    mutationFn: (id: string) => reportConfigsApi.trigger(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rpt-configs'] }); qc.invalidateQueries({ queryKey: ['rpt-reports'] }); enqueueSnackbar('已触发生成', { variant: 'success' }); },
  });
  const saveTplMut = useMutation({
    mutationFn: (d: any) => tplIsNew ? reportTemplatesApi.create(d) : reportTemplatesApi.update(d.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rpt-templates'] }); setTplOpen(false); enqueueSnackbar(tplIsNew ? '模板已创建' : '模板已更新', { variant: 'success' }); },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });
  const deleteTplMut = useMutation({
    mutationFn: (id: string) => reportTemplatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rpt-templates'] }); enqueueSnackbar('已删除', { variant: 'success' }); },
  });
  const exportMut = useMutation({
    mutationFn: (id: string) => reportsApi.export(id),
    onSuccess: (res) => {
      const d = res?.data?.data;
      if (d?.content) {
        const blob = new Blob([d.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = d.filename || 'report.md'; a.click();
        URL.revokeObjectURL(url);
        enqueueSnackbar('导出成功', { variant: 'success' });
      }
    },
  });

  // ===== 辅助 =====
  const openNewCfg = () => { setCfgIsNew(true); setCfgForm({ name: '', scope: 'department', department_id: '', period: 'weekly', template_id: '', agent_id: '', block_configs: [], schedule: { type: 'weekly', day: 5, time: '18:00', date: null }, publish_to_portal: true, notify_users: true, enabled: true }); setCfgOpen(true); };
  const openEditCfg = (c: any) => { setCfgIsNew(false); setCfgForm({ ...c, block_configs: c.block_configs || [] }); setCfgOpen(true); };

  // 严格模式：block.type -> variable.type 映射
  const blockTypeToVarType = (t: string) => t === 'metrics_card' ? 'metrics' : t === 'chart_image' ? 'image' : t === 'data_table' ? 'table' : t === 'rich_text' ? 'text' : 'list';
  // 为某个 block 生成默认 config
  const defaultBlockConfig = (blockType: string): any => {
    if (blockType === 'metrics_card') return { metrics: [{ name: '', unit: '', data_source: '', format: 'integer', aggregation: 'sum', trend: 'higher_better' }] };
    if (blockType === 'chart_image') return { chart_title: '', chart_type: 'line', x_axis: '', y_axis: '', data_source: '', color_theme: 'cyber' };
    if (blockType === 'data_table') return { columns: [{ key: '', header: '', width: 120, align: 'left' }], data_source: '', default_sort: '', max_rows: 20 };
    if (blockType === 'rich_text') return { topic: '', angle: '', word_limit: 300, tone: '专业简洁', must_include: '' };
    if (blockType === 'bullet_list') return { list_kind: 'highlight', max_items: 5, category: '', style: '简洁中性' };
    return {};
  };
  // 切换模板时按模板 blocks 自动生成 block_configs；已有同 key 的 label/description/prompt/config 保留
  const syncBlockConfigsFromTemplate = (templateId: string, oldConfigs: any[] = []) => {
    const tpl = tplList.find((t: any) => t.id === templateId);
    if (!tpl) return [];
    const oldMap = new Map((oldConfigs || []).map((c: any) => [c.key, c]));
    return (tpl.blocks || []).map((b: any) => {
      const old = oldMap.get(b.variable_key) as any;
      return {
        key: b.variable_key,
        type: blockTypeToVarType(b.type),
        label: old?.label || b.title,
        description: old?.description || '',
        prompt: old?.prompt || '',
        config: old?.config || defaultBlockConfig(b.type),
      };
    });
  };
  const selectedTemplate = tplList.find((t: any) => t.id === cfgForm.template_id);
  // 更新某个 block 的字段
  const updateBlockCfg = (idx: number, patch: any) => {
    const list = [...(cfgForm.block_configs || [])];
    list[idx] = { ...list[idx], ...patch };
    setCfgForm({ ...cfgForm, block_configs: list });
  };
  const updateBlockInnerCfg = (idx: number, patch: any) => {
    const list = [...(cfgForm.block_configs || [])];
    list[idx] = { ...list[idx], config: { ...(list[idx].config || {}), ...patch } };
    setCfgForm({ ...cfgForm, block_configs: list });
  };
  const openNewTpl = () => { setTplIsNew(true); setTplForm({ name: '', description: '', scope_type: 'department', period_type: 'weekly', blocks: [] }); setTplOpen(true); };
  const openEditTpl = (t: any) => { setTplIsNew(false); setTplForm({ ...t, blocks: [...(t.blocks || [])] }); setTplOpen(true); };

  const addBlock = () => {
    const blocks = [...(tplForm.blocks || [])];
    blocks.push({ id: 'blk-' + Date.now(), type: 'rich_text', title: '新内容块', variable_key: '', config: {} });
    setTplForm({ ...tplForm, blocks });
  };
  const removeBlock = (idx: number) => {
    const blocks = [...(tplForm.blocks || [])];
    blocks.splice(idx, 1);
    setTplForm({ ...tplForm, blocks });
  };
  const updateBlock = (idx: number, field: string, val: any) => {
    const blocks = [...(tplForm.blocks || [])];
    blocks[idx] = { ...blocks[idx], [field]: val };
    setTplForm({ ...tplForm, blocks });
  };

  // ===== 渲染 =====
  return (
    <Box>
      <PageHeader title="智能报告" subtitle="模板驱动 · Agent 变量产出 · 自动生成与发布" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 600 } }}>
        <Tab label="报告门户" />
        <Tab label="生成配置" />
        <Tab label="报告模板" />
      </Tabs>

      {/* ====== Tab 0: 报告门户 ====== */}
      {tab === 0 && (
        <Box>
          {/* 筛选栏 */}
          <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
            <FilterIcon sx={{ color: 'rgba(180,190,200,0.6)' }} />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>范围</InputLabel>
              <Select value={portalScope} onChange={e => setPortalScope(e.target.value)} label="范围">
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="company">全公司</MenuItem>
                <MenuItem value="department">部门</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>频率</InputLabel>
              <Select value={portalPeriod} onChange={e => setPortalPeriod(e.target.value)} label="频率">
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="daily">日报</MenuItem>
                <MenuItem value="weekly">周报</MenuItem>
                <MenuItem value="monthly">月报</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>部门</InputLabel>
              <Select value={portalDept} onChange={e => setPortalDept(e.target.value)} label="部门">
                <MenuItem value="">全部</MenuItem>
                {deptList.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {reportsLoading ? <LoadingState /> : rptList.length === 0 ? <EmptyState title="暂无报告" description="报告将在配置生成后自动出现" /> : (
            <Grid container spacing={2}>
              {rptList.map((r: any) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                  <Card sx={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }} onClick={() => setViewReport(r)}>
                    <CardContent>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{r.title}</Typography>
                        <Chip label={PERIOD_LABELS[r.period] || r.period} size="small" color={r.period === 'daily' ? 'info' : r.period === 'weekly' ? 'primary' : 'secondary'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {SCOPE_LABELS[r.scope] || r.scope}{r.department_name ? ` · ${r.department_name}` : ''} · {r.agent_name}
                      </Typography>
                      {/* 预览：第一个指标卡 */}
                      {r.blocks?.find((b: any) => b.type === 'metrics_card') && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                          {r.blocks.find((b: any) => b.type === 'metrics_card').data?.slice(0, 3).map((m: any, i: number) => (
                            <Chip key={i} label={`${m.name}: ${m.value}${m.unit}`} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                          ))}
                        </Stack>
                      )}
                      {/* AI 摘要预览 */}
                      {r.blocks?.find((b: any) => b.type === 'rich_text') && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'rgba(200,210,220,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.blocks.find((b: any) => b.type === 'rich_text').data?.content?.slice(0, 60)}...
                        </Typography>
                      )}
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">{r.published_at?.slice(0, 16)?.replace('T', ' ')}</Typography>
                        <StatusBadge status={r.status} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* 报告详情全宽对话框 */}
          <Dialog open={!!viewReport} onClose={() => setViewReport(null)} maxWidth="md" fullWidth>
            {viewReport && (
              <>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">{viewReport.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {SCOPE_LABELS[viewReport.scope]} · {PERIOD_LABELS[viewReport.period]} · {viewReport.agent_name} · {viewReport.published_at?.slice(0, 16)?.replace('T', ' ')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="导出 Markdown"><IconButton size="small" onClick={() => exportMut.mutate(viewReport.id)}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
                    <IconButton size="small" onClick={() => setViewReport(null)}><CloseIcon fontSize="small" /></IconButton>
                  </Stack>
                </DialogTitle>
                <DialogContent dividers>
                  {viewReport.blocks?.map((block: any, idx: number) => (
                    <Box key={idx} sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{BLOCK_TYPE_ICONS[block.type] || '📄'}</span> {block.title}
                      </Typography>
                      {/* 指标卡片 */}
                      {block.type === 'metrics_card' && (
                        <Grid container spacing={1.5}>
                          {block.data?.map((m: any, mi: number) => (
                            <Grid size={{ xs: 6, md: 3 }} key={mi}>
                              <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">{m.name}</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}{m.unit}</Typography>
                                <Typography variant="caption" sx={{ color: m.change >= 0 ? '#00FF88' : '#FF3366' }}>
                                  {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}{typeof m.change === 'number' && !String(m.change).includes('.') ? '' : ''}
                                </Typography>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                      {/* 图表图片 */}
                      {block.type === 'chart_image' && (
                        <Box sx={{ p: 2, border: '1px dashed rgba(120,130,140,0.3)', borderRadius: 1, textAlign: 'center' }}>
                          <AssessmentIcon sx={{ fontSize: 48, color: 'rgba(100,120,140,0.3)' }} />
                          <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">{block.data?.caption || block.data?.alt || '图表'}</Typography>
                        </Box>
                      )}
                      {/* 数据表格 */}
                      {block.type === 'data_table' && block.data?.headers && (
                        <Box sx={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>{block.data.headers.map((h: string, hi: number) => <th key={hi} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(100,110,120,0.2)', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {block.data.rows?.map((row: string[], ri: number) => (
                                <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ padding: '6px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{cell}</td>)}</tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      )}
                      {/* 富文本 */}
                      {block.type === 'rich_text' && (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{block.data?.content}</Typography>
                      )}
                      {/* 列表 */}
                      {block.type === 'bullet_list' && (
                        <Box component="ul" sx={{ pl: 2, m: 0 }}>
                          {block.data?.items?.map((item: string, ii: number) => (
                            <Typography component="li" variant="body2" key={ii} sx={{ mb: 0.5 }}>{item}</Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </DialogContent>
              </>
            )}
          </Dialog>
        </Box>
      )}

      {/* ====== Tab 1: 生成配置 ====== */}
      {tab === 1 && (
        <Box>
          {configsLoading ? <LoadingState /> : (
            <DataTable pagination={{ page: ts.page, pageSize: ts.pageSize, total: cfgList.length, onPageChange: ts.setPage, onPageSizeChange: ts.setPageSize }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewCfg}>新建配置</Button>
              </Box>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['名称', '范围', '频率', '模板', 'Agent', '内容块数', '状态', '操作'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.2)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfgList.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                        {c.department_name && <Typography variant="caption" color="text.secondary">{c.department_name}</Typography>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}><Chip label={SCOPE_LABELS[c.scope] || c.scope} size="small" /></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}><Chip label={PERIOD_LABELS[c.period] || c.period} size="small" color="info" /></td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{c.template_name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{c.agent_name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{c.block_configs?.length || 0}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>
                        <Switch size="small" checked={!!c.enabled} onChange={() => toggleCfgMut.mutate(c.id)} />
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="立即生成"><IconButton size="small" onClick={() => triggerCfgMut.mutate(c.id)} color="success"><PlayIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="编辑"><IconButton size="small" onClick={() => openEditCfg(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="删除"><IconButton size="small" onClick={() => deleteCfgMut.mutate(c.id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}

          {/* 配置弹窗 */}
          <CrudDialog open={cfgOpen} onClose={() => setCfgOpen(false)} title={cfgIsNew ? '新建生成配置' : '编辑生成配置'} onSave={() => {
            if (!cfgForm.name) { enqueueSnackbar('请输入配置名称', { variant: 'warning' }); return; }
            if (!cfgForm.template_id) { enqueueSnackbar('请选择报告模板', { variant: 'warning' }); return; }
            if (cfgForm.scope === 'department' && !cfgForm.department_id) { enqueueSnackbar('请选择部门', { variant: 'warning' }); return; }
            const tpl = tplList.find((t: any) => t.id === cfgForm.template_id);
            const tplKeys = ((tpl?.blocks) || []).map((b: any) => b.variable_key);
            const cfgKeys = (cfgForm.block_configs || []).map((c: any) => c.key);
            if (tplKeys.length !== cfgKeys.length || tplKeys.some((k: string) => !cfgKeys.includes(k))) {
              enqueueSnackbar('内容块配置与模板不一致，请重新选择模板', { variant: 'error' }); return;
            }
            saveCfgMut.mutate(cfgForm);
          }} saving={saveCfgMut.isPending}>
            <Stack spacing={2}>
              <TextField label="配置名称" size="small" fullWidth value={cfgForm.name || ''} onChange={e => setCfgForm({ ...cfgForm, name: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>报告范围</InputLabel>
                  <Select value={cfgForm.scope || 'department'} onChange={e => setCfgForm({ ...cfgForm, scope: e.target.value })} label="报告范围">
                    <MenuItem value="company">全公司</MenuItem>
                    <MenuItem value="department">部门</MenuItem>
                  </Select>
                </FormControl>
                {cfgForm.scope === 'department' && (
                  <FormControl size="small" fullWidth>
                    <InputLabel>部门</InputLabel>
                    <Select value={cfgForm.department_id || ''} onChange={e => setCfgForm({ ...cfgForm, department_id: e.target.value })} label="部门">
                      {deptList.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>频率</InputLabel>
                  <Select value={cfgForm.period || 'weekly'} onChange={e => setCfgForm({ ...cfgForm, period: e.target.value })} label="频率">
                    <MenuItem value="daily">日报</MenuItem>
                    <MenuItem value="weekly">周报</MenuItem>
                    <MenuItem value="monthly">月报</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>选择模板</InputLabel>
                  <Select value={cfgForm.template_id || ''} onChange={e => { const tid = e.target.value as string; setCfgForm({ ...cfgForm, template_id: tid, block_configs: syncBlockConfigsFromTemplate(tid, cfgForm.block_configs) }); }} label="选择模板">
                    {tplList.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField label="绑定 Agent ID" size="small" fullWidth value={cfgForm.agent_id || ''} onChange={e => setCfgForm({ ...cfgForm, agent_id: e.target.value })} helperText="Agent 工作流将产出结构化变量" />
              <Divider />
              {!cfgForm.template_id ? (
                <Alert severity="info" sx={{ fontSize: 12 }}>请先在上方选择「报告模板」，变量映射将根据模板的内容块自动生成。</Alert>
              ) : (
                <>
                  {/* 模板结构预览：显示模板包含哪些内容块以及对应的变量 key */}
                  <Box sx={{ p: 1.5, border: '1px dashed rgba(100,120,140,0.35)', borderRadius: 1, bgcolor: 'rgba(100,120,140,0.05)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>📐 模板结构预览 · {selectedTemplate?.name}</Typography>
                    <Stack spacing={0.75}>
                      {(selectedTemplate?.blocks || []).map((b: any, i: number) => (
                        <Stack key={b.id || i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontSize: 16, width: 22 }}>{BLOCK_TYPE_ICONS[b.type] || '📄'}</Typography>
                          <Chip label={BLOCK_TYPE_LABELS[b.type] || b.type} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                          <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>{b.title}</Typography>
                          <Typography variant="caption" sx={{ color: 'primary.main', fontFamily: 'monospace' }}>{b.variable_key}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>内容块配置（每个块的展示、AI 指令与专属参数）</Typography>
                  {(cfgForm.block_configs || []).map((bc: any, i: number) => {
                    const tplBlock = (selectedTemplate?.blocks || []).find((b: any) => b.variable_key === bc.key);
                    const blockType = tplBlock?.type || 'rich_text';
                    return (
                      <Card key={bc.key || i} variant="outlined" sx={{ p: 1.5, borderColor: 'rgba(100,120,140,0.3)' }}>
                        {/* Header */}
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px dashed rgba(100,120,140,0.2)' }}>
                          <Typography sx={{ fontSize: 18 }}>{BLOCK_TYPE_ICONS[blockType] || '📄'}</Typography>
                          <Chip label={BLOCK_TYPE_LABELS[blockType] || blockType} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                          <TextField size="small" label="展示标签" value={bc.label || ''} onChange={e => updateBlockCfg(i, { label: e.target.value })} sx={{ flex: 1 }} />
                          <Typography variant="caption" sx={{ color: 'primary.main', fontFamily: 'monospace' }}>{bc.key}</Typography>
                        </Stack>
                        {/* 公共字段：说明 + AI 生成指令 */}
                        <Stack spacing={1.5}>
                          <TextField size="small" label="说明" value={bc.description || ''} onChange={e => updateBlockCfg(i, { description: e.target.value })} fullWidth />
                          <TextField size="small" label="AI 生成指令 prompt" value={bc.prompt || ''} onChange={e => updateBlockCfg(i, { prompt: e.target.value })} fullWidth multiline minRows={2} helperText="告诉 Agent 该块应产出什么内容、聚焦什么维度" />

                          {/* metrics_card：指标列表 */}
                          {blockType === 'metrics_card' && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>📊 指标列表</Typography>
                              {(bc.config?.metrics || []).map((m: any, mi: number) => (
                                <Stack key={mi} direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
                                  <TextField size="small" label="指标名" value={m.name || ''} onChange={e => { const arr = [...bc.config.metrics]; arr[mi] = { ...arr[mi], name: e.target.value }; updateBlockInnerCfg(i, { metrics: arr }); }} sx={{ flex: 1.2 }} />
                                  <TextField size="small" label="单位" value={m.unit || ''} onChange={e => { const arr = [...bc.config.metrics]; arr[mi] = { ...arr[mi], unit: e.target.value }; updateBlockInnerCfg(i, { metrics: arr }); }} sx={{ width: 70 }} />
                                  <TextField size="small" label="数据源" value={m.data_source || ''} onChange={e => { const arr = [...bc.config.metrics]; arr[mi] = { ...arr[mi], data_source: e.target.value }; updateBlockInnerCfg(i, { metrics: arr }); }} sx={{ flex: 1 }} />
                                  <FormControl size="small" sx={{ width: 100 }}>
                                    <Select value={m.format || 'integer'} onChange={e => { const arr = [...bc.config.metrics]; arr[mi] = { ...arr[mi], format: e.target.value }; updateBlockInnerCfg(i, { metrics: arr }); }}>
                                      <MenuItem value="integer">整数</MenuItem>
                                      <MenuItem value="float">小数</MenuItem>
                                      <MenuItem value="percent">百分比</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <FormControl size="small" sx={{ width: 100 }}>
                                    <Select value={m.trend || 'neutral'} onChange={e => { const arr = [...bc.config.metrics]; arr[mi] = { ...arr[mi], trend: e.target.value }; updateBlockInnerCfg(i, { metrics: arr }); }}>
                                      <MenuItem value="higher_better">越高越好</MenuItem>
                                      <MenuItem value="lower_better">越低越好</MenuItem>
                                      <MenuItem value="neutral">中性</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton size="small" onClick={() => { const arr = [...bc.config.metrics]; arr.splice(mi, 1); updateBlockInnerCfg(i, { metrics: arr }); }} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                </Stack>
                              ))}
                              <Button size="small" startIcon={<AddIcon />} onClick={() => { const arr = [...(bc.config?.metrics || []), { name: '', unit: '', data_source: '', format: 'integer', aggregation: 'sum', trend: 'higher_better' }]; updateBlockInnerCfg(i, { metrics: arr }); }}>添加指标</Button>
                            </Box>
                          )}

                          {/* chart_image：图表元数据 */}
                          {blockType === 'chart_image' && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>📈 图表参数</Typography>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1}>
                                  <TextField size="small" label="图表标题" value={bc.config?.chart_title || ''} onChange={e => updateBlockInnerCfg(i, { chart_title: e.target.value })} sx={{ flex: 1 }} />
                                  <FormControl size="small" sx={{ width: 130 }}>
                                    <InputLabel>图表类型</InputLabel>
                                    <Select value={bc.config?.chart_type || 'line'} onChange={e => updateBlockInnerCfg(i, { chart_type: e.target.value })} label="图表类型">
                                      <MenuItem value="line">折线图</MenuItem>
                                      <MenuItem value="bar">柱状图</MenuItem>
                                      <MenuItem value="area">面积图</MenuItem>
                                      <MenuItem value="pie">饼图</MenuItem>
                                      <MenuItem value="scatter">散点图</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                  <TextField size="small" label="X 轴" value={bc.config?.x_axis || ''} onChange={e => updateBlockInnerCfg(i, { x_axis: e.target.value })} sx={{ flex: 1 }} />
                                  <TextField size="small" label="Y 轴" value={bc.config?.y_axis || ''} onChange={e => updateBlockInnerCfg(i, { y_axis: e.target.value })} sx={{ flex: 1 }} />
                                  <TextField size="small" label="数据源" value={bc.config?.data_source || ''} onChange={e => updateBlockInnerCfg(i, { data_source: e.target.value })} sx={{ flex: 1 }} />
                                </Stack>
                              </Stack>
                            </Box>
                          )}

                          {/* data_table：列定义 */}
                          {blockType === 'data_table' && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>📋 表格列定义</Typography>
                              {(bc.config?.columns || []).map((col: any, ci: number) => (
                                <Stack key={ci} direction="row" spacing={1} sx={{ mb: 0.75, alignItems: 'center' }}>
                                  <TextField size="small" label="字段 key" value={col.key || ''} onChange={e => { const arr = [...bc.config.columns]; arr[ci] = { ...arr[ci], key: e.target.value }; updateBlockInnerCfg(i, { columns: arr }); }} sx={{ flex: 1 }} />
                                  <TextField size="small" label="表头" value={col.header || ''} onChange={e => { const arr = [...bc.config.columns]; arr[ci] = { ...arr[ci], header: e.target.value }; updateBlockInnerCfg(i, { columns: arr }); }} sx={{ flex: 1 }} />
                                  <TextField size="small" label="宽" type="number" value={col.width ?? 120} onChange={e => { const arr = [...bc.config.columns]; arr[ci] = { ...arr[ci], width: +e.target.value }; updateBlockInnerCfg(i, { columns: arr }); }} sx={{ width: 80 }} />
                                  <FormControl size="small" sx={{ width: 90 }}>
                                    <Select value={col.align || 'left'} onChange={e => { const arr = [...bc.config.columns]; arr[ci] = { ...arr[ci], align: e.target.value }; updateBlockInnerCfg(i, { columns: arr }); }}>
                                      <MenuItem value="left">左</MenuItem>
                                      <MenuItem value="center">中</MenuItem>
                                      <MenuItem value="right">右</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <IconButton size="small" onClick={() => { const arr = [...bc.config.columns]; arr.splice(ci, 1); updateBlockInnerCfg(i, { columns: arr }); }} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                </Stack>
                              ))}
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Button size="small" startIcon={<AddIcon />} onClick={() => { const arr = [...(bc.config?.columns || []), { key: '', header: '', width: 120, align: 'left' }]; updateBlockInnerCfg(i, { columns: arr }); }}>添加列</Button>
                                <TextField size="small" label="数据源" value={bc.config?.data_source || ''} onChange={e => updateBlockInnerCfg(i, { data_source: e.target.value })} sx={{ flex: 1 }} />
                                <TextField size="small" label="最大行数" type="number" value={bc.config?.max_rows ?? 20} onChange={e => updateBlockInnerCfg(i, { max_rows: +e.target.value })} sx={{ width: 100 }} />
                              </Stack>
                            </Box>
                          )}

                          {/* rich_text：分析参数 */}
                          {blockType === 'rich_text' && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>📝 文本参数</Typography>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1}>
                                  <TextField size="small" label="主题" value={bc.config?.topic || ''} onChange={e => updateBlockInnerCfg(i, { topic: e.target.value })} sx={{ flex: 1 }} />
                                  <TextField size="small" label="分析角度" value={bc.config?.angle || ''} onChange={e => updateBlockInnerCfg(i, { angle: e.target.value })} sx={{ flex: 1 }} />
                                </Stack>
                                <Stack direction="row" spacing={1}>
                                  <TextField size="small" label="字数上限" type="number" value={bc.config?.word_limit ?? 300} onChange={e => updateBlockInnerCfg(i, { word_limit: +e.target.value })} sx={{ width: 120 }} />
                                  <FormControl size="small" sx={{ width: 150 }}>
                                    <InputLabel>语气</InputLabel>
                                    <Select value={bc.config?.tone || '专业简洁'} onChange={e => updateBlockInnerCfg(i, { tone: e.target.value })} label="语气">
                                      <MenuItem value="专业简洁">专业简洁</MenuItem>
                                      <MenuItem value="专业深入">专业深入</MenuItem>
                                      <MenuItem value="简洁">简洁</MenuItem>
                                      <MenuItem value="友好">友好</MenuItem>
                                    </Select>
                                  </FormControl>
                                  <TextField size="small" label="必含要点" value={bc.config?.must_include || ''} onChange={e => updateBlockInnerCfg(i, { must_include: e.target.value })} sx={{ flex: 1 }} />
                                </Stack>
                              </Stack>
                            </Box>
                          )}

                          {/* bullet_list：列表参数 */}
                          {blockType === 'bullet_list' && (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>✅ 列表参数</Typography>
                              <Stack direction="row" spacing={1}>
                                <FormControl size="small" sx={{ width: 130 }}>
                                  <InputLabel>列表类型</InputLabel>
                                  <Select value={bc.config?.list_kind || 'highlight'} onChange={e => updateBlockInnerCfg(i, { list_kind: e.target.value })} label="列表类型">
                                    <MenuItem value="highlight">亮点</MenuItem>
                                    <MenuItem value="risk">风险</MenuItem>
                                    <MenuItem value="plan">计划</MenuItem>
                                    <MenuItem value="alert">告警</MenuItem>
                                    <MenuItem value="item">通用条目</MenuItem>
                                  </Select>
                                </FormControl>
                                <TextField size="small" label="最大数量" type="number" value={bc.config?.max_items ?? 5} onChange={e => updateBlockInnerCfg(i, { max_items: +e.target.value })} sx={{ width: 100 }} />
                                <TextField size="small" label="分类标签" value={bc.config?.category || ''} onChange={e => updateBlockInnerCfg(i, { category: e.target.value })} sx={{ flex: 1 }} />
                                <TextField size="small" label="生成风格" value={bc.config?.style || ''} onChange={e => updateBlockInnerCfg(i, { style: e.target.value })} sx={{ flex: 1 }} />
                              </Stack>
                            </Box>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                  <Alert severity="success" sx={{ fontSize: 12 }}>共 {cfgForm.block_configs?.length || 0} 个内容块，Agent 将按每块的 prompt 与专属参数产出对应数据；如需增删块，请到「报告模板」中编辑对应模板。</Alert>
                </>
              )}
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>生成时间调度</Typography>
              <Stack direction="row" spacing={2}>
                {cfgForm.period === 'weekly' && (
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>星期</InputLabel>
                    <Select value={cfgForm.schedule?.day ?? 5} onChange={e => setCfgForm({ ...cfgForm, schedule: { ...cfgForm.schedule, day: e.target.value } })} label="星期">
                      {[1, 2, 3, 4, 5, 6, 7].map(d => <MenuItem key={d} value={d}>{['一', '二', '三', '四', '五', '六', '日'][d - 1]}</MenuItem>)}
                    </Select>
                  </FormControl>
                )}
                {cfgForm.period === 'monthly' && (
                  <TextField size="small" label="每月几号" type="number" value={cfgForm.schedule?.date ?? 1} onChange={e => setCfgForm({ ...cfgForm, schedule: { ...cfgForm.schedule, date: +e.target.value } })} sx={{ width: 100 }} />
                )}
                <TextField size="small" label="时间" type="time" value={cfgForm.schedule?.time || '18:00'} onChange={e => setCfgForm({ ...cfgForm, schedule: { ...cfgForm.schedule, time: e.target.value } })} sx={{ width: 130 }} />
              </Stack>
              <Stack direction="row" spacing={2}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  发布到门户 <Switch size="small" checked={!!cfgForm.publish_to_portal} onChange={e => setCfgForm({ ...cfgForm, publish_to_portal: e.target.checked })} />
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  通知相关人员 <Switch size="small" checked={!!cfgForm.notify_users} onChange={e => setCfgForm({ ...cfgForm, notify_users: e.target.checked })} />
                </Typography>
              </Stack>
            </Stack>
          </CrudDialog>
        </Box>
      )}

      {/* ====== Tab 2: 报告模板 ====== */}
      {tab === 2 && (
        <Box>
          {templatesLoading ? <LoadingState /> : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openNewTpl}>新建模板</Button>
              </Box>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['模板名称', '适用范围', '适用频率', '内容块数', '使用中', '操作'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.2)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tplList.map((t: any) => {
                    const usedBy = cfgList.filter((c: any) => c.template_id === t.id).length;
                    return (
                      <tr key={t.id}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}><Chip label={SCOPE_LABELS[t.scope_type] || t.scope_type} size="small" /></td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}><Chip label={PERIOD_LABELS[t.period_type] || t.period_type} size="small" color="info" /></td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{t.blocks?.length || 0}块</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>{usedBy}个配置</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(100,110,120,0.1)' }}>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="编辑"><IconButton size="small" onClick={() => openEditTpl(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="删除"><IconButton size="small" onClick={() => deleteTplMut.mutate(t.id)} color="error"><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Stack>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* 模板编辑弹窗 */}
          <CrudDialog open={tplOpen} onClose={() => setTplOpen(false)} title={tplIsNew ? '新建报告模板' : '编辑报告模板'} onSave={() => saveTplMut.mutate(tplForm)} saving={saveTplMut.isPending}>
            <Stack spacing={2}>
              <TextField label="模板名称" size="small" fullWidth value={tplForm.name || ''} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} />
              <TextField label="描述" size="small" fullWidth value={tplForm.description || ''} onChange={e => setTplForm({ ...tplForm, description: e.target.value })} />
              <Stack direction="row" spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>适用范围</InputLabel>
                  <Select value={tplForm.scope_type || 'department'} onChange={e => setTplForm({ ...tplForm, scope_type: e.target.value })} label="适用范围">
                    <MenuItem value="company">全公司</MenuItem>
                    <MenuItem value="department">部门</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>适用频率</InputLabel>
                  <Select value={tplForm.period_type || 'weekly'} onChange={e => setTplForm({ ...tplForm, period_type: e.target.value })} label="适用频率">
                    <MenuItem value="daily">日报</MenuItem>
                    <MenuItem value="weekly">周报</MenuItem>
                    <MenuItem value="monthly">月报</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>内容块编排（拖拽排序）</Typography>
              {(tplForm.blocks || []).map((block: any, idx: number) => (
                <Card key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <DragIcon sx={{ color: 'rgba(150,160,170,0.5)', cursor: 'grab' }} />
                    <Typography sx={{ fontSize: 18 }}>{BLOCK_TYPE_ICONS[block.type] || '📄'}</Typography>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select value={block.type} onChange={e => updateBlock(idx, 'type', e.target.value)}>
                        {Object.entries(BLOCK_TYPE_LABELS).map(([k, l]) => <MenuItem key={k} value={k}>{l}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <TextField size="small" label="标题" value={block.title || ''} onChange={e => updateBlock(idx, 'title', e.target.value)} sx={{ flex: 1 }} />
                    <TextField size="small" label="变量key" value={block.variable_key || ''} onChange={e => updateBlock(idx, 'variable_key', e.target.value)} sx={{ width: 140 }} />
                    <IconButton size="small" onClick={() => removeBlock(idx)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </Card>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addBlock} variant="outlined">添加内容块</Button>
              <Alert severity="info" sx={{ fontSize: 12 }}>
                可添加类型：指标卡片 · 图表图片 · 数据表格 · 富文本 · 列表。每个内容块绑定一个变量 key，Agent 产出对应数据后自动渲染。
              </Alert>
            </Stack>
          </CrudDialog>
        </Box>
      )}
    </Box>
  );
}
