import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Chip, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Switch, Card, CardContent, Grid, Alert, MenuItem,
} from '@mui/material';
import { Edit, Settings, Refresh, Tune, Save } from '@mui/icons-material';
import { PageHeader, DataTable } from '../../components/shared';

// ===================== Mock Data =====================
const MOCK_PERSONAL_QUOTAS = [
  { id: '1', name: '张三', dept: '研发部', use_default: true, daily_limit: 100000, monthly_limit: 3000000, daily_used: 45000, monthly_used: 1850000 },
  { id: '2', name: '李四', dept: '研发部', use_default: true, daily_limit: 100000, monthly_limit: 3000000, daily_used: 78000, monthly_used: 2100000 },
  { id: '3', name: '王五', dept: '市场部', use_default: false, daily_limit: 50000, monthly_limit: 2000000, daily_used: 50000, monthly_used: 2000000 },
  { id: '4', name: '赵六', dept: '产品部', use_default: true, daily_limit: 100000, monthly_limit: 3000000, daily_used: 32000, monthly_used: 980000 },
  { id: '5', name: '孙七', dept: '运营部', use_default: true, daily_limit: 100000, monthly_limit: 3000000, daily_used: 61000, monthly_used: 1450000 },
  { id: '6', name: '周八', dept: '研发部', use_default: false, daily_limit: 200000, monthly_limit: 5000000, daily_used: 12000, monthly_used: 340000 },
];

const MOCK_DEPT_QUOTAS = [
  { id: 'd1', name: '研发部', monthly_quota: 15000000, used: 9200000, per_capita: 3000000, agent_count: 12 },
  { id: 'd2', name: '市场部', monthly_quota: 5000000, used: 4200000, per_capita: 2000000, agent_count: 4 },
  { id: 'd3', name: '产品部', monthly_quota: 8000000, used: 3100000, per_capita: 3000000, agent_count: 6 },
  { id: 'd4', name: '运营部', monthly_quota: 6000000, used: 2800000, per_capita: 2000000, agent_count: 3 },
];

// 用户→可用资源池映射（基于成员资格）
const MOCK_POOL_MAP: Record<string, string[]> = {
  '张伟': ['平台公共账户-DeepSeek', '平台公共账户-Qwen'],
  '王五': ['平台公共账户-DeepSeek', '平台公共账户-GPT4o'],
  '赵六': ['平台公共账户-DeepSeek'],
  '李思': ['平台公共账户-Qwen'],
  '孙八': ['平台公共账户-Qwen'],
  '陈七': ['平台公共账户-GPT4o'],
  '周九': ['平台公共账户-GPT4o'],
};

function fmtNum(n: number) { return n.toLocaleString(); }

function quotaColor(pct: number) {
  if (pct >= 95) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}

