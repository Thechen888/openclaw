import { useState } from 'react';
import {
  Box, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
} from '@mui/material';
import {
  Add, Refresh, Delete, Edit, MenuBook, Description, Hub,
  ModelTraining,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, StatCard,
} from '../../components/shared';
import { ragApi } from '../../api/client';

const EMBEDDING_MODELS = [
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large (OpenAI)' },
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small (OpenAI)' },
  { value: 'bge-large-zh', label: 'bge-large-zh (智源)' },
  { value: 'm3e-base', label: 'm3e-base (Moka)' },
];

const CHUNK_STRATEGIES: Record<string, string> = {
  fixed: '固定大小',
  paragraph: '按段落',
  sentence: '按句子',
};

export default function KnowledgeBasesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', embedding_model: 'text-embedding-3-large',
    chunk_strategy: 'fixed', chunk_size: 500, chunk_overlap: 50,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rag-kbs', params],
    queryFn: () => ragApi.knowledgeBases.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => editing ? ragApi.knowledgeBases.update(editing.id, d) : ragApi.knowledgeBases.create(d),
    onSuccess: () => {
      enqueueSnackbar(editing ? '知识库已更新' : '知识库已创建', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
      setDialogOpen(false);
    },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ragApi.knowledgeBases.delete(id),
    onSuccess: () => {
      enqueueSnackbar('知识库已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
    },
  });

  const handleOpen = (item?: any) => {
    if (item) {
      setEditing(item);
      setForm({
        name: item.name || '', description: item.description || '',
        embedding_model: item.embedding_model || 'text-embedding-3-large',
        chunk_strategy: item.chunk_strategy || 'fixed',
        chunk_size: item.chunk_size || 500, chunk_overlap: item.chunk_overlap || 50,
      });
    } else {
      setEditing(null);
      setForm({
        name: '', description: '', embedding_model: 'text-embedding-3-large',
        chunk_strategy: 'fixed', chunk_size: 500, chunk_overlap: 50,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      enqueueSnackbar('请填写知识库名称', { variant: 'warning' });
      return;
    }
    createMutation.mutate(form);
  };

  const totalVectors = items.reduce((s: number, k: any) => s + (k.vector_count || 0), 0);
  const totalDocs = items.reduce((s: number, k: any) => s + (k.doc_count || 0), 0);

  const stats = [
    { title: '知识库总数', value: items.length, icon: <MenuBook />, color: 'primary' },
    { title: '文档总数', value: totalDocs, icon: <Description />, color: 'info' },
    { title: '向量总数', value: totalVectors, icon: <Hub />, color: 'success' },
    { title: '嵌入模型数', value: new Set(items.map((k: any) => k.embedding_model)).size, icon: <ModelTraining />, color: 'warning' },
  ];

  return (
    <Box>
      <PageHeader title="知识库管理" subtitle="管理 RAG 检索增强生成的知识库、嵌入模型与分块策略" actions={
        <>
          <Button startIcon={<Refresh />} onClick={() => qc.invalidateQueries({ queryKey: ['rag-kbs'] })}>刷新</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>新建知识库</Button>
        </>
      } />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard title={s.title} value={s.value} icon={s.icon} color={s.color} />
          </Grid>
        ))}
      </Grid>

      <FilterBar search={search} onSearchChange={v => { setSearch(v); setPage(1); }} />

      {isLoading ? <LoadingState /> : (
        <DataTable
          pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>知识库名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>嵌入模型</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>分块策略</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>文档数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>向量数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7}><EmptyState title="暂无知识库" description="点击右上角新建知识库，上传文档后即可用于 RAG 检索" /></TableCell></TableRow>
            ) : items.map((kb: any) => (
              <TableRow key={kb.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MenuBook sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{kb.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{kb.description}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={kb.embedding_model} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {CHUNK_STRATEGIES[kb.chunk_strategy] || kb.chunk_strategy}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      ({kb.chunk_size}/{kb.chunk_overlap})
                    </Typography>
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Description sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2">{kb.doc_count}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Hub sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2">{kb.vector_count}</Typography>
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={kb.status} /></TableCell>
                <TableCell>
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => handleOpen(kb)}><Edit fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => {
                      if (confirm(`确定删除知识库「${kb.name}」？关联的文档将一并删除。`)) {
                        deleteMutation.mutate(kb.id);
                      }
                    }}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? '编辑知识库' : '新建知识库'}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            知识库用于 RAG 检索增强生成。上传文档后将自动分块、向量化，供 AI 对话和 Agent 使用。
          </Alert>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="知识库名称" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="如：技术研发知识库" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="描述" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="知识库用途说明" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth select label="嵌入模型" value={form.embedding_model}
                onChange={e => setForm({ ...form, embedding_model: e.target.value })}>
                {EMBEDDING_MODELS.map(m => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth select label="分块策略" value={form.chunk_strategy}
                onChange={e => setForm({ ...form, chunk_strategy: e.target.value })}
                helperText="固定大小：按字符数切割；按段落：以段落为单位；按句子：以句子为单位">
                <MenuItem value="fixed">固定大小</MenuItem>
                <MenuItem value="paragraph">按段落</MenuItem>
                <MenuItem value="sentence">按句子</MenuItem>
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField fullWidth type="number" label="分块大小" value={form.chunk_size}
                onChange={e => setForm({ ...form, chunk_size: Number(e.target.value) })}
                helperText="每个分块的字符数" />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth type="number" label="重叠大小" value={form.chunk_overlap}
                onChange={e => setForm({ ...form, chunk_overlap: Number(e.target.value) })}
                helperText="相邻分块重叠字符数" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
