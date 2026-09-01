import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Avatar, TextField, Chip,
  IconButton, Tooltip, Divider, Menu, MenuItem, Switch, Button,
  List, ListItemButton, ListItemText, Checkbox,
  Collapse, CircularProgress, Drawer,
} from '@mui/material';
import {
  Send, SmartToy, Person, Add, Mic, KeyboardArrowDown,
  ContentCopy, ThumbUp, ThumbDown, Share, MoreHoriz,
  InsertDriveFile, OpenInNew, Close, Folder, Search,
  ChatBubbleOutlined, AutoFixHigh, CheckCircle,
  ExpandMore, ExpandLess, Description, Score,
  AttachFile, Extension, MenuBook, Code,
  AccessTime, LastPage, KeyboardArrowUp,
  Download, PersonAdd,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { chatApi } from '../../api/client';
import ShareDialog from './ShareDialog';
import AddMembersDialog from './AddMembersDialog';

// =================== 相对时间 ===================
function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// =================== 公共数据 ===================
const MODELS = [
  { id: 'auto', name: 'Auto', tag: '', multiplier: '1.0x', desc: '自动选择最优模型' },
  { id: 'max', name: '极致', tag: '', multiplier: '1.6x', desc: '最强推理能力' },
  { id: 'performance', name: '性能', tag: '', multiplier: '1.1x', desc: '平衡速度与质量' },
  { id: 'economy', name: '经济', tag: '', multiplier: '0.3x', desc: '低成本快速响应' },
  { id: 'lightweight', name: '轻量', tag: '', multiplier: '0.0x', desc: '最快速度' },
  { id: 'qwen3.7-max', name: 'Qwen3.7-Max', tag: '🔥', multiplier: '0.25x', desc: '通义千问旗舰模型' },
  { id: 'qwen3.7-plus', name: 'Qwen3.7-Plus', tag: '🔥', multiplier: '0.1x', desc: '通义千问增强版' },
  { id: 'glm-5.2', name: 'GLM-5.2', tag: '🟢', multiplier: '0.6x', desc: '智谱最新模型' },
  { id: 'kimi-k2.7-code', name: 'Kimi-K2.7-Code', tag: '', multiplier: '0.5x', desc: '专注长上下文编程' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', tag: '', multiplier: '0.5x', desc: '深度求索专业版' },
  { id: 'minimax-m3', name: 'MiniMax-M3', tag: '', multiplier: '0.2x', desc: 'MiniMax最新模型' },
];

const MODES = [
  { id: 'chat', label: '对话', icon: <SmartToy sx={{ fontSize: 16 }} />, desc: '自由对话，灵活应答' },
  { id: 'plan', label: '规划', icon: <AutoFixHigh sx={{ fontSize: 16 }} />, desc: '分解任务，逐步执行' },
  { id: 'ask', label: '问答', icon: <SmartToy sx={{ fontSize: 16 }} />, desc: '精准回答，简洁高效' },
];

const SKILLS_MOCK = [
  { id: 's1', name: '文档总结', desc: '自动提取文档要点' },
  { id: 's2', name: '代码审查', desc: '检查代码质量与规范' },
  { id: 's3', name: '数据分析', desc: '可视化数据分析报告' },
];

const KB_MOCK = [
  { id: 'kb1', name: '产品文档库', count: 128 },
  { id: 'kb2', name: '技术规范库', count: 56 },
  { id: 'kb3', name: '常见问题库', count: 234 },
];

const WORKSPACES = [
  { id: '123', name: '123' },
  { id: 'openclaw-main', name: 'openclaw-main' },
];

const PERMISSIONS = [
  { id: 'default', label: '默认权限', desc: '使用系统默认的安全策略' },
  { id: 'public', label: '公开访问', desc: '所有用户均可查看对话内容' },
  { id: 'team', label: '团队可见', desc: '仅团队成员可以访问' },
  { id: 'private', label: '仅自己', desc: '完全私有，其他人不可见' },
];

// =================== Markdown 渲染 ===================
function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.slice(3, -3);
      const lines = code.split('\n');
      const lang = lines[0].trim();
      const codeContent = lang && !lines[0].includes(' ') ? lines.slice(1).join('\n') : code;
      return (
        <Box key={i} sx={{
          bgcolor: 'rgba(0,0,0,0.04)', p: 2, borderRadius: 1.5,
          fontFamily: 'monospace', fontSize: 12, overflow: 'auto', my: 1,
          border: '1px solid', borderColor: 'divider', whiteSpace: 'pre-wrap', lineHeight: 1.6,
        }}>
          {lang && !lines[0].includes(' ') && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1, fontWeight: 600 }}>{lang}</Typography>
          )}
          {codeContent}
        </Box>
      );
    }
    const lines = part.split('\n');
    return (
      <Box key={i}>
        {lines.map((line, j) => {
          if (line.startsWith('# ')) return <Typography key={j} sx={{ fontSize: 20, fontWeight: 700, mt: 1.5, mb: 0.5 }}>{line.slice(2)}</Typography>;
          if (line.startsWith('## ')) return <Typography key={j} sx={{ fontSize: 16, fontWeight: 700, mt: 1.5, mb: 0.5 }}>{line.slice(3)}</Typography>;
          if (line.startsWith('### ')) return <Typography key={j} sx={{ fontSize: 14, fontWeight: 700, mt: 1, mb: 0.5 }}>{line.slice(4)}</Typography>;
          if (line.startsWith('- **')) {
            const match = line.match(/^- \*\*(.+?)\*\*[：:]\s*(.+)$/);
            if (match) return <Typography key={j} sx={{ fontSize: 13, lineHeight: 1.7, ml: 1, mb: 0.3 }}>• <Box component="span" sx={{ fontWeight: 700 }}>{match[1]}</Box>：{match[2]}</Typography>;
          }
          if (line.startsWith('- ')) return <Typography key={j} sx={{ fontSize: 13, lineHeight: 1.7, ml: 1, mb: 0.3 }}>• {line.slice(2)}</Typography>;
          if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*[ —-]\s*(.+)$/);
            if (match) return <Typography key={j} sx={{ fontSize: 13, lineHeight: 1.7, ml: 1, mb: 0.3 }}>{match[1]}. <Box component="span" sx={{ fontWeight: 700 }}>{match[2]}</Box> — {match[3]}</Typography>;
            return <Typography key={j} sx={{ fontSize: 13, lineHeight: 1.7, ml: 1, mb: 0.3 }}>{line}</Typography>;
          }
          if (line.startsWith('---')) return <Divider key={j} sx={{ my: 1.5 }} />;
          const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <Typography key={j} sx={{ fontSize: 13, lineHeight: 1.7, mb: 0.3, whiteSpace: 'pre-wrap' }}>
              {boldParts.map((bp, k) => bp.startsWith('**') && bp.endsWith('**') ? <Box key={k} component="span" sx={{ fontWeight: 700 }}>{bp.slice(2, -2)}</Box> : bp)}
            </Typography>
          );
        })}
      </Box>
    );
  });
}

