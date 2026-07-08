import { Box, Grid, Typography, List, ListItem, ListItemIcon, ListItemText, Chip, Button, LinearProgress, Avatar, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  SmartToy, Warning, CheckCircle, Error, Schedule,
  People, DataUsage, Api, MonetizationOn, Today, AllInclusive,
} from '@mui/icons-material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatCard, PageHeader, SectionCard } from '../../components/shared';
import { statsApi } from '../../api/client';

// ===================== 辅助组件 =====================

// 圆环仪表
function CircleGauge({ value, max, label, color, size = 80 }: { value: number; max: number; label: string; color: string; size?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = (size - 16) / 2, c = 2 * Math.PI * r;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="5" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color, lineHeight: 1 }}>{pct.toFixed(0)}%</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.7)', mt: 0.5, display: 'block', fontSize: 11 }}>{label}</Typography>
    </Box>
  );
}

// 迷你折线图（纯CSS/SVG）
function MiniSparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const w = 100, h = height;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

// 模型成本排行迷你柱状图
function MiniHBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.7)', fontSize: 12 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>¥{value.toLocaleString()}</Typography>
      </Box>
      <Box sx={{ height: 6, borderRadius: 3, bgcolor: `${color}12`, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 3, bgcolor: color, boxShadow: `0 0 8px ${color}40`, transition: 'width 0.8s ease' }} />
      </Box>
    </Box>
  );
}

