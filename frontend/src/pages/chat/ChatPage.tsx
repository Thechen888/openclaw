import { useState, useRef, useEffect } from 'react';
import {
  Box, TextField, Typography, Paper, Chip, Avatar,
  CircularProgress, Divider, Menu, MenuItem,
  Collapse, List, ListItemButton, ListItemText, Button,
  Switch, Tooltip, Badge,
} from '@mui/material';
import {
  Add, Send, SmartToy, Person, MenuBook, AutoAwesome,
  ExpandMore, ExpandLess, Description, Score,
  Psychology, AttachFile, Code, Extension,
  CheckCircle, Mic, MicOff, KeyboardArrowDown,
  Close, Folder, Search, Shield, Build,
  ChatBubbleOutlined, InsertDriveFile, AutoFixHigh,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { chatApi, ragApi, skillsApi, agentsApi, modelPoliciesApi } from '../../api/client';

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
          fontFamily: 'monospace', fontSize: 12, overflow: 'auto', my: 0.5,
          border: '1px solid', borderColor: 'divider',
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
            return <Box key={j} sx={{ fontFamily: 'monospace', fontSize: 12, py: 0.25, color: 'text.secondary' }}>{line}</Box>;
          }
          if (line.startsWith('---')) return <Divider key={j} sx={{ my: 1 }} />;
          const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <Typography key={j} variant="body2" sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', mb: 0.3 }}>
              {boldParts.map((bp, k) =>
                bp.startsWith('**') && bp.endsWith('**') ? (
                  <Box key={k} component="span" sx={{ fontWeight: 700 }}>{bp.slice(2, -2)}</Box>
                ) : bp
              )}
            </Typography>
          );
        })}
      </Box>
    );
  });
}

