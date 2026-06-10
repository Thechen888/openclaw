import { Box, Grid, Typography, List, ListItem, ListItemIcon, ListItemText, Chip, Button } from '@mui/material';
import { SmartToy, Warning, Token, Psychology, Cable, AccountBalance, CheckCircle, Error } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, SectionCard } from '../../components/shared';
import { statsApi } from '../../api/client';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: statsRes } = useQuery({ queryKey: ['dashboard'], queryFn: statsApi.dashboard });
  const stats = statsRes?.data?.data || {};

  return (
    <Box>
      <PageHeader title="仪表盘" subtitle="平台概览与健康状态" />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="今日智能体运行" value={stats.agent_runs_today || 0}
            icon={<SmartToy />} color="primary"
            change={{ value: '+12%', trend: 'up' }} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="失败任务" value={stats.failed_tasks_today || 0}
            icon={<Warning />} color="error"
            change={{ value: '-3', trend: 'down' }} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="Token用量" value={stats.token_usage_today || '0'}
            icon={<Token />} color="warning"
            change={{ value: '+8%', trend: 'up' }} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard title="模型费用" value={`¥${stats.model_cost_today || '0'}`}
            icon={<AccountBalance />} color="info"
            change={{ value: '+5%', trend: 'up' }} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Platform Health */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="平台健康状态">
            <List dense disablePadding>
              {[
                { name: '模型源：GPT-4o', status: 'healthy', type: 'model' },
                { name: '模型源：Claude 3.5', status: 'healthy', type: 'model' },
                { name: '模型源：通义千问VL', status: 'degraded', type: 'model' },
                { name: '企业微信', status: 'healthy', type: 'connector' },
                { name: 'CRM连接器', status: 'healthy', type: 'connector' },
              ].map((item, i) => (
                <ListItem key={i} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {item.type === 'model' ? <Psychology fontSize="small" color="primary" /> : <Cable fontSize="small" color="secondary" />}
                  </ListItemIcon>
                  <ListItemText primary={item.name} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
                  <Chip
                    label={item.status}
                    size="small"
                    color={item.status === 'healthy' ? 'success' : item.status === 'degraded' ? 'warning' : 'error'}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>

        {/* Pending Actions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="待处理事项">
            <List dense disablePadding>
              {[
                { label: '待匹配账号', count: stats.pending_matches || 5, path: '/identity/matching', icon: <AccountBalance fontSize="small" /> },
                { label: '待审批令牌', count: stats.pending_approvals || 3, path: '/tokens/approvals', icon: <Token fontSize="small" /> },
                { label: '技能审核', count: stats.pending_skill_reviews || 2, path: '/skills', icon: <CheckCircle fontSize="small" /> },
                { label: '失败任务', count: stats.failed_tasks_today || 4, path: '/agents/runs', icon: <Error fontSize="small" color="error" /> },
              ].map((item, i) => (
                <ListItem key={i} sx={{ px: 0, cursor: 'pointer' }}
                  onClick={() => navigate(item.path)}
                  secondaryAction={<Chip label={item.count} size="small" color={i === 3 ? 'error' : 'primary'} sx={{ fontSize: 11 }} />}>
                  <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
                </ListItem>
              ))}
            </List>
            <Button variant="text" size="small" sx={{ mt: 1 }} onClick={() => navigate('/identity/matching')}>
              查看全部
            </Button>
          </SectionCard>
        </Grid>

        {/* Recent Activity */}
        <Grid size={12}>
          <SectionCard title="最近智能体运行">
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                    {['智能体', '负责人', '触发方式', '状态', '耗时', 'Token', '时间'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--mui-palette-text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { agent: 'CRM销售通知', owner: '销售部', trigger: '事件', status: 'completed', duration: '2.3s', tokens: '1,240', time: '2分钟前' },
                    { agent: '设备巡检', owner: '售后部', trigger: '定时', status: 'completed', duration: '8.1s', tokens: '3,420', time: '15分钟前' },
                    { agent: '摄像头监控#12', owner: '安保部', trigger: '定时', status: 'failed', duration: '30s', tokens: '0', time: '32分钟前' },
                    { agent: '每日总结', owner: '管理员', trigger: '定时', status: 'completed', duration: '4.5s', tokens: '2,180', time: '1小时前' },
                    { agent: '个人提醒', owner: '张伟', trigger: '定时', status: 'completed', duration: '1.2s', tokens: '380', time: '2小时前' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--mui-palette-divider)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row.agent}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--mui-palette-text-secondary)' }}>{row.owner}</td>
                      <td style={{ padding: '10px 12px' }}><Chip label={row.trigger} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} /></td>
                      <td style={{ padding: '10px 12px' }}><Chip label={row.status} size="small" color={row.status === 'completed' ? 'success' : 'error'} variant="outlined" sx={{ fontSize: 11, height: 20 }} /></td>
                      <td style={{ padding: '10px 12px', color: 'var(--mui-palette-text-secondary)' }}>{row.duration}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--mui-palette-text-secondary)' }}>{row.tokens}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--mui-palette-text-secondary)', fontSize: 12 }}>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
