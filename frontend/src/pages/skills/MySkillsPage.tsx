import { useEffect, useMemo, useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Button,
  Typography, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Drawer, List, ListItemButton, ListItemText, ListItemIcon,
} from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import {
  Add, Refresh, Delete, Edit, Send, CloudOff, Extension,
  Upload, AutoAwesome, CancelScheduleSend, Save, Close,
  Description, Article, Settings, History, Undo, CheckCircle,
  Error, HourglassEmpty, Archive, PersonAdd, VerifiedUser,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader, FilterBar, DataTable, useTableState, EmptyState, LoadingState, StatusBadge } from '../../components/shared';
import ResourceShareDialog from '../../components/ResourceShareDialog';
import { skillsApi } from '../../api/client';
import api from '../../api/client';

/**
 * 双层状态机设计
 * 
 * Skill 级（列表展示用，聚合得出）：
 *   未发布 / 已上架 / 审核中 / 有未发布修改（原"已修改"）
 * 
 * 版本级（真实的业务状态，挂在 SkillVersion 上）：
 *   草稿 → 审核中 → 已发布（在架）
 *                 → 已驳回
 *   已发布 → 历史版本（被新版本顶替）
 *          → 已废弃（有严重问题，标记不回滚到它）
 * 
 * 核心铁律：市场上跑的永远是快照，作者改的永远是草稿
 */

// Skill 级聚合状态（列表展示）
const SKILL_STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: '未发布', color: 'default' },
  pending: { label: '审核中', color: 'warning' },
  pending_whitelist: { label: '白名单验证中', color: 'info' },
  published: { label: '已上架', color: 'success' },
  modified: { label: '有未发布修改', color: 'info' },
  rejected: { label: '已驳回', color: 'error' },
  delisted: { label: '已下架', color: 'error' },
};

