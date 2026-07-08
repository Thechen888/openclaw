import { useState } from 'react';
import {
  Box, Button, Grid, Typography, Paper, Chip, LinearProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip,
  TextField, Divider, alpha, Switch, Tabs, Tab, InputAdornment, MenuItem,
} from '@mui/material';
import {
  Storefront, ShoppingCart, CheckCircle, Verified, LocalOffer,
  TrendingUp, AccountBalance, History, Refresh, Inventory2,
  Payments, Speed, Bolt, Settings, ToggleOn, ToggleOff,
  FlashOn, AccountBalanceWallet, People, Add, MonetizationOn,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, StatCard, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { tokenResaleApi } from '../../api/client';

// 套餐颜色映射
const TIER_COLORS: Record<string, string> = {
  starter: '#4caf50',
  standard: '#2196f3',
  pro: '#9c27b0',
  enterprise: '#ff9800',
};

const TIER_LABELS: Record<string, string> = {
  starter: '入门版',
  standard: '标准版',
  pro: '专业版',
  enterprise: '企业版',
};

// 模型等级颜色
const WEIGHT_COLORS: Record<string, string> = {
  '基础模型': '#4caf50',
  '高级模型': '#2196f3',
  '旗舰模型': '#ff9800',
};

// 按量计费结算周期文案
const CYCLE_LABELS: Record<string, string> = {
  daily: '按日结算',
  weekly: '按周结算',
  monthly: '按月结算',
};

const fmt = (n: any) => (Number(n) || 0).toLocaleString();

export default function TokenResalePage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  // 购买弹窗
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');

  // 额度设置弹窗
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ monthly_capacity: 0, self_reserved: 0, markup_rate: 0, auto_pricing: true });

  // 按量风控配置弹窗
  const [paygCfgOpen, setPaygCfgOpen] = useState(false);
  const [paygCfgForm, setPaygCfgForm] = useState({ enabled: true, payg_pool_quota: 0, min_deposit: 0, buyer_credit_limit: 0, settle_cycle: 'monthly' });

  // 开通按量账户弹窗（买方）
  const [openPaygOpen, setOpenPaygOpen] = useState(false);
  const [paygForm, setPaygForm] = useState({ buyer_name: '', buyer_contact: '', deposit: 0, credit_limit: 0, agreed: false });

  // 充值弹窗
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAccount, setDepositAccount] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState(0);

  // 账单类型筛选
  const [billType, setBillType] = useState<'package' | 'payg'>('package');

  const { page, pageSize, setPage, setPageSize } = useTableState();

  // ============ 数据查询 ============
  const { data: overviewData } = useQuery({
    queryKey: ['token-resale-overview'],
    queryFn: () => tokenResaleApi.overview(),
  });
  const overview = overviewData?.data?.data || {};

  const { data: packagesData, isLoading: pkgLoading } = useQuery({
    queryKey: ['token-resale-packages'],
    queryFn: () => tokenResaleApi.packages(),
  });
  const packages: any[] = packagesData?.data?.data || [];

  const { data: packagesAllData } = useQuery({
    queryKey: ['token-resale-packages-all'],
    queryFn: () => tokenResaleApi.packages({ all: 1 }),
  });
  const packagesAll: any[] = packagesAllData?.data?.data || [];

  const { data: weightsData } = useQuery({
    queryKey: ['token-resale-weights'],
    queryFn: () => tokenResaleApi.modelWeights(),
  });
  const weights: any[] = weightsData?.data?.data || [];

  const { data: supplyData } = useQuery({
    queryKey: ['token-resale-supply'],
    queryFn: () => tokenResaleApi.supply(),
  });
  const supply = supplyData?.data?.data || {};

  const { data: pricingData } = useQuery({
    queryKey: ['token-resale-pricing'],
    queryFn: () => tokenResaleApi.pricing(),
  });
  const pricing: any[] = pricingData?.data?.data || [];

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['token-resale-transactions', page, pageSize],
    queryFn: () => tokenResaleApi.transactions({ page, page_size: pageSize }),
  });
  const transactions: any[] = txData?.data?.data || [];
  const txTotal = txData?.data?.pagination?.total || 0;

  const { data: billsData } = useQuery({
    queryKey: ['token-resale-bills'],
    queryFn: () => tokenResaleApi.bills({ page: 1, page_size: 50 }),
  });
  const bills: any[] = billsData?.data?.data || [];

  const { data: settleData } = useQuery({
    queryKey: ['token-resale-settlements'],
    queryFn: () => tokenResaleApi.settlements(),
  });
  const settlements: any[] = settleData?.data?.data || [];

  // ============ 按量计费数据 ============
  const { data: paygConfigData } = useQuery({
    queryKey: ['token-resale-payg-config'],
    queryFn: () => tokenResaleApi.paygConfig(),
  });
  const paygConfig = paygConfigData?.data?.data || {};

  const { data: paygRatesData } = useQuery({
    queryKey: ['token-resale-payg-rates'],
    queryFn: () => tokenResaleApi.paygRates(),
  });
  const paygRates: any[] = paygRatesData?.data?.data || [];

  const { data: paygAccountsData } = useQuery({
    queryKey: ['token-resale-payg-accounts'],
    queryFn: () => tokenResaleApi.paygAccounts({ page: 1, page_size: 50 }),
  });
  const paygAccounts: any[] = paygAccountsData?.data?.data || [];

  const { data: paygUsageData } = useQuery({
    queryKey: ['token-resale-payg-usage'],
    queryFn: () => tokenResaleApi.paygUsage({ page: 1, page_size: 50 }),
  });
  const paygUsage: any[] = paygUsageData?.data?.data || [];

  // 统一刷新：闭环联动的核心
  const invalidateAll = () => {
    ['token-resale-overview', 'token-resale-supply', 'token-resale-packages',
      'token-resale-packages-all', 'token-resale-transactions', 'token-resale-pricing',
      'token-resale-payg-config', 'token-resale-payg-rates', 'token-resale-payg-accounts',
      'token-resale-payg-usage']
      .forEach(k => qc.invalidateQueries({ queryKey: [k] }));
  };

  // ============ Mutations ============
  const purchaseMutation = useMutation({
    mutationFn: (d: any) => tokenResaleApi.purchase(d),
    onSuccess: (res: any) => {
      if (res?.data?.code && res.data.code !== 200 && res.data.code !== 0) {
        enqueueSnackbar(res.data.message || '购买失败', { variant: 'error' });
        return;
      }
      enqueueSnackbar('购买成功，Token 套餐已开通', { variant: 'success' });
      invalidateAll();
      setAgreementOpen(false);
      setAgreed(false);
      setBuyerName('');
      setBuyerContact('');
      setSelectedPackage(null);
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const updateSupplyMutation = useMutation({
    mutationFn: (d: any) => tokenResaleApi.updateSupply(d),
    onSuccess: (res: any) => {
      if (res?.data?.code && res.data.code !== 200 && res.data.code !== 0) {
        enqueueSnackbar(res.data.message || '保存失败', { variant: 'error' });
        return;
      }
      enqueueSnackbar('额度设置已保存，可售池已同步', { variant: 'success' });
      invalidateAll();
      setSupplyOpen(false);
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const togglePackageMutation = useMutation({
    mutationFn: (id: string) => tokenResaleApi.togglePackage(id),
    onSuccess: (res: any) => {
      const status = res?.data?.data?.status;
      enqueueSnackbar(status === 'listed' ? '套餐已上架' : '套餐已下架', { variant: 'success' });
      invalidateAll();
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const togglePricingMutation = useMutation({
    mutationFn: (id: string) => tokenResaleApi.togglePricing(id),
    onSuccess: () => {
      enqueueSnackbar('定价状态已更新', { variant: 'success' });
      invalidateAll();
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const updatePaygCfgMutation = useMutation({
    mutationFn: (d: any) => tokenResaleApi.updatePaygConfig(d),
    onSuccess: (res: any) => {
      if (res?.data?.code && res.data.code !== 200 && res.data.code !== 0) {
        enqueueSnackbar(res.data.message || '保存失败', { variant: 'error' });
        return;
      }
      enqueueSnackbar('按量配置已保存，产能已同步', { variant: 'success' });
      invalidateAll();
      setPaygCfgOpen(false);
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const togglePaygRateMutation = useMutation({
    mutationFn: (id: string) => tokenResaleApi.togglePaygRate(id),
    onSuccess: () => {
      enqueueSnackbar('按量定价状态已更新', { variant: 'success' });
      invalidateAll();
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const openPaygMutation = useMutation({
    mutationFn: (d: any) => tokenResaleApi.openPayg(d),
    onSuccess: (res: any) => {
      if (res?.data?.code && res.data.code !== 200 && res.data.code !== 0) {
        enqueueSnackbar(res.data.message || '开通失败', { variant: 'error' });
        return;
      }
      enqueueSnackbar('按量账户已开通', { variant: 'success' });
      invalidateAll();
      setOpenPaygOpen(false);
      setPaygForm({ buyer_name: '', buyer_contact: '', deposit: 0, credit_limit: 0, agreed: false });
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount }: any) => tokenResaleApi.depositPayg(id, { amount }),
    onSuccess: () => {
      enqueueSnackbar('充值成功', { variant: 'success' });
      invalidateAll();
      setDepositOpen(false);
      setDepositAccount(null);
      setDepositAmount(0);
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const togglePaygAccountMutation = useMutation({
    mutationFn: (id: string) => tokenResaleApi.togglePaygAccount(id),
    onSuccess: (res: any) => {
      const status = res?.data?.data?.status;
      enqueueSnackbar(status === 'active' ? '账户已恢复' : '账户已暂停', { variant: 'success' });
      invalidateAll();
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  // ============ 交互 ============
  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setAgreed(false);
    setBuyerName('');
    setBuyerContact('');
    setAgreementOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!agreed) return enqueueSnackbar('请先同意转售协议', { variant: 'warning' });
    if (!buyerName.trim()) return enqueueSnackbar('请填写购买方名称', { variant: 'warning' });
    purchaseMutation.mutate({
      package_id: selectedPackage.id,
      buyer_name: buyerName,
      buyer_contact: buyerContact,
    });
  };

  const openSupplyDialog = () => {
    setSupplyForm({
      monthly_capacity: supply.monthly_capacity || 0,
      self_reserved: supply.self_reserved || 0,
      markup_rate: supply.markup_rate || 0,
      auto_pricing: supply.auto_pricing ?? true,
    });
    setSupplyOpen(true);
  };

  const handleSaveSupply = () => {
    const cap = Number(supplyForm.monthly_capacity);
    const reserved = Number(supplyForm.self_reserved);
    if (cap <= 0) return enqueueSnackbar('月产能必须大于 0', { variant: 'warning' });
    // 前端拦截：自用 + 已挂售 + 已售出 + 按量池 不得越界
    if (reserved + (supply.listed || 0) + (supply.sold || 0) + (supply.payg_pool || 0) > cap) {
      return enqueueSnackbar('自用预留与已挂售/已售出/按量池之和超过月产能，请调整', { variant: 'warning' });
    }
    updateSupplyMutation.mutate(supplyForm);
  };

  const openPaygCfgDialog = () => {
    setPaygCfgForm({
      enabled: paygConfig.enabled ?? true,
      payg_pool_quota: paygConfig.payg_pool_quota || 0,
      min_deposit: paygConfig.min_deposit || 0,
      buyer_credit_limit: paygConfig.buyer_credit_limit || 0,
      settle_cycle: paygConfig.settle_cycle || 'monthly',
    });
    setPaygCfgOpen(true);
  };

  const handleSavePaygCfg = () => {
    const pool = Number(paygCfgForm.payg_pool_quota);
    // 前端拦截：自用 + 已挂售 + 已售出 + 按量池 不得超月产能
    if ((supply.self_reserved || 0) + (supply.listed || 0) + (supply.sold || 0) + pool > (supply.monthly_capacity || 0)) {
      return enqueueSnackbar('按量池与自用/挂售/已售之和超过月产能，请调整', { variant: 'warning' });
    }
    updatePaygCfgMutation.mutate(paygCfgForm);
  };

  const handleOpenPayg = () => {
    if (!paygForm.agreed) return enqueueSnackbar('请先同意按量计费协议', { variant: 'warning' });
    if (!paygForm.buyer_name.trim()) return enqueueSnackbar('请填写企业名称', { variant: 'warning' });
    if (Number(paygForm.deposit) < (paygConfig.min_deposit || 0)) {
      return enqueueSnackbar(`首充金额不得低于 ¥${paygConfig.min_deposit}`, { variant: 'warning' });
    }
    openPaygMutation.mutate({
      buyer_name: paygForm.buyer_name,
      buyer_contact: paygForm.buyer_contact,
      deposit: Number(paygForm.deposit),
      credit_limit: Number(paygForm.credit_limit) || undefined,
    });
  };

  const openDepositDialog = (acc: any) => {
    setDepositAccount(acc);
    setDepositAmount(0);
    setDepositOpen(true);
  };

  const handleDeposit = () => {
    if (Number(depositAmount) <= 0) return enqueueSnackbar('充值金额必须大于 0', { variant: 'warning' });
    depositMutation.mutate({ id: depositAccount.id, amount: Number(depositAmount) });
  };

  // ============ 供应产能分段 ============
  const cap = supply.monthly_capacity || 1;
  const segReserved = ((supply.self_reserved || 0) / cap) * 100;
  const segListed = ((supply.listed || 0) / cap) * 100;
  const segSold = ((supply.sold || 0) / cap) * 100;
  const segPayg = ((supply.payg_pool || 0) / cap) * 100;
  const segAvail = ((supply.available || 0) / cap) * 100;

  return (
    <Box>
      <PageHeader
        title="Token 转售"
        subtitle="将算力卡富余的 AI 能力打包成 Token 套餐，按加权用量出售给第三方"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={invalidateAll}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Storefront fontSize="small" />} iconPosition="start" label="Token 市场" />
        <Tab icon={<Inventory2 fontSize="small" />} iconPosition="start" label="我的供应" />
        <Tab icon={<LocalOffer fontSize="small" />} iconPosition="start" label="在售 / 已售" />
        <Tab icon={<Payments fontSize="small" />} iconPosition="start" label="交易账单" />
        <Tab icon={<FlashOn fontSize="small" />} iconPosition="start" label="按量管理" />
      </Tabs>

      {/* ==================== Tab 0：Token 市场（买方） ==================== */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="平台总Token(加权)" value={fmt(overview.total_tokens)} icon={<AccountBalance />} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="已分配(自用+已售)" value={fmt(overview.allocated_tokens)} icon={<TrendingUp />} color="warning" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="可售余量" value={fmt(overview.available_tokens)} icon={<LocalOffer />} color="success" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="成交笔数" value={overview.total_transactions || 0} icon={<History />} color="info" />
            </Grid>
          </Grid>

          {/* 套餐卡片 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storefront fontSize="small" /> Token 套餐（在售）
          </Typography>
          {pkgLoading ? <LoadingState /> : packages.length === 0 ? (
            <EmptyState title="暂无在售套餐" description="卖方可在「在售 / 已售」看板中上架套餐" />
          ) : (
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {packages.map((pkg: any) => {
                const tierColor = TIER_COLORS[pkg.tier] || '#666';
                const sold = pkg.sold || 0;
                const remaining = pkg.total_quota - sold;
                return (
                  <Grid key={pkg.id} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Paper sx={{
                      p: 2.5, height: '100%', display: 'flex', flexDirection: 'column',
                      border: '2px solid', borderColor: alpha(tierColor, 0.3),
                      position: 'relative', overflow: 'hidden',
                      '&:hover': { borderColor: tierColor, transform: 'translateY(-2px)', boxShadow: 3 },
                      transition: 'all 0.2s',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Chip label={TIER_LABELS[pkg.tier] || pkg.tier} size="small"
                          sx={{ bgcolor: alpha(tierColor, 0.1), color: tierColor, fontWeight: 600, fontSize: 11 }} />
                        {pkg.popular && <Chip label="热门" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
                      </Box>

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{pkg.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>{pkg.description}</Typography>

                      {pkg.unit_price && (
                        <Chip label={`单价 ${pkg.unit_price}`} size="small" variant="outlined"
                          sx={{ alignSelf: 'flex-start', mb: 1.5, fontSize: 10, height: 20 }} />
                      )}

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: tierColor }}>
                          ¥{fmt(pkg.price)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          / {fmt(pkg.token_amount)} 加权Token
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, mb: 2 }}>
                        {(pkg.features || []).map((f: string, i: number) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption">{f}</Typography>
                          </Box>
                        ))}
                      </Box>

                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">剩余额度</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {fmt(remaining)} / {fmt(pkg.total_quota)}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={(sold / pkg.total_quota) * 100}
                          sx={{ height: 4, borderRadius: 2, bgcolor: alpha(tierColor, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: tierColor } }} />
                      </Box>

                      <Button variant="contained" fullWidth startIcon={<ShoppingCart />}
                        onClick={() => handleSelectPackage(pkg)} disabled={remaining <= 0}
                        sx={{ bgcolor: tierColor, '&:hover': { bgcolor: alpha(tierColor, 0.85) } }}>
                        {remaining <= 0 ? '已售罄' : '立即购买'}
                      </Button>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* 按量计费区 */}
          {paygConfig.enabled && (
            <Paper sx={{ p: 2.5, mb: 4, border: '2px solid', borderColor: alpha('#00bcd4', 0.3), position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FlashOn sx={{ color: '#00bcd4' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>按量计费</Typography>
                  <Chip label="开通即用·用多少付多少" size="small" sx={{ bgcolor: alpha('#00bcd4', 0.12), color: '#00838f', fontWeight: 600, fontSize: 11 }} />
                </Box>
                <Button variant="contained" startIcon={<AccountBalanceWallet />}
                  onClick={() => { setPaygForm({ buyer_name: '', buyer_contact: '', deposit: paygConfig.min_deposit || 0, credit_limit: paygConfig.buyer_credit_limit || 0, agreed: false }); setOpenPaygOpen(true); }}
                  sx={{ bgcolor: '#00bcd4', '&:hover': { bgcolor: '#00acc1' } }}>
                  立即开通
                </Button>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                无需预估用量，开通后预充值即可调用；套餐额度优先扣减，耗尽后自动转按量计费。首充 ¥{fmt(paygConfig.min_deposit)} 起，默认消费上限 ¥{fmt(paygConfig.buyer_credit_limit)}。
              </Alert>
              <Grid container spacing={2}>
                {paygRates.filter((r: any) => r.enabled).length === 0 ? (
                  <Grid size={12}><EmptyState title="暂无开放的按量模型等级" /></Grid>
                ) : paygRates.filter((r: any) => r.enabled).map((r: any) => {
                  const c = WEIGHT_COLORS[r.model_tier] || '#666';
                  return (
                    <Grid key={r.id} size={{ xs: 12, sm: 4 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderLeft: '4px solid', borderColor: c }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c, mb: 1 }}>{r.model_tier}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">输入</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>¥{(r.sell_input / 100).toFixed(2)} / 1M</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">输出</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>¥{(r.sell_output / 100).toFixed(2)} / 1M</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {/* 模型消耗系数说明 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Speed fontSize="small" /> 模型消耗系数
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            套餐额度以<strong>加权 Token</strong> 计量：调用不同等级模型按系数折算，例如调用 1 万旗舰模型 Token 消耗 12 万加权 Token。
          </Alert>
          <Grid container spacing={2}>
            {weights.map((w: any, i: number) => {
              const c = WEIGHT_COLORS[w.tier] || '#666';
              return (
                <Grid key={i} size={{ xs: 12, sm: 4 }}>
                  <Paper sx={{ p: 2, borderLeft: '4px solid', borderColor: c }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c }}>{w.tier}</Typography>
                      <Chip icon={<Bolt sx={{ fontSize: 14 }} />} label={`×${w.weight}`} size="small"
                        sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{w.models}</Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ==================== Tab 1：我的供应（卖方设置） ==================== */}
      {tab === 1 && (
        <Box>
          {/* 供应概览 */}
          <Paper sx={{ p: 2.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2 color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{supply.card_model || '算力供应'}</Typography>
              </Box>
              <Button variant="outlined" size="small" startIcon={<Settings />} onClick={openSupplyDialog}>
                额度设置
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">月产能(加权)</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{fmt(supply.monthly_capacity)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">自用预留</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{fmt(supply.self_reserved)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">已挂售</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.main' }}>{fmt(supply.listed)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">已售出</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>{fmt(supply.sold)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">按量池</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#00bcd4' }}>{fmt(supply.payg_pool)}</Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <Typography variant="caption" color="text.secondary">可挂售余量</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{fmt(supply.available)}</Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  产能分配（跟随官方价自动加价 {supply.markup_rate}%{supply.auto_pricing ? ' · 已开启' : ' · 已关闭'}）
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: 'action.hover' }}>
                <Tooltip title={`自用预留 ${fmt(supply.self_reserved)}`}><Box sx={{ width: `${segReserved}%`, bgcolor: 'warning.main' }} /></Tooltip>
                <Tooltip title={`已挂售 ${fmt(supply.listed)}`}><Box sx={{ width: `${segListed}%`, bgcolor: 'info.main' }} /></Tooltip>
                <Tooltip title={`已售出 ${fmt(supply.sold)}`}><Box sx={{ width: `${segSold}%`, bgcolor: 'secondary.main' }} /></Tooltip>
                <Tooltip title={`按量池 ${fmt(supply.payg_pool)}`}><Box sx={{ width: `${segPayg}%`, bgcolor: '#00bcd4' }} /></Tooltip>
                <Tooltip title={`可挂售 ${fmt(supply.available)}`}><Box sx={{ width: `${segAvail}%`, bgcolor: 'success.main' }} /></Tooltip>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                <LegendDot color="warning.main" label="自用预留" />
                <LegendDot color="info.main" label="已挂售" />
                <LegendDot color="secondary.main" label="已售出" />
                <LegendDot color="#00bcd4" label="按量池" />
                <LegendDot color="success.main" label="可挂售余量" />
              </Box>
            </Box>
          </Paper>

          {/* 收益概览 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard title="本月销售额" value={`¥${fmt(supply.month_revenue)}`} icon={<TrendingUp />} color="success" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard title="已结算" value={`¥${fmt(supply.month_settled)}`} icon={<AccountBalance />} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <StatCard title="待结算" value={`¥${fmt(supply.pending_settle)}`} icon={<Payments />} color="warning" />
            </Grid>
          </Grid>

          {/* 定价表 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOffer fontSize="small" /> 模型分层定价（分 / 1M tokens）
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>模型等级</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成本·输入</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成本·输出</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>售价·输入</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>售价·输出</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>毛利率</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pricing.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无定价配置" /></TableCell></TableRow>
              ) : pricing.map((pr: any) => {
                const cost = pr.cost_input_miss + pr.cost_output;
                const sell = pr.sell_input_miss + pr.sell_output;
                const margin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                const c = WEIGHT_COLORS[pr.model_tier] || '#666';
                return (
                  <TableRow key={pr.id} hover>
                    <TableCell>
                      <Chip label={pr.model_tier} size="small" sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{(pr.cost_input_miss / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{(pr.cost_output / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{(pr.sell_input_miss / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{(pr.sell_output / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={`${margin.toFixed(0)}%`} size="small" color={margin > 40 ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!pr.enabled} size="small"
                        onChange={() => togglePricingMutation.mutate(pr.id)}
                        disabled={togglePricingMutation.isPending} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>

          {/* 按量计费配置 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 4, mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlashOn fontSize="small" sx={{ color: '#00bcd4' }} /> 按量计费配置
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={paygConfig.enabled ? '已开放' : '已关闭'} size="small"
                color={paygConfig.enabled ? 'success' : 'default'} variant="outlined" />
              <Button variant="outlined" size="small" startIcon={<Settings />} onClick={openPaygCfgDialog}>按量设置</Button>
            </Box>
          </Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">按量池产能</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00bcd4' }}>{fmt(paygConfig.payg_pool_quota)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">最低预充值</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>¥{fmt(paygConfig.min_deposit)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">默认消费上限</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>¥{fmt(paygConfig.buyer_credit_limit)}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">结算周期</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{CYCLE_LABELS[paygConfig.settle_cycle] || paygConfig.settle_cycle || '—'}</Typography>
              </Paper>
            </Grid>
          </Grid>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>模型等级</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成本·输入</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成本·输出</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>售价·输入</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>售价·输出</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>毛利率</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>开放</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paygRates.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无按量定价配置" /></TableCell></TableRow>
              ) : paygRates.map((r: any) => {
                const cost = r.cost_input + r.cost_output;
                const sell = r.sell_input + r.sell_output;
                const margin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                const c = WEIGHT_COLORS[r.model_tier] || '#666';
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Chip label={r.model_tier} size="small" sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{(r.cost_input / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{(r.cost_output / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{(r.sell_input / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{(r.sell_output / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={`${margin.toFixed(0)}%`} size="small" color={margin > 40 ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!r.enabled} size="small"
                        onChange={() => togglePaygRateMutation.mutate(r.id)}
                        disabled={togglePaygRateMutation.isPending} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </Box>
      )}

      {/* ==================== Tab 2：在售 / 已售 看板 ==================== */}
      {tab === 2 && (
        <Box>
          {/* 在售商品 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storefront fontSize="small" /> 在售商品管理
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            上架后套餐进入 Token 市场供第三方购买，下架后立即从市场移除；上/下架会实时重算「可挂售余量」。
          </Alert>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>套餐</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>档位</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>挂售总额度</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>已售</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>剩余</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packagesAll.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无套餐" /></TableCell></TableRow>
              ) : packagesAll.map((pkg: any) => {
                const c = TIER_COLORS[pkg.tier] || '#666';
                const remaining = (pkg.total_quota || 0) - (pkg.sold || 0);
                const listed = pkg.status === 'listed';
                return (
                  <TableRow key={pkg.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{pkg.name}</TableCell>
                    <TableCell>
                      <Chip label={TIER_LABELS[pkg.tier] || pkg.tier} size="small" sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(pkg.total_quota)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(pkg.sold)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(remaining)}</TableCell>
                    <TableCell>
                      <StatusBadge status={listed ? 'active' : 'degraded'} label={listed ? '在售' : '已下架'} />
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined"
                        color={listed ? 'warning' : 'success'}
                        startIcon={listed ? <ToggleOff /> : <ToggleOn />}
                        onClick={() => togglePackageMutation.mutate(pkg.id)}
                        disabled={togglePackageMutation.isPending}>
                        {listed ? '下架' : '上架'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>

          {/* 已售订单 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <History fontSize="small" /> 已售订单
          </Typography>
          {txLoading ? <LoadingState /> : (
            <DataTable pagination={{ page, pageSize, total: txTotal, onPageChange: setPage, onPageSizeChange: setPageSize }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>交易编号</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>购买方</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>套餐</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>占用额度</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>金额</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>成交时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={7}><EmptyState title="暂无成交订单" /></TableCell></TableRow>
                ) : transactions.map((tx: any) => (
                  <TableRow key={tx.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{tx.id}</Typography></TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{tx.buyer_name}</TableCell>
                    <TableCell><Chip label={tx.package_name} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{fmt(tx.token_amount)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>¥{fmt(tx.price)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={tx.status === 'completed' ? 'active' : tx.status === 'pending' ? 'degraded' : 'error'}
                        label={tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '待确认' : '已取消'} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{new Date(tx.created_at).toLocaleString('zh-CN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </Box>
      )}

      {/* ==================== Tab 3：交易账单 ==================== */}
      {tab === 3 && (
        <Box>
          {/* 买方用量账单 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payments fontSize="small" /> 用量账单明细
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>购买方</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>模型等级</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>调用次数</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>原始Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>加权Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>金额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>日期</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无账单" /></TableCell></TableRow>
              ) : bills.map((b: any) => {
                const c = WEIGHT_COLORS[b.model_tier] || '#666';
                return (
                  <TableRow key={b.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{b.buyer_name}</TableCell>
                    <TableCell><Chip label={b.model_tier} size="small" sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(b.calls)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(b.tokens_used)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(b.weighted_tokens)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>¥{fmt(b.amount)}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{new Date(b.date).toLocaleDateString('zh-CN')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>

          {/* 卖方结算记录 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalance fontSize="small" /> 结算记录
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>结算周期</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>销售总额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>平台服务费</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>实际到账</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>结算时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settlements.length === 0 ? (
                <TableRow><TableCell colSpan={6}><EmptyState title="暂无结算记录" /></TableCell></TableRow>
              ) : settlements.map((s: any) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{s.period}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>¥{fmt(s.gross)}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>-¥{fmt(s.platform_fee)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>¥{fmt(s.net)}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status === 'settled' ? 'active' : 'degraded'}
                      label={s.status === 'settled' ? '已结算' : '待结算'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {s.settled_at ? new Date(s.settled_at).toLocaleDateString('zh-CN') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </Box>
      )}

      {/* ==================== Tab 4：按量管理（卖方） ==================== */}
      {tab === 4 && (
        <Box>
          {(() => {
            const usedPaygTokens = paygUsage.reduce((s: number, u: any) => s + (u.weighted_tokens || 0), 0);
            const monthPaygRevenue = paygAccounts.reduce((s: number, a: any) => s + (a.month_consumed || 0), 0);
            const poolUsage = (paygConfig.payg_pool_quota || 0) > 0 ? (usedPaygTokens / paygConfig.payg_pool_quota * 100) : 0;
            return (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <StatCard title="按量用户数" value={paygAccounts.length} icon={<People />} color="info" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <StatCard title="本月按量收入" value={`¥${fmt(monthPaygRevenue)}`} icon={<MonetizationOn />} color="success" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <StatCard title="按量池使用率" value={`${poolUsage.toFixed(1)}%`} icon={<Speed />} color="warning" />
                </Grid>
              </Grid>
            );
          })()}

          {/* 按量用户列表 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <People fontSize="small" /> 按量用户
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>买家</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>余额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>本月消费</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>累计消费</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>消费上限</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paygAccounts.length === 0 ? (
                <TableRow><TableCell colSpan={7}><EmptyState title="暂无按量用户" /></TableCell></TableRow>
              ) : paygAccounts.map((a: any) => {
                const active = a.status === 'active';
                return (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{a.buyer_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={active ? 'active' : 'error'} label={active ? '正常' : '已暂停'} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: a.balance > 0 ? 'success.main' : 'error.main' }}>¥{fmt(a.balance)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{fmt(a.month_consumed)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>¥{fmt(a.total_consumed)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>¥{fmt(a.credit_limit)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => openDepositDialog(a)}>充值</Button>
                        <Button size="small" variant="outlined" color={active ? 'warning' : 'success'}
                          onClick={() => togglePaygAccountMutation.mutate(a.id)}
                          disabled={togglePaygAccountMutation.isPending}>
                          {active ? '暂停' : '恢复'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>

          {/* 按量消耗明细 */}
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlashOn fontSize="small" sx={{ color: '#00bcd4' }} /> 按量消耗明细
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>买家</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>模型等级</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>调用次数</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>输入Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>输出Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>加权Token</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>金额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>结算</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paygUsage.length === 0 ? (
                <TableRow><TableCell colSpan={8}><EmptyState title="暂无按量消耗" /></TableCell></TableRow>
              ) : paygUsage.map((u: any) => {
                const c = WEIGHT_COLORS[u.model_tier] || '#666';
                return (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{u.buyer_name}</TableCell>
                    <TableCell><Chip label={u.model_tier} size="small" sx={{ bgcolor: alpha(c, 0.12), color: c, fontWeight: 600 }} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(u.calls)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(u.input_tokens)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{fmt(u.output_tokens)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{fmt(u.weighted_tokens)}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>¥{fmt(u.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.settle_status === 'settled' ? 'active' : 'degraded'}
                        label={u.settle_status === 'settled' ? '已结算' : '待结算'} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </Box>
      )}

      {/* ==================== 额度设置弹窗 ==================== */}
      <Dialog open={supplyOpen} onClose={() => setSupplyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings color="primary" /> 额度设置
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            自用预留 + 已挂售({fmt(supply.listed)}) + 已售出({fmt(supply.sold)}) 不得超过月产能，保存后可售余量自动重算。
          </Alert>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth size="small" type="number" label="月产能（加权 Token）"
                value={supplyForm.monthly_capacity}
                onChange={e => setSupplyForm({ ...supplyForm, monthly_capacity: Number(e.target.value) })} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" type="number" label="自用预留（加权 Token）"
                value={supplyForm.self_reserved}
                onChange={e => setSupplyForm({ ...supplyForm, self_reserved: Number(e.target.value) })}
                helperText={`可挂售余量将 = 月产能 - 自用预留 - 已挂售 - 已售出`} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" type="number" label="加价率"
                value={supplyForm.markup_rate}
                onChange={e => setSupplyForm({ ...supplyForm, markup_rate: Number(e.target.value) })}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }} />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Switch checked={supplyForm.auto_pricing}
                  onChange={e => setSupplyForm({ ...supplyForm, auto_pricing: e.target.checked })} />}
                label="跟随官方价自动加价" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSupplyOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveSupply} disabled={updateSupplyMutation.isPending}>
            {updateSupplyMutation.isPending ? '保存中...' : '保存设置'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== 购买协议弹窗 ==================== */}
      <Dialog open={agreementOpen} onClose={() => setAgreementOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Verified color="primary" /> Token 转售协议
        </DialogTitle>
        <DialogContent>
          {selectedPackage && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedPackage.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedPackage.description}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>¥{fmt(selectedPackage.price)}</Typography>
                    <Typography variant="caption" color="text.secondary">{fmt(selectedPackage.token_amount)} 加权Token</Typography>
                  </Box>
                </Box>
              </Paper>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>购买方信息</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <TextField fullWidth size="small" label="购买方名称" required value={buyerName}
                    onChange={e => setBuyerName(e.target.value)} placeholder="公司/组织名称" />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth size="small" label="联系方式" value={buyerContact}
                    onChange={e => setBuyerContact(e.target.value)} placeholder="邮箱或手机号" />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>转售协议条款</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto', mb: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.8 }}>
                  <strong>OpenClaw Token 转售服务协议</strong><br /><br />
                  1. <strong>服务说明：</strong>本平台将指定数量的 AI 能力调用 Token 授权转让给购买方使用，Token 以加权口径计量，可调用平台所有 AI 模型接口。<br /><br />
                  2. <strong>使用范围：</strong>购买方获得的 Token 仅限自身业务使用，不得再次转售或分发给未经授权的第三方。<br /><br />
                  3. <strong>有效期限：</strong>Token 自购买日起按套餐约定有效期内有效，过期未使用不予退还。<br /><br />
                  4. <strong>服务保障：</strong>平台保证有效期内提供稳定 API 服务，承诺 99.9% 可用性 SLA。<br /><br />
                  5. <strong>计费规则：</strong>按加权 Token 计费，调用不同等级模型按消耗系数折算，具体参照模型消耗系数表。<br /><br />
                  6. <strong>数据安全：</strong>平台不存储购买方通过 API 传输的业务数据，调用数据仅做审计保留 30 天后自动删除。<br /><br />
                  7. <strong>退款政策：</strong>已购买 Token 不支持退款。如因平台原因导致服务中断超 SLA 承诺，将按比例补偿 Token。<br /><br />
                  8. <strong>免责声明：</strong>购买方使用 Token 产生的 AI 输出内容由其自行负责，平台不对输出准确性承担责任。
                </Typography>
              </Paper>

              <FormControlLabel
                control={<Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} color="primary" />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>我已阅读并同意上述《Token 转售服务协议》的所有条款</Typography>}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAgreementOpen(false)}>取消</Button>
          <Button variant="contained" startIcon={<Verified />} onClick={handleConfirmPurchase}
            disabled={!agreed || !buyerName.trim() || purchaseMutation.isPending}>
            {purchaseMutation.isPending ? '处理中...' : '确认购买'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// 图例小圆点
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
