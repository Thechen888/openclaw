import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Box, Typography, Button, IconButton, TextField, MenuItem, Tooltip, Switch,
  FormControlLabel, Divider, Autocomplete, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { ArrowBack, Save, PlayArrow, Delete, DragIndicator } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { agentsApi, skillsApi } from '../../api/client';
import { PALETTE, getNodeMeta, nodeTypes } from './components/workflowNodeMeta';
import WorkflowDebugDrawer from './components/WorkflowDebugDrawer';

const ON_ERROR_OPTS = [
  { value: 'inherit', label: '继承全局' },
  { value: 'stop', label: '停止' },
  { value: 'skip', label: '跳过' },
  { value: 'retry', label: '重试' },
];

function nodeSummary(d: any): string {
  switch (d.nodeType) {
    case 'starlark': return d.script || '';
    case 'model': return d.prompt || '';
    case 'skill': return d.skill_name ? `Skill: ${d.skill_name}` : '';
    case 'condition': return d.condition || '';
    case 'loop': return d.max_loop ? `最多循环 ${d.max_loop} 次` : '';
    case 'webhook': return '触发即启动流程';
    case 'end': return '流程结束';
    default: return '';
  }
}

let idSeq = 1;
const genId = () => `wn-${Date.now()}-${idSeq++}`;

