import { useState } from 'react';
import {
  Box, Tabs, Tab, IconButton, Tooltip, Button, Grid, TextField,
  InputAdornment,
} from '@mui/material';
import { Add, Refresh, Search } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, EmptyState, LoadingState } from '../../components/shared';
import { agentsApi } from '../../api/client';
import { AgentCard } from './components/agentShared';

const TYPE_TABS = [
  { label: '全部', value: '' },
  { label: '对话 Agent', value: 'chat' },
  { label: '工作流 Agent', value: 'workflow' },
];

export default function AgentMyPage() {
  const navigate = useNavigate();
  const [typeTab, setTypeTab] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents-my', 'card'],
    queryFn: () => agentsApi.list({ page_size: 200, owner: 'me' }),
  });
  const allItems: any[] = data?.data?.data || [];

  const items = allItems.filter((a) => {
    if (typeTab && a.agent_type !== typeTab) return false;
    if (search && !`${a.name} ${a.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const goEdit = (agent: any) => {
    navigate(agent.agent_type === 'chat' ? `/agents/${agent.id}/edit/chat` : `/agents/${agent.id}/edit/workflow`);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="我创建的智能体"
          subtitle="管理你创建的智能体，支持对话与工作流两种类型"
          actions={
            <>
              <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
              <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/agents/create')}>
                新建智能体
              </Button>
            </>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
        <Tabs value={typeTab} onChange={(_, v) => setTypeTab(v)}
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, fontSize: 13, fontWeight: 500, textTransform: 'none' }, '& .Mui-selected': { color: '#00D4FF' }, '& .MuiTabs-indicator': { bgcolor: '#00D4FF' } }}>
          {TYPE_TABS.map(t => <Tab key={t.value} label={t.label} value={t.value} />)}
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
              <AgentCard agent={agent} onEdit={() => goEdit(agent)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
