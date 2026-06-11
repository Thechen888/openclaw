import { useState, useMemo, useEffect } from 'react';
import {
  Box, Card, CardContent, List, ListItemButton, ListItemText,
  Checkbox, Typography, IconButton, Button, Tooltip, Chip,
  Collapse, Divider,
} from '@mui/material';
import {
  Refresh, Save, ExpandLess, ExpandMore, Extension, OpenWith,
  CheckCircle, Cancel, Apartment, Group as GroupIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

interface SkillFunction {
  name: string;
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

// Map<skillId, string[]> = enabled function names per skill
type GroupPermissions = Record<string, string[]>;

export default function PermissionsPage() {
  const qc = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<GroupPermissions>({});
  const [dirty, setDirty] = useState(false);

  const groupsQ = useQuery({
    queryKey: ['perm-groups'],
    queryFn: () => api.get('/identity/permissions/groups'),
  });
  const skillsQ = useQuery({
    queryKey: ['perm-skills'],
    queryFn: () => api.get('/identity/permissions/skills'),
  });
  const permsQ = useQuery({
    queryKey: ['perm-of-group', selectedGroupId],
    queryFn: () => api.get(`/identity/permissions/groups/${selectedGroupId}`),
    enabled: !!selectedGroupId,
  });

  const groups: UserGroup[] = groupsQ.data?.data?.data || [];
  const skills: Skill[] = skillsQ.data?.data?.data || [];

  // 初始化默认选中第一个用户组
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // 切换用户组或加载完成后重置 draft 与展开态
  useEffect(() => {
    const data = permsQ.data?.data?.data as GroupPermissions | undefined;
    if (data) {
      setDraft(data);
      const expanded: Record<string, boolean> = {};
      Object.keys(data).forEach((sid) => {
        expanded[sid] = true;
      });
      setExpandedSkills(expanded);
      setDirty(false);
    }
  }, [permsQ.data, selectedGroupId]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put(`/identity/permissions/groups/${selectedGroupId}`, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perm-of-group', selectedGroupId] });
      setDirty(false);
      alert('权限已保存');
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  // 仅展示当前用户组已配置（draft 中存在键）的 Skill
  const visibleSkills = useMemo(
    () => skills.filter((s) => s.id in draft),
    [skills, draft],
  );

  const handleToggleSkill = (skill: Skill, all: boolean) => {
    setDraft((prev) => ({
      ...prev,
      [skill.id]: all ? skill.functions.map((f) => f.name) : [],
    }));
    setDirty(true);
  };

  const handleToggleFunction = (skillId: string, fnName: string) => {
    setDraft((prev) => {
      const cur = prev[skillId] || [];
      const has = cur.includes(fnName);
      return {
        ...prev,
        [skillId]: has ? cur.filter((n) => n !== fnName) : [...cur, fnName],
      };
    });
    setDirty(true);
  };

  const handleReset = () => {
    const data = permsQ.data?.data?.data as GroupPermissions | undefined;
    if (data) {
      setDraft(data);
      setDirty(false);
    }
  };

  const handleSelectGroup = (id: string) => {
    if (id === selectedGroupId) return;
    if (dirty && !confirm('当前修改未保存，确认切换用户组并放弃修改？')) return;
    setSelectedGroupId(id);
  };

  return (
    <Box>
      <PageHeader
        title="权限管理"
        subtitle="配置用户组对Skill及API的访问权限"
        actions={
          <>
            <Tooltip title="重置未保存的修改">
              <span>
                <IconButton onClick={handleReset} disabled={!dirty}>
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ position: 'relative' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                disabled={!dirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                保存
              </Button>
              {dirty && (
                <Chip
                  label="未保存"
                  size="small"
                  color="warning"
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    mt: 0.75,
                    right: 0,
                    fontSize: 10,
                    height: 18,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </>
        }
      />

      {(groupsQ.isLoading || skillsQ.isLoading) ? (
        <LoadingState />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {/* 左侧：用户组列表 */}
          <Card sx={{ width: 320, flexShrink: 0 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 1 } }}>
              <Typography variant="h6" sx={{ p: 2, fontWeight: 700 }}>
                用户组
              </Typography>
              <Divider />
              <List sx={{ p: 1 }}>
                {groups.map((g) => (
                  <ListItemButton
                    key={g.id}
                    selected={selectedGroupId === g.id}
                    onClick={() => handleSelectGroup(g.id)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      gap: 1,
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        border: '1px solid',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    {g.type === 'department' ? (
                      <Apartment color="primary" />
                    ) : (
                      <GroupIcon color="primary" />
                    )}
                    <ListItemText
                      primary={g.name}
                      secondary={g.type}
                      slotProps={{
                        primary: { variant: 'body2', sx: { fontWeight: 600 } },
                        secondary: { variant: 'caption' },
                      }}
                    />
                    <Chip
                      label={g.member_count}
                      size="small"
                      sx={{
                        height: 22,
                        minWidth: 28,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* 右侧：Skill 权限配置 */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {selectedGroup?.name} - Skill权限配置
              </Typography>

              {permsQ.isLoading ? (
                <LoadingState />
              ) : visibleSkills.length === 0 ? (
                <Typography
                  color="text.secondary"
                  sx={{ py: 4, textAlign: 'center' }}
                >
                  该用户组暂未配置任何 Skill 权限
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {visibleSkills.map((skill) => {
                    const checked = draft[skill.id] || [];
                    const total = skill.functions.length;
                    const count = checked.length;
                    const allChecked = count === total;
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
                        }}
                      >
                        {/* Skill 行 */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 1.5,
                            py: 1.5,
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={allChecked}
                            indeterminate={!allChecked && !noneChecked}
                            onChange={(e) =>
                              handleToggleSkill(skill, e.target.checked)
                            }
                            sx={{ p: 0.5 }}
                          />
                          <Extension sx={{ color: 'primary.main' }} />
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, flex: 1 }}
                          >
                            {skill.name}
                          </Typography>
                          <Chip
                            label={`${count}/${total}`}
                            size="small"
                            color={countColor}
                            variant="outlined"
                            sx={{ fontSize: 11, height: 20, fontWeight: 600 }}
                          />
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedSkills((prev) => ({
                                ...prev,
                                [skill.id]: !expanded,
                              }))
                            }
                          >
                            {expanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Box>

                        <Collapse in={expanded}>
                          <Box
                            sx={{
                              p: 1.5,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                            }}
                          >
                            {skill.functions.map((fn) => {
                              const fnChecked = checked.includes(fn.name);
                              return (
                                <Box
                                  key={fn.name}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 1,
                                    bgcolor: fnChecked
                                      ? 'action.selected'
                                      : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }}
                                >
                                  <Checkbox
                                    size="small"
                                    checked={fnChecked}
                                    onChange={() =>
                                      handleToggleFunction(skill.id, fn.name)
                                    }
                                    sx={{ p: 0.5 }}
                                  />
                                  <OpenWith
                                    sx={{
                                      color: fnChecked
                                        ? 'primary.main'
                                        : 'text.disabled',
                                      fontSize: 18,
                                    }}
                                  />
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      flex: 1,
                                      fontFamily: 'monospace',
                                      fontSize: 13,
                                    }}
                                  >
                                    {fn.name}
                                  </Typography>
                                  {fnChecked ? (
                                    <CheckCircle
                                      sx={{ color: 'success.main', fontSize: 18 }}
                                    />
                                  ) : (
                                    <Cancel
                                      sx={{ color: 'text.disabled', fontSize: 18 }}
                                    />
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
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