// 版本级状态
const VERSION_STATUS_META: Record<string, { label: string; dotColor: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'grey'; chipColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactNode }> = {
  draft: { label: '草稿', dotColor: 'grey', chipColor: 'default', icon: <Edit sx={{ fontSize: 14 }} /> },
  pending: { label: '审核中', dotColor: 'warning', chipColor: 'warning', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  published: { label: '在架', dotColor: 'success', chipColor: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  rejected: { label: '已驳回', dotColor: 'error', chipColor: 'error', icon: <Error sx={{ fontSize: 14 }} /> },
  history: { label: '历史版本', dotColor: 'info', chipColor: 'info', icon: <Archive sx={{ fontSize: 14 }} /> },
  deprecated: { label: '已废弃', dotColor: 'error', chipColor: 'error', icon: <Error sx={{ fontSize: 14 }} /> },
};

const SCOPE_LABEL: Record<string, string> = {
  private: '私有', department: '部门', company: '全公司',
};

/** 各状态对应的可用操作按钮 */
const STATUS_ACTIONS: Record<string, string[]> = {
  draft: ['files', 'settings', 'publish', 'share', 'versions', 'delete'],
  pending: ['cancel', 'versions'],
  pending_whitelist: ['verify', 'cancel', 'versions'],
  published: ['files', 'settings', 'delist', 'publish_new', 'share', 'versions'],
  modified: ['files', 'settings', 'publish', 'share', 'versions', 'delete'],
  rejected: ['files', 'settings', 'publish', 'share', 'versions', 'delete'],
  delisted: ['files', 'settings', 'publish', 'share', 'versions', 'delete'],
};

/** 操作按钮元数据 */
const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color?: string }> = {
  files: { icon: <Description fontSize="small" />, label: '文件列表', color: 'text.secondary' },
  settings: { icon: <Settings fontSize="small" />, label: '设置', color: 'text.secondary' },
  publish: { icon: <Send fontSize="small" />, label: '发布', color: 'primary.main' },
  publish_new: { icon: <Send fontSize="small" />, label: '发布新版本', color: 'primary.main' },
  delist: { icon: <CloudOff fontSize="small" />, label: '下架', color: 'warning.main' },
  versions: { icon: <History fontSize="small" />, label: '版本历史', color: 'info.main' },
  share: { icon: <PersonAdd fontSize="small" />, label: '分享', color: 'info.main' },
  verify: { icon: <VerifiedUser fontSize="small" />, label: '验证通过', color: 'success.main' },
  cancel: { icon: <CancelScheduleSend fontSize="small" />, label: '撤回', color: 'text.secondary' },
  delete: { icon: <Delete fontSize="small" />, label: '删除', color: 'error.main' },
};

// =================== 文件编辑器弹窗 ===================
function FileEditorDialog({
  open, skillId, filePath, onClose,
}: { open: boolean; skillId: string; filePath: string; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['skill-file', skillId, filePath],
    queryFn: () => api.get(`/skills/${skillId}/files/${filePath}`),
    enabled: open && !!skillId && !!filePath,
  });

  useEffect(() => {
    if (data) setContent(data.data.data.content || '');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/skills/${skillId}/files/${filePath}`, { content }),
    onSuccess: () => { enqueueSnackbar('文件已保存', { variant: 'success' }); onClose(); },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const lines = useMemo(() => content.split('\n'), [content]);
  const lineNumbers = useMemo(() => lines.map((_, i) => i + 1), [lines]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{filePath}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#1e1e1e' }}>
        {isLoading ? (
          <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingState /></Box>
        ) : (
          <Box sx={{ display: 'flex', height: 520 }}>
            <Box sx={{ bgcolor: '#1e1e1e', color: '#858585', p: 1.5, pt: 1, textAlign: 'right', fontFamily: 'monospace', fontSize: 13, lineHeight: '20px', userSelect: 'none', overflow: 'hidden', borderRight: '1px solid', borderColor: '#333' }}>
              {lineNumbers.map(n => <Box key={n} sx={{ height: '20px' }}>{n}</Box>)}
            </Box>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField multiline fullWidth value={content} onChange={e => setContent(e.target.value)} sx={{
                height: '100%',
                '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start', bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: 13, lineHeight: '20px', p: 1, overflow: 'auto' },
                '& .MuiInputBase-input': { p: 0, '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-track': { bgcolor: '#1e1e1e' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#424242', borderRadius: 4 } },
              }} />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, bgcolor: '#252526', borderTop: '1px solid #333' }}>
        <Button onClick={onClose} sx={{ color: '#ccc' }}>取消</Button>
        <Button variant="contained" startIcon={<Save />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}

// =================== 版本历史弹窗 ===================
function VersionHistoryDialog({
  open, skill, onClose,
}: { open: boolean; skill: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [rollbackTarget, setRollbackTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['skill-versions', skill?.id],
    queryFn: () => api.get(`/skills/${skill.id}/versions`),
    enabled: open && !!skill?.id,
  });
  const versions: any[] = data?.data?.data || [];

  // 基于历史版本回滚
  const rollbackMutation = useMutation({
    mutationFn: ({ skillId, versionId }: { skillId: string; versionId: string }) =>
      api.post(`/skills/${skillId}/versions/${versionId}/rollback`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['skills-my'] });
      qc.invalidateQueries({ queryKey: ['skill-versions'] });
      setRollbackTarget(null);
      enqueueSnackbar(`已基于 v${rollbackTarget?.version} 创建新版本 v${res.data.data.version}（草稿）`, { variant: 'success' });
    },
    onError: () => enqueueSnackbar('回滚失败', { variant: 'error' }),
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <History sx={{ color: 'info.main' }} />
          版本历史 — {skill?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {isLoading ? <LoadingState /> : versions.length === 0 ? (
            <EmptyState title="暂无版本记录" description="发布后将生成版本快照" />
          ) : (
            <Timeline sx={{ p: 0, '& .MuiTimelineItem-root:before': { display: 'none' } }}>
              {versions.map((v: any, idx: number) => {
                const meta = VERSION_STATUS_META[v.status] || VERSION_STATUS_META.draft;
                const isCurrent = v.status === 'published';
                const canRollback = v.status === 'history' || v.status === 'deprecated';
                return (
                  <TimelineItem key={v.id}>
                    <TimelineSeparator>
                      <TimelineDot color={meta.dotColor} variant={isCurrent ? 'filled' : 'outlined'} sx={{ my: 0.5 }}>
                        {meta.icon}
                      </TimelineDot>
                      {idx < versions.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ pb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          v{v.version}
                        </Typography>
                        <Chip
                          label={meta.label}
                          size="small"
                          color={meta.chipColor}
                          variant={isCurrent ? 'filled' : 'outlined'}
                          sx={{ height: 20, fontSize: 11 }}
                        />
                        {v.is_rollback && (
                          <Chip label="回滚" size="small" variant="outlined" sx={{ height: 20, fontSize: 11, color: 'warning.main', borderColor: 'warning.main' }} />
                        )}
                        {isCurrent && (
                          <Chip label="当前在架" size="small" sx={{ height: 20, fontSize: 11, bgcolor: 'success.main', color: '#fff' }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {v.published_at ? `发布于 ${v.published_at}` : '未发布'} · {v.publisher}
                      </Typography>
                      {v.changelog && (
                        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary', fontSize: 12 }}>
                          {v.changelog}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
                        {v.file_count} 个文件 · {(v.total_size / 1024).toFixed(1)} KB
                      </Typography>
                      {canRollback && (
                        <Button
                          size="small"
                          startIcon={<Undo />}
                          sx={{ mt: 0.5, fontSize: 12 }}
                          onClick={() => setRollbackTarget(v)}
                        >
                          基于此版本回滚
                        </Button>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 回滚确认 */}
      <Dialog open={!!rollbackTarget} onClose={() => setRollbackTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认回滚</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            将基于 <b>v{rollbackTarget?.version}</b> 的快照创建一个新的草稿版本。
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            回滚不会删除任何历史版本，已安装用户不受影响。新版本需走正常发布审核流程。
          </Typography>
          <Typography variant="caption" color="warning.main">
            注意：已废弃版本可能存在严重问题，请谨慎回滚。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackTarget(null)}>取消</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Undo />}
            onClick={() => rollbackMutation.mutate({ skillId: skill.id, versionId: rollbackTarget.id })}
            disabled={rollbackMutation.isPending}
          >
            确认回滚
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ShareDialog 已泛化为 ResourceShareDialog，见 components/ResourceShareDialog.tsx

// =================== 主页面 ===================
export default function MySkillsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();

  // 创建相关
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'upload' | 'ai' | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  // 设置弹窗（编辑技能 + 文件管理）
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsItem, setSettingsItem] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '', scope: 'private' });

  // 文件列表 Drawer
  const [drawerSkill, setDrawerSkill] = useState<any>(null);
  const [editFilePath, setEditFilePath] = useState<string>('');

  // 版本历史弹窗
  const [versionHistorySkill, setVersionHistorySkill] = useState<any>(null);

  // 分享弹窗
  const [shareSkill, setShareSkill] = useState<any>(null);

  // 验证通过
  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/skills/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); enqueueSnackbar('验证通过，已正式上架', { variant: 'success' }); },
  });

  // 确认弹窗
  const [delistConfirm, setDelistConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills-my', params],
    queryFn: () => skillsApi.my(params),
  });
  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  // 文件列表查询
  const { data: filesData } = useQuery({
    queryKey: ['skill-files', drawerSkill?.id],
    queryFn: () => api.get(`/skills/${drawerSkill!.id}/files`),
    enabled: !!drawerSkill?.id,
  });
  const files: any[] = filesData?.data?.data || [];

  // 设置弹窗中的文件列表
  const { data: settingsFilesData } = useQuery({
    queryKey: ['skill-files', settingsItem?.id],
    queryFn: () => api.get(`/skills/${settingsItem!.id}/files`),
    enabled: !!settingsItem?.id && settingsOpen,
  });
  const settingsFiles: any[] = settingsFilesData?.data?.data || [];

  // 创建
  const createMutation = useMutation({
    mutationFn: (d: any) => skillsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); setCreateOpen(false); setCreateType(null); setCreateForm({ name: '', description: '' }); enqueueSnackbar('技能已创建', { variant: 'success' }); },
  });

  // 更新（设置保存）
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => skillsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); },
  });

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); setDeleteConfirm(null); enqueueSnackbar('已删除', { variant: 'success' }); },
  });

  // 下架
  const delistMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delist(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); setDelistConfirm(null); enqueueSnackbar('下架申请已提交', { variant: 'success' }); },
  });

  // 撤回
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/skills/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); enqueueSnackbar('已撤回发布申请', { variant: 'info' }); },
  });

  const handleCreate = () => {
    if (!createForm.name.trim()) return;
    createMutation.mutate({ ...createForm, slug: createForm.name.toLowerCase().replace(/\s+/g, '-') });
  };

  const handleAiCreate = () => {
    navigate('/chat?skill=skill-creator&prompt=' + encodeURIComponent('请帮我创建一个可以实现「……」的 Skill'));
  };

  const handleOpenSettings = (item: any) => {
    setSettingsItem(item);
    setSettingsForm({ name: item.name, description: item.description || '', scope: item.scope || 'private' });
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    if (!settingsItem) return;
    updateMutation.mutate({ id: settingsItem.id, data: { name: settingsForm.name, description: settingsForm.description, scope: settingsForm.scope } }, {
      onSuccess: () => { setSettingsOpen(false); enqueueSnackbar('已保存', { variant: 'success' }); },
    });
  };

  const handleAction = (action: string, item: any) => {
    switch (action) {
      case 'files': setDrawerSkill(item); break;
      case 'settings': handleOpenSettings(item); break;
      case 'publish': navigate(`/skills/publish/${item.id}`); break;
      case 'publish_new': navigate(`/skills/publish/${item.id}?new_version=true`); break;
      case 'delist': setDelistConfirm(item); break;
      case 'cancel': cancelMutation.mutate(item.id); break;
      case 'versions': setVersionHistorySkill(item); break;
      case 'share': setShareSkill(item); break;
      case 'verify': verifyMutation.mutate(item.id); break;
      case 'delete': setDeleteConfirm(item); break;
    }
  };

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader
        title="我创建的技能"
        subtitle="管理你的技能，提交发布到技能市场。市场上跑的永远是快照，你改的永远是草稿。"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setCreateType(null); setCreateOpen(true); }}>
              创建技能
            </Button>
          </>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>描述</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>版本</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>范围</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>安装量</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 130 }}>更新时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 240 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState title="暂无技能" description="创建你的第一个技能" /></TableCell></TableRow>
            ) : items.map((item: any) => {
              const sm = SKILL_STATUS_META[item.status] || SKILL_STATUS_META.draft;
              const actions = STATUS_ACTIONS[item.status] || STATUS_ACTIONS.draft;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Extension fontSize="small" sx={{ color: '#00D4FF' }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.name}</Typography>
                        {item.forked_from && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                            复制自 {item.forked_from}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={`v${item.version || '0.0.0'}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <StatusBadge status={item.status} label={sm.label} />
                      {item.status === 'rejected' && item.reject_reason && (
                        <Typography variant="caption" color="error" sx={{ fontSize: 10 }}>{item.reject_reason}</Typography>
                      )}
                      {item.status === 'modified' && (
                        <Typography variant="caption" color="info.main" sx={{ fontSize: 10 }}>工作副本有改动，可发布新版本</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        item.status === 'published'
                          ? (item.scope === 'company' ? '全公司' : item.scope === 'department' ? '部门' : '私有')
                          : item.status === 'pending'
                            ? '待审核'
                            : '仅拥有者'
                      }
                      size="small"
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, fontFamily: 'monospace' }}>{item.install_count || 0}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {item.updated_at || item.created_at || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {actions.map(action => {
                        const meta = ACTION_META[action];
                        if (!meta) return null;
                        return (
                          <Tooltip key={action} title={meta.label}>
                            <IconButton size="small" onClick={() => handleAction(action, item)} sx={{ color: meta.color }}>
                              {meta.icon}
                            </IconButton>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* 创建技能弹窗 */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateType(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>创建技能</DialogTitle>
        <DialogContent>
          {!createType ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>选择创建方式</Typography>
              <Button variant="outlined" startIcon={<Upload />} sx={{ justifyContent: 'flex-start', py: 2, textTransform: 'none' }} onClick={() => setCreateType('upload')}>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>上传技能文件夹</Typography>
                  <Typography variant="caption" color="text.secondary">选择文件夹或 zip，必须包含 SKILL.md</Typography>
                </Box>
              </Button>
              <Button variant="outlined" startIcon={<AutoAwesome />} sx={{ justifyContent: 'flex-start', py: 2, textTransform: 'none' }} onClick={() => setCreateType('ai')}>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>AI 辅助创建</Typography>
                  <Typography variant="caption" color="text.secondary">通过对话生成技能，自动落盘到你的空间</Typography>
                </Box>
              </Button>
            </Box>
          ) : createType === 'upload' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField fullWidth label="技能名称" required placeholder="例如：smart-assistant" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
              <TextField fullWidth label="描述" multiline rows={3} placeholder="描述这个技能的用途和功能..." value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>技能文件夹</Typography>
                <Button variant="outlined" size="small" disabled>选择文件夹</Button>
                <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>mock 模式下仅作演示</Typography>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); setCreateType(null); }}>取消</Button>
          {createType === 'upload' && <Button variant="contained" onClick={handleCreate} disabled={createMutation.isPending || !createForm.name.trim()}>创建</Button>}
          {createType === 'ai' && <Button variant="contained" startIcon={<AutoAwesome />} onClick={handleAiCreate}>前往对话创建</Button>}
        </DialogActions>
      </Dialog>

      {/* 设置弹窗（编辑技能 + 文件管理） */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>编辑技能 — {settingsItem?.name || ''}</Typography>
          <IconButton size="small" onClick={() => setSettingsOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 基本信息 */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>基本信息</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField fullWidth label="技能名称" required size="small" value={settingsForm.name} onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} />
                <TextField fullWidth label="描述" multiline rows={3} size="small" value={settingsForm.description} onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })} />
              </Box>
            </Box>
            {/* 技能文件夹内容 */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>技能文件夹内容（工作副本）</Typography>
              <Typography variant="caption" color="info.main" sx={{ display: 'block', mb: 1 }}>
                你编辑的是工作副本，不会影响已上架版本。修改后需发布新版本才能更新市场。
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="contained" size="small" disabled>选择文件夹</Button>
                <Button variant="outlined" color="error" size="small" startIcon={<Delete />} onClick={() => { if (confirm('确认删除该技能下的所有文件？')) { enqueueSnackbar('文件已清空（mock）', { variant: 'success' }); } }}>
                  删除所有文件
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">已有 {settingsFiles.length} 个文件</Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 240, overflow: 'auto', mt: 0.5, bgcolor: 'background.paper' }}>
                {settingsFiles.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="body2" color="text.secondary">暂无文件</Typography></Box>
                ) : (
                  <List dense sx={{ p: 0 }}>
                    {settingsFiles.map((f: any) => (
                      <ListItemButton key={f.path} onClick={() => setEditFilePath(f.path)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}><Article fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                        <ListItemText primary={f.path} secondary={`${f.size} bytes · ${f.updatedAt}`} slotProps={{ primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } }, secondary: { variant: 'caption' } }} />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSettingsOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveSettings} disabled={updateMutation.isPending}>确认</Button>
        </DialogActions>
      </Dialog>

      {/* 文件列表 Drawer */}
      <Drawer anchor="right" open={!!drawerSkill} onClose={() => setDrawerSkill(null)} sx={{ '& .MuiDrawer-paper': { width: 400 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{drawerSkill?.name}</Typography>
            <IconButton size="small" onClick={() => setDrawerSkill(null)}><Close fontSize="small" /></IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {files.length === 0 ? (
              <EmptyState title="暂无文件" description="该技能下没有文件" />
            ) : (
              <List dense>
                {files.map((f: any) => (
                  <ListItemButton key={f.path} onClick={() => setEditFilePath(f.path)} sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}><Article fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                    <ListItemText primary={f.path} secondary={`${f.size} bytes · ${f.updatedAt}`} slotProps={{ primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } }, secondary: { variant: 'caption' } }} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* 文件编辑器 */}
      {(drawerSkill || settingsItem) && editFilePath && (
        <FileEditorDialog open={!!editFilePath} skillId={(drawerSkill || settingsItem).id} filePath={editFilePath} onClose={() => setEditFilePath('')} />
      )}

      {/* 版本历史弹窗 */}
      <VersionHistoryDialog
        open={!!versionHistorySkill}
        skill={versionHistorySkill}
        onClose={() => setVersionHistorySkill(null)}
      />

      {/* 分享弹窗（泛化组件） */}
      <ResourceShareDialog
        open={!!shareSkill}
        resourceType="skill"
        resourceId={shareSkill?.id || ''}
        resourceName={shareSkill?.name || ''}
        onClose={() => setShareSkill(null)}
      />

      {/* 下架确认 */}
      <Dialog open={!!delistConfirm} onClose={() => setDelistConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认下架</DialogTitle>
        <DialogContent>
          <Typography variant="body2">确定要申请下架技能「{delistConfirm?.name}」吗？下架后已安装的 Agent 将无法继续使用该技能。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelistConfirm(null)}>取消</Button>
          <Button variant="contained" color="warning" onClick={() => delistConfirm && delistMutation.mutate(delistConfirm.id)} disabled={delistMutation.isPending}>确认下架</Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认删除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">确定要删除技能「{deleteConfirm?.name}」吗？此操作不可撤销。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>确认删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
