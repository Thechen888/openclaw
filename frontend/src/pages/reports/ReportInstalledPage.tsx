import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button, TextField,
  InputAdornment, IconButton, Tooltip, Skeleton, Avatar,
} from '@mui/material';
import { Search, Refresh, AutoStories, Visibility } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';

export default function ReportInstalledPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports-installed', { search }],
    queryFn: () => api.get('/reports/installed', { params: { page_size: 50, search } }),
  });
  const items: any[] = data?.data?.data || [];

  return (
    <Box>
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
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Card><CardContent><Skeleton variant="text" width="60%" height={32} /><Skeleton variant="text" width="40%" /></CardContent></Card></Grid>)}</Grid>
      ) : items.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}><AutoStories sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} /><Typography variant="h6" color="text.secondary">暂无安装的报告</Typography></CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,212,255,0.06)', '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)' }, cursor: 'pointer' }}
                onClick={() => navigate(`/reports/${item.id}`)}>
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
                      onClick={(e) => { e.stopPropagation(); navigate(`/reports/${item.id}`); }}
                      sx={{ fontSize: 12, textTransform: 'none', minWidth: 60, height: 28 }}
                    >
                      查看
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
    </Box>
  );
}
