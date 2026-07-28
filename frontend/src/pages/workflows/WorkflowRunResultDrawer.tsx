import {
  Drawer, Box, Typography, IconButton, Chip, Divider, Button,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Close, CheckCircle, Error as ErrorIcon, Article, OpenInNew,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getNodeMeta } from '../agents/components/workflowNodeMeta';

interface RunResult {
  run_id: string;
  status: string;
  duration_ms: number;
  total_tokens: number;
  node_executions: {
    node_id: string;
    name: string;
    type: string;
    status: string;
    duration_ms: number;
    tokens: number;
    output_summary: string;
  }[];
  report_snapshots: {
    dataKey: string;
    report_id: string;
    report_name: string;
  }[];
}

export default function WorkflowRunResultDrawer({
  open, onClose, workflowName, result,
}: {
  open: boolean;
  onClose: () => void;
  workflowName: string;
  result: RunResult | null;
}) {
  const navigate = useNavigate();
  const nodes = result?.node_executions || [];
  const reportSnapshots = result?.report_snapshots || [];
  const hasReportOutput = reportSnapshots.length > 0;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 480 } } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>运行结果 — {workflowName}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {result && (
          <>
            {/* 运行状态 */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color={result.status === 'completed' ? 'success' : 'error'}
                label={result.status === 'completed' ? '运行成功' : '运行失败'}
              />
              <Chip size="small" variant="outlined" label={`耗时 ${result.duration_ms}ms`} />
              <Chip size="small" variant="outlined" label={`Tokens ${result.total_tokens}`} />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* 节点执行时间线 */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>节点执行时间线</Typography>
            {nodes.length === 0 && (
              <Typography variant="body2" color="text.secondary">当前工作流暂无节点</Typography>
            )}
            {nodes.map((n) => {
              const meta = getNodeMeta(n.type);
              const ok = n.status === 'success';
              return (
                <Accordion key={n.node_id} disableGutters sx={{ mb: 0.5, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<span />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {ok ? <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} /> : <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />}
                      <Chip size="small" label={meta.label} sx={{ height: 20, fontSize: 10, bgcolor: `${meta.color}1f`, color: meta.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{n.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{n.duration_ms}ms</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary">{n.output_summary}</Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })}

            <Divider sx={{ my: 2 }} />

            {/* 输出摘要 */}
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>输出摘要</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
              工作流「{workflowName}」已成功执行完毕，共 {nodes.length} 个节点全部运行成功，
              总耗时 {result.duration_ms}ms，消耗 {result.total_tokens} tokens。
            </Typography>

            {/* 报告联动 */}
            {hasReportOutput && (
              <Box sx={{
                p: 2, borderRadius: 2,
                bgcolor: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.15)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Article sx={{ fontSize: 18, color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    已更新报告数据：{reportSnapshots[0].report_name || reportSnapshots[0].dataKey}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<OpenInNew fontSize="small" />}
                  onClick={() => navigate(`/reports/view/${reportSnapshots[0].report_id}`)}
                  sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600 }}
                >
                  查看报告
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
