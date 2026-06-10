import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, LinearProgress,
} from '@mui/material';
import { Refresh, Memory, Storage, Schedule, Warning, CheckCircle, Error } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, StatusBadge, LoadingState, DataTable } from '../../components/shared';
import { k8sApi } from '../../api/client';

const podStatusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Running: 'success', Succeeded: 'success', Pending: 'warning', Failed: 'error', Unknown: 'default',
  CrashLoopBackOff: 'error', ImagePullBackOff: 'error',
};

// Placeholder pods for when API is not available
const placeholderPods = [
  { name: 'oc-api-7d9f8b6c4-x2k9p', namespace: 'openclaw', status: 'Running', restarts: 0, age: '3d', cpu: '45m', memory: '128Mi', node: 'node-1' },
  { name: 'oc-api-7d9f8b6c4-m8n3q', namespace: 'openclaw', status: 'Running', restarts: 0, age: '3d', cpu: '38m', memory: '115Mi', node: 'node-2' },
  { name: 'oc-worker-5c8d7e9f2-j4h7r', namespace: 'openclaw', status: 'Running', restarts: 1, age: '5d', cpu: '120m', memory: '256Mi', node: 'node-1' },
  { name: 'oc-worker-5c8d7e9f2-k2m5p', namespace: 'openclaw', status: 'Running', restarts: 0, age: '5d', cpu: '95m', memory: '230Mi', node: 'node-2' },
  { name: 'oc-scheduler-6b4e8a1d3-n9p2r', namespace: 'openclaw', status: 'Running', restarts: 0, age: '7d', cpu: '25m', memory: '64Mi', node: 'node-1' },
  { name: 'redis-master-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14d', cpu: '15m', memory: '96Mi', node: 'node-1' },
  { name: 'postgres-primary-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14d', cpu: '80m', memory: '512Mi', node: 'node-2' },
  { name: 'postgres-replica-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14d', cpu: '40m', memory: '384Mi', node: 'node-1' },
];

export default function K8sStatusPage() {
  const { data: podData, isLoading: podsLoading, refetch } = useQuery({
    queryKey: ['k8s-pods'],
    queryFn: () => k8sApi.pods(),
    retry: false,
  });

  const pods = podData?.data?.data || placeholderPods;

  const statusCounts = pods.reduce((acc: any, pod: any) => {
    acc[pod.status] = (acc[pod.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box>
      <PageHeader
        title="Kubernetes状态"
        subtitle="Pod与集群健康概览"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* Status Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CheckCircle sx={{ color: 'success.main', fontSize: 36 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{statusCounts['Running'] || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Running Pods</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <Warning sx={{ color: 'warning.main', fontSize: 36 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{statusCounts['Pending'] || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Pending Pods</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <Error sx={{ color: 'error.main', fontSize: 36 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{statusCounts['Failed'] || statusCounts['CrashLoopBackOff'] || 0}</Typography>
                <Typography variant="caption" color="text.secondary">Failed / Error Pods</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pod Table */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Pods</Typography>

      {podsLoading ? <LoadingState /> : (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell>Pod 名称</TableCell>
              <TableCell>Namespace</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">Restarts</TableCell>
              <TableCell>Age</TableCell>
              <TableCell align="right">CPU</TableCell>
              <TableCell align="right">Memory</TableCell>
              <TableCell>Node</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pods.map((pod: any, idx: number) => (
              <TableRow key={pod.name || idx} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{pod.name}</TableCell>
                <TableCell>
                  <Chip label={pod.namespace} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={pod.status?.toLowerCase() || 'unknown'} label={pod.status} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{
                    fontFamily: 'monospace', fontWeight: pod.restarts > 0 ? 600 : 400,
                    color: pod.restarts > 2 ? 'error.main' : 'inherit',
                  }}>
                    {pod.restarts}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{pod.age}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{pod.cpu || '-'}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{pod.memory || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{pod.node || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
