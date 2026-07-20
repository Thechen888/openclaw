import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Tabs, Tab,
  LinearProgress, Avatar, Stack,
} from '@mui/material';
import {
  Refresh, TrendingUp, People, SmartToy, Extension,
  Api, AttachMoney, Speed, CalendarMonth, Person, Business,
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
  const [statTab, setStatTab] = useState(0);

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

      {/* Token 用量维度统计 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Token 用量分布</Typography>
        <Tabs value={statTab} onChange={(_, v) => setStatTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="按用户" icon={<Person />} iconPosition="start" />
          <Tab label="按部门" icon={<Business />} iconPosition="start" />
          <Tab label="按 Agent" icon={<SmartToy />} iconPosition="start" />
        </Tabs>

        {/* 按用户 */}
        {statTab === 0 && (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>用户</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">今日消耗</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">本月消耗</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">每日限额</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>使用率</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockUserUsage.map((u) => {
                const pct = u.dailyLimit > 0 ? (u.dailyUsed / u.dailyLimit) * 100 : 0;
                return (
                  <TableRow key={u.name} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: u.color }}>{u.name[0]}</Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{u.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.dept}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.dailyUsed.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.monthlyUsed.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{u.dailyLimit.toLocaleString()}</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={Math.min(pct, 100)}
                          color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success'}
                          sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36 }}>{pct.toFixed(0)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.blocked ? '已停用' : '正常'} color={u.blocked ? 'error' : 'success'} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        )}

        {/* 按部门 */}
        {statTab === 1 && (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">人数</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">今日消耗</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">本月消耗</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">本月费用</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>占比</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockDeptUsage.map((d) => (
                <TableRow key={d.name} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{d.members}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.dailyUsed.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.monthlyUsed.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>¥{d.monthlyCost.toLocaleString()}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={d.pct}
                        color="primary" sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 32 }}>{d.pct}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}

        {/* 按 Agent */}
        {statTab === 2 && (
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Agent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>归属</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">调用次数</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Token 消耗</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>计费方式</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>占比</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mockAgentUsage.map((a) => (
                <TableRow key={a.name} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{a.owner}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{a.calls.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{a.tokens.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip size="small" label={a.billing === 'admin' ? '管理员 Token' : '个人 Token'}
                      color={a.billing === 'admin' ? 'warning' : 'default'} variant="outlined" sx={{ fontSize: 11 }} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={a.pct}
                        color="secondary" sx={{ flex: 1, height: 5, borderRadius: 2 }} />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 32 }}>{a.pct}%</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        )}
      </Box>
    </Box>
  );
}

// ---- Mock data ----
const mockUserUsage = [
  { name: '张三', dept: '研发部', dailyUsed: 82000, monthlyUsed: 1850000, dailyLimit: 100000, blocked: false, color: '#3b82f6' },
  { name: '李四', dept: '研发部', dailyUsed: 95000, monthlyUsed: 2100000, dailyLimit: 100000, blocked: false, color: '#10b981' },
  { name: '王五', dept: '市场部', dailyUsed: 100000, monthlyUsed: 2800000, dailyLimit: 100000, blocked: true, color: '#f59e0b' },
  { name: '赵六', dept: '产品部', dailyUsed: 45000, monthlyUsed: 980000, dailyLimit: 100000, blocked: false, color: '#a855f7' },
  { name: '孙七', dept: '运营部', dailyUsed: 67000, monthlyUsed: 1450000, dailyLimit: 100000, blocked: false, color: '#ef4444' },
  { name: '周八', dept: '研发部', dailyUsed: 30000, monthlyUsed: 650000, dailyLimit: 100000, blocked: false, color: '#06b6d4' },
];

const mockDeptUsage = [
  { name: '研发部', members: 12, dailyUsed: 207000, monthlyUsed: 4600000, monthlyCost: 460, pct: 38 },
  { name: '市场部', members: 8, dailyUsed: 156000, monthlyUsed: 3400000, monthlyCost: 340, pct: 28 },
  { name: '产品部', members: 5, dailyUsed: 78000, monthlyUsed: 1700000, monthlyCost: 170, pct: 14 },
  { name: '运营部', members: 6, dailyUsed: 98000, monthlyUsed: 2200000, monthlyCost: 220, pct: 18 },
  { name: '行政部', members: 3, dailyUsed: 12000, monthlyUsed: 260000, monthlyCost: 26, pct: 2 },
];

const mockAgentUsage = [
  { name: '智能客服助手', owner: '研发部', calls: 3200, tokens: 890000, billing: 'admin', pct: 32 },
  { name: '代码 Review', owner: '张三', calls: 1800, tokens: 520000, billing: 'self', pct: 19 },
  { name: 'CRM 同步流程', owner: '市场部', calls: 2400, tokens: 680000, billing: 'admin', pct: 24 },
  { name: '周报生成器', owner: '产品部', calls: 900, tokens: 250000, billing: 'self', pct: 9 },
  { name: '数据分析助手', owner: '运营部', calls: 1500, tokens: 420000, billing: 'admin', pct: 15 },
  { name: '文档翻译', owner: '李四', calls: 600, tokens: 170000, billing: 'self', pct: 6 },
];
