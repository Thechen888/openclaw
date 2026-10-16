import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Switch, FormControlLabel, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Tooltip, IconButton,
} from '@mui/material';
import { Visibility, Close } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/client';
import { reportOverviewApi } from '../../api/client';
import { PageHeader } from '../../components/shared';
import WeeklyReportsPage from '../weekly/WeeklyReportsPage';

function getCurrentUserId(): string {
  return localStorage.getItem('mock-current-user-id') || 'u-1';
}

export default function ReportMyPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');

  // 获取当前用户创建的 configs
  const { data: myConfigsData } = useQuery({
    queryKey: ['my-report-configs'],
    queryFn: () => api.get('/report-configs', { params: { page_size: 50 } }).catch(() => ({ data: { data: [] } })),
  });

  // 也通过 /reports/my 获取（间接判断是否有创建的报告）
  const { data: myReportsData } = useQuery({
    queryKey: ['my-reports-count'],
    queryFn: () => api.get('/reports/my', { params: { page_size: 1 } }),
  });

  const myConfigs: any[] = myConfigsData?.data?.data || [];
  const hasMyConfigs = myConfigs.length > 0;

  // 结果总览数据
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['runs-overview', selectedConfigId],
    queryFn: () => reportOverviewApi.runs(selectedConfigId),
    enabled: !!selectedConfigId && overviewOpen,
  });

  // 当前选中 config 的 notify 状态
  const selectedConfig = myConfigs.find(c => c.id === selectedConfigId);
  const notifyEnabled = selectedConfig?.notify_creator ?? false;

  const notifyMutation = useMutation({
    mutationFn: ({ configId, notify }: { configId: string; notify: boolean }) => reportOverviewApi.setNotify(configId, notify),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['my-report-configs'] });
      enqueueSnackbar(vars.notify ? '已开启新结果通知' : '已关闭新结果通知', { variant: 'success' });
    },
  });

  const overviewRuns: any[] = overviewData?.data?.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 3, py: 3 }}>
      <PageHeader
        title="我创建的报告"
        subtitle="管理你创建的报告模板与生成任务"
        actions={
          hasMyConfigs ? (
            <Button variant="outlined" size="small" startIcon={<Visibility fontSize="small" />} onClick={() => { setOverviewOpen(true); if (!selectedConfigId && myConfigs.length > 0) setSelectedConfigId(myConfigs[0].id); }}>
              结果总览
            </Button>
          ) : undefined
        }
      />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <WeeklyReportsPage />
      </Box>

      {/* 结果总览弹窗 */}
      <Dialog open={overviewOpen} onClose={() => setOverviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          结果总览
          <IconButton size="small" onClick={() => setOverviewOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Select size="small" value={selectedConfigId} onChange={e => setSelectedConfigId(e.target.value)} sx={{ minWidth: 200, fontSize: 13 }} displayEmpty>
              <MenuItem value="" disabled>选择报告定义</MenuItem>
              {myConfigs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
            {selectedConfigId && (
              <FormControlLabel
                control={<Switch size="small" checked={notifyEnabled} onChange={e => notifyMutation.mutate({ configId: selectedConfigId, notify: e.target.checked })} />}
                label={<Typography sx={{ fontSize: 13 }}>新结果通知我</Typography>}
              />
            )}
          </Box>

          <Tooltip title="结果数据归运行者所有，需对方分享或管理员发布后可查看">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>运行者</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>期次</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>完成时间</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>被分享</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overviewLoading ? (
                  <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">加载中...</Typography></TableCell></TableRow>
                ) : overviewRuns.length === 0 ? (
                  <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">暂无运行期次</Typography></TableCell></TableRow>
                ) : overviewRuns.map(run => (
                  <TableRow key={run.run_id} hover>
                    <TableCell sx={{ fontSize: 12 }}>{run.runner_name}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{run.period_label}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{new Date(run.finished_at).toLocaleDateString()}</TableCell>
                    <TableCell><Chip label={run.status} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{run.share_count > 0 ? `${run.share_count} 人` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tooltip>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverviewOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
