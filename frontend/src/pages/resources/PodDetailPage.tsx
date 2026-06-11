import { useEffect, useState } from 'react';
import {
  Box, Card, IconButton, Button, Tabs, Tab, Typography, Chip, Divider,
  Avatar, Table, TableHead, TableBody, TableRow, TableCell, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, Tooltip, Popover, TextField,
} from '@mui/material';
import {
  ArrowBack, Refresh, PlayArrow, FiberManualRecord, Close, Download, Article,
  Description, Settings as SettingsIcon, Storage as StorageIcon,
  AccessTime,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/shared';
import api from '../../api/client';

type PodTab = 'resource' | 'monitor' | 'events';

interface ContainerInfo {
  name: string;
  image: string;
  status: string;
  restart: number;
  port: string;
  has_probe: boolean;
}

interface VolumeInfo {
  name: string;
  type: string;
  source_name?: string;
  source_type?: string;
  mounts: { container: string; path: string; mode: string }[];
}

interface MetricPoint {
  time: string;
  value: number;
}

interface PodEvent {
  id: string;
  type: 'normal' | 'warning';
  reason: string;
  age: string;
  source: string;
  message: string;
}

interface PodDetail {
  id: string;
  name: string;
  cluster: string;
  project: string;
  app: string;
  status_label: string;
  pod_ip: string;
  node_name: string;
  node_ip: string;
  restart: number;
  qos: string;
  created_at: string;
  containers: ContainerInfo[];
  volumes: VolumeInfo[];
  metrics: {
    cpu: MetricPoint[];
    memory: MetricPoint[];
    egress: MetricPoint[];
    ingress: MetricPoint[];
  };
  events: PodEvent[];
}

const TIME_RANGES = [
  { value: '10m', label: '最近 10 分钟' },
  { value: '20m', label: '最近 20 分钟' },
  { value: '30m', label: '最近 30 分钟' },
  { value: '1h', label: '最近 1 小时' },
  { value: '2h', label: '最近 2 小时' },
  { value: '3h', label: '最近 3 小时' },
  { value: '5h', label: '最近 5 小时' },
  { value: '8h', label: '最近 8 小时' },
  { value: '12h', label: '最近 12 小时' },
  { value: '1d', label: '最近 1 天' },
  { value: '2d', label: '最近 2 天' },
  { value: '3d', label: '最近 3 天' },
  { value: '7d', label: '最近 7 天' },
];

export default function PodDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState<PodTab>('resource');
  const [range, setRange] = useState('8h');
  const [yamlOpen, setYamlOpen] = useState(false);

  const detailQ = useQuery({
    queryKey: ['pod', id],
    queryFn: () => api.get(`/system/pods/${id}`),
    enabled: !!id,
  });

  const d: PodDetail | null = (detailQ.data?.data?.data as PodDetail) || null;

  if (detailQ.isLoading || !d) return <LoadingState />;

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* 左侧详情 */}
      <Card sx={{ width: 300, p: 2, alignSelf: 'flex-start' }}>
        <Button
          size="small"
          startIcon={<ArrowBack />}
          onClick={() => nav('/resources/pods')}
          sx={{ mb: 2, color: 'text.secondary' }}
        >
          容器组
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Avatar
            sx={{
              width: 32, height: 32, bgcolor: 'rgba(99,102,241,0.12)', color: '#6366f1',
            }}
          >
            <Description fontSize="small" />
          </Avatar>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, wordBreak: 'break-all' }}
          >
            {d.name.length > 28 ? d.name.slice(0, 26) + '...' : d.name}
          </Typography>
        </Box>

        <Button variant="outlined" size="small" fullWidth sx={{ mb: 2 }} onClick={() => setYamlOpen(true)}>
          查看 YAML
        </Button>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1.5, display: 'block' }}>
          详情
        </Typography>

        {[
          ['集群', d.cluster],
          ['项目', d.project],
          ['应用', d.app || '-'],
          ['状态', d.status_label, true],
          ['容器组 IP 地址', d.pod_ip],
          ['节点名称', d.node_name],
          ['节点 IP 地址', d.node_ip],
          ['重启次数', d.restart],
          ['QoS 类别', d.qos],
          ['创建时间', d.created_at],
        ].map(([label, value, isStatus]) => (
          <Box
            key={label as string}
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color: isStatus ? '#10b981' : 'text.primary',
                textAlign: 'right',
                maxWidth: 160,
                wordBreak: 'break-all',
              }}
            >
              {String(value)}
            </Typography>
          </Box>
        ))}
      </Card>

      {/* 右侧主区 */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Card sx={{ mb: 2, bgcolor: '#1e293b' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 2,
              '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', minHeight: 56, fontWeight: 500 },
              '& .Mui-selected': {
                color: '#fff !important',
                bgcolor: '#10b981',
                borderRadius: '6px',
                my: 1,
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab value="resource" label="资源状态" />
            <Tab value="monitor" label="监控" />
            <Tab value="events" label="事件" />
          </Tabs>
        </Card>

        {tab === 'resource' && <ResourceTab containers={d.containers} volumes={d.volumes} />}

        {tab === 'monitor' && (
          <MonitorTab
            metrics={d.metrics}
            range={range}
            onRangeChange={setRange}
            onRefresh={() => detailQ.refetch()}
          />
        )}

        {tab === 'events' && <EventsTab events={d.events} />}
      </Box>

      <YamlDialog open={yamlOpen} pod={d} onClose={() => setYamlOpen(false)} />
    </Box>
  );
}

// =================== 资源状态 Tab ===================
function ResourceTab({
  containers, volumes,
}: { containers: ContainerInfo[]; volumes: VolumeInfo[] }) {
  const [logContainer, setLogContainer] = useState<string | null>(null);

  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        容器
      </Typography>
      {containers.map((c) => (
        <Card key={c.name} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <Description />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {c.name}
                </Typography>
                <Tooltip title="容器日志" arrow placement="top">
                  <IconButton
                    size="small"
                    sx={{ p: 0.25 }}
                    onClick={() => setLogContainer(c.name)}
                  >
                    <Article sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                {c.has_probe && (
                  <Tooltip
                    arrow
                    placement="top"
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: '#fff',
                          color: '#0f172a',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                          border: '1px solid rgba(148,163,184,0.25)',
                          maxWidth: 'none',
                          p: 1.5,
                          '& .MuiTypography-root': { color: 'inherit' },
                        },
                      },
                      arrow: { sx: { color: '#fff', '&::before': { border: '1px solid rgba(148,163,184,0.25)' } } },
                    }}
                    title={
                      <Box sx={{ minWidth: 220 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label="就绪探针"
                            size="small"
                            sx={{
                              height: 20, fontSize: 11,
                              bgcolor: '#10b981',
                              fontWeight: 600,
                              '& .MuiChip-label': { color: '#fff' },
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>HTTP 请求</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#64748b' }}>
                          5s 初始延迟，1s 超时时间
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: '#0f172a' }}>
                          GET / on port 9000 (HTTP)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label="存活探针"
                            size="small"
                            sx={{
                              height: 20, fontSize: 11,
                              bgcolor: '#fb923c',
                              fontWeight: 600,
                              '& .MuiChip-label': { color: '#fff' },
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>HTTP 请求</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#64748b' }}>
                          300s 初始延迟，1s 超时时间
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: '#0f172a' }}>
                          GET / on port 9000 (HTTP)
                        </Typography>
                      </Box>
                    }
                  >
                    <Chip
                      label="探针"
                      size="small"
                      sx={{
                        height: 18, fontSize: 11,
                        bgcolor: '#1e293b', color: '#fff',
                        cursor: 'pointer',
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                镜像: {c.image}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'left', minWidth: 100 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FiberManualRecord sx={{ fontSize: 10, color: '#10b981' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {c.status}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                状态
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'left', minWidth: 80 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {c.restart}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                重启次数
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'left', minWidth: 100 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {c.port}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                端口
              </Typography>
            </Box>
          </Box>
        </Card>
      ))}

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, mt: 3 }}>
        存储卷
      </Typography>
      {volumes.map((v) => (
        <Card key={v.name} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ bgcolor: 'rgba(168,85,247,0.12)', color: '#a855f7' }}>
              <StorageIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {v.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                存储卷类型: {v.type}
              </Typography>
            </Box>
            {v.source_name && (
              <Box sx={{ textAlign: 'left', minWidth: 200 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {v.source_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {v.source_type}
                </Typography>
              </Box>
            )}
            <Box sx={{ minWidth: 200 }} />
          </Box>
          <Divider sx={{ my: 1 }} />
          {v.mounts.map((m, idx) => (
            <Box
              key={idx}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75 }}
            >
              <SettingsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 80 }}>
                {m.container}
              </Typography>
              <SettingsIcon sx={{ fontSize: 14, color: 'text.disabled', mx: 1 }} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1 }}>
                {m.path}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({m.mode})
                </Typography>
              </Typography>
            </Box>
          ))}
        </Card>
      ))}

      <ContainerLogsDialog
        open={!!logContainer}
        containerName={logContainer || ''}
        onClose={() => setLogContainer(null)}
      />
    </>
  );
}

