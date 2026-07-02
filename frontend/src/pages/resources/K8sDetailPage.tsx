import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, LinearProgress,
  Select, MenuItem, FormControl, Divider, Avatar,
} from '@mui/material';
import { ArrowBack, Refresh, Storage } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState, StatusBadge } from '../../components/shared';
import { k8sApi } from '../../api/client';
import { useState } from 'react';

// 环形进度圈组件
function CircleProgress({ pct, label, color = '#1976d2' }: { pct: number; label: string; color?: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={56} height={56}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(0,212,255,0.12)" strokeWidth={4} />
        <circle
          cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </svg>
      <Typography variant="caption" sx={{ position: 'absolute', fontWeight: 700, fontSize: 11 }}>
        {pct}%
      </Typography>
    </Box>
  );
}

// 资源行组件
function ResourceRow({ pct, label, used, total, unit = '' }: {
  pct: number; label: string; used: number | string; total: number | string; unit?: string;
}) {
  const color = pct >= 90 ? '#FF3366' : pct >= 70 ? '#FFB800' : '#00D4FF';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
      <CircleProgress pct={pct} color={color} label={label} />
      <Box sx={{ minWidth: 80 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6, borderRadius: 3,
            bgcolor: 'rgba(0,212,255,0.08)',
            '& .MuiLinearProgress-bar': { bgcolor: color },
          }}
        />
      </Box>
      <Box sx={{ minWidth: 120, textAlign: 'right' }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {used}{unit}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {' '}/{' '}{total}{unit}
        </Typography>
      </Box>
    </Box>
  );
}

// 工具图标组件
function ToolCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      <Box sx={{
        width: 48, height: 48, bgcolor: 'action.hover', borderRadius: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontFamily: 'monospace', fontSize: 18 }}>{icon}</Typography>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
    </Box>
  );
}

