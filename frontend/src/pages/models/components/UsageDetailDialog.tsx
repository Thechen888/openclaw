import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Grid,
  Typography, Table, TableHead, TableBody, TableRow, TableCell, LinearProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import { LoadingState } from '../../../components/shared';
import { usageAnalysisApi } from '../../../api/client';

const fmtMoney = (v: number) => `¥${(v ?? 0).toFixed(4)}`;
const fmtInt = (v: number) => (v ?? 0).toLocaleString();
const fmtM = (v: number) => {
  if (v == null) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
};

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)', height: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{label}</Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#00D4FF' }}>{value}</Typography>
      {sub && <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{sub}</Typography>}
    </Box>
  );
}

export default function UsageDetailDialog({ open, onClose, userId, userName, range }: {
  open: boolean; onClose: () => void; userId: string | null; userName?: string; range?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-detail', userId, range],
    queryFn: () => usageAnalysisApi.detail(userId as string, { range }),
    enabled: open && !!userId,
  });

  const d = data?.data?.data || {};
  const quota = d.quota || {};
  const overview = d.overview || {};
  const daily: any[] = d.daily || [];
  const modelSplit: any[] = d.model_split || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        用量明细 — {userName || userId}
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {isLoading ? <LoadingState /> : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 额度快照 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#00D4FF' }}>额度快照</Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="额度" value="¥200" sub="按月重置" /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="窗口内已用" value={fmtMoney(quota.used_cost)} sub={`${fmtM(quota.used_tokens)} Tokens`} /></Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)', height: '100%' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>已用百分比</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#00D4FF' }}>{(quota.used_pct ?? 0).toFixed(1)}%</Typography>
                    <LinearProgress variant="determinate" value={Math.min(quota.used_pct ?? 0, 100)} sx={{ height: 5, borderRadius: 3, mt: 0.5 }} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="缓存命中率" value={`${(quota.cache_pct ?? 0).toFixed(1)}%`} /></Grid>
              </Grid>
            </Box>

            {/* 概览 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#00D4FF' }}>概览</Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="请求数" value={fmtInt(overview.requests)} /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="Tokens" value={fmtM(overview.tokens)} /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="费用" value={fmtMoney(overview.cost)} /></Grid>
                <Grid size={{ xs: 6, md: 3 }}><StatBox label="输入 Tokens" value={fmtM(overview.input_tokens)} /></Grid>
              </Grid>
            </Box>

            {/* 日趋势 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#00D4FF' }}>日趋势</Typography>
              {daily.length === 0 ? (
                <Typography variant="body2" color="text.secondary">所选范围内暂无记录</Typography>
              ) : (
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <AreaChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tokensFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} tickFormatter={(v) => fmtM(v)} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area yAxisId="left" type="monotone" dataKey="tokens" name="Tokens" stroke="#00D4FF" fill="url(#tokensFill)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="cost" name="费用(¥)" stroke="#FF3366" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Box>

            {/* 模型拆分 */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#00D4FF' }}>模型拆分</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>模型</TableCell>
                      <TableCell align="right">请求数</TableCell>
                      <TableCell align="right">Tokens</TableCell>
                      <TableCell align="right">费用</TableCell>
                      <TableCell align="right">占比</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modelSplit.length === 0 ? (
                      <TableRow><TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>暂无数据</Typography>
                      </TableCell></TableRow>
                    ) : modelSplit.map((m: any, i: number) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{m.model}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(m.requests)}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(m.tokens)}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtMoney(m.cost)}</TableCell>
                        <TableCell align="right" sx={{ minWidth: 110 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={Math.min(m.pct, 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 38, textAlign: 'right' }}>{m.pct.toFixed(1)}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
