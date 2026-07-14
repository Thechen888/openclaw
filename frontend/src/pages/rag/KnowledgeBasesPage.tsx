import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, IconButton, TextField, Button,
  Tooltip, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Select, Avatar,
} from '@mui/material';
import {
  Add, Search, ViewModule, ViewList, Star, StarBorder, Description, Delete, Security,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState, EmptyState } from '../../components/shared';
import { ragApi } from '../../api/client';
import { useViewModeStore } from '../../stores/viewModeStore';
import KbPermissionDialog from './KbPermissionDialog';

const TYPE_CONFIG: Record<string, { label: string; color: string; borderColor: string; icon: React.ReactNode }> = {
  document: { label: '文档', color: '#00E676', borderColor: '#00E676', icon: <Description fontSize="small" /> },
};

const EMBEDDING_MODELS = [
  { value: 'bge-m3', label: 'BGE-M3（内置）' },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large (OpenAI)' },
  { value: 'bge-large-zh', label: 'bge-large-zh (智源)' },
  { value: 'm3e-base', label: 'm3e-base (Moka)' },
];

const VECTOR_STORES = [
  { value: 'pgvector', label: 'PostgreSQL / pgvector' },
  { value: 'qdrant', label: 'Qdrant' },
];

export default function KnowledgeBasesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const viewMode = useViewModeStore(s => s.viewMode);
  const [search, setSearch] = useState('');
  const [cardViewMode, setCardViewMode] = useState<'card' | 'list'>('card');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', type: 'document', description: '', embedding_model: 'bge-m3', vector_store: 'pgvector',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rag-kbs'],
    queryFn: () => ragApi.knowledgeBases.list({ page: 1, page_size: 100 }),
  });
  const items = (data?.data?.data || []).filter((kb: any) => {
    if (search && !kb.name.toLowerCase().includes(search.toLowerCase()) && !kb.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => ragApi.knowledgeBases.create(d),
    onSuccess: () => {
      enqueueSnackbar('知识库已创建', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
      setDialogOpen(false);
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const toggleFavorite = useMutation({
    mutationFn: (kb: any) => ragApi.knowledgeBases.update(kb.id, { favorite: !kb.favorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rag-kbs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (kbId: string) => ragApi.knowledgeBases.delete(kbId),
    onSuccess: () => {
      enqueueSnackbar('知识库已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const handleDeleteClick = (kb: any) => {
    setDeleteTarget(kb);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  const handleSave = () => {
    if (!form.name.trim()) { enqueueSnackbar('请填写名称', { variant: 'warning' }); return; }
    createMutation.mutate(form);
  };

  return (
    <Box>
      <PageHeader title="知识库" subtitle="管理和组织您的知识资产" actions={
        viewMode === 'admin' ? (
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            创建知识库
          </Button>
        ) : null
      } />

      {/* 工具栏 */}
      <Box sx={{
        display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center',
        p: 1.5, borderRadius: 2,
        bgcolor: 'rgba(0,212,255,0.02)', border: '1px solid rgba(0,212,255,0.06)',
      }}>
        <TextField
          size="small" placeholder="搜索知识库..." value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="卡片视图"><IconButton onClick={() => setCardViewMode('card')} color={cardViewMode === 'card' ? 'primary' : 'default'}><ViewModule /></IconButton></Tooltip>
        <Tooltip title="列表视图"><IconButton onClick={() => setCardViewMode('list')} color={cardViewMode === 'list' ? 'primary' : 'default'}><ViewList /></IconButton></Tooltip>
      </Box>

      {isLoading ? <LoadingState /> : items.length === 0 ? (
        <EmptyState title="暂无知识库" description="点击右上角创建知识库" />
      ) : cardViewMode === 'card' ? (
        <Grid container spacing={2.5}>
          {items.map((kb: any) => {
            const tc = TYPE_CONFIG[kb.type] || TYPE_CONFIG.document;
            return (
              <Grid key={kb.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{
                  height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  borderLeft: `3px solid ${tc.borderColor}`,
                  transition: 'transform 0.25s ease, box-shadow 0.3s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 0 24px ${tc.borderColor}20, 0 8px 24px rgba(0,0,0,0.3)` },
                }} onClick={() => navigate(`/rag/knowledge-bases/${kb.id}`)}>
                  <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: `${tc.borderColor}15`, color: tc.borderColor, border: `1px solid ${tc.borderColor}30`, fontSize: 18 }}>
                          {tc.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{kb.name}</Typography>
                          <Chip label={tc.label} size="small" sx={{ height: 18, fontSize: 10, color: tc.borderColor, borderColor: tc.borderColor, mt: 0.5 }} variant="outlined" />
                        </Box>
                      </Box>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); toggleFavorite.mutate(kb); }} sx={{ color: kb.favorite ? '#FFD54F' : 'text.secondary' }}>
                        {kb.favorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                      </IconButton>
                      {viewMode === 'admin' && (
                        <Tooltip title="权限管理"><IconButton size="small" onClick={e => { e.stopPropagation(); setPermTarget(kb); setPermDialogOpen(true); }} sx={{ color: 'text.secondary', '&:hover': { color: '#00E676' } }}><Security fontSize="small" /></IconButton></Tooltip>
                      )}
                      {viewMode === 'admin' && (
                        <Tooltip title="删除知识库"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteClick(kb); }} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' } }}><Delete fontSize="small" /></IconButton></Tooltip>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 2, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {kb.description}
                    </Typography>
                    {kb.tags && kb.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                        {kb.tags.map((t: string) => <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.12)' }} variant="outlined" />)}
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                          <Description sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />{kb.doc_count} 文档
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                          {kb.vector_count?.toLocaleString()} 分块
                        </Typography>
                      </Box>
                      <Chip label={kb.status === 'active' ? '运行中' : kb.status === 'building' ? '构建中' : kb.status} size="small"
                        sx={{ height: 18, fontSize: 10, color: kb.status === 'active' ? '#00E676' : '#FFB800', borderColor: kb.status === 'active' ? '#00E67640' : '#FFB80040' }} variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map((kb: any) => {
            const tc = TYPE_CONFIG[kb.type] || TYPE_CONFIG.document;
            return (
              <Card key={kb.id} sx={{
                cursor: 'pointer', borderLeft: `3px solid ${tc.borderColor}`,
                transition: 'all 0.2s', '&:hover': { boxShadow: `0 0 16px ${tc.borderColor}15` },
              }} onClick={() => navigate(`/rag/knowledge-bases/${kb.id}`)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: `${tc.borderColor}15`, color: tc.borderColor, border: `1px solid ${tc.borderColor}30`, fontSize: 16 }}>
                    {tc.icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{kb.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>{kb.description}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {kb.tags?.map((t: string) => <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />)}
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, minWidth: 80 }}>{kb.doc_count} 文档</Typography>
                    <Chip label={kb.status === 'active' ? '运行中' : kb.status} size="small" sx={{ height: 20, fontSize: 10, color: kb.status === 'active' ? '#00E676' : '#FFB800', borderColor: kb.status === 'active' ? '#00E67640' : '#FFB80040' }} variant="outlined" />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); toggleFavorite.mutate(kb); }} sx={{ color: kb.favorite ? '#FFD54F' : 'text.secondary' }}>
                        {kb.favorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                      </IconButton>
                      {viewMode === 'admin' && (
                        <Tooltip title="权限管理"><IconButton size="small" onClick={e => { e.stopPropagation(); setPermTarget(kb); setPermDialogOpen(true); }} sx={{ color: 'text.secondary', '&:hover': { color: '#00E676' } }}><Security fontSize="small" /></IconButton></Tooltip>
                      )}
                      {viewMode === 'admin' && (
                        <Tooltip title="删除知识库"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDeleteClick(kb); }} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' } }}><Delete fontSize="small" /></IconButton></Tooltip>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* 删除知识库确认弹窗 */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(255,51,102,0.2)' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(255,51,102,0.1)', color: '#FF3366' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete sx={{ color: '#FF3366' }} /> 确认删除知识库
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', px: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 1.5 }}>
            即将删除知识库「<Box component="span" sx={{ fontWeight: 700, color: '#E8ECF0' }}>{deleteTarget?.name}</Box>」，该操作不可撤销。
          </Typography>
          <Typography variant="body2" sx={{ color: '#FF3366', fontSize: 12 }}>
            删除后，该知识库下的所有文档、分块、FAQ 和 Wiki 数据将被永久清除。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(255,51,102,0.08)' }}>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }} disabled={deleteMutation.isPending}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建知识库弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)' }}>创建知识库</DialogTitle>
        <DialogContent sx={{ pt: '24px !important', px: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="知识库名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：产品知识库" />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth label="用途说明" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} placeholder="说明资料范围和主要使用场景" />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth select label="Embedding 模型" value={form.embedding_model} onChange={e => setForm({ ...form, embedding_model: e.target.value })}>
                {EMBEDDING_MODELS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={6}>
              <TextField fullWidth select label="向量存储" value={form.vector_store} onChange={e => setForm({ ...form, vector_store: e.target.value })}>
                {VECTOR_STORES.map(v => <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 权限管理弹窗 */}
      {permTarget && (
        <KbPermissionDialog open={permDialogOpen} kb={permTarget} onClose={() => { setPermDialogOpen(false); setPermTarget(null); }} />
      )}
    </Box>
  );
}
