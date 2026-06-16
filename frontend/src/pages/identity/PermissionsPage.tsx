import { useState, useMemo, useEffect } from 'react';
import {
  Box, Card, CardContent, List, ListItemButton, ListItemText,
  Checkbox, Typography, IconButton, Button, Tooltip, Chip,
  Collapse, Divider, Tabs, Tab, Avatar, TextField,
} from '@mui/material';
import {
  Refresh, Save, ExpandLess, ExpandMore, Extension,
  OpenWith, CheckCircle, Cancel, Apartment, Group as GroupIcon,
  People, PersonAddDisabled,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';
import { usersApi, orgsApi } from '../../api/client';

// =================== 常量 ===================
const TYPE_LABELS: Record<string, string> = {
  department: '部门', team: '团队',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员', manager: '经理', member: '成员', viewer: '观察员',
};

// =================== 类型 ===================
interface SkillFunction {
  name: string;
  display_name?: string;
}

interface Skill {
  id: string;
  name: string;
  functions: SkillFunction[];
}

interface UserGroup {
  id: string;
  name: string;
  type: 'department' | 'team';
  member_count: number;
}

type Permissions = Record<string, string[]>;

// =================== Skill 权限面板组件 ===================
function SkillPermissionPanel({
  skills,
  draft,
  readonly,
  onToggleSkill,
  onToggleFunction,
  expandedSkills,
  onToggleExpand,
}: {
  skills: Skill[];
  draft: Permissions;
  readonly?: boolean;
  onToggleSkill: (skill: Skill, all: boolean) => void;
  onToggleFunction: (skillId: string, fnName: string) => void;
  expandedSkills: Record<string, boolean>;
  onToggleExpand: (skillId: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {skills.map((skill) => {
        const checked = draft[skill.id] || [];
        const total = skill.functions.length;
        const count = checked.length;
        const allChecked = count === total && total > 0;
        const noneChecked = count === 0;
        const expanded = expandedSkills[skill.id] !== false;
        const countColor: 'success' | 'warning' | 'default' =
          allChecked ? 'success' : noneChecked ? 'default' : 'warning';

        return (
          <Box
            key={skill.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              opacity: readonly ? 0.8 : 1,
            }}
          >
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                px: 1.5, py: 1.5, bgcolor: 'action.hover',
              }}
            >
              <Checkbox
                size="small"
                checked={allChecked}
                indeterminate={!allChecked && !noneChecked}
                onChange={(e) => !readonly && onToggleSkill(skill, e.target.checked)}
                disabled={readonly}
                sx={{ p: 0.5 }}
              />
              <Extension sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
                {skill.name}
              </Typography>
              <Chip
                label={`${count}/${total}`}
                size="small"
                color={countColor}
                variant="outlined"
                sx={{ fontSize: 11, height: 20, fontWeight: 600 }}
              />
              <IconButton size="small" onClick={() => onToggleExpand(skill.id)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={expanded}>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {skill.functions.map((fn) => {
                  const fnChecked = checked.includes(fn.name);
                  return (
                    <Box
                      key={fn.name}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 1.5, py: 1, borderRadius: 1,
                        bgcolor: fnChecked ? 'action.selected' : 'transparent',
                        '&:hover': { bgcolor: readonly ? 'transparent' : 'action.hover' },
                        cursor: readonly ? 'default' : 'pointer',
                      }}
                      onClick={() => !readonly && onToggleFunction(skill.id, fn.name)}
                    >
                      <Checkbox
                        size="small"
                        checked={fnChecked}
                        disabled={readonly}
                        sx={{ p: 0.5 }}
                      />
                      <OpenWith
                        sx={{
                          color: fnChecked ? 'primary.main' : 'text.disabled',
                          fontSize: 18,
                        }}
                      />
                      <Typography variant="body2" sx={{ flex: 1, fontSize: 13 }}>
                        {fn.display_name || fn.name}
                      </Typography>
                      {fnChecked ? (
                        <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                      ) : (
                        <Cancel sx={{ color: 'text.disabled', fontSize: 18 }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}

// =================== 主页面 ===================
export default function PermissionsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<'group' | 'user'>('group');

  // ========== 公共数据 ==========
  const skillsQ = useQuery({
    queryKey: ['perm-skills'],
    queryFn: () => api.get('/identity/permissions/skills'),
  });
  const skills: Skill[] = skillsQ.data?.data?.data || [];

  // ========== 按组管理状态 ==========
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({});
  const [groupDraft, setGroupDraft] = useState<Permissions>({});
  const [groupDirty, setGroupDirty] = useState(false);

  const groupsQ = useQuery({
    queryKey: ['perm-groups'],
    queryFn: () => api.get('/identity/permissions/groups'),
  });
  const groups: UserGroup[] = groupsQ.data?.data?.data || [];

  const groupPermsQ = useQuery({
    queryKey: ['perm-of-group', selectedGroupId],
    queryFn: () => api.get(`/identity/permissions/groups/${selectedGroupId}`),
    enabled: !!selectedGroupId && tab === 'group',
  });

  // 初始化默认选中第一个组
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0 && tab === 'group') {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId, tab]);

  // 加载组权限后重置 draft
  useEffect(() => {
    const data = groupPermsQ.data?.data?.data as Permissions | undefined;
    if (data) {
      setGroupDraft(data);
      const expanded: Record<string, boolean> = {};
      Object.keys(data).forEach(sid => { expanded[sid] = true; });
      setGroupExpanded(expanded);
      setGroupDirty(false);
    }
  }, [groupPermsQ.data, selectedGroupId]);

  const saveGroupMutation = useMutation({
    mutationFn: () => api.put(`/identity/permissions/groups/${selectedGroupId}`, groupDraft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-of-group', selectedGroupId] });
      setGroupDirty(false);
      enqueueSnackbar('权限已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  // ========== 按用户管理状态 ==========
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userExpanded, setUserExpanded] = useState<Record<string, boolean>>({});
  const [userDraft, setUserDraft] = useState<Permissions>({});
  const [userDirty, setUserDirty] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // 加载所有用户和组织
  const usersQ = useQuery({
    queryKey: ['users', { page: 1, page_size: 100 }],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
    enabled: tab === 'user',
  });
  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: () => orgsApi.list(),
    enabled: tab === 'user',
  });
  const allUsers: any[] = usersQ.data?.data?.data || [];
  const allOrgs: any[] = orgsQ.data?.data?.data || orgsQ.data?.data || [];
  const orgMap = Object.fromEntries(allOrgs.map((o: any) => [o.id, o.name]));

  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const s = userSearch.toLowerCase();
    return allUsers.filter((u: any) =>
      `${u.name}${u.username}${u.email}`.toLowerCase().includes(s)
    );
  }, [allUsers, userSearch]);

  // 加载用户权限（含继承逻辑）
  const userPermsQ = useQuery({
    queryKey: ['perm-of-user', selectedUserId],
    queryFn: async () => {
      const res = await api.get(`/identity/permissions/users/${selectedUserId}`);
      const { override, fallback_group_id } = res.data.data;
      if (override) {
        return { mode: 'override' as const, draft: override, groupId: fallback_group_id };
      }
      const groupRes = fallback_group_id
        ? await api.get(`/identity/permissions/groups/${fallback_group_id}`)
        : { data: { data: {} } };
      return { mode: 'inherited' as const, draft: groupRes.data.data as Permissions, groupId: fallback_group_id };
    },
    enabled: !!selectedUserId && tab === 'user',
  });

  useEffect(() => {
    const data = userPermsQ.data;
    if (data) {
      setUserDraft(data.draft || {});
      setUserOverride(data.mode === 'override');
      const expanded: Record<string, boolean> = {};
      skills.forEach(s => { expanded[s.id] = true; });
      setUserExpanded(expanded);
      setUserDirty(false);
    }
  }, [userPermsQ.data, skills]);

  const saveUserMutation = useMutation({
    mutationFn: (payload: Permissions) =>
      api.put(`/identity/permissions/users/${selectedUserId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-of-user', selectedUserId] });
      setUserDirty(false);
      enqueueSnackbar('个人权限已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });

  // ========== 通用工具 ==========
  const handleToggleSkill = (
    draft: Permissions,
    setDraft: (v: Permissions) => void,
    setDirty: (v: boolean) => void,
    skill: Skill,
    all: boolean
  ) => {
    setDraft({ ...draft, [skill.id]: all ? skill.functions.map(f => f.name) : [] });
    setDirty(true);
  };

  const handleToggleFunction = (
    draft: Permissions,
    setDraft: (v: Permissions) => void,
    setDirty: (v: boolean) => void,
    skillId: string,
    fnName: string
  ) => {
    const cur = draft[skillId] || [];
    const has = cur.includes(fnName);
    setDraft({ ...draft, [skillId]: has ? cur.filter(n => n !== fnName) : [...cur, fnName] });
    setDirty(true);
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const selectedUser = allUsers.find((u: any) => u.id === selectedUserId);
  const selectedUserGroupName = userPermsQ.data?.groupId
    ? groups.find(g => g.id === userPermsQ.data.groupId)?.name || '未知组'
    : '无默认权限组';

  const isLoading = groupsQ.isLoading || skillsQ.isLoading;

  return (
    <Box>
      <PageHeader
        title="权限管理"
        subtitle="配置用户组或个人对 Skill 及 API 的访问权限"
      />

      <Tabs value={tab} onChange={(_, v) => {
        if (groupDirty || userDirty) {
          if (!confirm('当前修改未保存，确认切换标签页并放弃修改？')) return;
        }
        setTab(v);
      }} sx={{ mb: 2 }}>
        <Tab label="按组管理" value="group" />
        <Tab label="按用户管理" value="user" />
      </Tabs>

      {isLoading ? <LoadingState /> : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

          {/* ========== 左侧列表 ========== */}
          <Card sx={{ width: 320, flexShrink: 0 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 1 } }}>
              <Typography variant="h6" sx={{ p: 2, fontWeight: 700 }}>
                {tab === 'group' ? '用户组' : '用户'}
              </Typography>
              <Divider />

              {tab === 'group' ? (
                <List sx={{ p: 1 }}>
                  {groups.map(g => (
                    <ListItemButton
                      key={g.id}
                      selected={selectedGroupId === g.id}
                      onClick={() => {
                        if (groupDirty && !confirm('当前修改未保存，确认切换用户组并放弃修改？')) return;
                        setSelectedGroupId(g.id);
                      }}
                      sx={{
                        borderRadius: 1, mb: 0.5, gap: 1,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          border: '1px solid', borderColor: 'primary.main',
                        },
                      }}
                    >
                      {g.type === 'department' ? <Apartment color="primary" /> : <GroupIcon color="primary" />}
                      <ListItemText
                        primary={g.name}
                        secondary={TYPE_LABELS[g.type] || g.type}
                        slotProps={{
                          primary: { variant: 'body2', sx: { fontWeight: 600 } },
                          secondary: { variant: 'caption' },
                        }}
                      />
                      <Chip label={g.member_count} size="small" sx={{ height: 22, minWidth: 28, fontSize: 12, fontWeight: 600 }} />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 1.5 }}>
                  <TextField
                    fullWidth size="small" placeholder="搜索用户"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <List dense sx={{ p: 0 }}>
                    {filteredUsers.map((u: any) => (
                      <ListItemButton
                        key={u.id}
                        selected={selectedUserId === u.id}
                        onClick={() => {
                          if (userDirty && !confirm('当前修改未保存，确认切换用户并放弃修改？')) return;
                          setSelectedUserId(u.id);
                        }}
                        sx={{
                          borderRadius: 1, mb: 0.5, gap: 1,
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                            border: '1px solid', borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}>
                          {(u.name || u.username || '?').slice(0, 2)}
                        </Avatar>
                        <ListItemText
                          primary={u.name || u.username}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <span>{ROLE_LABELS[u.role] || u.role}</span>
                              {u.org_id && (
                                <Chip label={orgMap[u.org_id] || u.org_id} size="small" sx={{ height: 16, fontSize: 10 }} />
                              )}
                            </Box>
                          }
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontWeight: 600 } },
                            secondary: { variant: 'caption', sx: { display: 'flex', alignItems: 'center' } },
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ========== 右侧权限面板 ========== */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              {/* 头部 */}
              {tab === 'group' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedGroup?.name} — Skill 权限配置
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Tooltip title="重置未保存的修改">
                      <span>
                        <IconButton onClick={() => {
                          const data = groupPermsQ.data?.data?.data as Permissions | undefined;
                          if (data) { setGroupDraft(data); setGroupDirty(false); }
                        }} disabled={!groupDirty}>
                          <Refresh />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Box sx={{ position: 'relative' }}>
                      <Button
                        variant="contained" startIcon={<Save />}
                        disabled={!groupDirty || saveGroupMutation.isPending}
                        onClick={() => saveGroupMutation.mutate()}
                      >
                        保存
                      </Button>
                      {groupDirty && (
                        <Chip label="未保存" size="small" color="warning"
                          sx={{ position: 'absolute', top: '100%', mt: 0.75, right: 0, fontSize: 10, height: 18, fontWeight: 600 }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedUser ? `${selectedUser.name || selectedUser.username} — Skill 权限配置` : '请选择用户'}
                    </Typography>
                    {selectedUser && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        {!userOverride ? (
                          <>
                            <People fontSize="inherit" />
                            继承自「{selectedUserGroupName}」
                          </>
                        ) : (
                          <>
                            <PersonAddDisabled fontSize="inherit" sx={{ color: 'warning.main' }} />
                            <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>
                              已启用个人自定义权限
                            </Box>
                          </>
                        )}
                      </Typography>
                    )}
                  </Box>
                  {selectedUser && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Tooltip title="重置未保存的修改">
                        <span>
                          <IconButton onClick={() => {
                            const data = userPermsQ.data;
                            if (data) { setUserDraft(data.draft || {}); setUserDirty(false); }
                          }} disabled={!userDirty}>
                            <Refresh />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {!userOverride ? (
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setUserOverride(true);
                            setUserDirty(true);
                          }}
                        >
                          启用自定义权限
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => {
                              if (confirm('确定恢复继承组权限？个人自定义配置将被清除。')) {
                                saveUserMutation.mutate({}, {
                                  onSuccess: () => {
                                    qc.invalidateQueries({ queryKey: ['perm-of-user', selectedUserId] });
                                    setUserOverride(false);
                                  },
                                });
                              }
                            }}
                          >
                            恢复继承
                          </Button>
                          <Box sx={{ position: 'relative' }}>
                            <Button
                              variant="contained" startIcon={<Save />}
                              disabled={!userDirty || saveUserMutation.isPending}
                              onClick={() => saveUserMutation.mutate(userDraft)}
                            >
                              保存
                            </Button>
                            {userDirty && (
                              <Chip label="未保存" size="small" color="warning"
                                sx={{ position: 'absolute', top: '100%', mt: 0.75, right: 0, fontSize: 10, height: 18, fontWeight: 600 }} />
                            )}
                          </Box>
                        </>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* 权限列表 */}
              {tab === 'group' ? (
                groupPermsQ.isLoading ? <LoadingState /> : (
                  <SkillPermissionPanel
                    skills={skills}
                    draft={groupDraft}
                    readonly={false}
                    onToggleSkill={(skill, all) =>
                      handleToggleSkill(groupDraft, setGroupDraft, setGroupDirty, skill, all)
                    }
                    onToggleFunction={(sid, fn) =>
                      handleToggleFunction(groupDraft, setGroupDraft, setGroupDirty, sid, fn)
                    }
                    expandedSkills={groupExpanded}
                    onToggleExpand={(sid) => setGroupExpanded(prev => ({ ...prev, [sid]: !prev[sid] }))}
                  />
                )
              ) : (
                !selectedUserId ? (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    请从左侧选择一个用户查看权限
                  </Typography>
                ) : userPermsQ.isLoading ? <LoadingState /> : (
                  <SkillPermissionPanel
                    skills={skills}
                    draft={userDraft}
                    readonly={!userOverride}
                    onToggleSkill={(skill, all) =>
                      handleToggleSkill(userDraft, setUserDraft, setUserDirty, skill, all)
                    }
                    onToggleFunction={(sid, fn) =>
                      handleToggleFunction(userDraft, setUserDraft, setUserDirty, sid, fn)
                    }
                    expandedSkills={userExpanded}
                    onToggleExpand={(sid) => setUserExpanded(prev => ({ ...prev, [sid]: !prev[sid] }))}
                  />
                )
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
