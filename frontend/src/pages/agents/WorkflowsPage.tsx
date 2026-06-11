import { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, IconButton, Tooltip,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, Stack, Autocomplete,
} from '@mui/material';
import {
  Settings, Add, Edit, Delete, DragIndicator, ArrowDownward,
  Code, Lightbulb, Extension, CallSplit, Loop,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, LoadingState, EmptyState } from '../../components/shared';
import api from '../../api/client';

// ===================== 类型 =====================
type NodeType = 'starlark' | 'model' | 'skill' | 'condition' | 'loop';
type NodeOnError = 'inherit' | 'stop' | 'skip' | 'retry';
type GlobalOnError = 'stop' | 'skip' | 'retry';

interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  on_error: NodeOnError;
  enabled: boolean;
  script?: string;
  prompt?: string;
  skill_id?: string;
  skill_name?: string;
  condition?: string;
  max_loop?: number;
}

interface Workflow {
  agent_id: string;
  name: string;
  max_iterations: number;
  timeout_seconds: number;
  on_error: GlobalOnError;
  nodes: WorkflowNode[];
}

interface AgentOpt {
  id: string;
  name: string;
}

interface SkillOpt {
  id: string;
  name: string;
}

// ===================== 节点类型元数据 =====================
const NODE_META: Record<NodeType, {
  label: string;
  color: string;
  icon: React.ReactElement;
  desc: string;
  chipBg: string;
  chipColor: string;
}> = {
  starlark: { label: 'Starlark脚本', color: '#3b82f6', icon: <Code />, desc: '用脚本处理数据、调用API', chipBg: 'rgba(59,130,246,0.15)', chipColor: '#60a5fa' },
  model:    { label: '模型调用',     color: '#a855f7', icon: <Lightbulb />, desc: '调用LLM生成内容',       chipBg: 'rgba(168,85,247,0.15)', chipColor: '#c084fc' },
  skill:    { label: 'Skill调用',    color: '#10b981', icon: <Extension />, desc: '执行已注册的Skill',     chipBg: 'rgba(16,185,129,0.15)', chipColor: '#34d399' },
  condition:{ label: '条件判断',     color: '#f59e0b', icon: <CallSplit />, desc: '根据条件决定分支流向', chipBg: 'rgba(245,158,11,0.15)', chipColor: '#fbbf24' },
  loop:     { label: '循环',        color: '#06b6d4', icon: <Loop />,      desc: '对集合或区间循环处理', chipBg: 'rgba(6,182,212,0.15)',  chipColor: '#22d3ee' },
};

const ON_ERROR_LABEL: Record<GlobalOnError | 'inherit', string> = {
  stop: '停止', skip: '跳过', retry: '重试', inherit: '继承',
};

const newNode = (): WorkflowNode => ({
  id: 'wn-' + Date.now(),
  name: '',
  type: 'starlark',
  on_error: 'inherit',
  enabled: true,
  script: '',
});

