import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import { Search, Refresh, AutoStories, Visibility, Delete, SystemUpdateAlt } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';

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

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader
        title="我安装的报告"
        subtitle="已安装到本地的报告模板列表"
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
                      查看
                    </Button>
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
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
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
    </Box>
  );
}
