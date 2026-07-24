import { useState } from 'react';
import {
  Box, IconButton, Tooltip, Button, Grid, TextField,
  InputAdornment, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Typography,
} from '@mui/material';
import { Add, Refresh, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader, EmptyState, LoadingState, StatusBadge } from '../../components/shared';
import ResourceActionsMenu from '../../components/ResourceActionsMenu';
import ResourceShareDialog from '../../components/ResourceShareDialog';
import { agentsApi } from '../../api/client';
import api from '../../api/client';
import { AgentCard } from './components/agentShared';

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '已上架', value: 'published' },
  { label: '审核中', value: 'pending' },
  { label: '已修改', value: 'modified' },
  { label: '草稿', value: 'draft' },
];

export default function AgentMyPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [statusTab, setStatusTab] = useState('');
  const [search, setSearch] = useState('');

  // 分享弹窗
  const [shareItem, setShareItem] = useState<any>(null);

  // 确认弹窗
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [delistConfirm, setDelistConfirm] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents-my', 'card'],
    queryFn: () => agentsApi.list({ page_size: 200, owner: 'me' }),
  });
  const allItems: any[] = data?.data?.data || [];

  const items = allItems.filter((a) => {
    if (a.agent_type !== 'chat') return false;
    if (statusTab && a.status !== statusTab) return false;
    if (search && !`${a.name} ${a.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents-my'] }); setDeleteConfirm(null); enqueueSnackbar('已删除', { variant: 'success' }); },
  });

  // 下架
  const delistMutation = useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/delist`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents-my'] }); setDelistConfirm(null); enqueueSnackbar('下架申请已提交', { variant: 'success' }); },
  });

  // 撤回
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/agents/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents-my'] }); enqueueSnackbar('已撤回发布申请', { variant: 'info' }); },
  });

  const handleAction = (action: string, item: any) => {
    switch (action) {
      case 'edit': navigate(`/agents/${item.id}/edit/chat`); break;
      case 'publish': navigate(`/agents/publish/${item.id}`); break;
      case 'publish_new': navigate(`/agents/publish/${item.id}?new_version=true`); break;
      case 'delist': setDelistConfirm(item); break;
      case 'cancel': cancelMutation.mutate(item.id); break;
      case 'share': setShareItem(item); break;
      case 'delete': setDeleteConfirm(item); break;
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="我创建的智能体"
          subtitle="管理你创建的对话智能体"
          actions={
            <>
              <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
              <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/agents/create?type=chat')}>
                新建智能体
              </Button>
            </>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <Tabs value={statusTab} onChange={(_, v) => setStatusTab(v)}
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: 13, fontWeight: 500, textTransform: 'none' }, '& .Mui-selected': { color: '#00D4FF' }, '& .MuiTabs-indicator': { bgcolor: '#00D4FF' } }}>
          {STATUS_TABS.map(t => <Tab key={t.value} label={t.label} value={t.value} />)}
        </Tabs>
        <TextField size="small" placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }} />
      </Box>

      {isLoading ? <LoadingState /> : items.length === 0 ? (
        <EmptyState title="暂无智能体" description="点击右上角创建你的第一个智能体" />
      ) : (
        <Grid container spacing={2}>
          {items.map((agent: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.id}>
              <AgentCard
                agent={agent}
                onClick={() => navigate(`/agents/${agent.id}`)}
                onEdit={() => navigate(`/agents/${agent.id}/edit/chat`)}
                actionsMenu={
                  <ResourceActionsMenu
                    status={agent.status || 'draft'}
                    onAction={(action) => handleAction(action, agent)}
                  />
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* 分享弹窗 */}
      <ResourceShareDialog
        open={!!shareItem}
        resourceType="agent"
        resourceId={shareItem?.id || ''}
        resourceName={shareItem?.name || ''}
        onClose={() => setShareItem(null)}
      />

      {/* 下架确认 */}
      <Dialog open={!!delistConfirm} onClose={() => setDelistConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认下架</DialogTitle>
        <DialogContent>
          <Typography variant="body2">确定要申请下架智能体「{delistConfirm?.name}」吗？下架后已安装的用户将无法继续使用。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelistConfirm(null)}>取消</Button>
          <Button variant="contained" color="warning" onClick={() => delistConfirm && delistMutation.mutate(delistConfirm.id)} disabled={delistMutation.isPending}>确认下架</Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">确定要删除智能体「{deleteConfirm?.name}」吗？此操作不可撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
