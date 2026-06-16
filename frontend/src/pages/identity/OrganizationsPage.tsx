import { useState, useMemo } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, Avatar, List, ListItem,
  ListItemAvatar, ListItemText, ListItemSecondaryAction, Select, FormControl,
  InputLabel, Alert,
} from '@mui/material';
import {
  Add, Edit, Delete, Refresh, People, PersonAdd, PersonRemove,
  ExpandMore, ChevronRight, AccountTree,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, StatusBadge,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { orgsApi, usersApi } from '../../api/client';

// =================== 常量 ===================
const ORG_TYPE_LABELS: Record<string, string> = {
  company:    '公司',
  department: '部门',
  team:       '团队',
  project:    '项目',
};
const ORG_TYPES = Object.entries(ORG_TYPE_LABELS);

const TYPE_COLORS: Record<string, string> = {
  company:    'primary',
  department: 'secondary',
  team:       'success',
  project:    'warning',
};

// =================== 工具函数 ===================
/** 将扁平数组构建为树（children 字段） */
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
  return roots;
}

/** 提取可提交字段，剔除服务端字段 */
function extractOrgFields(item: any) {
  const { id: _id, member_count: _mc, children: _ch, created_at: _ca, ...payload } = item;
  return payload;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.slice(0, 2);
}

// =================== 树节点组件 ===================
interface TreeNodeProps {
  node: any;
  depth: number;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onManageMembers: (item: any) => void;
}

function OrgTreeNode({ node, depth, onEdit, onDelete, onManageMembers }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <TableRow hover sx={{ bgcolor: depth === 0 ? 'action.hover' : 'transparent' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', pl: depth * 3 }}>
            {hasChildren ? (
              <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ mr: 0.5, p: 0.25 }}>
                {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 28, mr: 0.5 }} />
            )}
            <AccountTree sx={{ fontSize: 16, color: 'text.secondary', mr: 0.75 }} />
            <Typography variant="body2" sx={{ fontWeight: depth === 0 ? 700 : 500 }}>
              {node.name}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={ORG_TYPE_LABELS[node.type] || node.type}
            size="small"
            color={(TYPE_COLORS[node.type] || 'default') as any}
            variant="outlined"
            sx={{ fontSize: 11, height: 22 }}
          />
        </TableCell>
        <TableCell><StatusBadge status={node.status} /></TableCell>
        <TableCell>
          <Tooltip title="管理成员">
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', width: 'fit-content' }}
              onClick={() => onManageMembers(node)}
            >
              <People sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {node.member_count ?? 0}
              </Typography>
            </Box>
          </Tooltip>
        </TableCell>
        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{node.description || '-'}</TableCell>
        <TableCell>
          <Tooltip title="管理成员">
            <IconButton size="small" color="primary" onClick={() => onManageMembers(node)}>
              <PersonAdd fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="编辑">
            <IconButton size="small" onClick={() => onEdit(node)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton size="small" color="error" onClick={() => onDelete(node)}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      {expanded && hasChildren && node.children.map((child: any) => (
        <OrgTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          onManageMembers={onManageMembers}
        />
      ))}
    </>
  );
}

// =================== 成员管理弹窗 ===================
interface MemberDialogProps {
  org: any | null;
  open: boolean;
  onClose: () => void;
  allOrgs: any[];
}