// ===================== 主页面 =====================
export default function WorkflowsPage() {
  const qc = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [editingNodeIdx, setEditingNodeIdx] = useState<number>(-1);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const agentsQ = useQuery({
    queryKey: ['agents-options'],
    queryFn: () => api.get('/agents', { params: { page: 1, page_size: 50 } }),
  });
  const skillsQ = useQuery({
    queryKey: ['skills-options'],
    queryFn: () => api.get('/skills', { params: { page: 1, page_size: 100 } }),
  });
  const workflowQ = useQuery({
    queryKey: ['workflow', selectedAgentId],
    queryFn: () => api.get(`/agents/workflows/${selectedAgentId}`),
    enabled: !!selectedAgentId,
  });

  const agents: AgentOpt[] = agentsQ.data?.data?.data?.items || agentsQ.data?.data?.data || [];
  const skills: SkillOpt[] = skillsQ.data?.data?.data?.items || skillsQ.data?.data?.data || [];
  const rawWorkflow = workflowQ.data?.data?.data;
  const workflow: Workflow | null =
    rawWorkflow && typeof rawWorkflow === 'object' && !Array.isArray(rawWorkflow)
      ? (rawWorkflow as Workflow)
      : null;
  const nodes: WorkflowNode[] = Array.isArray(workflow?.nodes) ? (workflow!.nodes as WorkflowNode[]) : [];

  // 默认选第一个 Agent
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const saveMutation = useMutation({
    mutationFn: (wf: Workflow) =>
      api.put(`/agents/workflows/${selectedAgentId}`, wf),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', selectedAgentId] });
    },
  });

  const updateWorkflow = (patch: Partial<Workflow>) => {
    if (!workflow) return;
    saveMutation.mutate({ ...workflow, nodes, ...patch });
  };

  const handleAddNode = () => {
    setEditingNodeIdx(-1);
    setEditingNode(newNode());
  };

  const handleEditNode = (idx: number) => {
    if (!workflow) return;
    setEditingNodeIdx(idx);
    setEditingNode({ ...nodes[idx] });
  };

  const handleDeleteNode = (idx: number) => {
    if (!workflow) return;
    if (!confirm('确认删除该节点？')) return;
    const next = [...nodes];
    next.splice(idx, 1);
    updateWorkflow({ nodes: next });
  };

  const handleSaveNode = (n: WorkflowNode) => {
    if (!workflow) return;
    const next = [...nodes];
    if (editingNodeIdx < 0) {
      next.push({ ...n, id: 'wn-' + Date.now() });
    } else {
      next[editingNodeIdx] = n;
    }
    updateWorkflow({ nodes: next });
    setEditingNode(null);
  };

  return (
    <Box>
      <PageHeader
        title="工作流配置"
        subtitle="配置Agent执行流水线和节点"
      />

      <Card>
        <CardContent sx={{ position: 'relative' }}>
          {/* 右上角：流程设置 */}
          <Button
            startIcon={<Settings />}
            onClick={() => setSettingsOpen(true)}
            disabled={!workflow}
            sx={{ position: 'absolute', top: 16, right: 16 }}
          >
            流程设置
          </Button>

          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            工作流配置
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            配置Agent执行流水线和节点
          </Typography>

          {/* 选择 Agent */}
          <TextField
            select
            label="选择Agent"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            sx={{ width: 360, mb: 3 }}
            size="small"
          >
            {agents.map((a) => {
              const name = a.name || '';
              return (
                <MenuItem key={a.id} value={a.id}>
                  {name}{name.endsWith('Agent') ? '' : 'Agent'}
                </MenuItem>
              );
            })}
          </TextField>

          {/* 流程画布 */}
          {workflowQ.isLoading ? (
            <LoadingState />
          ) : !workflow ? (
            <EmptyState title="请选择一个Agent来配置工作流" />
          ) : (
            <Box>
              {nodes.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, mr: 1 }}>{workflow.name}</Typography>
                  <Chip size="small" label={`最大迭代 ${workflow.max_iterations}`} variant="outlined" />
                  <Chip size="small" label={`超时 ${workflow.timeout_seconds}s`} variant="outlined" />
                  <Chip size="small" label={`错误: ${workflow.on_error}`} variant="outlined" color="error" />
                  <Chip size="small" label={`${nodes.length} 节点`} color="primary" />
                </Stack>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                {nodes.map((node, idx) => (
                  <Box key={node.id} sx={{ width: '100%', maxWidth: 720 }}>
                    <NodeCard
                      node={node}
                      onEdit={() => handleEditNode(idx)}
                      onDelete={() => handleDeleteNode(idx)}
                      skills={skills}
                    />
                    {idx < nodes.length - 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
                        <ArrowDownward sx={{ color: 'text.disabled' }} />
                      </Box>
                    )}
                  </Box>
                ))}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddNode}
                  >
                    添加节点
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 节点编辑对话框 */}
      {editingNode && (
        <NodeDialog
          node={editingNode}
          isNew={editingNodeIdx < 0}
          skills={skills}
          onCancel={() => setEditingNode(null)}
          onSave={handleSaveNode}
        />
      )}

      {/* 流程设置对话框 */}
      {settingsOpen && workflow && (
        <SettingsDialog
          workflow={workflow}
          onCancel={() => setSettingsOpen(false)}
          onSave={(patch) => {
            updateWorkflow(patch);
            setSettingsOpen(false);
          }}
        />
      )}
    </Box>
  );
}

