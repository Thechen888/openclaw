import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, Grid,
  Card, CardContent, Typography, IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import { Refresh, AttachMoney, TrendingUp, Speed, Category } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, StatCard, DataTable, StatusBadge, LoadingState,
} from '../../components/shared';
import { modelSourcesApi, costStatsApi } from '../../api/client';

export default function CostStatsPage() {
  const { data: costData, isLoading: costLoading, refetch } = useQuery({
    queryKey: ['cost-stats'],
    queryFn: () => costStatsApi.summary(),
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['model-sources-all'],
    queryFn: () => modelSourcesApi.list({ page_size: 200 }),
  });

  const summary = costData?.data?.data || {};
  const sources = sourcesData?.data?.data || [];

  const stats = [
    {
      title: '总费用（30天）',
      value: summary.total_cost_30d != null ? `$${summary.total_cost_30d.toFixed(2)}` : '$0.00',
      change: summary.cost_change_pct ? { value: `${Math.abs(summary.cost_change_pct).toFixed(1)}%`, trend: summary.cost_change_pct >= 0 ? 'up' as const : 'down' as const } : undefined,
      icon: <AttachMoney />,
      color: 'primary',
    },
    {
      title: '总请求数（30天）',
      value: summary.total_requests_30d?.toLocaleString() ?? '0',
      change: summary.requests_change_pct ? { value: `${Math.abs(summary.requests_change_pct).toFixed(1)}%`, trend: summary.requests_change_pct >= 0 ? 'up' as const : 'down' as const } : undefined,
      icon: <TrendingUp />,
      color: 'info',
    },
    {
      title: '平均延迟',
      value: summary.avg_latency_ms ? `${summary.avg_latency_ms.toFixed(0)}ms` : '-',
      icon: <Speed />,
      color: 'warning',
    },
    {
      title: '活跃源',
      value: sources.filter((s: any) => s.status === 'active').length.toString(),
      icon: <Category />,
      color: 'success',
    },
  ];

  return (
    <Box>
      <PageHeader
        title="成本统计"
        subtitle="模型使用费用和支出概览"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <StatCard title={s.title} value={s.value} change={s.change} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>按模型源统计费用</Typography>

      {sourcesLoading ? <LoadingState /> : (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>模型源</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">请求数（30天）</TableCell>
              <TableCell align="right">输入Token</TableCell>
              <TableCell align="right">输出Token</TableCell>
              <TableCell align="right">预估费用</TableCell>
              <TableCell>使用率</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    暂未配置模型源
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sources.map((item: any) => {
              const cost = item.estimated_cost_30d ?? 0;
              const maxCost = Math.max(...sources.map((s: any) => s.estimated_cost_30d ?? 0), 1);
              const pct = (cost / maxCost) * 100;
              return (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.display_name || item.model_name}</TableCell>
                  <TableCell>{item.provider}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {item.requests_30d?.toLocaleString() ?? '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {item.input_tokens_30d?.toLocaleString() ?? '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {item.output_tokens_30d?.toLocaleString() ?? '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                    ${cost.toFixed(2)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>
                        {pct.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
