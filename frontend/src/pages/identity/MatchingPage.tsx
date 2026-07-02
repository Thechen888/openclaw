import { useState } from 'react';
import {
  Box, Tooltip, Chip, Typography, IconButton, Grid,
  Tabs, Tab, Card, Button, LinearProgress, Switch, Collapse, Divider,
  TableHead, TableBody, TableRow, TableCell,
  TextField, Select, MenuItem, FormControl, InputLabel, Avatar,
} from '@mui/material';
import {
  Refresh, Settings, PlayArrow, CheckCircle,
  Edit, LinkOff, Cancel, Visibility, PersonAdd, HelpOutlined,
  ExpandMore, ExpandLess, Info, DoNotDisturb, CompareArrows, AccountTree,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, SectionCard, CrudDialog,
} from '../../components/shared';
import { matchingApi } from '../../api/client';

/* ============ 常量 ============ */

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '已匹配', value: 'matched' },
  { label: '待确认', value: 'pending_review' },
  { label: '未匹配', value: 'unmatched' },
  { label: '已忽略', value: 'ignored' },
];

const STATUS_LABELS: Record<string, string> = {
  matched: '已匹配',
  pending: '待确认',
  conflict: '待确认',
  unmatched: '未匹配',
  ignored: '已忽略',
};

const SOURCE_LABELS: Record<string, string> = {
  wechat_work: '企业微信',
  dingtalk: '钉钉',
  feishu: '飞书',
  crm: 'CRM系统',
  email: '邮箱',
};

const STRATEGY_TYPES: Record<string, string> = {
  phone_match: '手机号匹配',
  email_match: '邮箱匹配',
  name_dept_match: '姓名+部门匹配',
  ai_match: 'AI语义匹配',
};

const USERS = [
  { id: 'u-1', name: '张伟', email: 'zhangwei@company.com' },
  { id: 'u-2', name: '李思', email: 'lisi@company.com' },
  { id: 'u-3', name: '王五', email: 'wangwu@company.com' },
  { id: 'u-4', name: '赵六', email: 'zhaoliu@company.com' },
  { id: 'u-5', name: '陈七', email: 'chenqi@company.com' },
  { id: 'u-6', name: '孙八', email: 'sunba@company.com' },
  { id: 'u-7', name: '周九', email: 'zhoujiu@company.com' },
];

const confidenceColor = (score: number) => {
  if (score >= 0.85) return '#00FF88';
  if (score >= 0.6) return '#00D4FF';
  if (score >= 0.4) return '#FFB800';
  return '#FF4D6D';
};

const isPendingReview = (status: string) => status === 'pending' || status === 'conflict';

/* ============ 详情面板子组件 ============ */

