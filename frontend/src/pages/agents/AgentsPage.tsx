import { useState } from 'react';
import {
  Box, Tabs, Tab, IconButton, Tooltip, Button, Grid, TextField, MenuItem,
  InputAdornment,
} from '@mui/material';
import { Add, Refresh, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, EmptyState, LoadingState } from '../../components/shared';
import { agentsApi } from '../../api/client';
import { AgentCard } from './components/agentShared';
import ResourceAclDialog from '../../components/ResourceAclDialog';

const TYPE_TABS = [
  { label: '全部', value: '' },
  { label: '对话 Agent', value: 'chat' },
  { label: '工作流 Agent', value: 'workflow' },
];

const OWNER_OPTIONS = [
  { label: '全部归属', value: '' },
  { label: '个人', value: 'personal' },
  { label: '组织', value: 'organization' },
];

export default function AgentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [typeTab, setTypeTab] = useState('');
  const [owner, setOwner] = useState('');
  const [search, setSearch] = useState('');
  const [permAgent, setPermAgent] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents', 'card'],
    queryFn: () => agentsApi.list({ page_size: 200 }),
  });
  const allItems: any[] = data?.data?.data || [];

  const items = allItems.filter((a) => {
    if (typeTab && a.agent_type !== typeTab) return false;
    if (owner && a.owner_type !== owner) return false;
    if (search && !`${a.name} ${a.description || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });

  const goEdit = (agent: any) => {
    navigate(agent.agent_type === 'chat' ? `/agents/${agent.id}/edit/chat` : `/agents/${agent.id}/edit/workflow`);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="智能体"
          subtitle="创建对话与工作流两类 AI 智能体，支持编排、调试与协作授权"
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
        <Tabs
          value={typeTab}
          onChange={(_, v) => setTypeTab(v)}
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40, fontSize: 13, fontWeight: 500,
              '&.Mui-selected': { color: '#00D4FF', textShadow: '0 0 8px rgba(0,212,255,0.3)' },
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(90deg, #00D4FF, #7C3AED)',
              height: 2, borderRadius: 2, boxShadow: '0 0 8px rgba(0,212,255,0.4)',
            },
          }}
        >
          {TYPE_TABS.map((t) => <Tab key={t.value} label={t.label} value={t.value} />)}
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            size="small" select value={owner} onChange={(e) => setOwner(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            {OWNER_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField
            size="small" placeholder="搜索智能体" value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
          />
        </Box>
      </Box>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title="暂无智能体"
          description="创建对话或工作流智能体，开始自动化你的任务"
          action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/agents/create')}>新建智能体</Button>}
        />
      ) : (
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {items.map((agent) => (
            <Grid key={agent.id} size={{ xs: 12, sm: 6, md: 4, xl: 3 }}>
              <AgentCard
                agent={agent}
                onClick={() => navigate(`/agents/${agent.id}`)}
                onEdit={() => goEdit(agent)}
                onPermission={() => setPermAgent(agent)}
                onDelete={() => { if (confirm(`确认删除智能体「${agent.name}」？`)) deleteMutation.mutate(agent.id); }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ResourceAclDialog open={!!permAgent} onClose={() => setPermAgent(null)} resourceType="agent" resourceId={permAgent?.id || ''} resourceName={permAgent?.name} />
    </Box>
  );
}
