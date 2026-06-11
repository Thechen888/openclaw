import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Alert, Grid, Switch, IconButton,
  TextField, InputAdornment, Tooltip, Table, TableHead, TableBody, TableRow, TableCell, Chip,
} from '@mui/material';
import {
  Refresh, Wifi, WifiOff, CheckCircle, ErrorOutlined, Visibility, VisibilityOff, ContentCopy,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

type EventType = 'connected' | 'disconnected' | 'auth_failed';
type Protocol = 'WSS' | 'WS' | 'HTTPS';

interface HistoryItem {
  id: string;
  event: EventType;
  remote_ip: string;
  time: string;
  duration_min?: number | null;
  reason?: string | null;
}

interface RemoteManagement {
  enabled: boolean;
  last_heartbeat: string;
  uptime_hours: number;
  endpoint: string;
  port: number;
  protocol: Protocol;
  auth_token: string;
  history: HistoryItem[];
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const eventMeta: Record<EventType, { label: string; icon: React.ReactNode; color: string }> = {
  connected: {
    label: 'connected',
    icon: <CheckCircle sx={{ fontSize: 18, color: '#10b981' }} />,
    color: '#10b981',
  },
  disconnected: {
    label: 'disconnected',
    icon: <WifiOff sx={{ fontSize: 18, color: 'text.disabled' }} />,
    color: 'inherit',
  },
  auth_failed: {
    label: 'auth_failed',
    icon: <ErrorOutlined sx={{ fontSize: 18, color: '#ef4444' }} />,
    color: '#ef4444',
  },
};

export default function RemoteManagementPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tokenVisible, setTokenVisible] = useState(false);

  const remoteQ = useQuery({
    queryKey: ['remote-management'],
    queryFn: () => api.get('/system/remote-management'),
  });

  const data: RemoteManagement | null = remoteQ.data?.data?.data || null;

  const updateMu = useMutation({
    mutationFn: (payload: Partial<RemoteManagement>) =>
      api.put('/system/remote-management', payload),
    onSuccess: () => {
      enqueueSnackbar('操作成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['remote-management'] });
    },
  });

  const handleToggle = (checked: boolean) => {
    updateMu.mutate({ enabled: checked });
  };

  const handleCopyToken = async () => {
    if (!data?.auth_token) return;
    try {
      await navigator.clipboard.writeText(data.auth_token);
      enqueueSnackbar('Token 已复制', { variant: 'success' });
    } catch {
      enqueueSnackbar('复制失败', { variant: 'error' });
    }
  };

  if (remoteQ.isLoading || !data) {
    return (
      <Box>
        <PageHeader title="远程管理" subtitle="配置外部远程连接管理通道" />
        <LoadingState />
      </Box>
    );
  }

  const enabled = data.enabled;

  return (
    <Box>
      <PageHeader
        title="远程管理"
        subtitle="配置外部远程连接管理通道"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => remoteQ.refetch()}>
              <Refresh />
            </IconButton>
          </Tooltip>
        }
      />

      <Grid container spacing={3}>
        {/* 服务状态 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                服务状态
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: enabled ? 'rgba(16,185,129,0.15)' : 'action.hover',
                    color: enabled ? '#10b981' : 'text.disabled',
                  }}
                >
                  {enabled ? <Wifi sx={{ fontSize: 32 }} /> : <WifiOff sx={{ fontSize: 32 }} />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {enabled ? '已连接' : '未连接'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    最后心跳: {formatDateTime(data.last_heartbeat)}
                  </Typography>
                </Box>
                <Switch
                  checked={enabled}
                  onChange={(_, v) => handleToggle(v)}
                  disabled={updateMu.isPending}
                  color="success"
                />
              </Box>

              {enabled && (
                <Alert severity="success" icon={<CheckCircle fontSize="small" />}>
                  远程管理通道已持续运行 {data.uptime_hours} 小时
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 连接配置 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                连接配置
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth size="small"
                    label="连接地址"
                    value={data.endpoint}
                    slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth size="small"
                    label="端口"
                    value={data.port}
                    slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth size="small"
                    label="协议"
                    value={data.protocol}
                    slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace' } } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth size="small"
                    label="认证Token"
                    type={tokenVisible ? 'text' : 'password'}
                    value={data.auth_token}
                    slotProps={{
                      input: {
                        readOnly: true,
                        sx: { fontFamily: 'monospace' },
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={tokenVisible ? '隐藏' : '显示'}>
                              <IconButton
                                size="small"
                                onClick={() => setTokenVisible((v) => !v)}
                              >
                                {tokenVisible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="复制">
                              <IconButton size="small" onClick={handleCopyToken}>
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 连接历史 */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                连接历史
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 200 }}>事件</TableCell>
                    <TableCell sx={{ width: 200 }}>远程IP</TableCell>
                    <TableCell sx={{ width: 220 }}>时间</TableCell>
                    <TableCell sx={{ width: 160 }}>持续时长</TableCell>
                    <TableCell>原因</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        暂无连接历史
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.history.map((h) => {
                      const meta = eventMeta[h.event];
                      return (
                        <TableRow key={h.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {meta.icon}
                              <Typography variant="body2" sx={{ color: meta.color, fontWeight: 500 }}>
                                {meta.label}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{h.remote_ip}</TableCell>
                          <TableCell>{formatDateTime(h.time)}</TableCell>
                          <TableCell>
                            {typeof h.duration_min === 'number'
                              ? `${h.duration_min} min`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {h.reason ? (
                              <Chip
                                label={h.reason}
                                size="small"
                                variant="outlined"
                                color={h.reason === 'invalid_token' ? 'error' : 'default'}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