function DetailPanel({ item, allItems }: { item: any; allItems: any[] }) {
  const ext = item.external_profile || {};
  const plat = item.platform_user;
  const reasons = item.match_reasons || [];

  // 同一用户的其他关联账号
  const otherAccounts = item.user_id
    ? allItems.filter((i: any) => i.user_id === item.user_id && i.id !== item.id)
    : [];

  return (
    <Box sx={{ p: 2, bgcolor: 'rgba(0,212,255,0.02)', borderTop: '1px solid rgba(0,212,255,0.08)' }}>
      <Grid container spacing={3}>
        {/* 左：第三方账号信息 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="caption" sx={{ color: '#00D4FF', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', mb: 1, display: 'block' }}>
            第三方账号信息
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '72px 1fr', rowGap: 0.8, fontSize: 13 }}>
            <Typography variant="caption" color="text.secondary">平台</Typography>
            <Typography variant="caption">{SOURCE_LABELS[item.source_type] || item.source_type}</Typography>
            <Typography variant="caption" color="text.secondary">账号ID</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{item.account_id}</Typography>
            <Typography variant="caption" color="text.secondary">姓名</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{ext.name || '-'}</Typography>
            <Typography variant="caption" color="text.secondary">部门</Typography>
            <Typography variant="caption">{ext.department || '-'}</Typography>
            <Typography variant="caption" color="text.secondary">邮箱</Typography>
            <Typography variant="caption">{ext.email || '-'}</Typography>
            <Typography variant="caption" color="text.secondary">手机</Typography>
            <Typography variant="caption">{ext.phone || '-'}</Typography>
          </Box>
        </Grid>

        {/* 中：平台用户信息 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Typography variant="caption" sx={{ color: '#7C3AED', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', mb: 1, display: 'block' }}>
            平台用户信息
          </Typography>
          {plat ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '56px 1fr', rowGap: 0.8, fontSize: 13 }}>
              <Typography variant="caption" color="text.secondary">姓名</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{plat.name}</Typography>
              <Typography variant="caption" color="text.secondary">部门</Typography>
              <Typography variant="caption">{plat.department}</Typography>
              <Typography variant="caption" color="text.secondary">邮箱</Typography>
              <Typography variant="caption">{plat.email}</Typography>
              <Typography variant="caption" color="text.secondary">手机</Typography>
              <Typography variant="caption">{plat.phone || '-'}</Typography>
              <Typography variant="caption" color="text.secondary">角色</Typography>
              <Typography variant="caption">{plat.role}</Typography>
            </Box>
          ) : (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.12)' }}>
              <Typography variant="caption" sx={{ color: '#FF4D6D' }}>
                平台中无对应用户 — 该账号可能属于外部人员
              </Typography>
            </Box>
          )}
        </Grid>

        {/* 右上：匹配理由 */}
        <Grid size={{ xs: 12, md: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#FFB800', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', mb: 1, display: 'block' }}>
            匹配理由
          </Typography>
          {reasons.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {reasons.map((r: any, i: number) => (
                <Box key={i} sx={{ p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>{r.strategy}</Typography>
                    <Chip label={`${(r.confidence * 100).toFixed(0)}%`} size="small" sx={{ height: 16, fontSize: 10, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{r.detail}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">无详细理由</Typography>
          )}
        </Grid>

        {/* 右下：同一用户的其他关联账号 */}
        <Grid size={{ xs: 12, md: 2.5 }}>
          <Typography variant="caption" sx={{ color: '#00FF88', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em', mb: 1, display: 'block' }}>
            <AccountTree sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            该用户其他关联账号
          </Typography>
          {otherAccounts.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              {otherAccounts.map((acc: any) => (
                <Box key={acc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.8, borderRadius: 1, bgcolor: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)' }}>
                  <Chip label={SOURCE_LABELS[acc.source_type] || acc.source_type} size="small" sx={{ fontSize: 10, height: 18, minWidth: 48 }} variant="outlined" />
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.account_id}
                  </Typography>
                  <StatusBadge status={acc.status === 'matched' ? 'matched' : isPendingReview(acc.status) ? 'warning' : acc.status} label={STATUS_LABELS[acc.status] || acc.status} />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              {item.user_id ? '暂无其他关联账号' : '未关联用户'}
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

/* ============ 主组件 ============ */

export default function MatchingPage() {
  const queryClient = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [statusTab, setStatusTab] = useState('');
  const [strategyDialog, setStrategyDialog] = useState(false);
  const [editStrategy, setEditStrategy] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 行操作弹窗
  const [manualLinkItem, setManualLinkItem] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [conflictItem, setConflictItem] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; desc: string; item: any; nextStatus: string } | null>(null);

  const queryParams = { ...params, status: (statusTab === 'pending_review' ? 'pending' : statusTab) || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['matching-results', queryParams],
    queryFn: () => matchingApi.results(queryParams),
  });
  const rawItems: any[] = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const items = statusTab === 'pending_review'
    ? rawItems.filter((i: any) => isPendingReview(i.status))
    : rawItems;

  // 计算每个用户关联的账号数量（只统计 matched + pending/conflict 的）
  const userAccountsMap: Record<string, any[]> = {};
  rawItems.forEach((item: any) => {
    if (item.user_id) {
      if (!userAccountsMap[item.user_id]) userAccountsMap[item.user_id] = [];
      userAccountsMap[item.user_id].push(item);
    }
  });

  const { data: stratData } = useQuery({
    queryKey: ['matching-strategies'],
    queryFn: () => matchingApi.strategies(),
  });
  const strategies = stratData?.data?.data || [];

  const { data: runsData } = useQuery({
    queryKey: ['matching-runs'],
    queryFn: () => matchingApi.runs({ page_size: 5 }),
  });
  const recentRuns = runsData?.data?.data || [];

  const { data: conflictData } = useQuery({
    queryKey: ['matching-conflicts', conflictItem?.id],
    queryFn: () => matchingApi.getConflicts(conflictItem.id),
    enabled: !!conflictItem?.id,
  });
  const conflictCandidates = conflictData?.data?.data || [];

  const runMutation = useMutation({
    mutationFn: () => matchingApi.triggerRun(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-results'] });
      queryClient.invalidateQueries({ queryKey: ['matching-runs'] });
    },
  });

  const updateStrategyMutation = useMutation({
    mutationFn: (data: any) => matchingApi.updateStrategy(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-strategies'] });
      setStrategyDialog(false);
      setEditStrategy(null);
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => matchingApi.updateResult(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching-results'] });
      setManualLinkItem(null);
      setSelectedUserId('');
      setConfirmDialog(null);
      setConflictItem(null);
    },
  });

  const toggleStrategy = (strat: any) => {
    updateStrategyMutation.mutate({ ...strat, status: strat.status === 'active' ? 'disabled' : 'active' });
  };

  const handleOpenStrategy = (strat: any) => { setEditStrategy({ ...strat }); setStrategyDialog(true); };
  const handleSaveStrategy = () => { if (editStrategy) updateStrategyMutation.mutate(editStrategy); };

  const handleConfirmMatch = (item: any) => {
    const existingCount = item.user_id ? (userAccountsMap[item.user_id]?.length ?? 0) : 0;
    const multiAccountNotice = existingCount > 0
      ? `\n\n⚠️ 注意：该用户已有 ${existingCount} 个关联账号（${userAccountsMap[item.user_id].map((a: any) => SOURCE_LABELS[a.source_type] || a.source_type).join('、')}），确认后该账号将作为其第 ${existingCount + 1} 个关联平台。`
      : '';
    setConfirmDialog({ open: true, title: '确认关联', desc: `确认将「${item.account_id}」关联到用户「${item.user_name || '系统推荐'}」？\n\n关联后该账号的所有操作（AI 对话、Token 消耗）将归属到此用户名下。${multiAccountNotice}`, item, nextStatus: 'matched' });
  };
  const handleIgnore = (item: any) => setConfirmDialog({ open: true, title: '标记忽略', desc: `将「${item.account_id}」标记为忽略？\n\n标记后不再出现在待处理列表中。如确认该账号属于外部人员或无需关联，请标记忽略。`, item, nextStatus: 'ignored' });
  const handleUnlink = (item: any) => setConfirmDialog({ open: true, title: '解除关联', desc: `确认解除「${item.account_id}」与「${item.user_name}」的关联？\n\n解除后该账号的操作将不再归属到此用户。`, item, nextStatus: 'unmatched' });
  const handleOpenManualLink = (item: any) => { setManualLinkItem(item); setSelectedUserId(''); };

  const handleManualLinkSave = () => {
    if (!manualLinkItem || !selectedUserId) return;
    updateResultMutation.mutate({
      id: manualLinkItem.id,
      data: { status: 'matched', user_id: selectedUserId, user_name: USERS.find(u => u.id === selectedUserId)?.name || '' },
    });
  };

  const handleConflictResolve = (candidate: any) => {
    if (!conflictItem) return;
    updateResultMutation.mutate({ id: conflictItem.id, data: { status: 'matched', user_id: candidate.user_id, user_name: candidate.user_name } });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    const payload: any = { status: confirmDialog.nextStatus };
    if (confirmDialog.nextStatus === 'unmatched') { payload.user_id = ''; payload.user_name = ''; }
    updateResultMutation.mutate({ id: confirmDialog.item.id, data: payload });
  };

  const renderRowActions = (item: any) => {
    if (isPendingReview(item.status)) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {item.status === 'conflict' && (
            <Tooltip title="查看候选"><IconButton size="small" color="warning" onClick={() => setConflictItem(item)}><Visibility fontSize="small" /></IconButton></Tooltip>
          )}
          <Tooltip title="确认关联"><IconButton size="small" color="success" onClick={() => handleConfirmMatch(item)}><CheckCircle fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="标记忽略"><IconButton size="small" sx={{ color: 'rgba(200,210,220,0.4)' }} onClick={() => handleIgnore(item)}><DoNotDisturb fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="手动指定"><IconButton size="small" color="primary" onClick={() => handleOpenManualLink(item)}><PersonAdd fontSize="small" /></IconButton></Tooltip>
        </Box>
      );
    }
    if (item.status === 'matched') {
      return (<Box sx={{ display: 'flex', justifyContent: 'center' }}><Tooltip title="解除关联"><IconButton size="small" color="error" onClick={() => handleUnlink(item)}><LinkOff fontSize="small" /></IconButton></Tooltip></Box>);
    }
    if (item.status === 'ignored') {
      return (<Box sx={{ display: 'flex', justifyContent: 'center' }}><Tooltip title="手动关联"><IconButton size="small" color="primary" onClick={() => handleOpenManualLink(item)}><PersonAdd fontSize="small" /></IconButton></Tooltip></Box>);
    }
    // unmatched
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
        <Tooltip title="手动关联"><IconButton size="small" color="primary" onClick={() => handleOpenManualLink(item)}><PersonAdd fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="标记忽略"><IconButton size="small" sx={{ color: 'rgba(200,210,220,0.4)' }} onClick={() => handleIgnore(item)}><DoNotDisturb fontSize="small" /></IconButton></Tooltip>
      </Box>
    );
  };

  const tabCounts: Record<string, number> = {
    '': total,
    matched: rawItems.filter((i: any) => i.status === 'matched').length,
    pending_review: rawItems.filter((i: any) => isPendingReview(i.status)).length,
    unmatched: rawItems.filter((i: any) => i.status === 'unmatched').length,
    ignored: rawItems.filter((i: any) => i.status === 'ignored').length,
  };

  return (
    <Box>
      <PageHeader
        title="匹配队列"
        subtitle="跨聊天和第三方账号的身份识别与关联"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<PlayArrow />} onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending ? '运行中...' : '执行匹配'}
            </Button>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
          </Box>
        }
      />

      {/* ========== 功能说明 ========== */}
      <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Info sx={{ color: '#00D4FF', fontSize: 18, mt: 0.2 }} />
        <Box>
          <Typography variant="body2" sx={{ color: 'rgba(220,225,235,0.85)', lineHeight: 1.7 }}>
            匹配成功后，该第三方账号的所有操作（AI 对话、Token 消耗、技能调用）将自动归属到平台用户名下，用于<Box component="span" sx={{ color: '#00D4FF', fontWeight: 600 }}>权限控制</Box>、<Box component="span" sx={{ color: '#00D4FF', fontWeight: 600 }}>用量统计</Box>和<Box component="span" sx={{ color: '#00D4FF', fontWeight: 600 }}>审计溯源</Box>。
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', mt: 0.5, display: 'block' }}>
            点击表格行可展开详情面板，查看第三方账号与平台用户的对比信息及匹配理由，辅助人工审核。
          </Typography>
        </Box>
      </Box>

      {/* ========== 匹配策略 ========== */}
      <SectionCard
        title="匹配策略"
        actions={<Button size="small" startIcon={<Settings />} variant="outlined" onClick={() => { setEditStrategy(null); setStrategyDialog(true); }}>策略管理</Button>}
        sx={{ mb: 3 }}
      >
        {strategies.length === 0 ? (
          <Typography variant="body2" color="text.secondary">暂未配置匹配策略</Typography>
        ) : (
          <Grid container spacing={2}>
            {strategies.map((s: any, idx: number) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={s.id || idx}>
                <Card variant="outlined" sx={{
                  p: 2, height: '100%',
                  border: s.status === 'active' ? '1px solid rgba(0,255,136,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  bgcolor: s.status === 'active' ? 'rgba(0,255,136,0.03)' : 'rgba(255,255,255,0.02)',
                  opacity: s.status === 'active' ? 1 : 0.6,
                  transition: 'all 0.3s', '&:hover': { borderColor: 'rgba(0,212,255,0.3)', opacity: 1 },
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 14 }}>{s.name}</Typography>
                    <Switch size="small" checked={s.status === 'active'} onChange={() => toggleStrategy(s)} color="success" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                    {s.description || STRATEGY_TYPES[s.strategy_type] || '无描述'}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {recentRuns.length > 0 && (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: 13 }}>最近运行记录</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {recentRuns.map((run: any, idx: number) => (
                <Box key={run.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.06)' }}>
                  <StatusBadge status={run.status} label={run.status === 'completed' ? '完成' : run.status === 'running' ? '运行中' : '失败'} />
                  <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.6)', fontSize: 11 }}>
                    {run.created_at ? new Date(run.created_at).toLocaleString('zh-CN') : '-'}
                  </Typography>
                  <Chip label={`匹配 ${run.matched_count ?? 0} / ${run.total_count ?? 0}`} size="small" sx={{ fontSize: 11, height: 20, bgcolor: 'rgba(0,255,136,0.1)', color: '#00FF88' }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </SectionCard>

      {/* ========== 结果表格 ========== */}
      <SectionCard title="匹配结果" sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Tabs value={statusTab} onChange={(_, v) => { setStatusTab(v); setPage(1); }}>
            {STATUS_TABS.map(tab => (
              <Tab key={tab.value} label={`${tab.label} (${tabCounts[tab.value] ?? 0})`} value={tab.value} />
            ))}
          </Tabs>
        </Box>
        <FilterBar search={search} onSearchChange={setSearch} />
        {isLoading ? <LoadingState /> : (
          <DataTable pagination={{ page, pageSize, total: items.length, onPageChange: setPage, onPageSizeChange: setPageSize }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}></TableCell>
                <TableCell sx={{ width: 100 }}>来源平台</TableCell>
                <TableCell sx={{ width: 150 }}>账号标识</TableCell>
                <TableCell sx={{ width: 160 }}>关联用户</TableCell>
                <TableCell align="center" sx={{ width: 140 }}>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    匹配度
                    <Tooltip title="系统判断该账号属于某用户的置信度" arrow>
                      <HelpOutlined sx={{ fontSize: 14, color: 'rgba(0,212,255,0.5)', cursor: 'help' }} />
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="center" sx={{ width: 100 }}>状态</TableCell>
                <TableCell align="center" sx={{ width: 130 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无匹配结果" description="执行一次匹配任务后将在此展示结果" /></TableCell></TableRow>
              ) : items.map((item: any, idx: number) => (
                <>
                  <TableRow key={item.id || idx} hover onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)} sx={{ cursor: 'pointer', '& td': { borderBottom: expandedRow === item.id ? 'none' : undefined } }}>
                    <TableCell sx={{ px: 1 }}>
                      <IconButton size="small" sx={{ transition: 'transform 0.2s' }}>
                        {expandedRow === item.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Chip label={SOURCE_LABELS[item.source_type] || item.source_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.account_id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {item.user_name || (<Typography variant="caption" color="text.secondary">未关联</Typography>)}
                        {item.user_id && (userAccountsMap[item.user_id]?.length ?? 0) > 1 && (
                          <Tooltip title={`该用户已关联 ${userAccountsMap[item.user_id].length} 个平台账号`} arrow>
                            <Chip
                              icon={<AccountTree sx={{ fontSize: 11 }} />}
                              label={`${userAccountsMap[item.user_id].length}个平台`}
                              size="small"
                              sx={{ fontSize: 10, height: 18, bgcolor: 'rgba(0,255,136,0.08)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)', '& .MuiChip-icon': { color: '#00FF88' } }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ width: 116, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={(item.score ?? 0) * 100} sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { backgroundColor: confidenceColor(item.score ?? 0), boxShadow: `0 0 6px ${confidenceColor(item.score ?? 0)}` } }} />
                        <Typography variant="caption" sx={{ width: 34, textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                          {item.score != null ? `${(item.score * 100).toFixed(0)}%` : '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <StatusBadge status={isPendingReview(item.status) ? 'warning' : item.status === 'ignored' ? 'disabled' : item.status} label={STATUS_LABELS[item.status] || item.status} />
                      {item.status === 'conflict' && <Chip label="多候选" size="small" sx={{ ml: 0.5, fontSize: 10, height: 16, bgcolor: 'rgba(255,184,0,0.1)', color: '#FFB800' }} />}
                    </TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      {renderRowActions(item)}
                    </TableCell>
                  </TableRow>
                  {/* 展开详情 */}
                  <TableRow key={`${item.id}-detail`}>
                    <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                      <Collapse in={expandedRow === item.id} timeout="auto" unmountOnExit>
                        <DetailPanel item={item} allItems={rawItems} />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </DataTable>
        )}
      </SectionCard>

      {/* ========== 策略编辑弹窗 ========== */}
      <CrudDialog open={strategyDialog} onClose={() => { setStrategyDialog(false); setEditStrategy(null); }} title={editStrategy ? `编辑策略 - ${editStrategy.name}` : '策略管理'} onSave={handleSaveStrategy} saving={updateStrategyMutation.isPending}>
        {editStrategy ? (
          <Grid container spacing={2.5}>
            <Grid size={12}><TextField fullWidth label="策略名称" value={editStrategy.name} onChange={e => setEditStrategy({ ...editStrategy, name: e.target.value })} /></Grid>
            <Grid size={12}><TextField fullWidth label="描述" multiline rows={2} value={editStrategy.description || ''} onChange={e => setEditStrategy({ ...editStrategy, description: e.target.value })} /></Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>策略类型</InputLabel>
                <Select value={editStrategy.strategy_type} label="策略类型" onChange={e => setEditStrategy({ ...editStrategy, strategy_type: e.target.value })}>
                  {Object.entries(STRATEGY_TYPES).map(([k, v]) => (<MenuItem key={k} value={k}>{v}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth size="small"><InputLabel>状态</InputLabel>
                <Select value={editStrategy.status} label="状态" onChange={e => setEditStrategy({ ...editStrategy, status: e.target.value })}>
                  <MenuItem value="active">启用</MenuItem><MenuItem value="disabled">禁用</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        ) : (<Typography variant="body2" color="text.secondary">请点击策略卡片上的编辑按钮来修改配置。</Typography>)}
      </CrudDialog>

      {/* ========== 手动关联弹窗 ========== */}
      <CrudDialog open={!!manualLinkItem} onClose={() => { setManualLinkItem(null); setSelectedUserId(''); }} title={manualLinkItem ? `手动关联 - ${manualLinkItem.account_id}` : '手动关联'} onSave={handleManualLinkSave} saving={updateResultMutation.isPending}>
        <Typography variant="body2" sx={{ color: 'rgba(200,210,220,0.7)', mb: 2 }}>请为该账号选择一个关联用户。关联后该账号的操作将归属到所选用户。</Typography>
        <FormControl fullWidth size="small"><InputLabel>选择用户</InputLabel>
          <Select value={selectedUserId} label="选择用户" onChange={e => setSelectedUserId(e.target.value as string)}>
            {USERS.map(user => (
              <MenuItem key={user.id} value={user.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'rgba(0,212,255,0.2)' }}>{user.name.charAt(0)}</Avatar>
                  <Box sx={{ flex: 1 }}><Typography variant="body2">{user.name}</Typography><Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)' }}>{user.email}</Typography></Box>
                  {(userAccountsMap[user.id]?.length ?? 0) > 0 && (
                    <Chip label={`已关联${userAccountsMap[user.id].length}个`} size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'rgba(0,255,136,0.08)', color: '#00FF88' }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedUserId && (userAccountsMap[selectedUserId]?.length ?? 0) > 0 && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.15)' }}>
            <Typography variant="caption" sx={{ color: '#FFB800', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Info sx={{ fontSize: 14 }} />
              该用户已关联 {userAccountsMap[selectedUserId].length} 个平台账号：
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {userAccountsMap[selectedUserId].map((acc: any) => (
                <Chip key={acc.id} label={`${SOURCE_LABELS[acc.source_type] || acc.source_type}: ${acc.account_id}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
              ))}
            </Box>
          </Box>
        )}
      </CrudDialog>

      {/* ========== 多候选解决弹窗 ========== */}
      <CrudDialog open={!!conflictItem} onClose={() => setConflictItem(null)} title={conflictItem ? `多候选处理 - ${conflictItem.account_id}` : '多候选处理'} onSave={() => setConflictItem(null)} saving={false}>
        <Typography variant="body2" sx={{ color: 'rgba(200,210,220,0.7)', mb: 2 }}>该账号匹配到多个候选用户，请选择正确的关联目标。</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {conflictCandidates.map((candidate: any, idx: number) => (
            <Card key={idx} variant="outlined" sx={{ p: 1.5, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { borderColor: 'rgba(0,212,255,0.4)', bgcolor: 'rgba(0,212,255,0.03)' } }} onClick={() => handleConflictResolve(candidate)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'rgba(0,212,255,0.15)' }}>{candidate.user_name.charAt(0)}</Avatar>
                  <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{candidate.user_name}</Typography><Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)' }}>{candidate.reason}</Typography></Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: '#00D4FF', fontFamily: 'monospace' }}>{(candidate.score * 100).toFixed(0)}%</Typography>
                  <Button size="small" sx={{ ml: 1 }}>选择</Button>
                </Box>
              </Box>
            </Card>
          ))}
          {conflictCandidates.length === 0 && <Typography variant="body2" color="text.secondary">暂无候选信息</Typography>}
        </Box>
      </CrudDialog>

      {/* ========== 确认弹窗 ========== */}
      <CrudDialog open={confirmDialog?.open || false} onClose={() => setConfirmDialog(null)} title={confirmDialog?.title || '确认操作'} onSave={handleConfirmAction} saving={updateResultMutation.isPending}>
        <Typography variant="body2" sx={{ color: 'rgba(200,210,220,0.8)', whiteSpace: 'pre-line' }}>{confirmDialog?.desc}</Typography>
      </CrudDialog>
    </Box>
  );
}
