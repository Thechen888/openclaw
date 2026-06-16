import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Button, Tooltip, Typography, Switch, Drawer, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, List, ListItemButton,
  ListItemText, ListItemIcon, Divider,
} from '@mui/material';
import {
  Add, Refresh, Delete, Description, Settings, Article,
  Close, Save,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { skillsApi } from '../../api/client';
import api from '../../api/client';

// =================== 文件编辑器弹窗 ===================
function FileEditorDialog({
  open,
  skillId,
  filePath,
  onClose,
}: {
  open: boolean;
  skillId: string;
  filePath: string;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['skill-file', skillId, filePath],
    queryFn: () => api.get(`/skills/${skillId}/files/${filePath}`),
    enabled: open && !!skillId && !!filePath,
  });

  useEffect(() => {
    if (data) {
      setContent(data.data.data.content || '');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/skills/${skillId}/files/${filePath}`, { content }),
    onSuccess: () => {
      enqueueSnackbar('文件已保存', { variant: 'success' });
      onClose();
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const lines = useMemo(() => content.split('\n'), [content]);
  const lineNumbers = useMemo(() => lines.map((_, i) => i + 1), [lines]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
          {filePath}
        </Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: '#1e1e1e' }}>
        {isLoading ? (
          <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingState />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: 520 }}>
            {/* 行号 */}
            <Box
              sx={{
                bgcolor: '#1e1e1e', color: '#858585', p: 1.5, pt: 1,
                textAlign: 'right', fontFamily: 'monospace', fontSize: 13,
                lineHeight: '20px', userSelect: 'none', overflow: 'hidden',
                borderRight: '1px solid', borderColor: '#333',
              }}
            >
              {lineNumbers.map(n => (
                <Box key={n} sx={{ height: '20px' }}>{n}</Box>
              ))}
            </Box>
            {/* 编辑区 */}
            <Box sx={{ flex: 1, position: 'relative' }}>
              <TextField
                multiline
                fullWidth
                value={content}
                onChange={e => setContent(e.target.value)}
                sx={{
                  height: '100%',
                  '& .MuiInputBase-root': {
                    height: '100%',
                    alignItems: 'flex-start',
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: '20px',
                    p: 1,
                    overflow: 'auto',
                  },
                  '& .MuiInputBase-input': {
                    p: 0,
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-track': { bgcolor: '#1e1e1e' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#424242', borderRadius: 4 },
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, bgcolor: '#252526', borderTop: '1px solid #333' }}>
        <Button onClick={onClose} sx={{ color: '#ccc' }}>取消</Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// =================== 主页面 ===================
export default function SkillsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightIds = (searchParams.get('highlight') || '').split(',').filter(Boolean);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsItem, setSettingsItem] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });

  const [drawerSkill, setDrawerSkill] = useState<any>(null);
  const [editFilePath, setEditFilePath] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills', params],
    queryFn: () => skillsApi.list(params),
  });
  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  // 高亮行加载后自动滚动
  useEffect(() => {
    if (highlightIds.length > 0 && highlightRowRef.current) {
      highlightRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [items.length]);

  const clearHighlight = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('highlight');
    setSearchParams(next, { replace: true });
  };

  // 文件列表
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

  const createMutation = useMutation({
    mutationFn: (d: any) => skillsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      enqueueSnackbar('技能已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => skillsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });

  const handleToggleStatus = (item: any) => {
    const nextStatus = item.status === 'active' ? 'disabled' : 'active';
    updateMutation.mutate({ id: item.id, data: { status: nextStatus } }, {
      onSuccess: () => enqueueSnackbar(nextStatus === 'active' ? '已启用' : '已禁用', { variant: 'success' }),
    });
  };

  const handleOpenSettings = (item: any) => {
    setSettingsItem(item);
    setSettingsForm({ name: item.name, description: item.description || '' });
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    if (!settingsItem) return;
    updateMutation.mutate({
      id: settingsItem.id,
      data: { name: settingsForm.name, description: settingsForm.description },
    }, {
      onSuccess: () => {
        setSettingsOpen(false);
        enqueueSnackbar('已保存', { variant: 'success' });
      },
    });
  };

  return (
    <Box>
      <PageHeader
        title="技能管理"
        subtitle="管理平台技能"
        actions={
          <>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setCreateForm({ name: '', description: '' }); setCreateOpen(true); }}>
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
              <TableCell sx={{ fontWeight: 700, width: 160 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 200 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState title="暂无技能" description="创建第一个技能" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => {
              const isHighlight = highlightIds.includes(item.id);
              return (
                <TableRow
                  key={item.id}
                  hover
                  ref={isHighlight && idx === items.findIndex((x: any) => highlightIds.includes(x.id)) ? highlightRowRef : undefined}
                  sx={isHighlight ? {
                    bgcolor: 'rgba(255, 193, 7, 0.18)',
                    '&:hover': { bgcolor: 'rgba(255, 193, 7, 0.28) !important' },
                    borderLeft: '3px solid',
                    borderLeftColor: 'warning.main',
                  } : undefined}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, maxWidth: 600 }}>
                      {item.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {item.created_at || '-'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Switch
                        size="small"
                        checked={item.status === 'active'}
                        onChange={() => handleToggleStatus(item)}
                      />
                      <Tooltip title="文件列表">
                        <IconButton size="small" onClick={() => setDrawerSkill(item)}>
                          <Description fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="设置">
                        <IconButton size="small" onClick={() => handleOpenSettings(item)}>
                          <Settings fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm(`确认删除技能「${item.name}」?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* 创建技能弹窗 */}
      <CrudDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="创建技能"
        onSave={() => createMutation.mutate(createForm)}
        saving={createMutation.isPending}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth label="技能名称" required
            placeholder="例如：smart-assistant、code-review"
            value={createForm.name}
            onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
          />
          <TextField
            fullWidth label="描述" multiline rows={3}
            placeholder="描述这个技能的用途和功能..."
            value={createForm.description}
            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
          />
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
              技能文件夹内容
            </Typography>
            <Button variant="outlined" size="small" disabled>
              选择文件夹
            </Button>
            <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
              mock 模式下文件夹选择仅作演示
            </Typography>
          </Box>
        </Box>
      </CrudDialog>

      {/* 设置弹窗（编辑技能 + 文件管理） */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            编辑技能 — {settingsItem?.name || ''}
          </Typography>
          <IconButton size="small" onClick={() => setSettingsOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 基本信息 */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>
                基本信息
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth label="技能名称" required size="small"
                  value={settingsForm.name}
                  onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
                />
                <TextField
                  fullWidth label="描述" multiline rows={3} size="small"
                  value={settingsForm.description}
                  onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })}
                />
              </Box>
            </Box>

            {/* 技能文件夹内容 */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.primary' }}>
                技能文件夹内容
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="contained" size="small">
                  选择文件夹
                </Button>
                <Button
                  variant="outlined" color="error" size="small" startIcon={<Delete />}
                  onClick={() => {
                    if (confirm('确认删除该技能下的所有文件？')) {
                      // mock 模式下清空文件列表
                      enqueueSnackbar('文件已清空（mock）', { variant: 'success' });
                    }
                  }}
                >
                  删除所有文件
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                已有 {settingsFiles.length} 个文件
              </Typography>
              <Box sx={{
                border: '1px solid', borderColor: 'divider', borderRadius: 1,
                maxHeight: 240, overflow: 'auto', mt: 0.5, bgcolor: 'background.paper',
              }}>
                {settingsFiles.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">暂无文件</Typography>
                  </Box>
                ) : (
                  <List dense sx={{ p: 0 }}>
                    {settingsFiles.map((f: any) => (
                      <ListItemButton
                        key={f.path}
                        onClick={() => {
                          setEditFilePath(f.path);
                        }}
                        sx={{ py: 0.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <Article fontSize="small" sx={{ color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={f.path}
                          secondary={`${f.size} bytes · ${f.updatedAt}`}
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } },
                            secondary: { variant: 'caption' },
                          }}
                        />
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
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={updateMutation.isPending}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      {/* 文件列表 Drawer */}
      <Drawer
        anchor="right"
        open={!!drawerSkill}
        onClose={() => setDrawerSkill(null)}
        sx={{ '& .MuiDrawer-paper': { width: 400 } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {drawerSkill?.name}
            </Typography>
            <IconButton size="small" onClick={() => setDrawerSkill(null)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {files.length === 0 ? (
              <EmptyState title="暂无文件" description="该技能下没有文件" />
            ) : (
              <List dense>
                {files.map((f: any) => (
                  <ListItemButton
                    key={f.path}
                    onClick={() => setEditFilePath(f.path)}
                    sx={{ py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Article fontSize="small" sx={{ color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={f.path}
                      secondary={`${f.size} bytes · ${f.updatedAt}`}
                      slotProps={{
                        primary: { variant: 'body2', sx: { fontFamily: 'monospace', fontSize: 13 } },
                        secondary: { variant: 'caption' },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* 文件编辑器 */}
      {drawerSkill && editFilePath && (
        <FileEditorDialog
          open={!!editFilePath}
          skillId={drawerSkill.id}
          filePath={editFilePath}
          onClose={() => setEditFilePath('')}
        />
      )}
    </Box>
  );
}
