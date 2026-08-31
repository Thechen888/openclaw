import { useState } from 'react';
import {
  Box, Card, IconButton, Button, Typography, Chip, Divider,
  Popover, TextField, MenuItem, Select, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Refresh, PlayArrow, AccessTime, Inventory2,
} from '@mui/icons-material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/shared';
import { stacksApi } from '../../api/client';

interface MetricPoint { time: string; value: number }

interface ContainerInfo {
  name: string;
  image: string;
  status: string;
  status_label: string;
  restart: number;
  port: string;
  has_probe: boolean;
  metrics: {
    cpu: MetricPoint[];
    memory: MetricPoint[];
    egress: MetricPoint[];
    ingress: MetricPoint[];
  };
}

interface StackDetail {
  id: string;
  name: string;
  directory: string;
  compose_file: string;
  health: string;
  health_label: string;
  is_platform_self: boolean;
  running_count: number;
  total_count: number;
  containers: ContainerInfo[];
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

const INTERVAL_OPTIONS = [
  { value: '1m', label: '1 分钟' },
  { value: '5m', label: '5 分钟' },
  { value: '10m', label: '10 分钟' },
  { value: '30m', label: '30 分钟' },
  { value: '1h', label: '1 小时' },
];

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function StackDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [range, setRange] = useState('最近 8 小时');
  const [activeContainer, setActiveContainer] = useState<string | null>(null);

  const detailQ = useQuery({
    queryKey: ['stack-detail-page', id],
    queryFn: () => stacksApi.detail(id as string),
    retry: false,
    enabled: !!id,
  });

  if (detailQ.isLoading) return <LoadingState />;

  const d: StackDetail = detailQ.data?.data?.data;
  if (!d) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => nav('/resources/restart')}>返回服务重启</Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>未找到该 Stack</Typography>
      </Box>
    );
  }

  const current = d.containers.find(c => c.name === activeContainer) || d.containers[0];

  return (
    <Box>
      {/* 顶部面包屑 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <IconButton size="small" onClick={() => nav('/resources/restart')}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Stack · {d.name}</Typography>
        <Chip label={d.health_label} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* 左侧详情 + 服务列表 */}
        <Card sx={{ width: 300, p: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 1.5, bgcolor: 'action.hover',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Inventory2 color="primary" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                {d.directory}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* 基本信息 */}
          {[
            ['Compose 文件', d.compose_file, true],
            ['运行中 / 总数', `${d.running_count} / ${d.total_count}`],
            ['健康状态', d.health_label],
            ['平台自身', d.is_platform_self ? '是' : '-'],
          ].map(([label, value, mono]) => (
            <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: mono ? 'monospace' : 'inherit',
                  textAlign: 'right', wordBreak: 'break-all',
                  fontWeight: 500,
                }}
              >
                {String(value)}
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 1.5 }} />

          {/* 服务列表 */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
            服务
          </Typography>
          {d.containers.map(c => (
            <Box
              key={c.name}
              onClick={() => setActiveContainer(c.name)}
              sx={{
                p: 1, mb: 0.5, borderRadius: 1, cursor: 'pointer',
                bgcolor: (current?.name === c.name) ? 'action.selected' : 'transparent',
                border: '1px solid',
                borderColor: (current?.name === c.name) ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: current?.name === c.name ? 700 : 500 }}>
                {c.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Chip label={c.status_label} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {c.port}
                </Typography>
              </Box>
            </Box>
          ))}
        </Card>

        {/* 右侧主区 - 只有监控 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MonitorPanel
            container={current}
            range={range}
            onRangeChange={setRange}
            onRefresh={() => detailQ.refetch()}
          />
        </Box>
      </Box>
    </Box>
  );
}

// =================== 监控面板 ===================
function MonitorPanel({
  container, range, onRangeChange, onRefresh,
}: {
  container?: ContainerInfo;
  range: string;
  onRangeChange: (v: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            监控 {container ? `· ${container.name}` : ''}
          </Typography>
          {container && (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {container.image}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeRangePopover value={range} onChange={onRangeChange} />
          <Tooltip title="自动刷新">
            <IconButton sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#334155' } }}>
              <PlayArrow fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="刷新">
            <IconButton onClick={onRefresh} sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 1, '&:hover': { bgcolor: '#334155' } }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {!container ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">无服务</Typography>
        </Box>
      ) : (
        <>
          <MetricChart title="CPU 使用量 (m)" data={container.metrics.cpu} />
          <MetricChart title="内存使用量 (Mi)" data={container.metrics.memory} />
          <MetricChart title="出站流量 (Kbps)" data={container.metrics.egress} />
          <MetricChart title="入站流量 (bps)" data={container.metrics.ingress} />
        </>
      )}
    </Card>
  );
}

function MetricChart({ title, data }: { title: string; data: MetricPoint[] }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sd-grad-${title}`} x1="0" y1="0" x2="0" y2="1">
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
              fill={`url(#sd-grad-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
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
  const currentLabel = TIME_RANGES.find(r => r.label === value)?.label || value;

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
        onClick={e => setAnchor(e.currentTarget)}
        startIcon={<AccessTime fontSize="small" />}
        sx={{
          bgcolor: '#1e293b', color: '#fff', textTransform: 'none',
          minWidth: 180, justifyContent: 'space-between',
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
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>
              选择时间范围
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {TIME_RANGES.map(r => (
                <Box
                  key={r.value}
                  onClick={() => handlePresetClick(r.label)}
                  sx={{
                    cursor: 'pointer', fontSize: 13,
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
          <Box sx={{ flex: 1.1, borderLeft: '1px solid rgba(148,163,184,0.2)', pl: 4 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2 }}>
              自定义时间范围
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              开始时间
            </Typography>
            <TextField fullWidth size="small" value={startTime} onChange={e => setStartTime(e.target.value)} sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              结束时间
            </Typography>
            <TextField fullWidth size="small" value={endTime} onChange={e => setEndTime(e.target.value)} sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              采样间隔
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select size="small" value={interval} onChange={e => setInterval(e.target.value)} sx={{ flex: 1 }}>
                {INTERVAL_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
              <Button variant="outlined" size="small" onClick={() => setAnchor(null)} sx={{ borderRadius: 5, minWidth: 70 }}>
                取消
              </Button>
              <Button
                variant="contained" size="small" onClick={handleConfirm}
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
