import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Avatar, TextField, Chip,
  IconButton, Tooltip, Divider, Menu, MenuItem, Switch, Button,
  List, ListItemButton, ListItemText,
  Collapse,
} from '@mui/material';
import {
  Send, SmartToy, Person, Add, Mic, KeyboardArrowDown,
  ContentCopy, ThumbUp, ThumbDown, Share, MoreHoriz,
  InsertDriveFile, OpenInNew, Close, Folder, Search,
  ChatBubbleOutlined, AutoFixHigh, CheckCircle,
  ExpandMore, ExpandLess, Description, Score,
  AttachFile, Extension, MenuBook, Code,
} from '@mui/icons-material';

// =================== Mock 对话数据 ===================
const MOCK_CONVERSATIONS: Record<string, {
  title: string;
  messages: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    time?: string;
    tokens?: number;
    model?: string;
    attachments?: { name: string; type: string }[];
    sources?: { doc_name: string; score: number; content: string }[];
  }[];
}> = {
  t1: {
    title: '你好',
    messages: [
      { id: 'm1', role: 'user', content: '你好', time: '2小时前' },
      {
        id: 'm2', role: 'assistant',
        content: `你好！在继续之前，我想先跟你确认几个关于"我们俩"的小细节，方便以后交流起来更顺畅。

**关于我：**
1. **我叫什么** — 你想给我起个名字吗？还是你有已经习惯叫的？
2. **我是什么** — AI 助手？赛博搭子？还是更有趣的什么？
3. **风格** — 你喜欢正式一点、轻松随意、还是温暖话多型？
4. **我的性格底色** — 有什么价值观或边界是你希望我始终坚持的？

**关于你：**
5. **怎么称呼你** — 名字或者昵称都行
6. **你在哪个城市** — 方便我留意时区和生活相关的事
7. **你最近在忙什么** — 工作、项目、兴趣都算，让我能更好地帮上忙

不用一次性全答完，想到什么说什么就行。你也可以直接说"你看着办"，我会自己挑几个合适的设定 😊`,
        time: '2小时前', tokens: 3.28, model: 'Auto',
      },
    ],
  },
  c1: {
    title: 'AI Agent管理平台代码审查与架构图生成',
    messages: [
      { id: 'm1', role: 'user', content: '请审查 openclaw-main 项目的代码架构，并生成一份架构图', time: '5小时前' },
      {
        id: 'm2', role: 'assistant',
        content: `已完成代码审查，以下是系统架构概览：

\`\`\`mermaid
field_match · time_window · starlark · model_judgment · approval_gate
                    │
                all passed?
               ╱         ╲
             no           yes
             ↓             ↓
          [skip]      Execute actions sequentially
                      each step logged with input/output summary, duration, cost
                             │
              ┌──────────────┼──────────────┐
              ↓              ↓              ↓
         call_model     call_skill     connector    trigger_agent
         via Gateway    Starlark       query/write  async goroutine
                        sandbox        / IM
              └──────────────┼──────────────┘
                             ↓
                        step ok?
                       ╱        
                    fail         ok
                     ↓            ↓
              [stop/skip/    Merge output into action context
               retry/        next step can read step_N_* and last_output
               continue]            │
              OnFailure             ↓
              strategy        Finalize execution
                              status=completed, update agent last_run_at
\`\`\`

审查要点：
1. **Gateway 层**：统一入口，负责路由分发和鉴权
2. **Starlark 沙箱**：安全执行用户自定义脚本
3. **Connector 模块**：对接外部 IM 平台
4. **Trigger Agent**：异步触发机制，支持事件驱动

已生成完整的架构审查报告，请查看附件。`,
        time: '5小时前', tokens: 77.9, model: 'Auto',
        attachments: [{ name: 'architecture-review-report.html', type: 'html' }],
      },
    ],
  },
  c2: {
    title: '生成项目功能介绍',
    messages: [
      { id: 'm1', role: 'user', content: '请为 openclaw-main 项目生成一份功能介绍文档', time: '1天前' },
      {
        id: 'm2', role: 'assistant',
        content: `# OpenClaw AI 平台 — 功能介绍

## 平台概述
OpenClaw 是一个企业级 AI 智能体管理平台，提供对话式 AI、工作流编排、知识库管理等核心能力。

## 核心模块

### 1. 智能体管理
- **对话 Agent**：支持多模型切换、Max 模式深度推理
- **工作流 Agent**：可视化编排，支持 Starlark 脚本扩展
- **协作授权**：支持个人/组织级别的权限管理

### 2. 知识库（RAG）
- 文档上传与自动切片
- FAQ 自动生成与管理
- Wiki 知识库
- 检索测试与调优

### 3. 报告中心
- 智能周报自动生成
- 多数据源接入
- 模板构筑器

### 4. 连接器
- 聊天适配器（微信、钉钉、飞书等）
- Starlark 适配器
- 第三方系统对接

### 5. 模型管理
- 多模型源接入
- 模型策略配置
- 调用日志与成本统计

## 技术栈
- **前端**：React 18 + TypeScript + MUI v6
- **后端**：Go + Gin + PostgreSQL
- **AI**：支持 Qwen、GLM、Kimi、DeepSeek 等主流模型`,
        time: '1天前', tokens: 45.6, model: 'Auto',
      },
    ],
  },
};

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
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // 工作空间
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceAnchor, setWorkspaceAnchor] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState('123');
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  // 权限
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [permAnchor, setPermAnchor] = useState<null | HTMLElement>(null);
  const [selectedPerm, setSelectedPerm] = useState('default');

  const conversation = sessionId ? MOCK_CONVERSATIONS[sessionId] : null;
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

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

  if (!conversation) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">对话不存在</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 标题栏 */}
      <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{conversation.title}</Typography>
      </Box>

      {/* 消息区域 */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
        {conversation.messages.map((msg) => (
          <Box key={msg.id} sx={{
            display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            mb: 3, gap: 1.5, maxWidth: msg.role === 'user' ? '70%' : '85%',
            ml: msg.role === 'user' ? 'auto' : 0,
          }}>
            <Avatar sx={{
              width: 32, height: 32, flexShrink: 0, fontSize: 13,
              bgcolor: msg.role === 'user' ? '#6366f1' : 'transparent',
              border: msg.role === 'assistant' ? '1px solid' : 'none',
              borderColor: 'divider',
            }}>
              {msg.role === 'user' ? <Person sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper elevation={0} sx={{
                p: 2, bgcolor: msg.role === 'user' ? '#6366f1' : 'transparent',
                color: msg.role === 'user' ? 'white' : 'text.primary', borderRadius: 2,
              }}>
                {msg.role === 'user' ? (
                  <Typography sx={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                ) : renderContent(msg.content)}
              </Paper>

              {msg.attachments && msg.attachments.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  {msg.attachments.map((att, idx) => (
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

              {msg.role === 'assistant' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Tooltip title="复制"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ContentCopy sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  <Tooltip title="有用"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ThumbUp sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  <Tooltip title="无用"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><ThumbDown sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  <Tooltip title="分享"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><Share sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  <Tooltip title="更多"><IconButton size="small" sx={{ color: 'text.secondary', width: 28, height: 28 }}><MoreHoriz sx={{ fontSize: 14 }} /></IconButton></Tooltip>
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>共消耗 ◇ {msg.tokens?.toFixed(1)}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 1 }}>{msg.model} {msg.time}</Typography>
                </Box>
              )}
              {msg.role === 'assistant' && msg.sources && <SourcesPanel sources={msg.sources} />}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* ===== 输入区域（与 ChatPage 完全一致） ===== */}
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
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setInput(''); } }}
            placeholder="今天帮你做些什么？@引用对话文件，/调用技能与指令"
            sx={{
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-input': { px: 2.5, pt: 2, pb: 1, fontSize: 14 },
            }}
          />

          {/* 底部工具栏 */}
          <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
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
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 2,
              cursor: input.trim() ? 'pointer' : 'default',
              bgcolor: input.trim() ? '#6366f1' : 'action.disabledBackground',
              color: input.trim() ? 'white' : 'text.disabled', transition: 'all 0.2s',
              '&:hover': { bgcolor: input.trim() ? '#4f46e5' : undefined },
              boxShadow: input.trim() ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
            }}><Send sx={{ fontSize: 15 }} /></Box>
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
    </Box>
  );
}
