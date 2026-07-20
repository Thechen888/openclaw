import { useState, useRef } from 'react';
import {
  Box, TableHead, TableBody, TableRow, TableCell, IconButton,
  Button, Tooltip, Grid, Typography, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Paper, alpha, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
  Refresh, Delete, UploadFile, Description, PictureAsPdf,
  Article, TextSnippet, Code, Visibility, MenuBook, Close,
  CloudUpload, InsertDriveFile, Search, CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, StatCard,
} from '../../components/shared';
import { ragApi } from '../../api/client';

const FILE_ICONS: Record<string, any> = {
  pdf: PictureAsPdf,
  docx: Article,
  markdown: Code,
  md: Code,
  text: TextSnippet,
  txt: TextSnippet,
};

const FILE_COLORS: Record<string, string> = {
  pdf: 'error', docx: 'primary', markdown: 'info', md: 'info', text: 'default', txt: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成',
  processing: '处理中',
  failed: '失败',
};

const SUPPORTED_TYPES = ['pdf', 'docx', 'doc', 'md', 'markdown', 'txt', 'text', 'csv', 'json'];

export default function DocumentsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [kbFilter, setKbFilter] = useState('');
  const [kbSearch, setKbSearch] = useState('');
  const [chunkDialog, setChunkDialog] = useState<any>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 知识库列表（用于筛选）
  const { data: kbData } = useQuery({
    queryKey: ['rag-kbs-for-filter'],
    queryFn: () => ragApi.knowledgeBases.list({ page: 1, page_size: 200 }),
  });
  const kbs: any[] = kbData?.data?.data || [];

  // 搜索过滤后的知识库
  const filteredKbs = kbs.filter((kb: any) =>
    !kbSearch || kb.name.toLowerCase().includes(kbSearch.toLowerCase())
  );

  // 文档列表
  const queryParams = { ...params, kb_id: kbFilter || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ['rag-docs', queryParams],
    queryFn: () => ragApi.documents.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  // 上传文档
  const uploadMutation = useMutation({
    mutationFn: (d: any) => ragApi.documents.upload(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rag-docs'] });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
      qc.invalidateQueries({ queryKey: ['rag-kbs-for-filter'] });
    },
    onError: () => enqueueSnackbar('上传失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ragApi.documents.delete(id),
    onSuccess: () => {
      enqueueSnackbar('文档已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-docs'] });
      qc.invalidateQueries({ queryKey: ['rag-kbs'] });
    },
  });

  // 打开上传弹窗
  const handleOpenUpload = () => {
    setUploadFiles([]);
    setUploadOpen(true);
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 拖拽文件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadFiles(prev => [...prev, ...files]);
  };

  // 移除已选文件
  const handleRemoveFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 确认上传
  const handleConfirmUpload = async () => {
    if (uploadFiles.length === 0) {
      enqueueSnackbar('请选择要上传的文件', { variant: 'warning' });
      return;
    }
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'text';
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        await uploadMutation.mutateAsync({
          kb_id: kbFilter,
          name: file.name,
          type: ext,
          size: sizeMB + 'MB',
        });
      }
      enqueueSnackbar(`${uploadFiles.length} 个文档上传成功，正在处理中...`, { variant: 'success' });
      setUploadOpen(false);
      setUploadFiles([]);
    } catch {
      // error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  // 查看分块
  const { data: chunkData, isLoading: chunkLoading } = useQuery({
    queryKey: ['doc-chunks', chunkDialog?.id],
    queryFn: () => ragApi.documents.chunks(chunkDialog.id),
    enabled: !!chunkDialog,
  });
  const chunks: any[] = chunkData?.data?.data || [];

  const selectedKb = kbs.find((kb: any) => kb.id === kbFilter);

  const stats = [
    { title: '文档总数', value: items.length, icon: <Description />, color: 'primary' },
    { title: '已向量化', value: items.filter((d: any) => d.status === 'completed').length, icon: <Description />, color: 'success' },
    { title: '处理中', value: items.filter((d: any) => d.status === 'processing').length, icon: <Description />, color: 'warning' },
    { title: '失败', value: items.filter((d: any) => d.status === 'failed').length, icon: <Description />, color: 'error' },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader title="文档管理" subtitle="上传文档到知识库，系统自动分块、向量化后供 RAG 检索使用" actions={
          <>
            <Button startIcon={<Refresh />} onClick={() => qc.invalidateQueries({ queryKey: ['rag-docs'] })}>刷新</Button>
            <Tooltip title={!kbFilter ? '请先在下方选择目标知识库' : `上传到「${selectedKb?.name}」`}>
              <span>
                <Button variant="contained" startIcon={<UploadFile />} onClick={handleOpenUpload} disabled={!kbFilter}>
                  上传文档
                </Button>
              </span>
            </Tooltip>
          </>
        } />
      </Box>

      {/* 知识库选择器 - 卡片式带搜索 */}
      <Paper sx={{ p: 2, mb: 2, border: '1px solid', borderColor: kbFilter ? 'primary.main' : 'warning.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <MenuBook sx={{ fontSize: 22, color: kbFilter ? 'primary.main' : 'warning.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {kbFilter ? `当前知识库：${selectedKb?.name}` : '请选择目标知识库'}
          </Typography>
          {!kbFilter && (
            <Chip label="必选" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
          )}
          {kbFilter && (
            <Chip
              label="取消选择"
              size="small" variant="outlined" clickable
              onDelete={() => { setKbFilter(''); setPage(1); }}
              deleteIcon={<Close sx={{ fontSize: 14 }} />}
              sx={{ height: 22, fontSize: 11, ml: 1 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small" placeholder="搜索知识库..."
            value={kbSearch} onChange={e => setKbSearch(e.target.value)}
            sx={{ width: 200 }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
              },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {filteredKbs.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ py: 1 }}>
              {kbSearch ? '未找到匹配的知识库' : '暂无知识库，请先在「知识库管理」中创建'}
            </Typography>
          ) : (
            filteredKbs.map((kb: any) => (
              <Paper
                key={kb.id}
                elevation={0}
                onClick={() => { setKbFilter(kb.id === kbFilter ? '' : kb.id); setPage(1); }}
                sx={{
                  px: 1.5, py: 1, cursor: 'pointer', borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: kbFilter === kb.id ? 'primary.main' : 'divider',
                  bgcolor: (t) => kbFilter === kb.id ? alpha(t.palette.primary.main, 0.08) : 'transparent',
                  '&:hover': { borderColor: 'primary.light', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 0.75,
                }}
              >
                {kbFilter === kb.id && <CheckCircle sx={{ fontSize: 16, color: 'primary.main' }} />}
                <MenuBook sx={{ fontSize: 14, color: kbFilter === kb.id ? 'primary.main' : 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: kbFilter === kb.id ? 600 : 400 }}>
                  {kb.name}
                </Typography>
                <Chip label={`${kb.doc_count || 0}文档`} size="small" variant="outlined"
                  sx={{ height: 18, fontSize: 10, ml: 0.5 }} />
              </Paper>
            ))
          )}
        </Box>
      </Paper>

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
              <TableCell sx={{ fontWeight: 700 }}>文件名</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>知识库</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>类型</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>大小</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>分块数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>上传时间</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState title="暂无文档" description="选择知识库后上传文档，系统将自动分块和向量化" /></TableCell></TableRow>
            ) : items.map((doc: any) => {
              const FileIcon = FILE_ICONS[doc.type] || Description;
              const kbName = kbs.find(k => k.id === doc.kb_id)?.name || '-';
              return (
                <TableRow key={doc.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon sx={{ fontSize: 18, color: `${FILE_COLORS[doc.type] || 'default'}.main` }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{doc.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{kbName}</TableCell>
                  <TableCell>
                    <Chip label={doc.type?.toUpperCase()} size="small" variant="outlined"
                      color={(FILE_COLORS[doc.type] as any) || 'default'}
                      sx={{ fontSize: 10, height: 20 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{doc.size}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{doc.chunk_count || 0}</TableCell>
                  <TableCell>
                    {doc.status === 'processing' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress sx={{ width: 60 }} />
                        <Typography variant="caption" color="warning.main">处理中</Typography>
                      </Box>
                    ) : (
                      <StatusBadge status={doc.status} label={STATUS_LABELS[doc.status] || doc.status} />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{new Date(doc.uploaded_at).toLocaleString('zh-CN')}</TableCell>
                  <TableCell>
                    <Tooltip title="查看分块">
                      <IconButton size="small" onClick={() => setChunkDialog(doc)} disabled={doc.status !== 'completed'}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => {
                        if (confirm(`确定删除文档「${doc.name}」？`)) deleteMutation.mutate(doc.id);
                      }}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* 分块详情弹窗 */}
      <Dialog open={!!chunkDialog} onClose={() => setChunkDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          分块详情 - {chunkDialog?.name}
        </DialogTitle>
        <DialogContent>
          {chunkLoading ? <LoadingState /> : (
            <Box>
              <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
                文档已切分为 {chunkDialog?.chunk_count} 个分块，每个分块独立向量化存储，用于 RAG 检索。
              </Alert>
              {chunks.map((chunk: any, i: number) => (
                <Box key={chunk.id || i} sx={{
                  p: 2, mb: 1, bgcolor: 'action.hover', borderRadius: 1,
                  borderLeft: '3px solid', borderColor: 'primary.main',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      分块 #{chunk.chunk_index + 1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {chunk.token_count} tokens
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{
                    fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    maxHeight: 120, overflow: 'auto',
                  }}>
                    {chunk.content}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChunkDialog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 上传文档弹窗 */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFile fontSize="small" color="primary" />
          上传文档到「{selectedKb?.name}」
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
            支持格式：PDF、DOCX、Markdown、TXT、CSV、JSON。上传后系统将自动分块并向量化。
          </Alert>

          {/* 拖拽上传区 */}
          <Paper
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            sx={{
              p: 4, textAlign: 'center', mb: 2, cursor: 'pointer',
              border: '2px dashed', borderColor: 'divider', borderRadius: 2,
              bgcolor: 'action.hover',
              '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              点击选择文件或拖拽文件到此区域
            </Typography>
            <Typography variant="caption" color="text.secondary">
              支持批量上传，单文件最大 50MB
            </Typography>
          </Paper>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.md,.txt,.csv,.json,.markdown"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* 已选文件列表 */}
          {uploadFiles.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                已选择 {uploadFiles.length} 个文件
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                <List dense disablePadding>
                  {uploadFiles.map((file, i) => {
                    const ext = file.name.split('.').pop()?.toLowerCase() || '';
                    const FileIcon = FILE_ICONS[ext] || InsertDriveFile;
                    const supported = SUPPORTED_TYPES.includes(ext);
                    return (
                      <ListItemButton key={i} sx={{ py: 0.5 }} disableRipple>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <FileIcon sx={{ fontSize: 18, color: supported ? `${FILE_COLORS[ext] || 'default'}.main` : 'error.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                          slotProps={{
                            primary: { sx: { fontSize: 13, fontWeight: 500 } },
                            secondary: { sx: { fontSize: 11 } },
                          }}
                        />
                        {!supported && (
                          <Chip label="不支持" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: 10, mr: 1 }} />
                        )}
                        <IconButton size="small" onClick={() => handleRemoveFile(i)} disabled={uploading}>
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </ListItemButton>
                    );
                  })}
                </List>
              </Paper>
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                正在上传并处理文档...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>取消</Button>
          <Button
            variant="contained" startIcon={<UploadFile />}
            onClick={handleConfirmUpload}
            disabled={uploading || uploadFiles.length === 0}
          >
            {uploading ? '上传中...' : `确认上传 (${uploadFiles.length})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
