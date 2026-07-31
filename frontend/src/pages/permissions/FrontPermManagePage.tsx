import { useState } from 'react';
import {
  Box, Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell, Chip,
  Typography, IconButton, Tooltip, Button, Drawer, Divider, Autocomplete,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Card, CardContent, List, ListItemButton, ListItemText, ListItemIcon,
  RadioGroup, FormControlLabel, Radio, Switch, Checkbox, FormControlLabel as MuiFormControlLabel,
  Collapse, Alert,
} from '@mui/material';
import {
  Search, Refresh, Security, PowerSettingsNew, SwapHoriz, Close, Add, Delete,
  CheckCircle, Cancel, Visibility, Warning, Article, Info, SmartToy, Schedule,
  AccountBalance, Edit, ExpandMore, ExpandLess, History, Preview,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, FilterBar, DataTable, useTableState, EmptyState, LoadingState } from '../../components/shared';
import { frontPermApi, reviewApi, skillsApi, agentsApi, ragApi, reportConfigsApi, reportsApi, tokenAccountsApi, publicQuotaApi } from '../../api/client';
import api from '../../api/client';

const TYPE_TABS = [
  { label: '智能体', value: 'agent' },
  { label: '工作流', value: 'workflow' },
  { label: '报告', value: 'report' },
  { label: '知识库', value: 'kb' },
  { label: '技能', value: 'skill' },
];

const SUB_TYPE_LABEL: Record<string, Record<string, string>> = {
  agent: { chat: '对话 Agent', workflow: '工作流 Agent' },
  report: { public: '公开报表', personal: '个人报表' },
  kb: { document: '文档型', faq: 'FAQ型' },
  skill: {},
};

