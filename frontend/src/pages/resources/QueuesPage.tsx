import {
  Box, Grid, Card, CardContent, Typography, Chip, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, LinearProgress,
} from '@mui/material';
import { Refresh, PlayArrow, Delete, Speed, Error, Schedule, QueuePlayNext } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, StatCard, StatusBadge, DataTable, LoadingState, EmptyState } from '../../components/shared';
import { queuesApi } from '../../api/client';

// Placeholder data for when API is not available
const placeholderQueues = [
  { name: 'default', active: 3, waiting: 12, completed: 1456, failed: 2, delayed: 5 },
  { name: 'model-inference', active: 1, waiting: 8, completed: 892, failed: 0, delayed: 0 },
  { name: 'account-sync', active: 0, waiting: 0, completed: 234, failed: 1, delayed: 0 },
  { name: 'notifications', active: 0, waiting: 2, completed: 567, failed: 0, delayed: 3 },
];

const placeholderFailedTasks = [
  { id: 'ft-1', queue: 'default', job: 'send_notification', error: 'Connection timeout', failed_at: new Date(Date.now() - 300000).toISOString(), attempts: 3 },
  { id: 'ft-2', queue: 'default', job: 'process_webhook', error: 'Invalid payload format', failed_at: new Date(Date.now() - 600000).toISOString(), attempts: 1 },
  { id: 'ft-3', queue: 'account-sync', job: 'sync_chat_accounts', error: 'Rate limit exceeded', failed_at: new Date(Date.now() - 1200000).toISOString(), attempts: 5 },
];

export default function QueuesPage() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => queuesApi.stats(),
    refetchInterval: 15000,
  });

  const queues = data?.data?.data?.queues || placeholderQueues;
  const failedTasks = data?.data?.data?.failed_tasks || placeholderFailedTasks;

  const retryMutation = useMutation({
    mutationFn: (taskId: string) => queuesApi.retry(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue-stats'] }),
  });
  const clearMutation = useMutation({
    mutationFn: () => queuesApi.clearFailed(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue-stats'] }),
  });

  const totalActive = queues.reduce((sum: number, q: any) => sum + (q.active || 0), 0);
  const totalWaiting = queues.reduce((sum: number, q: any) => sum + (q.waiting || 0), 0);
  const totalCompleted = queues.reduce((sum: number, q: any) => sum + (q.completed || 0), 0);
  const totalFailed = queues.reduce((sum: number, q: any) => sum + (q.failed || 0), 0);

  const stats = [
    { title: 'Active Jobs', value: totalActive, icon: <Speed />, color: 'primary' },
    { title: 'Waiting', value: totalWaiting, icon: <Schedule />, color: 'warning' },
    { title: 'Completed', value: totalCompleted.toLocaleString(), icon: <QueuePlayNext />, color: 'success' },
    { title: 'Failed', value: totalFailed, icon: <Error />, color: 'error' },
  ];

  return (
    <Box>
      <PageHeader
        title="任务队列"
        subtitle="后台任务队列状态与失败任务管理"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            {failedTasks.length > 0 && (
              <Tooltip title="Clear All Failed">
                <IconButton color="error" onClick={() => { if (confirm('Clear all failed tasks?')) clearMutation.mutate(); }}>
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </>
        }
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <StatCard title={s.title} value={s.value} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      {/* Queue Overview */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Queue Overview</Typography>

      {isLoading ? <LoadingState /> : (
        <Box sx={{ mb: 4 }}>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Queue 名称</TableCell>
                <TableCell align="right">Active</TableCell>
                <TableCell align="right">Waiting</TableCell>
                <TableCell align="right">Completed</TableCell>
                <TableCell align="right">Failed</TableCell>
                <TableCell align="right">Delayed</TableCell>
                <TableCell>Health</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((q: any, idx: number) => {
                const health = q.failed > 5 ? 'unhealthy' : q.failed > 0 ? 'degraded' : 'healthy';
                return (
                  <TableRow key={q.name || idx} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{q.name}</TableCell>
                    <TableCell align="right">
                      <Chip label={q.active} size="small" color={q.active > 0 ? 'primary' : 'default'} sx={{ fontSize: 11, height: 22, minWidth: 28 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{q.waiting}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{q.completed?.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{
                        fontFamily: 'monospace', fontWeight: 600,
                        color: q.failed > 0 ? 'error.main' : 'inherit',
                      }}>
                        {q.failed}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{q.delayed || 0}</TableCell>
                    <TableCell><StatusBadge status={health} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </Box>
      )}

      {/* Failed Tasks */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Failed Tasks
        {failedTasks.length > 0 && (
          <Chip label={failedTasks.length} size="small" color="error" sx={{ ml: 1, fontSize: 11, height: 20 }} />
        )}
      </Typography>

      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell>Queue</TableCell>
            <TableCell>Job</TableCell>
            <TableCell>Error</TableCell>
            <TableCell align="right">Attempts</TableCell>
            <TableCell>Failed At</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {failedTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <EmptyState title="暂无failed tasks" description="All tasks are running smoothly" />
              </TableCell>
            </TableRow>
          ) : failedTasks.map((task: any) => (
            <TableRow key={task.id} hover>
              <TableCell>
                <Chip label={task.queue} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>{task.job}</TableCell>
              <TableCell sx={{ fontSize: 12, color: 'error.main', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.error}
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{task.attempts}</TableCell>
              <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {task.failed_at ? new Date(task.failed_at).toLocaleString() : '-'}
              </TableCell>
              <TableCell>
                <Tooltip title="Retry">
                  <IconButton
                    size="small" color="primary"
                    onClick={() => retryMutation.mutate(task.id)}
                    disabled={retryMutation.isPending}
                  >
                    <PlayArrow fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>
    </Box>
  );
}