// =================== RAG 来源展示 ===================
function SourcesPanel({ sources }: { sources: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Button size="small" startIcon={<Description sx={{ fontSize: 14 }} />} endIcon={expanded ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />} onClick={() => setExpanded(!expanded)} sx={{ fontSize: 11, textTransform: 'none', color: 'text.secondary', px: 1, py: 0.25 }}>
        参考来源 ({sources.length})
      </Button>
      <Collapse in={expanded}>
        <Box sx={{ mt: 0.5, pl: 1, borderLeft: '2px solid', borderColor: 'info.main' }}>
          {sources.map((src: any, i: number) => (
            <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Description sx={{ fontSize: 12, color: 'info.main' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>{src.doc_name}</Typography>
                </Box>
                <Chip icon={<Score sx={{ fontSize: 10 }} />} label={src.score?.toFixed(2)} size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              </Box>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>{src.content?.slice(0, 120)}{src.content?.length > 120 ? '...' : ''}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// =================== 主组件 ===================
export default function ConversationPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 分享弹窗
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSelected, setShareSelected] = useState<{ id: string; role: string; content: string }[]>([]);

  // + 菜单
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusAnchor, setPlusAnchor] = useState<null | HTMLElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState('chat');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [plusSubMenu, setPlusSubMenu] = useState<string | null>(null);

  // 模型菜单
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelAnchor, setModelAnchor] = useState<null | HTMLElement>(null);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [maxMode, setMaxMode] = useState(false);

  // 语音
  const [isRecording, setIsRecording] = useState(false);

  // 搜索对话内容
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchCurrentIdx, setSearchCurrentIdx] = useState(0);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // 历史提问菜单
  const [historyAnchor, setHistoryAnchor] = useState<null | HTMLElement>(null);
  const [flashMsgId, setFlashMsgId] = useState<string | null>(null);

  // 右栏概览面板
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // 拉人弹窗
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  // 群成员操作菜单
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<null | HTMLElement>(null);
  const [memberMenuUid, setMemberMenuUid] = useState<string | null>(null);

  // 产物预览 Drawer
  const [previewArtifact, setPreviewArtifact] = useState<{ name: string; type: string; content: string } | null>(null);

  // 消息 refs（用于 scrollIntoView）
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ---- 选择模式 ----
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ESC 退出选择模式
  useEffect(() => {
    if (!selectMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectMode(false); setSelectedIds(new Set()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectMode]);

  // 工作空间
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceAnchor, setWorkspaceAnchor] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('123');
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // 权限
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [permAnchor, setPermAnchor] = useState<null | HTMLElement>(null);
  const [selectedPerm, setSelectedPerm] = useState('default');

  // API 查询：会话信息
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => chatApi.sessions.get(sessionId!),
    enabled: !!sessionId,
  });
  const session: any = sessionData?.data?.data;

  // API 查询：消息列表
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: () => chatApi.messages.list(sessionId!),
    enabled: !!sessionId,
  });
  const messages: any[] = messagesData?.data?.data || [];

  const isReadonly = session?.readonly === true;
  const sharedFrom = session?.shared_from;
  const isGroup = session?.session_type === 'group';
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  // 群组：人机分流目标
  const [targetAI, setTargetAI] = useState(true);

  // 群组：用户列表查询（用于解析成员）
  const { data: allUsersData } = useQuery({
    queryKey: ['all-users-for-group'],
    queryFn: async () => {
      // 直接返回已知用户列表（mock 模式）
      return [
        { id: 'u-1', name: '张伟' },
        { id: 'u-2', name: '李思' },
        { id: 'u-3', name: '王五' },
        { id: 'u-4', name: '赵六' },
        { id: 'u-5', name: '陈晨' },
      ];
    },
    enabled: !!sessionId,
  });
  const allUsers: any[] = allUsersData || [];

  // 群组：文字头像色板
  const AVATAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  const getUserColor = (userId?: string) => {
    if (!userId) return '#6366f1';
    if (userId === 'u-1') return '#6366f1'; // 自己固定紫色
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };
  const getUserName = (userId?: string) => {
    if (!userId) return '';
    const u = allUsers.find((x: any) => x.id === userId);
    return u?.name || '';
  };

  // 发送消息 mutation
  const sendMut = useMutation({
    mutationFn: ({ content, extra }: { content: string; extra?: { to_ai?: boolean; user_name?: string } }) =>
      chatApi.messages.send(sessionId!, content, extra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      setSending(false);
    },
    onError: () => {
      enqueueSnackbar('发送失败', { variant: 'error' });
      setSending(false);
    },
  });

  // 移除成员 mutation
  const removeMemberMut = useMutation({
    mutationFn: ({ uid }: { uid: string }) => chatApi.sessions.removeMember(sessionId!, uid),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      qc.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      // 自己退出后跳转到聊天首页
      if (variables.uid === 'u-1') {
        navigate('/chat');
      }
      setMemberMenuAnchor(null);
      setMemberMenuUid(null);
    },
    onError: () => {
      enqueueSnackbar('操作失败', { variant: 'error' });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || sending || isReadonly) return;
    setSending(true);
    const extra = isGroup ? { to_ai: targetAI, user_name: '张伟' } : undefined;
    sendMut.mutate({ content: input.trim(), extra });
    setInput('');
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]);
  };
  const toggleKB = (kbId: string) => {
    setSelectedKBs(prev => prev.includes(kbId) ? prev.filter(id => id !== kbId) : [...prev, kbId]);
  };
  const removeFile = (file: string) => {
    setAttachedFiles(prev => prev.filter(f => f !== file));
  };
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => { setInput(prev => prev + '这是语音输入的内容'); setIsRecording(false); }, 2000);
    }
  };

  const openShareDialog = (_msg?: { id: string; content: string }) => {
    // 进入选择模式
    setSelectMode(true);
    if (_msg) {
      // 入口 B：仅预选该条
      setSelectedIds(new Set([_msg.id]));
    } else {
      // 入口 A：默认全选
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (msgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const selectedCount = selectedIds.size;
  const allSelected = messages.length > 0 && selectedCount === messages.length;
  const indeterminate = selectedCount > 0 && selectedCount < messages.length;

  // ---- 搜索逻辑 ----
  const searchResults = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const kw = searchKeyword.toLowerCase();
    return messages.filter(m => m.content?.toLowerCase().includes(kw));
  }, [messages, searchKeyword]);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = msgRefs.current[msgId];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const navigateSearch = (dir: 'prev' | 'next') => {
    if (searchResults.length === 0) return;
    let newIdx = dir === 'next' ? searchCurrentIdx + 1 : searchCurrentIdx - 1;
    if (newIdx < 0) newIdx = searchResults.length - 1;
    if (newIdx >= searchResults.length) newIdx = 0;
    setSearchCurrentIdx(newIdx);
    const msg = searchResults[newIdx];
    if (msg) {
      setHighlightedMsgId(msg.id);
      scrollToMessage(msg.id);
    }
  };

  // 搜索关键词变化时重置
  useEffect(() => {
    if (searchKeyword) {
      setSearchCurrentIdx(0);
      if (searchResults.length > 0) {
        setHighlightedMsgId(searchResults[0].id);
        scrollToMessage(searchResults[0].id);
      }
    } else {
      setHighlightedMsgId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

  // 闪烁高亮
  const flashMessage = useCallback((msgId: string) => {
    setFlashMsgId(msgId);
    scrollToMessage(msgId);
    setTimeout(() => setFlashMsgId(null), 1200);
  }, [scrollToMessage]);

  // ---- 产物聚合 ----
  const allArtifacts = useMemo(() => {
    const arts: { name: string; type: string; content: string; msgId: string }[] = [];
    messages.forEach(m => {
      if (m.attachments) {
        m.attachments.forEach((a: any) => arts.push({ ...a, msgId: m.id }));
      }
    });
    return arts;
  }, [messages]);

  // 加载态
  if (sessionLoading || messagesLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} sx={{ color: '#6366f1' }} />
      </Box>
    );
  }

  // 会话不存在
  if (!session) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">对话不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      {/* ===== 左侧主内容区 ===== */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {/* 标题栏 */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, flex: 1 }}>
          {session.title}
        </Typography>
        {isGroup && (
          <Chip label="群组" size="small" icon={<Person sx={{ fontSize: 12 }} />} sx={{ height: 22, fontSize: 11, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 500, '& .MuiChip-icon': { color: '#10b981' } }} />
        )}
        {isGroup && !isReadonly && (
          <Chip
            label={`成员 ${session?.member_ids?.length || 0}`}
            size="small"
            variant="outlined"
            onClick={() => setRightPanelOpen(true)}
            sx={{ height: 22, fontSize: 11, fontWeight: 500, borderColor: 'divider', color: 'text.secondary', cursor: 'pointer', '&:hover': { borderColor: '#6366f1', color: '#6366f1' } }}
          />
        )}
        {isReadonly && (
          <Chip label="只读分享" size="small" sx={{ height: 22, fontSize: 11, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 500 }} />
        )}

        {/* 工具栏：搜索 */}
        {searchOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'action.hover', borderRadius: 2, px: 1.5, py: 0.5 }}>
            <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索对话内容..."
              style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', fontSize: 13, width: 140 }}
              autoFocus
            />
            {searchKeyword && (
              <>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {searchResults.length === 0 ? '无结果' : `${searchCurrentIdx + 1} / ${searchResults.length}`}
                </Typography>
                <IconButton size="small" onClick={() => navigateSearch('prev')} sx={{ width: 22, height: 22, color: 'text.secondary' }}>
                  <KeyboardArrowUp sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => navigateSearch('next')} sx={{ width: 22, height: 22, color: 'text.secondary' }}>
                  <KeyboardArrowDown sx={{ fontSize: 16 }} />
                </IconButton>
              </>
            )}
            <IconButton size="small" onClick={() => { setSearchOpen(false); setSearchKeyword(''); setHighlightedMsgId(null); }} sx={{ width: 22, height: 22, color: 'text.secondary' }}>
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ) : (
          <Tooltip title="搜索对话内容">
            <IconButton size="small" onClick={() => setSearchOpen(true)} sx={{ color: 'text.secondary', width: 28, height: 28, '&:hover': { color: '#6366f1' } }}>
              <Search sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 工具栏：分享 */}
        <Tooltip title="分享">
          <IconButton size="small" onClick={() => openShareDialog()} sx={{ color: 'text.secondary', width: 28, height: 28, '&:hover': { color: '#6366f1' } }}>
            <Share sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* 工具栏：拉人进群 / 转为群组 */}
        {!isReadonly && (
          <Tooltip title={isGroup ? '添加成员' : '转为群组'}>
            <IconButton size="small" onClick={() => setAddMembersOpen(true)} sx={{ color: 'text.secondary', width: 28, height: 28, '&:hover': { color: '#6366f1' } }}>
              <PersonAdd sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 工具栏：历史提问 */}
        <Tooltip title="历史提问">
          <IconButton size="small" onClick={(e) => setHistoryAnchor(e.currentTarget)} sx={{ color: 'text.secondary', width: 28, height: 28, '&:hover': { color: '#6366f1' } }}>
            <AccessTime sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        {/* 工具栏：展开右栏 */}
        <Tooltip title={rightPanelOpen ? '收起概览' : '展开概览'}>
          <IconButton size="small" onClick={() => setRightPanelOpen(!rightPanelOpen)} sx={{ width: 28, height: 28, color: rightPanelOpen ? '#6366f1' : 'text.secondary', '&:hover': { color: '#6366f1' } }}>
            <LastPage sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 消息区域 */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
        {/* 转交/分享横幅 */}
        {sharedFrom && (
          <Box sx={{
            mb: 3, px: 2.5, py: 2, borderRadius: 2,
            bgcolor: 'rgba(99,102,241,0.06)',
            border: '1px solid', borderColor: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
          }}>
            <Share sx={{ fontSize: 18, color: '#6366f1', mt: 0.25, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>
                本对话由 {sharedFrom.name} {isReadonly ? '分享' : '转交'}（共 {messages.length} 条消息）
              </Typography>
              {sharedFrom.note && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, lineHeight: 1.6 }}>
                  附言：{sharedFrom.note}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {messages.length === 0 ? (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ChatBubbleOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">暂无消息</Typography>
          </Box>
        ) : (
          messages.map((msg: any) => {
            // 系统消息：居中灰字
            if (msg.role === 'system') {
              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{msg.content}</Typography>
                </Box>
              );
            }
            // 群模式：判断消息归属
            const isSelf = isGroup && msg.role === 'user' && msg.user_id === 'u-1';
            const isOtherUser = isGroup && msg.role === 'user' && msg.user_id !== 'u-1';
            const isAI = msg.role === 'assistant';
            const msgOnRight = !isGroup ? msg.role === 'user' : isSelf;
            const msgOnLeft = !isGroup ? msg.role !== 'user' : !isSelf;
            const userColor = getUserColor(msg.user_id);
            const userName = msg.user_name || getUserName(msg.user_id);

            return (
            <Box key={msg.id} ref={(el: HTMLDivElement | null) => { msgRefs.current[msg.id] = el; }} sx={{
              display: 'flex', flexDirection: (msgOnRight && !selectMode) ? 'row-reverse' : 'row',
              mb: 3, gap: 1.5, maxWidth: msgOnRight ? '70%' : '85%',
              ml: msgOnRight ? 'auto' : 0,
              transition: 'all 0.3s',
              ...(highlightedMsgId === msg.id ? { outline: '2px solid #6366f1', outlineOffset: 4, borderRadius: 2 } : {}),
              ...(flashMsgId === msg.id ? { animation: 'flashBg 1.2s ease-out' } : {}),
              ...(selectMode ? { maxWidth: '80%' } : {}),
            }}>
              {/* 选择模式：勾选框 */}
              {selectMode && (
                <Checkbox
                  checked={selectedIds.has(msg.id)}
                  onChange={() => toggleSelect(msg.id)}
                  sx={{
                    flexShrink: 0, alignSelf: 'flex-start', mt: 0.5,
                    color: 'text.secondary',
                    '&.Mui-checked': { color: '#6366f1' },
                  }}
                />
              )}
              {/* 头像 */}
              {isGroup && msg.role === 'user' ? (
                <Avatar sx={{
                  width: 32, height: 32, flexShrink: 0, fontSize: 13, fontWeight: 600,
                  bgcolor: userColor, color: 'white',
                }}>
                  {(msg.user_name || '?').charAt(0)}
                </Avatar>
              ) : (
                <Avatar sx={{
                  width: 32, height: 32, flexShrink: 0, fontSize: 13,
                  bgcolor: msg.role === 'user' ? '#6366f1' : 'transparent',
                  border: msg.role === 'assistant' ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}>
                  {msg.role === 'user' ? <Person sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
                </Avatar>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* 群模式：发送人姓名（他人的消息） */}
                {isGroup && isOtherUser && (
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: userColor, mb: 0.5, ml: 0.5 }}>
                    {userName}
                    {msg.to_ai === false && (
                      <Box component="span" sx={{ ml: 0.5, fontSize: 10, color: 'text.secondary', fontWeight: 400 }}>对人</Box>
                    )}
                  </Typography>
                )}
                {isGroup && isSelf && msg.to_ai === false && (
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, textAlign: 'right', mr: 0.5 }}>对人</Typography>
                )}
                <Paper elevation={0} sx={{
                  p: 2, bgcolor: msgOnRight && !isGroup ? '#6366f1' : isGroup && isSelf ? '#6366f1' : 'transparent',
                  color: (msgOnRight && !isGroup) || (isGroup && isSelf) ? 'white' : 'text.primary', borderRadius: 2,
                  ...(selectMode ? { cursor: 'pointer', border: selectedIds.has(msg.id) ? '1.5px solid #6366f1' : '1px solid transparent' } : {}),
                }}
                  onClick={selectMode ? () => toggleSelect(msg.id) : undefined}
                >
                  {msg.role === 'user' ? (
                    <Typography sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                  ) : renderContent(msg.content)}
                </Paper>

                {msg.attachments && msg.attachments.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    {msg.attachments.map((att: any, idx: number) => (
                      <Box key={idx} sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 1.5,
                        bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', mb: 0.5, cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.selected' },
                      }}>
                        <InsertDriveFile sx={{ fontSize: 18, color: '#6366f1' }} />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 500, flex: 1 }}>{att.name}</Typography>
                        <OpenInNew sx={{ fontSize: 14, color: 'text.secondary' }} />
                      </Box>
                    ))}
                  </Box>
                )}

                {msg.role === 'assistant' && !selectMode && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                    <Tooltip title="复制"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ContentCopy sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Tooltip title="有用"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ThumbUp sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Tooltip title="无用"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ThumbDown sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Tooltip title="分享"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }} onClick={() => openShareDialog({ id: msg.id, content: msg.content })}><Share sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Tooltip title="更多"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><MoreHoriz sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                    <Box sx={{ flex: 1 }} />
                    {msg.tokens != null && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>共消耗 ◇ {Number(msg.tokens).toFixed(1)}</Typography>}
                    {msg.model && <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5 }}>{msg.model}</Typography>}
                    {msg.created_at && <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5 }}>{formatTime(msg.created_at)}</Typography>}
                  </Box>
                )}
                {msg.role === 'assistant' && msg.sources && <SourcesPanel sources={msg.sources} />}
              </Box>
            </Box>
            );
          })
        )}

        {/* AI 正在思考 */}
        {sending && !(isGroup && !targetAI) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, ml: 5.5 }}>
            <CircularProgress size={16} sx={{ color: '#6366f1' }} />
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>AI 正在思考...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* ===== 选择模式底部操作条 ===== */}
      {selectMode && (
        <Box sx={{
          position: 'relative', mx: 2, mb: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, borderRadius: 2.5,
          bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          zIndex: 10,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Checkbox
              checked={allSelected}
              indeterminate={indeterminate}
              onChange={toggleSelectAll}
              sx={{ color: 'text.secondary', '&.Mui-checked': { color: '#6366f1' } }}
            />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
              已选 {selectedCount} 条
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={selectedCount === 0 ? '至少选择一条消息' : ''}>
              <span>
                <Button
                  variant="contained"
                  size="small"
                  disabled={selectedCount === 0}
                  onClick={() => {
                    const selectedMsgs = messages
                      .filter(m => selectedIds.has(m.id))
                      .map(m => ({ id: m.id, role: m.role, content: m.content }));
                    setShareOpen(true);
                    setShareSelected(selectedMsgs);
                  }}
                  sx={{
                    fontSize: 13, textTransform: 'none', borderRadius: 2,
                    bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' },
                    '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.5)' },
                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                  }}
                >
                  分享
                </Button>
              </span>
            </Tooltip>
            <IconButton size="small" onClick={exitSelectMode} sx={{ color: 'text.secondary' }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* ===== 只读模式提示 ===== */}
      {isReadonly ? (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            py: 1.5, px: 2, borderRadius: 2,
            bgcolor: 'rgba(99,102,241,0.06)', border: '1px solid', borderColor: 'rgba(99,102,241,0.12)',
          }}>
            <ChatBubbleOutlined sx={{ fontSize: 16, color: '#6366f1' }} />
            <Typography sx={{ fontSize: 13, color: '#6366f1' }}>该对话为只读分享，仅可查看</Typography>
          </Box>
        </Box>
      ) : (
      /* ===== 输入区域（与 ChatPage 完全一致） ===== */
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {/* 已选内容标签 */}
        {(attachedFiles.length > 0 || selectedSkills.length > 0 || selectedKBs.length > 0) && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap', px: 0.5, alignItems: 'center' }}>
            {attachedFiles.map((file) => (
              <Box key={`f-${file}`} sx={{
                display: 'flex', alignItems: 'center', gap: 0.3, px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)',
                '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 }, '&:hover .close-icon': { opacity: 1 },
              }}>
                <InsertDriveFile sx={{ fontSize: 12 }} />{file}
                <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }} onClick={() => removeFile(file)} />
              </Box>
            ))}
            {selectedSkills.map((skillId) => {
              const skill = SKILLS_MOCK.find(s => s.id === skillId);
              return skill ? (
                <Box key={`s-${skillId}`} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.3, px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                  bgcolor: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.15)',
                  '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 }, '&:hover .close-icon': { opacity: 1 },
                }}>
                  <AutoFixHigh sx={{ fontSize: 12 }} />{skill.name}
                  <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }} onClick={() => toggleSkill(skillId)} />
                </Box>
              ) : null;
            })}
            {selectedKBs.map((kbId) => {
              const kb = KB_MOCK.find(k => k.id === kbId);
              return kb ? (
                <Box key={`k-${kbId}`} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.3, px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                  bgcolor: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.15)',
                  '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 }, '&:hover .close-icon': { opacity: 1 },
                }}>
                  <MenuBook sx={{ fontSize: 12 }} />{kb.name}
                  <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }} onClick={() => toggleKB(kbId)} />
                </Box>
              ) : null;
            })}
          </Box>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'visible' }}>
          <TextField
            fullWidth multiline maxRows={6} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
            placeholder="今天帮你做些什么？@引用对话文件，/调用技能与指令"
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-input': { px: 2.5, pt: 2, pb: 1, fontSize: 14 },
            }}
          />

          {/* 底部工具栏 */}
          <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {/* 群模式：人机分流切换 */}
            {isGroup && (
              <Chip
                label={targetAI ? '对 AI' : '对人'}
                size="small"
                onClick={() => setTargetAI(!targetAI)}
                sx={{
                  fontWeight: 600, fontSize: 12, cursor: 'pointer',
                  bgcolor: targetAI ? '#6366f1' : 'action.hover',
                  color: targetAI ? 'white' : 'text.secondary',
                  border: targetAI ? 'none' : '1px solid',
                  borderColor: targetAI ? 'transparent' : 'divider',
                  '&:hover': { bgcolor: targetAI ? '#4f46e5' : 'action.selected' },
                }}
              />
            )}
            {/* + 按钮 */}
            <Box onClick={(e) => { setPlusAnchor(e.currentTarget); setPlusMenuOpen(!plusMenuOpen); setPlusSubMenu(null); }} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 2,
              cursor: 'pointer', color: 'text.secondary', transition: 'all 0.15s',
              '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
            }}><Add sx={{ fontSize: 20 }} /></Box>

            {/* 已选模式 Tab */}
            {selectedMode !== 'chat' && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.35, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)',
                '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 14 }, '&:hover .close-icon': { opacity: 1 },
              }}>
                <ChatBubbleOutlined sx={{ fontSize: 13 }} />{MODES.find(m => m.id === selectedMode)?.label || '模式'}
                <Close className="close-icon" sx={{ fontSize: 14, cursor: 'pointer', ml: 0.25 }} onClick={() => setSelectedMode('chat')} />
              </Box>
            )}

            <Box sx={{ flex: 1 }} />

            {/* 语音 */}
            <Box onClick={toggleRecording} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 2,
              cursor: 'pointer', color: isRecording ? '#ef4444' : 'text.secondary',
              bgcolor: isRecording ? 'rgba(239,68,68,0.1)' : 'transparent', transition: 'all 0.2s',
              '&:hover': { color: isRecording ? '#dc2626' : '#6366f1', bgcolor: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.06)' },
            }}>{isRecording ? <Mic sx={{ fontSize: 18 }} /> : <Mic sx={{ fontSize: 18 }} />}</Box>

            {/* 模型选择 */}
            <Box onClick={(e) => { setModelAnchor(e.currentTarget); setModelMenuOpen(!modelMenuOpen); }} sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, px: 1.25, py: 0.5, borderRadius: 1.5,
              cursor: 'pointer', color: 'text.secondary', fontSize: 12, fontWeight: 500,
              border: '1px solid', borderColor: 'divider', transition: 'all 0.15s',
              '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
            }}>
              <SmartToy sx={{ fontSize: 14 }} />{currentModel.name}
              {maxMode && <Chip label="Max" size="small" sx={{ height: 16, fontSize: 9, ml: 0.5, bgcolor: '#6366f1', color: 'white' }} />}
              <KeyboardArrowDown sx={{ fontSize: 14 }} />
            </Box>

            {/* 发送 */}
            <Box
              onClick={handleSend}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 2,
                cursor: input.trim() && !sending ? 'pointer' : 'default',
                bgcolor: input.trim() && !sending ? '#6366f1' : 'action.disabledBackground',
                color: input.trim() && !sending ? 'white' : 'text.disabled', transition: 'all 0.2s',
                '&:hover': { bgcolor: input.trim() && !sending ? '#4f46e5' : undefined },
                boxShadow: input.trim() && !sending ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              }}
            ><Send sx={{ fontSize: 15 }} /></Box>
          </Box>
        </Paper>

        {/* 工作空间 + 权限 */}
        <Box sx={{ mt: 1, display: 'flex', gap: 0.75, justifyContent: 'flex-start' }}>
          <Box onClick={(e) => { setWorkspaceAnchor(e.currentTarget); setWorkspaceMenuOpen(!workspaceMenuOpen); }} sx={{
            display: 'flex', alignItems: 'center', gap: 0.4, px: 1.25, py: 0.5, borderRadius: 1.5,
            cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'text.secondary',
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', transition: 'all 0.15s',
            '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
          }}>
            <Folder sx={{ fontSize: 13 }} />{selectedWorkspace || '选择工作空间'}
            <KeyboardArrowDown sx={{ fontSize: 14, ml: 0.25 }} />
          </Box>
          <Box onClick={(e) => { setPermAnchor(e.currentTarget); setPermMenuOpen(!permMenuOpen); }} sx={{
            display: 'flex', alignItems: 'center', gap: 0.4, px: 1.25, py: 0.5, borderRadius: 1.5,
            cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'text.secondary',
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', transition: 'all 0.15s',
            '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
          }}>
            <CheckCircle sx={{ fontSize: 13 }} />{PERMISSIONS.find(p => p.id === selectedPerm)?.label || '默认权限'}
            <KeyboardArrowDown sx={{ fontSize: 14, ml: 0.25 }} />
          </Box>
        </Box>
      </Box>
      )}

      {/* ===== + 弹出菜单 ===== */}
      <Menu anchorEl={plusAnchor} open={plusMenuOpen} onClose={() => { setPlusMenuOpen(false); setPlusSubMenu(null); }}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        sx={{ '& .MuiPaper-root': { mt: 0.5, minWidth: 220, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', py: 0.5 } }}>
        {!plusSubMenu ? (
          <>
            <MenuItem onClick={() => setPlusSubMenu('file')} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
              <AttachFile sx={{ fontSize: 18, color: '#6366f1' }} />
              <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>添加文件</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>上传图片、文档等</Typography></Box>
              <ExpandMore sx={{ fontSize: 16, color: 'text.disabled' }} />
            </MenuItem>
            <MenuItem onClick={() => setPlusSubMenu('mode')} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
              <SmartToy sx={{ fontSize: 18, color: '#8b5cf6' }} />
              <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>模式</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{MODES.find(m => m.id === selectedMode)?.label || '对话'}</Typography></Box>
              <ExpandMore sx={{ fontSize: 16, color: 'text.disabled' }} />
            </MenuItem>
            <MenuItem onClick={() => setPlusSubMenu('skill')} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
              <Extension sx={{ fontSize: 18, color: '#f59e0b' }} />
              <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>技能</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{selectedSkills.length > 0 ? `已选 ${selectedSkills.length} 个` : '选择技能插件'}</Typography></Box>
              <ExpandMore sx={{ fontSize: 16, color: 'text.disabled' }} />
            </MenuItem>
            <MenuItem onClick={() => setPlusSubMenu('kb')} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
              <MenuBook sx={{ fontSize: 18, color: '#10b981' }} />
              <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>知识库</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{selectedKBs.length > 0 ? `已选 ${selectedKBs.length} 个` : '选择知识库'}</Typography></Box>
              <ExpandMore sx={{ fontSize: 16, color: 'text.disabled' }} />
            </MenuItem>
          </>
        ) : plusSubMenu === 'file' ? (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>添加文件</Typography>
              <Box onClick={() => setPlusSubMenu(null)} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}><ExpandMore sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /></Box>
            </Box>
            <Divider />
            {['上传图片', '上传文档', '从工作空间选择'].map((item) => (
              <MenuItem key={item} onClick={() => { setAttachedFiles(prev => [...prev, item === '上传图片' ? 'image.png' : item === '上传文档' ? 'document.pdf' : 'workspace-file.tsx']); setPlusMenuOpen(false); setPlusSubMenu(null); }} sx={{ py: 1, px: 2, gap: 1.5 }}>
                <Folder sx={{ fontSize: 16, color: '#6366f1' }} /><Typography sx={{ fontSize: 13 }}>{item}</Typography>
              </MenuItem>
            ))}
          </>
        ) : plusSubMenu === 'mode' ? (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>选择模式</Typography>
              <Box onClick={() => setPlusSubMenu(null)} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}><ExpandMore sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /></Box>
            </Box>
            <Divider />
            {MODES.map((mode) => (
              <MenuItem key={mode.id} selected={selectedMode === mode.id} onClick={() => { setSelectedMode(mode.id); setPlusMenuOpen(false); setPlusSubMenu(null); }} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                <Box sx={{ color: '#8b5cf6' }}>{mode.icon}</Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{mode.label}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{mode.desc}</Typography></Box>
                {selectedMode === mode.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
              </MenuItem>
            ))}
          </>
        ) : plusSubMenu === 'skill' ? (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>选择技能</Typography>
              <Box onClick={() => setPlusSubMenu(null)} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}><ExpandMore sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /></Box>
            </Box>
            <Divider />
            {SKILLS_MOCK.map((skill) => (
              <MenuItem key={skill.id} onClick={() => toggleSkill(skill.id)} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                <Extension sx={{ fontSize: 16, color: '#f59e0b' }} />
                <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{skill.name}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{skill.desc}</Typography></Box>
                {selectedSkills.includes(skill.id) && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
              </MenuItem>
            ))}
          </>
        ) : (
          <>
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>选择知识库</Typography>
              <Box onClick={() => setPlusSubMenu(null)} sx={{ cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}><ExpandMore sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /></Box>
            </Box>
            <Divider />
            {KB_MOCK.map((kb) => (
              <MenuItem key={kb.id} onClick={() => toggleKB(kb.id)} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                <MenuBook sx={{ fontSize: 16, color: '#10b981' }} />
                <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{kb.name}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{kb.count} 篇文档</Typography></Box>
                {selectedKBs.includes(kb.id) && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>

      {/* ===== 模型选择菜单 ===== */}
      <Menu anchorEl={modelAnchor} open={modelMenuOpen} onClose={() => setModelMenuOpen(false)}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{ '& .MuiPaper-root': { mt: 0.5, width: 320, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' } }}>
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SmartToy sx={{ fontSize: 18, color: '#6366f1' }} /><Typography sx={{ fontSize: 13, fontWeight: 600 }}>Max 模式</Typography></Box>
          <Switch checked={maxMode} onChange={(e) => setMaxMode(e.target.checked)} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366f1' } }} />
        </Box>
        <Box sx={{ maxHeight: 360, overflow: 'auto', py: 0.5 }}>
          {MODELS.slice(0, 5).map((model) => (
            <MenuItem key={model.id} selected={selectedModel === model.id && !maxMode} onClick={() => { setSelectedModel(model.id); setMaxMode(false); setModelMenuOpen(false); }} sx={{ py: 1, px: 2.5, gap: 1.5 }}>
              <SmartToy sx={{ fontSize: 16, color: model.id === 'auto' ? '#6366f1' : 'text.secondary' }} />
              <Typography sx={{ fontSize: 13, fontWeight: selectedModel === model.id ? 600 : 400, flex: 1 }}>{model.name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{model.multiplier}</Typography>
              {selectedModel === model.id && !maxMode && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
            </MenuItem>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Typography sx={{ px: 2.5, py: 0.5, fontSize: 11, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>新模型</Typography>
          {MODELS.slice(5).map((model) => (
            <MenuItem key={model.id} selected={selectedModel === model.id && !maxMode} onClick={() => { setSelectedModel(model.id); setMaxMode(false); setModelMenuOpen(false); }} sx={{ py: 1, px: 2.5, gap: 1.5 }}>
              <Box sx={{ width: 20, display: 'flex', justifyContent: 'center', fontSize: 12 }}>{model.tag || <SmartToy sx={{ fontSize: 14, color: 'text.secondary' }} />}</Box>
              <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: selectedModel === model.id ? 600 : 400 }}>{model.name}</Typography><Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{model.desc}</Typography></Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{model.multiplier}</Typography>
              {selectedModel === model.id && !maxMode && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
            </MenuItem>
          ))}
        </Box>
        <Divider />
        <MenuItem sx={{ py: 1.25, px: 2.5, gap: 1, color: '#6366f1' }}><SmartToy sx={{ fontSize: 16 }} /><Typography sx={{ fontSize: 13, fontWeight: 500 }}>配置自定义模型</Typography></MenuItem>
      </Menu>

      {/* ===== 工作空间选择菜单 ===== */}
      <Menu anchorEl={workspaceAnchor} open={workspaceMenuOpen} onClose={() => setWorkspaceMenuOpen(false)}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        sx={{ '& .MuiPaper-root': { mt: 0.5, width: 260, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' } }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.6, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
            <input value={workspaceSearch} onChange={e => setWorkspaceSearch(e.target.value)} placeholder="搜索工作空间" style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', fontSize: 13, width: '100%' }} />
          </Box>
        </Box>
        <Box sx={{ py: 0.5, maxHeight: 200, overflow: 'auto' }}>
          {WORKSPACES.filter(w => w.name.toLowerCase().includes(workspaceSearch.toLowerCase())).map((ws) => (
            <MenuItem key={ws.id} selected={selectedWorkspace === ws.id} onClick={() => { setSelectedWorkspace(ws.id); setWorkspaceMenuOpen(false); setWorkspaceSearch(''); }} sx={{ py: 1, px: 2.5, gap: 1.5 }}>
              <Folder sx={{ fontSize: 16, color: '#f59e0b' }} /><Typography sx={{ fontSize: 13, flex: 1 }}>{ws.name}</Typography>
              {selectedWorkspace === ws.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
            </MenuItem>
          ))}
        </Box>
        <Divider />
        <MenuItem sx={{ py: 1.25, px: 2.5, gap: 1.5 }}><Add sx={{ fontSize: 16, color: '#6366f1' }} /><Typography sx={{ fontSize: 13, fontWeight: 500 }}>新建工作空间</Typography></MenuItem>
        <MenuItem sx={{ py: 1.25, px: 2.5, gap: 1.5 }}><Folder sx={{ fontSize: 16, color: 'text.secondary' }} /><Typography sx={{ fontSize: 13 }}>打开本地文件夹</Typography></MenuItem>
        <MenuItem selected={selectedWorkspace === ''} onClick={() => { setSelectedWorkspace(''); setWorkspaceMenuOpen(false); }} sx={{ py: 1.25, px: 2.5, gap: 1.5 }}><Close sx={{ fontSize: 16, color: 'text.secondary' }} /><Typography sx={{ fontSize: 13 }}>不使用工作空间</Typography></MenuItem>
      </Menu>

      {/* ===== 权限选择菜单 ===== */}
      <Menu anchorEl={permAnchor} open={permMenuOpen} onClose={() => setPermMenuOpen(false)}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        sx={{ '& .MuiPaper-root': { mt: 0.5, width: 320, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' } }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>当前为默认权限，所有操作都会在安全沙箱约束内进行，超出范围会请求你的允许。</Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 500 }}>允许完全访问</Typography>
          <Tooltip title="开启后将减少确认步骤，允许 AI 直接执行更多操作" placement="top" arrow sx={{ maxWidth: 260 }}>
            <Switch checked={selectedPerm === 'public'} onChange={(e) => setSelectedPerm(e.target.checked ? 'public' : 'default')} size="small" sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366f1' } }} />
          </Tooltip>
        </Box>
        <Divider />
        <Box onClick={() => setPermMenuOpen(false)} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2.5, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
          <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{PERMISSIONS.find(p => p.id === selectedPerm)?.label || '默认权限'}</Typography>
          <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Box>
      </Menu>

      {/* ===== 分享弹窗 ===== */}
      <ShareDialog
        open={shareOpen}
        onClose={() => { setShareOpen(false); setShareSelected([]); exitSelectMode(); }}
        sessionId={sessionId!}
        sessionTitle={session?.title || ''}
        selectedMessages={shareSelected}
        sourceReadonly={isReadonly}
      />

      {/* ===== 拉人弹窗 ===== */}
      <AddMembersDialog
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        sessionId={sessionId!}
        sessionTitle={session?.title || ''}
        isGroup={isGroup}
        existingMemberIds={session?.member_ids || []}
      />

      {/* ===== 历史提问菜单 ===== */}
      <Menu
        anchorEl={historyAnchor} open={Boolean(historyAnchor)} onClose={() => setHistoryAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ '& .MuiPaper-root': { minWidth: 280, maxHeight: 360, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'auto' } }}
      >
        {messages.filter(m => m.role === 'user').length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>暂无提问</Typography>
          </Box>
        ) : (
          messages.filter(m => m.role === 'user').map((msg) => (
            <MenuItem key={msg.id} onClick={() => { setHistoryAnchor(null); flashMessage(msg.id); }}
              sx={{ py: 1.25, px: 2, whiteSpace: 'normal', lineHeight: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }} noWrap>
                  {isGroup && msg.user_name ? `${msg.user_name}：` : ''}{msg.content.length > 20 ? msg.content.slice(0, 20) + '...' : msg.content}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{formatTime(msg.created_at)}</Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
      </Box>

      {/* ===== 右栏概览面板 ===== */}
      <Collapse in={rightPanelOpen} orientation="horizontal">
        <Box sx={{
          width: 300, minWidth: 300, height: '100%',
          borderLeft: '1px solid', borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* 标题 */}
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>概览</Typography>
            <IconButton size="small" onClick={() => setRightPanelOpen(false)} sx={{ color: 'text.secondary' }}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
            {/* 区块一：会话信息 */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>会话信息</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>模式</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{MODES.find(m => m.id === session?.mode)?.label || session?.mode || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>模型</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{session?.model_policy || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>消息数</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{messages.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>创建时间</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
                  {session?.created_at ? (() => { const d = new Date(session.created_at); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })() : '-'}
                </Typography>
              </Box>
              {sharedFrom && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>来源</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{sharedFrom.name} {isReadonly ? '分享' : '转交'}</Typography>
                </Box>
              )}
            </Box>

            {/* 单人会话：拉人转为群组按钮 */}
            {!isGroup && !isReadonly && (
              <Box
                onClick={() => setAddMembersOpen(true)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mb: 3, px: 1.5, py: 1,
                  border: '1px solid', borderColor: 'divider', borderRadius: 2,
                  cursor: 'pointer', '&:hover': { borderColor: '#6366f1', '& .convert-text': { color: '#6366f1' } },
                }}
              >
                <PersonAdd sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography className="convert-text" sx={{ fontSize: 12, color: 'text.secondary', transition: 'color 0.2s' }}>转为群组，邀请成员协作</Typography>
              </Box>
            )}

            {/* 群组区块 */}
            {isGroup && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>群组信息</Typography>
                {/* 权限上下文 */}
                <Typography sx={{ fontSize: 11, color: 'info.main', mb: 1.5, lineHeight: 1.5 }}>
                  本群 AI 调用使用创建人（{getUserName(session?.creator_id) || '张伟'}）的全部权限
                </Typography>
                {/* 成员 */}
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>成员</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {(session?.member_ids || []).map((mid: string) => {
                    const memberUser = allUsers.find((u: any) => u.id === mid);
                    const isCreator = mid === session?.creator_id;
                    const mColor = getUserColor(mid);
                    return (
                      <Box
                        key={mid}
                        onClick={(e: React.MouseEvent<HTMLElement>) => {
                          // 群主本人无操作菜单
                          if (isCreator && mid === 'u-1') return;
                          setMemberMenuUid(mid);
                          setMemberMenuAnchor(e.currentTarget);
                        }}
                        sx={{ position: 'relative', cursor: (isCreator && mid === 'u-1') ? 'default' : 'pointer' }}
                      >
                        <Tooltip title={`${memberUser?.name || mid}${isCreator ? '（群主）' : ''}`}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 600, bgcolor: mColor, color: 'white' }}>
                            {(memberUser?.name || '?').charAt(0)}
                          </Avatar>
                        </Tooltip>
                        {isCreator && (
                          <Box sx={{
                            position: 'absolute', top: -4, right: -6,
                            bgcolor: '#f59e0b', color: 'white',
                            fontSize: 8, fontWeight: 700, lineHeight: '14px',
                            px: 0.5, borderRadius: 1,
                          }}>群主</Box>
                        )}
                      </Box>
                    );
                  })}
                  {/* + 添加成员按钮 */}
                  <Tooltip title="添加成员">
                    <Box
                      onClick={() => setAddMembersOpen(true)}
                      sx={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '1.5px dashed', borderColor: 'text.disabled',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
                        color: 'text.disabled',
                      }}
                    >
                      <Add sx={{ fontSize: 16 }} />
                    </Box>
                  </Tooltip>
                </Box>
                {/* 成员操作菜单 */}
                <Menu
                  anchorEl={memberMenuAnchor}
                  open={Boolean(memberMenuAnchor)}
                  onClose={() => { setMemberMenuAnchor(null); setMemberMenuUid(null); }}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                  {(() => {
                    const uid = memberMenuUid;
                    const isCreator = session?.creator_id === 'u-1';
                    const isSelf = uid === 'u-1';
                    if (isCreator && !isSelf) {
                      return <MenuItem onClick={() => { if (uid) removeMemberMut.mutate({ uid }); }} sx={{ fontSize: 13, color: '#ef4444' }}>移出群组</MenuItem>;
                    }
                    if (isSelf && !isCreator) {
                      return <MenuItem onClick={() => removeMemberMut.mutate({ uid: 'u-1' })} sx={{ fontSize: 13, color: '#ef4444' }}>退出群组</MenuItem>;
                    }
                    return null;
                  })()}
                </Menu>
              </Box>
            )}

            {/* 协作记录 */}
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>协作记录</Typography>
              {(() => {
                const sysMsgs = messages.filter(m => m.role === 'system').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                if (sysMsgs.length === 0) {
                  return <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>暂无协作记录</Typography>;
                }
                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sysMsgs.map((m: any) => (
                      <Box key={m.id}>
                        <Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5 }}>{m.content}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{formatTime(m.created_at)}</Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })()}
            </Box>

            {/* 区块三：产物 */}
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>产物</Typography>
            {allArtifacts.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>本对话暂无产物</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {allArtifacts.map((art, idx) => {
                  const typeColor = art.type === 'html' ? '#f59e0b' : art.type === 'sql' ? '#3b82f6' : art.type === 'pdf' ? '#ef4444' : '#6366f1';
                  return (
                    <Box key={idx} onClick={() => setPreviewArtifact(art)} sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 1.5,
                      border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}>
                      <InsertDriveFile sx={{ fontSize: 18, color: typeColor }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 500, flex: 1 }} noWrap>{art.name}</Typography>
                      <OpenInNew sx={{ fontSize: 14, color: 'text.secondary' }} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Collapse>

      {/* ===== 产物预览 Drawer ===== */}
      <Drawer
        anchor="right"
        open={Boolean(previewArtifact)}
        onClose={() => setPreviewArtifact(null)}
        sx={{ '& .MuiDrawer-paper': { width: 480, bgcolor: 'background.paper' } }}
      >
        {previewArtifact && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }} noWrap>{previewArtifact.name}</Typography>
              <Button
                size="small"
                startIcon={<Download sx={{ fontSize: 16 }} />}
                onClick={() => {
                  const blob = new Blob([previewArtifact.content], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = previewArtifact.name;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                sx={{ fontSize: 12, textTransform: 'none' }}
              >
                下载
              </Button>
              <IconButton size="small" onClick={() => setPreviewArtifact(null)} sx={{ ml: 1, color: 'text.secondary' }}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {previewArtifact.type === 'html' ? (
                <iframe
                  srcDoc={previewArtifact.content}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
                  title={previewArtifact.name}
                />
              ) : (
                <Box component="pre" sx={{
                  fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  p: 2, bgcolor: 'action.hover', borderRadius: 2,
                  border: '1px solid', borderColor: 'divider',
                }}>
                  {previewArtifact.content}
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
