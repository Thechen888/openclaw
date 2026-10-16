import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Button, Alert, Chip, IconButton, Tooltip,
  Dialog as MuiDialog, List, ListItem, ListItemText, ListItemButton, Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Close, History, Refresh, PictureAsPdf, Fullscreen } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { reportShareApi } from '../../../api/client';
import ReportBlockRenderer from './ReportBlockRenderer';

interface Props {
  reportId: string;
  shareId: string;
  onClose: () => void;
}

const scopeLabel = (s: string) => s === 'all' ? '全部结果' : s === 'once' ? '指定某一次' : '此时间之后';
const scopeHint = (s: string) => s === 'all' ? '全部期次' : s === 'once' ? '仅可查看被分享的那一期' : '可查看此时间之后的期次';

export default function SharedReportView({ reportId, shareId, onClose }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shared-view', reportId, shareId],
    queryFn: () => reportShareApi.sharedView(reportId, shareId),
    enabled: !!reportId && !!shareId,
  });

  const { data: runsData } = useQuery({
    queryKey: ['shared-runs', reportId],
    queryFn: () => reportShareApi.runs(reportId),
    enabled: !!reportId,
  });

  const viewData = data?.data?.data;
  const report = viewData?.report;
  const share = viewData?.share;
  const runs: any[] = runsData?.data?.data || [];

  // 按 scope_type 过滤可见期次
  const visibleRuns = runs.filter((r: any) => {
    if (!share) return true;
    if (share.scope_type === 'all') return true;
    if (share.scope_type === 'once') return r.id === share.run_id;
    if (share.scope_type === 'since' && share.since_date) return new Date(r.finished_at) >= new Date(share.since_date);
    return true;
  });

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (el) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        el.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{report?.title || '报告查看'}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="刷新"><IconButton size="small" onClick={() => refetch()}><Refresh fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="历史数据"><IconButton size="small" onClick={() => setShowHistory(true)}><History fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="导出PDF"><IconButton size="small" onClick={() => window.print()}><PictureAsPdf fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="全屏"><IconButton size="small" onClick={handleFullscreen}><Fullscreen fontSize="small" /></IconButton></Tooltip>
            <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ flex: 1, overflow: 'auto' }}>
          {share && (
            <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
              由 {share.granted_by_name} 分享 · 范围：{scopeLabel(share.scope_type)} · 结果按分享人数据权限生成
              {share.source === 'admin' && <Chip label="管理员发布" size="small" sx={{ ml: 1, fontSize: 10, height: 20 }} />}
            </Alert>
          )}

          {isLoading ? (
            <Typography color="text.secondary">加载中...</Typography>
          ) : report ? (
            <ReportBlockRenderer blocks={report.blocks || []} />
          ) : (
            <Typography color="text.secondary">无权限查看或报告不存在</Typography>
          )}
        </DialogContent>

        {/* 历史数据弹窗 */}
        <MuiDialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            历史运行期次
            <Button size="small" onClick={() => setShowHistory(false)}>关闭</Button>
          </DialogTitle>
          <DialogContent dividers>
            {share && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: 12 }}>
                {scopeHint(share.scope_type)}
              </Typography>
            )}
            {visibleRuns.length === 0 ? (
              <Typography color="text.secondary">{share?.scope_type === 'once' ? '超出分享范围' : '暂无运行记录'}</Typography>
            ) : (
              <Table size="small">
                <TableHead><TableRow><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>期次</TableCell><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>完成时间</TableCell><TableCell sx={{ fontWeight: 600, fontSize: 12 }}>状态</TableCell><TableCell sx={{ fontWeight: 600, fontSize: 12 }}></TableCell></TableRow></TableHead>
                <TableBody>
                  {visibleRuns.map((r: any) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>{r.period_label}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{new Date(r.finished_at).toLocaleDateString()}</TableCell>
                      <TableCell><Chip label={r.status} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                      <TableCell>{share?.scope_type === 'once' && r.id === share.run_id && <Chip label="本次分享仅限此期" size="small" sx={{ fontSize: 9, height: 18 }} />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </MuiDialog>
      </Box>
    </Dialog>
  );
}
