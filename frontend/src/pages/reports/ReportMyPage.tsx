import { useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Switch, FormControlLabel, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Tooltip, IconButton, Alert, Autocomplete, TextField,
} from '@mui/material';
import { Visibility, Close, IosShare } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api, { reportOverviewApi, reportTemplateApi } from '../../api/client';
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
  const [templateShareOpen, setTemplateShareOpen] = useState(false);

  // 获取当前用户创建的 configs
  const { data: myConfigsData } = useQuery({
    queryKey: ['my-report-configs'],
    queryFn: () => api.get('/report-configs', { params: { page_size: 50 } }).catch(() => ({ data: { data: [] } })),
  });

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

  // 模板接收
  const { data: incomingData } = useQuery({
    queryKey: ['template-incoming'],
    queryFn: () => reportTemplateApi.incoming(),
  });
  const incomingTemplates: any[] = incomingData?.data?.data || [];

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

  const acceptMutation = useMutation({
    mutationFn: (shareId: string) => reportTemplateApi.accept(shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-incoming'] });
      qc.invalidateQueries({ queryKey: ['my-report-configs'] });
      enqueueSnackbar('已接收模板并复制到你创建的报告', { variant: 'success' });
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '接收失败', { variant: 'error' }),
  });

  const overviewRuns: any[] = overviewData?.data?.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 3, py: 3 }}>
      <PageHeader
        title="我创建的报告"
        subtitle="管理你创建的报告模板与生成任务"
        actions={
          hasMyConfigs ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<IosShare fontSize="small" />} onClick={() => setTemplateShareOpen(true)}>
                分享模板
              </Button>
              <Button variant="outlined" size="small" startIcon={<Visibility fontSize="small" />} onClick={() => { setOverviewOpen(true); if (!selectedConfigId && myConfigs.length > 0) setSelectedConfigId(myConfigs[0].id); }}>
                结果总览
              </Button>
            </Box>
          ) : undefined
        }
      />

      {/* 模板接收横幅 */}
      {incomingTemplates.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {incomingTemplates.map(t => (
            <Alert key={t.id} severity="info" sx={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 1 }}
              action={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="contained" onClick={() => acceptMutation.mutate(t.id)} disabled={acceptMutation.isPending}>接收并复制</Button>
                </Box>
              }>
              {t.granted_by_name} 向你分享了报告模板《{t.config_name}》
            </Alert>
          ))}
        </Box>
      )}

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

      {/* 分享模板弹窗 */}
      <TemplateShareDialog open={templateShareOpen} onClose={() => setTemplateShareOpen(false)} myConfigs={myConfigs} />
    </Box>
  );
}

/* ========== 分享模板弹窗 ========== */
function TemplateShareDialog({ open, onClose, myConfigs }: { open: boolean; onClose: () => void; myConfigs: any[] }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [configId, setConfigId] = useState(myConfigs[0]?.id || '');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<any[]>([]);

  const { data: usersData } = useQuery({ queryKey: ['tpl-share-users'], queryFn: () => api.get('/users', { params: { page_size: 200 } }) });
  const { data: orgsData } = useQuery({ queryKey: ['tpl-share-orgs'], queryFn: () => api.get('/organizations', { params: { page_size: 200 } }) });
  const { data: rolesData } = useQuery({ queryKey: ['tpl-share-roles'], queryFn: () => api.get('/roles', { params: { page_size: 200 } }) });

  const allUsers: any[] = (usersData?.data?.data || []).filter((u: any) => u.id !== getCurrentUserId() && u.status !== 'disabled');
  const allOrgs: any[] = orgsData?.data?.data || [];
  const allRoles: any[] = rolesData?.data?.data || [];

  const shareMutation = useMutation({
    mutationFn: () => {
      const targets = [
        ...selectedUsers.map(u => ({ target_type: 'user', target_id: u.id, target_name: u.name })),
        ...selectedDepts.map(d => ({ target_type: 'dept', target_id: d.id, target_name: d.name })),
        ...selectedRoles.map(r => ({ target_type: 'role', target_id: r.id, target_name: r.name })),
      ];
      return reportTemplateApi.share(configId, targets);
    },
    onSuccess: () => {
      enqueueSnackbar('已分享模板', { variant: 'success' });
      setSelectedUsers([]); setSelectedDepts([]); setSelectedRoles([]);
      onClose();
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '分享失败', { variant: 'error' }),
  });

  const hasTargets = selectedUsers.length + selectedDepts.length + selectedRoles.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>分享报告模板</DialogTitle>
      <DialogContent dividers>
        {myConfigs.length > 1 && (
          <Select size="small" value={configId} onChange={e => setConfigId(e.target.value)} fullWidth sx={{ mb: 2, fontSize: 13 }} displayEmpty>
            <MenuItem value="" disabled>选择报告定义</MenuItem>
            {myConfigs.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        )}
        <Autocomplete multiple options={allUsers} value={selectedUsers} onChange={(_, v) => setSelectedUsers(v)}
          getOptionLabel={(o: any) => o.name || o.username} renderInput={p => <TextField {...p} size="small" label="分享给人员" placeholder="选择用户" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id} />
        <Autocomplete multiple options={allOrgs} value={selectedDepts} onChange={(_, v) => setSelectedDepts(v)}
          getOptionLabel={(o: any) => o.name} renderInput={p => <TextField {...p} size="small" label="分享给部门（含下级）" placeholder="选择部门" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id} />
        <Autocomplete multiple options={allRoles} value={selectedRoles} onChange={(_, v) => setSelectedRoles(v)}
          getOptionLabel={(o: any) => o.name} renderInput={p => <TextField {...p} size="small" label="分享给角色" placeholder="选择角色" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => shareMutation.mutate()} disabled={!hasTargets || shareMutation.isPending}>
          {shareMutation.isPending ? '分享中...' : '确认分享'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
