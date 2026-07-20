import { useState } from 'react';
import {
  Box, Card, Typography, Button, IconButton, Chip, Tabs, Tab, Divider, Grid,
  Table, TableHead, TableBody, TableRow, TableCell, Avatar, Tooltip, Stack,
} from '@mui/material';
import { ArrowBack, Edit, Security, PlayArrow, Groups } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, StatusBadge, EmptyState, LoadingState } from '../../components/shared';
import { agentsApi } from '../../api/client';
import {
  AgentAvatar, getTypeMeta, getRoleMeta, formatTime, relativeTime,
} from './components/agentShared';
import { getNodeMeta } from './components/workflowNodeMeta';
import CollaboratorDialog from './components/CollaboratorDialog';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>{label}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{typeof value === 'string' ? <Typography variant="body2">{value || '—'}</Typography> : value}</Box>
    </Box>
  );
}

export default function AgentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [permOpen, setPermOpen] = useState(false);

  const { data: agentData, isLoading } = useQuery({ queryKey: ['agent', id], queryFn: () => agentsApi.get(id) });
  const agent = agentData?.data?.data;
  const isChat = agent?.agent_type === 'chat';

  const { data: wfData } = useQuery({
    queryKey: ['workflow', id], queryFn: () => agentsApi.getWorkflow(id), enabled: !!agent && !isChat,
  });
  const workflow = wfData?.data?.data;

  const { data: runsData } = useQuery({
    queryKey: ['agent-executions', id], queryFn: () => agentsApi.executions(id, { page_size: 50 }), enabled: !!agent,
  });
  const runs: any[] = runsData?.data?.data || [];

  const { data: collabData } = useQuery({
    queryKey: ['agent-collaborators', id], queryFn: () => agentsApi.collaborators(id), enabled: !!agent,
  });
  const collaborators: any[] = collabData?.data?.data || [];

  if (isLoading || !agent) return <LoadingState />;

  const meta = getTypeMeta(agent.agent_type);
  const cfg = agent.chat_config || {};
  const goEdit = () => navigate(isChat ? `/agents/${id}/edit/chat` : `/agents/${id}/edit/workflow`);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="智能体详情"
          subtitle="查看配置概览、协作者与运行记录"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate('/agents')}>返回列表</Button>}
        />
      </Box>

      {/* 头部卡片 */}
      <Card sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AgentAvatar agent={agent} size={56} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{agent.name}</Typography>
            <Chip size="small" label={meta.short} sx={{ height: 20, fontSize: 11, fontWeight: 600, color: meta.color, bgcolor: `${meta.color}1f`, border: `1px solid ${meta.color}55` }} />
            <StatusBadge status={agent.status} />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{agent.description || '暂无描述'}</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {agent.owner_name || '—'} · {agent.owner_type === 'organization' ? '组织' : '个人'} · 更新于 {formatTime(agent.updated_at)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Security />} onClick={() => setPermOpen(true)}>权限协作</Button>
          <Button variant="contained" startIcon={<Edit />} onClick={goEdit}>编辑</Button>
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="概览" />
        <Tab label={`协作者 (${collaborators.length})`} />
        <Tab label={`运行记录 (${runs.length})`} />
      </Tabs>

      {/* 概览 */}
      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: isChat ? 6 : 12 }}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>基础配置</Typography>
              {isChat ? (
                <>
                  <InfoRow label="欢迎语" value={cfg.welcome} />
                  <InfoRow label="系统提示词" value={agent.system_prompt} />
                  <InfoRow label="模型策略" value={agent.policy_name || cfg.model_policy_id} />
                  <InfoRow label="温度" value={`${cfg.temperature ?? '—'}`} />
                  <InfoRow label="最大 Token" value={`${cfg.max_tokens ?? '—'}`} />
                  <InfoRow label="授权技能" value={
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(cfg.authorized_skills || []).length ? cfg.authorized_skills.map((s: string) => <Chip key={s} size="small" label={s} sx={{ height: 20, fontSize: 11 }} />) : '—'}
                    </Stack>
                  } />
                  <InfoRow label="知识库" value={
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(cfg.knowledge_base_ids || []).length ? cfg.knowledge_base_ids.map((k: string) => <Chip key={k} size="small" label={k} sx={{ height: 20, fontSize: 11 }} />) : '—'}
                    </Stack>
                  } />
                  <InfoRow label="开场问题" value={
                    <Stack spacing={0.5}>
                      {(cfg.opening_questions || []).length ? cfg.opening_questions.map((q: string, i: number) => <Typography key={i} variant="body2">· {q}</Typography>) : '—'}
                    </Stack>
                  } />
                </>
              ) : (
                <>
                  <InfoRow label="流程名称" value={workflow?.name} />
                  <InfoRow label="节点数" value={`${workflow?.nodes?.length ?? 0} 个`} />
                  <InfoRow label="连线数" value={`${workflow?.edges?.length ?? 0} 条`} />
                  <InfoRow label="最大迭代" value={`${workflow?.max_iterations ?? '—'}`} />
                  <InfoRow label="超时" value={`${workflow?.timeout_seconds ?? '—'} 秒`} />
                  <InfoRow label="错误策略" value={workflow?.on_error} />
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>节点列表</Typography>
                  {(workflow?.nodes || []).length === 0 ? (
                    <Typography variant="body2" color="text.disabled">该工作流暂无节点</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {workflow.nodes.map((n: any) => {
                        const nm = getNodeMeta(n.type);
                        return (
                          <Box key={n.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: nm.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 18 } }}>
                              {nm.icon}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{n.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{nm.label}</Typography>
                            </Box>
                            {n.enabled === false && <Chip size="small" label="已禁用" sx={{ height: 20, fontSize: 10 }} />}
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </>
              )}
            </Card>
          </Grid>

          {isChat && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>运行概况</Typography>
                <InfoRow label="上次运行" value={relativeTime(agent.last_run_at)} />
                <InfoRow label="累计运行" value={`${runs.length} 次`} />
                <InfoRow label="创建归属" value={agent.owner_type === 'organization' ? '组织' : '个人'} />
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* 协作者 */}
      {tab === 1 && (
        <Card sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>协作者与权限</Typography>
            <Button size="small" variant="outlined" startIcon={<Security />} onClick={() => setPermOpen(true)}>管理协作者</Button>
          </Box>
          <Stack spacing={1}>
            {collaborators.map((c) => {
              const rm = getRoleMeta(c.role);
              const isDept = c.principal_type === 'department';
              return (
                <Box key={isDept ? c.dept_id : c.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                  <Avatar sx={{ width: 34, height: 34, fontSize: 14, bgcolor: isDept ? 'secondary.main' : 'primary.main' }}>
                    {isDept ? <Groups fontSize="small" /> : (c.name || '?').slice(0, 1)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                      {isDept && <Chip size="small" label={`部门 · ${c.member_count} 人`} sx={{ height: 18, fontSize: 10 }} />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">{rm.desc}</Typography>
                  </Box>
                  <Chip size="small" label={rm.label} color={rm.color} sx={{ height: 24 }} />
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* 运行记录 */}
      {tab === 2 && (
        <Card sx={{ p: 0 }}>
          {runs.length === 0 ? (
            <EmptyState title="暂无运行记录" description="该智能体还没有执行过" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>运行 ID</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>触发方式</TableCell>
                  <TableCell>耗时</TableCell>
                  <TableCell>开始时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.trigger_type || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{r.duration_ms ? `${r.duration_ms}ms` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{formatTime(r.started_at || r.created_at)}</TableCell>
                    <TableCell>
                      <Tooltip title="查看运行记录">
                        <IconButton size="small" onClick={() => navigate('/agents/runs')}><PlayArrow fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      <CollaboratorDialog open={permOpen} onClose={() => setPermOpen(false)} agent={agent} />
    </Box>
  );
}
