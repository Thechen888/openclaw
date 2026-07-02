import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, IconButton, Button, Tooltip, Chip,
  Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Switch, Grid, MenuItem, Checkbox, Collapse,
  List, ListItem, ListItemButton, InputAdornment,
} from '@mui/material';
import {
  Refresh, Add, Edit, Delete, Search, ExpandMore, ChevronRight,
  Folder, Article, SmartButton,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, DataTable, LoadingState, CrudDialog, useTableState,
  EmptyState, StatusBadge,
} from '../../components/shared';
import { rolesApi } from '../../api/client';
import api from '../../api/client';

// =================== 常量 ===================
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
  name: '',
  code: '',
  sort_order: 0,
  status: 'active',
  remark: '',
  menu_ids: [] as string[],
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

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleString('zh-CN');
}

// =================== 权限树组件 ===================
interface PermTreeNodeProps {
  node: any;
  depth: number;
  expanded: Record<string, boolean>;
  checkedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleCheck: (node: any, checked: boolean) => void;
}

function PermTreeNode({ node, depth, expanded, checkedIds, onToggleExpand, onToggleCheck }: PermTreeNodeProps) {
  const isExpanded = expanded[node.id] !== false;
  const hasChildren = node.children && node.children.length > 0;
  const checked = checkedIds.has(node.id);
  const Icon = TYPE_ICONS[node.type] || Article;
  const color = TYPE_COLORS[node.type] || 'default';

  return (
    <>
      <ListItem disablePadding sx={{ pl: depth * 2 }}>
        <ListItemButton
          onClick={() => onToggleCheck(node, !checked)}
          sx={{
            borderRadius: 1,
            py: 0.5,
            px: 1,
            mb: 0.25,
            gap: 1,
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
            <Checkbox
              size="small"
              checked={checked}
              onChange={e => onToggleCheck(node, e.target.checked)}
              onClick={e => e.stopPropagation()}
              sx={{ p: 0.25 }}
            />
            <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </Box>
          <Typography variant="body2" sx={{ flex: 1, fontSize: 13 }}>
            {node.name}
          </Typography>
          <Chip
            label={TYPE_LABELS[node.type] || node.type}
            size="small"
            color={color as any}
            variant="outlined"
            sx={{ height: 18, fontSize: 10, fontWeight: 600 }}
          />
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={isExpanded}>
          <List dense disablePadding>
            {node.children.map((child: any) => (
              <PermTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                checkedIds={checkedIds}
                onToggleExpand={onToggleExpand}
                onToggleCheck={onToggleCheck}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

// =================== 主页面 ===================
export default function RolesPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, setPage, setPageSize, params } = useTableState();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });

  const [filterName, setFilterName] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [permExpanded, setPermExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['roles', params],
    queryFn: () => rolesApi.list(params),
  });

  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  const { data: menusData } = useQuery({
    queryKey: ['perm-menus'],
    queryFn: () => api.get('/identity/permissions/menus'),
  });
  const menus: any[] = menusData?.data?.data || [];
  const menuTree = useMemo(() => buildTree([...menus]), [menus]);

  // 初始化默认展开全部
  useEffect(() => {
    if (menuTree.length > 0 && Object.keys(permExpanded).length === 0) {
      const defaults: Record<string, boolean> = {};
      flattenTree(menuTree).forEach(n => { defaults[n.id] = true; });
      setPermExpanded(defaults);
    }
  }, [menuTree, permExpanded]);

  const createMutation = useMutation({
    mutationFn: (d: any) => rolesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('角色已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => rolesApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      rolesApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditItem(null);
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name || '',
      code: item.code || '',
      sort_order: item.sort_order ?? 0,
      status: item.status || 'active',
      remark: item.remark || '',
      menu_ids: item.menu_ids || [],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = { ...form };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (item: any) => {
    if (confirm(`确认删除角色「${item.name}」？`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSearch = () => {
    setPage(1);
    refetch();
  };

  const handleToggleExpand = (id: string) => {
    setPermExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 级联勾选逻辑
  const handleToggleCheck = (node: any, checked: boolean) => {
    const ids = new Set(form.menu_ids || []);
    const allIds = flattenTree([node]).map((n: any) => n.id);

    if (checked) {
      allIds.forEach((id: string) => ids.add(id));
    } else {
      allIds.forEach((id: string) => ids.delete(id));
    }

    // 若勾选子节点，自动勾选所有祖先；若取消子节点，祖先状态由其他子节点决定
    const updateAncestors = () => {
      menus.forEach(m => {
        if (!m.parent_id) return;
        const siblings = menus.filter(s => s.parent_id === m.parent_id);
        const parent = menus.find(p => p.id === m.parent_id);
        if (!parent) return;
        const allSiblingsChecked = siblings.every(s => ids.has(s.id));
        if (allSiblingsChecked) ids.add(parent.id);
      });
    };
    updateAncestors();

    setForm({ ...form, menu_ids: Array.from(ids) });
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    flattenTree(menuTree).forEach(n => { all[n.id] = true; });
    setPermExpanded(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    flattenTree(menuTree).forEach(n => { all[n.id] = false; });
    setPermExpanded(all);
  };

  const selectAll = () => {
    setForm({ ...form, menu_ids: menus.map(m => m.id) });
  };

  const deselectAll = () => {
    setForm({ ...form, menu_ids: [] });
  };

  const checkedIds = useMemo(() => new Set(form.menu_ids || []), [form.menu_ids]);

  return (
    <Box>
      <PageHeader
        title="角色管理"
        subtitle="管理平台角色及其权限分配"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => refetch()}><Refresh /></IconButton>
          </Tooltip>
        }
      />

      {/* 筛选栏 */}
      <Box sx={{
        display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center',
        p: 1.5, borderRadius: 2,
        bgcolor: 'rgba(0,212,255,0.02)',
        border: '1px solid rgba(0,212,255,0.06)',
      }}>
        <TextField
          size="small" placeholder="角色名称"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        />
        <TextField
          size="small" placeholder="权限字符"
          value={filterCode}
          onChange={e => setFilterCode(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        />
        <TextField
          select size="small" label="状态"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          sx={{ minWidth: 120, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }}
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="active">正常</MenuItem>
          <MenuItem value="disabled">禁用</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<Search />} onClick={handleSearch} size="small">
          搜索
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setDialogOpen(true); }} size="small">
          新增
        </Button>
      </Box>

      {isLoading ? <LoadingState /> : (
        <DataTable
          pagination={{
            page, pageSize, total,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>角色名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>权限字符</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>排序</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>创建时间</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState title="暂无角色" description="创建第一个角色" />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: any) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {item.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.sort_order ?? 0}</TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={item.status === 'active'}
                        onChange={e => toggleStatusMutation.mutate({ id: item.id, status: e.target.checked ? 'active' : 'disabled' })}
                      />
                    </TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => handleEdit(item)}><Edit fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error" onClick={() => handleDelete(item)}><Delete fontSize="small" /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTable>
      )}

      {/* 新增/编辑弹窗 */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); resetForm(); }}
        title={editItem ? `编辑角色 — ${editItem.name}` : '新增'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          <Grid size={4}>
            <TextField
              fullWidth label="角色名称" required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth label="权限字符" required
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value })}
            />
          </Grid>
          <Grid size={4}>
            <TextField
              fullWidth label="排序" type="number"
              value={form.sort_order}
              onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="状态"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="active">正常</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth label="备注"
              value={form.remark}
              onChange={e => setForm({ ...form, remark: e.target.value })}
            />
          </Grid>

          {/* 权限树 */}
          <Grid size={12}>
            <Box sx={{
              border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5,
              bgcolor: 'rgba(0,0,0,0.2)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  勾选该角色可访问的菜单与按钮权限
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={expandAll}>展开全部</Button>
                  <Button size="small" onClick={collapseAll}>折叠全部</Button>
                  <Button size="small" onClick={selectAll}>全选</Button>
                  <Button size="small" onClick={deselectAll}>取消全选</Button>
                </Box>
              </Box>
              <List dense sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
                {menuTree.map(node => (
                  <PermTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={permExpanded}
                    checkedIds={checkedIds}
                    onToggleExpand={handleToggleExpand}
                    onToggleCheck={handleToggleCheck}
                  />
                ))}
              </List>
            </Box>
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
