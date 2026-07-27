import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Chip, Box,
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import {
  History, Undo, Edit, CheckCircle, Error, HourglassEmpty, Archive,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { EmptyState, LoadingState } from './shared';
import api from '../api/client';

const VERSION_STATUS_META: Record<string, {
  label: string;
  dotColor: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'grey';
  chipColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactNode;
}> = {
  draft: { label: '草稿', dotColor: 'grey', chipColor: 'default', icon: <Edit sx={{ fontSize: 14 }} /> },
  pending: { label: '审核中', dotColor: 'warning', chipColor: 'warning', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  reviewing: { label: '审核中', dotColor: 'warning', chipColor: 'warning', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  published: { label: '在架', dotColor: 'success', chipColor: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  rejected: { label: '已驳回', dotColor: 'error', chipColor: 'error', icon: <Error sx={{ fontSize: 14 }} /> },
  history: { label: '历史版本', dotColor: 'info', chipColor: 'info', icon: <Archive sx={{ fontSize: 14 }} /> },
  deprecated: { label: '已废弃', dotColor: 'error', chipColor: 'error', icon: <Error sx={{ fontSize: 14 }} /> },
};

export interface VersionHistoryDialogProps {
  open: boolean;
  resource: any;
  /** 资源类型：'skill' | 'agent' */
  resourceType: 'skill' | 'agent';
  onClose: () => void;
}

export default function VersionHistoryDialog({
  open, resource, resourceType, onClose,
}: VersionHistoryDialogProps) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [rollbackTarget, setRollbackTarget] = useState<any>(null);

  const basePath = resourceType === 'skill' ? '/skills' : '/agents';
  const queryKey = resourceType === 'skill' ? 'skill-versions' : 'agent-versions';

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, resource?.id],
    queryFn: () => api.get(`${basePath}/${resource.id}/versions`),
    enabled: open && !!resource?.id,
  });
  const versions: any[] = data?.data?.data || [];

  const rollbackMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: string }) =>
      api.post(`${basePath}/${resource.id}/versions/${versionId}/rollback`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      if (resourceType === 'skill') {
        qc.invalidateQueries({ queryKey: ['skills-my'] });
      } else {
        qc.invalidateQueries({ queryKey: ['agents-my'] });
        qc.invalidateQueries({ queryKey: ['workflows-my'] });
      }
      setRollbackTarget(null);
      enqueueSnackbar(`已基于 v${rollbackTarget?.version} 创建新版本 v${res.data.data.version}（草稿）`, { variant: 'success' });
    },
    onError: () => enqueueSnackbar('回滚失败', { variant: 'error' }),
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <History sx={{ color: 'info.main' }} />
          版本历史 — {resource?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {isLoading ? <LoadingState /> : versions.length === 0 ? (
            <EmptyState title="暂无版本记录" description="发布后将生成版本快照" />
          ) : (
            <Timeline sx={{ p: 0, '& .MuiTimelineItem-root:before': { display: 'none' } }}>
              {versions.map((v: any, idx: number) => {
                const meta = VERSION_STATUS_META[v.status] || VERSION_STATUS_META.draft;
                const isCurrent = v.status === 'published';
                const canRollback = v.status === 'history' || v.status === 'deprecated';
                return (
                  <TimelineItem key={v.id}>
                    <TimelineSeparator>
                      <TimelineDot color={meta.dotColor} variant={isCurrent ? 'filled' : 'outlined'} sx={{ my: 0.5 }}>
                        {meta.icon}
                      </TimelineDot>
                      {idx < versions.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ pb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          v{v.version}
                        </Typography>
                        <Chip
                          label={meta.label}
                          size="small"
                          color={meta.chipColor}
                          variant={isCurrent ? 'filled' : 'outlined'}
                          sx={{ height: 20, fontSize: 11 }}
                        />
                        {v.is_rollback && (
                          <Chip label="回滚" size="small" variant="outlined" sx={{ height: 20, fontSize: 11, color: 'warning.main', borderColor: 'warning.main' }} />
                        )}
                        {isCurrent && (
                          <Chip label="当前在架" size="small" sx={{ height: 20, fontSize: 11, bgcolor: 'success.main', color: '#fff' }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {v.published_at ? `发布于 ${v.published_at}` : '未发布'} · {v.publisher}
                      </Typography>
                      {v.changelog && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12 }}>
                          {v.changelog}
                        </Typography>
                      )}
                      {canRollback && (
                        <Button
                          size="small"
                          startIcon={<Undo />}
                          sx={{ mt: 0.5, fontSize: 12 }}
                          onClick={() => setRollbackTarget(v)}
                        >
                          基于此版本回滚
                        </Button>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 回滚确认 */}
      <Dialog open={!!rollbackTarget} onClose={() => setRollbackTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认回滚</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            将基于 <b>v{rollbackTarget?.version}</b> 的快照创建一个新的草稿版本。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            回滚不会删除任何历史版本，已安装用户不受影响。新版本需走正常发布审核流程。
          </Typography>
          <Typography variant="caption" color="warning.main">
            注意：已废弃版本可能存在严重问题，请谨慎回滚。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackTarget(null)}>取消</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Undo />}
            onClick={() => rollbackMutation.mutate({ versionId: rollbackTarget.id })}
            disabled={rollbackMutation.isPending}
          >
            确认回滚
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
