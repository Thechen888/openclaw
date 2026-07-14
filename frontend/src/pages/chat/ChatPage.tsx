import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, TextField, Button, IconButton, Typography, Paper, MenuItem,
  List, ListItemButton, Tooltip, Chip, Avatar, Collapse,
  CircularProgress, InputAdornment, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, ToggleButtonGroup, ToggleButton, Badge,
  LinearProgress, alpha,
} from '@mui/material';
import {
  Add, Send, Delete, Chat as ChatIcon, SmartToy, Person,
  MenuBook, Refresh, AutoAwesome, Search,
  ExpandMore, ExpandLess, Description, Score,
  Psychology, Forum, Close,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { chatApi, ragApi, modelPoliciesApi } from '../../api/client';

// =================== Markdown渲染 ===================
function formatMessage(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.slice(3, -3);
      const lines = code.split('\n');
      const lang = lines[0].trim();
      const codeContent = lang && !lines[0].includes(' ') ? lines.slice(1).join('\n') : code;
      return (
        <Box key={i} sx={{
          bgcolor: 'grey.900', color: 'grey.100', p: 1.5, borderRadius: 1,
          fontFamily: 'monospace', fontSize: 12, overflow: 'auto',
          my: 0.5, border: '1px solid', borderColor: 'divider',
        }}>
          {lang && !lines[0].includes(' ') && (
            <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mb: 0.5 }}>{lang}</Typography>
          )}
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{codeContent}</pre>
        </Box>
      );
    }
    const lines = part.split('\n');
    return (
      <Box key={i}>
        {lines.map((line, j) => {
          if (line.startsWith('| ') && line.endsWith(' |')) {
            return (
              <Box key={j} sx={{ fontFamily: 'monospace', fontSize: 12, py: 0.25, color: 'text.secondary' }}>{line}</Box>
            );
          }
          if (line.startsWith('---')) {
            return <Divider key={j} sx={{ my: 1 }} />;
          }
          const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <Typography key={j} variant="body2" sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', mb: 0.3 }}>
              {boldParts.map((bp, k) =>
                bp.startsWith('**') && bp.endsWith('**') ? (
                  <Box key={k} component="span" sx={{ fontWeight: 700 }}>{bp.slice(2, -2)}</Box>
                ) : (
                  bp.startsWith('> ') ? (
                    <Box key={k} component="span" sx={{
                      color: 'text.secondary', fontStyle: 'italic',
                      borderLeft: '3px solid', borderColor: 'primary.main',
                      pl: 1.5, display: 'block', my: 0.5, py: 0.25,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                    }}>{bp.slice(2)}</Box>
                  ) : bp
                )
              )}
            </Typography>
          );
        })}
      </Box>
    );
  });
}

