import { useState } from 'react';
import {
  Box, Button, Grid, Typography, Paper, Chip, LinearProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton, Tooltip,
  TextField, MenuItem, Divider, alpha, Switch, FormGroup,
} from '@mui/material';
import {
  Storefront, ShoppingCart, CheckCircle, Verified, LocalOffer,
  TrendingUp, AccountBalance, History, Visibility, ContentCopy,
  Refresh, Launch,
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

export default function TokenResalePage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [demoMode, setDemoMode] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const { page, pageSize, setPage, setPageSize } = useTableState();

  // 获取转售概览
  const { data: overviewData } = useQuery({
    queryKey: ['token-resale-overview'],
    queryFn: () => tokenResaleApi.overview(),
  });
  const overview = overviewData?.data?.data || {};

  // 获取套餐列表
  const { data: packagesData, isLoading: pkgLoading } = useQuery({
    queryKey: ['token-resale-packages'],
    queryFn: () => tokenResaleApi.packages(),
  });
  const packages: any[] = packagesData?.data?.data || [];

  // 获取交易记录
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['token-resale-transactions', page, pageSize],
    queryFn: () => tokenResaleApi.transactions({ page, page_size: pageSize }),
  });
  const transactions: any[] = txData?.data?.data || [];
  const txTotal = txData?.data?.pagination?.total || 0;

  // 购买/转售操作
  const purchaseMutation = useMutation({
    mutationFn: (d: any) => tokenResaleApi.purchase(d),
    onSuccess: () => {
      enqueueSnackbar('转售协议已确认，Token 已分配给第三方', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['token-resale-overview'] });
      qc.invalidateQueries({ queryKey: ['token-resale-transactions'] });
      qc.invalidateQueries({ queryKey: ['token-resale-packages'] });
      setAgreementOpen(false);
      setAgreed(false);
      setBuyerName('');
      setBuyerContact('');
      setSelectedPackage(null);
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setAgreed(false);
    setBuyerName('');
    setBuyerContact('');
    setAgreementOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!agreed) {
      enqueueSnackbar('请先同意转售协议', { variant: 'warning' });
      return;
    }
    if (!buyerName.trim()) {
      enqueueSnackbar('请填写购买方名称', { variant: 'warning' });
      return;
    }
    purchaseMutation.mutate({
      package_id: selectedPackage.id,
      buyer_name: buyerName,
      buyer_contact: buyerContact,
    });
  };

  const usagePct = overview.total_tokens > 0
    ? ((overview.allocated_tokens || 0) / overview.total_tokens) * 100 : 0;

  const stats = [
    { title: '平台总Token', value: (overview.total_tokens || 0).toLocaleString(), icon: <AccountBalance />, color: 'primary' },
    { title: '已分配/使用', value: (overview.allocated_tokens || 0).toLocaleString(), icon: <TrendingUp />, color: 'warning' },
    { title: '可转售余量', value: (overview.available_tokens || 0).toLocaleString(), icon: <LocalOffer />, color: 'success' },
    { title: '已售出交易', value: overview.total_transactions || 0, icon: <History />, color: 'info' },
  ];

  return (
    <Box>
      <PageHeader
        title={demoMode ? 'OpenClaw Token 市场' : 'Token 转售管理'}
        subtitle={demoMode ? '为第三方企业提供 AI 能力 Token 按量采购服务' : '管理剩余 Token 额度转售给第三方'}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={demoMode} onChange={e => setDemoMode(e.target.checked)} size="small" />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>演示模式</Typography>}
              />
            </FormGroup>
            <Tooltip title="刷新">
              <IconButton onClick={() => qc.invalidateQueries({ queryKey: ['token-resale-overview'] })}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {demoMode && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<Visibility />}>
          当前为<strong>演示模式</strong>，适合向第三方客户展示 Token 转售服务。关闭演示模式可查看管理功能。
        </Alert>
      )}

      {/* 概览统计 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={s.title} value={s.value} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      {/* 总量使用情况 */}
      {!demoMode && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Token 总量分配情况</Typography>
            <Typography variant="caption" color="text.secondary">
              已分配 {usagePct.toFixed(1)}% · 剩余 {(100 - usagePct).toFixed(1)}% 可转售
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usagePct}
            color={usagePct > 80 ? 'warning' : 'primary'}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Paper>
      )}

      {/* Token 套餐列表 */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Storefront fontSize="small" />
        {demoMode ? '可购买 Token 套餐' : '转售套餐配置'}
      </Typography>

      {pkgLoading ? <LoadingState /> : (
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
                  {/* 顶部标签 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Chip
                      label={TIER_LABELS[pkg.tier] || pkg.tier}
                      size="small"
                      sx={{ bgcolor: alpha(tierColor, 0.1), color: tierColor, fontWeight: 600, fontSize: 11 }}
                    />
                    {pkg.popular && <Chip label="热门" size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
                  </Box>

                  {/* 套餐名称 */}
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {pkg.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                    {pkg.description}
                  </Typography>

                  {/* 价格 */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: tierColor }}>
                      ¥{pkg.price?.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / {pkg.token_amount?.toLocaleString()} Tokens
                    </Typography>
                  </Box>

                  {/* 特性列表 */}
                  <Box sx={{ flex: 1, mb: 2 }}>
                    {(pkg.features || []).map((f: string, i: number) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                        <Typography variant="caption">{f}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* 库存 */}
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">剩余额度</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {remaining.toLocaleString()} / {pkg.total_quota.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(sold / pkg.total_quota) * 100}
                      sx={{ height: 4, borderRadius: 2, bgcolor: alpha(tierColor, 0.1),
                        '& .MuiLinearProgress-bar': { bgcolor: tierColor },
                      }}
                    />
                  </Box>

                  {/* 购买按钮 */}
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ShoppingCart />}
                    onClick={() => handleSelectPackage(pkg)}
                    disabled={remaining <= 0}
                    sx={{ bgcolor: tierColor, '&:hover': { bgcolor: alpha(tierColor, 0.85) } }}
                  >
                    {remaining <= 0 ? '已售罄' : demoMode ? '立即购买' : '转售给第三方'}
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 交易记录 */}
      {!demoMode && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <History fontSize="small" />
            转售交易记录
          </Typography>
          {txLoading ? <LoadingState /> : (
            <DataTable pagination={{ page, pageSize, total: txTotal, onPageChange: setPage, onPageSizeChange: setPageSize }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>交易编号</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>购买方</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>套餐</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Token数量</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>金额</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>成交时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={7}><EmptyState title="暂无交易记录" description="开始转售 Token 后将在此显示交易历史" /></TableCell></TableRow>
                ) : transactions.map((tx: any) => (
                  <TableRow key={tx.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                        {tx.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{tx.buyer_name}</TableCell>
                    <TableCell>
                      <Chip label={tx.package_name} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {tx.token_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                      ¥{tx.price?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={tx.status === 'completed' ? 'active' : tx.status === 'pending' ? 'degraded' : 'error'}
                        label={tx.status === 'completed' ? '已完成' : tx.status === 'pending' ? '待确认' : '已取消'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {new Date(tx.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTable>
          )}
        </>
      )}

      {/* 转售协议弹窗 */}
      <Dialog open={agreementOpen} onClose={() => setAgreementOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Verified color="primary" />
          Token 转售协议
        </DialogTitle>
        <DialogContent>
          {selectedPackage && (
            <Box>
              {/* 套餐信息 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{selectedPackage.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedPackage.description}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      ¥{selectedPackage.price?.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedPackage.token_amount?.toLocaleString()} Tokens
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* 购买方信息 */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>购买方信息</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <TextField
                    fullWidth size="small" label="购买方名称" required
                    value={buyerName} onChange={e => setBuyerName(e.target.value)}
                    placeholder="公司/组织名称"
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth size="small" label="联系方式"
                    value={buyerContact} onChange={e => setBuyerContact(e.target.value)}
                    placeholder="邮箱或手机号"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* 协议内容 */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>转售协议条款</Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto', mb: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.8 }}>
                  <strong>OpenClaw Token 转售服务协议</strong><br /><br />
                  1. <strong>服务说明：</strong>本平台将指定数量的 AI 能力调用 Token 授权转让给购买方使用。Token 可用于调用平台提供的所有 AI 模型接口。<br /><br />
                  2. <strong>使用范围：</strong>购买方获得的 Token 仅限于其自身业务使用，不得再次转售或分发给未经授权的第三方。<br /><br />
                  3. <strong>有效期限：</strong>Token 自购买日起 365 天内有效，过期未使用的 Token 不予退还。<br /><br />
                  4. <strong>服务保障：</strong>平台保证在 Token 有效期内提供稳定的 API 服务，承诺 99.9% 的可用性 SLA。<br /><br />
                  5. <strong>计费规则：</strong>Token 按次计费，每次 API 调用根据模型类型消耗对应数量的 Token。具体消耗标准参照平台定价文档。<br /><br />
                  6. <strong>数据安全：</strong>平台不存储购买方通过 API 传输的业务数据，所有调用数据仅做审计用途保留 30 天后自动删除。<br /><br />
                  7. <strong>退款政策：</strong>已转售的 Token 不支持退款。如因平台原因导致服务中断超过 SLA 承诺，将按比例补偿 Token。<br /><br />
                  8. <strong>免责声明：</strong>购买方使用 Token 产生的所有 AI 输出内容由购买方自行负责，平台不对输出内容的准确性承担责任。
                </Typography>
              </Paper>

              <FormControlLabel
                control={
                  <Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} color="primary" />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    我已阅读并同意上述《Token 转售服务协议》的所有条款
                  </Typography>
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAgreementOpen(false)}>取消</Button>
          <Button
            variant="contained"
            startIcon={<Verified />}
            onClick={handleConfirmPurchase}
            disabled={!agreed || !buyerName.trim() || purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? '处理中...' : '确认同意转售'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
