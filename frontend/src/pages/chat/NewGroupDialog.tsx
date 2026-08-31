import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, IconButton, Chip, Button,
  InputAdornment,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { chatApi, usersApi, agentsApi, skillsApi } from '../../api/client';

interface NewGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewGroupDialog({ open, onClose }: NewGroupDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<any[]>([]);

  // 防抖搜索
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchText]);

  // 搜索用户
  const { data: usersData } = useQuery({
    queryKey: ['new-group-users', debouncedSearch],
    queryFn: () => usersApi.list({ search: debouncedSearch, page: 1, page_size: 20 }),
    enabled: open,
  });
  const availableUsers: any[] = (usersData?.data?.data || []).filter(
    (u: any) => u.id !== 'u-1' && !selectedMembers.some((s) => s.id === u.id)
  );

  // 已安装 Agent
  const { data: agentsData } = useQuery({
    queryKey: ['new-group-agents'],
    queryFn: () => agentsApi.list({ page: 1, page_size: 50 }),
    enabled: open,
  });
  const availableAgents: any[] = agentsData?.data?.data || [];

  // 已安装技能
  const { data: skillsData } = useQuery({
    queryKey: ['new-group-skills'],
    queryFn: () => skillsApi.installed({ page: 1, page_size: 50 }),
    enabled: open,
  });
  const availableSkills: any[] = skillsData?.data?.data || [];

  // 创建群组
  const createMut = useMutation({
    mutationFn: (data: any) => chatApi.sessions.create(data),
    onSuccess: (res) => {
      const newId = res.data?.data?.id;
      enqueueSnackbar('群组已创建', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      handleClose();
      if (newId) navigate(`/chat/${newId}`);
    },
    onError: () => {
      enqueueSnackbar('创建失败', { variant: 'error' });
    },
  });

  const handleClose = () => {
    setGroupName('');
    setSearchText('');
    setDebouncedSearch('');
    setSelectedMembers([]);
    setSelectedAgents([]);
    setSelectedSkills([]);
    onClose();
  };

  const handleCreate = () => {
    if (!groupName.trim()) return;
    createMut.mutate({
      title: groupName.trim(),
      session_type: 'group',
      creator_id: 'u-1',
      member_ids: ['u-1', ...selectedMembers.map((m) => m.id)],
      agent_ids: selectedAgents.map((a) => a.id),
      skill_ids: selectedSkills.map((s) => s.id),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>新建群组</Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        {/* 群名称 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>群名称 *</Typography>
          <TextField
            fullWidth size="small" autoFocus
            placeholder="输入群组名称..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              },
            }}
          />
        </Box>

        {/* 群成员 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>群成员</Typography>
          <TextField
            fullWidth size="small"
            placeholder="搜索用户添加..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
              },
            }}
          />
          {/* 已选成员 Chips */}
          {selectedMembers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              <Chip label="张伟（你）" size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 500, fontSize: 12 }} />
              {selectedMembers.map((u) => (
                <Chip
                  key={u.id}
                  label={u.name}
                  size="small"
                  onDelete={() => setSelectedMembers((prev) => prev.filter((x) => x.id !== u.id))}
                  sx={{
                    bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 500, fontSize: 12,
                    '& .MuiChip-deleteIcon': { color: '#6366f1', fontSize: 14 },
                  }}
                />
              ))}
            </Box>
          )}
          {/* 搜索结果 */}
          {debouncedSearch && availableUsers.length > 0 && (
            <Box sx={{ mt: 0.5, maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {availableUsers.map((u) => (
                <Box
                  key={u.id}
                  onClick={() => { setSelectedMembers((prev) => [...prev, u]); setSearchText(''); }}
                  sx={{
                    px: 2, py: 1, cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 1,
                    '&:hover': { bgcolor: 'rgba(99,102,241,0.06)' },
                    borderBottom: '1px solid', borderColor: 'divider',
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>{u.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{u.email || ''}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* 本群可用 Agent */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>本群可用 Agent（可选）</Typography>
          {availableAgents.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {availableAgents.map((a) => {
                const selected = selectedAgents.some((s) => s.id === a.id);
                return (
                  <Chip
                    key={a.id}
                    label={a.name}
                    size="small"
                    onClick={() => {
                      if (selected) setSelectedAgents((prev) => prev.filter((x) => x.id !== a.id));
                      else setSelectedAgents((prev) => [...prev, a]);
                    }}
                    sx={{
                      bgcolor: selected ? 'rgba(99,102,241,0.15)' : 'action.hover',
                      color: selected ? '#6366f1' : 'text.secondary',
                      fontWeight: selected ? 600 : 400, fontSize: 12,
                      border: '1px solid', borderColor: selected ? '#6366f1' : 'divider',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>暂无可用 Agent</Typography>
          )}
        </Box>

        {/* 本群可用技能 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>本群可用技能（可选）</Typography>
          {availableSkills.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {availableSkills.map((s) => {
                const selected = selectedSkills.some((x) => x.id === s.id);
                return (
                  <Chip
                    key={s.id}
                    label={s.name}
                    size="small"
                    onClick={() => {
                      if (selected) setSelectedSkills((prev) => prev.filter((x) => x.id !== s.id));
                      else setSelectedSkills((prev) => [...prev, s]);
                    }}
                    sx={{
                      bgcolor: selected ? 'rgba(99,102,241,0.15)' : 'action.hover',
                      color: selected ? '#6366f1' : 'text.secondary',
                      fontWeight: selected ? 600 : 400, fontSize: 12,
                      border: '1px solid', borderColor: selected ? '#6366f1' : 'divider',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>暂无可用技能</Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1.5 }}>
        {/* 权限说明 */}
        <Typography sx={{ fontSize: 11, color: 'info.main', lineHeight: 1.6 }}>
          本群中 AI 的调用将使用创建人（你）的全部权限，群成员均可发起对话。
        </Typography>
        <Button
          onClick={handleCreate}
          disabled={!groupName.trim() || createMut.isPending}
          variant="contained"
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 13,
            bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
          }}
        >
          {createMut.isPending ? '创建中...' : '创建群组'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
