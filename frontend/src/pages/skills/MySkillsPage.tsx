import { useEffect, useMemo, useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Button,
  Typography, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Drawer, List, ListItemButton, ListItemText, ListItemIcon,
} from '@mui/material';
import {
  Add, Refresh, Delete, Edit, Send, CloudOff, Extension,
  Upload, AutoAwesome, CancelScheduleSend, Save, Close,
  Description, Article, Settings,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader, FilterBar, DataTable, useTableState, EmptyState, LoadingState, StatusBadge } from '../../components/shared';
import { skillsApi } from '../../api/client';
import api from '../../api/client';

/**
 * Skill 状态机定义（含版本管理）
 * 
 * 状态流转：
 *   draft ──publish──▶ pending ──approve──▶ published
 *     ▲                   │                      │
 *     │                 cancel              edit│delist
 *     │                   │                      ▼
 *     └──edit/reject── rejected              delisted
 *                           │                      │
 *                      edit│                    edit│
 *                           ▼                      ▼
 *                        modified ◀───────────────┘
 *                           │
 *                    publish│rollback
 *                           ▼
 *                    pending│published/delisted
 * 
 * 版本管理逻辑：
 *   - 已上架(published)/已下架(delisted) 的技能被编辑后，进入 modified 状态
 *   - modified 状态表示"有未发布的修改"
 *   - 可发布修改（→ pending 待审核）或回滚到上次发布状态
 * 
 * 各状态可用操作：
 *   draft     → 文件列表、设置、提交发布、删除
 *   pending   → 撤回申请（→ draft）
 *   published → 文件列表、设置、申请下架（→ delisted）、发布新版本
 *   modified  → 文件列表、设置、发布修改、回滚版本、删除
 *   rejected  → 文件列表、设置、重新提交发布、删除
 *   delisted  → 文件列表、设置、重新发布（→ pending）、删除
 */

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: '未发布', color: 'default' },
  pending: { label: '待审核', color: 'warning' },
  published: { label: '已上架', color: 'success' },
  modified: { label: '已修改', color: 'warning' },
  rejected: { label: '已驳回', color: 'error' },
  delisted: { label: '已下架', color: 'error' },
};

const SCOPE_LABEL: Record<string, string> = {
  private: '私有', department: '部门', company: '全公司',
};

/** 各状态对应的可用操作按钮 */
const STATUS_ACTIONS: Record<string, string[]> = {
  draft: ['files', 'settings', 'publish', 'delete'],
  pending: ['cancel'],
  published: ['files', 'settings', 'delist', 'publish_new'],
  modified: ['files', 'settings', 'publish', 'rollback', 'delete'],
  rejected: ['files', 'settings', 'publish', 'delete'],
  delisted: ['files', 'settings', 'publish', 'delete'],
};

/** 操作按钮元数据 */
const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color?: string }> = {
  files: { icon: <Description fontSize="small" />, label: '文件列表', color: 'text.secondary' },
  settings: { icon: <Settings fontSize="small" />, label: '设置', color: 'text.secondary' },
  publish: { icon: <Send fontSize="small" />, label: '发布', color: 'primary.main' },
  publish_new: { icon: <Send fontSize="small" />, label: '新版本', color: 'primary.main' },
  delist: { icon: <CloudOff fontSize="small" />, label: '下架', color: 'warning.main' },
  rollback: { icon: <CancelScheduleSend fontSize="small" />, label: '回滚版本', color: 'warning.main' },
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

  // 确认弹窗
  const [delistConfirm, setDelistConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<any>(null);

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

  // 发布
  const publishMutation = useMutation({
    mutationFn: (id: string) => skillsApi.publish(id, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); enqueueSnackbar('发布申请已提交', { variant: 'success' }); },
  });

  // 撤回
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/skills/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); enqueueSnackbar('已撤回发布申请', { variant: 'info' }); },
  });

  // 回滚版本（放弃未发布的修改）
  const rollbackMutation = useMutation({
    mutationFn: (id: string) => api.post(`/skills/${id}/rollback`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skills-my'] }); setRollbackConfirm(null); enqueueSnackbar('已回滚到上次发布版本', { variant: 'success' }); },
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
      case 'rollback': setRollbackConfirm(item); break;
      case 'delete': setDeleteConfirm(item); break;
    }
  };

  return (
    <Box>
      <PageHeader
        title="我创建的技能"
        subtitle="管理你的技能，提交发布到技能市场"
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
              <TableCell sx={{ fontWeight: 700, width: 90 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>范围</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>安装量</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 130 }}>更新时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 220 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8}><EmptyState title="暂无技能" description="创建你的第一个技能" /></TableCell></TableRow>
            ) : items.map((item: any) => {
              const sm = STATUS_META[item.status] || STATUS_META.draft;
              const actions = STATUS_ACTIONS[item.status] || STATUS_ACTIONS.draft;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Extension fontSize="small" sx={{ color: '#00D4FF' }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.name}</Typography>
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
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>技能文件夹内容</Typography>
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

      {/* 回滚版本确认 */}
      <Dialog open={!!rollbackConfirm} onClose={() => setRollbackConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认回滚版本</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            确定要放弃当前未发布的修改，回滚到上次发布的版本吗？
          </Typography>
          <Typography variant="body2" color="warning.main">
             此操作将丢弃所有未发布的更改，且不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackConfirm(null)}>取消</Button>
          <Button variant="contained" color="warning" onClick={() => rollbackConfirm && rollbackMutation.mutate(rollbackConfirm.id)} disabled={rollbackMutation.isPending}>确认回滚</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
