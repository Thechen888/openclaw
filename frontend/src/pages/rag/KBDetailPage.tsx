import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, IconButton, Button, TextField,
  Tab, Tabs, Avatar, InputAdornment, Table, TableHead, TableBody, TableRow, TableCell,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, LinearProgress,
  List, ListItem, ListItemButton, ListItemText, Collapse, Switch, FormControlLabel,
  Divider, Paper, CircularProgress,
} from '@mui/material';
import {
  ArrowBack, Description, QuestionAnswer, AutoStories, Analytics, Settings,
  Search, Upload, Chat, Download, Refresh, CheckCircle, Warning, Error,
  Pending, Visibility, ExpandMore, ExpandLess, Folder, Hub, Delete,
  CloudUpload, Link as LinkIcon, Edit, Close, Send, InsertDriveFile,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState, StatusBadge, EmptyState } from '../../components/shared';
import { ragApi } from '../../api/client';
import { useViewModeStore } from '../../stores/viewModeStore';

const DOC_STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <CheckCircle sx={{ color: '#00E676', fontSize: 16 }} />,
  processing: <Pending sx={{ color: '#FFB800', fontSize: 16 }} />,
  failed: <Error sx={{ color: '#FF3366', fontSize: 16 }} />,
};

export default function KBDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const viewMode = useViewModeStore(s => s.viewMode);
  const [tab, setTab] = useState(0);
  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', tags: '' });
  const [autoFaq, setAutoFaq] = useState(false);
  const [faqPerDoc, setFaqPerDoc] = useState(5);
  // 上传相关
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  // Markdown 编辑器
  const [mdDialogOpen, setMdDialogOpen] = useState(false);
  const [mdTitle, setMdTitle] = useState('');
  const [mdContent, setMdContent] = useState('');
  // 聊天
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; sources?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const { data: kbData, isLoading } = useQuery({
    queryKey: ['rag-kb', id],
    queryFn: () => ragApi.knowledgeBases.get(id!),
    enabled: !!id,
  });
  const kb = kbData?.data?.data;

  useEffect(() => {
    if (kb) {
      setAutoFaq(kb.auto_generate_faq ?? false);
      setFaqPerDoc(kb.faq_per_doc ?? 5);
    }
  }, [kb]);

  const { data: docsData } = useQuery({
    queryKey: ['rag-docs', { kb_id: id }],
    queryFn: () => ragApi.documents.list({ kb_id: id, page: 1, page_size: 100 }),
    enabled: !!id,
  });
  const docs = (docsData?.data?.data || []).filter((d: any) => {
    if (docTypeFilter !== 'all' && d.type !== docTypeFilter) return false;
    if (docStatusFilter !== 'all' && d.status !== docStatusFilter) return false;
    if (docSearch && !d.name.toLowerCase().includes(docSearch.toLowerCase())) return false;
    return true;
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => ragApi.documents.delete(docId),
    onSuccess: () => {
      enqueueSnackbar('文档已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-docs', { kb_id: id }] });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const { data: faqData } = useQuery({
    queryKey: ['rag-faq', { kb_id: id }],
    queryFn: () => ragApi.faq.list({ kb_id: id }),
    enabled: !!id,
  });
  const faqItems = faqData?.data?.data || [];

  const createFaqMutation = useMutation({
    mutationFn: (d: any) => ragApi.faq.create({ ...d, kb_id: id }),
    onSuccess: () => {
      enqueueSnackbar('问答已添加', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-faq', { kb_id: id }] });
      setFaqDialogOpen(false);
      setFaqForm({ question: '', answer: '', tags: '' });
    },
    onError: () => enqueueSnackbar('添加失败', { variant: 'error' }),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (faqId: string) => ragApi.faq.delete(faqId),
    onSuccess: () => {
      enqueueSnackbar('问答已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-faq', { kb_id: id }] });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const handleFaqSave = () => {
    if (!faqForm.question.trim()) { enqueueSnackbar('请填写问题', { variant: 'warning' }); return; }
    if (!faqForm.answer.trim()) { enqueueSnackbar('请填写答案', { variant: 'warning' }); return; }
    const tags = faqForm.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean);
    createFaqMutation.mutate({ question: faqForm.question, answer: faqForm.answer, tags });
  };

  // 文件上传 mutation
  const uploadDocMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kb_id', id!);
      return ragApi.documents.upload({ kb_id: id, name: file.name, type: file.name.split('.').pop(), size: file.size });
    },
    onSuccess: () => {
      enqueueSnackbar('文件上传成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-docs', { kb_id: id }] });
    },
    onError: () => enqueueSnackbar('上传失败', { variant: 'error' }),
  });

  // Markdown 上传 mutation
  const uploadMdMutation = useMutation({
    mutationFn: () => ragApi.documents.uploadMarkdown({ kb_id: id!, title: mdTitle, content: mdContent }),
    onSuccess: () => {
      enqueueSnackbar('Markdown 文档已创建', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['rag-docs', { kb_id: id }] });
      setMdDialogOpen(false);
      setMdTitle('');
      setMdContent('');
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  // 聊天 mutation
  const chatMutation = useMutation({
    mutationFn: (message: string) => ragApi.chat.send({ kb_id: id!, message, history: chatMessages.map(m => ({ role: m.role, content: m.content })) }),
    onSuccess: (res) => {
      const reply = res.data?.data;
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply?.message || '', sources: reply?.sources }]);
      setChatLoading(false);
    },
    onError: () => { enqueueSnackbar('发送失败', { variant: 'error' }); setChatLoading(false); },
  });

  const handleSendChat = () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    chatMutation.mutate(userMsg);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setUploadFiles(prev => [...prev, ...Array.from(files)]);
  };

  const handleUploadFiles = () => {
    if (uploadFiles.length === 0) return;
    uploadFiles.forEach((file, i) => {
      setTimeout(() => {
        uploadDocMutation.mutate(file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }, i * 500);
    });
    setUploadFiles([]);
    setTimeout(() => setUploadDialogOpen(false), 1000);
  };

  const handleRemoveFile = (name: string) => {
    setUploadFiles(prev => prev.filter(f => f.name !== name));
    setUploadProgress(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const { data: analyticsData } = useQuery({
    queryKey: ['rag-analytics', id],
    queryFn: () => ragApi.knowledgeBases.analytics(id!),
    enabled: !!id,
  });
  const analytics = analyticsData?.data?.data;

  const { data: wikiData } = useQuery({
    queryKey: ['rag-wiki', id],
    queryFn: () => ragApi.knowledgeBases.wiki(id!),
    enabled: !!id,
  });
  const wiki = wikiData?.data?.data;
  const wikiTree = wiki?.tree || [];
  const wikiContent = wiki?.content;
  const wikiGraphNodes = wiki?.graph_nodes || [];
  const [wikiExpanded, setWikiExpanded] = useState<Set<string>>(new Set());
  const [wikiSelected, setWikiSelected] = useState<string>('');

  const toggleWikiExpand = (nodeId: string) => {
    setWikiExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  const renderWikiTreeNode = (node: any) => {
    const children = node.children ? wikiTree.filter((n: any) => node.children!.includes(n.id)) : [];
    const hasChildren = children.length > 0;
    const isExpanded = wikiExpanded.has(node.id);
    const isSelected = wikiSelected === node.id;
    return (
      <Box key={node.id}>
        <ListItem disablePadding sx={{ pl: node.level * 2 }}>
          <ListItemButton selected={isSelected} onClick={() => { setWikiSelected(node.id); if (hasChildren) toggleWikiExpand(node.id); }} sx={{ borderRadius: 1, py: 0.5, px: 1, '&.Mui-selected': { bgcolor: 'rgba(0,212,255,0.08)' }}
          }>
            {hasChildren && (
              <IconButton size="small" onClick={e => { e.stopPropagation(); toggleWikiExpand(node.id); }} sx={{ mr: 0.5, p: 0 }}>
                {isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 24 }} />}
            {hasChildren ? <Folder sx={{ fontSize: 16, mr: 0.5, color: '#00D4FF' }} /> : <Description sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
            <ListItemText primary={<Typography variant="body2" sx={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{node.label}</Typography>} />
          </ListItemButton>
        </ListItem>
        {hasChildren && <Collapse in={isExpanded} timeout="auto">{children.map((c: any) => renderWikiTreeNode(c))}</Collapse>}
      </Box>
    );
  };

  if (isLoading) return <LoadingState />;
  if (!kb) return <EmptyState title="知识库不存在" />;

  const allTabs = [
    { label: '文档', icon: <Description fontSize="small" /> },
    { label: 'FAQ', icon: <QuestionAnswer fontSize="small" /> },
    { label: 'Wiki 与图谱', icon: <AutoStories fontSize="small" /> },
    { label: '检索分析', icon: <Analytics fontSize="small" /> },
    { label: '知识库设置', icon: <Settings fontSize="small" /> },
  ];
  const tabs = viewMode === 'admin' ? allTabs : allTabs.slice(0, 3);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      {/* 面包屑 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton size="small" onClick={() => navigate('/rag/knowledge-bases')}><ArrowBack /></IconButton>
        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }} onClick={() => navigate('/rag/knowledge-bases')}>知识库</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>{kb.name}</Typography>
      </Box>

      {/* Hero 卡片 */}
      <Card sx={{ mb: 2.5, position: 'relative', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #00D4FF, #7C3AED, transparent)' } }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', fontSize: 24 }}>
                <Description fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20 }}>{kb.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>{kb.description}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  {kb.tags?.map((t: string) => <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" />)}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<Upload />} onClick={() => setImportDialogOpen(true)}>上传资料</Button>
              <Button variant="contained" size="small" startIcon={<Chat />} onClick={() => navigate(`/chat?kb_id=${id}&kb_name=${encodeURIComponent(kb.name)}&mode=rag`)}>基于此库问答</Button>
            </Box>
          </Box>
          {/* 概要条 */}
          <Box sx={{ display: 'flex', gap: 4, pt: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            {[
              { label: '知识条目', value: kb.doc_count },
              { label: '已生成分块', value: kb.vector_count?.toLocaleString() },
              { label: '今日检索', value: kb.today_retrievals },
              { label: '最近同步', value: kb.last_sync ? `${Math.floor((Date.now() - new Date(kb.last_sync).getTime()) / 60000)} 分钟前` : '-' },
            ].map((s, i) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#00D4FF', fontSize: 18 }}>{s.value}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Tab 导航 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {tabs.map((t, i) => <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" sx={{ minHeight: 44, fontSize: 13, textTransform: 'none' }} />)}
        </Tabs>
      </Box>

      {/* 文档 Tab */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" placeholder="搜索文档..." value={docSearch} onChange={e => setDocSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
              sx={{ minWidth: 200 }} />
            <TextField size="small" select value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)} sx={{ minWidth: 120 }}>
              <MenuItem value="all">全部类型</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="docx">Word</MenuItem>
              <MenuItem value="markdown">Markdown</MenuItem>
              <MenuItem value="text">文本</MenuItem>
            </TextField>
            <TextField size="small" select value={docStatusFilter} onChange={e => setDocStatusFilter(e.target.value)} sx={{ minWidth: 120 }}>
              <MenuItem value="all">全部状态</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="processing">处理中</MenuItem>
              <MenuItem value="failed">失败</MenuItem>
            </TextField>
          </Box>
          <Card>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>文件名</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>分块数</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>更新时间</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography variant="body2" color="text.secondary">暂无文档</Typography></TableCell></TableRow>
                ) : docs.map((doc: any) => (
                  <TableRow key={doc.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/rag/knowledge-bases/${id}/documents/${doc.id}`)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {DOC_STATUS_ICON[doc.status] || <Pending sx={{ fontSize: 16 }} />}
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={doc.type?.toUpperCase()} size="small" sx={{ height: 20, fontSize: 10 }} variant="outlined" /></TableCell>
                    <TableCell><StatusBadge status={doc.status} label={doc.status === 'completed' ? '已完成' : doc.status === 'processing' ? '处理中' : '失败'} /></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{doc.chunk_count}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '-'}</Typography></TableCell>
                    <TableCell>
                      <Tooltip title="查看详情"><IconButton size="small" onClick={e => { e.stopPropagation(); navigate(`/rag/knowledge-bases/${id}/documents/${doc.id}`); }}><Visibility fontSize="small" /></IconButton></Tooltip>
                      {viewMode === 'admin' && (
                        <Tooltip title="删除文档"><IconButton size="small" onClick={e => { e.stopPropagation(); if (window.confirm(`确认删除文档「${doc.name}」？`)) deleteDocMutation.mutate(doc.id); }} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' } }}><Delete fontSize="small" /></IconButton></Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Box>
      )}

      {/* FAQ Tab */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TextField size="small" placeholder="搜索问题或答案" sx={{ minWidth: 220 }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} />
              <Chip label={`${faqItems.length} 条已发布`} size="small" sx={{ height: 22, fontSize: 11, color: '#00D4FF', borderColor: 'rgba(0,212,255,0.3)' }} variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<Upload />}>导入 Excel</Button>
              <Button variant="contained" size="small" startIcon={<QuestionAnswer />} onClick={() => setFaqDialogOpen(true)}>新增问答</Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {faqItems.length === 0 ? (
              <EmptyState title="暂无 FAQ" description="该知识库暂无 FAQ 条目" />
            ) : faqItems.map((faq: any) => (
              <Card key={faq.id} sx={{ '&:hover': { borderColor: 'rgba(0,212,255,0.15)' }, transition: 'all 0.2s' }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        {faq.tags?.map((t: string) => (
                          <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.04)', borderColor: 'rgba(0,212,255,0.1)' }} variant="outlined" />
                        ))}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14, mb: 0.75 }}>{faq.question}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.7 }}>{faq.answer}</Typography>
                    </Box>
                    {viewMode === 'admin' && (
                      <Tooltip title="删除问答"><IconButton size="small" onClick={() => { if (window.confirm(`确认删除问答「${faq.question}」？`)) deleteFaqMutation.mutate(faq.id); }} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' }, ml: 1, flexShrink: 0 }}><Delete fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* 新增问答弹窗 */}
          <Dialog open={faqDialogOpen} onClose={() => setFaqDialogOpen(false)} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><QuestionAnswer sx={{ color: '#00D4FF' }} /> 新增问答</Box>
            </DialogTitle>
            <DialogContent sx={{ pt: '20px !important', px: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField fullWidth label="问题" value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} multiline rows={2} placeholder="输入问题内容" />
                <TextField fullWidth label="答案" value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} multiline rows={4} placeholder="输入答案内容" />
                <TextField fullWidth label="标签" value={faqForm.tags} onChange={e => setFaqForm({ ...faqForm, tags: e.target.value })} placeholder="多个标签用逗号分隔，如：高频问题, 液冷系统" />
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              <Button onClick={() => setFaqDialogOpen(false)}>取消</Button>
              <Button variant="contained" onClick={handleFaqSave} disabled={createFaqMutation.isPending}>
                {createFaqMutation.isPending ? '添加中...' : '确认添加'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Wiki 与图谱 Tab */}
      {tab === 2 && (
        <Box>
          {wiki ? (
            <Grid container spacing={2.5}>
              {/* 左侧 - 目录树 */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%', maxHeight: 700, overflow: 'auto' }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#00D4FF', fontSize: 13 }}>页面目录</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{wikiTree.length} 个页面</Typography>
                  </Box>
                  <List dense sx={{ p: 1 }}>
                    {wikiTree.filter((n: any) => n.level === 0).map((node: any) => renderWikiTreeNode(node))}
                  </List>
                </Card>
              </Grid>

              {/* 中间 - Wiki 正文 */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ minHeight: 500 }}>
                  <CardContent sx={{ p: 3 }}>
                    {wikiContent ? (
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20, mb: 1.5 }}>{wikiContent.title}</Typography>
                        {wikiContent.badges && (
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                            {wikiContent.badges.map((b: string, i: number) => (
                              <Chip key={i} label={b} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.15)' }} variant="outlined" />
                            ))}
                          </Box>
                        )}
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.8, mb: 3, p: 2, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.02)', borderLeft: '3px solid rgba(0,212,255,0.3)' }}>
                          {wikiContent.intro}
                        </Typography>
                        {wikiContent.sections?.map((section: any, i: number) => (
                          <Box key={i} sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16, mb: 1.5, color: '#E8ECF0', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 4, height: 16, borderRadius: 1, background: 'linear-gradient(180deg, #00D4FF, #7C3AED)' }} />
                              {section.heading}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.8, mb: 1.5 }}>{section.body}</Typography>
                            {section.items && (
                              <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                                {section.items.map((item: string, j: number) => {
                                  const boldMatch = item.match(/^(.+?)：/);
                                  if (boldMatch) {
                                    return (
                                      <Typography key={j} variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7 }}>
                                        <Box component="span" sx={{ fontWeight: 600, color: '#E8ECF0' }}>{boldMatch[1]}</Box>{item.slice(boldMatch[1].length)}
                                      </Typography>
                                    );
                                  }
                                  return (
                                    <Typography key={j} variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7 }}>
                                      <Box component="span" sx={{ color: '#00D4FF', mr: 1 }}>•</Box>{item}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            )}
                            {section.citations && (
                              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
                                <Typography variant="caption" sx={{ color: '#00D4FF', fontWeight: 600, fontSize: 11, mb: 0.5, display: 'block' }}>引用</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {section.citations.map((c: string, j: number) => (
                                    <Chip key={j} label={c} size="small" sx={{ height: 20, fontSize: 10, color: '#00D4FF', borderColor: 'rgba(0,212,255,0.2)' }} variant="outlined" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body2" color="text.secondary">请从左侧目录选择一个页面</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* 右侧 - 知识图谱 */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Hub sx={{ color: '#00D4FF', fontSize: 18 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#00D4FF', fontSize: 13 }}>知识关系</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>当前页面关联实体</Typography>
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ position: 'relative', width: '100%', height: 280, mb: 2 }}>
                      <svg width="100%" height="280" viewBox="0 0 240 280">
                        {wikiGraphNodes.filter((n: any) => !n.is_main).map((node: any, i: number) => {
                          const angle = (i / (wikiGraphNodes.length - 1)) * 2 * Math.PI - Math.PI / 2;
                          const cx = 120 + Math.cos(angle) * 90;
                          const cy = 140 + Math.sin(angle) * 90;
                          return <line key={`line-${i}`} x1="120" y1="140" x2={cx} y2={cy} stroke="rgba(0,212,255,0.2)" strokeWidth="1" />;
                        })}
                        <circle cx="120" cy="140" r="28" fill="rgba(0,212,255,0.1)" stroke="#00D4FF" strokeWidth="1.5" />
                        <text x="120" y="144" textAnchor="middle" fill="#00D4FF" fontSize="9" fontWeight="600">
                          {wikiGraphNodes.find((n: any) => n.is_main)?.label || '核心'}
                        </text>
                        {wikiGraphNodes.filter((n: any) => !n.is_main).map((node: any, i: number) => {
                          const angle = (i / (wikiGraphNodes.length - 1)) * 2 * Math.PI - Math.PI / 2;
                          const cx = 120 + Math.cos(angle) * 90;
                          const cy = 140 + Math.sin(angle) * 90;
                          return (
                            <g key={node.id || i}>
                              <circle cx={cx} cy={cy} r="22" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.4)" strokeWidth="1" />
                              <text x={cx} y={cy + 4} textAnchor="middle" fill="#CE93D8" fontSize="8" fontWeight="500">{node.label}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {wikiGraphNodes.map((node: any) => (
                        <Box key={node.id} sx={{
                          display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1,
                          bgcolor: node.is_main ? 'rgba(0,212,255,0.06)' : 'transparent',
                          '&:hover': { bgcolor: 'rgba(0,212,255,0.04)' },
                        }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: node.is_main ? '#00D4FF' : '#CE93D8', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ fontSize: 11, fontWeight: node.is_main ? 600 : 400, color: node.is_main ? '#00D4FF' : 'text.secondary' }}>{node.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <EmptyState title="暂无 Wiki 数据" description="该知识库尚未生成 Wiki 内容" />
          )}
        </Box>
      )}

      {/* 检索分析 Tab */}
      {tab === 3 && (
        <Box>
          {analytics ? (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {[
                  { label: '月度检索', value: analytics.metrics?.monthly_retrievals?.toLocaleString(), color: '#00D4FF' },
                  { label: '平均延迟', value: `${analytics.metrics?.avg_latency_ms}ms`, color: '#00E676' },
                  { label: '命中率', value: `${analytics.metrics?.hit_rate}%`, color: '#FFB800' },
                ].map((m, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 4 }}>
                    <Card sx={{ p: 2.5, textAlign: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: m.color }}>{m.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Card>
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>高频检索主题</Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>主题</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>检索次数</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>命中率</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>建议</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topics?.map((t: any, i: number) => (
                      <TableRow key={i} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>{t.topic}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{t.count}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={t.hit_rate} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                            <Typography variant="caption" sx={{ fontSize: 11 }}>{t.hit_rate}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={t.suggestion} size="small" sx={{ height: 20, fontSize: 10, color: t.suggestion === '充足' ? '#00E676' : '#FFB800', borderColor: t.suggestion === '充足' ? '#00E67640' : '#FFB80040' }} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </Box>
          ) : (
            <EmptyState title="暂无分析数据" description="该知识库暂无检索分析数据" />
          )}
        </Box>
      )}

      {/* 知识库设置 Tab */}
      {tab === 4 && (
        <Box>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Embedding 模型</Typography>
              <TextField fullWidth select label="Embedding 模型" value={kb.embedding_model || 'bge-m3'}
                onChange={() => {}} size="small" sx={{ mb: 3 }}>
                <MenuItem value="bge-m3">bge-m3</MenuItem>
                <MenuItem value="text-embedding-3-large">text-embedding-3-large</MenuItem>
                <MenuItem value="bge-large-zh">bge-large-zh</MenuItem>
              </TextField>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>FAQ 生成配置</Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={autoFaq} onChange={e => setAutoFaq(e.target.checked)} />}
                  label={<Typography variant="caption" sx={{ color: 'text.secondary' }}>上传文档时自动生成 FAQ</Typography>}
                />
              </Box>
              {autoFaq && (
                <TextField fullWidth type="number" label="每个文档生成 FAQ 数量" value={faqPerDoc}
                  onChange={e => setFaqPerDoc(Number(e.target.value))} size="small"
                  slotProps={{ input: { inputProps: { min: 1, max: 20 } } }}
                  helperText="上传文档后自动生成的 FAQ 条目数，范围 1-20" />
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* 导入知识弹窗 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Upload sx={{ color: '#00D4FF' }} /> 导入知识</Box>
          <IconButton size="small" onClick={() => setImportDialogOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', px: 3, pb: 3 }}>
          <Grid container spacing={2}>
            {[
              { icon: <CloudUpload sx={{ fontSize: 28, color: '#00D4FF' }} />, title: '上传文件或文件夹', desc: 'PDF、Word、Excel、PPT、图片等', action: () => { setImportDialogOpen(false); setUploadDialogOpen(true); } },
              { icon: <Edit sx={{ fontSize: 28, color: '#00E676' }} />, title: '在线录入', desc: '直接编写 Markdown 知识', action: () => { setImportDialogOpen(false); setMdDialogOpen(true); } },
            ].map((item, i) => (
              <Grid size={{ xs: 6 }} key={i}>
                <Card sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(0,212,255,0.3)', transform: 'translateY(-2px)' } }}
                  onClick={item.action}>
                  <CardContent sx={{ p: 2.5, textAlign: 'center', '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ mb: 1.5 }}>{item.icon}</Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.4 }}>{item.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <Button onClick={() => setImportDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 文件上传弹窗 */}
      <Dialog open={uploadDialogOpen} onClose={() => { setUploadDialogOpen(false); setUploadFiles([]); setUploadProgress({}); }} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CloudUpload sx={{ color: '#00D4FF' }} /> 上传文件</Box>
          <IconButton size="small" onClick={() => { setUploadDialogOpen(false); setUploadFiles([]); setUploadProgress({}); }}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', px: 3, pb: 3 }}>
          {/* 拖拽区域 */}
          <Box
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files); }}
            sx={{
              border: '2px dashed', borderColor: isDragOver ? '#00D4FF' : 'rgba(0,212,255,0.2)',
              borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer', mb: 2,
              bgcolor: isDragOver ? 'rgba(0,212,255,0.04)' : 'transparent', transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('file-input-upload')?.click()}
          >
            <input id="file-input-upload" type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
              onChange={e => handleFileSelect(e.target.files)} />
            <CloudUpload sx={{ fontSize: 40, color: '#00D4FF', mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>拖拽文件到此处，或点击选择</Typography>
            <Typography variant="caption" color="text.secondary">支持 PDF、Word、Excel、PPT、图片、文本等格式，可批量上传</Typography>
          </Box>
          {/* 文件列表 */}
          {uploadFiles.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflow: 'auto' }}>
              {uploadFiles.map((file, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
                  <InsertDriveFile sx={{ fontSize: 18, color: '#00D4FF', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{(file.size / 1024).toFixed(1)} KB</Typography>
                  </Box>
                  {uploadProgress[file.name] !== undefined ? (
                    <Box sx={{ width: 60 }}><LinearProgress variant="determinate" value={uploadProgress[file.name]} sx={{ height: 4, borderRadius: 2 }} /></Box>
                  ) : (
                    <IconButton size="small" onClick={() => handleRemoveFile(file.name)} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' } }}><Close fontSize="small" /></IconButton>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <Button onClick={() => { setUploadDialogOpen(false); setUploadFiles([]); setUploadProgress({}); }}>取消</Button>
          <Button variant="contained" onClick={handleUploadFiles} disabled={uploadFiles.length === 0} startIcon={<Upload />}>
            开始上传 ({uploadFiles.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Markdown 编辑器弹窗 */}
      <Dialog open={mdDialogOpen} onClose={() => setMdDialogOpen(false)} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Edit sx={{ color: '#00E676' }} /> 在线录入 Markdown</Box>
          <IconButton size="small" onClick={() => setMdDialogOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important', px: 3, pb: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="文档标题" value={mdTitle} onChange={e => setMdTitle(e.target.value)} placeholder="输入文档标题" size="small" />
            <TextField fullWidth label="Markdown 内容" value={mdContent} onChange={e => setMdContent(e.target.value)}
              multiline rows={16} placeholder="# 标题&#10;&#10;在此输入 Markdown 内容...&#10;&#10;## 章节&#10;&#10;正文内容..."
              sx={{ fontFamily: 'monospace', '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <Button onClick={() => setMdDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => { if (!mdTitle.trim()) { enqueueSnackbar('请填写标题', { variant: 'warning' }); return; } if (!mdContent.trim()) { enqueueSnackbar('请填写内容', { variant: 'warning' }); return; } uploadMdMutation.mutate(); }}
            disabled={uploadMdMutation.isPending} startIcon={<CheckCircle />}>
            {uploadMdMutation.isPending ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 基于此库问答弹窗 */}
      <Dialog open={chatDialogOpen} onClose={() => setChatDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)', height: '80vh', display: 'flex', flexDirection: 'column' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, borderBottom: '1px solid rgba(0,212,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Chat sx={{ color: '#00D4FF' }} /> {kb.name} - 知识库问答</Box>
          <IconButton size="small" onClick={() => setChatDialogOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: 'auto', px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chatMessages.map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: msg.role === 'user' ? '#7C3AED' : 'rgba(0,212,255,0.15)', color: msg.role === 'user' ? '#fff' : '#00D4FF', flexShrink: 0 }}>
                {msg.role === 'user' ? '我' : 'AI'}
              </Avatar>
              <Box sx={{ maxWidth: '75%' }}>
                <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: msg.role === 'user' ? 'rgba(124,58,237,0.15)' : 'rgba(0,212,255,0.06)', border: '1px solid', borderColor: msg.role === 'user' ? 'rgba(124,58,237,0.2)' : 'rgba(0,212,255,0.1)' }}>
                  <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                </Paper>
                {msg.sources && msg.sources.length > 0 && (
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {msg.sources.map((s: any, j: number) => (
                      <Chip key={j} label={s.doc_name} size="small" sx={{ height: 18, fontSize: 10, color: '#00D4FF', borderColor: 'rgba(0,212,255,0.2)' }} variant="outlined" />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
          {chatLoading && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'rgba(0,212,255,0.15)', color: '#00D4FF', flexShrink: 0 }}>AI</Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center' }}><CircularProgress size={16} sx={{ color: '#00D4FF' }} /><Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>思考中...</Typography></Box>
            </Box>
          )}
        </DialogContent>
        <Box sx={{ p: 2, borderTop: '1px solid rgba(0,212,255,0.08)', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField fullWidth size="small" placeholder="输入你的问题..." value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}><Send fontSize="small" /></IconButton></InputAdornment> } }} />
          </Box>
        </Box>
      </Dialog>

    </Box>
  );
}