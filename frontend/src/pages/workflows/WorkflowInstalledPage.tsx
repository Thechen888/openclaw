import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import { Search, Refresh, AccountTree, PlayArrow, Delete, SystemUpdateAlt, History, OpenInNew } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';
import WorkflowRunResultDrawer from './WorkflowRunResultDrawer';

const verNum = (v: string) => {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.?(\d+)?/);
  if (!m) return 0;
  return (parseInt(m[1]) * 1000000) + (parseInt(m[2]) * 1000) + (parseInt(m[3] || '0'));
};
const hasUpdate = (item: any) => !!item.version && !!item.installed_version && verNum(item.version) > verNum(item.installed_version);

export default function WorkflowInstalledPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [runItem, setRunItem] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [confirmUninstall, setConfirmUninstall] = useState<any>(null);
  const [runningItemId, setRunningItemId] = useState<string | null>(null);
  const [runningItemName, setRunningItemName] = useState<string>('');
  const [runResult, setRunResult] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflows-installed', { search }],
    queryFn: () => api.get('/workflows/installed', { params: { page_size: 50, search } }),
  });
  const items: any[] = data?.data?.data || [];

  // 获取工作流配置（含入参声明）
  const { data: wfConfigData } = useQuery({
    queryKey: ['workflow-config', runItem?.id],
    queryFn: () => api.get(`/agents/${runItem.id}/workflow`),
    enabled: !!runItem,
  });
  const wfConfig = wfConfigData?.data?.data;
  const inputParams: any[] = wfConfig?.input_params || [];

  const runMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: Record<string, any> }) =>
      api.post(`/agents/${id}/executions`, { input: params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows-installed'] });
      setRunItem(null);
      setFormValues({});
      enqueueSnackbar('工作流已启动运行', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('运行失败', { variant: 'error' }),
  });

  // 运行工作流（含延时，模拟执行过程）
  const runWorkflowMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await api.post(`/workflows/${id}/run`);
      return res.data?.data;
    },
    onSuccess: (data, id) => {
      setRunResult(data);
      setDrawerOpen(true);
      enqueueSnackbar('工作流运行完成', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('运行失败', { variant: 'error' }),
    onSettled: () => setRunningItemId(null),
  });

  const handleRunClick = (item: any) => {
    setRunningItemId(item.id);
    setRunningItemName(item.name);
    runWorkflowMutation.mutate(item.id);
  };

  const upgradeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/workflows/${id}/upgrade`),
    onSuccess: (_res, id) => {
      const item = items.find(i => i.id === id);
      qc.invalidateQueries({ queryKey: ['workflows-installed'] });
      enqueueSnackbar(`已升级到 v${item?.version || '最新'}（mock）`, { variant: 'success' });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => api.post(`/workflows/${id}/uninstall`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows-installed'] });
      setConfirmUninstall(null);
      enqueueSnackbar('已卸载', { variant: 'success' });
    },
  });

  const handleRun = () => {
    if (!runItem) return;
    runMutation.mutate({ id: runItem.id, params: formValues });
  };

  const handleOpenRun = (item: any) => {
    setRunItem(item);
    setFormValues({});
  };

  const handleCloseRun = () => {
    setRunItem(null);
    setFormValues({});
  };

  return (
    <Box>
      <PageHeader
        title="我安装的工作流"
        subtitle="已安装到本地的工作流列表"
        actions={<Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="搜索工作流..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }} />
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Card><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /></CardContent></Card></Grid>)}</Grid>
      ) : items.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><AccountTree sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" color="text.secondary">暂无安装的工作流</Typography></CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,212,255,0.06)', '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)' }, cursor: 'pointer' }}
                onClick={() => navigate(`/workflows/installed/${item.id}`)}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 18, fontWeight: 700 }}>
                      {(item.name || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.owner_name}</Typography>
                    </Box>
                    {runningItemId === item.id ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled
                        startIcon={<CircularProgress size={12} color="inherit" />}
                        sx={{ fontSize: 12, textTransform: 'none', minWidth: 72, height: 28,
                          bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                      >
                        运行中…
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<PlayArrow fontSize="small" />}
                        onClick={(e) => { e.stopPropagation(); handleRunClick(item); }}
                        sx={{ fontSize: 12, textTransform: 'none', minWidth: 72, height: 28,
                          bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                      >
                        运行
                      </Button>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description || '暂无描述'}
                  </Typography>
                  {/* 版本 chip + 内测标 + NEW 角标 */}
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={`v${item.installed_version || '?'}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                    {item.is_beta && (
                      <Tooltip title="内测版">
                        <Chip label="内测" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'warning.main', color: '#fff', fontWeight: 700 }} />
                      </Tooltip>
                    )}
                    {hasUpdate(item) && (
                      <Tooltip title={`有新版本 v${item.version}`}>
                        <Chip label="NEW" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'info.main', color: '#fff', fontWeight: 700 }} />
                      </Tooltip>
                    )}
                  </Box>
                  {/* 升级 + 卸载按钮 */}
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'primary.main', cursor: 'pointer', fontSize: 11, '&:hover': { textDecoration: 'underline' } }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/agents/runs?agent_id=${item.id}`); }}
                    >
                      运行记录
                    </Typography>
                    {hasUpdate(item) && (
                      <Tooltip title={`升级到 v${item.version}`}>
                        <IconButton size="small" color="info" onClick={(e) => { e.stopPropagation(); upgradeMutation.mutate(item.id); }}>
                          <SystemUpdateAlt fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
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

      {/* 运行弹窗 */}
      <Dialog open={!!runItem} onClose={handleCloseRun} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrow sx={{ color: 'success.main' }} />
          运行工作流 — {runItem?.name}
        </DialogTitle>
        <DialogContent>
          {inputParams.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                请填写运行参数
              </Typography>
              {inputParams.map((param: any) => (
                <TextField
                  key={param.key}
                  label={param.label}
                  type={param.type === 'number' ? 'number' : 'text'}
                  required={param.required}
                  size="small"
                  fullWidth
                  value={formValues[param.key] ?? ''}
                  onChange={(e) => setFormValues({ ...formValues, [param.key]: e.target.value })}
                  placeholder={`请输入${param.label}`}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary">
                该工作流无需参数，确认运行？
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRun}>取消</Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleRun}
            disabled={runMutation.isPending}
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
          >
            启动运行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 运行结果抽屉 */}
      <WorkflowRunResultDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workflowName={runningItemName}
        result={runResult}
      />

      {/* 卸载确认弹窗 */}
      <Dialog open={!!confirmUninstall} onClose={() => setConfirmUninstall(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认卸载</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确认卸载「{confirmUninstall?.name}」？卸载后可在市场重新安装。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUninstall(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => confirmUninstall && uninstallMutation.mutate(confirmUninstall.id)} disabled={uninstallMutation.isPending}>确认卸载</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
