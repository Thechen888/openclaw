import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, IconButton, Chip, Button,
  InputAdornment,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { chatApi, usersApi } from '../../api/client';

interface AddMembersDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
  sessionTitle?: string;
  isGroup?: boolean;
  existingMemberIds?: string[];
  groupId?: string;
}

export default function AddMembersDialog({ open, onClose, sessionId = '', sessionTitle = '', isGroup = false, existingMemberIds = [], groupId }: AddMembersDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState(sessionTitle);

  // 弹窗打开时同步 sessionTitle
  useEffect(() => {
    if (open) setGroupName(sessionTitle);
  }, [open, sessionTitle]);

  // 防抖搜索
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchText]);

  // 搜索用户（排除 u-1 和已有成员）
  const { data: usersData } = useQuery({
    queryKey: ['add-members-users', debouncedSearch],
    queryFn: () => usersApi.list({ search: debouncedSearch, page: 1, page_size: 20 }),
    enabled: open,
  });
  const excludeIds = new Set(['u-1', ...existingMemberIds]);
  const availableUsers: any[] = (usersData?.data?.data || []).filter(
    (u: any) => !excludeIds.has(u.id) && !selectedUsers.some((s) => s.id === u.id)
  );

  // 添加成员 mutation
  const addMut = useMutation({
    mutationFn: (userIds: string[]) => {
      if (groupId) return chatApi.groups.addMembers(groupId, userIds);
      return chatApi.sessions.addMembers(sessionId, userIds, !isGroup ? groupName : undefined);
    },
    onSuccess: () => {
      const count = selectedUsers.length;
      enqueueSnackbar(groupId ? `已添加 ${count} 名成员` : isGroup ? `已添加 ${count} 名成员` : '已转为群组', { variant: 'success' });
      if (groupId) {
        qc.invalidateQueries({ queryKey: ['chat-groups'] });
        qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      } else {
        qc.invalidateQueries({ queryKey: ['chat-session', sessionId] });
        qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      }
      handleClose();
    },
    onError: () => {
      enqueueSnackbar('操作失败', { variant: 'error' });
    },
  });

  const handleClose = () => {
    setSearchText('');
    setDebouncedSearch('');
    setSelectedUsers([]);
    setGroupName(sessionTitle);
    onClose();
  };

  const handleConfirm = () => {
    if (selectedUsers.length === 0) return;
    addMut.mutate(selectedUsers.map((u) => u.id));
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
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{groupId ? '添加成员' : isGroup ? '添加成员' : '转为群组'}</Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1, pt: 2.5 }}>
        {/* 群组名称（仅非群组时显示） */}
        {!isGroup && !groupId && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>群组名称</Typography>
            <TextField
              fullWidth size="small" autoFocus
              placeholder="请输入群组名称"
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
        )}
        {/* 搜索用户 */}
        <TextField
          fullWidth size="small" autoFocus={isGroup || !!groupId}
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
        {selectedUsers.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            {selectedUsers.map((u) => (
              <Chip
                key={u.id}
                label={u.name}
                size="small"
                onDelete={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}
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
          <Box sx={{ mt: 0.5, maxHeight: 180, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            {availableUsers.map((u) => (
              <Box
                key={u.id}
                onClick={() => { setSelectedUsers((prev) => [...prev, u]); setSearchText(''); }}
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {/* 说明 */}
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
          新成员将看到本对话的全部历史消息。
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
          本群 AI 调用使用创建人（张伟）的全部权限，群成员均可发起对话。
        </Typography>
        <Button
          onClick={handleConfirm}
          disabled={selectedUsers.length === 0 || addMut.isPending}
          variant="contained"
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 13,
            bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
          }}
        >
          {addMut.isPending ? '处理中...' : (groupId ? '添加' : isGroup ? '添加' : '转为群组')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