// 节点图标
function NodeIcon() {
  return (
    <Box sx={{
      width: 36, height: 32, bgcolor: 'rgba(0,255,136,0.1)', borderRadius: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Storage sx={{ fontSize: 18, color: '#00FF88' }} />
    </Box>
  );
}

// 组件图标映射
const COMPONENT_ICONS: Record<string, string> = {
  Kubernetes: '⎈',
  KubeSphere: '⊙',
  Monitoring: '📊',
};

export default function K8sDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nodeSort, setNodeSort] = useState('cpu');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['k8s-cluster', id],
    queryFn: () => k8sApi.cluster(id!),
    enabled: !!id,
    retry: false,
  });

  const cluster = data?.data?.data;

  if (isLoading) return <LoadingState />;
  if (!cluster) return (
    <Box>
      <PageHeader
        title="K8s 状态详情"
        subtitle=""
        actions={
          <Tooltip title="返回">
            <IconButton onClick={() => navigate('/resources/k8s')}><ArrowBack /></IconButton>
          </Tooltip>
        }
      />
      <Typography color="text.secondary">集群不存在</Typography>
    </Box>
  );

  const nodes: any[] = cluster.nodes || [];
  const sortedNodes = [...nodes].sort((a, b) => {
    if (nodeSort === 'cpu') return b.cpu_pct - a.cpu_pct;
    if (nodeSort === 'memory') return b.memory_pct - a.memory_pct;
    return b.pods - a.pods;
  });
  const topNodes = sortedNodes.slice(0, 5);

  const cpuPct = Math.round((cluster.cpu_used / cluster.cpu_total) * 100);
  const memPct = Math.round((cluster.memory_used / cluster.memory_total) * 100);
  const podPct = Math.round((cluster.pod_used / cluster.pod_total) * 100);
  const diskPct = Math.round((cluster.disk_used / cluster.disk_total) * 100);

  return (
    <Box>
      <PageHeader
        title={`${cluster.name} — ${cluster.label}`}
        subtitle={cluster.env}
        actions={
          <>
            <Tooltip title="返回列表">
              <IconButton onClick={() => navigate('/resources/k8s')}><ArrowBack /></IconButton>
            </Tooltip>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
          </>
        }
      />
      {/* 集群标签行 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Chip label={cluster.env} size="small" color="warning" />
        <StatusBadge status={cluster.status} label={cluster.status === 'active' ? '运行中' : '异常'} />
      </Box>

      <Grid container spacing={2}>
        {/* ===== 左栏 ===== */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* 基本信息 */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>基本信息</Typography>
              <Grid container spacing={2}>
                <Grid size={3}>
                  <Typography variant="caption" color="text.secondary">提供商</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cluster.provider}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="caption" color="text.secondary">Kubernetes 版本</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cluster.k8s_version}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="caption" color="text.secondary">KubeSphere 版本</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cluster.kubesphere_version}</Typography>
                </Grid>
                <Grid size={3}>
                  <Typography variant="caption" color="text.secondary">集群可见性</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{cluster.visibility}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 资源用量 */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>资源用量</Typography>
              <ResourceRow pct={cpuPct} label="CPU" used={`${cluster.cpu_used} cores`} total={`${cluster.cpu_total} cores`} />
              <ResourceRow pct={memPct} label="内存" used={`${cluster.memory_used} Gi`} total={`${cluster.memory_total} Gi`} />
              <ResourceRow pct={podPct} label="容器组" used={cluster.pod_used} total={cluster.pod_total} />
              <ResourceRow pct={diskPct} label="磁盘" used={`${cluster.disk_used} TB`} total={`${cluster.disk_total} TB`} />
            </CardContent>
          </Card>

        </Grid>

        {/* ===== 右栏 ===== */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Kubernetes 状态 */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Kubernetes 状态</Typography>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {cluster.api_rps.toFixed(3)} <Typography component="span" variant="caption">times/s</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">每秒 API 请求数</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {cluster.api_latency_ms.toFixed(2)} <Typography component="span" variant="caption">ms</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">API 请求延迟</Typography>
                </Grid>
                <Grid size={6} sx={{ mt: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{cluster.schedule_count.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">调度次数</Typography>
                </Grid>
                <Grid size={6} sx={{ mt: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {cluster.schedule_fail > 0
                      ? <span style={{ color: '#FF3366' }}>{cluster.schedule_fail}</span>
                      : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">调度失败次数</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 节点 */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>节点</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">资源用量 Top 5</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={nodeSort}
                    onChange={e => setNodeSort(e.target.value)}
                    sx={{ fontSize: 12, height: 30 }}
                  >
                    <MenuItem value="cpu">按 CPU 用量排行</MenuItem>
                    <MenuItem value="memory">按内存用量排行</MenuItem>
                    <MenuItem value="pods">按 Pod 数排行</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {topNodes.map((node: any) => {
                const pct = nodeSort === 'memory' ? node.memory_pct : nodeSort === 'pods' ? 0 : node.cpu_pct;
                const color = pct >= 80 ? '#FF3366' : pct >= 60 ? '#FFB800' : '#00FF88';
                const pctLabel = nodeSort === 'pods'
                  ? `${node.pods} Pods`
                  : `${nodeSort === 'memory' ? node.memory_pct : node.cpu_pct}%`;
                const sortLabel = nodeSort === 'cpu' ? 'CPU 用量' : nodeSort === 'memory' ? '内存用量' : 'Pod 数';
                return (
                  <Box
                    key={node.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, py: 1,
                      borderBottom: '1px solid', borderColor: 'divider',
                      bgcolor: pct >= 75 ? 'rgba(232,245,233,0.5)' : 'transparent',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <NodeIcon />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {node.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{node.ip}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right', minWidth: 60 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                        {pctLabel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{sortLabel}</Typography>
                    </Box>
                  </Box>
                );
              })}

              {nodes.length > 5 && (
                <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    查看更多（{nodes.length} 个节点）
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
