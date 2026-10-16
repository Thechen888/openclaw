import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Button, Alert, Chip, IconButton, Tooltip,
  Dialog as MuiDialog, List, ListItem, ListItemText, ListItemButton,
} from '@mui/material';
import { Close, History } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { reportShareApi } from '../../../api/client';
import ReportBlockRenderer from './ReportBlockRenderer';

interface Props {
  reportId: string;
  shareId: string;
  onClose: () => void;
}

const scopeLabel = (s: string) => s === 'all' ? '全部结果' : s === 'once' ? '指定某一次' : '此时间之后';

export default function SharedReportView({ reportId, shareId, onClose }: Props) {
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading } = useQuery({
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

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{report?.title || '报告查看'}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="历史数据">
            <IconButton size="small" onClick={() => setShowHistory(true)}><History fontSize="small" /></IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
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
      <MuiDialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>历史运行期次</Typography>
          <Button size="small" onClick={() => setShowHistory(false)}>关闭</Button>
        </Box>
        <List dense>
          {visibleRuns.map((r: any) => (
            <ListItem key={r.id} disablePadding>
              <ListItemButton disabled>
                <ListItemText
                  primary={r.period_label}
                  secondary={`${new Date(r.finished_at).toLocaleDateString()} · ${r.status}`}
                  slotProps={{ primary: { sx: { fontSize: 13 } }, secondary: { sx: { fontSize: 11 } } }}
                />
                {share?.scope_type === 'once' && r.id === share.run_id && (
                  <Chip label="本次分享仅限此期" size="small" sx={{ fontSize: 9, height: 18 }} />
                )}
              </ListItemButton>
            </ListItem>
          ))}
          {visibleRuns.length === 0 && (
            <ListItem><ListItemText primary="无可见期次" secondary={share?.scope_type === 'once' ? '超出分享范围' : ''} /></ListItem>
          )}
        </List>
      </MuiDialog>
    </Dialog>
  );
}
