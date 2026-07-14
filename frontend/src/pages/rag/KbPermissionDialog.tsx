import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Avatar,
  Select, MenuItem, IconButton, Autocomplete, TextField, Chip, Divider, FormControl,
  ToggleButton, ToggleButtonGroup, Tooltip,
} from '@mui/material';
import { Delete, PersonAdd, Close, Groups, Person, Security } from '@mui/icons-material';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { ragApi, usersApi } from '../../api/client';

// 知识库角色定义
type KbRole = 'owner' | 'admin' | 'editor' | 'viewer';

const KB_ROLE_META: Record<KbRole, { label: string; color: any; desc: string }> = {
  owner: { label: '拥有者', color: 'primary', desc: '完全控制，可转让与删除' },
  admin: { label: '管理员', color: 'secondary', desc: '可配置渠道、查看日志、分配权限、删除' },
  editor: { label: '可编辑', color: 'info', desc: '可查看和编辑知识库，不可删除' },
  viewer: { label: '仅查看', color: 'default', desc: '仅可查看知识库内容与对话' },
};

const USER_ROLES: KbRole[] = ['admin', 'editor', 'viewer'];
const DEPT_ROLES: KbRole[] = ['editor', 'viewer'];

const principalId = (c: any) => (c.principal_type === 'department' ? c.dept_id : c.user_id);

export default function KbPermissionDialog({
  open, onClose, kb,
}: {
  open: boolean;
  onClose: () => void;
  kb: any;
}) {
  const qc = useQueryClient();
  const kbId = kb?.id;
  const [kind, setKind] = useState<'user' | 'department'>('user');
  const [pickUser, setPickUser] = useState<any>(null);
  const [pickDept, setPickDept] = useState<any>(null);
  const [pickRole, setPickRole] = useState<KbRole>('viewer');

  const { data: collabData } = useQuery({
    queryKey: ['kb-collaborators', kbId],
    queryFn: () => ragApi.knowledgeBases.collaborators(kbId),
    enabled: !!kbId && open,
  });
  const collaborators: any[] = collabData?.data?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ['users-all-kb-perm'],
    queryFn: () => usersApi.list({ page_size: 200 }),
    enabled: open,
  });
  const users: any[] = usersData?.data?.data || [];

  const { data: deptData } = useQuery({
    queryKey: ['perm-groups-kb-perm'],
    queryFn: () => api.get('/identity/permissions/groups'),
    enabled: open,
  });
  const depts: any[] = deptData?.data?.data || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['kb-collaborators', kbId] });
  };

  const addMutation = useMutation({
    mutationFn: (d: any) => ragApi.knowledgeBases.addCollaborator(kbId, d),
    onSuccess: () => { invalidate(); setPickUser(null); setPickDept(null); setPickRole('viewer'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ pid, role }: any) => ragApi.knowledgeBases.updateCollaborator(kbId, pid, { role }),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (pid: string) => ragApi.knowledgeBases.removeCollaborator(kbId, pid),
    onSuccess: invalidate,
  });

  const existingUserIds = new Set(collaborators.filter((c) => c.principal_type !== 'department').map((c) => c.user_id));
  const existingDeptIds = new Set(collaborators.filter((c) => c.principal_type === 'department').map((c) => c.dept_id));
  const userCandidates = users.filter((u) => !existingUserIds.has(u.id));
  const deptCandidates = depts.filter((d) => !existingDeptIds.has(d.id));

  const roleOptions = kind === 'department' ? DEPT_ROLES : USER_ROLES;

  const handleAdd = () => {
    if (kind === 'department') {
      if (!pickDept) return;
      addMutation.mutate({ principal_type: 'department', dept_id: pickDept.id, name: pickDept.name, member_count: pickDept.member_count, role: pickRole });
    } else {
      if (!pickUser) return;
      addMutation.mutate({ principal_type: 'user', user_id: pickUser.id, name: pickUser.name || pickUser.username, role: pickRole });
    }
  };

  const switchKind = (v: 'user' | 'department') => {
    setKind(v);
    setPickRole('viewer');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, border: '1px solid rgba(0,212,255,0.12)' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security sx={{ color: '#00D4FF', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16 }}>协作者与权限</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">{kb?.name}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: '16px !important', px: 3, pb: 3 }}>
        {/* 授权对象类型切换 */}
        <ToggleButtonGroup
          size="small" exclusive value={kind}
          onChange={(_, v) => v && switchKind(v)}
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="user" sx={{ px: 1.5, textTransform: 'none', fontSize: 12 }}><Person fontSize="small" sx={{ mr: 0.5 }} />成员</ToggleButton>
          <ToggleButton value="department" sx={{ px: 1.5, textTransform: 'none', fontSize: 12 }}><Groups fontSize="small" sx={{ mr: 0.5 }} />组织部门</ToggleButton>
        </ToggleButtonGroup>

        {/* 添加协作者 */}
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
            <Select value={pickRole} onChange={(e) => setPickRole(e.target.value as KbRole)}>
              {roleOptions.map((r) => (
                <MenuItem key={r} value={r}>{KB_ROLE_META[r].label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained" size="small" startIcon={<PersonAdd />} onClick={handleAdd}
            disabled={(kind === 'department' ? !pickDept : !pickUser) || addMutation.isPending}
          >
            添加
          </Button>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* 协作者列表 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {collaborators.map((c) => {
            const rm = KB_ROLE_META[(c.role as KbRole)] || KB_ROLE_META.viewer;
            const isOwner = c.role === 'owner';
            const isDept = c.principal_type === 'department';
            const roleOpts = isDept ? DEPT_ROLES : USER_ROLES;
            return (
              <Box key={principalId(c)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: 'rgba(0,212,255,0.02)', '&:hover': { bgcolor: 'rgba(0,212,255,0.04)' } }}>
                <Avatar sx={{ width: 34, height: 34, fontSize: 14, bgcolor: isDept ? 'rgba(124,58,237,0.2)' : 'rgba(0,212,255,0.15)', color: isDept ? '#CE93D8' : '#00D4FF' }}>
                  {isDept ? <Groups fontSize="small" /> : (c.name || '?').slice(0, 1)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{c.name}</Typography>
                    {isDept && <Chip size="small" label={`部门 · ${c.member_count} 人`} sx={{ height: 18, fontSize: 10 }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{rm.desc}</Typography>
                </Box>
                {isOwner ? (
                  <Chip size="small" label={rm.label} sx={{ height: 24, fontSize: 11, bgcolor: 'rgba(0,212,255,0.15)', color: '#00D4FF' }} />
                ) : (
                  <>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={c.role}
                        onChange={(e) => updateMutation.mutate({ pid: principalId(c), role: e.target.value })}
                        sx={{ fontSize: 12, height: 30 }}
                      >
                        {roleOpts.map((r) => (
                          <MenuItem key={r} value={r} sx={{ fontSize: 12 }}>{KB_ROLE_META[r].label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton size="small" onClick={() => removeMutation.mutate(principalId(c))} sx={{ color: 'text.secondary', '&:hover': { color: '#FF3366' } }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