// =================== 容器日志对话框 ===================
function generateLogs(containerName: string, lines = 60): string {
  const out: string[] = [];
  const now = new Date();
  for (let i = lines - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 1000);
    const ts = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const reqId = Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Math.random().toString(16).slice(2, 14);
    const cost = (Math.random() * 10 + 4).toFixed(3);
    const seq = 1781140000000 + i * 80000 + Math.floor(Math.random() * 1000);
    if (i % 2 === 0) {
      out.push(
        `${ts} log.go:52 [INFO] requestID: ${reqId} request: {/metrics /metrics ${ts.replace(' ', ' ')} +0800 CST m=+667199.882190144   0 10.233.118.113   ${reqId.slice(0, 8)}-${reqId.slice(9, 13)}-${reqId.slice(14, 18)}-${reqId.slice(19, 23)} ${i % 4} GET ${seq}}`
      );
      out.push(`${ts} 10.233.118.113 GET /metrics   0   ${i % 5}`);
    } else {
      out.push(
        `${ts} logger.go:100 [TRAC] /builds/openapi/openapi-backend/pkg/service/logging/request_log_mysql.go:304 [cost:${cost}ms] [rows:1] INSERT INTO \`request_log\` (\`path\`,\`route\`,\`create_time\`,\`request\`,\`response\`,\`status\`,\`client_ip\`,\`access_key\`,\`error\`,\`request_id\`,\`latency\`,\`me`
      );
    }
  }
  return out.join('\n');
}

