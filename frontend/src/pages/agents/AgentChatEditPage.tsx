import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, IconButton, TextField, MenuItem, Slider, Autocomplete,
  Chip, Divider, Stack, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { ArrowBack, Save, Add, Close } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { agentsApi, modelPoliciesApi, skillsApi, ragApi } from '../../api/client';
import ChatDebugPanel from './components/ChatDebugPanel';

const emptyConfig = {
  welcome: '', model_policy_id: '',
  authorized_skills: [] as string[], knowledge_base_ids: [] as string[],
  variables: [] as any[], opening_questions: [] as string[],
  file_upload: { max_files: 5, types: { document: true, image: false, video: false, audio: false } },
};

const FILE_TYPES = [
  { key: 'document', label: '文档', exts: 'pdf / docx / pptx / xlsx / txt / md / html / csv' },
  { key: 'image', label: '图片', exts: 'jpg / jpeg / png / gif / bmp / webp / svg' },
  { key: 'video', label: '视频', exts: 'mp4 / mov / avi / mpeg / webm' },
  { key: 'audio', label: '音频', exts: 'mp3 / wav / ogg / m4a / amr / mpga' },
];

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
      {desc && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{desc}</Typography>}
      <Box sx={{ mt: desc ? 0 : 1.5 }}>{children}</Box>
    </Box>
  );
}

