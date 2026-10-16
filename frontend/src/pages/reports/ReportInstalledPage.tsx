import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, ListItemIcon, ListItemText,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Search, Refresh, AutoStories, Visibility, Delete, SystemUpdateAlt, Share, Info, History, ContentCopy } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import api, { reportRunApi, reportShareApi } from '../../api/client';
import ShareResultDialog from './components/ShareResultDialog';

const verNum = (v: string) => {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.?(\d+)?/);
  if (!m) return 0;
  return (parseInt(m[1]) * 1000000) + (parseInt(m[2]) * 1000) + (parseInt(m[3] || '0'));
};
const hasUpdate = (item: any) => !!item.version && !!item.installed_version && verNum(item.version) > verNum(item.installed_version);

export default function ReportInstalledPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [confirmUninstall, setConfirmUninstall] = useState<any>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuReport, setMenuReport] = useState<any>(null);
  const [shareReport, setShareReport] = useState<any>(null);
  const [historyReport, setHistoryReport] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports-installed', { search }],
    queryFn: () => api.get('/reports/installed', { params: { page_size: 50, search } }),
  });
  const items: any[] = data?.data?.data || [];

  const upgradeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reports/${id}/upgrade`),
    onSuccess: (_res, id) => {
      const item = items.find(i => i.id === id);
      qc.invalidateQueries({ queryKey: ['reports-installed'] });
      enqueueSnackbar(`已升级到 v${item?.version || '最新'}（mock）`, { variant: 'success' });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reports/${id}/uninstall`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports-installed'] });
      setConfirmUninstall(null);
      enqueueSnackbar('已卸载', { variant: 'success' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (reportId: string) => reportRunApi.clone(reportId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-report-configs'] });
      enqueueSnackbar('已复制到你创建的报告', { variant: 'success' });
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '复制失败', { variant: 'error' }),
  });

  const handleMenuOpen = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget as HTMLElement);
    setMenuReport(item);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuReport(null); };

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader
        title="我安装的报告"
        subtitle="查看和管理已安装的报告——安装者的报告可运行、可分享自己跑出的结果，不可编辑定义"
        actions={<Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="搜索报告..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }} />
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}><Card sx={{ minHeight: 190 }}><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /></CardContent></Card></Grid>)}</Grid>
      ) : items.length === 0 ? (
        <Card sx={{ minHeight: 190 }}><CardContent sx={{ textAlign: 'center', py: 6 }}><AutoStories sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" color="text.secondary">暂无安装的报告</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>前往报告市场安装报告模板</Typography></CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
              <Card sx={{ minHeight: 190, height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,212,255,0.06)', '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)' }, cursor: 'pointer' }}
                onClick={() => navigate(`/reports/installed/${item.id}`)}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 18, fontWeight: 700 }}>
                      {(item.name || item.title || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>{item.name || item.title}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.owner_name}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); navigate(`/reports/installed/${item.id}`); }}
                      sx={{ fontSize: 12, textTransform: 'none', minWidth: 60, height: 28 }}
                    >
                      详情
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description || '暂无描述'}
                  </Typography>
                  {/* 版本 chip + 内测标 */}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={`v${item.installed_version || '?'}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                    {item.is_beta && (
                      <Tooltip title="内测版">
                        <Chip label="内测" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'warning.main', color: '#fff', fontWeight: 700 }} />
                      </Tooltip>
                    )}
                    {hasUpdate(item) && (
                      <Chip label="有更新" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'info.main', color: '#fff', fontWeight: 700 }} />
                    )}
                  </Box>
                  {/* 操作按钮 */}
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="运行历史">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setHistoryReport(item); }}>
                        <History fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="复制到我创建的">
                      <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); cloneMutation.mutate(item.report_id || item.id); }}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="分享结果">
                      <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); setShareReport(item); }}>
                        <Share fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={hasUpdate(item) ? `升级到 v${item.version}` : '检查更新'}>
                      <IconButton size="small" color={hasUpdate(item) ? 'info' : 'default'} onClick={(e) => { e.stopPropagation(); if (hasUpdate(item)) upgradeMutation.mutate(item.id); else enqueueSnackbar('已是最新版本', { variant: 'info' }); }}>
                        <SystemUpdateAlt fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="卸载">
                      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setConfirmUninstall(item); }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 卸载确认弹窗 */}
      <Dialog open={!!confirmUninstall} onClose={() => setConfirmUninstall(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认卸载</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确认卸载「{confirmUninstall?.name || confirmUninstall?.title}」？卸载后可在市场重新安装。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUninstall(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => confirmUninstall && uninstallMutation.mutate(confirmUninstall.id)} disabled={uninstallMutation.isPending}>确认卸载</Button>
        </DialogActions>
      </Dialog>

      {/* 分享结果弹窗 */}
      {shareReport && (
        <ShareResultDialog reportId={shareReport.report_id || shareReport.id} reportTitle={shareReport.name || shareReport.title} onClose={() => setShareReport(null)} />
      )}

      {/* 运行历史弹窗 */}
      <RunHistoryDialog item={historyReport} onClose={() => setHistoryReport(null)} />
    </Box>
  );
}

function RunHistoryDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-runs', item?.report_id || item?.id],
    queryFn: () => reportShareApi.runs(item?.report_id || item?.id),
    enabled: !!item,
  });
  const runs: any[] = data?.data?.data || [];

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>运行历史 — {item?.name || item?.title || ''}</DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Typography color="text.secondary">加载中...</Typography>
        ) : runs.length === 0 ? (
          <Typography color="text.secondary">暂无运行记录</Typography>
        ) : (
          <Table size="small">
            <TableHead><TableRow><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>期次</TableCell><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>完成时间</TableCell><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>状态</TableCell></TableRow></TableHead>
            <TableBody>
              {runs.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontSize: 12 }}>{r.period_label}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{new Date(r.finished_at).toLocaleDateString()}</TableCell>
                  <TableCell><Chip label={r.status} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
    </Dialog>
  );
}
