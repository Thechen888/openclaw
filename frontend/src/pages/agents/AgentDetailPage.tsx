import { useState } from 'react';
import {
  Box, Card, Typography, Button, IconButton, Chip, Tabs, Tab, Divider, Grid,
  Table, TableHead, TableBody, TableRow, TableCell, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { ArrowBack, Edit, PlayArrow, Close, AccountBalance, CheckCircle, Info as InfoIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { PageHeader, StatusBadge, EmptyState, LoadingState } from '../../components/shared';
import { agentsApi, tokensApi, publicQuotaApi } from '../../api/client';
import {
  AgentAvatar, getTypeMeta, formatTime, relativeTime,
} from './components/agentShared';
import { getNodeMeta } from './components/workflowNodeMeta';
import { useAuthStore } from '../../stores/authStore';

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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(0);

  const COLOR_PRESETS = ['#00D4FF', '#7C3AED', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ef4444'];

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

  // 当前登录用户
  const currentUser = useAuthStore(s => s.user);

  // 公共额度
  const { data: pqData } = useQuery({
    queryKey: ['agent-public-quota', id], queryFn: () => publicQuotaApi.get(id), enabled: !!agent,
  });
  const publicQuota = pqData?.data?.data;

  if (isLoading || !agent) return <LoadingState />;

  const meta = getTypeMeta(agent.agent_type);
  const cfg = agent.chat_config || {};
  const goEdit = () => navigate(isChat ? `/agents/${id}/edit/chat` : `/agents/${id}/edit/workflow`);
  // 动态返回列表：根据来源（市场 / 我创建的）
  const fromMarket = searchParams.get('from') === 'market' || (location.state as any)?.from === 'market';
  const backPath = fromMarket
    ? (isChat ? '/agents/market' : '/workflows/market')
    : (isChat ? '/agents/my' : '/workflows/my');
  const detailTitle = isChat ? '智能体详情' : '工作流详情';
  // 判断当前用户是否为拥有者（mock 按 owner_name 判断）
  const isOwner = agent?.owner_name === currentUser?.name || agent?.owner_id === currentUser?.id;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title={detailTitle}
          subtitle="查看配置概览、协作者与运行记录"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate(backPath)}>返回列表</Button>}
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
            {agent.owner_name || '—'} · 更新于 {formatTime(agent.updated_at)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {isOwner && (
            <Button variant="contained" startIcon={<Edit />} onClick={goEdit}>编辑</Button>
          )}
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="概览" />
        <Tab label="权限与额度" />
        <Tab label={`运行记录 (${runs.length})`} />
      </Tabs>

      {/* 概览 */}
      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: isChat ? 6 : 12 }}>
            <Card sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>基础配置</Typography>
              </Box>
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
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* 协作者 */}
      {tab === 1 && (
        <Stack spacing={2.5}>
          {/* 区块1：我的身份 */}
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>我的身份</Typography>
            {(() => {
              const me = collaborators.find(c => c.user_id === currentUser?.id);
              const identity = me
                ? me.role === 'owner' ? '拥有者（完全控制）'
                  : me.role === 'admin' ? '管理员（可管理协作者）'
                  : me.role === 'editor' ? '可编辑者'
                  : me.role === 'viewer' ? '仅查看者'
                  : me.role === 'chat_only' ? '仅对话用户'
                  : me.role
                : '未配置（默认仅查看）';
              return (
                <Typography variant="body2">我在本智能体的身份：<strong>{identity}</strong></Typography>
              );
            })()}
          </Card>

          {/* 区块2：可见范围 */}
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>可见范围</Typography>
            {(() => {
              const editableRoles: string[] = agent?.editable_roles || [];
              const viewableRoles: string[] = agent?.viewable_roles || [];
              const hasRoles = editableRoles.length > 0 || viewableRoles.length > 0;
              return (
                <>
                  {hasRoles ? (
                    <>
                      <Box sx={{ display: 'flex', gap: 2, py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>可编辑角色：</Typography>
                        <Box sx={{ flex: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {editableRoles.length ? editableRoles.map(r => <Chip key={r} size="small" label={r} sx={{ height: 22, fontSize: 12 }} />) : <Typography variant="body2" color="text.disabled">—</Typography>}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>可查看角色：</Typography>
                        <Box sx={{ flex: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {viewableRoles.length ? viewableRoles.map(r => <Chip key={r} size="small" label={r} variant="outlined" sx={{ height: 22, fontSize: 12 }} />) : <Typography variant="body2" color="text.disabled">—</Typography>}
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">仅自己可见（未开放给其他角色）</Typography>
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <InfoIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.disabled">权限由管理员在后台统一配置，如需调整请联系管理员</Typography>
                  </Box>
                </>
              );
            })()}
          </Card>

          {/* 区块3：公共额度 */}
          <Card sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AccountBalance sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>公共额度</Typography>
              {publicQuota ? (
                <Chip size="small" label="已开启" color="success" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
              ) : (
                <Chip size="small" label="未开启" variant="outlined" sx={{ height: 20, fontSize: 11, color: 'text.disabled' }} />
              )}
            </Box>
            {publicQuota ? (
              <>
                <Box sx={{ display: 'flex', gap: 2, py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>扣费账户：</Typography>
                  <Typography variant="body2">{publicQuota.account_name || '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 96 }}>生效人员：</Typography>
                  <Typography variant="body2">
                    {(publicQuota.enabled_users || []).map((u: any) => u.name).join('、') || '—'}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                  <Typography variant="body2" color="success.main">
                    {(() => {
                      const uid = currentUser?.id;
                      const inWhitelist = (publicQuota.enabled_users || []).some((u: any) => u.user_id === uid);
                      return inWhitelist
                        ? '您使用本智能体将消耗：公共额度（您已被授权）'
                        : '您使用本智能体将消耗：个人Token';
                    })()}
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">未开启，所有使用者消耗个人Token</Typography>
            )}
          </Card>
        </Stack>
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



    </Box>
  );
}
