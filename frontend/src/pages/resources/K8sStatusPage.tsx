import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, LinearProgress, Button,
} from '@mui/material';
import { Refresh, OpenInNew } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState, StatusBadge, DataTable } from '../../components/shared';
import { k8sApi } from '../../api/client';

function ResourceBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate" value={pct} color={color}
        sx={{ flex: 1, height: 5, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </Typography>
    </Box>
  );
}

export default function K8sStatusPage() {
  const navigate = useNavigate();

  const { data: clustersData, isLoading, refetch } = useQuery({
    queryKey: ['k8s-clusters'],
    queryFn: () => k8sApi.clusters(),
    retry: false,
  });

  const clusters: any[] = clustersData?.data?.data || [];

  const totalActive = clusters.filter(c => c.status === 'active').length;
  const totalNodes = clusters.reduce((s: number, c: any) => s + (c.nodes?.length || 0), 0);
  const totalPods = clusters.reduce((s: number, c: any) => s + (c.pod_used || 0), 0);

  return (
    <Box>
      <PageHeader
        title="Kubernetes 状态"
        subtitle="集群资源总览"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* 汇总卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>{totalActive}</Typography>
              <Typography variant="caption" color="text.secondary">集群（运行中）</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalNodes}</Typography>
              <Typography variant="caption" color="text.secondary">节点总数</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{totalPods}</Typography>
              <Typography variant="caption" color="text.secondary">Pod 总数（运行中）</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 集群列表 */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>集群列表</Typography>

      {isLoading ? <LoadingState /> : (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>集群名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>环境</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>提供商</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>版本</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>节点数</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>CPU</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 130 }}>内存</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>容器组</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clusters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    暂无集群数据
                  </Typography>
                </TableCell>
              </TableRow>
            ) : clusters.map((c: any) => {
              const cpuPct = Math.round((c.cpu_used / c.cpu_total) * 100);
              const memPct = Math.round((c.memory_used / c.memory_total) * 100);
              const nodeCount = c.nodes?.length || 0;
              const notReady = (c.nodes || []).filter((n: any) => n.status !== 'Ready').length;
              return (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/resources/k8s/${c.id}`)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.env} size="small" color="warning" sx={{ fontSize: 11, height: 22 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{c.provider}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{c.k8s_version}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} label={c.status === 'active' ? '运行中' : '异常'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {nodeCount}
                      {notReady > 0 && (
                        <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.5 }}>
                          ({notReady} NotReady)
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <ResourceBar pct={cpuPct} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {c.cpu_used} / {c.cpu_total} cores
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <ResourceBar pct={memPct} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {c.memory_used} / {c.memory_total} Gi
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.pod_used} / {c.pod_total}</Typography>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Tooltip title="查看详情">
                      <IconButton size="small" onClick={() => navigate(`/resources/k8s/${c.id}`)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
