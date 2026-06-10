import {
  Box, Grid, Card, CardContent, Typography, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, Chip,
} from '@mui/material';
import {
  Refresh, TrendingUp, People, SmartToy, Extension,
  Api, AttachMoney, Speed, CalendarMonth,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, StatCard, LoadingState, DataTable, StatusBadge } from '../../components/shared';
import { statsApi } from '../../api/client';

export default function UsageStatsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: () => statsApi.dashboard(),
  });

  const stats = data?.data?.data || {};

  const statCards = [
    {
      title: 'Total API Calls (30d)',
      value: stats.total_api_calls_30d?.toLocaleString() ?? '12,456',
      change: { value: '12.5%', trend: 'up' as const },
      icon: <Api />,
      color: 'primary',
    },
    {
      title: 'Active Users',
      value: stats.active_users?.toLocaleString() ?? '48',
      change: { value: '8.3%', trend: 'up' as const },
      icon: <People />,
      color: 'info',
    },
    {
      title: 'Agent Executions (30d)',
      value: stats.agent_executions_30d?.toLocaleString() ?? '3,289',
      change: { value: '23.1%', trend: 'up' as const },
      icon: <SmartToy />,
      color: 'secondary',
    },
    {
      title: 'Total Cost (30d)',
      value: stats.total_cost_30d != null ? `$${stats.total_cost_30d.toFixed(2)}` : '$1,234.56',
      change: { value: '5.2%', trend: 'down' as const },
      icon: <AttachMoney />,
      color: 'success',
    },
    {
      title: 'Avg Response Time',
      value: stats.avg_response_time_ms ? `${stats.avg_response_time_ms.toFixed(0)}ms` : '342ms',
      icon: <Speed />,
      color: 'warning',
    },
    {
      title: 'Active Skills',
      value: stats.active_skills?.toString() ?? '24',
      icon: <Extension />,
      color: 'info',
    },
  ];

  // Placeholder daily usage data
  const dailyUsage = [
    { date: '2026-05-28', calls: 456, tokens: 125000, cost: 45.23, users: 32 },
    { date: '2026-05-27', calls: 512, tokens: 142000, cost: 51.80, users: 35 },
    { date: '2026-05-26', calls: 389, tokens: 108000, cost: 39.45, users: 28 },
    { date: '2026-05-25', calls: 478, tokens: 131000, cost: 47.90, users: 31 },
    { date: '2026-05-24', calls: 234, tokens: 64000, cost: 23.12, users: 18 },
    { date: '2026-05-23', calls: 198, tokens: 54000, cost: 19.67, users: 15 },
    { date: '2026-05-22', calls: 445, tokens: 122000, cost: 44.35, users: 30 },
    { date: '2026-05-21', calls: 523, tokens: 145000, cost: 52.78, users: 36 },
    { date: '2026-05-20', calls: 467, tokens: 128000, cost: 46.55, users: 33 },
    { date: '2026-05-19', calls: 398, tokens: 109000, cost: 39.80, users: 29 },
  ];

  // Placeholder top model usage
  const topModels = [
    { model: 'gpt-4o', calls: 4521, tokens: 1250000, cost: 456.78, pct: 38 },
    { model: 'gpt-4o-mini', calls: 5234, tokens: 890000, cost: 123.45, pct: 28 },
    { model: 'claude-3-sonnet', calls: 2345, tokens: 680000, cost: 234.56, pct: 20 },
    { model: 'embedding-3-small', calls: 8901, tokens: 2100000, cost: 42.00, pct: 10 },
    { model: 'dall-e-3', calls: 234, tokens: 0, cost: 98.50, pct: 4 },
  ];

  return (
    <Box>
      <PageHeader
        title="使用统计"
        subtitle="平台使用指标与趋势"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <StatCard title={s.title} value={s.value} change={s.change} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Daily Usage Table */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth sx={{ fontSize: 20 }} />
            Daily Usage (Last 10 Days)
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">API Calls</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Users</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyUsage.map((day) => (
                <TableRow key={day.date} hover>
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{day.date}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {day.calls.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {day.tokens.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                    ${day.cost.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {day.users}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </Grid>

        {/* Top Models */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ fontSize: 20 }} />
            Top Models by Usage
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell align="right">Calls</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Share</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topModels.map((model) => (
                <TableRow key={model.model} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    {model.model}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {model.calls.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                    ${model.cost.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={`${model.pct}%`} size="small" sx={{ fontSize: 11, height: 22, minWidth: 40 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </Grid>
      </Grid>
    </Box>
  );
}