// =================== RAG来源展示组件 ===================
function SourcesPanel({ sources }: { sources: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small"
        startIcon={<Description sx={{ fontSize: 14 }} />}
        endIcon={expanded ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
        onClick={() => setExpanded(!expanded)}
        sx={{ fontSize: 11, textTransform: 'none', color: 'text.secondary', px: 1, py: 0.25 }}
      >
        参考来源 ({sources.length})
      </Button>
      <Collapse in={expanded}>
        <Box sx={{ mt: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'info.main' }}>
          {sources.map((src: any, i: number) => (
            <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Description sx={{ fontSize: 12, color: 'info.main' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>
                    {src.doc_name}
                  </Typography>
                  {src.chunk_index !== undefined && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      · 分块 {src.chunk_index + 1}
                    </Typography>
                  )}
                </Box>
                <Chip
                  icon={<Score sx={{ fontSize: 10 }} />}
                  label={src.score?.toFixed(2)}
                  size="small"
                  color={src.score >= 0.9 ? 'success' : src.score >= 0.8 ? 'info' : 'warning'}
                  variant="outlined"
                  sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                {src.content?.slice(0, 120)}{src.content?.length > 120 ? '...' : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// =================== 对话模式标签 ===================
const MODE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  chat: { label: '纯聊天', color: 'default', icon: <Forum sx={{ fontSize: 12 }} /> },
  rag: { label: '知识库问答', color: 'primary', icon: <MenuBook sx={{ fontSize: 12 }} /> },
};

// =================== 主组件 ===================
export default function ChatPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newMode, setNewMode] = useState<string>('rag');
  const [newKb, setNewKb] = useState('');
  const [newPolicy, setNewPolicy] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // 数据查询
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.sessions.list({ page: 1, page_size: 100 }),
  });
  const sessions: any[] = sessionsData?.data?.data || [];

  const { data: kbData } = useQuery({
    queryKey: ['chat-kbs'],
    queryFn: () => ragApi.knowledgeBases.list({ page: 1, page_size: 200 }),
  });
  const kbs: any[] = kbData?.data?.data || [];

  const { data: policyData } = useQuery({
    queryKey: ['chat-policies'],
    queryFn: () => modelPoliciesApi.list({ page: 1, page_size: 50 }),
  });
  const policies: any[] = policyData?.data?.data || [];

  const { data: msgData } = useQuery({
    queryKey: ['chat-messages', selectedSession],
    queryFn: () => chatApi.messages.list(selectedSession),
    enabled: !!selectedSession,
  });
  const messages: any[] = msgData?.data?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingMsg, sending]);

  // 创建会话
  const createSessionMutation = useMutation({
    mutationFn: (data: any) => chatApi.sessions.create(data),
    onSuccess: (res) => {
      const session = res.data.data;
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      setSelectedSession(session.id);
      setNewDialogOpen(false);
      enqueueSnackbar('新对话已创建', { variant: 'success' });
    },
  });

  // 删除会话
  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => chatApi.sessions.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (selectedSession) setSelectedSession('');
      enqueueSnackbar('对话已删除', { variant: 'success' });
    },
  });

  // 自动从 URL 参数创建知识库问答会话
  useEffect(() => {
    const kbId = searchParams.get('kb_id');
    const kbName = searchParams.get('kb_name');
    const mode = searchParams.get('mode');
    if (kbId && kbName && mode === 'rag' && sessions.length > 0) {
      createSessionMutation.mutate({
        title: `${kbName} - 知识库问答`,
        mode: 'rag',
        model_policy_id: 'mp-1',
        model_policy: '通用对话策略',
        kb_id: kbId,
        kb_name: kbName,
      });
      setSearchParams({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || !selectedSession || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setPendingMsg(content);
    try {
      await chatApi.messages.send(selectedSession, content);
      setPendingMsg('');
      qc.invalidateQueries({ queryKey: ['chat-messages', selectedSession] });
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
    } catch {
      enqueueSnackbar('发送失败', { variant: 'error' });
      setPendingMsg('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreateSession = () => {
    const kbObj = kbs.find(k => k.id === newKb);
    const policyObj = policies.find(p => p.id === newPolicy);
    createSessionMutation.mutate({
      title: '新对话',
      mode: newMode,
      model_policy_id: newPolicy || 'mp-1',
      model_policy: policyObj?.name || '通用对话策略',
      kb_id: newMode === 'rag' ? newKb : '',
      kb_name: newMode === 'rag' ? (kbObj?.name || '') : '',
    });
  };

  const currentSession = sessions.find((s: any) => s.id === selectedSession);
  const filteredSessions = sessions.filter((s: any) =>
    !searchText || s.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 0 }}>
      {/* =================== 左侧：会话列表 =================== */}
      <Paper sx={{
        width: 320, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid', borderColor: 'divider', borderRadius: 0,
      }}>
        {/* 头部：新建 + 搜索 */}
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button
            fullWidth variant="contained" startIcon={<Add />} size="small"
            onClick={() => setNewDialogOpen(true)}
            sx={{ mb: 1, fontWeight: 600 }}
          >
            新建对话
          </Button>
          <TextField
            fullWidth size="small" placeholder="搜索对话..."
            value={searchText} onChange={e => setSearchText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
              },
            }}
          />
        </Box>

        {/* 会话列表 */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {sessionsLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : filteredSessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <AutoAwesome sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {searchText ? '未找到匹配的对话' : '暂无对话，点击上方新建'}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {filteredSessions.map((session: any) => {
                const modeConf = MODE_CONFIG[session.mode] || MODE_CONFIG.chat;
                return (
                  <ListItemButton
                    key={session.id}
                    selected={selectedSession === session.id}
                    onClick={() => setSelectedSession(session.id)}
                    sx={{
                      py: 1.5, px: 1.5, borderBottom: '1px solid', borderColor: 'action.hover',
                      '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Avatar sx={{
                          width: 28, height: 28, fontSize: 12,
                          bgcolor: session.mode === 'rag' ? 'primary.main' : 'grey.500',
                        }}>
                          {session.mode === 'rag' ? <MenuBook sx={{ fontSize: 14 }} /> :
                           <Forum sx={{ fontSize: 14 }} />}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{
                            fontWeight: selectedSession === session.id ? 600 : 400, fontSize: 13,
                          }}>
                            {session.title}
                          </Typography>
                        </Box>
                        <Tooltip title="删除">
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            deleteSessionMutation.mutate(session.id);
                          }} sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, pl: 4 }}>
                        <Chip
                          icon={modeConf.icon}
                          label={modeConf.label}
                          size="small" variant="outlined"
                          color={modeConf.color as any}
                          sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                        />
                        {session.kb_name && (
                          <Chip label={session.kb_name} size="small" variant="outlined"
                            sx={{ height: 18, fontSize: 10, maxWidth: 100 }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, pl: 4, mt: 0.25, display: 'block' }}>
                        {session.message_count}条消息 · {new Date(session.last_message_at).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      </Paper>

      {/* =================== 右侧：对话区域 =================== */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {!selectedSession ? (
          /* 欢迎页 */
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 4 }}>
            <AutoAwesome sx={{ fontSize: 72, color: 'primary.main', mb: 2, opacity: 0.8 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              OpenClaw AI 对话中心
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center', mb: 4 }}>
              与AI智能助手对话，支持两种模式：基于知识库的RAG增强问答，以及纯AI对话。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { icon: <MenuBook />, title: '知识库问答 (RAG)', desc: '关联知识库，AI基于文档检索回答', color: 'primary' },
                { icon: <Forum />, title: '纯AI对话', desc: '通用对话，无知识库增强', color: 'info' },
              ].map((item, i) => (
                <Paper key={i} sx={{
                  p: 2, width: 180, textAlign: 'center', cursor: 'pointer',
                  border: '1px solid', borderColor: 'divider',
                  '&:hover': { borderColor: `${item.color}.main`, boxShadow: 2 },
                  transition: 'all 0.2s',
                }} onClick={() => {
                  setNewMode(i === 0 ? 'rag' : 'chat');
                  setNewDialogOpen(true);
                }}>
                  <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: `${item.color}.main`, width: 40, height: 40 }}>
                    {item.icon}
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {/* 顶部配置栏 */}
            <Box sx={{
              px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper',
            }}>
              <Avatar sx={{
                width: 28, height: 28,
                bgcolor: currentSession?.mode === 'rag' ? 'primary.main' : 'grey.500',
              }}>
                {currentSession?.mode === 'rag' ? <MenuBook sx={{ fontSize: 14 }} /> :
                 <Forum sx={{ fontSize: 14 }} />}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }} noWrap>
                  {currentSession?.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Chip
                    icon={MODE_CONFIG[currentSession?.mode]?.icon}
                    label={MODE_CONFIG[currentSession?.mode]?.label}
                    size="small" variant="outlined"
                    color={MODE_CONFIG[currentSession?.mode]?.color as any}
                    sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                  />
                  <Chip
                    icon={<Psychology sx={{ fontSize: 10 }} />}
                    label={currentSession?.model_policy || '通用对话策略'}
                    size="small" variant="outlined"
                    sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                  />
                  {currentSession?.kb_name && (
                    <Chip
                      icon={<MenuBook sx={{ fontSize: 10 }} />}
                      label={currentSession.kb_name}
                      size="small" color="primary" variant="outlined"
                      sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                    />
                  )}
                </Box>
              </Box>
              <Tooltip title="刷新消息">
                <IconButton size="small" onClick={() => qc.invalidateQueries({ queryKey: ['chat-messages', selectedSession] })}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* 消息区域 */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    发送一条消息开始对话
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentSession?.mode === 'rag'
                      ? `AI 将从「${currentSession.kb_name}」中检索相关文档并生成回答`
                      : '基于通用知识进行对话'}
                  </Typography>
                </Box>
              ) : (
                messages.map((msg: any) => (
                  <Box key={msg.id} sx={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    mb: 2.5, gap: 1.5, maxWidth: '85%',
                    ml: msg.role === 'user' ? 'auto' : 0,
                  }}>
                    <Avatar sx={{
                      width: 34, height: 34, flexShrink: 0,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.200',
                      color: msg.role === 'user' ? 'white' : 'grey.700',
                    }}>
                      {msg.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                    </Avatar>
                    <Box sx={{ maxWidth: 'calc(100% - 50px)' }}>
                      <Paper elevation={0} sx={{
                        p: 2,
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                        color: msg.role === 'user' ? 'white' : 'text.primary',
                        border: msg.role === 'user' ? 'none' : '1px solid',
                        borderColor: 'divider',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}>
                        {msg.role === 'user' ? (
                          <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        ) : (
                          <Box>{formatMessage(msg.content)}</Box>
                        )}
                      </Paper>
                      {/* RAG来源展示 */}
                      {msg.role === 'assistant' && msg.sources && (
                        <SourcesPanel sources={msg.sources} />
                      )}
                      {/* 时间戳 */}
                      <Typography variant="caption" sx={{
                        display: 'block', mt: 0.5,
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                        color: 'text.disabled', fontSize: 10,
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
              {/* 正在发送的消息 */}
              {pendingMsg && (
                <Box sx={{ display: 'flex', flexDirection: 'row-reverse', mb: 2.5, gap: 1.5, maxWidth: '85%', ml: 'auto' }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: 'white' }}>
                    <Person sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: '16px 16px 4px 16px' }}>
                    <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{pendingMsg}</Typography>
                  </Paper>
                </Box>
              )}
              {/* AI思考中 */}
              {sending && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
                  <Avatar sx={{
                    width: 34, height: 34,
                    bgcolor: 'grey.200',
                    color: 'grey.700',
                  }}>
                    <SmartToy sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Paper elevation={0} sx={{
                    p: 2, border: '1px solid', borderColor: 'divider',
                    borderRadius: '16px 16px 16px 4px',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                  }}>
                    <CircularProgress size={16} />
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                        {currentSession?.mode === 'rag' ? 'AI 正在检索知识库并生成回答...' :
                         'AI 正在思考...'}
                      </Typography>
                      {currentSession?.mode === 'rag' && (
                        <LinearProgress sx={{ mt: 0.5, width: 120, height: 2, borderRadius: 1 }} />
                      )}
                    </Box>
                  </Paper>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* 输入区域 */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <TextField
                  fullWidth multiline maxRows={4} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    currentSession?.mode === 'rag' ? `向「${currentSession.kb_name}」知识库提问...` :
                    '输入消息...'
                  }
                  disabled={sending}
                  sx={{ '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || sending}>
                            <Send />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box sx={{ px: 1.5, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                    Enter 发送 · Shift+Enter 换行
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  {currentSession?.mode === 'rag' && currentSession?.kb_name && (
                    <Chip
                      icon={<MenuBook sx={{ fontSize: 10 }} />}
                      label={`RAG: ${currentSession.kb_name}`}
                      size="small" color="primary" variant="outlined"
                      sx={{ height: 18, fontSize: 10, '& .MuiChip-icon': { fontSize: 10 } }}
                    />
                  )}
                </Box>
              </Paper>
            </Box>
          </>
        )}
      </Box>

      {/* =================== 新建对话弹窗 =================== */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add fontSize="small" /> 新建对话
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择对话模式和配置，开始与 AI 互动
          </Typography>

          {/* 模式选择 */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>对话模式</Typography>
          <ToggleButtonGroup
            exclusive fullWidth size="small"
            value={newMode} onChange={(_, v) => { if (v) setNewMode(v); }}
            sx={{ mb: 2.5 }}
          >
            <ToggleButton value="rag" sx={{ textTransform: 'none', flex: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <MenuBook sx={{ fontSize: 20, display: 'block', mx: 'auto', mb: 0.5 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>知识库问答</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: 'text.secondary' }}>
                  RAG 增强回答
                </Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="chat" sx={{ textTransform: 'none', flex: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Forum sx={{ fontSize: 20, display: 'block', mx: 'auto', mb: 0.5 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>纯聊天</Typography>
                <Typography variant="caption" sx={{ display: 'block', fontSize: 10, color: 'text.secondary' }}>
                  通用知识对话
                </Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* 模型策略 */}
          <TextField
            fullWidth select size="small" label="模型策略"
            value={newPolicy} onChange={e => setNewPolicy(e.target.value)}
            sx={{ mb: 2 }}
            helperText="决定使用哪个模型源及其路由策略"
          >
            <MenuItem value="">使用默认策略</MenuItem>
            {policies.map((p: any) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} {p.is_default && '⭐'}
              </MenuItem>
            ))}
          </TextField>

          {/* RAG模式：选知识库 */}
          {newMode === 'rag' && (
            <TextField
              fullWidth select size="small" label="关联知识库"
              value={newKb} onChange={e => setNewKb(e.target.value)}
              sx={{ mb: 2 }}
              helperText="AI 将从选定知识库中检索相关文档片段作为回答依据"
            >
              <MenuItem value="" disabled>请选择知识库</MenuItem>
              {kbs.map((kb: any) => (
                <MenuItem key={kb.id} value={kb.id}>
                  {kb.name} ({kb.doc_count || 0}文档)
                </MenuItem>
              ))}
            </TextField>
          )}

        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewDialogOpen(false)}>取消</Button>
          <Button
            variant="contained" onClick={handleCreateSession}
            disabled={
              createSessionMutation.isPending ||
              (newMode === 'rag' && !newKb)
            }
          >
            创建对话
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
