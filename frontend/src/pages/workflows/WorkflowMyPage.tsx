import { useState } from 'react';
import {
  Box, Grid, IconButton, Tooltip, Button, TextField,
  InputAdornment, Tabs, Tab,
} from '@mui/material';
import { Add, Refresh, Search } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, EmptyState, LoadingState } from '../../components/shared';
import { agentsApi } from '../../api/client';
import { AgentCard } from '../agents/components/agentShared';

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '运行中', value: 'active' },
  { label: '草稿', value: 'draft' },
];

export default function WorkflowMyPage() {
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['workflows-my', 'card'],
    queryFn: () => agentsApi.list({ page_size: 200, owner: 'me', category: 'workflow' }),
  });
  const allItems: any[] = data?.data?.data || [];

  const items = allItems.filter((a) => {
    if (a.agent_type !== 'workflow') return false;
    if (statusTab && a.status !== statusTab) return false;
    if (search && !`${a.name} ${a.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="我创建的工作流"
          subtitle="管理你创建的工作流编排"
          actions={
            <>
              <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
              <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/agents/create?type=workflow')}>
                新建工作流
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
        <EmptyState title="暂无工作流" description="点击右上角创建你的第一个工作流" />
      ) : (
        <Grid container spacing={2}>
          {items.map((agent: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.id}>
              <AgentCard agent={agent} onEdit={() => navigate(`/agents/${agent.id}/edit/workflow`)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