function ContainerLogsDialog({
  open, containerName, onClose,
}: { open: boolean; containerName: string; onClose: () => void }) {
  const [logs, setLogs] = useState('');
  const [streaming, setStreaming] = useState(false);

  // 打开时生成初始日志
  useEffect(() => {
    if (open) {
      setLogs(generateLogs(containerName));
    } else {
      setLogs('');
      setStreaming(false);
    }
  }, [open, containerName]);

  const handleRefresh = () => setLogs(generateLogs(containerName));

  const handleToggleStream = () => {
    setStreaming((s) => !s);
    if (!streaming) {
      setLogs((prev) => prev + '\n' + generateLogs(containerName, 5));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${containerName}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setLogs('');
    setStreaming(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xl"
      slotProps={{ paper: { sx: { height: '85vh' } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 16, fontWeight: 600, py: 1.5,
        }}
      >
        容器日志
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: '#1e293b' }}>
        {/* 右上角控制按钮组 */}
        <Box
          sx={{
            position: 'absolute', top: 8, right: 16, zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'rgba(15,23,42,0.85)', borderRadius: 1, px: 1, py: 0.5,
          }}
        >
          <Tooltip title={streaming ? '停止实时' : '查看实时容器日志'} arrow>
            <IconButton size="small" sx={{ color: streaming ? '#10b981' : '#fff' }} onClick={handleToggleStream}>
              <PlayArrow fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 1, height: 14, bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Tooltip title="刷新" arrow>
            <IconButton size="small" sx={{ color: '#fff' }} onClick={handleRefresh}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 1, height: 14, bgcolor: 'rgba(255,255,255,0.3)' }} />
          <Tooltip title="下载日志" arrow>
            <IconButton size="small" sx={{ color: '#fff' }} onClick={handleDownload}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          component="pre"
          sx={{
            m: 0, p: 2, height: '100%', overflow: 'auto',
            color: '#e2e8f0', fontSize: 12,
            fontFamily: 'Consolas, "Courier New", monospace',
            whiteSpace: 'pre',
            bgcolor: '#1e293b',
          }}
        >
          {logs || '加载中...'}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// =================== 监控 Tab ===================
const INTERVAL_OPTIONS = [
  { value: '1m', label: '1 分钟' },
  { value: '5m', label: '5 分钟' },
  { value: '10m', label: '10 分钟' },
  { value: '30m', label: '30 分钟' },
  { value: '1h', label: '1 小时' },
];

function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function TimeRangePopover({
  value, onChange,
}: { value: string; onChange: (label: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [startTime, setStartTime] = useState(formatDateTime(oneHourAgo));
  const [endTime, setEndTime] = useState(formatDateTime(now));
  const [interval, setInterval] = useState('10m');

  const open = Boolean(anchor);
  const currentLabel = TIME_RANGES.find((r) => r.value === value)?.label || value;

  const handlePresetClick = (label: string) => {
    onChange(label);
    setAnchor(null);
  };

  const handleConfirm = () => {
    onChange(`${startTime} ~ ${endTime}`);
    setAnchor(null);
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<AccessTime fontSize="small" />}
        sx={{
          bgcolor: '#1e293b',
          color: '#fff',
          textTransform: 'none',
          minWidth: 180,
          justifyContent: 'space-between',
          '&:hover': { bgcolor: '#334155' },
        }}
        endIcon={
          <Box sx={{
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid #fff',
          }} />
        }
      >
        {currentLabel}
      </Button>
      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, p: 3, width: 720 } } }}
      >
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* 左侧预设 */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>
              选择时间范围
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {TIME_RANGES.map((r) => (
                <Box
                  key={r.value}
                  onClick={() => handlePresetClick(r.label)}
                  sx={{
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: r.label === currentLabel ? 700 : 500,
                    color: r.label === currentLabel ? '#10b981' : 'text.primary',
                    '&:hover': { color: '#10b981' },
                  }}
                >
                  {r.label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* 右侧自定义 */}
          <Box sx={{ flex: 1.1, borderLeft: '1px solid rgba(148,163,184,0.2)', pl: 4 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>
              自定义时间范围
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              开始时间
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              结束时间
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              采样间隔
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select
                size="small"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                sx={{ flex: 1 }}
              >
                {INTERVAL_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setAnchor(null)}
                sx={{ borderRadius: 5, minWidth: 70 }}
              >
                取消
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleConfirm}
                sx={{ borderRadius: 5, minWidth: 70, bgcolor: '#1e293b', '&:hover': { bgcolor: '#334155' } }}
              >
                确定
              </Button>
            </Box>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

function MonitorTab({
  metrics, range, onRangeChange, onRefresh,
}: {
  metrics: PodDetail['metrics'];
  range: string;
  onRangeChange: (v: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          监控
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeRangePopover value={range} onChange={onRangeChange} />
          <IconButton sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#334155' } }}>
            <PlayArrow fontSize="small" />
          </IconButton>
          <IconButton onClick={onRefresh} sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#334155' } }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <MetricChart title="CPU 使用量 (m)" data={metrics.cpu} />
      <MetricChart title="内存使用量 (Mi)" data={metrics.memory} />
      <MetricChart title="出站流量 (Kbps)" data={metrics.egress} />
      <MetricChart title="入站流量 (bps)" data={metrics.ingress} />
    </Card>
  );
}

function MetricChart({ title, data }: { title: string; data: MetricPoint[] }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <RTooltip contentStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={1.5}
              fill={`url(#grad-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// =================== YAML 对话框 ===================
function buildPodYaml(pod: PodDetail): string {
  const containerYaml = pod.containers.map((c) => `    - name: ${c.name}
      image: ${c.image}
      ports:
        - containerPort: ${parseInt(c.port) || 9000}
          protocol: TCP
      imagePullPolicy: IfNotPresent`).join('\n');

  return `kind: Pod
apiVersion: v1
metadata:
  name: ${pod.name}
  generateName: ${pod.name.replace(/-[a-z0-9]+$/, '-')}
  namespace: ${pod.project}
  labels:
    app.kubernetes.io/instance: ${pod.app || pod.project}
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: ${pod.app || pod.project}
    app.kubernetes.io/version: 0.1.0-alpha.1
    component: core-eu
    helm.sh/chart: ${pod.app || pod.project}-0.1.0
    pod-template-hash: dfc5bdd74
  annotations:
    cni.projectcalico.org/containerID: 9333fdcd49a3f24dbc97071c8b456b0bc447b0e71c28f30de75acb446a3dee00
    cni.projectcalico.org/podIP: ${pod.pod_ip}/32
    cni.projectcalico.org/podIPs: ${pod.pod_ip}/32
    kubesphere.io/restartedAt: '2024-07-29T09:40:12.853Z'
spec:
  volumes:
    - name: core-config
      configMap:
        name: ${pod.app || pod.project}-core-eu
        defaultMode: 420
    - name: kube-api-access-tvddg
      projected:
        sources:
          - serviceAccountToken:
              expirationSeconds: 3607
              path: token
          - configMap:
              name: kube-root-ca.crt
              items:
                - key: ca.crt
                  path: ca.crt
          - downwardAPI:
              items:
                - path: namespace
                  fieldRef:
                    apiVersion: v1
                    fieldPath: metadata.namespace
        defaultMode: 420
  containers:
${containerYaml}
  restartPolicy: Always
  terminationGracePeriodSeconds: 30
  dnsPolicy: ClusterFirst
  serviceAccountName: default
  serviceAccount: default
  nodeName: ${pod.node_name}
  securityContext: {}
  schedulerName: default-scheduler
status:
  phase: Running
  hostIP: ${pod.node_ip}
  podIP: ${pod.pod_ip}
  podIPs:
    - ip: ${pod.pod_ip}
  qosClass: ${pod.qos}`;
}

function highlightYaml(line: string): { __html: string } {
  let html = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/'([^']*)'/g, '<span style="color:#a3e635">\'$1\'</span>');
  html = html.replace(/^(\s*-?\s*)([\w./-]+)(\s*:)/, '$1<span style="color:#c4b5fd">$2</span>$3');
  html = html.replace(/(:\s*)(-?\d+(?:\.\d+)?)(\s|$)/g, '$1<span style="color:#fb923c">$2</span>$3');
  return { __html: html };
}

function YamlDialog({
  open, pod, onClose,
}: { open: boolean; pod: PodDetail; onClose: () => void }) {
  const yaml = buildPodYaml(pod);
  const lines = yaml.split('\n');

  const handleDownload = () => {
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pod.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{ paper: { sx: { height: '90vh', bgcolor: '#334155' } } }}
    >
      <DialogTitle
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 14, fontWeight: 600, py: 1,
          bgcolor: '#fff',
          borderBottom: '1px solid rgba(148,163,184,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FiberManualRecord sx={{ fontSize: 12, color: '#1e293b' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>查看 YAML</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#334155' } }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, position: 'relative', bgcolor: '#1e293b' }}>
        <Tooltip title="下载 YAML" arrow>
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              position: 'absolute', top: 12, right: 24, zIndex: 2,
              bgcolor: 'rgba(15,23,42,0.85)', color: '#fff',
              '&:hover': { bgcolor: 'rgba(15,23,42,1)' },
            }}
          >
            <Download fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box
          sx={{
            display: 'flex',
            minHeight: '100%',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 13,
            lineHeight: '20px',
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              py: 1.5, px: 2,
              color: 'rgba(148,163,184,0.6)',
              textAlign: 'right',
              userSelect: 'none',
              borderRight: '1px solid rgba(148,163,184,0.15)',
              minWidth: 50,
            }}
          >
            {lines.map((_, i) => (
              <Box key={i}>{i + 1}</Box>
            ))}
          </Box>
          <Box sx={{ py: 1.5, px: 2, color: '#e2e8f0', flex: 1, whiteSpace: 'pre' }}>
            {lines.map((line, i) => (
              <Box
                key={i}
                sx={{ minHeight: 20 }}
                dangerouslySetInnerHTML={highlightYaml(line)}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// =================== 事件 Tab ===================
function EventsTab({ events }: { events: PodEvent[] }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        事件
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 120 }}>类型</TableCell>
            <TableCell sx={{ width: 160 }}>原因</TableCell>
            <TableCell sx={{ width: 160 }}>发生时间</TableCell>
            <TableCell sx={{ width: 160 }}>来源</TableCell>
            <TableCell>消息</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                暂无事件
              </TableCell>
            </TableRow>
          ) : (
            events.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <FiberManualRecord
                      sx={{ fontSize: 10, color: e.type === 'normal' ? '#10b981' : '#f59e0b' }}
                    />
                    <Typography variant="body2">
                      {e.type === 'normal' ? '正常' : '警告'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{e.reason}</TableCell>
                <TableCell>{e.age}</TableCell>
                <TableCell>{e.source}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {e.message}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