function MemberDialog({ org, open, onClose, allOrgs }: MemberDialogProps) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [addUserId, setAddUserId] = useState('');

  const { data: memberData } = useQuery({
    queryKey: ['org-members', org?.id],
    queryFn: () => orgsApi.members(org!.id),
    enabled: open && !!org?.id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', { page: 1, page_size: 100 }],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const members: any[] = memberData?.data?.data || memberData?.data || [];
  const allUsers: any[] = usersData?.data?.data || [];
  const memberIds = new Set(members.map((m: any) => m.id));
  const availableUsers = allUsers.filter((u: any) => !memberIds.has(u.id));

  const addMutation = useMutation({
    mutationFn: (userId: string) => orgsApi.addMember(org!.id, { user_id: userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', org?.id] });
      qc.invalidateQueries({ queryKey: ['orgs'] });
      setAddUserId('');
      enqueueSnackbar('成员已添加', { variant: 'success' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => orgsApi.removeMember(org!.id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', org?.id] });
      qc.invalidateQueries({ queryKey: ['orgs'] });
      enqueueSnackbar('成员已移除', { variant: 'success' });
    },
  });

  const ROLE_LABELS: Record<string, string> = {
    admin: '管理员', manager: '经理', member: '成员', viewer: '观察员',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <People />
          <span>{org?.name} — 成员管理</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* 当前成员 */}
        <Typography variant="subtitle2" sx={{ mb: 1, mt: 0.5 }}>
          当前成员（{members.length} 人）
        </Typography>
        {members.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>该组织暂无成员，请从下方添加。</Alert>
        ) : (
          <List dense sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {members.map((m: any) => (
              <ListItem key={m.id} divider>
                <ListItemAvatar>
                  <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: 'primary.main' }}>
                    {getInitials(m.name || m.username)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={m.name || m.username}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <span>{m.email || '-'}</span>
                      <Chip
                        label={ROLE_LABELS[m.role] || m.role}
                        size="small"
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Tooltip title="移出组织">
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => removeMutation.mutate(m.id)}
                      disabled={removeMutation.isPending}
                    >
                      <PersonRemove fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* 添加成员 */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>添加成员</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>选择用户</InputLabel>
            <Select
              value={addUserId}
              label="选择用户"
              onChange={e => setAddUserId(e.target.value)}
            >
              {availableUsers.length === 0 ? (
                <MenuItem disabled value="">暂无可添加的用户</MenuItem>
              ) : availableUsers.map((u: any) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name || u.username}（{ROLE_LABELS[u.role] || u.role}）
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => addUserId && addMutation.mutate(addUserId)}
            disabled={!addUserId || addMutation.isPending}
            sx={{ whiteSpace: 'nowrap' }}
          >
            添加
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

// =================== 主页面 ===================
const EMPTY_FORM = { name: '', type: 'department', parent_id: '', status: 'active', description: '' };

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [memberDialogOrg, setMemberDialogOrg] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => orgsApi.list(),
  });

  const rawItems: any[] = data?.data?.data || data?.data || [];

  // 过滤 + 树形
  const treeRoots = useMemo(() => {
    const filtered = search
      ? rawItems.filter(o => JSON.stringify(o).toLowerCase().includes(search.toLowerCase()))
      : rawItems;
    return buildTree(filtered);
  }, [rawItems, search]);

  const createMutation = useMutation({
    mutationFn: (d: any) => orgsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgs'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('组织已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => orgsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgs'] });
      setDialogOpen(false);
      resetForm();
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orgsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgs'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditItem(null); };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm(extractOrgFields(item));
    setDialogOpen(true);
  };

  const handleDelete = (item: any) => {
    if (confirm(`确认删除「${item.name}」？删除后子组织将变为根节点。`)) {
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

  // 所有组织列表（用于「上级组织」下拉，编辑时过滤掉自身）
  const parentOptions = rawItems.filter(o => !editItem || o.id !== editItem.id);

  return (
    <Box>
      <PageHeader
        title="组织架构"
        subtitle="以树形结构管理公司、部门与团队"
        actions={
          <>
            <Tooltip title="刷新">
              <IconButton onClick={() => refetch()}><Refresh /></IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => { resetForm(); setDialogOpen(true); }}
            >
              添加组织
            </Button>
          </>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>组织名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>成员数</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>描述</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {treeRoots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState title="暂无组织" description="创建第一个组织架构节点" />
                  </TableCell>
                </TableRow>
              ) : treeRoots.map(node => (
                <OrgTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onManageMembers={setMemberDialogOrg}
                />
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* 新建/编辑弹窗 */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); resetForm(); }}
        title={editItem ? `编辑组织 — ${editItem.name}` : '添加组织'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={12}>
            <TextField
              fullWidth label="组织名称" required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="类型"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
            >
              {ORG_TYPES.map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              fullWidth select label="状态"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth select label="上级组织（留空则为根节点）"
              value={form.parent_id || ''}
              onChange={e => setForm({ ...form, parent_id: e.target.value || null })}
            >
              <MenuItem value="">— 无上级（根节点）—</MenuItem>
              {parentOptions.map((o: any) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}（{ORG_TYPE_LABELS[o.type] || o.type}）
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth multiline rows={3} label="描述"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
        </Grid>
      </CrudDialog>

      {/* 成员管理弹窗 */}
      <MemberDialog
        org={memberDialogOrg}
        open={!!memberDialogOrg}
        onClose={() => setMemberDialogOrg(null)}
        allOrgs={rawItems}
      />
    </Box>
  );
}
