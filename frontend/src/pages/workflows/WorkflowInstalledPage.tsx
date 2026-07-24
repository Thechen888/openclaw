import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import { Search, Refresh, AccountTree, PlayArrow } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';

export default function WorkflowInstalledPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [runItem, setRunItem] = useState<any>(null);
  const [runParams, setRunParams] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflows-installed', { search }],
    queryFn: () => api.get('/workflows/installed', { params: { page_size: 50, search } }),
  });
  const items: any[] = data?.data?.data || [];

  const runMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: string }) =>
      api.post(`/agents/${id}/executions`, { input: params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows-installed'] });
      setRunItem(null);
      setRunParams('');
      enqueueSnackbar('工作流已启动运行', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('运行失败', { variant: 'error' }),
  });

  const handleRun = () => {
    if (!runItem) return;
    runMutation.mutate({ id: runItem.id, params: runParams });
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
                onClick={() => window.location.href = `/agents/${item.id}`}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 18, fontWeight: 700 }}>
                      {(item.name || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.owner_name}</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow fontSize="small" />}
                      onClick={(e) => { e.stopPropagation(); setRunItem(item); }}
                      sx={{ fontSize: 12, textTransform: 'none', minWidth: 72, height: 28,
                        bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                    >
                      运行
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description || '暂无描述'}
                  </Typography>
                  {item.is_beta && <Chip label="内测" size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'warning.main', color: '#fff' }} />}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 运行弹窗 */}
      <Dialog open={!!runItem} onClose={() => { setRunItem(null); setRunParams(''); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlayArrow sx={{ color: 'success.main' }} />
          运行工作流 — {runItem?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            输入运行参数（JSON 格式），留空则使用默认参数
          </Typography>
          <TextField
            fullWidth multiline rows={6} size="small"
            placeholder='{"input": "示例输入"}'
            value={runParams}
            onChange={(e) => setRunParams(e.target.value)}
            sx={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setRunItem(null); setRunParams(''); }}>取消</Button>
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
    </Box>
  );
}
