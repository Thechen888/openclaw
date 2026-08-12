import { useState, useMemo, useEffect } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, Tabs, Tab,
  Switch, Alert, Snackbar,
} from '@mui/material';
import {
  Add, Edit, Refresh, Key, Visibility, VisibilityOff, ContentCopy,
  Close, Tune, History, People,
} from '@mui/icons-material';
import {
  PageHeader, DataTable, CrudDialog,
} from '../../components/shared';
import { tokenAccountsApi } from '../../api/client';
import MembersDrawer from './components/MembersDrawer';

// ===================== Mock Data =====================
const INIT_ADMIN_TOKENS = [
  { id: 'ta-1', name: '平台公共账户-DeepSeek', model_vendor: 'DeepSeek', model_name: 'DeepSeek-V3', api_key: 'sk-deepseek-abc1234567890xyz', total_quota: 10000000, used_quota: 7650000, cycle_type: 'monthly', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-06-01', updated_at: '2026-07-08' },
  { id: 'ta-2', name: '平台公共账户-Qwen', model_vendor: '阿里云', model_name: 'Qwen-Max', api_key: 'sk-qwen-xyz9876543210abc', total_quota: 5000000, used_quota: 4800000, cycle_type: 'monthly', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-05-15', updated_at: '2026-07-07' },
  { id: 'ta-3', name: '平台公共账户-GPT4o', model_vendor: 'OpenAI', model_name: 'GPT-4o', api_key: 'sk-openai-111222333444555', total_quota: 8000000, used_quota: 2100000, cycle_type: 'total', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-04-20', updated_at: '2026-07-01' },
  { id: 'ta-4', name: '测试账户-Claude', model_vendor: 'Anthropic', model_name: 'Claude-3-Sonnet', api_key: 'sk-claude-test-999888777', total_quota: 1000000, used_quota: 960000, cycle_type: 'monthly', alert_threshold: 90, status: 'disabled', created_by: 'admin', created_at: '2026-03-10', updated_at: '2026-06-28' },
];

const INIT_PERSONAL_TOKENS = [
  { id: 'p1', name: '张伟', dept: '总公司', account: 'zhangwei', total_quota: 3000000, used_quota: 1850000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p2', name: '李思', dept: '销售部', account: 'lisi', total_quota: 3000000, used_quota: 2100000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p3', name: '王五', dept: '技术研发部', account: 'wangwu', total_quota: 2000000, used_quota: 2000000, reset_cycle: '每月1日', status: 'blocked' },
  { id: 'p4', name: '赵六', dept: '技术研发部', account: 'zhaoliu', total_quota: 3000000, used_quota: 980000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p5', name: '陈七', dept: 'AI平台组', account: 'chenqi', total_quota: 2000000, used_quota: 1450000, reset_cycle: '每月1日', status: 'active' },
];

const MODEL_VENDORS = [
  { vendor: 'DeepSeek', models: ['DeepSeek-V3', 'DeepSeek-V2', 'DeepSeek-Coder'] },
  { vendor: 'OpenAI', models: ['GPT-4o', 'GPT-4o-mini', 'GPT-4-Turbo', 'o1-preview'] },
  { vendor: '阿里云', models: ['Qwen-Max', 'Qwen-Plus', 'Qwen-Turbo'] },
  { vendor: 'Anthropic', models: ['Claude-3-Sonnet', 'Claude-3-Opus', 'Claude-3-Haiku'] },
];

// 账户ID→名称映射
const ACCT_NAME_MAP: Record<string, string> = {
  'ta-1': '平台公共账户-DeepSeek', 'ta-2': '平台公共账户-Qwen',
  'ta-3': '平台公共账户-GPT4o', 'ta-4': '测试账户-Claude',
};

// 用户→所在资源池（从 accountMembers 推导）
function buildPoolMap(acctMembers: Record<string, any[]>): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [acctId, members] of Object.entries(acctMembers)) {
    const acctName = ACCT_NAME_MAP[acctId] || acctId;
    for (const m of members) {
      if (m.status !== 'active') continue;
      if (!map[m.name]) map[m.name] = [];
      if (!map[m.name].includes(acctName)) map[m.name].push(acctName);
    }
  }
  return map;
}

function maskKey(key: string) {
  if (key.length < 12) return '***';
  return key.slice(0, 6) + '****' + key.slice(-4);
}

function fmtNum(n: number) { return n.toLocaleString(); }

function quotaColor(pct: number) {
  if (pct >= 95) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}

export default function TokenAccountsPage() {
  const [tab, setTab] = useState(0);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [adminTokens, setAdminTokens] = useState(INIT_ADMIN_TOKENS);
  const [personalTokens, setPersonalTokens] = useState(INIT_PERSONAL_TOKENS);

  // Toast
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'info' | 'warning' }>({ open: false, msg: '', severity: 'success' });

  // 管理员 Token 弹窗
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminEdit, setAdminEdit] = useState<any>(null);
  const [adminForm, setAdminForm] = useState({
    name: '', model_vendor: '', model_name: '', api_key: '', total_quota: '', cycle_type: 'monthly', alert_threshold: 80, remark: '',
  });
  // 充值弹窗
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpItem, setTopUpItem] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  // 个人 Token 弹窗
  const [personalEditOpen, setPersonalEditOpen] = useState(false);
  const [personalEditItem, setPersonalEditItem] = useState<any>(null);
  const [personalForm, setPersonalForm] = useState({ total_quota: '' });
  // 明细弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  // 成员抽屉
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);
  const [membersAccountId, setMembersAccountId] = useState<string | null>(null);
  // 成员计数
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // 组织树（静态数据）
  const ORG_TREE = [
    { id: 'org-1', name: '总公司', type: 'company', children: [
      { id: 'org-2', name: '技术研发部', type: 'department', members: [{ user_id: 'u-3', name: '王五' }, { user_id: 'u-4', name: '赵六' }] },
      { id: 'org-3', name: '销售部', type: 'department', members: [{ user_id: 'u-2', name: '李思' }, { user_id: 'u-7', name: '周九' }] },
      { id: 'org-4', name: 'AI平台组', type: 'department', members: [{ user_id: 'u-5', name: '陈七' }, { user_id: 'u-6', name: '孙八' }] },
      { id: 'org-5', name: '智慧客服项目', type: 'department', members: [] },
      { id: 'org-6', name: '华东大区', type: 'department', members: [] },
    ], members: [{ user_id: 'u-1', name: '张伟' }] },
  ];

  // 账户成员数据
  const [accountMembersData, setAccountMembersData] = useState<Record<string, any[]>>({});

  // 刷新成员数据
  const refreshMembers = async () => {
    const acctIds = ['ta-1', 'ta-2', 'ta-3', 'ta-4'];
    const results = await Promise.all(acctIds.map(id => tokenAccountsApi.members(id).then(r => ({ id, data: r.data }))));
    const mData: Record<string, any[]> = {};
    const mCounts: Record<string, number> = {};
    results.forEach(({ id, data }) => {
      mData[id] = Array.isArray(data) ? data : (data as any)?.data || [];
      mCounts[id] = mData[id].length;
    });
    setAccountMembersData(mData);
    setMemberCounts(mCounts);
  };

  // 初始加载成员数据
  useEffect(() => { refreshMembers(); }, []);

  const poolMap = useMemo(() => buildPoolMap(accountMembersData), [accountMembersData]);

  // 资源池汇总
  const poolSummary = useMemo(() => {
    const activeTokens = adminTokens.filter(t => t.status === 'active');
    return {
      totalQuota: activeTokens.reduce((s, t) => s + t.total_quota, 0),
      usedQuota: activeTokens.reduce((s, t) => s + t.used_quota, 0),
      remaining: activeTokens.reduce((s, t) => s + (t.total_quota - t.used_quota), 0),
      totalMembers: Object.values(accountMembersData).reduce((s, members) => {
        const uids = new Set<string>();
        members.filter(m => m.status === 'active').forEach(m => uids.add(m.user_id));
        return s + uids.size;
      }, 0),
    };
  }, [adminTokens, accountMembersData]);

  const openMembersDrawer = (acctId: string) => {
    setMembersAccountId(acctId);
    setMembersDrawerOpen(true);
  };

  const handleOpenAdmin = (item?: any) => {
    if (item) {
      setAdminEdit(item);
      setAdminForm({ name: item.name, model_vendor: item.model_vendor, model_name: item.model_name, api_key: '', total_quota: String(item.total_quota), cycle_type: item.cycle_type, alert_threshold: item.alert_threshold, remark: '' });
    } else {
      setAdminEdit(null);
      setAdminForm({ name: '', model_vendor: '', model_name: '', api_key: '', total_quota: '', cycle_type: 'monthly', alert_threshold: 80, remark: '' });
    }
    setAdminDialogOpen(true);
  };

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); };

  const vendorModels = MODEL_VENDORS.find(v => v.vendor === adminForm.model_vendor)?.models || [];

  // ---- 真实操作 ----
  const handleToggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'disabled' : 'active';
    try {
      await tokenAccountsApi.list(); // touch mock layer
      setAdminTokens(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus, updated_at: new Date().toISOString().split('T')[0] } : t));
      setToast({ open: true, msg: `账户已${newStatus === 'active' ? '启用' : '停用'}`, severity: 'info' });
    } catch { /* noop */ }
  };

  const handleSaveAdmin = async () => {
    try {
      if (adminEdit) {
        setAdminTokens(prev => prev.map(t => t.id === adminEdit.id ? {
          ...t, name: adminForm.name, model_vendor: adminForm.model_vendor, model_name: adminForm.model_name,
          total_quota: Number(adminForm.total_quota), cycle_type: adminForm.cycle_type,
          alert_threshold: adminForm.alert_threshold, updated_at: new Date().toISOString().split('T')[0],
        } : t));
        setToast({ open: true, msg: '账户已更新', severity: 'success' });
      } else {
        const newToken = {
          id: String(Date.now()), name: adminForm.name, model_vendor: adminForm.model_vendor, model_name: adminForm.model_name,
          api_key: adminForm.api_key || 'sk-new-' + Date.now(), total_quota: Number(adminForm.total_quota),
          used_quota: 0, cycle_type: adminForm.cycle_type, alert_threshold: adminForm.alert_threshold,
          status: 'active', created_by: 'admin', created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0],
        };
        setAdminTokens(prev => [...prev, newToken]);
        setToast({ open: true, msg: '账户已创建', severity: 'success' });
      }
      setAdminDialogOpen(false);
    } catch { /* noop */ }
  };

  const handleTopUp = async () => {
    if (!topUpItem || !topUpAmount) return;
    const amount = Number(topUpAmount);
    if (amount <= 0) return;
    setAdminTokens(prev => prev.map(t => t.id === topUpItem.id ? { ...t, total_quota: t.total_quota + amount, updated_at: new Date().toISOString().split('T')[0] } : t));
    setTopUpOpen(false);
    setToast({ open: true, msg: `已充值 ${fmtNum(amount)} Tokens`, severity: 'success' });
  };

  const handleOpenDetail = (item: any) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  // 个人 Token 操作
  const handlePersonalSave = async () => {
    if (!personalEditItem) return;
    setPersonalTokens(prev => prev.map(t => t.id === personalEditItem.id ? { ...t, total_quota: Number(personalForm.total_quota) } : t));
    setPersonalEditOpen(false);
    setToast({ open: true, msg: '额度已调整', severity: 'success' });
  };

  const handlePersonalReset = async (item: any) => {
    setPersonalTokens(prev => prev.map(t => t.id === item.id ? { ...t, used_quota: 0 } : t));
    setToast({ open: true, msg: `${item.name} 的用量已重置`, severity: 'success' });
  };

  // 成员操作
  const handleAddMembers = async (userIds: string[], remark: string) => {
    if (!membersAccountId) return;
    try {
      await tokenAccountsApi.addMembers(membersAccountId, { user_ids: userIds, remark });
      await refreshMembers();
      setToast({ open: true, msg: `已添加 ${userIds.length} 名成员`, severity: 'success' });
    } catch { /* noop */ }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await tokenAccountsApi.removeMember(memberId);
      await refreshMembers();
      setToast({ open: true, msg: '成员已移除', severity: 'info' });
    } catch { /* noop */ }
  };

  // 当前打开的账户的成员列表
  const currentMembers = membersAccountId ? (accountMembersData[membersAccountId] || []).filter((m: any) => m.status === 'active') : [];
  const currentAccount = membersAccountId ? adminTokens.find(t => t.id === membersAccountId) || null : null;

  return (
    <Box>
      <PageHeader
        title="Token 账户"
        subtitle="管理平台管理员 Token 账户与个人 Token 额度"
        actions={<Tooltip title="刷新"><IconButton onClick={() => window.location.reload()}><Refresh /></IconButton></Tooltip>}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="管理员 Token" />
        <Tab label="个人 Token" />
      </Tabs>

      {/* =================== Tab 0: 管理员 Token =================== */}
      {tab === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            管理员Token为公司资源池。成员列表中的人员，个人额度用完后可消耗池内共享额度（不预分配，耗尽为止）。Agent 上无需任何配置。
          </Alert>

          {/* 资源池汇总卡 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={3}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">池总额度合计</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmtNum(poolSummary.totalQuota)}</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">已消耗合计</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'warning.main' }}>{fmtNum(poolSummary.usedQuota)}</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">剩余合计</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'success.main' }}>{fmtNum(poolSummary.remaining)}</Typography>
              </Box>
            </Grid>
            <Grid size={3}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">成员总数</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}><People sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />{poolSummary.totalMembers} 人</Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenAdmin()}>新增管理员 Token 账户</Button>
          </Box>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>账户名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>关联模型</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>API Key</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">总额度</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>已用额度</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">剩余额度</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>周期类型</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成员</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 200 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminTokens.map((item) => {
                const pct = item.total_quota > 0 ? (item.used_quota / item.total_quota) * 100 : 0;
                const remaining = item.total_quota - item.used_quota;
                const mCount = memberCounts[item.id] || 0;
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={`${item.model_vendor} / ${item.model_name}`} variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {showKeys[item.id] ? item.api_key : maskKey(item.api_key)}
                        </Typography>
                        <Tooltip title={showKeys[item.id] ? '隐藏' : '显示'}>
                          <IconButton size="small" onClick={() => setShowKeys(p => ({ ...p, [item.id]: !p[item.id] }))}>
                            {showKeys[item.id] ? <VisibilityOff sx={{ fontSize: 14 }} /> : <Visibility sx={{ fontSize: 14 }} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="复制">
                          <IconButton size="small" onClick={() => handleCopy(item.api_key)}><ContentCopy sx={{ fontSize: 14 }} /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.total_quota)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 70 }}>{fmtNum(item.used_quota)}</Typography>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)} color={quotaColor(pct) as any} sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 32, color: `${quotaColor(pct)}.main` }}>{pct.toFixed(0)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, color: remaining < 0 ? 'error.main' : 'text.primary' }}>{fmtNum(Math.max(remaining, 0))}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.cycle_type === 'monthly' ? '按月重置' : '总额度'} variant="outlined" sx={{ fontSize: 11 }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="管理成员">
                        <Chip
                          size="small"
                          icon={<People sx={{ fontSize: 14 }} />}
                          label={`${mCount} 人`}
                          variant="outlined"
                          onClick={() => openMembersDrawer(item.id)}
                          sx={{ cursor: 'pointer', fontSize: 11 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.status === 'active' ? '启用' : '停用'} color={item.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="编辑"><IconButton size="small" onClick={() => handleOpenAdmin(item)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={item.status === 'active' ? '停用' : '启用'}>
                          <IconButton size="small" onClick={() => handleToggleStatus(item)}>
                            <Switch size="small" checked={item.status === 'active'} onClick={e => e.stopPropagation()} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="充值"><IconButton size="small" color="primary" onClick={() => { setTopUpItem(item); setTopUpAmount(''); setTopUpOpen(true); }}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="明细"><IconButton size="small" onClick={() => handleOpenDetail(item)}><History fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="成员"><IconButton size="small" onClick={() => openMembersDrawer(item.id)}><People fontSize="small" /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}

      {/* =================== Tab 1: 个人 Token =================== */}
      {tab === 1 && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            个人 Token 为每位用户的独立配额。个人额度用完后，可消耗所在资源池的共享额度。
          </Alert>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>姓名</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>账号</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">个人总额度</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>已用</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">剩余</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>可用资源池</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {personalTokens.map((item) => {
                const pct = item.total_quota > 0 ? (item.used_quota / item.total_quota) * 100 : 0;
                const remaining = item.total_quota - item.used_quota;
                const pools = poolMap[item.name] || [];
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.dept}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.account}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.total_quota)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fmtNum(item.used_quota)}</Typography>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)} color={quotaColor(pct) as any} sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, color: remaining <= 0 ? 'error.main' : 'text.primary' }}>{fmtNum(Math.max(remaining, 0))}</TableCell>
                    <TableCell>
                      {pools.length > 0
                        ? <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{pools.map(p => <Chip key={p} size="small" label={p} variant="outlined" sx={{ fontSize: 10 }} />)}</Box>
                        : <Typography variant="caption" color="text.secondary">—</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.status === 'active' ? '正常' : '已停用'} color={item.status === 'active' ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="调整额度">
                          <IconButton size="small" onClick={() => { setPersonalEditItem(item); setPersonalForm({ total_quota: String(item.total_quota) }); setPersonalEditOpen(true); }}>
                            <Tune fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重置"><IconButton size="small" onClick={() => handlePersonalReset(item)}><Refresh fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="查看明细"><IconButton size="small" onClick={() => handleOpenDetail(item)}><History fontSize="small" /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}

      {/* =================== 新增/编辑管理员 Token 弹窗 =================== */}
      <CrudDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        title={adminEdit ? '编辑管理员 Token 账户' : '新增管理员 Token 账户'}
        onSave={handleSaveAdmin}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 0.5 }}>
          <TextField fullWidth label="账户名称" required value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="如：平台公共账户-DeepSeek" />
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField fullWidth select label="模型供应商" required value={adminForm.model_vendor} onChange={e => setAdminForm({ ...adminForm, model_vendor: e.target.value, model_name: '' })}>
                {MODEL_VENDORS.map(v => <MenuItem key={v.vendor} value={v.vendor}>{v.vendor}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField fullWidth select label="模型" required value={adminForm.model_name} onChange={e => setAdminForm({ ...adminForm, model_name: e.target.value })} disabled={!adminForm.model_vendor}>
                {vendorModels.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          <TextField fullWidth label="API Key" required type="password" value={adminForm.api_key} onChange={e => setAdminForm({ ...adminForm, api_key: e.target.value })} placeholder={adminEdit ? '留空表示不修改' : '输入 API Key'} />
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField fullWidth label="总额度 (Tokens)" type="number" required value={adminForm.total_quota} onChange={e => setAdminForm({ ...adminForm, total_quota: e.target.value })} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth select label="周期类型" value={adminForm.cycle_type} onChange={e => setAdminForm({ ...adminForm, cycle_type: e.target.value })}>
                <MenuItem value="monthly">按月重置</MenuItem>
                <MenuItem value="total">总额度（不重置）</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <TextField fullWidth label="告警阈值 (%)" type="number" value={adminForm.alert_threshold} onChange={e => setAdminForm({ ...adminForm, alert_threshold: Number(e.target.value) })} helperText="已用额度达到此百分比时触发告警" />
          <TextField fullWidth label="备注" multiline rows={2} value={adminForm.remark} onChange={e => setAdminForm({ ...adminForm, remark: e.target.value })} />
        </Box>
      </CrudDialog>

      {/* =================== 充值弹窗 =================== */}
      <Dialog open={topUpOpen} onClose={() => setTopUpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>充值额度 — {topUpItem?.name}</Typography>
          <IconButton size="small" onClick={() => setTopUpOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>充值将追加额度到该管理员 Token 账户</Alert>
          <TextField fullWidth label="充值数量 (Tokens)" type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="输入充值数量" />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTopUpOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleTopUp}>确认充值</Button>
        </DialogActions>
      </Dialog>

      {/* =================== 个人 Token 调整弹窗 =================== */}
      <Dialog open={personalEditOpen} onClose={() => setPersonalEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>调整额度 — {personalEditItem?.name}</Typography>
          <IconButton size="small" onClick={() => setPersonalEditOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField fullWidth label="个人总额度 (Tokens)" type="number" value={personalForm.total_quota} onChange={e => setPersonalForm({ total_quota: e.target.value })} />
            <Typography variant="caption" color="text.secondary">当前已用：{personalEditItem ? fmtNum(personalEditItem.used_quota) : 0} / 剩余：{personalEditItem ? fmtNum(Math.max(personalEditItem.total_quota - personalEditItem.used_quota, 0)) : 0}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPersonalEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handlePersonalSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* =================== 明细弹窗 =================== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>消耗明细 — {detailItem?.name}</Typography>
          <IconButton size="small" onClick={() => setDetailOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          {detailItem && adminTokens.find(t => t.id === detailItem.id) ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>账户总额度：{fmtNum(detailItem.total_quota)} / 已消耗：{fmtNum(detailItem.used_quota)}</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>成员列表</Typography>
              {(accountMembersData[detailItem.id] || []).filter((m: any) => m.status === 'active').length === 0 ? (
                <Typography variant="caption" color="text.secondary">暂无成员</Typography>
              ) : (
                <Table size="small">
                  <TableHead><TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>姓名</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>部门</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>加入时间</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {(accountMembersData[detailItem.id] || []).filter((m: any) => m.status === 'active').map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell sx={{ fontSize: 12 }}>{m.name}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{m.dept}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{m.added_at}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">个人额度使用明细：已用 {fmtNum(detailItem?.used_quota || 0)} / 总额 {fmtNum(detailItem?.total_quota || 0)}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* =================== 成员抽屉 =================== */}
      <MembersDrawer
        open={membersDrawerOpen}
        account={currentAccount}
        members={currentMembers}
        onClose={() => setMembersDrawerOpen(false)}
        onAddMembers={handleAddMembers}
        onRemoveMember={handleRemoveMember}
        orgTree={ORG_TREE}
      />

      {/* =================== Toast =================== */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
