import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Typography, Button, Chip, IconButton, Tooltip, Divider, Table, TableHead,
  TableBody, TableRow, TableCell, Skeleton,
} from '@mui/material';
import {
  ArrowBack, Settings, ViewModule, TableChart, Visibility, Refresh, PictureAsPdf,
} from '@mui/icons-material';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

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

      {/* 报告内容区块 */}
      {blocks.map((block: any) => {
        switch (block.type) {
          case 'metrics_card':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{block.title}</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(block.data || []).map((m: any, i: number) => (
                    <Box key={i} sx={{ minWidth: 120 }}>
                      <Typography variant="caption" color="text.secondary">{m.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{m.unit}</Typography>
                      </Box>
                      {m.change !== undefined && (
                        <Typography variant="caption" sx={{
                          color: m.change >= 0 ? 'success.main' : 'error.main',
                          fontSize: 11,
                        }}>
                          {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}%
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Card>
            );
          case 'chart_image':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Box sx={{
                  height: 180, borderRadius: 1,
                  bgcolor: 'rgba(0,212,255,0.04)',
                  border: '1px dashed rgba(0,212,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography variant="body2" color="text.disabled">
                    {block.data?.alt || block.title || '图表区域'}
                  </Typography>
                </Box>
                {block.data?.caption && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {block.data.caption}
                  </Typography>
                )}
              </Card>
            );
          case 'data_table':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {(block.data?.headers || []).map((h: string, i: number) => (
                          <TableCell key={i} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(block.data?.rows || []).map((row: any[], ri: number) => (
                        <TableRow key={ri} hover>
                          {row.map((cell: any, ci: number) => (
                            <TableCell key={ci} sx={{ fontSize: 12 }}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Card>
            );
          case 'rich_text':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {block.data?.content || ''}
                </Typography>
              </Card>
            );
          case 'bullet_list':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                {(block.data?.items || []).map((item: string, i: number) => (
                  <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5, pl: 1.5, position: 'relative', '&::before': { content: '"•"', position: 'absolute', left: 0, color: 'primary.main' } }}>
                    {item}
                  </Typography>
                ))}
              </Card>
            );
          default:
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{block.title}</Typography>
              </Card>
            );
        }
      })}

      {blocks.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">该报告暂无内容数据</Typography>
        </Card>
      )}
    </Box>
  );
}
