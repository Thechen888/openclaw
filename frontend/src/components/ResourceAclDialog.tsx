import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Avatar,
  Select, MenuItem, IconButton, Autocomplete, TextField, Chip, Divider, FormControl,
  ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import { Delete, PersonAdd, Close, Groups, Person, SwapHoriz } from '@mui/icons-material';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { usersApi, resourceAclApi } from '../api/client';

/* ---------- 角色元数据 ---------- */
export interface RoleMeta {
  label: string;
  desc: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

/** 各模块角色档位配置 */
export const ROLE_PRESETS: Record<string, { userRoles: string[]; deptRoles: string[]; roleMeta: Record<string, RoleMeta> }> = {
  agent: {
    userRoles: ['owner', 'editor', 'viewer', 'chat_only'],
    deptRoles: ['editor', 'viewer', 'chat_only'],
    roleMeta: {
      owner: { label: '拥有者', desc: '完全控制，可转让与删除', color: 'error' },
      editor: { label: '可编辑', desc: '可修改配置与分配权限', color: 'primary' },
      viewer: { label: '只读', desc: '可查看配置与记录，不可修改', color: 'default' },
      chat_only: { label: '仅对话', desc: '可使用，不可见配置', color: 'info' },
    },
  },
  report: {
    userRoles: ['owner', 'editor', 'viewer'],
    deptRoles: ['editor', 'viewer'],
    roleMeta: {
      owner: { label: '拥有者', desc: '完全控制，可转让与删除', color: 'error' },
      editor: { label: '可编辑', desc: '可修改报告配置', color: 'primary' },
      viewer: { label: '可查看', desc: '可查看报告内容与数据', color: 'default' },
    },
  },
  knowledge_base: {
    userRoles: ['owner', 'admin', 'viewer', 'user'],
    deptRoles: ['admin', 'viewer', 'user'],
    roleMeta: {
      owner: { label: '拥有者', desc: '完全控制', color: 'error' },
      admin: { label: '管理员', desc: '可管理知识库内容与配置', color: 'primary' },
      viewer: { label: '仅查看', desc: '可查看文档，不可修改', color: 'default' },
      user: { label: '可引用', desc: '可在 Agent 中引用，不可进入库看原文', color: 'info' },
    },
  },
  skill: {
    userRoles: ['owner', 'editor', 'installer'],
    deptRoles: ['editor', 'installer'],
    roleMeta: {
      owner: { label: '拥有者', desc: '完全控制，可转让与删除', color: 'error' },
      editor: { label: '可编辑', desc: '可修改技能配置与文件', color: 'primary' },
      installer: { label: '可安装', desc: '可安装到 Agent 使用', color: 'info' },
    },
  },
};

const principalId = (c: any) => (c.principal_type === 'department' ? c.dept_id : c.user_id);

export default function ResourceAclDialog({
  open, onClose, resourceType, resourceId, resourceName,
}: {
  open: boolean;
  onClose: () => void;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
}) {
  const qc = useQueryClient();
  const preset = ROLE_PRESETS[resourceType] || ROLE_PRESETS.agent;
  const [kind, setKind] = useState<'user' | 'department'>('user');
  const [pickUser, setPickUser] = useState<any>(null);
  const [pickDept, setPickDept] = useState<any>(null);
  const [pickRole, setPickRole] = useState(preset.deptRoles[0] || preset.userRoles[0]);

  const { data: collabData } = useQuery({
    queryKey: ['resource-acl', resourceType, resourceId],
    queryFn: () => resourceAclApi.list(resourceType, resourceId),
    enabled: !!resourceId && open,
  });
  const collaborators: any[] = collabData?.data?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ['users-all-acl', resourceType, resourceId],
    queryFn: () => usersApi.list({ page_size: 200 }),
    enabled: open,
  });
  const users: any[] = usersData?.data?.data || [];

  const { data: deptData } = useQuery({
    queryKey: ['perm-groups-acl', resourceType, resourceId],
    queryFn: () => api.get('/identity/permissions/groups'),
    enabled: open,
  });
  const depts: any[] = deptData?.data?.data || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['resource-acl', resourceType, resourceId] });
  };

  const addMutation = useMutation({
    mutationFn: (d: any) => resourceAclApi.add(resourceType, resourceId, d),
    onSuccess: () => { invalidate(); setPickUser(null); setPickDept(null); setPickRole(preset.userRoles[0]); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ pid, role }: any) => resourceAclApi.update(resourceType, resourceId, pid, { role }),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (pid: string) => resourceAclApi.remove(resourceType, resourceId, pid),
    onSuccess: invalidate,
  });
  const transferMutation = useMutation({
    mutationFn: (userId: string) => resourceAclApi.add(resourceType, resourceId, { action: 'transfer', user_id: userId }),
    onSuccess: invalidate,
  });

  const existingUserIds = new Set(collaborators.filter((c) => c.principal_type !== 'department').map((c) => c.user_id));
  const existingDeptIds = new Set(collaborators.filter((c) => c.principal_type === 'department').map((c) => c.dept_id));
  const userCandidates = users.filter((u) => !existingUserIds.has(u.id));
  const deptCandidates = depts.filter((d) => !existingDeptIds.has(d.id));
  const roleOptions = kind === 'department' ? preset.deptRoles : preset.userRoles;

  const handleAdd = () => {
    if (kind === 'department') {
      if (!pickDept) return;
      addMutation.mutate({ principal_type: 'department', dept_id: pickDept.id, name: pickDept.name, member_count: pickDept.member_count, role: pickRole });
    } else {
      if (!pickUser) return;
      addMutation.mutate({ principal_type: 'user', user_id: pickUser.id, name: pickUser.name || pickUser.username, role: pickRole });
    }
  };

  const handleTransfer = (c: any) => {
    if (confirm(`确认将所有权转让给「${c.name}」？转让后你将降级为管理员。`)) {
      transferMutation.mutate(c.user_id);
    }
  };

  const switchKind = (v: 'user' | 'department') => {
    setKind(v);
    setPickRole(v === 'department' ? (preset.deptRoles[0] || preset.userRoles[0]) : preset.userRoles[0]);
  };

  const getRoleMeta = (role: string): RoleMeta => preset.roleMeta[role] || { label: role, desc: '', color: 'default' };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>协作者与权限</Typography>
          {resourceName && <Typography variant="caption" color="text.secondary">{resourceName}</Typography>}
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup
          size="small" exclusive value={kind}
          onChange={(_, v) => v && switchKind(v)}
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="user" sx={{ px: 1.5, textTransform: 'none' }}><Person fontSize="small" sx={{ mr: 0.5 }} />成员</ToggleButton>
          <ToggleButton value="department" sx={{ px: 1.5, textTransform: 'none' }}><Groups fontSize="small" sx={{ mr: 0.5 }} />组织部门</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {kind === 'department' ? (
            <Autocomplete
              size="small" sx={{ flex: 1 }} options={deptCandidates} value={pickDept}
              onChange={(_, v) => setPickDept(v)}
              getOptionLabel={(o: any) => o.name || o.id}
              renderOption={(props, o: any) => (
                <li {...props} key={o.id}>
                  <Groups fontSize="small" style={{ marginRight: 8, opacity: 0.6 }} />
                  {o.name}
                  <Chip size="small" label={`${o.member_count} 人`} sx={{ ml: 'auto', height: 18, fontSize: 10 }} />
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="选择部门" placeholder="部门下所有成员将获得权限" />}
            />
          ) : (
            <Autocomplete
              size="small" sx={{ flex: 1 }} options={userCandidates} value={pickUser}
              onChange={(_, v) => setPickUser(v)}
              getOptionLabel={(o: any) => o.name || o.username || o.id}
              renderInput={(params) => <TextField {...params} label="选择成员" placeholder="搜索用户" />}
            />
          )}
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
              {roleOptions.map((r) => (
                <MenuItem key={r} value={r}>{getRoleMeta(r).label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained" startIcon={<PersonAdd />} onClick={handleAdd}
            disabled={(kind === 'department' ? !pickDept : !pickUser) || addMutation.isPending}
          >
            添加
          </Button>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {collaborators.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              暂无协作者，请添加成员或部门
            </Typography>
          ) : collaborators.map((c) => {
            const rm = getRoleMeta(c.role);
            const isOwner = c.role === 'owner';
            const isDept = c.principal_type === 'department';
            const rOpts = isDept ? preset.deptRoles : preset.userRoles;
            return (
              <Box key={principalId(c)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}>
                <Avatar sx={{ width: 34, height: 34, fontSize: 14, bgcolor: isDept ? 'secondary.main' : 'primary.main' }}>
                  {isDept ? <Groups fontSize="small" /> : (c.name || '?').slice(0, 1)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography>
                    {isDept && <Chip size="small" label={`部门 · ${c.member_count} 人`} sx={{ height: 18, fontSize: 10 }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary">{rm.desc}</Typography>
                </Box>
                {isOwner ? (
                  <Chip size="small" label={rm.label} color={rm.color} sx={{ height: 24 }} />
                ) : (
                  <>
                    {!isDept && (
                      <Tooltip title="转让所有权">
                        <IconButton size="small" color="primary" onClick={() => handleTransfer(c)} disabled={transferMutation.isPending}>
                          <SwapHoriz fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={c.role}
                        onChange={(e) => updateMutation.mutate({ pid: principalId(c), role: e.target.value })}
                      >
                        {rOpts.map((r) => (
                          <MenuItem key={r} value={r}>{getRoleMeta(r).label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton size="small" color="error" onClick={() => removeMutation.mutate(principalId(c))}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