// ===================== 主页面 =====================

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpiView, setKpiView] = useState<'today' | 'total'>('today');
  const { data: statsRes } = useQuery({ queryKey: ['dashboard'], queryFn: statsApi.dashboard });
  const stats = statsRes?.data?.data || {};

  // 7 天趋势数据
  const tokenTrend = stats.token_trend || [18200, 22400, 19800, 25600, 21000, 12400, 24500];
  const costTrend = stats.cost_trend || [52, 68, 61, 78, 64, 38, 72];

  // KPI 卡片配置：今日数据 vs 累计数据
  const kpiConfig: Record<'today' | 'total', Array<{ title: string; value: string | number; icon: React.ReactNode; color: string; change: { value: string; trend: 'up' | 'down'; label: string } }>> = {
    today: [
      { title: '今日 AI 调用', value: stats.total_calls_today || '12,847', icon: <Api />, color: 'primary', change: { value: '+12%', trend: 'up', label: 'vs 昨日' } },
      { title: 'Token 消耗', value: stats.token_usage_today || '2.4M', icon: <DataUsage />, color: 'info', change: { value: '+8%', trend: 'up', label: 'vs 昨日' } },
      { title: '今日成本', value: `¥${stats.model_cost_today || '1,280'}`, icon: <MonetizationOn />, color: 'warning', change: { value: '+5%', trend: 'up', label: 'vs 昨日' } },
      { title: 'Agent 成功率', value: stats.agent_success_rate || '98.2%', icon: <SmartToy />, color: 'primary', change: { value: '+0.3%', trend: 'up', label: 'vs 昨日' } },
      { title: '活跃用户', value: stats.active_users_today || 156, icon: <People />, color: 'info', change: { value: '+18', trend: 'up', label: 'vs 昨日' } },
      { title: '在线模型', value: stats.online_models || '5/6', icon: <Api />, color: 'success', change: { value: '-1', trend: 'down', label: 'vs 昨日' } },
    ],
    total: [
      { title: '累计 AI 调用', value: stats.total_calls_all || '3.85M', icon: <Api />, color: 'primary', change: { value: '+18.6%', trend: 'up', label: 'vs 上月' } },
      { title: '累计 Token', value: stats.token_usage_all || '682M', icon: <DataUsage />, color: 'info', change: { value: '+22.4%', trend: 'up', label: 'vs 上月' } },
      { title: '累计成本', value: `¥${stats.model_cost_all || '385,600'}`, icon: <MonetizationOn />, color: 'warning', change: { value: '+15.2%', trend: 'up', label: 'vs 上月' } },
      { title: 'Agent 平均成功率', value: stats.agent_success_rate_all || '97.5%', icon: <SmartToy />, color: 'primary', change: { value: '+1.2%', trend: 'up', label: 'vs 上月' } },
      { title: '累计用户', value: stats.total_users || '2,340', icon: <People />, color: 'info', change: { value: '+156', trend: 'up', label: 'vs 上月' } },
      { title: '接入模型总数', value: stats.total_models || '18', icon: <Api />, color: 'success', change: { value: '+3', trend: 'up', label: 'vs 上月' } },
    ],
  };

  return (
    <Box>
      <PageHeader title="仪表盘" subtitle="平台运营概览 · AI 调用分析 · 系统健康监控" />

      {/* ========== 第一行：6 个核心 KPI（支持今日/累计切换） ========== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(200,210,220,0.7)', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em' }}>
          {kpiView === 'today' ? '今日核心指标' : '累计核心指标'}
        </Typography>
        <ToggleButtonGroup
          value={kpiView}
          exclusive
          size="small"
          onChange={(_, v) => { if (v) setKpiView(v); }}
          sx={{
            '& .MuiToggleButton-root': {
              px: 2, py: 0.5, fontSize: 12, textTransform: 'none',
              color: 'rgba(200,210,220,0.6)',
              border: '1px solid rgba(0,212,255,0.15)',
              '&.Mui-selected': {
                color: '#00D4FF',
                bgcolor: 'rgba(0,212,255,0.12)',
                borderColor: 'rgba(0,212,255,0.4)',
                boxShadow: '0 0 12px rgba(0,212,255,0.2)',
                '&:hover': { bgcolor: 'rgba(0,212,255,0.18)' },
              },
            },
          }}
        >
          <ToggleButton value="today"><Today sx={{ fontSize: 15, mr: 0.5 }} />今日数据</ToggleButton>
          <ToggleButton value="total"><AllInclusive sx={{ fontSize: 15, mr: 0.5 }} />累计数据</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiConfig[kpiView].map((kpi, i) => (
          <Grid size={{ xs: 6, md: 2 }} key={i}>
            <StatCard title={kpi.title} value={kpi.value} icon={kpi.icon} color={kpi.color} change={kpi.change} />
          </Grid>
        ))}
      </Grid>

      {/* ========== 第二行：系统资源 + 趋势 + 模型健康 ========== */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {/* 系统资源（左侧） */}
        <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex' }}>
          <SectionCard title="系统资源" sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', py: 0.5, flex: 1 }}>
              <CircleGauge value={stats.cpu_usage || 67} max={100} label="CPU" color="#00D4FF" size={70} />
              <CircleGauge value={stats.mem_usage || 82} max={100} label="内存" color="#7C3AED" size={70} />
              <CircleGauge value={stats.disk_usage || 45} max={100} label="存储" color="#00FF88" size={70} />
            </Box>
            <Box sx={{ mt: 1.5 }}>
              {[
                { label: 'API 响应 (P90)', value: stats.api_p90 || '245ms', pct: 24.5, color: '#00D4FF' },
                { label: '请求成功率', value: stats.success_rate || '99.7%', pct: 99.7, color: '#00FF88' },
                { label: 'GPU 利用率', value: stats.gpu_usage || '54%', pct: 54, color: '#FFB800' },
                { label: 'K8s Pod 就绪', value: stats.pod_ready || '8/8', pct: 100, color: '#7C3AED' },
              ].map((m, i) => (
                <Box key={i} sx={{ mb: 1.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.65)', fontSize: 11 }}>{m.label}</Typography>
                    <Typography variant="caption" sx={{ color: m.color, fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{m.value}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={m.pct} sx={{
                    height: 4, borderRadius: 2,
                    bgcolor: `${m.color}12`,
                    '& .MuiLinearProgress-bar': { bgcolor: m.color, borderRadius: 2, boxShadow: `0 0 6px ${m.color}40` },
                  }} />
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Grid>

        {/* Token & 调用趋势（中间） */}
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex' }}>
          <SectionCard title="7日调用 & Token趋势" sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120, pt: 1, px: 0.5 }}>
              {[
                { day: '周一', v: tokenTrend[0] },
                { day: '周二', v: tokenTrend[1] },
                { day: '周三', v: tokenTrend[2] },
                { day: '周四', v: tokenTrend[3] },
                { day: '周五', v: tokenTrend[4] },
                { day: '周六', v: tokenTrend[5] },
                { day: '今天', v: tokenTrend[6] },
              ].map((d, i) => {
                const maxV = Math.max(...tokenTrend);
                const pct = (d.v / maxV) * 100;
                return (
                  <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <Typography variant="caption" sx={{ color: i === 6 ? '#00D4FF' : 'text.secondary', fontSize: 9, fontFamily: 'monospace', mb: 0.3 }}>
                      {(d.v / 1000).toFixed(1)}K
                    </Typography>
                    <Box sx={{
                      width: '100%', maxWidth: 32, borderRadius: '3px 3px 0 0',
                      height: `${pct}%`,
                      background: i === 6
                        ? 'linear-gradient(180deg, #00D4FF, #7C3AED)'
                        : 'linear-gradient(180deg, rgba(0,212,255,0.35), rgba(0,212,255,0.08))',
                      boxShadow: i === 6 ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
                      transition: 'height 0.8s ease',
                      '&:hover': { background: 'linear-gradient(180deg, #00D4FF, #7C3AED)', boxShadow: '0 0 12px rgba(0,212,255,0.3)' },
                    }} />
                    <Typography variant="caption" sx={{ color: i === 6 ? '#00D4FF' : 'text.secondary', fontSize: 10, mt: 0.5, fontWeight: i === 6 ? 700 : 400 }}>
                      {d.day}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 1.5, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11 }}>7日总计</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#00D4FF', fontFamily: 'monospace' }}>
                  {(tokenTrend.reduce((a: number, b: number) => a + b, 0) / 1000).toFixed(1)}K
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11 }}>日均</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {(tokenTrend.reduce((a: number, b: number) => a + b, 0) / 7 / 1000).toFixed(1)}K
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11 }}>峰值</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFB800', fontFamily: 'monospace' }}>
                  {(Math.max(...tokenTrend) / 1000).toFixed(1)}K
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11 }}>7日成本</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#FF006E', fontFamily: 'monospace' }}>
                  ¥{costTrend.reduce((a: number, b: number) => a + b, 0).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </SectionCard>
        </Grid>

        {/* 模型源健康矩阵（右侧） */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <SectionCard title="模型源健康" sx={{ flex: 1 }}>
            <Box sx={{ flex: 1 }}>
              <List dense disablePadding>
                {(stats.model_health || [
                  { name: 'GPT-4o', status: 'healthy', latency: '120ms' },
                  { name: 'Claude 3.5 Sonnet', status: 'healthy', latency: '95ms' },
                  { name: '通义千问 VL', status: 'degraded', latency: '340ms' },
                  { name: 'DeepSeek V3', status: 'healthy', latency: '68ms' },
                  { name: 'GLM-4', status: 'error', latency: 'N/A' },
                ]).map((item: any, i: number) => {
                  const statusColor: Record<string, string> = { healthy: '#00FF88', degraded: '#FFB800', error: '#FF3366' };
                  const gc = statusColor[item.status] || '#00D4FF';
                  const statusLabel: Record<string, string> = { healthy: '正常', degraded: '降级', error: '离线' };
                  return (
                    <ListItem key={i} sx={{
                      px: 1.5, mx: -0.5, borderRadius: 1.5, mb: 0.3,
                      transition: 'all 0.3s',
                      '&:hover': { bgcolor: 'rgba(0,212,255,0.04)' },
                    }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%', bgcolor: gc,
                          boxShadow: `0 0 8px ${gc}`,
                          animation: item.status !== 'healthy' ? 'neonPulse 2s ease-in-out infinite' : 'none',
                        }} />
                      </ListItemIcon>
                      <ListItemText primary={item.name} slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 500 } } }} />
                      <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontFamily: 'monospace', fontSize: 11, mr: 1.5 }}>
                        {item.latency}
                      </Typography>
                      <Chip label={statusLabel[item.status] || item.status} size="small"
                        sx={{
                          fontSize: 10, height: 20, minWidth: 36,
                          bgcolor: `${gc}15`, color: gc, border: `1px solid ${gc}30`,
                          boxShadow: item.status !== 'healthy' ? `0 0 6px ${gc}30` : 'none',
                        }} />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
            <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11, mb: 0.5, display: 'block' }}>平均延迟趋势 (24h)</Typography>
              <MiniSparkline data={[120, 135, 110, 145, 180, 340, 220, 150, 130, 125, 118, 122]} color="#00D4FF" height={28} />
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* ========== 第三行：成本 TOP5 + 待办事项 + 最近审计 ========== */}
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
        {/* 成本 TOP5 */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <SectionCard title="模型成本 TOP5 (本月)" sx={{ flex: 1 }}>
            <Box sx={{ flex: 1 }}>
              {(stats.cost_top5 || [
                { name: 'GPT-4o', cost: 2680 },
                { name: 'Claude 3.5 Sonnet', cost: 1920 },
                { name: 'GPT-4o-mini', cost: 850 },
                { name: '通义千问 VL', cost: 420 },
                { name: 'DeepSeek V3', cost: 180 },
              ]).map((item: any, i: number) => {
                const colors = ['#00D4FF', '#7C3AED', '#FF006E', '#FFB800', '#00FF88'];
                const maxCost = (stats.cost_top5 || [{ cost: 2680 }])[0].cost;
                return <MiniHBar key={i} label={`${i + 1}. ${item.name}`} value={item.cost} max={maxCost} color={colors[i % colors.length]} />;
              })}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 1.5, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11 }}>本月总成本</Typography>
              <Typography variant="caption" sx={{ color: '#FF006E', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                ¥{(stats.total_cost_month || 6050).toLocaleString()}
              </Typography>
            </Box>
          </SectionCard>
        </Grid>

        {/* 待处理事项 */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <SectionCard title="待处理事项" sx={{ flex: 1 }}>
            <List dense disablePadding sx={{ flex: 1 }}>
              {[
                { label: '失败 Agent 任务', count: stats.failed_tasks_today || 3, path: '/agents/runs', icon: <Error fontSize="small" />, color: '#FF3366' },
                { label: '待匹配账号', count: stats.pending_matches || 5, path: '/identity/matching', icon: <People fontSize="small" />, color: '#00D4FF' },
                { label: '模型异常告警', count: stats.model_alerts || 2, path: '/models/sources', icon: <Warning fontSize="small" />, color: '#FFB800' },
                { label: '技能审核', count: stats.pending_skill_reviews || 2, path: '/skills', icon: <CheckCircle fontSize="small" />, color: '#00FF88' },
              ].map((item, i) => (
                <ListItem key={i} sx={{
                  px: 1.5, mx: -1, borderRadius: 1.5, cursor: 'pointer', mb: 0.3,
                  border: '1px solid transparent', transition: 'all 0.3s',
                  '&:hover': {
                    bgcolor: `${item.color}08`, borderColor: `${item.color}20`,
                    '& .count-chip': { boxShadow: `0 0 10px ${item.color}30` },
                  },
                }}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ minWidth: 30, color: item.color }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
                  <Chip className="count-chip" label={item.count} size="small" sx={{
                    fontSize: 11, fontWeight: 700, height: 22, minWidth: 28,
                    bgcolor: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30`,
                  }} />
                </ListItem>
              ))}
            </List>
            <Button variant="outlined" size="small" fullWidth sx={{ mt: 1.5 }} onClick={() => navigate('/agents/runs')}>
              查看全部待办
            </Button>
          </SectionCard>
        </Grid>

        {/* 最近审计事件 */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <SectionCard title="最近操作日志" sx={{ flex: 1 }}>
            <List dense disablePadding sx={{ flex: 1 }}>
              {(stats.recent_audit || [
                { actor: '张伟', action: '执行', target: 'CRM销售通知 Agent', time: '2分钟前', outcome: 'success' },
                { actor: '李思', action: '创建', target: 'API Token #tk-12', time: '15分钟前', outcome: 'success' },
                { actor: '王五', action: '更新', target: '通义千问 VL 配置', time: '45分钟前', outcome: 'success' },
                { actor: '赵六', action: '登录', target: '管理控制台', time: '1小时前', outcome: 'success' },
                { actor: '陈七', action: '登录', target: '管理控制台', time: '2小时前', outcome: 'failure' },
              ]).map((item: any, i: number) => {
                const outcomeColor = item.outcome === 'success' ? '#00FF88' : '#FF3366';
                return (
                  <ListItem key={i} sx={{
                    px: 1, mx: -0.5, borderRadius: 1, mb: 0.3,
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.03)' },
                  }}>
                    <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: 'rgba(0,212,255,0.08)', fontSize: 12, fontWeight: 600, color: '#00D4FF' }}>
                      {item.actor[0]}
                    </Avatar>
                    <ListItemText
                      primary={<>
                        <Typography component="span" sx={{ fontSize: 13, fontWeight: 500 }}>{item.actor}</Typography>
                        <Typography component="span" sx={{ fontSize: 12, color: 'rgba(200,210,220,0.5)', mx: 0.5 }}>{item.action}</Typography>
                        <Typography component="span" sx={{ fontSize: 12, color: 'rgba(200,210,220,0.8)' }}>{item.target}</Typography>
                      </>}
                      secondary={item.time}
                      slotProps={{ secondary: { sx: { fontSize: 11, color: 'rgba(200,210,220,0.4)' } } }}
                    />
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: outcomeColor, boxShadow: `0 0 6px ${outcomeColor}` }} />
                  </ListItem>
                );
              })}
            </List>
            <Button variant="outlined" size="small" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/stats/audit-logs')}>
              查看全部日志
            </Button>
          </SectionCard>
        </Grid>
      </Grid>

      {/* ========== 第四行：最近 Agent 运行表格 ========== */}
      <SectionCard title="最近智能体运行" actions={
        <Button size="small" variant="text" onClick={() => navigate('/agents/runs')} sx={{ fontSize: 12 }}>查看全部</Button>
      }>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
                {['智能体', '负责人', '触发方式', '状态', '耗时', 'Token', '成本', '时间'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 10px', fontWeight: 600, fontSize: 10,
                    textTransform: 'uppercase', color: 'rgba(0,212,255,0.5)', letterSpacing: '1px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats.recent_runs || [
                { agent: 'CRM销售通知', owner: '销售部', trigger: '事件触发', status: 'completed', duration: '2.3s', tokens: '1,240', cost: '¥0.12', time: '2分钟前' },
                { agent: '设备巡检Agent', owner: '售后部', trigger: '定时任务', status: 'completed', duration: '8.1s', tokens: '3,420', cost: '¥0.34', time: '15分钟前' },
                { agent: '摄像头监控#12', owner: '安保部', trigger: '定时任务', status: 'failed', duration: '30s', tokens: '0', cost: '¥0', time: '32分钟前' },
                { agent: '每日智能总结', owner: '管理员', trigger: '定时任务', status: 'completed', duration: '4.5s', tokens: '2,180', cost: '¥0.22', time: '1小时前' },
                { agent: '客户意向分析', owner: '市场部', trigger: '手动触发', status: 'completed', duration: '12.3s', tokens: '8,560', cost: '¥0.86', time: '2小时前' },
                { agent: '周报自动生成', owner: '全员', trigger: '定时任务', status: 'completed', duration: '6.8s', tokens: '4,200', cost: '¥0.42', time: '3小时前' },
              ]).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,212,255,0.04)', transition: 'background 0.3s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,212,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px', fontWeight: 500 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: row.status === 'failed' ? '#FF336618' : '#00D4FF12', fontSize: 12 }}>
                        <SmartToy sx={{ fontSize: 14, color: row.status === 'failed' ? '#FF3366' : '#00D4FF' }} />
                      </Avatar>
                      {row.agent}
                    </Box>
                  </td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{row.owner}</td>
                  <td style={{ padding: '10px' }}>
                    <Chip label={row.trigger} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Chip label={row.status === 'completed' ? '成功' : '失败'} size="small"
                      sx={{
                        fontSize: 10, height: 20,
                        bgcolor: row.status === 'completed' ? '#00FF8815' : '#FF336615',
                        color: row.status === 'completed' ? '#00FF88' : '#FF3366',
                        border: `1px solid ${row.status === 'completed' ? '#00FF8830' : '#FF336630'}`,
                      }} />
                  </td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 12 }}>{row.duration}</td>
                  <td style={{ padding: '10px', color: '#00D4FF', fontFamily: 'monospace', fontSize: 12 }}>{row.tokens}</td>
                  <td style={{ padding: '10px', color: '#FFB800', fontFamily: 'monospace', fontSize: 12 }}>{row.cost}</td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Schedule sx={{ fontSize: 12, opacity: 0.5 }} />
                      {row.time}
                    </Box>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </SectionCard>
    </Box>
  );
}
