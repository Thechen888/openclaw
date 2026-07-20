import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, IconButton, Button, Divider,
  Stepper, Step, StepLabel, StepContent, Avatar,
} from '@mui/material';
import {
  ArrowBack, Download, Refresh, CheckCircle, Pending, Description,
  QuestionAnswer, Settings, Timeline,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, LoadingState, EmptyState } from '../../components/shared';
import { ragApi } from '../../api/client';

const STEP_ICONS: Record<string, React.ReactNode> = {
  done: <CheckCircle sx={{ color: '#00E676', fontSize: 20 }} />,
  processing: <Pending sx={{ color: '#FFB800', fontSize: 20 }} />,
  pending: <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />,
};

export default function DocumentDetailPage() {
  const { kbId, docId } = useParams<{ kbId: string; docId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['doc-detail', docId],
    queryFn: () => ragApi.documents.detail(docId!),
    enabled: !!docId,
  });
  const doc = data?.data?.data;

  if (isLoading) return <LoadingState />;
  if (!doc) return <EmptyState title="文档不存在" />;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      {/* 面包屑 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton size="small" onClick={() => navigate(`/rag/knowledge-bases/${kbId}`)}><ArrowBack /></IconButton>
        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }} onClick={() => navigate('/rag/knowledge-bases')}>知识库</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }} onClick={() => navigate(`/rag/knowledge-bases/${kbId}`)}>详情</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>{doc.title}</Typography>
      </Box>

      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20 }}>{doc.title}</Typography>
          {doc.meta && (
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              {doc.meta.version && <Chip label={`版本 ${doc.meta.version}`} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />}
              {doc.meta.pages && <Chip label={`${doc.meta.pages} 页`} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />}
              {doc.meta.total_chunks && <Chip label={`${doc.meta.total_chunks} 分块`} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />}
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<Download />}>下载原文</Button>
          <Button variant="outlined" size="small" startIcon={<Refresh />}>重新解析</Button>
        </Box>
      </Box>

      {/* 左右布局 */}
      <Grid container spacing={2.5}>
        {/* 左侧 - 文档内容 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ mb: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#00D4FF' }}>文档内容</Typography>
              {doc.content_sections?.map((section: any, i: number) => (
                <Box key={i} sx={{ mb: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 15, mb: 1, color: '#E8ECF0' }}>{section.heading}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.8 }}>{section.body}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* 高亮分块 */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#00D4FF' }}>分块内容</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {doc.chunks_with_content?.map((chunk: any, i: number) => (
                  <Box key={chunk.id} sx={{
                    p: 2, borderRadius: 2, position: 'relative',
                    bgcolor: 'rgba(0,212,255,0.03)',
                    border: '1px solid rgba(0,212,255,0.08)',
                    borderLeft: '3px solid #00D4FF',
                    '&:hover': { borderColor: 'rgba(0,212,255,0.2)', bgcolor: 'rgba(0,212,255,0.05)' },
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip label={`Chunk ${chunk.chunk_index}`} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF' }} />
                      <Chip label={`相关度 ${(chunk.relevance * 100).toFixed(0)}%`} size="small" sx={{ height: 20, fontSize: 10, color: '#00E676', borderColor: '#00E67640' }} variant="outlined" />
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.8 }}>{chunk.content}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧 - 解析信息 */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* 解析时间线 */}
          <Card sx={{ mb: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Timeline sx={{ color: '#00D4FF', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#00D4FF' }}>解析时间线</Typography>
              </Box>
              <Box sx={{ position: 'relative', pl: 2 }}>
                {doc.timeline?.map((step: any, i: number) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < doc.timeline.length - 1 ? 2.5 : 0, position: 'relative' }}>
                    {/* 竖线 */}
                    {i < doc.timeline.length - 1 && (
                      <Box sx={{
                        position: 'absolute', left: 9, top: 24, bottom: -16, width: 2,
                        bgcolor: step.status === 'done' ? 'rgba(0,230,118,0.3)' : 'rgba(255,255,255,0.08)',
                      }} />
                    )}
                    <Box sx={{ zIndex: 1, flexShrink: 0 }}>{STEP_ICONS[step.status] || STEP_ICONS.pending}</Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, color: step.status === 'done' ? '#E8ECF0' : step.status === 'processing' ? '#FFB800' : 'text.secondary' }}>
                        {step.step}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{step.detail}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* 解析配置 */}
          <Card sx={{ mb: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Settings sx={{ color: '#00D4FF', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#00D4FF' }}>解析配置</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {doc.parse_config && Object.entries(doc.parse_config).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.03)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                      {key === 'engine' ? '解析引擎' : key === 'chunk_strategy' ? '分块策略' : key === 'embedding' ? 'Embedding' : key}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12, color: '#E8ECF0' }}>{value as string}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* 自动生成问题 */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <QuestionAnswer sx={{ color: '#00D4FF', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#00D4FF' }}>自动生成问题</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {doc.auto_questions?.map((q: any, i: number) => (
                  <Box key={i} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.06)' }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, mb: 0.5 }}>{q.question}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>引用: {q.chunk_ref}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
