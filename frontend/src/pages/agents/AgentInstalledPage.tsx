import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Tabs, Tab, Avatar,
} from '@mui/material';
import { Search, Refresh, Download, SmartToy } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';

const TYPE_TABS = [
  { label: '全部', value: '' },
  { label: '对话', value: 'chat' },
  { label: '工作流', value: 'workflow' },
];

export default function AgentInstalledPage() {
  const [search, setSearch] = useState('');
  const [typeTab, setTypeTab] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agents-installed', { search }],
    queryFn: () => api.get('/agents/installed', { params: { page_size: 50, search } }),
  });
  const items: any[] = data?.data?.data || [];

  const filtered = items.filter(a => !typeTab || a.agent_type === typeTab);

  return (
    <Box>
      <PageHeader
        title="我安装的智能体"
        subtitle="已安装到本地的智能体列表"
        actions={<Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>}
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tabs value={typeTab} onChange={(_, v) => setTypeTab(v)}
          sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, textTransform: 'none', fontWeight: 600, fontSize: 13 }, '& .Mui-selected': { color: '#00D4FF' }, '& .MuiTabs-indicator': { bgcolor: '#00D4FF', height: 2 } }}>
          {TYPE_TABS.map(t => <Tab key={t.value} label={t.label} value={t.value} />)}
        </Tabs>
        <TextField size="small" placeholder="搜索智能体..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }} />
      </Box>

      {isLoading ? (
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Card><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /></CardContent></Card></Grid>)}</Grid>
      ) : filtered.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><SmartToy sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" color="text.secondary">暂无安装的智能体</Typography></CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,212,255,0.06)', '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)' }, cursor: 'pointer' }}
                onClick={() => window.location.href = `/agents/${item.id}`}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 18, fontWeight: 700 }}>
                      {(item.name || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 14 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.owner_name}</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description || '暂无描述'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label={item.agent_type === 'chat' ? '对话' : '工作流'} size="small" sx={{ fontSize: 10, height: 20 }} />
                    {item.is_beta && <Chip label="内测" size="small" sx={{ fontSize: 10, height: 20, bgcolor: 'warning.main', color: '#fff' }} />}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
