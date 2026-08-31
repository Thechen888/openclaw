import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, IconButton, Button, Tooltip, Chip,
  Card, CardContent, Grid, MenuItem, TextField, List,
  ListItem, ListItemButton, Collapse, Divider,
} from '@mui/material';
import {
  Refresh, Add, Edit, Delete, ChevronRight, ExpandMore,
  Folder, Article, SmartButton,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState, CrudDialog } from '../../components/shared';
import api from '../../api/client';

// =================== 常量 ===================
const TYPE_OPTIONS = [
  { value: 'directory', label: '目录' },
  { value: 'menu', label: '菜单' },
  { value: 'button', label: '按钮' },
];

const TYPE_LABELS: Record<string, string> = {
  directory: '目录',
  menu: '菜单',
  button: '按钮',
};

const TYPE_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'info'> = {
  directory: 'info',
  menu: 'success',
  button: 'warning',
};

const TYPE_ICONS: Record<string, any> = {
  directory: Folder,
  menu: Article,
  button: SmartButton,
};

const EMPTY_FORM = {
  parent_id: '',
  type: 'menu',
  name: '',
  code: '',
  icon: '',
  sort_order: 0,
  permission: '',
  route: '',
  remark: '',
};

// =================== 工具函数 ===================
function buildTree(items: any[]): any[] {
  const map: Record<string, any> = {};
  items.forEach(o => { map[o.id] = { ...o, children: [] }; });
  const roots: any[] = [];
  items.forEach(o => {
    if (o.parent_id && map[o.parent_id]) {
      map[o.parent_id].children.push(map[o.id]);
    } else {
      roots.push(map[o.id]);
    }
  });
  const sortFn = (nodes: any[]) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    nodes.forEach(n => { if (n.children) sortFn(n.children); });
  };
  sortFn(roots);
  return roots;
}

function flattenTree(nodes: any[], result: any[] = []): any[] {
  nodes.forEach(n => {
    result.push(n);
    if (n.children?.length) flattenTree(n.children, result);
  });
  return result;
}

function extractMenuFields(item: any) {
  const { id: _id, children: _ch, ...payload } = item;
  return {
    parent_id: payload.parent_id || '',
    type: payload.type || 'menu',
    name: payload.name || '',
    code: payload.code || '',
    icon: payload.icon || '',
    sort_order: payload.sort_order ?? 0,
    permission: payload.permission || '',
    route: payload.route || '',
    remark: payload.remark || '',
  };
}

// =================== 树节点组件 ===================
interface TreeNodeProps {
  node: any;
  depth: number;
  expanded: Record<string, boolean>;
  selectedId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (node: any) => void;
}

