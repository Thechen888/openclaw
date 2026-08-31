import { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, IconButton, Button, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
  Divider, Chip, Table, TableHead, TableBody, TableRow, TableCell, Switch,
  FormControlLabel, Pagination, Alert, Snackbar,
} from '@mui/material';
import {
  Refresh, Search, RestartAlt, PlayArrow, Pause, Stop, Download,
  Article, Save, Terminal, Info, Inventory2, Close, ChevronRight,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import { stacksApi } from '../../api/client';

interface StackItem {
  id: string;
  name: string;
  directory: string;
  compose_file: string;
  health: 'healthy' | 'degraded' | 'unknown' | string;
  health_label: string;
  is_platform_self: boolean;
  running_count: number;
  total_count: number;
}

interface StackServiceRow {
  name: string;
  image: string;
  status: string;
  status_label?: string;
  port: string;
  restart: number;
  has_probe?: boolean;
}

interface StackDetailData extends StackItem {
  containers: StackServiceRow[];
}

interface ComposeInfo {
  compose_file: string;
  yaml: string;
}

interface LogInfo {
  stack_name: string;
  log: string;
}

const healthColor = (h: string) =>
  h === 'healthy' ? 'success' : h === 'degraded' ? 'warning' : 'default';

export default function RestartPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [detailStackId, setDetailStackId] = useState<string | null>(null);
  const [composeStackId, setComposeStackId] = useState<string | null>(null);
  const [logStackId, setLogStackId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);

  const listQ = useQuery({
    queryKey: ['stacks', keyword],
    queryFn: () => stacksApi.list({ q: keyword }),
    retry: false,
  });
  const stacks: StackItem[] = listQ.data?.data?.data || [];

  const runningTotal = stacks.reduce((s, it) => s + (it.running_count || 0), 0);
  const healthyCount = stacks.filter(s => s.health === 'healthy').length;
  const degradedCount = stacks.filter(s => s.health === 'degraded').length;

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return stacks.slice(start, start + pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQ.data, page]);

  const actionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'restart' | 'start' | 'stop' | 'pause' | 'pull' }) => {
      return await stacksApi[action](id);
    },
    onSuccess: (_, v) => {
      const map: Record<string, string> = {
        restart: '重启指令已下发', start: '启动指令已下发', stop: '停止指令已下发',
        pause: '暂停指令已下发', pull: '拉取镜像指令已下发',
      };
      setToast({ msg: map[v.action], sev: 'success' });
      qc.invalidateQueries({ queryKey: ['stacks'] });
    },
    onError: () => setToast({ msg: '操作失败', sev: 'error' }),
  });

  const runAction = (id: string, action: 'restart' | 'start' | 'stop' | 'pause' | 'pull') => {
    actionMut.mutate({ id, action });
  };

  return (
    <Box>
      <PageHeader
        title="服务重启"
        subtitle="重启与管控平台 Compose 服务（API / Worker / 调度等）"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => listQ.refetch()}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      {/* 汇总卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <SummaryCard icon={<Inventory2 />} label="Stack 名称" value={stacks.length} color="#3b82f6" />
        <SummaryCard icon={<Info />} label="健康" value={healthyCount} color="#10b981" />
        <SummaryCard icon={<Info />} label="降级" value={degradedCount} color="#f59e0b" />
        <SummaryCard icon={<PlayArrow />} label="运行中" value={runningTotal} color="#8b5cf6" />
      </Grid>

      {/* 搜索栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Stack 名称"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setKeyword(q); setPage(1); } }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              },
            }}
            sx={{ width: 260 }}
          />
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={() => { setKeyword(q); setPage(1); }}
          >
            搜索
          </Button>
        </Box>
        <Alert icon={<Info fontSize="small" />} severity="info" sx={{ py: 0, alignItems: 'center' }}>
          直接对宿主机 Compose Stack 进行运维操作，生产环境请谨慎执行 down / 停止等动作。
        </Alert>
      </Box>

      {/* Stack 列表 */}
      {listQ.isLoading ? (
        <LoadingState />
      ) : (
        <Grid container spacing={2}>
          {paged.map(s => (
            <Grid size={{ xs: 12, md: 6 }} key={s.id}>
              <StackCard
                stack={s}
                onRestart={() => runAction(s.id, 'restart')}
                onStart={() => runAction(s.id, 'start')}
                onPause={() => runAction(s.id, 'pause')}
                onPull={() => runAction(s.id, 'pull')}
                onStop={() => runAction(s.id, 'stop')}
                onOpenDetail={() => setDetailStackId(s.id)}
                onOpenCompose={() => setComposeStackId(s.id)}
                onOpenLog={() => setLogStackId(s.id)}
                onGoDetailPage={() => nav(`/resources/restart/${s.id}`)}
              />
            </Grid>
          ))}
          {paged.length === 0 && (
            <Grid size={12}>
              <Card sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">暂无数据</Typography>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* 分页 */}
      {stacks.length > pageSize && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Pagination
            count={Math.ceil(stacks.length / pageSize)}
            page={page}
            onChange={(_, p) => setPage(p)}
            size="small"
          />
        </Box>
      )}

      {/* 弹窗 */}
      <StackDetailDrawer
        stackId={detailStackId}
        onClose={() => setDetailStackId(null)}
        onAction={runAction}
      />
      <ComposeConfigDialog
        stackId={composeStackId}
        onClose={() => setComposeStackId(null)}
        onSaved={() => setToast({ msg: '配置已保存', sev: 'success' })}
      />
      <LogDialog stackId={logStackId} onClose={() => setLogStackId(null)} />

      <Snackbar
        open={!!toast}
        autoHideDuration={2400}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.sev} onClose={() => setToast(null)} sx={{ minWidth: 240 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

// =================== 汇总卡片 ===================
function SummaryCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 1.5,
            bgcolor: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}

// =================== Stack 卡片 ===================
function StackCard({
  stack, onRestart, onStart, onPause, onPull, onStop,
  onOpenDetail, onOpenCompose, onOpenLog, onGoDetailPage,
}: {
  stack: StackItem;
  onRestart: () => void; onStart: () => void; onPause: () => void; onPull: () => void; onStop: () => void;
  onOpenDetail: () => void; onOpenCompose: () => void; onOpenLog: () => void; onGoDetailPage: () => void;
}) {
  return (
    <Card>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Inventory2 fontSize="small" color="primary" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {stack.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {stack.directory}
            </Typography>
          </Box>
          <Chip
            label={stack.health_label}
            size="small"
            color={healthColor(stack.health) as 'success' | 'warning' | 'default'}
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        </Box>

        {/* 中部：运行状态 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: stack.running_count > 0 ? 'success.main' : 'text.secondary' }}>
            {stack.running_count} 运行中
          </Typography>
          <Typography variant="caption" color="text.secondary">
            服务总数 {stack.total_count}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* 底部按钮组 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button
              variant="contained" size="small" startIcon={<RestartAlt fontSize="small" />}
              onClick={onRestart}
              sx={{ minWidth: 78 }}
            >
              重启
            </Button>
            <Tooltip title="启动"><IconButton size="small" onClick={onStart}><PlayArrow fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="暂停"><IconButton size="small" onClick={onPause}><Pause fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="拉取镜像"><IconButton size="small" onClick={onPull}><Download fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="停止"><IconButton size="small" onClick={onStop} sx={{ color: 'error.main' }}><Stop fontSize="small" /></IconButton></Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="Stack 详情"><IconButton size="small" onClick={onOpenDetail}><Article fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Compose 配置"><IconButton size="small" onClick={onOpenCompose}><Save fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="日志"><IconButton size="small" onClick={onOpenLog}><Terminal fontSize="small" /></IconButton></Tooltip>
            <Button
              variant="outlined" size="small" onClick={onGoDetailPage}
              endIcon={<ChevronRight fontSize="small" />}
              sx={{ ml: 0.5, minWidth: 72 }}
            >
              详情
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// =================== Stack 详情侧边抽屉 ===================
function StackDetailDrawer({
  stackId, onClose, onAction,
}: {
  stackId: string | null;
  onClose: () => void;
  onAction: (id: string, action: 'restart' | 'start' | 'stop' | 'pause' | 'pull') => void;
}) {
  const open = !!stackId;
  const detailQ = useQuery({
    queryKey: ['stack-detail', stackId],
    queryFn: () => stacksApi.detail(stackId as string),
    enabled: open,
    retry: false,
  });
  const d: StackDetailData | undefined = detailQ.data?.data?.data;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            position: 'fixed', right: 0, top: 0, bottom: 0, height: '100%',
            width: 560, maxWidth: '90vw', borderRadius: 0,
          },
        },
      }}
      hideBackdrop
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Stack 详情</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {!d ? (
          <LoadingState />
        ) : (
          <>
            {/* 顶部信息 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 1.5, bgcolor: 'action.hover',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Inventory2 color="primary" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                <Chip label={d.health_label} size="small" variant="outlined" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <MiniStat value={d.running_count} label="运行中" color="success.main" />
                <MiniStat value={(d.total_count || 0) - (d.running_count || 0)} label="已退出" color="error.main" />
                <MiniStat value={d.total_count} label="服务总数" />
              </Box>
            </Box>

            {/* 基础信息 */}
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, mb: 3 }}>
              <InfoRow label="目录路径" value={d.directory} mono />
              <InfoRow label="Compose 文件" value={d.compose_file} mono />
              <InfoRow label="平台自身" value={d.is_platform_self ? '是' : '-'} />
            </Box>

            {/* 服务列表 */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>服务列表</Typography>
            {(d.containers || []).length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">无数据</Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>服务</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>镜像</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>端口</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(d.containers || []).map((c: StackServiceRow) => (
                    <TableRow key={c.name}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={c.image}><span>{c.image.split('/').pop()}</span></Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={c.status_label || c.status} sx={{ height: 20, fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{c.port}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
        <Button variant="contained" size="small" startIcon={<RestartAlt />} disabled={!d} onClick={() => d && onAction(d.id, 'restart')}>重启</Button>
        <Button variant="contained" color="success" size="small" startIcon={<PlayArrow />} disabled={!d} onClick={() => d && onAction(d.id, 'start')}>启动</Button>
        <Button variant="contained" color="warning" size="small" startIcon={<Stop />} disabled={!d} onClick={() => d && onAction(d.id, 'stop')}>停止</Button>
        <Button variant="outlined" size="small" startIcon={<Download />} disabled={!d} onClick={() => d && onAction(d.id, 'pull')}>拉取镜像</Button>
      </DialogActions>
    </Dialog>
  );
}

function MiniStat({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 44 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.1 }}>{value ?? 0}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{label}</Typography>
    </Box>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <Box sx={{ display: 'flex', mb: 1, gap: 2, '&:last-child': { mb: 0 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>{label}</Typography>
      <Typography variant="caption" sx={{ flex: 1, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

// =================== Compose 配置弹窗 ===================
function ComposeConfigDialog({
  stackId, onClose, onSaved,
}: { stackId: string | null; onClose: () => void; onSaved: () => void }) {
  const open = !!stackId;
  const qc = useQueryClient();
  const [yaml, setYaml] = useState('');
  const [validate, setValidate] = useState(true);

  const composeQ = useQuery({
    queryKey: ['stack-compose', stackId],
    queryFn: () => stacksApi.compose(stackId as string),
    enabled: open,
    retry: false,
  });

  const info: ComposeInfo | undefined = composeQ.data?.data?.data;
  const initYaml: string = info?.yaml || '';

  // 每次获取到新数据时同步到编辑器
  if (open && initYaml && yaml === '' && !composeQ.isFetching) {
    // 只在首次载入时同步，避免覆盖用户编辑
    queueMicrotask(() => setYaml(initYaml));
  }

  const saveMut = useMutation({
    mutationFn: () => stacksApi.saveCompose(stackId as string, yaml, validate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stack-compose', stackId] });
      qc.invalidateQueries({ queryKey: ['stacks'] });
      onSaved();
      handleClose();
    },
  });

  const handleClose = () => {
    setYaml('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            position: 'fixed', right: 0, top: 0, bottom: 0, height: '100%',
            width: 780, maxWidth: '90vw', borderRadius: 0,
          },
        },
      }}
      hideBackdrop
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Compose 配置 · {info?.compose_file?.split('/').slice(-2, -1)[0] || ''}
        </Typography>
        <IconButton size="small" onClick={handleClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: 3, py: 2, display: 'flex', flexDirection: 'column' }}>
        {info?.compose_file && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color: 'text.secondary' }}>
            <Article fontSize="small" />
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{info.compose_file}</Typography>
          </Box>
        )}
        <TextField
          multiline
          fullWidth
          value={yaml}
          onChange={e => setYaml(e.target.value)}
          minRows={20}
          slotProps={{
            input: {
              sx: { fontFamily: 'monospace', fontSize: 13, alignItems: 'flex-start', p: 1.5 },
            },
          }}
          sx={{ flex: 1, '& .MuiInputBase-root': { minHeight: 460 } }}
        />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormControlLabel
            control={<Switch checked={validate} onChange={e => setValidate(e.target.checked)} size="small" />}
            label={<Typography variant="body2">保存前校验</Typography>}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5, ml: 0.5 }}>
            修改后点击保存，默认会先用 docker compose config 校验再落盘
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose}>取消</Button>
          <Button variant="contained" startIcon={<Save />} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            保存配置
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

// =================== 日志弹窗 ===================
function LogDialog({ stackId, onClose }: { stackId: string | null; onClose: () => void }) {
  const open = !!stackId;
  const logQ = useQuery({
    queryKey: ['stack-log', stackId],
    queryFn: () => stacksApi.logs(stackId as string),
    enabled: open,
    retry: false,
  });
  const stackName = (logQ.data?.data?.data as LogInfo | undefined)?.stack_name;
  const log: string = (logQ.data?.data?.data as LogInfo | undefined)?.log || '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            m: 0,
            position: 'fixed', right: 0, top: 0, bottom: 0, height: '100%',
            width: 900, maxWidth: '90vw', borderRadius: 0,
          },
        },
      }}
      hideBackdrop
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>日志 · {stackName || ''}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2, bgcolor: '#0f172a' }}>
        <Box sx={{
          bgcolor: '#020617', borderRadius: 1, p: 2,
          fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0',
          minHeight: '80vh', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
            <Typography variant="caption" sx={{ ml: 1.5, color: '#94a3b8' }}>{stackName}</Typography>
          </Box>
          {log}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
