import { useState } from 'react';
import {
  Box, Button, TextField, MenuItem, Typography, Paper, Grid,
  LinearProgress, Divider, Alert, Chip, CircularProgress,
} from '@mui/material';
import {
  Search, FindInPage, AutoAwesome, Score,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { ragApi } from '../../api/client';
import { PageHeader } from '../../components/shared';

export default function RetrievalTestPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [kbId, setKbId] = useState('');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: kbData } = useQuery({
    queryKey: ['rag-kbs-retrieval'],
    queryFn: () => ragApi.knowledgeBases.list({ page: 1, page_size: 200 }),
  });
  const kbs: any[] = kbData?.data?.data || [];

  const handleRetrieve = async () => {
    if (!kbId) {
      enqueueSnackbar('请选择知识库', { variant: 'warning' });
      return;
    }
    if (!query.trim()) {
      enqueueSnackbar('请输入查询内容', { variant: 'warning' });
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const res = await ragApi.retrieve({ query, kb_id: kbId, top_k: topK });
      setResults(res.data.data.results || []);
      if ((res.data.data.results || []).length === 0) {
        enqueueSnackbar('未检索到相关内容', { variant: 'info' });
      }
    } catch {
      enqueueSnackbar('检索失败', { variant: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 0.85) return 'success';
    if (score >= 0.7) return 'info';
    if (score >= 0.5) return 'warning';
    return 'default';
  };

  return (
    <Box>
      <PageHeader title="检索测试" subtitle="输入查询语句，测试知识库的向量检索效果" />

      <Grid container spacing={2}>
        {/* 左侧：检索配置 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <FindInPage fontSize="small" /> 检索配置
            </Typography>
            <TextField
              fullWidth select label="知识库" value={kbId}
              onChange={e => setKbId(e.target.value)}
              sx={{ mb: 2 }} size="small">
              <MenuItem value="" disabled>请选择知识库</MenuItem>
              {kbs.map((kb: any) => (
                <MenuItem key={kb.id} value={kb.id}>
                  {kb.name} ({kb.doc_count}文档)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth label="查询内容" value={query}
              onChange={e => setQuery(e.target.value)}
              multiline rows={4}
              placeholder="输入要检索的问题或关键词..."
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth select label="返回数量 (Top-K)" value={topK}
              onChange={e => setTopK(Number(e.target.value))}
              sx={{ mb: 2 }} size="small">
              {[3, 5, 10, 20].map(k => (
                <MenuItem key={k} value={k}>{k} 条</MenuItem>
              ))}
            </TextField>
            <Button
              fullWidth variant="contained" startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <Search />}
              onClick={handleRetrieve} disabled={searching}
            >
              {searching ? '检索中...' : '开始检索'}
            </Button>
          </Paper>
        </Grid>

        {/* 右侧：检索结果 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2.5, minHeight: 400 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome fontSize="small" /> 检索结果
              </Typography>
              {results.length > 0 && (
                <Chip label={`共 ${results.length} 条结果`} size="small" color="primary" variant="outlined" />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            {searching ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <LinearProgress sx={{ maxWidth: 300, mx: 'auto' }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  正在向量化查询并检索匹配文档...
                </Typography>
              </Box>
            ) : results.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FindInPage sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  选择知识库并输入查询内容后点击「开始检索」
                </Typography>
              </Box>
            ) : (
              <Box>
                {results.map((result: any, i: number) => (
                  <Box key={result.id || i} sx={{
                    p: 2, mb: 1.5, bgcolor: 'action.hover', borderRadius: 1,
                    borderLeft: '3px solid', borderColor: 'primary.main',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`#${i + 1}`} size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {result.doc_name || '未知文档'}
                        </Typography>
                        {result.chunk_index !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            · 分块 {result.chunk_index + 1}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        icon={<Score sx={{ fontSize: 14 }} />}
                        label={result.score?.toFixed(4) || '-'}
                        size="small" variant="outlined"
                        color={scoreColor(result.score) as any}
                        sx={{ height: 22, fontSize: 11 }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(result.score || 0) * 100}
                      sx={{ mb: 1, height: 4, borderRadius: 2 }}
                      color={scoreColor(result.score) as any}
                    />
                    <Typography variant="body2" sx={{
                      fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      color: 'text.primary',
                    }}>
                      {result.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {result.token_count || 0} tokens
                    </Typography>
                  </Box>
                ))}
                <Alert severity="success" sx={{ mt: 2, fontSize: 12 }}>
                  检索完成。以上结果按相似度从高到低排列，相似度越高表示与查询越相关。
                </Alert>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