export default function QuotaManagePage() {
  const [tab, setTab] = useState(0);

  // 全局默认模板
  const [defaultForm, setDefaultForm] = useState({ daily: '100000', monthly: '3000000', auto_reset: true });
  const [defaultSaved, setDefaultSaved] = useState(false);

  // 个人配额编辑弹窗
  const [personalEditOpen, setPersonalEditOpen] = useState(false);
  const [personalEditItem, setPersonalEditItem] = useState<any>(null);
  const [personalForm, setPersonalForm] = useState({ daily_limit: '', monthly_limit: '', use_default: true });

  // 部门配额编辑弹窗
  const [deptEditOpen, setDeptEditOpen] = useState(false);
  const [deptEditItem, setDeptEditItem] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({ monthly_quota: '', overage_policy: 'block' });


  const openPersonalEdit = (item: any) => {
    setPersonalEditItem(item);
    setPersonalForm({ daily_limit: String(item.daily_limit), monthly_limit: String(item.monthly_limit), use_default: item.use_default });
    setPersonalEditOpen(true);
  };

  const openDeptEdit = (item: any) => {
    setDeptEditItem(item);
    setDeptForm({ monthly_quota: String(item.monthly_quota), overage_policy: 'block' });
    setDeptEditOpen(true);
  };


  return (
    <Box>
      <PageHeader title="配额管理" subtitle="配置个人与部门的 Token 配额" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="个人配额" />
        <Tab label="部门配额" />
      </Tabs>

      {/* =================== Tab 0: 个人配额 =================== */}
      {tab === 0 && (
        <>
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>默认配额模板</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                未单独配置的用户将自动应用此模板。修改后即时生效。
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={3}>
                  <TextField fullWidth label="每日限额 (Tokens)" type="number" size="small" value={defaultForm.daily} onChange={e => setDefaultForm({ ...defaultForm, daily: e.target.value })} />
                </Grid>
                <Grid size={3}>
                  <TextField fullWidth label="每月限额 (Tokens)" type="number" size="small" value={defaultForm.monthly} onChange={e => setDefaultForm({ ...defaultForm, monthly: e.target.value })} />
                </Grid>
                <Grid size={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch checked={defaultForm.auto_reset} onChange={e => setDefaultForm({ ...defaultForm, auto_reset: e.target.checked })} />
                    <Typography variant="body2">超出周期自动重置</Typography>
                  </Box>
                </Grid>
                <Grid size={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" size="small" startIcon={<Save />} onClick={() => setDefaultSaved(true)}>保存模板</Button>
                </Grid>
              </Grid>
              {defaultSaved && <Alert severity="success" sx={{ mt: 1.5 }} onClose={() => setDefaultSaved(false)}>默认配额模板已保存</Alert>}
            </CardContent>
          </Card>

          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>姓名</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>可用资源池</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>适用配额</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">日限额</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">月限额</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>今日已用</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>本月已用</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_PERSONAL_QUOTAS.map((item) => {
                const dailyPct = item.daily_limit > 0 ? (item.daily_used / item.daily_limit) * 100 : 0;
                const monthlyPct = item.monthly_limit > 0 ? (item.monthly_used / item.monthly_limit) * 100 : 0;
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.dept}</TableCell>
                    <TableCell>
                      {(() => {
                        const pools = MOCK_POOL_MAP[item.name] || [];
                        return pools.length > 0
                          ? <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{pools.map((p: string) => <Chip key={p} size="small" label={p} variant="outlined" sx={{ fontSize: 10 }} />)}</Box>
                          : <Typography variant="caption" color="text.secondary">—</Typography>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {item.use_default
                        ? <Chip size="small" label="默认模板" color="primary" variant="outlined" />
                        : <Chip size="small" label="单独配置" variant="outlined" color="warning" />}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.daily_limit)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.monthly_limit)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fmtNum(item.daily_used)}</Typography>
                        <LinearProgress variant="determinate" value={Math.min(dailyPct, 100)} color={quotaColor(dailyPct) as any} sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{fmtNum(item.monthly_used)}</Typography>
                        <LinearProgress variant="determinate" value={Math.min(monthlyPct, 100)} color={quotaColor(monthlyPct) as any} sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="单独配置"><IconButton size="small" onClick={() => openPersonalEdit(item)}><Tune fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}

      {/* =================== Tab 1: 部门配额 =================== */}
      {tab === 1 && (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>部门配额为部门级总 Token 消耗上限，超出后按超额策略处理。</Alert>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>部门名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">月总配额</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>已用</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">人均配额</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Agent 数</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_DEPT_QUOTAS.map((item) => {
                const pct = item.monthly_quota > 0 ? (item.used / item.monthly_quota) * 100 : 0;
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.monthly_quota)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 80 }}>{fmtNum(item.used)}</Typography>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)} color={quotaColor(pct) as any} sx={{ flex: 1, height: 6, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 32, color: `${quotaColor(pct)}.main` }}>{pct.toFixed(0)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.per_capita)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.agent_count}</TableCell>
                    <TableCell>
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openDeptEdit(item)}><Edit fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}


      {/* =================== 个人配额编辑弹窗 =================== */}
      <Dialog open={personalEditOpen} onClose={() => setPersonalEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Typography variant="h6" sx={{ fontWeight: 700 }}>单独配置 — {personalEditItem?.name}</Typography></DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={!personalForm.use_default} onChange={e => setPersonalForm({ ...personalForm, use_default: !e.target.checked })} />
              <Typography variant="body2">启用单独配置（关闭则跟随默认模板）</Typography>
            </Box>
            <TextField fullWidth label="日限额 (Tokens)" type="number" disabled={personalForm.use_default} value={personalForm.daily_limit} onChange={e => setPersonalForm({ ...personalForm, daily_limit: e.target.value })} />
            <TextField fullWidth label="月限额 (Tokens)" type="number" disabled={personalForm.use_default} value={personalForm.monthly_limit} onChange={e => setPersonalForm({ ...personalForm, monthly_limit: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPersonalEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setPersonalEditOpen(false)}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* =================== 部门配额编辑弹窗 =================== */}
      <Dialog open={deptEditOpen} onClose={() => setDeptEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle><Typography variant="h6" sx={{ fontWeight: 700 }}>编辑部门配额 — {deptEditItem?.name}</Typography></DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField fullWidth label="部门月总配额 (Tokens)" type="number" value={deptForm.monthly_quota} onChange={e => setDeptForm({ ...deptForm, monthly_quota: e.target.value })} />
            <TextField fullWidth select label="超额策略" value={deptForm.overage_policy} onChange={e => setDeptForm({ ...deptForm, overage_policy: e.target.value })} helperText="超出部门配额后的处理方式，详见「超额策略」页面">
              <MenuItem value="block">停用（超额后暂停）</MenuItem>
              <MenuItem value="warn">仅警告</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeptEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setDeptEditOpen(false)}>保存</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
