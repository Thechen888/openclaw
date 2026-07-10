import { useState } from 'react';
import {
  Box, Button, Grid, Typography, Chip, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip,
  TextField, Switch, Tabs, Tab, MenuItem, Stack, Divider,
} from '@mui/material';
import {
  Storefront, People, TrendingUp, AccountBalance, Receipt,
  Settings, ToggleOn, ToggleOff, Add, Delete, AccountBalanceWallet,
  Bolt, Edit,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, StatCard, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, SectionCard, CrudDialog,
} from '../../components/shared';
import { tokenResaleApi } from '../../api/client';

// 分配模式文案与配色
const MODE_LABELS: Record<string, string> = {
  priority_self: '优先自用',
  priority_sell: '优先转售',
  fixed_split: '固定拆分',
};
const MODE_COLORS: Record<string, string> = {
  priority_self: '#4caf50',
  priority_sell: '#ff9800',
  fixed_split: '#2196f3',
};

const fmt = (n: any) => (Number(n) || 0).toLocaleString();
// 分/1M tokens -> 元展示
const money = (cents: any) => `¥${((Number(cents) || 0) / 100).toFixed(2)}`;

interface Allocation { source_id: string; channels: number; token_limit: number; token_used?: number; }

export default function TokenResalePage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  // 可售资源编辑弹窗
  const [srcOpen, setSrcOpen] = useState(false);
  const [srcForm, setSrcForm] = useState<any>(null);

  // 客户账户弹窗
  const [buyerOpen, setBuyerOpen] = useState(false);
  const [buyerForm, setBuyerForm] = useState<any>(null);
  const [buyerIsNew, setBuyerIsNew] = useState(false);

  // 充值弹窗
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositBuyer, setDepositBuyer] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState(0);

  const { page, pageSize, setPage, setPageSize } = useTableState();

  // ============ 数据查询 ============
  const { data: overviewData } = useQuery({
    queryKey: ['tr-overview'],
    queryFn: () => tokenResaleApi.overview(),
  });
  const overview: any = overviewData?.data?.data || {};

  const { data: sourcesData, isLoading: srcLoading } = useQuery({
    queryKey: ['tr-sources'],
    queryFn: () => tokenResaleApi.sources(),
  });
  const sources: any[] = sourcesData?.data?.data || [];

  const { data: buyersData, isLoading: buyerLoading } = useQuery({
    queryKey: ['tr-buyers', page, pageSize],
    queryFn: () => tokenResaleApi.buyers({ page, page_size: pageSize }),
  });
  const buyers: any[] = buyersData?.data?.data || [];
  const buyersTotal = buyersData?.data?.pagination?.total || 0;

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['tr-usage'],
    queryFn: () => tokenResaleApi.usage({ page: 1, page_size: 50 }),
  });
  const usage: any[] = usageData?.data?.data || [];

  const { data: settleData } = useQuery({
    queryKey: ['tr-settlements'],
    queryFn: () => tokenResaleApi.settlements(),
  });
  const settlements: any[] = settleData?.data?.data || [];

  // ============ 变更操作 ============
  const invalidate = (...keys: string[]) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const updateSourceMut = useMutation({
    mutationFn: (v: any) => tokenResaleApi.updateSource(v.source_id, v),
    onSuccess: () => { enqueueSnackbar('模型源转售配置已更新', { variant: 'success' }); setSrcOpen(false); invalidate('tr-sources', 'tr-overview'); },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || '更新失败', { variant: 'error' }),
  });
  const toggleSourceMut = useMutation({
    mutationFn: (id: string) => tokenResaleApi.toggleSource(id),
    onSuccess: () => { invalidate('tr-sources', 'tr-overview'); },
  });

  const saveBuyerMut = useMutation({
    mutationFn: (v: any) => (v.id ? tokenResaleApi.updateBuyer(v.id, v) : tokenResaleApi.createBuyer(v)),
    onSuccess: () => { enqueueSnackbar('客户账户已保存', { variant: 'success' }); setBuyerOpen(false); invalidate('tr-buyers', 'tr-overview'); },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || '保存失败', { variant: 'error' }),
  });
  const deleteBuyerMut = useMutation({
    mutationFn: (id: string) => tokenResaleApi.deleteBuyer(id),
    onSuccess: () => { enqueueSnackbar('已删除', { variant: 'success' }); invalidate('tr-buyers', 'tr-overview'); },
  });
  const toggleBuyerMut = useMutation({
    mutationFn: (id: string) => tokenResaleApi.toggleBuyer(id),
    onSuccess: () => invalidate('tr-buyers'),
  });
  const depositMut = useMutation({
    mutationFn: (v: { id: string; amount: number }) => tokenResaleApi.depositBuyer(v.id, { amount: v.amount }),
    onSuccess: () => { enqueueSnackbar('充值成功', { variant: 'success' }); setDepositOpen(false); invalidate('tr-buyers'); },
  });

  // ============ 弹窗控制 ============
  const openSourceEdit = (s: any) => { setSrcForm({ ...s }); setSrcOpen(true); };
  const openBuyerNew = () => {
    setBuyerForm({ name: '', contact: '', credit_limit: 10000, balance: 0, allocations: [] as Allocation[] });
    setBuyerIsNew(true); setBuyerOpen(true);
  };
  const openBuyerEdit = (b: any) => {
    setBuyerForm({ id: b.id, name: b.name, contact: b.contact, credit_limit: b.credit_limit, balance: b.balance, allocations: (b.allocations || []).map((a: any) => ({ ...a })) });
    setBuyerIsNew(false); setBuyerOpen(true);
  };
  const openDeposit = (b: any) => { setDepositBuyer(b); setDepositAmount(0); setDepositOpen(true); };

  const addAllocation = () => {
    const used = new Set((buyerForm.allocations || []).map((a: Allocation) => a.source_id));
    const avail = sources.find(s => s.resale_enabled && !used.has(s.source_id));
    setBuyerForm((f: any) => ({ ...f, allocations: [...(f.allocations || []), { source_id: avail?.source_id || sources[0]?.source_id || '', channels: 1, token_limit: 1000000 }] }));
  };
  const updateAllocation = (i: number, patch: Partial<Allocation>) => {
    setBuyerForm((f: any) => ({ ...f, allocations: f.allocations.map((a: Allocation, idx: number) => idx === i ? { ...a, ...patch } : a) }));
  };
  const removeAllocation = (i: number) => {
    setBuyerForm((f: any) => ({ ...f, allocations: f.allocations.filter((_: any, idx: number) => idx !== i) }));
  };

  const sourceName = (id: string) => sources.find(s => s.source_id === id)?.display_name || id;

  return (
    <Box>
      <PageHeader
        title="Token 转售"
        subtitle="以模型源为粒度对外转售算力：配置通道拆分与计费，管理客户账户与账单"
      />

      {/* 概览指标 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard title="转售模型源" value={overview.active_sources ?? 0} icon={<Storefront />} color="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard title="空闲通道" value={`${overview.free_channels ?? 0}/${overview.total_resale_channels ?? 0}`} icon={<Bolt />} color="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard title="客户账户" value={`${overview.active_buyers ?? 0}/${overview.buyers ?? 0}`} icon={<People />} color="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard title="本月收入" value={`¥${fmt(overview.month_revenue)}`} icon={<TrendingUp />} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 2.4 }}>
          <StatCard title="待结算" value={`¥${fmt(overview.pending_settle)}`} icon={<AccountBalance />} color="error" />
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <Tab icon={<Storefront sx={{ fontSize: 18 }} />} iconPosition="start" label="可售资源" />
        <Tab icon={<People sx={{ fontSize: 18 }} />} iconPosition="start" label="客户账户" />
        <Tab icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" label="交易账单" />
      </Tabs>

      {/* ==================== Tab 0 可售资源 ==================== */}
      {tab === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            每个模型源可拆分为「自用通道」与「转售通道」。分配模式决定调用高峰时通道的倾斜策略：
            <b> 优先自用</b>=保障自身业务、<b>优先转售</b>=保障客户、<b>固定拆分</b>=严格按通道数隔离。
          </Alert>
          {srcLoading ? <LoadingState /> : sources.length === 0 ? (
            <EmptyState title="暂无模型源" description="请先在「模型源」中配置本地/上游模型" />
          ) : (
            <DataTable>
              <TableHead>
                <TableRow>
                  <TableCell>模型源</TableCell>
                  <TableCell>转售</TableCell>
                  <TableCell>分配模式</TableCell>
                  <TableCell>通道（自用 / 转售 / 总）</TableCell>
                  <TableCell>已借出 / 空闲</TableCell>
                  <TableCell>成本(入/出)</TableCell>
                  <TableCell>加价</TableCell>
                  <TableCell>售价(入/出)</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sources.map((s) => (
                  <TableRow key={s.source_id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{s.display_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.provider}</Typography>
                    </TableCell>
                    <TableCell>
                      <Switch size="small" checked={!!s.resale_enabled} onChange={() => toggleSourceMut.mutate(s.source_id)} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={MODE_LABELS[s.mode] || s.mode}
                        sx={{ height: 22, fontSize: 11, fontWeight: 600, color: MODE_COLORS[s.mode], borderColor: MODE_COLORS[s.mode], bgcolor: `${MODE_COLORS[s.mode]}14` }}
                        variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {s.self_channels} / {s.resale_channels} / {s.total_channels}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        <Box component="span" sx={{ color: '#ff9800' }}>{s.borrowed_channels}</Box>
                        {' / '}
                        <Box component="span" sx={{ color: '#4caf50' }}>{s.free_resale_channels}</Box>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{money(s.cost_input)} / {money(s.cost_output)}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={`+${s.markup_rate}%`} sx={{ height: 20, fontSize: 11 }} /></TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#00D4FF' }}>{money(s.sell_input)} / {money(s.sell_output)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="配置转售">
                        <IconButton size="small" onClick={() => openSourceEdit(s)}><Settings fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </Box>
      )}

      {/* ==================== Tab 1 客户账户 ==================== */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={openBuyerNew} size="small">新增客户</Button>
          </Box>
          {buyerLoading ? <LoadingState /> : buyers.length === 0 ? (
            <EmptyState title="暂无客户账户" description="点击「新增客户」为买方开通账户并分配通道" action={<Button variant="contained" startIcon={<Add />} onClick={openBuyerNew}>新增客户</Button>} />
          ) : (
            <DataTable pagination={{ page, pageSize, total: buyersTotal, onPageChange: setPage, onPageSizeChange: setPageSize }}>
              <TableHead>
                <TableRow>
                  <TableCell>客户</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>余额</TableCell>
                  <TableCell>信用额度</TableCell>
                  <TableCell>本月 / 累计消费</TableCell>
                  <TableCell>通道分配</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {buyers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{b.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{b.contact}</Typography>
                    </TableCell>
                    <TableCell><StatusBadge status={b.status} label={b.status === 'active' ? '正常' : '停用'} /></TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', color: b.balance > 0 ? '#4caf50' : '#FF3366' }}>¥{fmt(b.balance)}</Typography>
                    </TableCell>
                    <TableCell><Typography sx={{ fontFamily: 'monospace' }}>¥{fmt(b.credit_limit)}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>¥{fmt(b.month_consumed)} / ¥{fmt(b.total_consumed)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(b.allocations || []).length === 0 && <Typography variant="caption" color="text.secondary">未分配</Typography>}
                        {(b.allocations || []).map((a: Allocation) => (
                          <Chip key={a.source_id} size="small" label={`${sourceName(a.source_id)} ×${a.channels}`}
                            sx={{ height: 20, fontSize: 10 }} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="充值"><IconButton size="small" onClick={() => openDeposit(b)}><AccountBalanceWallet fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openBuyerEdit(b)}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title={b.status === 'active' ? '停用' : '启用'}>
                        <IconButton size="small" onClick={() => toggleBuyerMut.mutate(b.id)}>
                          {b.status === 'active' ? <ToggleOn fontSize="small" sx={{ color: '#4caf50' }} /> : <ToggleOff fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除"><IconButton size="small" onClick={() => { if (confirm(`确认删除客户「${b.name}」？`)) deleteBuyerMut.mutate(b.id); }}><Delete fontSize="small" sx={{ color: '#FF3366' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </Box>
      )}

      {/* ==================== Tab 2 交易账单 ==================== */}
      {tab === 2 && (
        <Box>
          <SectionCard title="用量明细" sx={{ mb: 3 }}>
            {usageLoading ? <LoadingState /> : usage.length === 0 ? (
              <EmptyState title="暂无用量记录" />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>客户</TableCell>
                    <TableCell>模型源</TableCell>
                    <TableCell align="right">调用次数</TableCell>
                    <TableCell align="right">输入 / 输出 Tokens</TableCell>
                    <TableCell align="right">成本</TableCell>
                    <TableCell align="right">售价</TableCell>
                    <TableCell align="right">毛利</TableCell>
                    <TableCell>结算</TableCell>
                    <TableCell>时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usage.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.buyer_name}</TableCell>
                      <TableCell>{u.source_name}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{fmt(u.calls)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmt(u.input_tokens)} / {fmt(u.output_tokens)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{fmt(u.cost_amount)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#00D4FF' }}>¥{fmt(u.sell_amount)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#4caf50' }}>¥{fmt((u.sell_amount || 0) - (u.cost_amount || 0))}</TableCell>
                      <TableCell><StatusBadge status={u.settle_status} label={u.settle_status === 'settled' ? '已结算' : '待结算'} /></TableCell>
                      <TableCell><Typography variant="caption" color="text.secondary">{new Date(u.created_at).toLocaleDateString()}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>

          <SectionCard title="结算记录">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>结算周期</TableCell>
                  <TableCell align="right">销售总额</TableCell>
                  <TableCell align="right">平台服务费</TableCell>
                  <TableCell align="right">净收入</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>结算时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settlements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.period}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{fmt(s.gross)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#FF3366' }}>-¥{fmt(s.platform_fee)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: '#4caf50', fontWeight: 700 }}>¥{fmt(s.net)}</TableCell>
                    <TableCell><StatusBadge status={s.status} label={s.status === 'settled' ? '已结算' : '待结算'} /></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{s.settled_at ? new Date(s.settled_at).toLocaleDateString() : '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </Box>
      )}

      {/* ========== 模型源转售配置弹窗 ========== */}
      <CrudDialog
        open={srcOpen}
        onClose={() => setSrcOpen(false)}
        title={`配置转售 · ${srcForm?.display_name || ''}`}
        saving={updateSourceMut.isPending}
        onSave={() => updateSourceMut.mutate(srcForm)}
      >
        {srcForm && (
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 600 }}>开启转售</Typography>
              <Switch checked={!!srcForm.resale_enabled} onChange={(e) => setSrcForm({ ...srcForm, resale_enabled: e.target.checked })} />
            </Box>
            <TextField select label="分配模式" size="small" fullWidth value={srcForm.mode}
              onChange={(e) => setSrcForm({ ...srcForm, mode: e.target.value })}>
              {Object.entries(MODE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="总通道数" type="number" size="small" fullWidth value={srcForm.total_channels}
                onChange={(e) => setSrcForm({ ...srcForm, total_channels: Number(e.target.value) })} />
              <TextField label="自用通道" type="number" size="small" fullWidth value={srcForm.self_channels}
                onChange={(e) => setSrcForm({ ...srcForm, self_channels: Number(e.target.value) })} />
              <TextField label="转售通道" type="number" size="small" fullWidth value={srcForm.resale_channels}
                onChange={(e) => setSrcForm({ ...srcForm, resale_channels: Number(e.target.value) })} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              自用 + 转售 = {(Number(srcForm.self_channels) || 0) + (Number(srcForm.resale_channels) || 0)} / 总 {srcForm.total_channels}；当前已借出 {srcForm.borrowed_channels ?? 0} 个
            </Typography>
            <Divider />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="输入成本(分/1M)" type="number" size="small" fullWidth value={srcForm.cost_input}
                onChange={(e) => setSrcForm({ ...srcForm, cost_input: Number(e.target.value) })} />
              <TextField label="输出成本(分/1M)" type="number" size="small" fullWidth value={srcForm.cost_output}
                onChange={(e) => setSrcForm({ ...srcForm, cost_output: Number(e.target.value) })} />
            </Box>
            <TextField label="加价率 (%)" type="number" size="small" fullWidth value={srcForm.markup_rate}
              onChange={(e) => setSrcForm({ ...srcForm, markup_rate: Number(e.target.value) })} />
            <Alert severity="info" sx={{ py: 0.5 }}>
              预计售价：输入 {money(Math.round((srcForm.cost_input || 0) * (1 + (srcForm.markup_rate || 0) / 100)))} / 输出 {money(Math.round((srcForm.cost_output || 0) * (1 + (srcForm.markup_rate || 0) / 100)))}（每 1M tokens）
            </Alert>
          </Stack>
        )}
      </CrudDialog>

      {/* ========== 客户账户弹窗 ========== */}
      <CrudDialog
        open={buyerOpen}
        onClose={() => setBuyerOpen(false)}
        title={buyerIsNew ? '新增客户账户' : `编辑客户 · ${buyerForm?.name || ''}`}
        saving={saveBuyerMut.isPending}
        onSave={() => saveBuyerMut.mutate(buyerForm)}
      >
        {buyerForm && (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label="客户名称" size="small" fullWidth value={buyerForm.name}
                onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })} />
              <TextField label="联系方式" size="small" fullWidth value={buyerForm.contact}
                onChange={(e) => setBuyerForm({ ...buyerForm, contact: e.target.value })} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField label={buyerIsNew ? '首充金额 (元)' : '账户余额 (元)'} type="number" size="small" fullWidth value={buyerForm.balance}
                onChange={(e) => setBuyerForm({ ...buyerForm, balance: Number(e.target.value) })} />
              <TextField label="信用额度 (元)" type="number" size="small" fullWidth value={buyerForm.credit_limit}
                onChange={(e) => setBuyerForm({ ...buyerForm, credit_limit: Number(e.target.value) })} />
            </Box>
            <Divider textAlign="left"><Typography variant="caption" color="text.secondary">通道分配</Typography></Divider>
            {(buyerForm.allocations || []).map((a: Allocation, i: number) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField select size="small" label="模型源" sx={{ flex: 2 }} value={a.source_id}
                  onChange={(e) => updateAllocation(i, { source_id: e.target.value })}>
                  {sources.filter(s => s.resale_enabled).map(s => <MenuItem key={s.source_id} value={s.source_id}>{s.display_name}（空闲 {s.free_resale_channels}）</MenuItem>)}
                </TextField>
                <TextField type="number" size="small" label="通道" sx={{ flex: 1 }} value={a.channels}
                  onChange={(e) => updateAllocation(i, { channels: Number(e.target.value) })} />
                <TextField type="number" size="small" label="Token上限" sx={{ flex: 1.5 }} value={a.token_limit}
                  onChange={(e) => updateAllocation(i, { token_limit: Number(e.target.value) })} />
                <IconButton size="small" onClick={() => removeAllocation(i)}><Delete fontSize="small" sx={{ color: '#FF3366' }} /></IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<Add />} onClick={addAllocation} sx={{ alignSelf: 'flex-start' }}>添加通道分配</Button>
          </Stack>
        )}
      </CrudDialog>

      {/* ========== 充值弹窗 ========== */}
      <CrudDialog
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title={`账户充值 · ${depositBuyer?.name || ''}`}
        saving={depositMut.isPending}
        onSave={() => depositMut.mutate({ id: depositBuyer.id, amount: depositAmount })}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            当前余额：<Box component="span" sx={{ color: '#4caf50', fontWeight: 700 }}>¥{fmt(depositBuyer?.balance)}</Box>
          </Typography>
          <TextField label="充值金额 (元)" type="number" size="small" fullWidth value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))} />
          {depositAmount > 0 && (
            <Typography variant="caption" color="text.secondary">
              充值后余额：¥{fmt((depositBuyer?.balance || 0) + depositAmount)}
            </Typography>
          )}
        </Stack>
      </CrudDialog>
    </Box>
  );
}
