import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, TextField,
  InputAdornment, Button, IconButton, Tooltip,
} from '@mui/material';
import { Search, CloudDownload, Download } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, LoadingState, EmptyState } from '../../components/shared';
import api from '../../api/client';

interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  source: 'official' | 'community';
  vendor: string;
  version: string;
  downloads: number;
  tags: string[];
}

export default function IntegrationTemplatesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['integration-templates'],
    queryFn: () => api.get('/connectors/integration-templates'),
  });
  const all: IntegrationTemplate[] = data?.data?.data || [];
  const list = search
    ? all.filter(t => JSON.stringify(t).toLowerCase().includes(search.toLowerCase()))
    : all;

  const syncMutation = useMutation({
    mutationFn: () => api.post('/connectors/integration-templates/sync'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-templates'] });
      alert('云端模板已同步');
    },
  });

  const installMutation = useMutation({
    mutationFn: (id: string) => api.post(`/connectors/integration-templates/${id}/install`),
    onSuccess: () => alert('模板已安装为Starlark适配器'),
  });

  return (
    <Box>
      <PageHeader
        title="对接模板"
        subtitle="从云端模板库拉取预配置的对接脚本"
        actions={
          <Tooltip title="从云端拉取">
            <IconButton
              color="primary"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <CloudDownload />
            </IconButton>
          </Tooltip>
        }
      />

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 320 }}
        />
      </Box>

      {isLoading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState
          title="暂无对接模板"
          description="点击右上角从云端拉取最新模板"
        />
      ) : (
        <Grid container spacing={2}>
          {list.map((item) => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Typography>
                    <Chip
                      label={item.source === 'official' ? '官方' : '社区'}
                      size="small"
                      color={item.source === 'official' ? 'primary' : 'default'}
                      sx={{ fontSize: 11, height: 20, fontWeight: 600 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minHeight: 40 }}>
                    {item.description}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {item.tags.map((t) => (
                      <Chip
                        key={t}
                        label={t}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11, height: 20 }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.vendor}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Download sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {item.downloads}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<Download fontSize="small" />}
                    onClick={() => installMutation.mutate(item.id)}
                    disabled={installMutation.isPending}
                    sx={{ mt: 0.5 }}
                  >
                    使用此模板
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