function MenuTreeNode({ node, depth, expanded, selectedId, onToggleExpand, onSelect }: TreeNodeProps) {
  const isExpanded = expanded[node.id] !== false;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const Icon = TYPE_ICONS[node.type] || Article;
  const color = TYPE_COLORS[node.type] || 'default';

  return (
    <>
      <ListItem disablePadding sx={{ pl: depth * 1.5 }}>
        <ListItemButton
          selected={isSelected}
          onClick={() => onSelect(node)}
          sx={{
            borderRadius: 1,
            py: 0.75,
            px: 1,
            mb: 0.25,
            gap: 1,
            '&.Mui-selected': {
              bgcolor: 'action.selected',
              border: '1px solid',
              borderColor: 'primary.main',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={e => { e.stopPropagation(); onToggleExpand(node.id); }}
                sx={{ p: 0.25 }}
              >
                {isExpanded ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
              </IconButton>
            ) : (
              <Box sx={{ width: 26 }} />
            )}
            <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </Box>
          <Typography
            variant="body2"
            sx={{ flex: 1, fontWeight: isSelected ? 700 : 500, fontSize: 13 }}
          >
            {node.name}
          </Typography>
          <Chip
            label={TYPE_LABELS[node.type] || node.type}
            size="small"
            color={color as any}
            variant="outlined"
            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
          />
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={isExpanded}>
          <List dense disablePadding>
            {node.children.map((child: any) => (
              <MenuTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                selectedId={selectedId}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

// =================== 详情行组件 ===================
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <Grid size={3}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
      </Grid>
      <Grid size={9}>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {value || '-'}
        </Typography>
      </Grid>
    </>
  );
}

// =================== 主页面 ===================
export default function PermissionsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['perm-menus'],
    queryFn: () => api.get('/identity/permissions/menus'),
  });

  const items: any[] = data?.data?.data || [];
  const treeRoots = useMemo(() => buildTree([...items]), [items]);

  useEffect(() => {
    if (treeRoots.length > 0 && Object.keys(expanded).length === 0) {
      const defaults: Record<string, boolean> = {};
      treeRoots.forEach(r => { defaults[r.id] = true; });
      setExpanded(defaults);
    }
    if (!selectedId && items.length > 0) {
      const first = flattenTree(treeRoots)[0];
      if (first) setSelectedId(first.id);
    }
  }, [treeRoots, items, expanded, selectedId]);

  const selectedItem = items.find(m => m.id === selectedId) || null;

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/identity/permissions/menus', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-menus'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('菜单已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => api.put(`/identity/permissions/menus/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-menus'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/identity/permissions/menus/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-menus'] });
      if (selectedId) setSelectedId(null);
      enqueueSnackbar('已删除', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditItem(null);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm(extractMenuFields(item));
    setDialogOpen(true);
  };

  const handleAddChild = (parent: any) => {
    resetForm();
    setForm({ ...EMPTY_FORM, parent_id: parent.id });
    setDialogOpen(true);
  };

  const handleAddRoot = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    const hasChildren = items.some(m => m.parent_id === item.id);
    const msg = hasChildren
      ? `确认删除「${item.name}」？其子菜单/按钮将一并删除。`
      : `确认删除「${item.name}」？`;
    if (confirm(msg)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSave = () => {
    const payload = { ...form };
    if (!payload.parent_id) payload.parent_id = null;
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (node: any) => {
    setSelectedId(node.id);
  };

  const parentOptions = useMemo(() => {
    if (!editItem) return items;
    const excludeIds = new Set<string>();
    const collect = (pid: string) => {
      excludeIds.add(pid);
      items.filter(m => m.parent_id === pid).forEach(c => collect(c.id));
    };
    collect(editItem.id);
    return items.filter(m => !excludeIds.has(m.id));
  }, [items, editItem]);

  const typeColor = TYPE_COLORS[selectedItem?.type] || 'default';

  return (
    <Box>
      <PageHeader
        title="权限菜单"
        subtitle="管理菜单树与按钮权限"
        actions={
          <>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddRoot}>
              新增
            </Button>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Card sx={{ width: 320, flexShrink: 0 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 1 } }}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Folder sx={{ fontSize: 18, color: 'primary.main' }} />
                  菜单结构
                </Typography>
              </Box>
              <Divider />
              <List dense sx={{ p: 1 }}>
                {treeRoots.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    暂无菜单
                  </Typography>
                ) : (
                  treeRoots.map(node => (
                    <MenuTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      expanded={expanded}
                      selectedId={selectedId}
                      onToggleExpand={handleToggleExpand}
                      onSelect={handleSelect}
                    />
                  ))
                )}
              </List>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              {selectedItem ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {selectedItem.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedItem.permission}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEdit(selectedItem)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => handleDelete(selectedItem)}
                      >
                        删除
                      </Button>
                      {selectedItem.type !== 'button' && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => handleAddChild(selectedItem)}
                        >
                          新增子菜单
                        </Button>
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  <Grid container spacing={2} rowSpacing={2}>
                    <DetailRow label="类型" value={
                      <Chip
                        label={TYPE_LABELS[selectedItem.type] || selectedItem.type}
                        size="small"
                        color={typeColor as any}
                        variant="outlined"
                        sx={{ height: 22, fontSize: 11, fontWeight: 600 }}
                      />
                    } />
                    <DetailRow label="菜单标识" value={selectedItem.code} />
                    <DetailRow label="权限标识" value={selectedItem.permission} />
                    <DetailRow label="路由地址" value={selectedItem.route} />
                    <DetailRow label="图标" value={selectedItem.icon} />
                    <DetailRow label="排序" value={selectedItem.sort_order} />
                    <DetailRow label="备注" value={selectedItem.remark} />
                  </Grid>
                </>
              ) : (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                  请从左侧选择一个菜单查看详情
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); resetForm(); }}
        title={editItem ? `编辑 — ${editItem.name}` : '新增'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          <Grid size={6}>
            <TextField
              fullWidth select label="上级菜单"
              value={form.parent_id || ''}
              onChange={e => setForm({ ...form, parent_id: e.target.value })}
            >
              <MenuItem value="">— 根菜单 —</MenuItem>
              {parentOptions.map((m: any) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="类型"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
            >
              {TYPE_OPTIONS.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="菜单名称" required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              helperText={form.name ? '' : '请输入菜单名称'}
              error={!form.name}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="菜单标识"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
              placeholder="前端组件映射键，如 users / dashboard"
              helperText="前端组件映射键，如 users / dashboard"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="图标"
              value={form.icon}
              onChange={e => setForm({ ...form, icon: e.target.value })}
              placeholder="请输入"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="排序" type="number"
              value={form.sort_order}
              onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="权限标识"
              value={form.permission}
              onChange={e => setForm({ ...form, permission: e.target.value })}
              placeholder="请输入"
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="路由地址"
              value={form.route}
              onChange={e => setForm({ ...form, route: e.target.value })}
              placeholder="请输入"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth multiline rows={2} label="备注"
              value={form.remark}
              onChange={e => setForm({ ...form, remark: e.target.value })}
              placeholder="请输入"
            />
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