function Editor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wfMeta, setWfMeta] = useState<any>({ name: '', max_iterations: 1, timeout_seconds: 60, on_error: 'stop' });
  const [debugOpen, setDebugOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const pendingNav = useRef<(() => void) | null>(null);

  const { data: agentData } = useQuery({ queryKey: ['agent', id], queryFn: () => agentsApi.get(id) });
  const agent = agentData?.data?.data;

  const { data: wfData } = useQuery({ queryKey: ['workflow', id], queryFn: () => agentsApi.getWorkflow(id) });
  const { data: skillsData } = useQuery({ queryKey: ['skills-all'], queryFn: () => skillsApi.list({ page_size: 200 }) });
  const skills: any[] = skillsData?.data?.data || [];

  useEffect(() => {
    const wf = wfData?.data?.data;
    if (!wf) return;
    setWfMeta({ name: wf.name, max_iterations: wf.max_iterations, timeout_seconds: wf.timeout_seconds, on_error: wf.on_error });
    setNodes((wf.nodes || []).map((n: any) => ({
      id: n.id, type: 'flowNode', position: n.position || { x: 260, y: 80 },
      data: {
        nodeType: n.type, name: n.name, enabled: n.enabled !== false, on_error: n.on_error || 'inherit',
        script: n.script, prompt: n.prompt, skill_id: n.skill_id, skill_name: n.skill_name,
        condition: n.condition, max_loop: n.max_loop, summary: nodeSummary({ nodeType: n.type, ...n }),
      },
    })));
    setEdges((wf.edges || []).map((e: any) => ({ ...e, animated: true })));
  }, [wfData, setNodes, setEdges]);

  const onConnect = useCallback((c: Connection) => { setEdges((eds) => addEdge({ ...c, animated: true }, eds)); setDirty(true); }, [setEdges]);

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/node-type', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/node-type');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const meta = getNodeMeta(type);
    const nid = genId();
    setNodes((nds) => nds.concat({
      id: nid, type: 'flowNode', position,
      data: { nodeType: type, name: meta.label, enabled: true, on_error: 'inherit', summary: nodeSummary({ nodeType: type }) },
    }));
    setSelectedId(nid);
    setDirty(true);
  }, [screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const updateSelected = (patch: any) => {
    if (!selectedId) return;
    setNodes((nds) => nds.map((n) => {
      if (n.id !== selectedId) return n;
      const data = { ...n.data, ...patch };
      return { ...n, data: { ...data, summary: nodeSummary(data) } };
    }));
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...wfMeta,
        nodes: nodes.map((n) => ({
          id: n.id, type: (n.data as any).nodeType, name: (n.data as any).name,
          enabled: (n.data as any).enabled, on_error: (n.data as any).on_error,
          script: (n.data as any).script, prompt: (n.data as any).prompt,
          skill_id: (n.data as any).skill_id, skill_name: (n.data as any).skill_name,
          condition: (n.data as any).condition, max_loop: (n.data as any).max_loop,
          position: n.position,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      };
      return agentsApi.saveWorkflow(id, payload);
    },
    onSuccess: () => { enqueueSnackbar('工作流已保存', { variant: 'success' }); setDirty(false); },
  });

  // 判断来源：从市场进入则返回市场，否则返回「我创建的」
  const fromMarket = searchParams.get('from') === 'market';
  const backToList = () => {
    if (dirty) { pendingNav.current = () => navigate(fromMarket ? '/workflows/market' : '/workflows/my'); setLeaveConfirm(true); }
    else navigate(fromMarket ? '/workflows/market' : '/workflows/my');
  };

  const selected = nodes.find((n) => n.id === selectedId);
  const sd: any = selected?.data;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部工具栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton onClick={backToList}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{agent?.name || '工作流编辑'}</Typography>
          <Typography variant="caption" color="text.secondary">工作流 Agent · 拖拽节点到画布并连线编排</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PlayArrow />} onClick={() => setDebugOpen(true)}>调试</Button>
        <Button variant="contained" startIcon={<Save />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          保存
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧节点面板 */}
        <Box sx={{ width: 180, p: 1.5, borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>节点库</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>拖拽到画布</Typography>
          {PALETTE.map((p) => {
            const meta = getNodeMeta(p.type);
            return (
              <Box
                key={p.type}
                draggable
                onDragStart={(e) => onDragStart(e, p.type)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1, mb: 0.75, borderRadius: 1.5, cursor: 'grab',
                  border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: meta.color, bgcolor: `${meta.color}0f` },
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                <Box sx={{ width: 26, height: 26, borderRadius: 1, bgcolor: meta.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 16 } }}>
                  {meta.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>{meta.label}</Typography>
                <DragIndicator sx={{ fontSize: 15, color: 'text.disabled' }} />
              </Box>
            );
          })}
        </Box>

        {/* 中间画布 */}
        <Box ref={wrapperRef} sx={{ flex: 1, position: 'relative' }} onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: true, style: { stroke: '#00D4FF', strokeWidth: 2 } }}
          >
            <Background gap={16} color="#ffffff14" />
            <Controls />
            <MiniMap pannable zoomable nodeColor={(n) => getNodeMeta((n.data as any)?.nodeType).color} style={{ background: 'rgba(0,0,0,0.2)' }} />
          </ReactFlow>
          {nodes.length === 0 && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography variant="body2" color="text.disabled">从左侧拖拽节点到此处开始编排</Typography>
            </Box>
          )}
        </Box>

        {/* 右侧配置面板 */}
        <Box sx={{ width: 300, p: 2, borderLeft: '1px solid', borderColor: 'divider', overflowY: 'auto' }}>
          {!selected ? (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>流程设置</Typography>
              <TextField fullWidth size="small" label="流程名称" sx={{ mb: 2 }} value={wfMeta.name || ''} onChange={(e) => setWfMeta({ ...wfMeta, name: e.target.value })} />
              <TextField fullWidth size="small" type="number" label="最大迭代次数" sx={{ mb: 2 }} value={wfMeta.max_iterations} onChange={(e) => setWfMeta({ ...wfMeta, max_iterations: Number(e.target.value) })} />
              <TextField fullWidth size="small" type="number" label="超时（秒）" sx={{ mb: 2 }} value={wfMeta.timeout_seconds} onChange={(e) => setWfMeta({ ...wfMeta, timeout_seconds: Number(e.target.value) })} />
              <TextField fullWidth size="small" select label="全局错误策略" value={wfMeta.on_error} onChange={(e) => setWfMeta({ ...wfMeta, on_error: e.target.value })}>
                {ON_ERROR_OPTS.filter((o) => o.value !== 'inherit').map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">点击画布中的节点可编辑其配置。共 {nodes.length} 个节点、{edges.length} 条连线。</Typography>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" label={getNodeMeta(sd.nodeType).label} sx={{ height: 22, bgcolor: `${getNodeMeta(sd.nodeType).color}1f`, color: getNodeMeta(sd.nodeType).color, fontWeight: 600 }} />
                </Box>
                <Tooltip title="删除节点">
                  <IconButton size="small" color="error" onClick={deleteSelected}><Delete fontSize="small" /></IconButton>
                </Tooltip>
              </Box>

              <TextField fullWidth size="small" label="节点名称" sx={{ mb: 2 }} value={sd.name || ''} onChange={(e) => updateSelected({ name: e.target.value })} />

              {sd.nodeType === 'starlark' && (
                <TextField fullWidth size="small" multiline minRows={6} label="Starlark 脚本" sx={{ mb: 2 }} value={sd.script || ''} onChange={(e) => updateSelected({ script: e.target.value })} slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }} />
              )}
              {sd.nodeType === 'model' && (
                <TextField fullWidth size="small" multiline minRows={5} label="提示词" sx={{ mb: 2 }} value={sd.prompt || ''} onChange={(e) => updateSelected({ prompt: e.target.value })} />
              )}
              {sd.nodeType === 'skill' && (
                <Autocomplete
                  size="small" sx={{ mb: 2 }}
                  options={skills}
                  getOptionLabel={(o: any) => o.name || ''}
                  value={skills.find((s) => s.id === sd.skill_id) || null}
                  onChange={(_, v: any) => updateSelected({ skill_id: v?.id, skill_name: v?.name })}
                  renderInput={(params) => <TextField {...params} label="选择 Skill" />}
                />
              )}
              {sd.nodeType === 'condition' && (
                <TextField fullWidth size="small" label="条件表达式" sx={{ mb: 2 }} value={sd.condition || ''} onChange={(e) => updateSelected({ condition: e.target.value })} placeholder='len(input["logs"]) > 0' />
              )}
              {sd.nodeType === 'loop' && (
                <TextField fullWidth size="small" type="number" label="最大循环次数" sx={{ mb: 2 }} value={sd.max_loop || 1} onChange={(e) => updateSelected({ max_loop: Number(e.target.value) })} />
              )}

              {sd.nodeType !== 'webhook' && sd.nodeType !== 'end' && (
                <TextField fullWidth size="small" select label="错误策略" sx={{ mb: 2 }} value={sd.on_error || 'inherit'} onChange={(e) => updateSelected({ on_error: e.target.value })}>
                  {ON_ERROR_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              )}

              <FormControlLabel
                control={<Switch checked={sd.enabled !== false} onChange={(e) => updateSelected({ enabled: e.target.checked })} />}
                label="启用该节点"
              />
            </>
          )}
        </Box>
      </Box>

      <WorkflowDebugDrawer open={debugOpen} onClose={() => setDebugOpen(false)} agentId={id} />

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

export default function AgentWorkflowEditPage() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
