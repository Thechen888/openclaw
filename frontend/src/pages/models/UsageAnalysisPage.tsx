import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, Grid, Card, CardContent,
  Typography, Chip, Tooltip, LinearProgress, FormControl, InputLabel, Select,
  MenuItem, Checkbox, FormControlLabel, Button, Stack,
} from '@mui/material';
import { Download, Token, AttachMoney, TrendingUp, Groups } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, StatCard, DataTable, LoadingState } from '../../components/shared';
import { usageAnalysisApi } from '../../api/client';
import UsageDetailDialog from './components/UsageDetailDialog';

const fmtMoney = (v: number) => `¥${(v ?? 0).toFixed(4)}`;
const fmtInt = (v: number) => (v ?? 0).toLocaleString();
const fmtM = (v: number) => {
  if (v == null) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
};

export default function UsageAnalysisPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [dimension, setDimension] = useState<'user' | 'resource'>('user');
  const [range, setRange] = useState('month');
  const [deptId, setDeptId] = useState('');
  const [aggOrg, setAggOrg] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailUser, setDetailUser] = useState<{ id: string; name: string } | null>(null);

  const params = {
    dimension, range,
    dept_id: deptId || undefined,
    agg_org: aggOrg || undefined,
    page, page_size: pageSize,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['usage-analysis', params],
    queryFn: () => usageAnalysisApi.list(params),
  });

  const payload = data?.data?.data || {};
  const scope: string = payload.scope || 'self';
  const cards = payload.cards || {};
  const rows: any[] = payload.rows || [];
  const total: number = payload.total || 0;
  const isSelf = scope === 'self';

  const showUser = !isSelf && dimension === 'user' && !aggOrg;
  const showDept = dimension !== 'resource';
  const showResource = dimension === 'resource';

  const handleExport = async () => {
    try {
      const res = await usageAnalysisApi.exportCsv({ dimension, range, dept_id: deptId || undefined, agg_org: aggOrg || undefined });
      const csv: string = res.data?.data ?? '';
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `用量分析-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      enqueueSnackbar(`已导出 ${total} 条`, { variant: 'success' });
    } catch {
      enqueueSnackbar('导出失败，请重试', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="用量分析"
        subtitle={isSelf ? '我的用量' : '按用户或资源包查看谁在花、花在哪个模型'}
      />

      {/* 筛选栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {!isSelf && (
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>维度</InputLabel>
                <Select label="维度" value={dimension}
                  onChange={(e) => { setDimension(e.target.value as any); setPage(1); }}>
                  <MenuItem value="user">用户</MenuItem>
                  <MenuItem value="resource">资源包</MenuItem>
                </Select>
              </FormControl>
            )}

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>时间</InputLabel>
              <Select label="时间" value={range}
                onChange={(e) => { setRange(e.target.value); setPage(1); }}>
                <MenuItem value="today">今天</MenuItem>
                <MenuItem value="week">本周</MenuItem>
                <MenuItem value="month">本月</MenuItem>
              </Select>
            </FormControl>

            {scope === 'all' && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>部门范围</InputLabel>
                <Select label="部门范围" value={deptId}
                  onChange={(e) => { setDeptId(e.target.value); setPage(1); }}>
                  <MenuItem value="">全部部门</MenuItem>
                  {(payload.dept_options || []).map((d: any) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {scope === 'dept' && (
              <Tooltip title="如需查看其他部门，请联系管理员开通权限">
                <Chip color="primary" variant="outlined" label={`${payload.dept_label || '本部门'} · 仅本部门`} />
              </Tooltip>
            )}

            {!isSelf && (
              <FormControlLabel
                control={<Checkbox checked={aggOrg} onChange={(e) => { setAggOrg(e.target.checked); setPage(1); }} size="small" />}
                label={<Typography variant="body2">按组织聚合</Typography>}
              />
            )}

            <Box sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<Download fontSize="small" />} onClick={handleExport}>
              导出报表
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 4 张卡 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="Tokens" value={fmtM(cards.tokens)} icon={<Token />} color="primary" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="费用" value={fmtMoney(cards.cost)} icon={<AttachMoney />} color="error" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="请求数" value={fmtInt(cards.requests)} icon={<TrendingUp />} color="info" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="主体数" value={fmtInt(cards.subjects)} icon={<Groups />} color="warning" /></Grid>
      </Grid>

      {/* 明细表 */}
      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}>
          <TableHead>
            <TableRow>
              {showUser && <TableCell>用户</TableCell>}
              {showDept && <TableCell>部门</TableCell>}
              {showResource && <TableCell>资源包</TableCell>}
              <TableCell align="right">请求数</TableCell>
              <TableCell align="right">输入 Tokens</TableCell>
              <TableCell align="right">输出 Tokens</TableCell>
              <TableCell align="right">Tokens</TableCell>
              <TableCell align="right">缓存 Tokens</TableCell>
              <TableCell align="right">缓存百分比</TableCell>
              <TableCell align="right">费用</TableCell>
              <TableCell>占比</TableCell>
              {dimension === 'user' && !aggOrg && <TableCell align="right">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={11}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>所选范围内暂无用量记录</Typography>
              </TableCell></TableRow>
            ) : rows.map((r: any, i: number) => (
              <TableRow key={r.user_id || r.dept_id || r.resource_name || i} hover sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
                {showUser && <TableCell sx={{ fontWeight: 600 }}>{r.user_name}</TableCell>}
                {showDept && <TableCell>{r.dept_name}</TableCell>}
                {showResource && <TableCell sx={{ fontWeight: 600 }}>{r.resource_name}</TableCell>}
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(r.requests)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(r.input_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(r.output_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(r.tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(r.cache_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{(r.cache_pct ?? 0).toFixed(1)}%</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtMoney(r.cost)}</TableCell>
                <TableCell sx={{ minWidth: 110 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={Math.min(r.pct, 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>{(r.pct ?? 0).toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
                {dimension === 'user' && !aggOrg && (
                  <TableCell align="right">
                    <Button size="small" onClick={() => setDetailUser({ id: r.user_id, name: r.user_name })}>查看分析</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      <UsageDetailDialog
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        userId={detailUser?.id ?? null}
        userName={detailUser?.name}
        range={range}
      />
    </Box>
  );
}
