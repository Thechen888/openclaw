import { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions, Typography, Chip, Button,
  TextField, InputAdornment, Rating, IconButton, Tooltip, Skeleton,
} from '@mui/material';
import { Search, Download, Star, Visibility, Extension, Refresh } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/shared';
import { marketplaceApi } from '../../api/client';

const CATEGORIES = ['All', 'Data', 'Communication', 'Automation', 'Analytics', 'Security', 'Integration'];

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['marketplace-skills', { search, category: category === 'All' ? undefined : category }],
    queryFn: () => marketplaceApi.list({ search, category: category === 'All' ? undefined : category, page_size: 50 }),
  });
  const items = data?.data?.data || [];

  return (
    <Box>
      <PageHeader
        title="技能市场"
        subtitle="浏览和安装社区与企业技能"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* Search and filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search skills..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 280 }}
        />
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <Chip
              key={c}
              label={c}
              size="small"
              onClick={() => setCategory(c)}
              color={category === c ? 'primary' : 'default'}
              variant={category === c ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Skill Grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Extension sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No skills found</Typography>
            <Typography variant="body2" color="text.secondary">Try adjusting your search or category filter</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
              <Card
                sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 1.5,
                        bgcolor: 'primary.main', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Extension sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.author || 'OpenClaw'}</Typography>
                      </Box>
                    </Box>
                    <Chip label={item.category || 'General'} size="small" sx={{ fontSize: 10, height: 20 }} />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{
                    mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    minHeight: 40,
                  }}>
                    {item.description || 'No description available'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Rating value={item.rating ?? 0} precision={0.5} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        ({item.rating_count ?? 0})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Download sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {item.install_count?.toLocaleString() ?? 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                  <Button size="small" variant="contained" startIcon={<Download />} fullWidth>
                    Install
                  </Button>
                  <Tooltip title="Details">
                    <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