// ===================== 节点卡片 =====================
function NodeCard({
  node, onEdit, onDelete, skills,
}: {
  node: WorkflowNode;
  onEdit: () => void;
  onDelete: () => void;
  skills: SkillOpt[];
}) {
  const meta = NODE_META[node.type];
  const skillName = useMemo(() => {
    if (node.type !== 'skill') return '';
    return node.skill_name || skills.find((s) => s.id === node.skill_id)?.name || '';
  }, [node, skills]);

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${meta.color}`,
        bgcolor: 'background.paper',
        opacity: node.enabled ? 1 : 0.5,
        transition: 'all .2s',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <DragIndicator sx={{ color: 'text.disabled', cursor: 'grab', mt: 0.25 }} />
          <Box sx={{ color: meta.color, mt: 0.25 }}>{meta.icon}</Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{node.name || '未命名节点'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {meta.desc}
            </Typography>

            {/* 节点内容预览 */}
            {node.type === 'starlark' && node.script && (
              <Box
                sx={{
                  mt: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover',
                  fontFamily: 'monospace', fontSize: 12, color: 'text.secondary',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  maxHeight: 60, overflow: 'hidden',
                }}
              >
                {node.script.split('\n').slice(0, 2).join('\n')}
              </Box>
            )}
            {node.type === 'model' && node.prompt && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                "{node.prompt}"
              </Typography>
            )}
            {node.type === 'skill' && skillName && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={`Skill: ${skillName}`}
                  sx={{ bgcolor: meta.chipBg, color: meta.chipColor, fontWeight: 600 }}
                />
              </Box>
            )}
            {node.type === 'condition' && node.condition && (
              <Box sx={{ mt: 1, fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                if: {node.condition}
              </Box>
            )}
            {node.type === 'loop' && node.max_loop != null && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                最大循环 {node.max_loop} 次
              </Typography>
            )}
          </Box>

          <Chip
            size="small"
            label={meta.label}
            sx={{ bgcolor: meta.chipBg, color: meta.chipColor, fontWeight: 600, mr: 0.5 }}
          />
          <Tooltip title="编辑">
            <IconButton size="small" onClick={onEdit}><Edit fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton size="small" color="error" onClick={onDelete}><Delete fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}

// ===================== 节点对话框 =====================
function NodeDialog({
  node, isNew, skills, onCancel, onSave,
}: {
  node: WorkflowNode;
  isNew: boolean;
  skills: SkillOpt[];
  onCancel: () => void;
  onSave: (n: WorkflowNode) => void;
}) {
  const [draft, setDraft] = useState<WorkflowNode>(node);

  const update = <K extends keyof WorkflowNode>(k: K, v: WorkflowNode[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const meta = NODE_META[draft.type];

  return (
    <Dialog open onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{isNew ? '添加节点' : '编辑节点'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="节点名称"
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              size="small"
              fullWidth
              placeholder="节点名称"
            />
            <TextField
              select
              label="节点类型"
              value={draft.type}
              onChange={(e) => update('type', e.target.value as NodeType)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              {(Object.keys(NODE_META) as NodeType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: NODE_META[t].color, display: 'flex' }}>{NODE_META[t].icon}</Box>
                    {NODE_META[t].label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="错误处理"
              value={draft.on_error}
              onChange={(e) => update('on_error', e.target.value as NodeOnError)}
              size="small"
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="stop">停止</MenuItem>
              <MenuItem value="skip">跳过</MenuItem>
              <MenuItem value="retry">重试</MenuItem>
              <MenuItem value="inherit">继承</MenuItem>
            </TextField>
          </Box>

          {/* 类型相关内容 */}
          {draft.type === 'starlark' && (
            <TextField
              label={`${meta.label}`}
              value={draft.script || ''}
              onChange={(e) => update('script', e.target.value)}
              multiline
              minRows={8}
              fullWidth
              placeholder="Starlark 脚本"
              sx={{ fontFamily: 'monospace' }}
            />
          )}
          {draft.type === 'model' && (
            <TextField
              label="Prompt"
              value={draft.prompt || ''}
              onChange={(e) => update('prompt', e.target.value)}
              multiline
              minRows={8}
              fullWidth
              placeholder="例如: 你是销售助手，请根据 input 生成简短通知..."
            />
          )}
          {draft.type === 'skill' && (
            <Autocomplete
              size="small"
              options={skills}
              getOptionLabel={(o) => o.name}
              value={skills.find((s) => s.id === draft.skill_id) || null}
              onChange={(_, v) => {
                update('skill_id', v?.id);
                update('skill_name', v?.name);
              }}
              renderInput={(params) => <TextField {...params} label="选择 Skill" />}
            />
          )}
          {draft.type === 'condition' && (
            <TextField
              label="条件表达式"
              value={draft.condition || ''}
              onChange={(e) => update('condition', e.target.value)}
              fullWidth
              size="small"
              placeholder='例如: input["score"] > 0.8'
              sx={{ fontFamily: 'monospace' }}
            />
          )}
          {draft.type === 'loop' && (
            <TextField
              label="最大循环次数"
              type="number"
              value={draft.max_loop ?? 10}
              onChange={(e) => update('max_loop', Number(e.target.value))}
              size="small"
              sx={{ width: 200 }}
            />
          )}

          <Typography variant="caption" color="text.secondary">
            可用: <b>input</b>(上一步输出), <b>config</b>(Agent配置), <b>http_get</b>, <b>http_post</b>, <b>json_parse</b>, <b>log_info</b>
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={draft.enabled}
                onChange={(e) => update('enabled', e.target.checked)}
              />
            }
            label="启用此节点"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button
          variant="contained"
          onClick={() => onSave(draft)}
          disabled={!draft.name.trim()}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ===================== 流程设置对话框 =====================
function SettingsDialog({
  workflow, onCancel, onSave,
}: {
  workflow: Workflow;
  onCancel: () => void;
  onSave: (patch: Partial<Workflow>) => void;
}) {
  const [name, setName] = useState(workflow.name);
  const [maxIter, setMaxIter] = useState(workflow.max_iterations);
  const [timeout, setTimeout] = useState(workflow.timeout_seconds);
  const [onError, setOnError] = useState<GlobalOnError>(workflow.on_error);

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>工作流设置</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="工作流名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="最大迭代次数"
              type="number"
              value={maxIter}
              onChange={(e) => setMaxIter(Number(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="超时(秒)"
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="全局错误处理"
              value={onError}
              onChange={(e) => setOnError(e.target.value as GlobalOnError)}
              size="small"
              fullWidth
            >
              <MenuItem value="stop">停止</MenuItem>
              <MenuItem value="skip">跳过</MenuItem>
              <MenuItem value="retry">重试</MenuItem>
            </TextField>
          </Box>
          <Typography variant="caption" color="text.secondary">
            最大迭代次数控制循环节点的总轮次；全局错误处理在节点 "继承" 时生效。
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button
          variant="contained"
          onClick={() =>
            onSave({
              name: name.trim() || workflow.name,
              max_iterations: maxIter,
              timeout_seconds: timeout,
              on_error: onError,
            })
          }
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
