import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Button, Chip, IconButton, Tooltip, Skeleton,
} from '@mui/material';
import {
  ArrowBack, Settings, ViewModule, TableChart, Visibility, Refresh, PictureAsPdf,
} from '@mui/icons-material';
import { PageHeader } from '../../components/shared';
import api from '../../api/client';
import ReportBlockRenderer from './components/ReportBlockRenderer';

export default function ReportViewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['report-view', id],
    queryFn: () => api.get(`/reports/${id}`),
    enabled: !!id,
  });
  const report = data?.data?.data;

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
        <PageHeader title="报告查看" subtitle="加载中…" />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
        <PageHeader
          title="报告查看"
          subtitle="报告不存在或已被删除"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}>返回</Button>}
        />
      </Box>
    );
  }

  const blocks: any[] = report.blocks || [];
  const refreshTime = report.updated_at || report.created_at || '';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <PageHeader
        title={report.title || report.name || '报告查看'}
        subtitle={`${report.department_name || ''} · ${report.period === 'weekly' ? '周报' : report.period === 'monthly' ? '月报' : '报告'}`}
        actions={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="返回"><IconButton size="small" onClick={() => navigate(-1)}><ArrowBack fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="设置"><IconButton size="small"><Settings fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="布局"><IconButton size="small"><ViewModule fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="数据"><IconButton size="small"><TableChart fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="预览"><IconButton size="small"><Visibility fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="刷新数据"><IconButton size="small" onClick={() => refetch()}><Refresh fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="导出PDF"><IconButton size="small"><PictureAsPdf fontSize="small" /></IconButton></Tooltip>
          </Box>
        }
      />

      {/* 报告元信息 */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Chip size="small" variant="outlined" label={report.department_name || '—'} sx={{ fontSize: 11, height: 22 }} />
        <Chip size="small" variant="outlined" label={report.period === 'weekly' ? '周报' : report.period === 'monthly' ? '月报' : report.period || '—'} sx={{ fontSize: 11, height: 22 }} />
        {refreshTime && (
          <Tooltip title={refreshTime}>
            <Typography variant="caption" color="text.secondary">
              数据刷新于 {new Date(refreshTime).toLocaleDateString()}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* 报告内容区块 — 使用共享渲染器 */}
      <ReportBlockRenderer blocks={blocks} />
    </Box>
  );
}