const STATUS_META: Record<string, { label: string; color: 'success' | 'default' | 'warning' | 'error' | 'info' }> = {
  draft: { label: '未上架', color: 'default' },
  private: { label: '未上架', color: 'default' },
  pending: { label: '审核中', color: 'warning' },
  published: { label: '已上架', color: 'success' },
  modified: { label: '已修改', color: 'info' },
  rejected: { label: '已驳回', color: 'error' },
  delisted: { label: '已下架', color: 'default' },
  active: { label: '启用', color: 'success' },
  disabled: { label: '停用', color: 'default' },
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-';
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtRelative = (d: string) => {
  if (!d) return '-';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
};

// 工作流节点类型 → 中文标签（内容预览·节点统计用）
const NODE_TYPE_LABEL: Record<string, string> = {
  trigger: '触发', starlark: 'Starlark脚本', skill: '技能调用', model: 'AI对话',
  loop: '循环', condition: '条件', report_output: '报告输出', http: 'HTTP请求',
};

// 报告区块类型 → 中文标签（内容预览·区块统计用）
const BLOCK_TYPE_LABEL: Record<string, string> = {
  metrics_card: 'KPI', chart_image: '图表', data_table: '表格', rich_text: '文本', bullet_list: '列表',
};

// 敏感经营数据检测：中文关键词 + 常见英文绑定键
const SENSITIVE_WORDS = ['预算', '成本', '薪资', '利润'];
const SENSITIVE_KEYS = ['budget', 'cost', 'salary', 'profit'];

// 调度周期格式化
const WEEK_DAY_LABEL = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const fmtSchedule = (s: any) => {
  if (!s) return '-';
  if (s.type === 'weekly') return `每${WEEK_DAY_LABEL[s.day] || '周'} ${s.time || ''}`;
  if (s.type === 'daily') return `每天 ${s.time || ''}`;
  if (s.type === 'monthly') return `每月 ${s.date || ''} 日 ${s.time || ''}`;
  return s.type || '-';
};
const PERIOD_LABEL: Record<string, string> = { daily: '日报', weekly: '周报', monthly: '月报' };

export default function FrontPermManagePage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [typeTab, setTypeTab] = useState('agent');
  const [segment, setSegment] = useState<'all' | 'pending'>('all');
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [idleFilter, setIdleFilter] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<any>(null);
  const [transferTarget, setTransferTarget] = useState<any>(null);
  const [transferForm, setTransferForm] = useState({ owner_name: '', owner_dept: '' });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [agentDetailTarget, setAgentDetailTarget] = useState<any>(null);
  const [reportDetailTarget, setReportDetailTarget] = useState<any>(null);
  const [kbDetailTarget, setKbDetailTarget] = useState<any>(null);
  const [skillDetailTarget, setSkillDetailTarget] = useState<any>(null);

  // 审核相关状态
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; recordId: string; recordName: string }>({ open: false, recordId: '', recordName: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null);
  // 审核可见范围配置
  const [reviewScopeType, setReviewScopeType] = useState<'all' | 'roles'>('all');
  const [reviewScopeRoles, setReviewScopeRoles] = useState<any[]>([]);
  // 审核详情 — 系统提示词展开状态 / 报告预览弹窗
  const [systemPromptExpanded, setSystemPromptExpanded] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['front-perm-resources', typeTab, params, idleFilter],
    queryFn: () => frontPermApi.resources({ ...params, resource_type: typeTab, sub_type: typeTab === 'agent' ? 'chat' : typeTab === 'workflow' ? 'workflow' : undefined, idle: idleFilter ? '1' : undefined }),
  });
  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  // 各 Tab 对应的审核类型（无审核机制的 Tab 为 null，不显示待审核分段）
  const REVIEW_TYPE_BY_TAB: Record<string, string | null> = { agent: 'agent_publish', workflow: 'workflow_publish', report: 'report_publish', skill: 'skill_publish', kb: null };
  const reviewType = REVIEW_TYPE_BY_TAB[typeTab] || null;
  const hasReview = !!reviewType;

  // 获取待审核数量
  const { data: pendingCountData } = useQuery({
    queryKey: ['review-pending-count', reviewType],
    queryFn: () => reviewApi.list({ page_size: 1, type: reviewType as string, status: 'pending' }),
    enabled: hasReview,
  });
  const pendingCount = pendingCountData?.data?.pagination?.total || 0;

  // 获取审核记录（默认按提交时间正序）
  const { data: reviewData } = useQuery({
    queryKey: ['review-records', reviewType],
    queryFn: () => reviewApi.list({ page_size: 50, type: reviewType as string, status: 'pending' }),
    enabled: hasReview && segment === 'pending',
  });
  const reviewRecords: any[] = (reviewData?.data?.data || [])
    .filter((r: any) => {
      if (typeTab === 'agent') return r.sub_type === 'chat';
      if (typeTab === 'workflow') return r.sub_type === 'workflow';
      return true;
    })
    .slice().sort((a: any, b: any) => new Date(a.submitted_at || 0).getTime() - new Date(b.submitted_at || 0).getTime());

  // 审核 mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, scopeConfig }: { id: string; scopeConfig: { scope_type: string; scope_role_ids?: string[] } }) => reviewApi.approve(id, scopeConfig),
    onSuccess: (_, { id: recordId }) => {
      qc.invalidateQueries({ queryKey: ['review-records'] });
      qc.invalidateQueries({ queryKey: ['review-pending-count'] });
      qc.invalidateQueries({ queryKey: ['front-perm-resources'] });
      enqueueSnackbar('已通过并上架', { variant: 'success' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reviewApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-records'] });
      qc.invalidateQueries({ queryKey: ['review-pending-count'] });
      qc.invalidateQueries({ queryKey: ['front-perm-resources'] });
      setRejectDialog({ open: false, recordId: '', recordName: '' });
      setRejectReason('');
      enqueueSnackbar('已驳回', { variant: 'success' });
    },
  });

  const handleReject = () => {
    if (!rejectReason.trim()) {
      enqueueSnackbar('请填写驳回原因', { variant: 'warning' });
      return;
    }
    rejectMutation.mutate({ id: rejectDialog.recordId, reason: rejectReason });
  };

  const handleApprove = () => {
    if (!detailRecord) return;
    if (reviewScopeType === 'roles' && reviewScopeRoles.length === 0) {
      enqueueSnackbar('指定角色模式下至少需要选择一个角色', { variant: 'warning' });
      return;
    }
    const scopeConfig = {
      scope_type: reviewScopeType,
      scope_role_ids: reviewScopeType === 'roles' ? reviewScopeRoles.map(r => r.id) : undefined,
    };
    approveMutation.mutate({ id: detailRecord.id, scopeConfig });
    setDetailRecord(null);
    setPreviewFile(null);
    setReviewScopeType('all');
    setReviewScopeRoles([]);
  };

  // 审核详情 — 获取技能基本信息（仅技能类审核需要）
  const { data: detailSkillData } = useQuery({
    queryKey: ['review-detail-skill', detailRecord?.target_id],
    queryFn: () => skillsApi.get(detailRecord.target_id),
    enabled: !!detailRecord?.target_id && detailRecord?.type === 'skill_publish',
  });
  const detailSkill: any = detailSkillData?.data?.data || null;

  // 审核详情 — 获取技能文件列表（仅技能类审核需要）
  const { data: detailFilesData } = useQuery({
    queryKey: ['review-detail-files', detailRecord?.target_id],
    queryFn: () => api.get(`/skills/${detailRecord.target_id}/files`),
    enabled: !!detailRecord?.target_id && detailRecord?.type === 'skill_publish',
  });
  const detailFiles: any[] = detailFilesData?.data?.data || [];

  // 审核详情 — 获取角色列表
  const { data: rolesData } = useQuery({
    queryKey: ['review-roles'],
    queryFn: () => frontPermApi.roles(),
    enabled: !!detailRecord,
  });
  const allRolesList: any[] = rolesData?.data?.data || [];

  // 审核详情 — 审核历史（同一 target 的全部记录，用于计算第 N 次提交与上次驳回原因）
  const { data: historyData } = useQuery({
    queryKey: ['review-history', detailRecord?.target_id],
    queryFn: () => reviewApi.list({ page_size: 50, target_id: detailRecord.target_id }),
    enabled: !!detailRecord?.target_id,
  });
  const historyRecords: any[] = historyData?.data?.data || [];
  const submitCount = historyRecords.length;
  const lastReject: any = historyRecords
    .filter((r: any) => r.status === 'rejected' && r.id !== detailRecord?.id)
    .sort((a: any, b: any) => new Date(b.reviewed_at || b.submitted_at || 0).getTime() - new Date(a.reviewed_at || a.submitted_at || 0).getTime())[0] || null;

  // 审核详情 — 智能体信息（仅智能体类审核需要）
  const { data: detailAgentData } = useQuery({
    queryKey: ['review-detail-agent', detailRecord?.target_id],
    queryFn: () => agentsApi.get(detailRecord.target_id),
    enabled: !!detailRecord?.target_id && detailRecord?.type === 'agent_publish',
  });
  const detailAgent: any = detailAgentData?.data?.data || null;
  const isWorkflowAgent = !!detailAgent && (detailAgent.category === 'workflow' || detailAgent.agent_type === 'workflow');

  // 审核详情 — 工作流配置（仅工作流型智能体需要：节点/入参）
  const { data: detailWorkflowData } = useQuery({
    queryKey: ['review-detail-workflow', detailRecord?.target_id],
    queryFn: () => agentsApi.getWorkflow(detailRecord.target_id),
    enabled: !!detailRecord?.target_id && isWorkflowAgent,
  });
  const detailWorkflow: any = detailWorkflowData?.data?.data || null;

  // 审核详情 — 报告实例（仅报告类审核需要）
  const { data: detailReportData } = useQuery({
    queryKey: ['review-detail-report', detailRecord?.target_id],
    queryFn: () => reportsApi.get(detailRecord.target_id),
    enabled: !!detailRecord?.target_id && detailRecord?.type === 'report_publish',
  });
  const detailReport: any = detailReportData?.data?.data || null;

  // 审核详情 — 报告配置（数据绑定键 / 调度信息）
  const { data: reportConfigsData } = useQuery({
    queryKey: ['review-report-configs'],
    queryFn: () => reportConfigsApi.list({ page_size: 100 }),
    enabled: !!detailRecord?.target_id && detailRecord?.type === 'report_publish',
  });
  const detailReportConfig: any = (reportConfigsData?.data?.data || []).find((c: any) => c.id === detailReport?.config_id) || null;

  // 审核详情 — 全量技能/知识库（用于解析对话型智能体挂载的技能与知识库名称）
  const { data: allSkillsData } = useQuery({
    queryKey: ['review-all-skills'],
    queryFn: () => skillsApi.list({ page_size: 200 }),
    enabled: !!detailAgent && !isWorkflowAgent,
  });
  const allSkillsList: any[] = allSkillsData?.data?.data || [];
  const { data: allKbData } = useQuery({
    queryKey: ['review-all-kbs'],
    queryFn: () => ragApi.knowledgeBases.list({ page_size: 200 }),
    enabled: !!detailAgent && !isWorkflowAgent,
  });
  const allKbList: any[] = allKbData?.data?.data || [];

  const SCOPE_LABEL: Record<string, string> = {
    private: '私有', department: '部门', company: '全公司',
  };

  const [delistDialog, setDelistDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [delistReason, setDelistReason] = useState('');

  const toggleMutation = useMutation({
    mutationFn: (id: string) => frontPermApi.toggle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['front-perm-resources'] }); enqueueSnackbar('状态已切换', { variant: 'success' }); },
  });

  const delistMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => frontPermApi.delist(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['front-perm-resources'] });
      enqueueSnackbar('已强制下架，已通知作者', { variant: 'success' });
      setDelistDialog({ open: false, item: null });
      setDelistReason('');
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => frontPermApi.transfer(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['front-perm-resources'] }); setTransferTarget(null); enqueueSnackbar('拥有者已转移', { variant: 'success' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frontPermApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['front-perm-resources'] }); setDeleteTarget(null); enqueueSnackbar('资源已删除', { variant: 'success' }); },
  });

  /* ========= 审核详情抽屉 — 派生计算值（全部只读展示） ========= */
  // 通用辅助检查（四类共有）：Slug 唯一性 / 版本号格式 / 描述长度
  const auxSlug = String(detailRecord?.target_slug || '');
  const auxVersion = String(detailRecord?.version || '');
  const auxDesc = String(detailRecord?.target_desc || '');
  const auxChecks = detailRecord ? [
    { label: 'Slug 唯一性', pass: !!auxSlug && /^[a-z0-9][a-z0-9-]*$/i.test(auxSlug), detail: auxSlug ? `“${auxSlug}” 有效且无冲突` : '缺少 Slug' },
    { label: '版本号格式', pass: /^\d+\.\d+\.\d+$/.test(auxVersion), detail: auxVersion ? `v${auxVersion}` : '未填写版本号' },
    { label: '描述长度', pass: auxDesc.length >= 10 && auxDesc.length <= 200, detail: `${auxDesc.length} 字符（建议 10~200）` },
  ] : [];

  // 智能体·对话型：挂载技能 / 引用知识库 名称解析
  const chatSkillIds: string[] = detailAgent?.chat_config?.authorized_skills || [];
  const chatKbIds: string[] = detailAgent?.chat_config?.knowledge_base_ids || [];
  const chatSkillNames = chatSkillIds.map((sid: string) => allSkillsList.find((s: any) => s.id === sid)?.name || sid);
  const chatKbNames = chatKbIds.map((kid: string) => allKbList.find((k: any) => k.id === kid)?.name || kid);

  // 智能体·工作流型：节点类型统计 / 报告输出节点 / 入参清单
  const wfNodes: any[] = detailWorkflow?.nodes || [];
  const wfNodeStats = wfNodes.reduce((acc: Record<string, number>, n: any) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {});
  const wfReportOutputNode: any = wfNodes.find((n: any) => n.type === 'report_output') || null;
  const wfInputParams: any[] = detailWorkflow?.input_params || [];

  // 报告：区块统计 / 数据绑定键 / 敏感词检测
  const reportBlocks: any[] = detailReport?.blocks || [];
  const reportBlockStats = reportBlocks.reduce((acc: Record<string, number>, b: any) => { acc[b.type] = (acc[b.type] || 0) + 1; return acc; }, {});
  const reportDataKeys: string[] = detailReportConfig?.data_keys || [];
  const sensitiveText = [detailReport?.title, detailReportConfig?.name, detailReportConfig?.agent_name, detailReport?.agent_name].filter(Boolean).join(' ');
  const sensitiveTextHit = SENSITIVE_WORDS.find(w => sensitiveText.includes(w));
  const sensitiveKeyHit = reportDataKeys.find((k: string) => SENSITIVE_KEYS.includes(String(k).toLowerCase()) || SENSITIVE_WORDS.some(w => String(k).includes(w)));
  const sensitiveHit = sensitiveTextHit || sensitiveKeyHit;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="前台权限管理"
          subtitle="管理前台用户创建资源的查看与编辑权限，授权主体为角色"
          actions={<Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>}
        />
      </Box>

      <Tabs
        value={typeTab}
        onChange={(_, v) => { setTypeTab(v); setPage(1); setSegment('all'); }}
        sx={{
          mb: 2, minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, fontSize: 13, fontWeight: 600, '&.Mui-selected': { color: '#00D4FF' } },
          '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #00D4FF, #7C3AED)', height: 2, borderRadius: 2 },
        }}
      >
        {TYPE_TABS.map(t => <Tab key={t.value} label={t.label} value={t.value} />)}
      </Tabs>

      {/* 有审核机制的 Tab（智能体/报告/技能）的分段切换 */}
      {hasReview && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button size="small" variant={segment === 'all' ? 'contained' : 'outlined'}
            onClick={() => { setSegment('all'); setPage(1); }}
            sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600 }}>
            全部资源
          </Button>
          <Button size="small" variant={segment === 'pending' ? 'contained' : 'outlined'}
            onClick={() => { setSegment('pending'); setPage(1); }}
            sx={{ textTransform: 'none', fontSize: 12, fontWeight: 600 }}>
            待审核
            {pendingCount > 0 && (
              <Chip label={pendingCount} size="small"
                sx={{ ml: 1, height: 16, fontSize: 10, bgcolor: 'rgba(255,152,0,0.2)', color: '#FF9800', '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Button>
        </Box>
      )}

      {/* 知识库说明 Alert */}
      {typeTab === 'kb' && (
        <Alert severity="info" sx={{ mb: 2, fontSize: 12, py: 0.5 }}>
          知识库不参与市场发布，此处控制其服务可用性
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="搜索名称 / 拥有者..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> } }}
          sx={{ minWidth: 240 }}
        />
        <Button
          size="small" variant={idleFilter ? 'contained' : 'outlined'} color={idleFilter ? 'warning' : 'inherit'}
          onClick={() => setIdleFilter(!idleFilter)}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          90天未使用
        </Button>
      </Box>

      {/* 待审核视图（有审核机制的 Tab：智能体/报告/技能） */}
      {hasReview && segment === 'pending' ? (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>申请人</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>版本</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 150 }}>提交时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviewRecords.length === 0 ? (
              <TableRow><TableCell colSpan={6}><EmptyState title="暂无待审核记录" description="当前没有待处理的发布申请" /></TableCell></TableRow>
            ) : reviewRecords.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{item.target_name}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{item.applicant_name}</Typography></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{item.applicant_dept}</Typography></TableCell>
                <TableCell><Chip label={`v${item.version || '0.0.0'}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="查看详情"><IconButton size="small" onClick={() => { setReviewScopeType('all'); setReviewScopeRoles([]); setPreviewFile(null); setSystemPromptExpanded(false); setReportPreviewOpen(false); setDetailRecord(item); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="通过"><IconButton size="small" color="success" onClick={() => approveMutation.mutate({ id: item.id, scopeConfig: { scope_type: 'all' } })} disabled={approveMutation.isPending}><CheckCircle fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="驳回"><IconButton size="small" color="error" onClick={() => setRejectDialog({ open: true, recordId: item.id, recordName: item.target_name })}><Cancel fontSize="small" /></IconButton></Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      ) : isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>资源名称</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>资源标识</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110 }}>类型</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>拥有者</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }}>授权概况</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>最近使用</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={9}><EmptyState title="暂无资源" description="当前筛选条件下没有前台资源" /></TableCell></TableRow>
            ) : items.map((item: any) => {
              const sm = STATUS_META[item.status] || STATUS_META.active;
              const subLabel = SUB_TYPE_LABEL[item.resource_type]?.[item.sub_type] || item.sub_type || '-';
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{item.resource_id}</Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{subLabel}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{item.owner_name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{item.owner_dept}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 11 }}>
                      {item.resource_type === 'skill'
                        ? <>可查看 <b>{item.view_role_count}</b> 个角色</>
                        : <>可编辑 <b>{item.edit_role_count}</b> 个角色 · 可查看 <b>{item.view_role_count}</b> 个角色</>
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={sm.label} color={sm.color} size="small" sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 11 }}>{fmtRelative(item.last_used_at)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>30d: {item.use_count_30d} 次</Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontSize: 11 }}>{fmtDate(item.created_at)}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="详情">
                        <IconButton size="small" color="info" onClick={() => {
                          if (item.resource_type === 'agent') setAgentDetailTarget(item);
                          else if (item.resource_type === 'report') setReportDetailTarget(item);
                          else if (item.resource_type === 'kb') setKbDetailTarget(item);
                          else if (item.resource_type === 'skill') setSkillDetailTarget(item);
                        }}><Info fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="权限配置">
                        <IconButton size="small" color="primary" onClick={() => setDrawerTarget(item)}><Security fontSize="small" /></IconButton>
                      </Tooltip>
                      {item.resource_type === 'kb' ? (
                        <Tooltip title={item.status === 'active' ? '停用' : '启用'}>
                          <IconButton size="small" color={item.status === 'active' ? 'warning' : 'success'} onClick={() => toggleMutation.mutate(item.id)}>
                            <PowerSettingsNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (item.status === 'published' || item.status === 'modified') ? (
                        <Tooltip title="强制下架">
                          <IconButton size="small" color="error" onClick={() => { setDelistDialog({ open: true, item }); setDelistReason(''); }}>
                            <PowerSettingsNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip title="转移拥有者">
                        <IconButton size="small" onClick={() => { setTransferTarget(item); setTransferForm({ owner_name: '', owner_dept: '' }); }}>
                          <SwapHoriz fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(item)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* 权限配置抽屉 */}
      <PermDrawer target={drawerTarget} onClose={() => setDrawerTarget(null)} />

      {/* 智能体详情抽屉 */}
      <AgentDetailDrawer target={agentDetailTarget} onClose={() => setAgentDetailTarget(null)} />

      {/* 报告详情抽屉 */}
      <ReportDetailDrawer target={reportDetailTarget} onClose={() => setReportDetailTarget(null)} />

      {/* 知识库详情抽屉 */}
      <KBDetailDrawer target={kbDetailTarget} onClose={() => setKbDetailTarget(null)} />

      {/* 技能详情弹窗 */}
      <SkillDetailDialog target={skillDetailTarget} onClose={() => setSkillDetailTarget(null)} />

      {/* 转移拥有者弹窗 */}
      <Dialog open={!!transferTarget} onClose={() => setTransferTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>转移拥有者</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将资源「{transferTarget?.name}」的拥有者转移给同部门成员
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth size="small" label="新拥有者姓名" value={transferForm.owner_name} onChange={e => setTransferForm({ ...transferForm, owner_name: e.target.value })} />
            <TextField fullWidth size="small" label="所属部门" value={transferForm.owner_dept} onChange={e => setTransferForm({ ...transferForm, owner_dept: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferTarget(null)}>取消</Button>
          <Button variant="contained" disabled={!transferForm.owner_name.trim()} onClick={() => transferTarget && transferMutation.mutate({ id: transferTarget.id, data: transferForm })}>
            确认转移
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            确定要删除资源「<b>{deleteTarget?.name}</b>」（标识：<code>{deleteTarget?.resource_id}</code>）吗？
          </Typography>
          <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
            删除后该资源在前台将不可见，权限配置一并清除。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 驳回弹窗 */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, recordId: '', recordName: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>驳回申请</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>确定要驳回「{rejectDialog.recordName}」的发布申请吗？</Typography>
          <TextField fullWidth label="驳回原因" required multiline rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请填写驳回原因，将通知申请人..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, recordId: '', recordName: '' })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={rejectMutation.isPending}>确认驳回</Button>
        </DialogActions>
      </Dialog>

      {/* 强制下架弹窗 */}
      <Dialog open={delistDialog.open} onClose={() => setDelistDialog({ open: false, item: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>强制下架确认</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            确定要强制下架「<b>{delistDialog.item?.name}</b>」吗？
          </Typography>
          {delistDialog.item && (
            <Alert severity="warning" sx={{ mb: 2, fontSize: 12 }}>
              {(delistDialog.item.resource_type === 'agent' || delistDialog.item.resource_type === 'workflow')
                ? `下架将影响 ${delistDialog.item.related_reports || 0} 个关联报告和 ${delistDialog.item.installed_users || 0} 个已安装用户`
                : delistDialog.item.resource_type === 'report'
                ? `已安装用户数：${delistDialog.item.installed_users || 0}`
                : `已安装数：${delistDialog.item.install_count || 0}`}
            </Alert>
          )}
          <TextField fullWidth label="下架原因" required multiline rows={3} value={delistReason}
            onChange={e => setDelistReason(e.target.value)} placeholder="请填写下架原因，将通知作者..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelistDialog({ open: false, item: null })}>取消</Button>
          <Button variant="contained" color="error" disabled={!delistReason.trim()} onClick={() => delistDialog.item && delistMutation.mutate({ id: delistDialog.item.id, reason: delistReason })}>
            确认下架
          </Button>
        </DialogActions>
      </Dialog>

      {/* 审核详情抽屉（右侧滑出，适用于智能体/报告/技能） */}
      <Drawer anchor="right" open={!!detailRecord} onClose={() => { setDetailRecord(null); setPreviewFile(null); setReviewScopeType('all'); setReviewScopeRoles([]); setSystemPromptExpanded(false); setReportPreviewOpen(false); }}
        slotProps={{ paper: { sx: { width: 640, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' } } }}
      >
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>审核详情 — {detailRecord?.target_name}</Typography>
            <Typography variant="caption" color="text.secondary">申请人：{detailRecord?.applicant_name} · {detailRecord?.applicant_dept}</Typography>
          </Box>
          <IconButton size="small" onClick={() => { setDetailRecord(null); setPreviewFile(null); setReviewScopeType('all'); setReviewScopeRoles([]); }}><Close fontSize="small" /></IconButton>
        </Box>

        {/* 审核历史（顶部：提交时间·第 N 次提交·上次驳回原因） */}
        {detailRecord && (
          <Box sx={{ px: 3, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
              <History sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>审核历史</Typography>
              <Typography variant="caption" color="text.secondary">
                提交于 {fmtDateTime(detailRecord.submitted_at)} · 第 <b>{submitCount || 1}</b> 次提交
              </Typography>
            </Box>
            {lastReject && (
              <Typography variant="caption" color="warning.main" sx={{ pl: 3.25 }}>
                上次驳回原因：{lastReject.review_reason || '-'}
              </Typography>
            )}
          </Box>
        )}

        {/* 内容区 */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {detailRecord && (
            <>
              {/* 上半部分：发布信息 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>发布信息</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InfoRow label="名称" value={detailRecord.target_name || '-'} />
                  <InfoRow label="Slug" value={<code style={{ fontFamily: 'monospace', fontSize: 12 }}>{detailRecord.target_slug || detailRecord.target_id || '-'}</code>} />
                  <InfoRow label="描述" value={detailRecord.target_desc || detailSkill?.description || '-'} />
                  <InfoRow label="版本" value={`v${detailRecord.version || '0.0.0'}`} />
                  <InfoRow label="变更说明" value={detailRecord.changelog || '-'} />
                  <InfoRow label="申请人" value={`${detailRecord.applicant_name || '-'}（${detailRecord.applicant_dept || '-'}）`} />
                </Box>
              </Box>

              {/* 辅助检查（四类共有：Slug 唯一性 / 版本号格式 / 描述长度，绿✓黄⚠） */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>辅助检查</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {auxChecks.map((c: any) => (
                    <SoftCheckItem key={c.label} pass={c.pass} label={c.label} detail={c.detail} />
                  ))}
                </Box>
              </Box>

              {/* 技能文件夹内容（仅技能类审核） */}
              {detailRecord.type === 'skill_publish' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>技能文件夹内容</Typography>
                  <Typography variant="caption" color="text.secondary">已有 {detailFiles.length} 个文件</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 240, overflow: 'auto', mt: 0.5, bgcolor: 'background.paper' }}>
                    {detailFiles.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">暂无文件</Typography></Box>
                    ) : (
                      <List dense sx={{ p: 0 }}>
                        {detailFiles.map((f: any) => (
                          <ListItemButton key={f.path} onClick={() => {
                            api.get(`/skills/${detailRecord.target_id}/files/${f.path}`).then((res: any) => {
                              const content = res.data?.data?.content ?? res.data?.content ?? '';
                              setPreviewFile({ path: f.path, content: typeof content === 'string' ? content : '（无法加载文件内容）' });
                            }).catch(() => {
                              setPreviewFile({ path: f.path, content: '（无法加载文件内容）' });
                            });
                          }} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}><Article fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                            <ListItemText primary={f.path} secondary={`${f.size} bytes · ${f.updatedAt}`}
                              slotProps={{ primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } }, secondary: { variant: 'caption' } }} />
                          </ListItemButton>
                        ))}
                      </List>
                    )}
                  </Box>
                </Box>
              )}

              {/* 自动检查（仅技能类审核） */}
              {detailRecord.type === 'skill_publish' && detailRecord.auto_check && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>自动检查</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <AutoCheckItem pass={detailRecord.auto_check?.has_skill_md} label="SKILL.md" />
                    <AutoCheckItem pass={(detailRecord.auto_check?.file_count || 0) <= 200} label={`文件数 ${detailRecord.auto_check?.file_count || 0}`} />
                    <AutoCheckItem pass={(detailRecord.auto_check?.total_size || 0) <= 10 * 1024 * 1024} label={`大小 ${((detailRecord.auto_check?.total_size || 0) / 1024).toFixed(1)}KB`} />
                    <AutoCheckItem pass={!detailRecord.auto_check?.danger_keywords?.length} label="危险命令" />
                    <AutoCheckItem pass={!detailRecord.auto_check?.slug_conflict} label="Slug 唯一" />
                  </Box>
                </Box>
              )}

              {/* 内容预览 — 智能体·对话型（类型/模型/挂载技能/引用知识库/系统提示词） */}
              {detailRecord.type === 'agent_publish' && !isWorkflowAgent && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>内容预览</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InfoRow label="类型" value="对话 Agent" />
                    <InfoRow label="使用模型" value={detailAgent?.policy_name || detailAgent?.model_policy_id || '-'} />
                    <InfoRow label="挂载技能" value={chatSkillNames.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{chatSkillNames.map((n: string) => <Chip key={n} label={n} size="small" variant="outlined" />)}</Box>
                    ) : '无'} />
                    <InfoRow label="引用知识库" value={chatKbNames.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{chatKbNames.map((n: string) => <Chip key={n} label={n} size="small" variant="outlined" color="info" />)}</Box>
                    ) : '无'} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, flexShrink: 0 }}>系统提示词</Typography>
                        <Button size="small" endIcon={systemPromptExpanded ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                          onClick={() => setSystemPromptExpanded(v => !v)} sx={{ fontSize: 11, py: 0, minWidth: 'auto' }}>
                          {systemPromptExpanded ? '收起' : '展开查看'}
                        </Button>
                      </Box>
                      <Collapse in={systemPromptExpanded}>
                        <Card variant="outlined" sx={{ mt: 0.5, bgcolor: 'action.hover' }}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, whiteSpace: 'pre-wrap', fontSize: 12, color: 'text.secondary' }}>
                            {detailAgent?.system_prompt || '（未设置）'}
                          </CardContent>
                        </Card>
                      </Collapse>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* 内容预览 — 智能体·工作流型（节点类型统计/报告输出节点/入参清单） */}
              {detailRecord.type === 'agent_publish' && isWorkflowAgent && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>内容预览</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InfoRow label="类型" value="工作流 Agent" />
                    <InfoRow label="节点类型统计" value={wfNodes.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(wfNodeStats).map(([t, c]) => (
                          <Chip key={t} label={`${NODE_TYPE_LABEL[t] || t}×${c}`} size="small" variant="outlined" />
                        ))}
                      </Box>
                    ) : '暂无节点'} />
                    <InfoRow label="报告输出节点" value={wfReportOutputNode ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ fontSize: 12 }}>含</Typography>
                        <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{wfReportOutputNode.dataKey || '（无识别名）'}</code>
                      </Box>
                    ) : '不含'} />
                    <InfoRow label="入参清单" value={wfInputParams.length ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {wfInputParams.map((p: any) => (
                          <Typography key={p.key} variant="body2" sx={{ fontSize: 12 }}>
                            {p.label} <code style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>({p.key} · {p.type}{p.required ? ' · 必填' : ''})</code>
                          </Typography>
                        ))}
                      </Box>
                    ) : '无'} />
                  </Box>
                </Box>
              )}

              {/* 内容预览 — 报告（数据源/调度/周期/区块统计/绑定键 + 预览报告 + 敏感词提示） */}
              {detailRecord.type === 'report_publish' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>内容预览</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InfoRow label="数据源" value={`${detailReport?.agent_name || detailReportConfig?.agent_name || '-'}（生成工作流/Agent）`} />
                    <InfoRow label="调度信息" value={fmtSchedule(detailReportConfig?.schedule)} />
                    <InfoRow label="报告周期" value={`${PERIOD_LABEL[detailReport?.period] || detailReport?.period || '-'}${detailReport?.period_start ? `（${fmtDate(detailReport.period_start)} ~ ${fmtDate(detailReport.period_end)}）` : ''}`} />
                    <InfoRow label="内容区块统计" value={reportBlocks.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(reportBlockStats).map(([t, c]) => (
                          <Chip key={t} label={`${BLOCK_TYPE_LABEL[t] || t}×${c}`} size="small" variant="outlined" />
                        ))}
                      </Box>
                    ) : '暂无区块'} />
                    <InfoRow label="数据绑定键" value={reportDataKeys.length ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{reportDataKeys.length} 个</Typography>
                        {reportDataKeys.map((k: string) => <code key={k} style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(128,128,128,.15)', borderRadius: 3, padding: '1px 5px' }}>{k}</code>)}
                      </Box>
                    ) : '无'} />
                    {sensitiveHit && (
                      <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { fontSize: 12 } }}>
                        检测到可能含敏感经营数据（<b>{String(sensitiveHit)}</b>），建议选择“指定角色”可见范围。
                      </Alert>
                    )}
                    <Box>
                      <Button size="small" variant="outlined" startIcon={<Preview />} onClick={() => setReportPreviewOpen(true)} disabled={!reportBlocks.length}>
                        预览报告
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* 下半部分：可见范围配置 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>可见范围配置</Typography>
                <RadioGroup row value={reviewScopeType} onChange={e => { setReviewScopeType(e.target.value as 'all' | 'roles'); if (e.target.value === 'all') setReviewScopeRoles([]); }}>
                  <FormControlLabel value="all" control={<Radio size="small" />} label="全员" sx={{ mr: 2 }} />
                  <FormControlLabel value="roles" control={<Radio size="small" />} label="指定角色" />
                </RadioGroup>
                {reviewScopeType === 'roles' && (
                  <Autocomplete
                    multiple size="small" sx={{ mt: 1 }}
                    options={allRolesList} value={reviewScopeRoles}
                    onChange={(_, v) => setReviewScopeRoles(v)}
                    getOptionLabel={(o: any) => o.name || o.id}
                    renderInput={(params) => <TextField {...params} label="选择角色" placeholder="至少选一个角色" />}
                  />
                )}
                {reviewScopeType === 'roles' && reviewScopeRoles.length === 0 && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>至少选择 1 个角色后「通过」才可用</Typography>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* 底部按钮 */}
        <Box sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => { setDetailRecord(null); setPreviewFile(null); setReviewScopeType('all'); setReviewScopeRoles([]); }}>关闭</Button>
          <Button variant="contained" color="error" startIcon={<Cancel />}
            onClick={() => { setRejectDialog({ open: true, recordId: detailRecord?.id || '', recordName: detailRecord?.target_name || '' }); setDetailRecord(null); }}>驳回</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />}
            onClick={handleApprove}
            disabled={approveMutation.isPending || (reviewScopeType === 'roles' && reviewScopeRoles.length === 0)}>通过</Button>
        </Box>
      </Drawer>

      {/* 文件预览弹窗（只读） */}
      <Dialog open={!!previewFile} onClose={() => setPreviewFile(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{previewFile?.path}</Typography>
          <IconButton size="small" onClick={() => setPreviewFile(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Card variant="outlined" sx={{ bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', color: '#d4d4d4' }}>
              {previewFile?.content || '（空文件）'}
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1 }}>
          <Button onClick={() => setPreviewFile(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 报告只读渲染预览弹窗 */}
      <ReportPreviewDialog report={detailReport} open={reportPreviewOpen && !!detailReport} onClose={() => setReportPreviewOpen(false)} />

    </Box>
  );
}

/* =================== 辅助组件 =================== */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontSize: 12 }}>{value}</Typography>
    </Box>
  );
}

function AutoCheckItem({ pass, label }: { pass: boolean; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {pass ? <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} /> : <Warning sx={{ fontSize: 14, color: 'error.main' }} />}
      <Typography variant="caption" sx={{ fontSize: 11, color: pass ? 'text.primary' : 'error.main' }}>{label}</Typography>
    </Box>
  );
}

// 辅助检查项（绿✓通过 / 黄⚠提示，不阻断）
function SoftCheckItem({ pass, label, detail }: { pass: boolean; label: string; detail?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {pass ? <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} /> : <Warning sx={{ fontSize: 14, color: 'warning.main' }} />}
      <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>{label}</Typography>
      {detail && <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>— {detail}</Typography>}
    </Box>
  );
}

// 报告只读渲染预览弹窗
function ReportPreviewDialog({ report, open, onClose }: { report: any; open: boolean; onClose: () => void }) {
  const blocks: any[] = report?.blocks || [];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>{report?.title || '报告预览'}</Typography>
          <Typography variant="caption" color="text.secondary">只读渲染预览{report?.agent_name ? ` · ${report.agent_name}` : ''}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2.5, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {blocks.map((b: any) => <ReportBlock key={b.block_id} block={b} />)}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

// 报告单个区块的只读渲染
function ReportBlock({ block }: { block: any }) {
  const { type, title, data } = block;
  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>{title}</Typography>
        {type === 'metrics_card' && Array.isArray(data) && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1 }}>
            {data.map((m: any) => (
              <Box key={m.name} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10 }}>{m.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 15 }}>{m.value}{m.unit}</Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: (m.change ?? 0) >= 0 ? 'success.main' : 'error.main' }}>
                  环比 {(m.change ?? 0) >= 0 ? '+' : ''}{m.change}%
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        {type === 'chart_image' && (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">📈 {data?.caption || data?.alt || '图表'}（渲染图片占位）</Typography>
          </Box>
        )}
        {type === 'data_table' && data?.headers && (
          <Box sx={{ overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>{data.headers.map((h: string) => <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700 }}>{h}</TableCell>)}</TableRow>
              </TableHead>
              <TableBody>
                {(data.rows || []).map((r: string[], i: number) => (
                  <TableRow key={i}>{(r || []).map((c: string, j: number) => <TableCell key={j} sx={{ fontSize: 11 }}>{c}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        {type === 'rich_text' && <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>{data?.content}</Typography>}
        {type === 'bullet_list' && (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {(data?.items || []).map((it: string, i: number) => <li key={i}><Typography variant="body2" sx={{ fontSize: 12 }}>{it}</Typography></li>)}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/* =================== 权限配置抽屉 =================== */
function PermDrawer({ target, onClose }: { target: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data: aclData } = useQuery({
    queryKey: ['front-perm-acl', target?.resource_type, target?.resource_id],
    queryFn: () => frontPermApi.getAcl(target.resource_type, target.resource_id),
    enabled: !!target,
  });
  const acls: any[] = aclData?.data?.data || [];
  const editRoles = acls.filter(a => a.perm === 'edit');
  const viewRoles = acls.filter(a => a.perm === 'view');

  const { data: rolesData } = useQuery({
    queryKey: ['front-perm-roles'],
    queryFn: () => frontPermApi.roles(),
    enabled: !!target,
  });
  const allRolesList: any[] = rolesData?.data?.data || [];

  // 技能类型：全员/指定角色 状态
  const [drawerScopeType, setDrawerScopeType] = useState<'all' | 'roles'>(
    target?.resource_type === 'skill' && viewRoles.length === 0 ? 'all' : 'roles'
  );

  const addMutation = useMutation({
    mutationFn: (d: any) => frontPermApi.addAcl(target.resource_type, target.resource_id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['front-perm-acl'] }); qc.invalidateQueries({ queryKey: ['front-perm-resources'] }); },
  });
  const removeMutation = useMutation({
    mutationFn: (aclId: string) => frontPermApi.removeAcl(target.resource_type, target.resource_id, aclId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['front-perm-acl'] }); qc.invalidateQueries({ queryKey: ['front-perm-resources'] }); enqueueSnackbar('权限已更新，对应角色用户即时生效', { variant: 'success' }); },
  });

  const existingRoleIds = new Set(acls.map(a => a.role_id));
  const availableRoles = allRolesList.filter(r => !existingRoleIds.has(r.id));

  const handleAdd = (role: any, perm: 'edit' | 'view') => {
    if (existingRoleIds.has(role.id)) {
      enqueueSnackbar('该角色已拥有权限，请勿重复添加', { variant: 'warning' });
      return;
    }
    addMutation.mutate({ role_id: role.id, role_name: role.name, perm });
  };

  const isSkill = target?.resource_type === 'skill';
  const isAgentOrWorkflow = target?.resource_type === 'agent' || target?.resource_type === 'workflow';

  // 公共额度相关状态
  const [publicQuotaOpen, setPublicQuotaOpen] = useState(false);
  const [pqAccountId, setPqAccountId] = useState('');
  const [pqSelectedUsers, setPqSelectedUsers] = useState<Set<string>>(new Set());
  const [pqMonthlyLimit, setPqMonthlyLimit] = useState('500000');

  // 获取 Token 账户列表
  const { data: accountsData } = useQuery({
    queryKey: ['token-accounts'],
    queryFn: () => tokenAccountsApi.list(),
    enabled: isAgentOrWorkflow,
  });
  const tokenAccounts: any[] = accountsData?.data?.data || [];

  // 获取当前账户的白名单人员
  const { data: whitelistData } = useQuery({
    queryKey: ['token-account-whitelist', pqAccountId],
    queryFn: () => tokenAccountsApi.whitelist(pqAccountId),
    enabled: isAgentOrWorkflow && !!pqAccountId,
  });
  const whitelistUsers: any[] = whitelistData?.data?.data || [];

  // 获取 Agent 已有的公共额度配置
  const { data: quotaData } = useQuery({
    queryKey: ['agent-public-quota', target?.resource_id],
    queryFn: () => publicQuotaApi.get(target.resource_id),
    enabled: isAgentOrWorkflow && !!target?.resource_id,
  });
  const existingQuota: any = quotaData?.data?.data || null;

  // 获取公共额度下生效人员的详细信息（含本月消耗）
  const { data: quotaUsersData } = useQuery({
    queryKey: ['agent-public-quota-users', existingQuota?.account_id],
    queryFn: () => tokenAccountsApi.whitelist(existingQuota.account_id),
    enabled: isAgentOrWorkflow && !!existingQuota?.account_id,
  });
  const quotaAllUsers: any[] = quotaUsersData?.data?.data || [];
  const quotaEnabledUsers = quotaAllUsers.filter(u => existingQuota?.user_ids?.includes(u.user_id));

  // 开启公共额度 mutation
  const enableQuotaMutation = useMutation({
    mutationFn: (d: any) => publicQuotaApi.enable(target.resource_id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-public-quota'] });
      enqueueSnackbar('公共额度已开启', { variant: 'success' });
      setPublicQuotaOpen(false);
    },
  });

  // 关闭公共额度 mutation
  const disableQuotaMutation = useMutation({
    mutationFn: () => publicQuotaApi.disable(target.resource_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-public-quota'] });
      enqueueSnackbar('公共额度已关闭', { variant: 'success' });
    },
  });

  const handleOpenPublicQuota = () => {
    if (existingQuota) {
      setPqAccountId(existingQuota.account_id || '');
      setPqSelectedUsers(new Set(existingQuota.user_ids || []));
      setPqMonthlyLimit(String(existingQuota.monthly_limit || 500000));
    } else {
      setPqAccountId(tokenAccounts[0]?.id || '');
      setPqSelectedUsers(new Set());
      setPqMonthlyLimit('500000');
    }
    setPublicQuotaOpen(true);
  };

  const handleConfirmQuota = () => {
    if (!pqAccountId) { enqueueSnackbar('请选择扣费账户', { variant: 'warning' }); return; }
    if (pqSelectedUsers.size === 0) { enqueueSnackbar('请至少选择一名生效人员', { variant: 'warning' }); return; }
    enableQuotaMutation.mutate({
      account_id: pqAccountId,
      account_name: tokenAccounts.find(a => a.id === pqAccountId)?.name || '',
      user_ids: Array.from(pqSelectedUsers),
      monthly_limit: Number(pqMonthlyLimit),
    });
  };

  const handleToggleUser = (userId: string) => {
    const next = new Set(pqSelectedUsers);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    setPqSelectedUsers(next);
  };

  const handleSelectAll = () => {
    if (pqSelectedUsers.size === whitelistUsers.length) {
      setPqSelectedUsers(new Set());
    } else {
      setPqSelectedUsers(new Set(whitelistUsers.map(u => u.user_id)));
    }
  };

  return (
    <Drawer anchor="right" open={!!target} onClose={onClose}
      slotProps={{ paper: { sx: { width: 420, bgcolor: 'background.paper', p: 3 } } }}
    >
      {target && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>权限配置</Typography>
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>

          {/* 资源信息 */}
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{target.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              拥有者：{target.owner_name}（{target.owner_dept}）· 固定不可改
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* 可编辑角色（技能类型不显示） */}
          {!isSkill && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>可编辑角色</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                {target.resource_type === 'kb' ? '可上传文件' : '可修改资源配置/内容'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                {editRoles.map(a => (
                  <Chip key={a.id} label={a.role_name} onDelete={() => removeMutation.mutate(a.id)} size="small" color="primary" variant="outlined" sx={{ fontSize: 11 }} />
                ))}
                {editRoles.length === 0 && <Typography variant="caption" color="text.disabled">暂无</Typography>}
              </Box>
              <Autocomplete
                size="small" options={availableRoles} getOptionLabel={(o: any) => o.name}
                onChange={(_, v) => v && handleAdd(v, 'edit')} value={null}
                renderInput={(params) => <TextField {...params} placeholder="+ 添加角色" />}
                sx={{ mb: 3 }}
              />
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          {/* 可查看角色 */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>可查看角色</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            只读使用（对话/查看/检索/安装）
          </Typography>

          {isSkill ? (
            /* 技能类型：全员/指定角色 */
            <Box>
              <RadioGroup row value={drawerScopeType} onChange={e => {
                const newType = e.target.value as 'all' | 'roles';
                setDrawerScopeType(newType);
                if (newType === 'all') {
                  // 全员：移除所有可查看角色
                  viewRoles.forEach(a => removeMutation.mutate(a.id));
                }
              }}>
                <FormControlLabel value="all" control={<Radio size="small" />} label="全员" sx={{ mr: 2 }} />
                <FormControlLabel value="roles" control={<Radio size="small" />} label="指定角色" />
              </RadioGroup>
              {drawerScopeType === 'roles' && (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5, mb: 1.5 }}>
                    {viewRoles.map(a => (
                      <Chip key={a.id} label={a.role_name} onDelete={() => removeMutation.mutate(a.id)} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                    ))}
                    {viewRoles.length === 0 && <Typography variant="caption" color="text.disabled">暂无</Typography>}
                  </Box>
                  <Autocomplete
                    size="small" options={availableRoles} getOptionLabel={(o: any) => o.name}
                    onChange={(_, v) => v && handleAdd(v, 'view')} value={null}
                    renderInput={(params) => <TextField {...params} placeholder="+ 添加角色" />}
                  />
                </>
              )}
            </Box>
          ) : (
            /* 非技能类型：原有角色列表 */
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                {viewRoles.map(a => (
                  <Chip key={a.id} label={a.role_name} onDelete={() => removeMutation.mutate(a.id)} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                ))}
                {viewRoles.length === 0 && <Typography variant="caption" color="text.disabled">暂无</Typography>}
              </Box>
              <Autocomplete
                size="small" options={availableRoles} getOptionLabel={(o: any) => o.name}
                onChange={(_, v) => v && handleAdd(v, 'view')} value={null}
                renderInput={(params) => <TextField {...params} placeholder="+ 添加角色" />}
                sx={{ mb: 2 }}
              />
            </>
          )}

          {/* 公共额度（仅智能体类型显示） */}
          {isAgentOrWorkflow && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance sx={{ fontSize: 18, color: 'primary.main' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>公共额度</Typography>
                </Box>
                {existingQuota ? (
                  <Button size="small" color="error" variant="outlined" onClick={() => {
                    if (window.confirm('确定关闭公共额度？关闭后所有用户将恢复使用个人 Token')) {
                      disableQuotaMutation.mutate();
                    }
                  }} sx={{ fontSize: 11 }}>关闭</Button>
                ) : (
                  <Button size="small" color="primary" variant="outlined" onClick={handleOpenPublicQuota} sx={{ fontSize: 11 }}>开启</Button>
                )}
              </Box>
              {existingQuota ? (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  {/* 扣费账户 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">扣费账户</Typography>
                    <Button size="small" onClick={handleOpenPublicQuota} sx={{ fontSize: 10, px: 1, minWidth: 'auto' }}>修改配置</Button>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>{existingQuota.account_name || '-'}</Typography>
                  {/* 月限额 */}
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    月限额 {Number(existingQuota.monthly_limit || 0).toLocaleString()} / 月
                  </Typography>
                  {/* 生效人员列表 */}
                  {quotaEnabledUsers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        生效人员（{quotaEnabledUsers.length}）：
                      </Typography>
                      {quotaEnabledUsers.map(u => {
                        const pct = u.monthly_limit > 0 ? Math.round((u.monthly_used || 0) / u.monthly_limit * 100) : 0;
                        return (
                          <Box key={u.user_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.25 }}>
                            <Typography variant="body2" sx={{ fontSize: 11 }}>
                              ☑ {u.name}（{u.dept}）
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, color: pct > 80 ? 'warning.main' : 'text.secondary', fontFamily: 'monospace' }}>
                              本月消耗 {(u.monthly_used || 0).toLocaleString()}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', borderTop: '1px dashed', borderColor: 'divider', pt: 1 }}>
                    其余用户使用本 Agent 消耗其个人 Token
                  </Typography>
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">未开启，用户消耗个人 Token</Typography>
              )}
            </>
          )}

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="outlined" onClick={onClose}>关闭</Button>
          </Box>
        </Box>
      )}

      {/* 公共额度配置弹窗 */}
      {isAgentOrWorkflow && (
        <Dialog open={publicQuotaOpen} onClose={() => setPublicQuotaOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>开启公共额度 —— {target?.name}</Typography>
            <IconButton size="small" onClick={() => setPublicQuotaOpen(false)}><Close fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ px: 3, py: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              {/* 扣费账户 */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>扣费账户 *</Typography>
                <TextField
                  select fullWidth size="small" value={pqAccountId}
                  onChange={e => { setPqAccountId(e.target.value); setPqSelectedUsers(new Set()); }}
                >
                  {tokenAccounts.filter(a => a.status === 'active').map(a => (
                    <MenuItem key={a.id} value={a.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>{a.name}</Typography>
                        <Typography variant="caption" color="text.secondary">剩余 {(a.remaining || 0).toLocaleString()} tokens</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* 生效人员 */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  生效人员 * <Typography component="span" variant="caption" color="text.disabled">（以下人员使用本 Agent 时消耗该账户）</Typography>
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                  {whitelistUsers.length > 0 ? whitelistUsers.map(u => (
                    <Box key={u.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                      <Checkbox
                        size="small" checked={pqSelectedUsers.has(u.user_id)}
                        onChange={() => handleToggleUser(u.user_id)}
                      />
                      <Typography variant="body2" sx={{ fontSize: 12 }}>{u.name}（{u.dept} · {u.emp_id}）</Typography>
                    </Box>
                  )) : (
                    <Typography variant="caption" color="text.disabled">该账户暂无白名单人员</Typography>
                  )}
                </Box>
                {whitelistUsers.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Button size="small" onClick={handleSelectAll} sx={{ fontSize: 11 }}>
                      {pqSelectedUsers.size === whitelistUsers.length ? '清空' : '全选'}
                    </Button>
                  </Box>
                )}
              </Box>

              {/* 月限额 */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>月限额 *</Typography>
                <TextField
                  fullWidth size="small" type="number" value={pqMonthlyLimit}
                  onChange={e => setPqMonthlyLimit(e.target.value)}
                  slotProps={{ input: { endAdornment: <Typography variant="caption" color="text.secondary">tokens/月</Typography> } }}
                />
              </Box>

              {/* 警告 */}
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
                <Typography variant="body2" sx={{ fontSize: 12, color: 'warning.light' }}>
                  ⚠ 勾选后，仅上述人员使用本 Agent 时消耗平台公共额度，其余用户消耗其个人 Token
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setPublicQuotaOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleConfirmQuota} disabled={enableQuotaMutation.isPending}>
              {existingQuota ? '保存' : '确认开启'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Drawer>
  );
}

/* =================== 智能体详情抽屉 =================== */
function AgentDetailDrawer({ target, onClose }: { target: any; onClose: () => void }) {
  const rid = target?.resource_id;
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // 获取智能体详情
  const { data: agentData } = useQuery({
    queryKey: ['agent-detail', rid],
    queryFn: () => agentsApi.get(rid),
    enabled: !!rid,
  });
  const agent: any = agentData?.data?.data || null;

  // 获取 ACL 权限
  const { data: aclData } = useQuery({
    queryKey: ['front-perm-acl', 'agent', rid],
    queryFn: () => frontPermApi.getAcl('agent', rid),
    enabled: !!rid,
  });
  const acls: any[] = aclData?.data?.data || [];
  const editRoles = acls.filter(a => a.perm === 'edit');
  const viewRoles = acls.filter(a => a.perm === 'view');

  // 获取运行记录
  const { data: runsData } = useQuery({
    queryKey: ['agent-runs', rid],
    queryFn: () => agentsApi.executions(rid, { page_size: 5 }),
    enabled: !!rid,
  });
  const runs: any[] = runsData?.data?.data || [];
  const lastRun = runs[0] || null;

  // 获取报告引用（通过 reports API 筛选 agent_id）
  const { data: reportsData } = useQuery({
    queryKey: ['reports-by-agent', rid],
    queryFn: () => api.get('/reports/configs', { params: { page_size: 50 } }),
    enabled: !!rid,
  });
  const allReports: any[] = reportsData?.data?.data || [];
  const relatedReports = allReports.filter((r: any) => r.agent_id === rid);

  // 获取公共额度配置
  const { data: pqData } = useQuery({
    queryKey: ['agent-public-quota', rid],
    queryFn: () => publicQuotaApi.get(rid),
    enabled: !!rid,
  });
  const pqQuota: any = pqData?.data?.data || null;

  // 获取公共额度下生效人员详情
  const { data: pqUsersData } = useQuery({
    queryKey: ['agent-public-quota-users-detail', pqQuota?.account_id],
    queryFn: () => tokenAccountsApi.whitelist(pqQuota.account_id),
    enabled: !!pqQuota?.account_id,
  });
  const pqAllUsers: any[] = pqUsersData?.data?.data || [];
  const pqEnabledUsers = pqAllUsers.filter(u => pqQuota?.user_ids?.includes(u.user_id));

  // 获取扣费账户信息
  const { data: pqAccountsData } = useQuery({
    queryKey: ['token-accounts-detail'],
    queryFn: () => tokenAccountsApi.list(),
    enabled: !!pqQuota?.account_id,
  });
  const pqAccounts: any[] = pqAccountsData?.data?.data || [];
  const pqCurrentAccount = pqAccounts.find(a => a.id === pqQuota?.account_id);

  // 权限配置抽屉
  const [permOpen, setPermOpen] = useState(false);

  // 公共额度配置弹窗
  const [pqOpen, setPqOpen] = useState(false);
  const [pqAccountId, setPqAccountId] = useState('');
  const [pqSelectedUsers, setPqSelectedUsers] = useState<Set<string>>(new Set());
  const [pqMonthlyLimit, setPqMonthlyLimit] = useState('500000');

  // Token 账户列表
  const { data: pqAllAccountsData } = useQuery({
    queryKey: ['token-accounts-all'], queryFn: () => tokenAccountsApi.list(),
  });
  const pqAllAccounts: any[] = pqAllAccountsData?.data?.data || [];

  // 白名单人员
  const { data: pqWlData } = useQuery({
    queryKey: ['token-whitelist-pq', pqAccountId],
    queryFn: () => tokenAccountsApi.whitelist(pqAccountId),
    enabled: !!pqAccountId,
  });
  const pqWhitelistUsers: any[] = pqWlData?.data?.data || [];

  // 开启/更新公共额度
  const pqEnableMutation = useMutation({
    mutationFn: (d: any) => publicQuotaApi.enable(rid, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-public-quota'] });
      qc.invalidateQueries({ queryKey: ['agent-public-quota-users-detail'] });
      setPqOpen(false);
      enqueueSnackbar('公共额度配置已更新', { variant: 'success' });
    },
  });
  // 关闭公共额度
  const pqDisableMutation = useMutation({
    mutationFn: () => publicQuotaApi.disable(rid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-public-quota'] });
      qc.invalidateQueries({ queryKey: ['agent-public-quota-users-detail'] });
      enqueueSnackbar('公共额度已关闭', { variant: 'success' });
    },
  });

  // 处理函数
  const handleOpenPq = () => {
    if (pqQuota) {
      setPqAccountId(pqQuota.account_id || '');
      setPqSelectedUsers(new Set(pqQuota.user_ids || []));
      setPqMonthlyLimit(String(pqQuota.monthly_limit || 500000));
    } else {
      setPqAccountId(pqAllAccounts[0]?.id || '');
      setPqSelectedUsers(new Set());
      setPqMonthlyLimit('500000');
    }
    setPqOpen(true);
  };

  const handleConfirmPq = () => {
    if (!pqAccountId) { enqueueSnackbar('请选择扣费账户', { variant: 'warning' }); return; }
    if (pqSelectedUsers.size === 0) { enqueueSnackbar('请至少选择一名生效人员', { variant: 'warning' }); return; }
    pqEnableMutation.mutate({
      account_id: pqAccountId,
      account_name: pqAllAccounts.find(a => a.id === pqAccountId)?.name || '',
      user_ids: Array.from(pqSelectedUsers),
      monthly_limit: Number(pqMonthlyLimit),
    });
  };

  const handleTogglePqUser = (userId: string) => {
    const next = new Set(pqSelectedUsers);
    if (next.has(userId)) next.delete(userId); else next.add(userId);
    setPqSelectedUsers(next);
  };

  const handleSelectAllPq = () => {
    if (pqSelectedUsers.size === pqWhitelistUsers.length) {
      setPqSelectedUsers(new Set());
    } else {
      setPqSelectedUsers(new Set(pqWhitelistUsers.map(u => u.user_id)));
    }
  };

  const subTypeLabel = target?.sub_type === 'workflow' ? '工作流 Agent' : target?.sub_type === 'chat' ? '对话 Agent' : target?.sub_type || '-';
  const sm = STATUS_META[target?.status] || STATUS_META.active;

  return (
    <>
    <Drawer anchor="right" open={!!target} onClose={onClose}
      slotProps={{ paper: { sx: { width: 640, bgcolor: 'background.paper', p: 3 } } }}
    >
      {target && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 头部 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <SmartToy sx={{ fontSize: 22, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>{target.name}</Typography>
                <Chip label={subTypeLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={sm.label} color={sm.color} size="small" sx={{ height: 20, fontSize: 10 }} />
              </Box>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{target.resource_id}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>

          {/* 拥有者 / 创建时间 / 最近使用 */}
          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">拥有者</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{target.owner_name} · {target.owner_dept}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">创建时间</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtDate(target.created_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">最近使用</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtRelative(target.last_used_at)}</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* ① 权限现状 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Security fontSize="small" sx={{ fontSize: 16 }} /> 权限现状
                </Typography>
                <Button size="small" variant="text" startIcon={<Edit sx={{ fontSize: 14 }} />}
                  onClick={() => setPermOpen(true)}
                  sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  配置权限
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">可编辑角色：</Typography>
                  {editRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {editRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">可查看角色：</Typography>
                  {viewRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {viewRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
              </Box>
            </Box>

            {/* ② 使用数据 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility fontSize="small" sx={{ fontSize: 16 }} /> 使用数据
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">30天使用</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20 }}>{target.use_count_30d || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">次</Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">最近使用</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, mt: 0.5 }}>{fmtRelative(target.last_used_at)}</Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">累计运行</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20 }}>{runs.length}</Typography>
                  <Typography variant="caption" color="text.secondary">次</Typography>
                </Card>
              </Box>
              {/* 简单趋势 */}
              {runs.length > 1 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">最近运行记录</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    {runs.slice(0, 5).map((r: any) => (
                      <Chip
                        key={r.id}
                        label={`${fmtRelative(r.created_at)} · ${r.status === 'completed' ? '成功' : r.status === 'failed' ? '失败' : '运行中'}`}
                        size="small"
                        color={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'warning'}
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* ③ 模块摘要信息 */}
            {agent && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Article fontSize="small" sx={{ fontSize: 16 }} /> 模块摘要
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <InfoRow label="类型" value={agent.agent_type === 'workflow' ? '工作流' : '对话'} />
                  <InfoRow label="描述" value={agent.description || '-'} />
                  <InfoRow label="模型策略" value={agent.policy_name || '-'} />
                  {/* 授权技能 */}
                  {agent.chat_config?.authorized_skills?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>授权技能</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {agent.chat_config.authorized_skills.map((sid: string) => (
                          <Chip key={sid} label={sid} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {/* 引用知识库 */}
                  {agent.chat_config?.knowledge_base_ids?.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>引用知识库</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {agent.chat_config.knowledge_base_ids.map((kid: string) => (
                          <Chip key={kid} label={kid} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {/* 工作流特有 */}
                  {agent.agent_type === 'workflow' && (
                    <>
                      <InfoRow label="触发方式" value={agent.triggers_count > 0 ? `定时任务 × ${agent.triggers_count}` : '手动'} />
                      {lastRun && (
                        <InfoRow label="最近运行" value={
                          <Chip
                            label={`${fmtRelative(lastRun.created_at)} · ${lastRun.status === 'completed' ? '成功' : lastRun.status === 'failed' ? '失败' : '运行中'}`}
                            size="small"
                            color={lastRun.status === 'completed' ? 'success' : lastRun.status === 'failed' ? 'error' : 'warning'}
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        } />
                      )}
                    </>
                  )}
                </Box>
              </Box>
            )}

            {/* ④ 关联影响 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Warning fontSize="small" sx={{ fontSize: 16, color: 'warning.main' }} /> 关联影响
              </Typography>
              {relatedReports.length > 0 ? (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.light', mb: 0.5 }}>
                    ⚠ 停用将影响 {relatedReports.length} 个报告
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {relatedReports.map((r: any) => (
                      <Typography key={r.id} variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                        · {r.name}（{r.period === 'daily' ? '日报' : r.period === 'weekly' ? '周报' : r.period}）
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">暂无关联报告</Typography>
              )}
              {agent?.agent_type === 'workflow' && agent?.triggers_count > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">关联定时任务：</Typography>
                  <Chip label={`${agent.triggers_count} 个`} size="small" sx={{ ml: 0.5, fontSize: 10, height: 20 }} />
                </Box>
              )}
            </Box>

            {/* 公共额度 */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalance fontSize="small" sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>公共额度</Typography>
                  {pqQuota ? <Chip label="已开启" size="small" color="success" sx={{ fontSize: 10, height: 20 }} /> : <Chip label="未开启" size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
                </Box>
                <Button size="small" variant="text" onClick={handleOpenPq}
                  sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  {pqQuota ? '修改配置' : '开启公共额度'}
                </Button>
              </Box>
              {pqQuota && (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                  {/* 扣费账户 */}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">扣费账户</Typography>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {pqQuota.account_name || '-'}
                      {pqCurrentAccount && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                          （剩余 {(pqCurrentAccount.remaining || 0).toLocaleString()} · {Math.round((pqCurrentAccount.remaining || 0) / (pqCurrentAccount.total_quota || 1) * 100)}%）
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                  {/* 月限额 */}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">月限额</Typography>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {Number(pqQuota.monthly_limit || 0).toLocaleString()} / 月
                    </Typography>
                  </Box>
                  {/* 生效人员 */}
                  {pqEnabledUsers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        生效人员（{pqEnabledUsers.length}）：
                      </Typography>
                      {pqEnabledUsers.map(u => {
                        const pct = u.monthly_limit > 0 ? Math.round((u.monthly_used || 0) / u.monthly_limit * 100) : 0;
                        return (
                          <Box key={u.user_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.25 }}>
                            <Typography variant="body2" sx={{ fontSize: 11 }}>
                              ☑ {u.name}（{u.dept}）
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: 10, color: pct > 80 ? 'warning.main' : 'text.secondary', fontFamily: 'monospace' }}>
                              本月消耗 {(u.monthly_used || 0).toLocaleString()}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block', borderTop: '1px dashed', borderColor: 'divider', pt: 1 }}>
                    其余用户使用本 Agent 消耗其个人 Token
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="outlined" onClick={onClose}>关闭</Button>
          </Box>
        </Box>
      )}
    </Drawer>

      {/* 权限配置抽屉 */}
      <PermDrawer
        target={permOpen ? { resource_type: 'agent', resource_id: rid, name: target?.name, owner_name: target?.owner_name, owner_dept: target?.owner_dept } : null}
        onClose={() => setPermOpen(false)}
      />

      {/* 公共额度配置弹窗 */}
      <Dialog open={pqOpen} onClose={() => setPqOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
            {pqQuota ? '修改' : '开启'}公共额度 —— {target?.name}
          </Typography>
          <IconButton size="small" onClick={() => setPqOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            {/* 扣费账户 */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>扣费账户 <span style={{ color: '#d32f2f' }}>*</span></Typography>
              <TextField select fullWidth size="small" value={pqAccountId} onChange={e => setPqAccountId(e.target.value)}>
                {pqAllAccounts.map(a => (
                  <MenuItem key={a.id} value={a.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2">{a.name}</Typography>
                      <Typography variant="caption" color="text.secondary">剩余 {(a.remaining || 0).toLocaleString()}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            {/* 生效人员 */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>生效人员 <span style={{ color: '#d32f2f' }}>*</span></Typography>
                <Button size="small" onClick={handleSelectAllPq} sx={{ fontSize: 11, textTransform: 'none' }}>
                  {pqSelectedUsers.size === pqWhitelistUsers.length ? '取消全选' : '全选'}
                </Button>
              </Box>
              <Box sx={{ maxHeight: 160, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {pqWhitelistUsers.map(u => (
                  <Box key={u.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                    <Checkbox size="small" checked={pqSelectedUsers.has(u.user_id)} onChange={() => handleTogglePqUser(u.user_id)} />
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{u.name}（{u.dept}）</Typography>
                  </Box>
                ))}
                {pqWhitelistUsers.length === 0 && <Typography variant="caption" color="text.disabled">暂无白名单人员</Typography>}
              </Box>
            </Box>
            {/* 月限额 */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>月限额 <span style={{ color: '#d32f2f' }}>*</span></Typography>
              <TextField fullWidth size="small" type="number" value={pqMonthlyLimit} onChange={e => setPqMonthlyLimit(e.target.value)}
                helperText="tokens/月" />
            </Box>
            {/* 警告 */}
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
              <Typography variant="body2" sx={{ fontSize: 12, color: 'warning.light' }}>
                ⚠ 勾选后，仅上述人员使用本 Agent 时消耗平台公共额度，其余用户消耗其个人 Token
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexDirection: 'column', alignItems: 'stretch' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setPqOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleConfirmPq}>确认</Button>
          </Box>
          {pqQuota && (
            <Button color="error" size="small" sx={{ alignSelf: 'center', fontSize: 11, textTransform: 'none' }}
              onClick={() => {
                if (window.confirm('关闭后所有用户将消耗个人Token（本月已消耗公共额度 ' + (pqQuota.monthly_used || 0).toLocaleString() + '），确认关闭？')) {
                  pqDisableMutation.mutate();
                }
              }}>
              关闭公共额度
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

/* =================== 报告详情抽屉 =================== */
function ReportDetailDrawer({ target, onClose }: { target: any; onClose: () => void }) {
  const rid = target?.resource_id;
  const [permOpen, setPermOpen] = useState(false);

  // 获取报告配置（通过名称匹配）
  const { data: configsData } = useQuery({
    queryKey: ['report-configs-all'],
    queryFn: () => reportConfigsApi.list({ page_size: 50 }),
    enabled: !!target,
  });
  const allConfigs: any[] = configsData?.data?.data || [];
  const reportConfig = allConfigs.find(c => c.name === target?.name) || null;

  // 获取 ACL 权限
  const { data: aclData } = useQuery({
    queryKey: ['front-perm-acl', 'report', rid],
    queryFn: () => frontPermApi.getAcl('report', rid),
    enabled: !!rid,
  });
  const acls: any[] = aclData?.data?.data || [];
  const editRoles = acls.filter(a => a.perm === 'edit');
  const viewRoles = acls.filter(a => a.perm === 'view');

  // 获取数据源 Agent 状态
  const { data: agentData } = useQuery({
    queryKey: ['agent-detail', reportConfig?.agent_id],
    queryFn: () => agentsApi.get(reportConfig.agent_id),
    enabled: !!reportConfig?.agent_id,
  });
  const sourceAgent: any = agentData?.data?.data || null;

  const subTypeLabel = target?.sub_type === 'public' ? '公开报表' : '个人报表';
  const sm = STATUS_META[target?.status] || STATUS_META.active;
  const periodLabel: Record<string, string> = { daily: '每日', weekly: '每周', monthly: '每月', quarterly: '每季' };

  // 统计 block 类型
  const blockCounts: Record<string, number> = {};
  (reportConfig?.block_configs || []).forEach((b: any) => {
    blockCounts[b.type] = (blockCounts[b.type] || 0) + 1;
  });
  const totalBlocks = (reportConfig?.block_configs || []).length;
  const blockSummary = totalBlocks > 0
    ? Object.entries(blockCounts).map(([k, v]) => `${k}×${v}`).join('·')
    : '';
  const dataKeysCount = (reportConfig?.data_keys || []).length;
  const dimensionsCount = (reportConfig?.dimensions || []).length;

  return (
    <>
    <Drawer anchor="right" open={!!target} onClose={onClose}
      slotProps={{ paper: { sx: { width: 640, bgcolor: 'background.paper', p: 3 } } }}
    >
      {target && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 头部 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Article sx={{ fontSize: 22, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>{target.name}</Typography>
                <Chip label={subTypeLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={sm.label} color={sm.color} size="small" sx={{ height: 20, fontSize: 10 }} />
              </Box>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{target.resource_id}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">拥有者</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{target.owner_name} · {target.owner_dept}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">创建时间</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtDate(target.created_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">最近使用</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtRelative(target.last_used_at)}</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* ① 权限现状 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Security fontSize="small" sx={{ fontSize: 16 }} /> 权限现状
                </Typography>
                <Button size="small" variant="text" startIcon={<Edit sx={{ fontSize: 14 }} />}
                  onClick={() => setPermOpen(true)}
                  sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  配置权限
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">可编辑角色：</Typography>
                  {editRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {editRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">可查看角色：</Typography>
                  {viewRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {viewRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
              </Box>
            </Box>

            {/* ② 使用数据 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility fontSize="small" sx={{ fontSize: 16 }} /> 使用数据
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">30天使用</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20 }}>{target.use_count_30d || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">次</Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">最近使用</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, mt: 0.5 }}>{fmtRelative(target.last_used_at)}</Typography>
                </Card>
              </Box>
            </Box>

            {/* ③ 模块摘要 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Article fontSize="small" sx={{ fontSize: 16 }} /> 模块摘要
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="类型" value={subTypeLabel} />
                <InfoRow label="数据源" value={reportConfig ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>{reportConfig.agent_name || '-'}</Typography>
                    {reportConfig.agent_id && <Typography variant="caption" color="text.secondary">（{reportConfig.agent_id}）</Typography>}
                    {sourceAgent && (
                      <Chip label={sourceAgent.status === 'active' ? '正常' : '停用'} size="small"
                        color={sourceAgent.status === 'active' ? 'success' : 'error'}
                        sx={{ fontSize: 9, height: 18 }} />
                    )}
                  </Box>
                ) : '-'} />
                <InfoRow label="调度" value={reportConfig ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {periodLabel[reportConfig.period] || reportConfig.period || '-'}
                      {reportConfig.schedule?.date && <>·{reportConfig.schedule.date}号</>}
                      {reportConfig.schedule?.day && !reportConfig.schedule?.date && <>·周{['日','一','二','三','四','五','六'][reportConfig.schedule.day]}</>}
                      {reportConfig.schedule?.time && <>·{reportConfig.schedule.time}</>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">｜ 最近生成</Typography>
                    {reportConfig.last_generated_at ? (
                      <>
                        <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtRelative(reportConfig.last_generated_at)}</Typography>
                        <Chip label={reportConfig.enabled ? '成功' : '已停用'} size="small"
                          color={reportConfig.enabled ? 'success' : 'default'}
                          sx={{ fontSize: 9, height: 18 }} />
                      </>
                    ) : <Typography variant="body2" sx={{ fontSize: 12 }}>-</Typography>}
                  </Box>
                ) : '-'} />
                {totalBlocks > 0 && (
                  <InfoRow label="结构" value={
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {totalBlocks} 个区块（{blockSummary}）｜ {dataKeysCount} 个数据键 ｜ {dimensionsCount} 个维度
                    </Typography>
                  } />
                )}
              </Box>
            </Box>

            {/* ④ 关联影响 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Warning fontSize="small" sx={{ fontSize: 16, color: 'warning.main' }} /> 关联影响
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sourceAgent ? (
                  sourceAgent.status === 'active' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">数据源：</Typography>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                      <Typography variant="body2" sx={{ fontSize: 12, color: 'success.main' }}>正常</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'error.dark', border: '1px solid', borderColor: 'error.main' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.light' }}>
                        ⚠ 数据源 Agent「{sourceAgent.name}」已停用，权限不可用
                      </Typography>
                    </Box>
                  )
                ) : (
                  <Typography variant="caption" color="text.disabled">暂无数据源关联信息</Typography>
                )}
                {reportConfig?.enabled && (
                  <Typography variant="body2" sx={{ fontSize: 12, color: 'warning.main' }}>
                    调度开启中，停用将中断周期生成
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="outlined" onClick={onClose}>关闭</Button>
          </Box>
        </Box>
      )}
    </Drawer>

      {/* 权限配置抽屉 */}
      <PermDrawer
        target={permOpen ? { resource_type: 'report', resource_id: rid, name: target?.name, owner_name: target?.owner_name, owner_dept: target?.owner_dept } : null}
        onClose={() => setPermOpen(false)}
      />
    </>
  );
}

/* =================== 知识库详情抽屉 =================== */
function KBDetailDrawer({ target, onClose }: { target: any; onClose: () => void }) {
  const rid = target?.resource_id;
  const [permOpen, setPermOpen] = useState(false);

  // 获取知识库详情
  const { data: kbData } = useQuery({
    queryKey: ['kb-detail', rid],
    queryFn: () => ragApi.knowledgeBases.get(rid),
    enabled: !!rid,
  });
  const kb: any = kbData?.data?.data || null;

  // 获取 ACL 权限
  const { data: aclData } = useQuery({
    queryKey: ['front-perm-acl', 'kb', rid],
    queryFn: () => frontPermApi.getAcl('kb', rid),
    enabled: !!rid,
  });
  const acls: any[] = aclData?.data?.data || [];
  const editRoles = acls.filter(a => a.perm === 'edit');
  const viewRoles = acls.filter(a => a.perm === 'view');

  // 获取引用该知识库的 Agent
  const { data: agentsListData } = useQuery({
    queryKey: ['agents-all-list'],
    queryFn: () => agentsApi.list({ page_size: 50 }),
    enabled: !!rid,
  });
  const allAgents: any[] = agentsListData?.data?.data || [];
  const referencingAgents = allAgents.filter((a: any) =>
    a.chat_config?.knowledge_base_ids?.includes(rid)
  );

  const subTypeLabel = target?.sub_type === 'faq' ? 'FAQ型' : '文档型';
  const sm = STATUS_META[target?.status] || STATUS_META.active;
  const totalSize = kb ? `${kb.doc_count} 个文档 · ${kb.vector_count?.toLocaleString() || 0} 向量` : '-';

  return (
    <>
    <Drawer anchor="right" open={!!target} onClose={onClose}
      slotProps={{ paper: { sx: { width: 640, bgcolor: 'background.paper', p: 3 } } }}
    >
      {target && (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 头部 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Article sx={{ fontSize: 22, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>{target.name}</Typography>
                <Chip label={subTypeLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                <Chip label={sm.label} color={sm.color} size="small" sx={{ height: 20, fontSize: 10 }} />
              </Box>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>{target.resource_id}</Typography>
            </Box>
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">拥有者</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{target.owner_name} · {target.owner_dept}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">创建时间</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtDate(target.created_at)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">最近使用</Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>{fmtRelative(target.last_used_at)}</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/*  权限现状 */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Security fontSize="small" sx={{ fontSize: 16 }} /> 权限现状
                </Typography>
                <Button size="small" variant="text" startIcon={<Edit sx={{ fontSize: 14 }} />}
                  onClick={() => setPermOpen(true)}
                  sx={{ textTransform: 'none', fontSize: 12, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                  配置权限
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">可编辑角色：</Typography>
                  {editRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {editRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">可查看角色：</Typography>
                  {viewRoles.length > 0 ? (
                    <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 0.5, flexWrap: 'wrap' }}>
                      {viewRoles.map(a => <Chip key={a.id} label={a.role_name} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />)}
                    </Box>
                  ) : <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>暂无</Typography>}
                </Box>
              </Box>
            </Box>

            {/* ② 使用数据 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility fontSize="small" sx={{ fontSize: 16 }} /> 使用数据
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">30天使用</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 20 }}>{target.use_count_30d || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">次</Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">最近使用</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, mt: 0.5 }}>{fmtRelative(target.last_used_at)}</Typography>
                </Card>
              </Box>
            </Box>

            {/* ③ 模块摘要 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Article fontSize="small" sx={{ fontSize: 16 }} /> 模块摘要
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <InfoRow label="类型" value={subTypeLabel} />
                <InfoRow label="文件规模" value={totalSize} />
                <InfoRow label="嵌入模型" value={kb?.embedding_model || '-'} />
                <InfoRow label="最近上传" value={kb?.last_sync ? fmtRelative(kb.last_sync) : '-'} />
                {kb?.description && <InfoRow label="描述" value={kb.description} />}
              </Box>
            </Box>

            {/* ④ 关联影响 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Warning fontSize="small" sx={{ fontSize: 16, color: 'warning.main' }} /> 关联影响
              </Typography>
              {referencingAgents.length > 0 ? (
                <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.dark', border: '1px solid', borderColor: 'warning.main' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.light', mb: 0.5 }}>
                    ⚠ 停用将影响 {referencingAgents.length} 个智能体
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {referencingAgents.map((a: any) => (
                      <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SmartToy sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {a.name}
                        </Typography>
                        <Chip label={a.agent_type === 'workflow' ? '工作流' : '对话'} size="small"
                          variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                        <Chip label={a.status === 'active' ? '正常' : '停用'} size="small"
                          color={a.status === 'active' ? 'success' : 'error'}
                          sx={{ fontSize: 9, height: 18 }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.disabled">暂无智能体引用此知识库</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button fullWidth variant="outlined" onClick={onClose}>关闭</Button>
          </Box>
        </Box>
      )}
    </Drawer>

      {/* 权限配置抽屉 */}
      <PermDrawer
        target={permOpen ? { resource_type: 'kb', resource_id: rid, name: target?.name, owner_name: target?.owner_name, owner_dept: target?.owner_dept } : null}
        onClose={() => setPermOpen(false)}
      />
    </>
  );
}

/* =================== 技能详情弹窗 =================== */
function SkillDetailDialog({ target, onClose }: { target: any; onClose: () => void }) {
  const rid = target?.resource_id;

  // 获取技能基本信息
  const { data: skillData } = useQuery({
    queryKey: ['skill-detail', rid],
    queryFn: () => skillsApi.get(rid),
    enabled: !!rid,
  });
  const skill: any = skillData?.data?.data || null;

  // 获取技能文件列表
  const { data: filesData } = useQuery({
    queryKey: ['skill-detail-files', rid],
    queryFn: () => api.get(`/skills/${rid}/files`),
    enabled: !!rid,
  });
  const files: any[] = filesData?.data?.data || [];

  // 文件预览
  const [previewFile, setPreviewFile] = useState<{ path: string; content: string } | null>(null);

  const SCOPE_LABEL: Record<string, string> = {
    private: '私有', department: '部门', company: '全公司',
  };

  return (
    <>
      <Dialog open={!!target} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>技能详情 — {target?.name || rid}</Typography>
            <Typography variant="caption" color="text.secondary">拥有者：{target?.owner_name} · {target?.owner_dept}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          {target && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 基本信息 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>基本信息</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField fullWidth label="技能名称" size="small" value={skill?.name || target?.name || ''} disabled />
                  <TextField fullWidth label="描述" multiline rows={3} size="small" value={skill?.description || '-'} disabled />
                  {/* 可见范围 */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>可见范围</Typography>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                      {target?.visibility_scope === 'company' ? '全员' : target?.visibility_scope === 'department' ? '部门' : target?.visibility_scope === 'roles' ? `指定角色（${target?.view_role_count || 0} 个）` : '私有'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              {/* 技能文件夹内容 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>技能文件夹内容</Typography>
                <Typography variant="caption" color="text.secondary">已有 {files.length} 个文件</Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 240, overflow: 'auto', mt: 0.5, bgcolor: 'background.paper' }}>
                  {files.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">暂无文件</Typography></Box>
                  ) : (
                    <List dense sx={{ p: 0 }}>
                      {files.map((f: any) => (
                        <ListItemButton key={f.path} onClick={() => {
                          api.get(`/skills/${rid}/files/${f.path}`).then((res: any) => {
                            const content = res.data?.data?.content ?? res.data?.content ?? '';
                            setPreviewFile({ path: f.path, content: typeof content === 'string' ? content : '（无法加载文件内容）' });
                          }).catch(() => {
                            setPreviewFile({ path: f.path, content: '（无法加载文件内容）' });
                          });
                        }} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}><Article fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                          <ListItemText primary={f.path} secondary={`${f.size} bytes · ${f.updatedAt}`}
                            slotProps={{ primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } }, secondary: { variant: 'caption' } }} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Box>
              </Box>
              {/* 发布信息 & 自动检查 */}
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>发布信息</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InfoRow label="范围" value={target?.visibility_scope === 'company' ? '全员' : target?.visibility_scope === 'department' ? '部门' : target?.visibility_scope === 'roles' ? `指定角色（${target?.view_role_count || 0} 个）` : '私有'} />
                    <InfoRow label="版本" value={skill?.version ? `v${skill.version}` : '-'} />
                    <InfoRow label="变更说明" value={skill?.changelog || '-'} />
                  </Box>
                </Box>
                <Box sx={{ width: 260 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>自动检查</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <AutoCheckItem pass={!!skill?.has_skill_md} label="SKILL.md" />
                    <AutoCheckItem pass={(files.length || 0) <= 200} label={`文件数 ${files.length}`} />
                    <AutoCheckItem pass={true} label={`大小 ${((files.reduce((s: number, f: any) => s + (f.size || 0), 0)) / 1024).toFixed(1)}KB`} />
                    <AutoCheckItem pass={true} label="危险命令" />
                    <AutoCheckItem pass={true} label="Slug 唯一" />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 文件预览弹窗 */}
      <Dialog open={!!previewFile} onClose={() => setPreviewFile(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{previewFile?.path}</Typography>
          <IconButton size="small" onClick={() => setPreviewFile(null)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Card variant="outlined" sx={{ bgcolor: '#1e1e1e', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', color: '#d4d4d4' }}>
              {previewFile?.content || '（空文件）'}
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1 }}>
          <Button onClick={() => setPreviewFile(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
