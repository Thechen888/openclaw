import { useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Button, TextField, Chip, Divider,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress, Stack,
} from '@mui/material';
import {
  Close, PlayArrow, ExpandMore, CheckCircle, Error as ErrorIcon, Bolt,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { agentsApi } from '../../../api/client';
import { getNodeMeta } from './workflowNodeMeta';

export default function WorkflowDebugDrawer({
  open, onClose, agentId,
}: {
  open: boolean;
  onClose: () => void;
  agentId: string;
}) {
  const [input, setInput] = useState('{\n  "trigger_payload": {\n    "demo": true\n  }\n}');
  const [result, setResult] = useState<any>(null);

  const runMutation = useMutation({
    mutationFn: () => {
      let parsed: any = {};
      try { parsed = JSON.parse(input); } catch { parsed = {}; }
      return agentsApi.debugWorkflow(agentId, { input: parsed });
    },
    onSuccess: (res: any) => setResult(res?.data?.data || res?.data),
  });

  const nodes: any[] = result?.node_executions || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 460 } } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bolt sx={{ color: 'warning.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>工作流调试</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>输入参数 (JSON)</Typography>
        <TextField
          fullWidth multiline minRows={5} value={input} onChange={(e) => setInput(e.target.value)}
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
        />
        <Button
          fullWidth variant="contained" startIcon={runMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
          sx={{ mt: 1.5 }} onClick={() => runMutation.mutate()} disabled={runMutation.isPending}
        >
          {runMutation.isPending ? '执行中...' : '运行调试'}
        </Button>

        {result && (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Chip size="small" color={result.status === 'completed' ? 'success' : 'error'} label={result.status === 'completed' ? '执行成功' : '执行失败'} />
              <Chip size="small" variant="outlined" label={`耗时 ${result.duration_ms}ms`} />
              <Chip size="small" variant="outlined" label={`Token ${result.total_tokens}`} />
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>逐节点执行</Typography>
            {nodes.length === 0 && (
              <Typography variant="body2" color="text.secondary">当前工作流暂无节点</Typography>
            )}
            {nodes.map((n) => {
              const meta = getNodeMeta(n.type);
              const ok = n.status === 'success';
              return (
                <Accordion key={n.node_id} disableGutters sx={{ mb: 0.5, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {ok ? <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} /> : <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />}
                      <Chip size="small" label={meta.label} sx={{ height: 20, fontSize: 10, bgcolor: `${meta.color}1f`, color: meta.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{n.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{n.duration_ms}ms</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>输入</Typography>
                    <Box component="pre" sx={{ m: 0, mb: 1, p: 1, borderRadius: 1, bgcolor: 'background.default', fontSize: 11, overflowX: 'auto' }}>
                      {JSON.stringify(n.input, null, 2)}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>输出</Typography>
                    <Box component="pre" sx={{ m: 0, mb: 1, p: 1, borderRadius: 1, bgcolor: 'background.default', fontSize: 11, overflowX: 'auto' }}>
                      {JSON.stringify(n.output, null, 2)}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>日志</Typography>
                    {(n.logs || []).map((l: string, i: number) => (
                      <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>{l}</Typography>
                    ))}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </>
        )}
      </Box>
    </Drawer>
  );
}