// =================== RAG来源展示 ===================
function SourcesPanel({ sources }: { sources: any[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Button
        size="small" startIcon={<Description sx={{ fontSize: 14 }} />}
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
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>{src.doc_name}</Typography>
                </Box>
                <Chip icon={<Score sx={{ fontSize: 10 }} />} label={src.score?.toFixed(2)} size="small" color="info" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
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

// =================== 模型数据 ===================
const MODELS = [
  { id: 'qwen3.7-max', name: 'Qwen3.7-Max', letter: 'Q', color: '#7c3aed', desc: '通义千问旗舰模型，适合复杂任务', features: ['超长上下文', '复杂推理', '代码生成'] },
  { id: 'qwen3.7-plus', name: 'Qwen3.7-Plus', letter: 'Q', color: '#7c3aed', desc: '通义千问增强版，均衡通用', features: ['通用对话', '文本写作'] },
  { id: 'glm-5.2', name: 'GLM-5.2', letter: 'G', color: '#0ea5e9', desc: '智谱最新模型，多模态能力强', features: ['多模态理解', '工具调用'] },
  { id: 'kimi-k2.7-code', name: 'Kimi-K2.7-Code', letter: 'K', color: '#374151', desc: '专注长上下文编程', features: ['代码理解', '仓库级分析'] },
  { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', letter: 'D', color: '#4f46e5', desc: '深度求索专业版', features: ['推理增强', '数学能力'] },
  { id: 'minimax-m3', name: 'MiniMax-M3', letter: 'M', color: '#ef4444', desc: 'MiniMax 最新模型', features: ['语音理解', '多轮对话'] },
];

const MODES = [
  { id: 'chat', label: '对话', icon: <SmartToy sx={{ fontSize: 16 }} />, desc: '自由对话，灵活应答' },
  { id: 'plan', label: '规划', icon: <AutoAwesome sx={{ fontSize: 16 }} />, desc: '分解任务，逐步执行' },
  { id: 'ask', label: '问答', icon: <Psychology sx={{ fontSize: 16 }} />, desc: '精准回答，简洁高效' },
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

// =================== 主组件 ===================
export default function ChatPage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingMsg, setPendingMsg] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // + 菜单
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [plusAnchor, setPlusAnchor] = useState<null | HTMLElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState('chat');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);

  // 模型菜单
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelAnchor, setModelAnchor] = useState<null | HTMLElement>(null);
  const [selectedModel, setSelectedModel] = useState('qwen3.7-max');
  const [hoverModel, setHoverModel] = useState<any>(null);

  // 语音输入
  const [isRecording, setIsRecording] = useState(false);

  // 工作空间
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceAnchor, setWorkspaceAnchor] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('123');
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // 权限
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [permAnchor, setPermAnchor] = useState<null | HTMLElement>(null);
  const [selectedPerm, setSelectedPerm] = useState('default');

  // 工具栏按钮
  const [modeAnchor, setModeAnchor] = useState<null | HTMLElement>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [skillAnchor, setSkillAnchor] = useState<null | HTMLElement>(null);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [kbAnchor, setKbAnchor] = useState<null | HTMLElement>(null);
  const [kbMenuOpen, setKbMenuOpen] = useState(false);
  const [agentAnchor, setAgentAnchor] = useState<null | HTMLElement>(null);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  // 数据查询
  const { data: sessionsData } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.sessions.list({ page: 1, page_size: 100 }),
  });
  const sessions: any[] = sessionsData?.data?.data || [];

  const { data: kbData } = useQuery({
    queryKey: ['chat-kbs'],
    queryFn: () => ragApi.knowledgeBases.list({ page: 1, page_size: 200 }),
  });
  const kbs: any[] = kbData?.data?.data || [];

  // API 查询：已安装技能
  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['chat-skills-installed'],
    queryFn: () => skillsApi.installed({ page: 1, page_size: 50 }),
    enabled: skillMenuOpen,
  });
  const installedSkills: any[] = skillsData?.data?.data || [];

  // API 查询：智能体列表
  const { data: agentsData } = useQuery({
    queryKey: ['chat-agents'],
    queryFn: () => agentsApi.list({ page: 1, page_size: 50 }),
    enabled: agentMenuOpen,
  });
  const publishedAgents: any[] = (agentsData?.data?.data || []).filter((a: any) => a.status === 'published');

  const currentSession = sessions.find((s: any) => s.id === selectedSession);
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setPendingMsg(content);

    let sessionId = selectedSession;
    const isNewSession = !sessionId;
    if (!sessionId) {
      try {
        const res = await chatApi.sessions.create({
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          mode: selectedMode,
          model_policy_id: 'mp-1',
          model_policy: currentModel.name,
        });
        sessionId = res.data.data.id;
        setSelectedSession(sessionId);
        qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      } catch {
        enqueueSnackbar('创建会话失败', { variant: 'error' });
        setSending(false);
        setPendingMsg('');
        return;
      }
    }

    try {
      await chatApi.messages.send(sessionId, content);
      setPendingMsg('');
      qc.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      if (isNewSession) {
        navigate('/chat/' + sessionId);
        return;
      }
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

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // 模拟语音识别
      setTimeout(() => {
        setInput(prev => prev + '这是语音输入的内容');
        setIsRecording(false);
      }, 2000);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  };

  const toggleKB = (kbId: string) => {
    setSelectedKBs(prev =>
      prev.includes(kbId) ? prev.filter(id => id !== kbId) : [...prev, kbId]
    );
  };

  const removeFile = (file: string) => {
    setAttachedFiles(prev => prev.filter(f => f !== file));
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {!selectedSession ? (
        /* ===== 欢迎页 ===== */
        <Box sx={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          px: 4, position: 'relative', overflow: 'auto',
        }}>
          {/* 背景装饰光晕 */}
          <Box sx={{
            position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          {/* 标题 */}
          <Box sx={{ mb: 3, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Typography sx={{
              fontWeight: 800, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1.1,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #c084fc 70%, #e879f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.15))',
            }}>
              OpenClaw
            </Typography>
            <Typography sx={{ color: 'text.secondary', mt: 1, fontSize: 16, fontWeight: 400, letterSpacing: '0.02em' }}>
              你的 AI 工作助手，让效率触手可及
            </Typography>
          </Box>

          {/* 快捷输入标签 */}
          <Box sx={{
            display: 'flex', gap: 1, mb: 3, flexWrap: 'nowrap', justifyContent: 'center',
            position: 'relative', zIndex: 1, maxWidth: 720, overflow: 'hidden',
          }}>
            {[
              { icon: '', label: '帮我写一份周报', color: '#6366f1' },
              { icon: '💻', label: '审查这段代码', color: '#8b5cf6' },
              { icon: '📊', label: '分析销售数据', color: '#06b6d4' },
              { icon: '🎨', label: '设计一个Logo方案', color: '#f59e0b' },
              { icon: '', label: '整理会议纪要', color: '#10b981' },
            ].map((item) => (
              <Box
                key={item.label}
                onClick={() => setInput(item.label)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6,
                  px: 1.75, py: 0.85, borderRadius: 2.5,
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: item.color,
                  border: '1px solid', borderColor: `${item.color}30`,
                  bgcolor: `${item.color}08`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: `${item.color}18`, borderColor: `${item.color}60`,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${item.color}20`,
                  },
                }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Box>
            ))}
          </Box>

          {/* 输入框 */}
          <Box sx={{ width: '100%', maxWidth: 720, position: 'relative', zIndex: 1 }}>
            {/* 已选内容标签（文件/技能/知识库） */}
            {(attachedFiles.length > 0 || selectedAgent || selectedSkills.length > 0 || selectedKBs.length > 0) && (
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap', px: 0.5, alignItems: 'center' }}>
                {/* 智能体 */}
                {selectedAgent && (
                  <Box key="agent" sx={{
                    display: 'flex', alignItems: 'center', gap: 0.3,
                    px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                    bgcolor: 'rgba(139,92,246,0.1)', color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.15)',
                    '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 },
                    '&:hover .close-icon': { opacity: 1 },
                  }}>
                    <SmartToy sx={{ fontSize: 12 }} />
                    {selectedAgent.name}
                    <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }}
                      onClick={() => setSelectedAgent(null)} />
                  </Box>
                )}
                {/* 文件 */}
                {attachedFiles.map((file) => (
                  <Box key={`f-${file}`} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.3,
                    px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                    bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.15)',
                    '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 },
                    '&:hover .close-icon': { opacity: 1 },
                  }}>
                    <InsertDriveFile sx={{ fontSize: 12 }} />
                    {file}
                    <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }}
                      onClick={() => setAttachedFiles(prev => prev.filter(f => f !== file))} />
                  </Box>
                ))}
                {/* 技能 */}
                {selectedSkills.map((skillId) => {
                  const skill = installedSkills.find(s => s.id === skillId);
                  return skill ? (
                    <Box key={`s-${skillId}`} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.3,
                      px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                      bgcolor: 'rgba(245,158,11,0.1)', color: '#fbbf24',
                      border: '1px solid rgba(245,158,11,0.15)',
                      '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 },
                      '&:hover .close-icon': { opacity: 1 },
                    }}>
                      <AutoFixHigh sx={{ fontSize: 12 }} />
                      {skill.skill_name}
                      <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }}
                        onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skillId))} />
                    </Box>
                  ) : null;
                })}
                {/* 知识库 */}
                {selectedKBs.map((kbId) => {
                  const kb = kbs.find(k => k.id === kbId);
                  return kb ? (
                    <Box key={`k-${kbId}`} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.3,
                      px: 1, py: 0.3, borderRadius: 1.5, fontSize: 12, fontWeight: 500,
                      bgcolor: 'rgba(16,185,129,0.1)', color: '#34d399',
                      border: '1px solid rgba(16,185,129,0.15)',
                      '& .close-icon': { opacity: 0, transition: 'opacity 0.15s', fontSize: 13 },
                      '&:hover .close-icon': { opacity: 1 },
                    }}>
                      <MenuBook sx={{ fontSize: 12 }} />
                      {kb.name}
                      <Close className="close-icon" sx={{ fontSize: 13, cursor: 'pointer', ml: 0.2 }}
                        onClick={() => setSelectedKBs(prev => prev.filter(k => k !== kbId))} />
                    </Box>
                  ) : null;
                })}
              </Box>
            )}

            <Paper elevation={0} sx={{
              border: '1px solid', borderColor: 'divider',
              borderRadius: 3, overflow: 'visible',
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.08)',
              transition: 'box-shadow 0.3s, border-color 0.3s',
              '&:focus-within': {
                borderColor: '#6366f1',
                boxShadow: '0 0 0 3px rgba(99,102,241,0.12), 0 8px 40px rgba(99,102,241,0.1)',
              },
            }}>
              <TextField
                fullWidth multiline maxRows={12} minRows={4} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="今天帮你做些什么？@引用对话文件，/调用技能与指令"
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiInputBase-input': { px: 3, pt: 3, pb: 1, fontSize: 16, lineHeight: 1.7 },
                }}
              />

              {/* 输入框底部工具栏 */}
              <Box sx={{ px: 2, pb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {/* + 按钮 */}
                <Tooltip title="添加文件">
                  <Box onClick={(e) => { setPlusAnchor(e.currentTarget); setPlusMenuOpen(!plusMenuOpen); }} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 2,
                    cursor: 'pointer', color: 'text.secondary',
                    transition: 'all 0.15s', flexShrink: 0,
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}><Add sx={{ fontSize: 20 }} /></Box>
                </Tooltip>

                {/* 智能体按钮 */}
                <Tooltip title="选择智能体">
                  <Box onClick={(e) => { setAgentAnchor(e.currentTarget); setAgentMenuOpen(true); }} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2,
                    cursor: 'pointer', transition: 'all 0.15s',
                    color: selectedAgent ? '#6366f1' : 'text.secondary',
                    bgcolor: selectedAgent ? 'rgba(99,102,241,0.08)' : 'transparent',
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}><SmartToy sx={{ fontSize: 20 }} /></Box>
                </Tooltip>
                {/* 技能按钮 */}
                <Tooltip title="选择技能">
                  <Box onClick={(e) => { setSkillAnchor(e.currentTarget); setSkillMenuOpen(true); }} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2,
                    cursor: 'pointer', transition: 'all 0.15s',
                    color: selectedSkills.length > 0 ? '#6366f1' : 'text.secondary',
                    bgcolor: selectedSkills.length > 0 ? 'rgba(99,102,241,0.08)' : 'transparent',
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}>
                    <Badge badgeContent={selectedSkills.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
                      <Build sx={{ fontSize: 20 }} />
                    </Badge>
                  </Box>
                </Tooltip>
                {/* 知识库按钮 */}
                <Tooltip title="选择知识库">
                  <Box onClick={(e) => { setKbAnchor(e.currentTarget); setKbMenuOpen(true); }} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2,
                    cursor: 'pointer', transition: 'all 0.15s',
                    color: selectedKBs.length > 0 ? '#6366f1' : 'text.secondary',
                    bgcolor: selectedKBs.length > 0 ? 'rgba(99,102,241,0.08)' : 'transparent',
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}>
                    <Badge badgeContent={selectedKBs.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}>
                      <MenuBook sx={{ fontSize: 20 }} />
                    </Badge>
                  </Box>
                </Tooltip>
                {/* 模式按钮 */}
                <Tooltip title="对话模式：对话/规划/问答">
                  <Box onClick={(e) => { setModeAnchor(e.currentTarget); setModeMenuOpen(true); }} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 2,
                    cursor: 'pointer', transition: 'all 0.15s',
                    color: selectedMode !== 'chat' ? '#6366f1' : 'text.secondary',
                    bgcolor: selectedMode !== 'chat' ? 'rgba(99,102,241,0.08)' : 'transparent',
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}><Psychology sx={{ fontSize: 20 }} /></Box>
                </Tooltip>

                <Box sx={{ flex: 1 }} />

                {/* 语音输入 */}
                <Box onClick={toggleRecording} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 2,
                  cursor: 'pointer',
                  color: isRecording ? '#ef4444' : 'text.secondary',
                  bgcolor: isRecording ? 'rgba(239,68,68,0.1)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { color: isRecording ? '#dc2626' : '#6366f1', bgcolor: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.06)' },
                }}>
                  {isRecording ? <MicOff sx={{ fontSize: 18 }} /> : <Mic sx={{ fontSize: 18 }} />}
                </Box>

                {/* 模型选择 */}
                <Box onClick={(e) => { setModelAnchor(e.currentTarget); setModelMenuOpen(!modelMenuOpen); }} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1.5, py: 0.75, borderRadius: 2,
                  cursor: 'pointer', color: 'text.secondary', fontSize: 13, fontWeight: 500,
                  border: '1px solid', borderColor: 'divider',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
                }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                  {currentModel.name}
                  <KeyboardArrowDown sx={{ fontSize: 16 }} />
                </Box>

                {/* 发送按钮 */}
                <Box onClick={handleSend} sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 38, height: 38, borderRadius: 2.5,
                  cursor: input.trim() && !sending ? 'pointer' : 'default',
                  bgcolor: input.trim() && !sending ? '#6366f1' : 'action.disabledBackground',
                  color: input.trim() && !sending ? 'white' : 'text.disabled',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: input.trim() && !sending ? '#4f46e5' : undefined },
                  boxShadow: input.trim() && !sending ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                }}>
                  <Send sx={{ fontSize: 17 }} />
                </Box>
              </Box>
            </Paper>

            {/* 空间/权限选择行 */}
            <Box sx={{ mt: 1, display: 'flex', gap: 0.75, px: 0.5 }}>
              <Box onClick={(e) => { setWorkspaceAnchor(e.currentTarget); setWorkspaceMenuOpen(!workspaceMenuOpen); }} sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.25, py: 0.5, borderRadius: 1.5,
                cursor: 'pointer', fontSize: 12, color: 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
              }}>
                <Folder sx={{ fontSize: 14 }} />
                {selectedWorkspace || '选择空间'}
                <KeyboardArrowDown sx={{ fontSize: 14 }} />
              </Box>
              <Box onClick={(e) => { setPermAnchor(e.currentTarget); setPermMenuOpen(!permMenuOpen); }} sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.25, py: 0.5, borderRadius: 1.5,
                cursor: 'pointer', fontSize: 12, color: 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
              }}>
                <Shield sx={{ fontSize: 14 }} />
                {PERMISSIONS.find(p => p.id === selectedPerm)?.label || '默认权限'}
                <KeyboardArrowDown sx={{ fontSize: 14 }} />
              </Box>
            </Box>

            {/* 工作空间选择菜单 */}
            <Menu
              anchorEl={workspaceAnchor} open={workspaceMenuOpen} onClose={() => setWorkspaceMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 0.5, width: 260, borderRadius: 2.5,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                },
              }}
            >
              {/* 搜索框 */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 1.25, py: 0.6, borderRadius: 2,
                  bgcolor: 'action.hover',
                }}>
                  <Search sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <input
                    value={workspaceSearch}
                    onChange={e => setWorkspaceSearch(e.target.value)}
                    placeholder="搜索工作空间"
                    style={{
                      background: 'none', border: 'none', outline: 'none',
                      color: 'inherit', fontSize: 13, width: '100%',
                    }}
                  />
                </Box>
              </Box>

              {/* 工作空间列表 */}
              <Box sx={{ py: 0.5, maxHeight: 200, overflow: 'auto' }}>
                {WORKSPACES.filter(w => w.name.toLowerCase().includes(workspaceSearch.toLowerCase())).map((ws) => (
                  <MenuItem
                    key={ws.id}
                    selected={selectedWorkspace === ws.id}
                    onClick={() => { setSelectedWorkspace(ws.id); setWorkspaceMenuOpen(false); setWorkspaceSearch(''); }}
                    sx={{ py: 1, px: 2.5, gap: 1.5 }}
                  >
                    <Folder sx={{ fontSize: 16, color: '#f59e0b' }} />
                    <Typography sx={{ fontSize: 13, flex: 1 }}>{ws.name}</Typography>
                    {selectedWorkspace === ws.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                  </MenuItem>
                ))}
              </Box>

              <Divider />

              {/* 操作项 */}
              <MenuItem sx={{ py: 1.25, px: 2.5, gap: 1.5 }}>
                <Add sx={{ fontSize: 16, color: '#6366f1' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>新建工作空间</Typography>
              </MenuItem>
              <MenuItem sx={{ py: 1.25, px: 2.5, gap: 1.5 }}>
                <Folder sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 13 }}>打开本地文件夹</Typography>
              </MenuItem>
              <MenuItem
                selected={selectedWorkspace === ''}
                onClick={() => { setSelectedWorkspace(''); setWorkspaceMenuOpen(false); }}
                sx={{ py: 1.25, px: 2.5, gap: 1.5 }}
              >
                <Close sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 13 }}>不使用工作空间</Typography>
              </MenuItem>
            </Menu>

            {/* 权限选择菜单 */}
            <Menu
              anchorEl={permAnchor} open={permMenuOpen} onClose={() => setPermMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 0.5, width: 320, borderRadius: 2.5,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                },
              }}
            >
              {/* 描述文字 */}
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                  当前为默认权限，所有操作都会在安全沙箱约束内进行，超出范围会请求你的允许。
                </Typography>
              </Box>

              {/* 允许完全访问开关 + tooltip */}
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>允许完全访问</Typography>
                <Tooltip
                  title="开启后将减少确认步骤，允许 AI 直接执行更多操作。可能涉及敏感操作、文件修改或外部执行"
                  placement="top"
                  arrow
                  sx={{ maxWidth: 260 }}
                >
                  <Switch
                    checked={selectedPerm === 'public'}
                    onChange={(e) => setSelectedPerm(e.target.checked ? 'public' : 'default')}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366f1' },
                    }}
                  />
                </Tooltip>
              </Box>

              <Divider />

              {/* 当前权限状态 */}
              <Box
                onClick={() => setPermMenuOpen(false)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 2.5, py: 1.25, cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                  {PERMISSIONS.find(p => p.id === selectedPerm)?.label || '默认权限'}
                </Typography>
                <ExpandLess sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Box>
            </Menu>

            {/* 功能卡片行 */}
            <Box sx={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1.5, mt: 4, maxWidth: 720, width: '100%', position: 'relative', zIndex: 1,
            }}>
              {[
                {
                  icon: <SmartToy sx={{ fontSize: 22 }} />,
                  title: '智能对话',
                  desc: '多模型切换，Max模式深度推理',
                  gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  action: () => setSelectedMode('chat'),
                },
                {
                  icon: <AutoAwesome sx={{ fontSize: 22 }} />,
                  title: '任务规划',
                  desc: '自动分解复杂任务，逐步执行',
                  gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                  action: () => setSelectedMode('plan'),
                },
                {
                  icon: <MenuBook sx={{ fontSize: 22 }} />,
                  title: '知识增强',
                  desc: '接入知识库，回答更精准专业',
                  gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)',
                  action: () => setKbMenuOpen(true),
                },
              ].map((card) => (
                <Box
                  key={card.title}
                  onClick={card.action}
                  sx={{
                    p: 2.5, borderRadius: 3, cursor: 'pointer',
                    border: '1px solid', borderColor: 'divider',
                    bgcolor: 'background.paper',
                    transition: 'all 0.25s',
                    '&:hover': {
                      borderColor: 'transparent',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 2.5, mb: 1.5,
                    background: card.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    {card.icon}
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    {card.title}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                    {card.desc}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* ===== + 弹出菜单（文件上传） ===== */}
            <Menu
              anchorEl={plusAnchor} open={plusMenuOpen} onClose={() => setPlusMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 0.5, minWidth: 220, borderRadius: 2.5,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  py: 0.5,
                },
              }}
            >
              {['上传图片', '上传文档', '从工作空间选择'].map((item) => (
                <MenuItem key={item} onClick={() => {
                  setAttachedFiles(prev => [...prev, item === '上传图片' ? 'image.png' : item === '上传文档' ? 'document.pdf' : 'workspace-file.tsx']);
                  setPlusMenuOpen(false);
                }} sx={{ py: 1, px: 2, gap: 1.5 }}>
                  <Folder sx={{ fontSize: 16, color: '#6366f1' }} />
                  <Typography sx={{ fontSize: 13 }}>{item}</Typography>
                </MenuItem>
              ))}
            </Menu>

            {/* ===== 模型选择菜单(纯列表 + 悬停详情) ===== */}
            <Menu
              anchorEl={modelAnchor} open={modelMenuOpen}
              onClose={() => { setModelMenuOpen(false); setHoverModel(null); }}
              transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 0.5, width: 260, borderRadius: 2.5,
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  overflow: 'visible',
                },
              }}
            >
              <Box sx={{ maxHeight: 360, overflow: 'auto', py: 0.5 }}>
                {MODELS.map((model) => (
                  <MenuItem
                    key={model.id}
                    selected={selectedModel === model.id}
                    onMouseEnter={() => setHoverModel(model)}
                    onClick={() => { setSelectedModel(model.id); setModelMenuOpen(false); }}
                    sx={{ py: 1, px: 2.5, gap: 1.5 }}
                  >
                    <Box sx={{
                      width: 20, height: 20, borderRadius: '50%', bgcolor: model.color, flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff',
                    }}>{model.letter}</Box>
                    <Typography sx={{ fontSize: 13, fontWeight: selectedModel === model.id ? 600 : 400, flex: 1 }}>{model.name}</Typography>
                    {selectedModel === model.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                  </MenuItem>
                ))}
              </Box>
              <Divider />
              <MenuItem onClick={() => { setModelMenuOpen(false); navigate('/models/sources'); }} sx={{ py: 1.25, px: 2.5, gap: 1, color: '#6366f1' }}>
                <Add sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>配置自定义模型</Typography>
              </MenuItem>
              {/* 悬停详情浮窗 */}
              <Box sx={{
                position: 'absolute', left: '100%', top: 0, ml: 1, width: 240, p: 2.5,
                borderRadius: 2.5, bgcolor: 'background.paper',
                border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                pointerEvents: 'none',
              }}>
                {(() => {
                  const m = hoverModel || currentModel;
                  return (<>
                    <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{m.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{m.desc}</Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>可用功能</Typography>
                    {m.features.map((f: string) => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.secondary' }} />
                        <Typography sx={{ fontSize: 12.5 }}>{f}</Typography>
                      </Box>
                    ))}
                  </>);
                })()}
              </Box>
            </Menu>

            {/* ===== 智能体选择菜单 ===== */}
            <Menu anchorEl={agentAnchor} open={agentMenuOpen} onClose={() => setAgentMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{ '& .MuiPaper-root': { mt: 0.5, minWidth: 260, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', py: 0.5 } }}>
              <MenuItem onClick={() => { setSelectedAgent(null); setAgentMenuOpen(false); }} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                <SmartToy sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontSize: 13, flex: 1, color: 'text.secondary' }}>不使用智能体</Typography>
                {!selectedAgent && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
              </MenuItem>
              <Divider />
              {publishedAgents.length === 0 ? (
                <MenuItem disabled sx={{ py: 1.25, px: 2 }}><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>暂无可用智能体</Typography></MenuItem>
              ) : publishedAgents.map((agent: any) => (
                <MenuItem key={agent.id} selected={selectedAgent?.id === agent.id} onClick={() => { setSelectedAgent(agent); setAgentMenuOpen(false); }} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: agent.avatar_color || '#6366f1', flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>{agent.description || ''}</Typography></Box>
                  {selectedAgent?.id === agent.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                </MenuItem>
              ))}
            </Menu>

            {/* ===== 技能选择菜单 ===== */}
            <Menu anchorEl={skillAnchor} open={skillMenuOpen} onClose={() => setSkillMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{ '& .MuiPaper-root': { mt: 0.5, minWidth: 220, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', py: 0.5 } }}>
              {skillsLoading ? (
                <MenuItem disabled sx={{ py: 1.25, px: 2 }}><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>加载中...</Typography></MenuItem>
              ) : installedSkills.length === 0 ? (
                <MenuItem disabled sx={{ py: 1.25, px: 2 }}><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>暂无已安装技能</Typography></MenuItem>
              ) : installedSkills.map((skill: any) => (
                <MenuItem key={skill.id} onClick={() => toggleSkill(skill.id)} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                  <Extension sx={{ fontSize: 16, color: '#f59e0b' }} />
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{skill.skill_name}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{skill.description || ''}</Typography></Box>
                  {selectedSkills.includes(skill.id) && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                </MenuItem>
              ))}
            </Menu>

            {/* ===== 知识库选择菜单 ===== */}
            <Menu anchorEl={kbAnchor} open={kbMenuOpen} onClose={() => setKbMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{ '& .MuiPaper-root': { mt: 0.5, minWidth: 220, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', py: 0.5 } }}>
              {kbs.length === 0 ? (
                <MenuItem disabled sx={{ py: 1.25, px: 2 }}><Typography sx={{ fontSize: 13, color: 'text.secondary' }}>暂无知识库</Typography></MenuItem>
              ) : kbs.map((kb: any) => (
                <MenuItem key={kb.id} onClick={() => toggleKB(kb.id)} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                  <MenuBook sx={{ fontSize: 16, color: '#10b981' }} />
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{kb.name}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{kb.doc_count || 0} 篇文档</Typography></Box>
                  {selectedKBs.includes(kb.id) && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                </MenuItem>
              ))}
            </Menu>

            {/* ===== 模式选择菜单 ===== */}
            <Menu anchorEl={modeAnchor} open={modeMenuOpen} onClose={() => setModeMenuOpen(false)}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }} anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              sx={{ '& .MuiPaper-root': { mt: 0.5, minWidth: 220, borderRadius: 2.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', py: 0.5 } }}>
              {MODES.map((mode) => (
                <MenuItem key={mode.id} selected={selectedMode === mode.id} onClick={() => { setSelectedMode(mode.id); setModeMenuOpen(false); }} sx={{ py: 1.25, px: 2, gap: 1.5 }}>
                  <Box sx={{ color: '#8b5cf6' }}>{mode.icon}</Box>
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 13, fontWeight: 500 }}>{mode.label}</Typography><Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{mode.desc}</Typography></Box>
                  {selectedMode === mode.id && <CheckCircle sx={{ fontSize: 16, color: '#6366f1' }} />}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
      ) : (
        /* ===== 对话视图 ===== */
        <>
          {/* 消息区域 */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <AutoAwesome sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  发送一条消息开始对话
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
                    {msg.role === 'assistant' && msg.sources && <SourcesPanel sources={msg.sources} />}
                  </Box>
                </Box>
              ))
            )}
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
            {sending && (
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: 'grey.200', color: 'grey.700' }}>
                  <SmartToy sx={{ fontSize: 18 }} />
                </Avatar>
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '16px 16px 16px 4px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>AI 正在思考...</Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* 输入区域 */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
              <TextField
                fullWidth multiline maxRows={6} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& .MuiInputBase-input': { px: 2.5, pt: 2, fontSize: 14 },
                }}
              />
              <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  onClick={(e) => { setPlusAnchor(e.currentTarget); setPlusMenuOpen(!plusMenuOpen); }}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 2,
                    cursor: 'pointer', color: 'text.secondary',
                    transition: 'all 0.15s',
                    '&:hover': { color: '#6366f1', bgcolor: 'rgba(99,102,241,0.06)' },
                  }}
                >
                  <Add sx={{ fontSize: 20 }} />
                </Box>
                <Box sx={{ flex: 1 }} />
                <Box
                  onClick={toggleRecording}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 2,
                    cursor: 'pointer',
                    color: isRecording ? '#ef4444' : 'text.secondary',
                    transition: 'all 0.15s',
                    '&:hover': { color: isRecording ? '#dc2626' : '#6366f1' },
                  }}
                >
                  {isRecording ? <MicOff sx={{ fontSize: 18 }} /> : <Mic sx={{ fontSize: 18 }} />}
                </Box>
                <Box
                  onClick={(e) => { setModelAnchor(e.currentTarget); setModelMenuOpen(!modelMenuOpen); }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 1.25, py: 0.5, borderRadius: 1.5,
                    cursor: 'pointer', color: 'text.secondary', fontSize: 12, fontWeight: 500,
                    border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.15s',
                    '&:hover': { borderColor: '#6366f1', color: '#6366f1' },
                  }}
                >
                  <SmartToy sx={{ fontSize: 14 }} />
                  {currentModel.name}
                  <KeyboardArrowDown sx={{ fontSize: 14 }} />
                </Box>
                <Box
                  onClick={handleSend}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 2,
                    cursor: input.trim() && !sending ? 'pointer' : 'default',
                    bgcolor: input.trim() && !sending ? '#6366f1' : 'action.disabledBackground',
                    color: input.trim() && !sending ? 'white' : 'text.disabled',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: input.trim() && !sending ? '#4f46e5' : undefined },
                    boxShadow: input.trim() && !sending ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <Send sx={{ fontSize: 15 }} />
                </Box>
              </Box>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
}
