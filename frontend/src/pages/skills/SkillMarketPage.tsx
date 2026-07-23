import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography, Chip, Button,
  TextField, InputAdornment, IconButton, Tooltip, Skeleton, Tabs, Tab, Avatar,
} from '@mui/material';
import { Search, Download, Extension, Refresh, Person, Groups, Public } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import { skillsApi } from '../../api/client';

const SCOPE_TABS = [
  { label: '全部', value: 'all' },
  { label: '权限分享', value: 'department' },
  { label: '全公司', value: 'company' },
];

const SCOPE_ICON: Record<string, React.ReactNode> = {
  private: <Person fontSize="small" />,
  department: <Groups fontSize="small" />,
  company: <Public fontSize="small" />,
};

const STATUS_COLOR: Record<string, string> = {
  published: '#00ff88',
  delisted: '#ff3366',
};

export default function SkillMarketPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [scopeTab, setScopeTab] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills-market', { search, scope: scopeTab }],
    queryFn: () => skillsApi.list({ page_size: 50, search, status: 'published' }),
  });
  const allItems = data?.data?.data || [];
  const items = scopeTab === 'all' ? allItems : allItems.filter((s: any) => s.scope === scopeTab);

  const installMutation = useMutation({
    mutationFn: (skillId: string) => skillsApi.publish(skillId, { action: 'install' }),
    onSuccess: () => {
      enqueueSnackbar('已安装到技能库', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['skills-installed'] });
    },
  });

  return (
    <Box>
      <PageHeader
        title="技能市场"
        subtitle="浏览和安装企业内已上架的技能"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* Scope Tabs + Search */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tabs
          value={scopeTab} onChange={(_, v) => setScopeTab(v)}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { minHeight: 32, textTransform: 'none', fontWeight: 600, fontSize: 13 },
            '& .Mui-selected': { color: '#00D4FF' },
            '& .MuiTabs-indicator': { bgcolor: '#00D4FF', height: 2 },
          }}
        >
          {SCOPE_TABS.map(t => <Tab key={t.value} label={t.label} value={t.value} />)}
        </Tabs>
        <TextField
          size="small" placeholder="搜索技能名称或描述..."
          value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        />
      </Box>

      {/* Skill Grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /><Skeleton variant="text" width="100%" /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Extension sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">暂无上架的技能</Typography>
            <Typography variant="body2" color="text.secondary">当前分类下没有已上架的技能</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card
                sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  transition: 'box-shadow 0.25s, transform 0.25s',
                  '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)', transform: 'translateY(-2px)', borderColor: 'rgba(0,212,255,0.2)' },
                  border: '1px solid rgba(0,212,255,0.06)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/skills/${item.id}/detail`)}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{
                        width: 40, height: 40, borderRadius: 2,
                        bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF',
                        border: '1px solid rgba(0,212,255,0.2)',
                        fontSize: 18, fontWeight: 700,
                      }}>
                        {(item.name || '?').slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: 14 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          {item.owner_name} · {item.owner_dept}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={SCOPE_ICON[item.scope] as any}
                      label={item.scope === 'company' ? '全公司' : item.scope === 'department' ? '权限分享' : '私有'}
                      size="small" sx={{ fontSize: 10, height: 22 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{
                    mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    minHeight: 40, fontSize: 12, lineHeight: 1.6,
                  }}>
                    {item.description || '暂无描述'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label={`v${item.version || '0.0.0'}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Download sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        {item.install_count?.toLocaleString() ?? 0} 次安装
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button
                    size="small" variant="contained" startIcon={<Download />} fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      installMutation.mutate(item.id);
                    }}
                    disabled={installMutation.isPending}
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    安装
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
