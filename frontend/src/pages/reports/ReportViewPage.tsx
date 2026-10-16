import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  Box, Typography, Button, Chip, IconButton, Tooltip, Skeleton, ToggleButtonGroup, ToggleButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Table, TableHead,
  TableBody, TableRow, TableCell, Divider,
} from '@mui/material';
import {
  ArrowBack, Settings, ViewModule, TableChart, Visibility, Refresh, PictureAsPdf, PlayArrow, Share,
} from '@mui/icons-material';
import { PageHeader } from '../../components/shared';
import api, { reportRunApi, reportOverviewApi } from '../../api/client';
import ReportBlockRenderer from './components/ReportBlockRenderer';
import ShareResultDialog from './components/ShareResultDialog';

function getCurrentUserId(): string {
  return localStorage.getItem('mock-current-user-id') || 'u-1';
}

export default function ReportViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [viewMode, setViewMode] = useState<'board' | 'data'>('board');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-view', id],
    queryFn: () => api.get(`/reports/${id}`),
    enabled: !!id,
  });
  const report = data?.data?.data;

  const { data: meData } = useQuery({ queryKey: ['me-report-view'], queryFn: () => api.get('/auth/me') });
  const me = meData?.data?.data;

  const { data: installedData } = useQuery({ queryKey: ['installed-for-view'], queryFn: () => api.get('/reports/installed', { params: { page_size: 100 } }) });
  const installedItems: any[] = installedData?.data?.data || [];

  const isOwner = report && me && report.owner_id === me.id;
  const isInstalled = report && installedItems.some(i => (i.report_id || i.id) === report.id);
  const canRunOrShare = isOwner || isInstalled;

  const runMutation = useMutation({
    mutationFn: (reportId: string) => reportRunApi.run(reportId),
    onSuccess: () => {
      enqueueSnackbar('已生成新期次', { variant: 'success' });
      refetch();
      qc.invalidateQueries({ queryKey: ['report-view', id] });
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '生成失败', { variant: 'error' }),
  });

  const notifyMutation = useMutation({
    mutationFn: ({ configId, notify }: { configId: string; notify: boolean }) => reportOverviewApi.setNotify(configId, notify),
    onSuccess: (_res, vars) => {
      enqueueSnackbar(vars.notify ? '已开启通知' : '已关闭通知', { variant: 'success' });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
        <PageHeader title="报告查看" subtitle="加载中…" />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
        <PageHeader title="报告查看" subtitle="报告不存在或已被删除" actions={<Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>返回</Button>} />
      </Box>
    );
  }

  const blocks: any[] = report.blocks || [];
  const refreshTime = report.updated_at || report.created_at || '';
  const tableBlocks = blocks.filter(b => b.type === 'data_table');

  return (
    <Box ref={contentRef} sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <PageHeader
        title={report.title || report.name || '报告查看'}
        subtitle={`${report.department_name || ''} · ${report.period === 'weekly' ? '周报' : report.period === 'monthly' ? '月报' : '报告'}`}
        actions={
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tooltip title="返回"><IconButton size="small" onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton></Tooltip>
            {canRunOrShare && (
              <>
                <Tooltip title="立即生成"><IconButton size="small" color="primary" onClick={() => runMutation.mutate(id)} disabled={runMutation.isPending}><PlayArrow fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="分享结果"><IconButton size="small" color="primary" onClick={() => setShareOpen(true)}><Share fontSize="small" /></IconButton></Tooltip>
              </>
            )}
            <Tooltip title="设置"><IconButton size="small" onClick={() => setSettingsOpen(true)}><Settings fontSize="small" /></IconButton></Tooltip>
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ ml: 0.5 }}>
              <ToggleButton value="board" sx={{ py: 0.25, px: 1 }}><Tooltip title="看板视图"><ViewModule fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="data" sx={{ py: 0.25, px: 1 }}><Tooltip title="数据视图"><TableChart fontSize="small" /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="刷新数据"><IconButton size="small" onClick={() => refetch()}><Refresh fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="导出PDF"><IconButton size="small" onClick={() => window.print()}><PictureAsPdf fontSize="small" /></IconButton></Tooltip>
          </Box>
        }
      />

      {/* 报告元信息 */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Chip size="small" variant="outlined" label={report.department_name || '—'} sx={{ fontSize: 11, height: 22 }} />
        <Chip size="small" variant="outlined" label={report.period === 'weekly' ? '周报' : report.period === 'monthly' ? '月报' : report.period || '—'} sx={{ fontSize: 11, height: 22 }} />
        {refreshTime && (
          <Tooltip title={refreshTime}>
            <Typography variant="caption" color="text.secondary">数据刷新于 {new Date(refreshTime).toLocaleDateString()}</Typography>
          </Tooltip>
        )}
      </Box>

      {/* 报告内容 */}
      {viewMode === 'board' ? (
        <ReportBlockRenderer blocks={blocks} />
      ) : (
        <Box>
          {tableBlocks.length === 0 ? (
            <Typography color="text.secondary">该报告暂无表格数据</Typography>
          ) : (
            tableBlocks.map((b, i) => (
              <Box key={b.block_id || i} sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{b.title}</Typography>
                <Table size="small" sx={{ '& th': { fontWeight: 700, fontSize: 12 }, '& td': { fontSize: 12 } }}>
                  <TableHead><TableRow>{(b.data?.headers || []).map((h: string, j: number) => <TableCell key={j}>{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>{(b.data?.rows || []).map((row: string[], ri: number) => <TableRow key={ri}>{row.map((cell: string, ci: number) => <TableCell key={ci}>{cell}</TableCell>)}</TableRow>)}</TableBody>
                </Table>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))
          )}
        </Box>
      )}

      {/* 设置弹窗 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>报告设置</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}><strong>报告名：</strong>{report.title}</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}><strong>数据刷新时间：</strong>{refreshTime ? new Date(refreshTime).toLocaleString() : '—'}</Typography>
          {isOwner && report.config_id && (
            <FormControlLabel
              control={<Switch size="small" checked={report.notify_creator ?? false} onChange={e => notifyMutation.mutate({ configId: report.config_id, notify: e.target.checked })} />}
              label={<Typography sx={{ fontSize: 13 }}>新结果通知我</Typography>}
            />
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>关闭</Button></DialogActions>
      </Dialog>

      {/* 分享结果弹窗 */}
      {shareOpen && (
        <ShareResultDialog reportId={id} reportTitle={report.title || report.name || ''} onClose={() => setShareOpen(false)} />
      )}
    </Box>
  );
}
