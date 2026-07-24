import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography, Chip, Button,
  TextField, InputAdornment, IconButton, Tooltip, Skeleton, Tabs, Tab, Avatar,
} from '@mui/material';
import { Search, Download, Refresh, Person, Groups, Public, Science } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './shared';
import api from '../api/client';

const SCOPE_TABS = [
  { label: '全部', value: 'all' },
  { label: '他人分享', value: 'department' },
  { label: '全公司', value: 'company' },
  { label: '内测', value: 'beta' },
];

const SCOPE_ICON: Record<string, React.ReactNode> = {
  private: <Person fontSize="small" />,
  department: <Groups fontSize="small" />,
  company: <Public fontSize="small" />,
  beta: <Science fontSize="small" />,
};

const RESOURCE_LABEL: Record<string, string> = {
  skill: '技能',
  agent: '智能体',
  workflow: '工作流',
  report: '报告',
};

export interface ResourceMarketPageProps {
  resourceType: 'skill' | 'agent' | 'workflow' | 'report';
  title: string;
  subtitle: string;
  /** 按 agent 子类型过滤：'chat' | 'workflow' */
  category?: 'chat' | 'workflow';
  /** 卡片数据查询 API 路径（不含 basePath），如 '/market' => GET /skills/market */
  listEndpoint?: string;
  /** 安装 API mutation fn */
  installMutationFn?: (id: string) => Promise<any>;
  /** 安装成功后的提示文案 */
  installSuccessMsg?: string;
  /** 卡片点击后的导航路径模板，如 '/skills/:id/detail' */
  detailPathTemplate?: string;
  /** 自定义卡片内容渲染器（可选，用于在卡片中显示额外信息） */
  renderCardExtra?: (item: any) => React.ReactNode;
  /** 空状态图标 */
  emptyIcon?: React.ReactNode;
  /** 空状态文案 */
  emptyTitle?: string;
  emptyDesc?: string;
}

export default function ResourceMarketPage({
  resourceType,
  title,
  subtitle,
  category,
  listEndpoint,
  installMutationFn,
  installSuccessMsg,
  detailPathTemplate,
  renderCardExtra,
  emptyIcon,
  emptyTitle,
  emptyDesc,
}: ResourceMarketPageProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [scopeTab, setScopeTab] = useState('all');

  const label = RESOURCE_LABEL[resourceType] || resourceType;
  const basePath = `/${resourceType}s`; // skills / agents / workflows / reports
  const marketPath = listEndpoint || '/market';

  // 正式市场数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: [`${resourceType}-market`, { search, scope: scopeTab, category }],
    queryFn: () => api.get(`${basePath}${marketPath}`, { params: { page_size: 50, search, status: 'published', category } }),
    enabled: scopeTab !== 'beta',
  });

  // 内测分享数据
  const { data: betaData, isLoading: betaLoading } = useQuery({
    queryKey: [`${resourceType}-shared-to-me`, { search }],
    queryFn: () => api.get(`${basePath}/shared-to-me`, { params: { page_size: 50, search } }),
    enabled: scopeTab === 'beta',
  });

  const allItems = data?.data?.data || [];
  const betaItems = betaData?.data?.data || [];
  const items = scopeTab === 'all' ? allItems : scopeTab === 'beta' ? betaItems : allItems.filter((s: any) => s.scope === scopeTab);

  const installMutation = useMutation({
    mutationFn: installMutationFn || ((id: string) => api.post(`${basePath}/${id}/install`)),
    onSuccess: () => {
      enqueueSnackbar(installSuccessMsg || `已安装到${label}库`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: [`${resourceType}-installed`] });
    },
  });

  const getDetailPath = (item: any) => {
    if (!detailPathTemplate) return '#';
    return detailPathTemplate.replace(':id', item.id);
  };

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
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
          size="small" placeholder={`搜索${label}名称或描述...`}
          value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        />
      </Box>

      {/* Grid */}
      {isLoading || betaLoading ? (
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
            {emptyIcon || <Typography sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }}>📦</Typography>}
            <Typography variant="h6" color="text.secondary">{emptyTitle || `暂无上架的${label}`}</Typography>
            <Typography variant="body2" color="text.secondary">{emptyDesc || '当前分类下没有已上架的内容'}</Typography>
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
                onClick={() => navigate(getDetailPath(item))}
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
                      label={item.scope === 'company' ? '全公司' : item.scope === 'department' ? '他人分享' : '私有'}
                      size="small" sx={{ fontSize: 10, height: 22 }}
                    />
                    {scopeTab === 'beta' && (
                      <Chip label="内测" size="small" sx={{ fontSize: 10, height: 22, bgcolor: 'warning.main', color: '#fff', fontWeight: 700, ml: 0.5 }} />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{
                    mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    minHeight: 40, fontSize: 12, lineHeight: 1.6,
                  }}>
                    {item.description || '暂无描述'}
                  </Typography>

                  {renderCardExtra?.(item)}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {item.version && (
                      <Chip label={`v${item.version}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                    )}
                    {item.install_count !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          {item.install_count?.toLocaleString() ?? 0} 次安装
                        </Typography>
                      </Box>
                    )}
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