export default function AgentChatEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [cfg, setCfg] = useState<any>(emptyConfig);
  const [newQuestion, setNewQuestion] = useState('');
  const [dirty, setDirty] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const pendingNav = useRef<(() => void) | null>(null);

  const { data: agentData } = useQuery({ queryKey: ['agent', id], queryFn: () => agentsApi.get(id) });
  const { data: policiesData } = useQuery({ queryKey: ['model-policies-all'], queryFn: () => modelPoliciesApi.list({ page_size: 200 }) });
  const { data: skillsData } = useQuery({ queryKey: ['skills-all'], queryFn: () => skillsApi.list({ page_size: 200 }) });
  const { data: kbData } = useQuery({ queryKey: ['kb-all'], queryFn: () => ragApi.knowledgeBases.list({ page_size: 200 }) });

  const agent = agentData?.data?.data;
  const policies: any[] = policiesData?.data?.data || [];
  const skills: any[] = skillsData?.data?.data || [];
  const kbs: any[] = kbData?.data?.data || [];

  useEffect(() => {
    if (!agent) return;
    setName(agent.name || '');
    setSystemPrompt(agent.system_prompt || '');
    setCfg({ ...emptyConfig, ...(agent.chat_config || {}) });
  }, [agent]);

  const patch = (p: any) => { setCfg((c: any) => ({ ...c, ...p })); setDirty(true); };

  const saveMutation = useMutation({
    mutationFn: () => agentsApi.save(id, { name, system_prompt: systemPrompt, chat_config: cfg }),
    onSuccess: () => { enqueueSnackbar('对话配置已保存', { variant: 'success' }); setDirty(false); },
  });

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    patch({ opening_questions: [...(cfg.opening_questions || []), q] });
    setNewQuestion('');
  };

  // 判断来源：从市场进入则返回市场，否则返回「我创建的」
  const fromMarket = searchParams.get('from') === 'market';
  const backToList = () => {
    if (dirty) { pendingNav.current = () => navigate(fromMarket ? '/agents/market' : '/agents/my'); setLeaveConfirm(true); }
    else navigate(fromMarket ? '/agents/market' : '/agents/my');
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部工具栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton onClick={backToList}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{agent?.name || '对话编辑'}</Typography>
          <Typography variant="caption" color="text.secondary">对话 Agent · 左侧配置，右侧实时调试预览</Typography>
        </Box>
        <Button variant="contained" startIcon={<Save />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          保存
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧配置面板 */}
        <Box sx={{ flex: 1, p: 2.5, overflowY: 'auto' }}>
          <Section title="基础信息">
            <TextField fullWidth size="small" label="名称" sx={{ mb: 2 }} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField fullWidth size="small" label="欢迎语" placeholder="用户进入对话时的第一句话" value={cfg.welcome || ''} onChange={(e) => patch({ welcome: e.target.value })} />
          </Section>

          <Divider sx={{ mb: 3 }} />

          <Section title="系统提示词" desc="定义 Agent 的角色、语气与行为约束">
            <TextField fullWidth size="small" multiline minRows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
          </Section>

          <Section title="模型与生成参数">
            <TextField fullWidth size="small" select label="模型策略" value={cfg.model_policy_id || ''} onChange={(e) => patch({ model_policy_id: e.target.value })}>
              <MenuItem value="">未指定</MenuItem>
              {policies.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Section>

          <Section title="文件上传" desc="允许用户在对话中上传文件，供 Agent 解析与引用">
            <Typography variant="caption" color="text.secondary">最大文件数量（{cfg.file_upload?.max_files ?? 5}）</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Slider
                size="small" min={1} max={20} step={1} sx={{ flex: 1 }}
                value={cfg.file_upload?.max_files ?? 5}
                onChange={(_, v) => patch({ file_upload: { ...cfg.file_upload, max_files: v as number } })}
              />
              <TextField
                size="small" type="number" sx={{ width: 96 }}
                value={cfg.file_upload?.max_files ?? 5}
                onChange={(e) => patch({ file_upload: { ...cfg.file_upload, max_files: Math.min(20, Math.max(1, Number(e.target.value))) } })}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>支持上传的类型</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
              {FILE_TYPES.map((t, i) => {
                const checked = !!cfg.file_upload?.types?.[t.key];
                return (
                  <Box
                    key={t.key}
                    onClick={() => patch({ file_upload: { ...cfg.file_upload, types: { ...cfg.file_upload?.types, [t.key]: !checked } } })}
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.5, cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Checkbox size="small" checked={checked} sx={{ p: 0, mt: 0.25 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.exts}</Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Section>

          <Section title="授权技能" desc="对话中允许调用的 Skill">
            <Autocomplete
              multiple size="small" options={skills}
              getOptionLabel={(o: any) => o.name || ''}
              value={skills.filter((s) => (cfg.authorized_skills || []).includes(s.id))}
              onChange={(_, v: any[]) => patch({ authorized_skills: v.map((x) => x.id) })}
              renderInput={(params) => <TextField {...params} placeholder="选择技能" />}
            />
          </Section>

          <Section title="知识库" desc="检索增强（RAG）引用的知识库">
            <Autocomplete
              multiple size="small" options={kbs}
              getOptionLabel={(o: any) => o.name || ''}
              value={kbs.filter((k) => (cfg.knowledge_base_ids || []).includes(k.id))}
              onChange={(_, v: any[]) => patch({ knowledge_base_ids: v.map((x) => x.id) })}
              renderInput={(params) => <TextField {...params} placeholder="选择知识库" />}
            />
          </Section>

          <Section title="开场问题" desc="展示在对话入口，点击即可快速提问">
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField
                fullWidth size="small" placeholder="输入一个开场问题" value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQuestion(); } }}
              />
              <Button variant="outlined" startIcon={<Add />} onClick={addQuestion}>添加</Button>
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {(cfg.opening_questions || []).map((q: string, i: number) => (
                <Chip
                  key={i} label={q} onDelete={() => patch({ opening_questions: cfg.opening_questions.filter((_: string, idx: number) => idx !== i) })}
                  deleteIcon={<Close />}
                />
              ))}
              {(cfg.opening_questions || []).length === 0 && (
                <Typography variant="caption" color="text.disabled">暂无开场问题</Typography>
              )}
            </Stack>
          </Section>
        </Box>

        {/* 右侧调试预览 */}
        <Box sx={{ width: 420, borderLeft: '1px solid', borderColor: 'divider' }}>
          <ChatDebugPanel agentId={id} welcome={cfg.welcome} openingQuestions={cfg.opening_questions || []} />
        </Box>
      </Box>

      {/* 未保存确认弹窗 */}
      <Dialog open={leaveConfirm} onClose={() => setLeaveConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>修改尚未保存</DialogTitle>
        <DialogContent>
          <Typography variant="body2">当前修改尚未保存，确定要离开吗？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveConfirm(false)}>继续编辑</Button>
          <Button variant="contained" color="warning" onClick={() => { setLeaveConfirm(false); setDirty(false); pendingNav.current?.(); }}>确定离开</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
