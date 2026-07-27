import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import {
  Code, Lightbulb, Extension, CallSplit, Loop, Webhook, Stop, Settings, Assessment,
} from '@mui/icons-material';

// ===================== 工作流节点类型元数据 =====================
export interface WfNodeMeta {
  label: string;
  color: string;
  icon: React.ReactElement;
  desc: string;
  category: 'trigger' | 'process' | 'logic' | 'end';
}

export const WF_NODE_META: Record<string, WfNodeMeta> = {
  webhook:   { label: '触发器',      color: '#ec4899', icon: <Webhook />,   desc: '事件/定时/Webhook 触发流程', category: 'trigger' },
  starlark:  { label: 'Starlark脚本', color: '#3b82f6', icon: <Code />,      desc: '用脚本处理数据、调用 API',   category: 'process' },
  model:     { label: '模型调用',     color: '#a855f7', icon: <Lightbulb />, desc: '调用 LLM 生成内容',          category: 'process' },
  skill:     { label: 'Skill调用',    color: '#10b981', icon: <Extension />, desc: '执行已注册的 Skill',          category: 'process' },
  condition: { label: '条件判断',     color: '#f59e0b', icon: <CallSplit />, desc: '根据条件决定分支流向',       category: 'logic' },
  loop:      { label: '循环',        color: '#06b6d4', icon: <Loop />,      desc: '对集合或区间循环处理',       category: 'logic' },
  end:            { label: '结束',        color: '#64748b', icon: <Stop />,      desc: '流程结束节点',              category: 'end' },
  report_output:  { label: '发送到报告',  color: '#0ea5e9', icon: <Assessment />, desc: '将数据输出到报告模板',       category: 'end' },
};

export const FALLBACK_META: WfNodeMeta = {
  label: '未知节点', color: '#78716c', icon: <Settings />, desc: '未识别的节点类型', category: 'process',
};

export const getNodeMeta = (t?: string) => WF_NODE_META[t || ''] || FALLBACK_META;

export const PALETTE: { type: string; group: string }[] = [
  { type: 'webhook', group: '触发' },
  { type: 'starlark', group: '处理' },
  { type: 'model', group: '处理' },
  { type: 'skill', group: '处理' },
  { type: 'condition', group: '逻辑' },
  { type: 'loop', group: '逻辑' },
  { type: 'end', group: '结束' },
  { type: 'report_output', group: '结束' },
];

// ===================== 自定义画布节点 =====================
export function FlowNode({ data, selected }: NodeProps) {
  const d: any = data || {};
  const meta = getNodeMeta(d.nodeType);
  const disabled = d.enabled === false;

  return (
    <Box
      sx={{
        width: 200, borderRadius: 2, overflow: 'hidden',
        border: '2px solid', borderColor: selected ? meta.color : `${meta.color}55`,
        bgcolor: 'background.paper',
        opacity: disabled ? 0.5 : 1,
        boxShadow: selected ? `0 0 0 3px ${meta.color}33, 0 8px 24px ${meta.color}22` : '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.15s',
      }}
    >
      {d.nodeType !== 'webhook' && (
        <Handle type="target" position={Position.Top} style={{ background: meta.color, width: 10, height: 10 }} />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 1, background: `${meta.color}1a` }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: 1.5, background: meta.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          '& svg': { fontSize: 17 },
        }}>
          {meta.icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: meta.color, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
            {meta.label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
            {d.name || '未命名'}
          </Typography>
        </Box>
      </Box>
      {(d.summary) && (
        <Box sx={{ px: 1.25, py: 0.75 }}>
          <Typography variant="caption" color="text.secondary" sx={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 11,
          }}>
            {d.summary}
          </Typography>
        </Box>
      )}
      {d.nodeType !== 'end' && d.nodeType !== 'report_output' && (
        <Handle type="source" position={Position.Bottom} style={{ background: meta.color, width: 10, height: 10 }} />
      )}
    </Box>
  );
}

export const nodeTypes = { flowNode: FlowNode };
