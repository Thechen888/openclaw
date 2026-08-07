import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, Tabs, Tab,
  Switch, RadioGroup, FormControlLabel, Radio, Alert,
} from '@mui/material';
import {
  Add, Edit, Refresh, Key, Visibility, VisibilityOff, ContentCopy, Delete,
  Close, Upload, Tune, History, People,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  PageHeader, DataTable, EmptyState, CrudDialog,
} from '../../components/shared';

// ===================== Mock Data =====================
const MOCK_ADMIN_TOKENS = [
  { id: '1', name: '平台公共账户-DeepSeek', model_vendor: 'DeepSeek', model_name: 'DeepSeek-V3', api_key: 'sk-deepseek-abc1234567890xyz', total_quota: 10000000, used_quota: 7650000, cycle_type: 'monthly', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-06-01', updated_at: '2026-07-08' },
  { id: '2', name: '平台公共账户-Qwen', model_vendor: '阿里云', model_name: 'Qwen-Max', api_key: 'sk-qwen-xyz9876543210abc', total_quota: 5000000, used_quota: 4800000, cycle_type: 'monthly', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-05-15', updated_at: '2026-07-07' },
  { id: '3', name: '平台公共账户-GPT4o', model_vendor: 'OpenAI', model_name: 'GPT-4o', api_key: 'sk-openai-111222333444555', total_quota: 8000000, used_quota: 2100000, cycle_type: 'total', alert_threshold: 80, status: 'active', created_by: 'admin', created_at: '2026-04-20', updated_at: '2026-07-01' },
  { id: '4', name: '测试账户-Claude', model_vendor: 'Anthropic', model_name: 'Claude-3-Sonnet', api_key: 'sk-claude-test-999888777', total_quota: 1000000, used_quota: 960000, cycle_type: 'monthly', alert_threshold: 90, status: 'disabled', created_by: 'admin', created_at: '2026-03-10', updated_at: '2026-06-28' },
];

const MOCK_PERSONAL_TOKENS = [
  { id: 'p1', name: '张三', dept: '研发部', account: 'zhangsan', total_quota: 3000000, used_quota: 1850000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p2', name: '李四', dept: '研发部', account: 'lisi', total_quota: 3000000, used_quota: 2100000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p3', name: '王五', dept: '市场部', account: 'wangwu', total_quota: 2000000, used_quota: 2000000, reset_cycle: '每月1日', status: 'blocked' },
  { id: 'p4', name: '赵六', dept: '产品部', account: 'zhaoliu', total_quota: 3000000, used_quota: 980000, reset_cycle: '每月1日', status: 'active' },
  { id: 'p5', name: '孙七', dept: '运营部', account: 'sunqi', total_quota: 2000000, used_quota: 1450000, reset_cycle: '每月1日', status: 'active' },
];

const MODEL_VENDORS = [
  { vendor: 'DeepSeek', models: ['DeepSeek-V3', 'DeepSeek-V2', 'DeepSeek-Coder'] },
  { vendor: 'OpenAI', models: ['GPT-4o', 'GPT-4o-mini', 'GPT-4-Turbo', 'o1-preview'] },
  { vendor: '阿里云', models: ['Qwen-Max', 'Qwen-Plus', 'Qwen-Turbo'] },
  { vendor: 'Anthropic', models: ['Claude-3-Sonnet', 'Claude-3-Opus', 'Claude-3-Haiku'] },
];

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
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
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
  // 个人 Token 调整弹窗
  const [personalEditOpen, setPersonalEditOpen] = useState(false);
  const [personalEditItem, setPersonalEditItem] = useState<any>(null);
  const [personalForm, setPersonalForm] = useState({ total_quota: '' });

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {});
  };

  const vendorModels = MODEL_VENDORS.find(v => v.vendor === adminForm.model_vendor)?.models || [];

  return (
    <Box>
      <PageHeader
        title="Token 账户"
        subtitle="管理平台管理员 Token 账户与个人 Token 额度"
        actions={<Tooltip title="刷新"><IconButton><Refresh /></IconButton></Tooltip>}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="管理员 Token" />
        <Tab label="个人 Token" />
      </Tabs>

      {/* =================== Tab 0: 管理员 Token =================== */}
      {tab === 0 && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            管理员 Token 为平台公共额度，仅有白名单权限的用户可创建使用管理员 Token 的 Agent。
          </Alert>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button variant="outlined" startIcon={<Upload />}>导出</Button>
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
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>创建/更新</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_ADMIN_TOKENS.map((item) => {
                const pct = item.total_quota > 0 ? (item.used_quota / item.total_quota) * 100 : 0;
                const remaining = item.total_quota - item.used_quota;
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
                      <Chip size="small" label={item.status === 'active' ? '启用' : '停用'} color={item.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {item.created_at}<br />{item.updated_at}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="编辑"><IconButton size="small" onClick={() => handleOpenAdmin(item)}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title={item.status === 'active' ? '停用' : '启用'}><IconButton size="small"><Switch size="small" checked={item.status === 'active'} /></IconButton></Tooltip>
                        <Tooltip title="充值"><IconButton size="small" color="primary" onClick={() => { setTopUpItem(item); setTopUpAmount(''); setTopUpOpen(true); }}><Upload fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="明细"><IconButton size="small"><History fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="成员"><IconButton size="small" onClick={() => navigate(`/tokens/whitelist?account_id=${item.id}`)}><People fontSize="small" /></IconButton></Tooltip>
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
            个人 Token 为每位用户的独立配额，超限后按超额策略处理。
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
                <TableCell sx={{ fontWeight: 700 }}>重置周期</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_PERSONAL_TOKENS.map((item) => {
                const pct = item.total_quota > 0 ? (item.used_quota / item.total_quota) * 100 : 0;
                const remaining = item.total_quota - item.used_quota;
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
                    <TableCell sx={{ fontSize: 12 }}>{item.reset_cycle}</TableCell>
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
                        <Tooltip title="重置"><IconButton size="small"><Refresh fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="查看明细"><IconButton size="small"><History fontSize="small" /></IconButton></Tooltip>
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
        onSave={() => setAdminDialogOpen(false)}
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
          <Button variant="contained" onClick={() => setTopUpOpen(false)}>确认充值</Button>
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
          <Button variant="contained" onClick={() => setPersonalEditOpen(false)}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
