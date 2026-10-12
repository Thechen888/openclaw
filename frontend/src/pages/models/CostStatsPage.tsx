import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, Grid,
  Card, CardContent, Typography, IconButton, Tooltip, LinearProgress,
  Chip, FormControl, InputLabel, Select, MenuItem, Tab, Tabs, Stack,
} from '@mui/material';
import { Refresh, AttachMoney, TrendingUp, Speed, Category } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import {
  PageHeader, StatCard, DataTable, LoadingState, EmptyState,
} from '../../components/shared';
import { usageCostApi } from '../../api/client';

const fmtMoney = (v: number) => `¥${(v ?? 0).toFixed(4)}`;
const fmtInt = (v: number) => (v ?? 0).toLocaleString();
const fmtM = (v: number) => {
  if (v == null) return '0';
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
};

type DetailTab = 'by_model' | 'by_source' | 'by_source_model';

export default function CostStatsPage() {
  const [start, setStart] = useState<Dayjs>(dayjs().startOf('month'));
  const [end, setEnd] = useState<Dayjs>(dayjs());
  const [deptId, setDeptId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [model, setModel] = useState('');
  const [tab, setTab] = useState<DetailTab>('by_model');

  const filters = {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    dept_id: deptId || undefined,
    source_id: sourceId || undefined,
    model: model || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cost-overview', filters],
    queryFn: () => usageCostApi.overview(filters),
  });

  const ov = data?.data?.data || {};
  const scope: string = ov.scope || 'self';
  const cards = ov.cards || {};
  const trend: any[] = ov.trend || [];
  const modelTop: any[] = ov.model_top || [];
  const sourceShare: any[] = ov.source_share || [];
  const detail = ov.detail || {};
  const detailRows: any[] = detail[tab] || [];

  const modelNameOf = (row: any) =>
    tab === 'by_model' ? row.model
      : tab === 'by_source' ? row.source_name
        : `${row.source_name} / ${row.model}`;

  return (
    <Box>
      <PageHeader
        title="费用统计"
        subtitle="模型使用费用和支出概览"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      {/* 筛选栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="开始日期" value={start} maxDate={end}
                onChange={(v) => v && setStart(v)}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="结束日期" value={end} minDate={start}
                onChange={(v) => v && setEnd(v)}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>

            {scope === 'all' && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>部门范围</InputLabel>
                <Select label="部门范围" value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}>
                  <MenuItem value="">全部部门</MenuItem>
                  {(ov.dept_options || []).map((d: any) => (
                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {scope === 'dept' && (
              <Tooltip title="如需查看其他部门，请联系管理员开通权限">
                <Chip color="primary" variant="outlined"
                  label={`${ov.dept_label || '本部门'} · 仅本部门`} />
              </Tooltip>
            )}

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>模型源</InputLabel>
              <Select label="模型源" value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}>
                <MenuItem value="">全部模型源</MenuItem>
                {sourceShare.map((s: any) => (
                  <MenuItem key={s.source_id} value={s.source_id}>{s.source_name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>模型</InputLabel>
              <Select label="模型" value={model}
                onChange={(e) => setModel(e.target.value)}>
                <MenuItem value="">全部模型</MenuItem>
                {modelTop.map((m: any) => (
                  <MenuItem key={m.model} value={m.model}>{m.model}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {isLoading ? <LoadingState /> : (
        <>
          {/* 4 张统计卡 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="总费用" value={fmtMoney(cards.total_cost)} icon={<AttachMoney />} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="请求总数" value={fmtInt(cards.total_requests)} icon={<TrendingUp />} color="info" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="总 Tokens" value={fmtM(cards.total_tokens)}
                sub={`输入 ${fmtM(cards.input_tokens)} / 输出 ${fmtM(cards.output_tokens)}`}
                icon={<Category />} color="warning" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="平均耗时" value={`${cards.avg_latency_ms ?? 0}ms`} icon={<Speed />} color="error" />
            </Grid>
          </Grid>

          {/* 用量趋势 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>用量趋势</Typography>
              {trend.length === 0 ? (
                <EmptyState title="所选范围内暂无用量记录" />
              ) : (
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.08)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} tickFormatter={(v) => fmtM(v)} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'rgba(200,210,220,0.6)' }} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="input_tokens" name="输入 Token" fill="#00D4FF" radius={[2, 2, 0, 0]} />
                      <Bar yAxisId="left" dataKey="output_tokens" name="输出 Token" fill="#7C3AED" radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="requests" name="请求数" stroke="#FFB800" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="cost" name="费用(¥)" stroke="#FF3366" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Top / 占比 并排 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>模型费用 Top</Typography>
                  {modelTop.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                  ) : modelTop.map((m: any) => (
                    <Box key={m.model} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.model}</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{fmtMoney(m.cost)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={Math.min(m.pct, 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>{m.pct.toFixed(1)}%</Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>模型源费用占比</Typography>
                  {sourceShare.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">暂无数据</Typography>
                  ) : sourceShare.map((s: any) => (
                    <Box key={s.source_id} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.source_name}</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{fmtMoney(s.cost)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={Math.min(s.pct, 100)} color="secondary" sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>{s.pct.toFixed(1)}%</Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 费用明细 */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>费用明细</Typography>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab value="by_model" label="按模型" />
                <Tab value="by_source" label="按模型源" />
                <Tab value="by_source_model" label="按源×模型" />
              </Tabs>
              <DataTable>
                <TableHead>
                  <TableRow>
                    <TableCell>{tab === 'by_source' ? '模型源' : tab === 'by_source_model' ? '源 × 模型' : '模型'}</TableCell>
                    <TableCell align="right">请求数</TableCell>
                    <TableCell align="right">输入 Token</TableCell>
                    <TableCell align="right">输出 Token</TableCell>
                    <TableCell align="right">费用</TableCell>
                    <TableCell align="right">占比</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailRows.length === 0 ? (
                    <TableRow><TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>所选范围内暂无记录</Typography>
                    </TableCell></TableRow>
                  ) : detailRows.map((row: any, i: number) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{modelNameOf(row)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(row.requests)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(row.input_tokens)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtInt(row.output_tokens)}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtMoney(row.cost)}</TableCell>
                      <TableCell align="right" sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={Math.min(row.pct, 100)} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>{row.pct.toFixed(1)}%</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTable>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
