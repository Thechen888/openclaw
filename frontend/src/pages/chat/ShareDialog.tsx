import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, IconButton, Chip,
  RadioGroup, FormControlLabel, Radio, Button,
  InputAdornment,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { chatApi, usersApi } from '../../api/client';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  message?: { id: string; content: string };
}

export default function ShareDialog({ open, onClose, sessionId, sessionTitle, message }: ShareDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [scope, setScope] = useState<'session' | 'message'>(message ? 'message' : 'session');
  const [mode, setMode] = useState<'continue' | 'view'>('continue');
  const [note, setNote] = useState('');

  // 防抖搜索
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchText]);

  // 搜索用户
  const { data: usersData } = useQuery({
    queryKey: ['share-users', debouncedSearch],
    queryFn: () => usersApi.list({ search: debouncedSearch, page: 1, page_size: 20 }),
    enabled: open,
  });
  const users: any[] = (usersData?.data?.data || []).filter(
    (u: any) => !selectedUsers.some((s) => s.id === u.id)
  );

  // 分享 mutation
  const shareMut = useMutation({
    mutationFn: (data: any) => chatApi.sessions.share(sessionId, data),
    onSuccess: (res) => {
      const count = res.data?.data?.shared_count || 0;
      enqueueSnackbar(`已发送给 ${count} 位同事，对方将在通知中心收到`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      handleClose();
    },
    onError: () => {
      enqueueSnackbar('分享失败', { variant: 'error' });
    },
  });

  const handleClose = () => {
    setSearchText('');
    setDebouncedSearch('');
    setSelectedUsers([]);
    setScope(message ? 'message' : 'session');
    setMode('continue');
    setNote('');
    onClose();
  };

  const handleSend = () => {
    if (selectedUsers.length === 0) return;
    shareMut.mutate({
      recipient_ids: selectedUsers.map((u) => u.id),
      mode,
      scope: message && scope === 'message' ? 'message' : 'session',
      message_id: message && scope === 'message' ? message.id : undefined,
      note: note.trim() || undefined,
    });
  };

  // 预览文字
  const previewText = (() => {
    if (selectedUsers.length === 0) return '';
    const names = selectedUsers.map((u) => u.name).join('、');
    const action = mode === 'continue' ? '可以继续这段对话' : '仅可查看';
    return `${names} 将在通知中心收到通知，并${action}`;
  })();

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
            bgcolor: '#ffffff',
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.08)',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>发送给同事</Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: '#71717a' }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        {/* 搜索同事 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#71717a', mb: 0.75 }}>搜索同事</Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="输入姓名搜索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: '#a1a1aa' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
              },
            }}
          />
          {/* 已选用户 Chips */}
          {selectedUsers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              {selectedUsers.map((u) => (
                <Chip
                  key={u.id}
                  label={u.name}
                  size="small"
                  onDelete={() => setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id))}
                  sx={{
                    bgcolor: 'rgba(99,102,241,0.1)',
                    color: '#6366f1',
                    fontWeight: 500,
                    fontSize: 12,
                    '& .MuiChip-deleteIcon': { color: '#6366f1', fontSize: 14 },
                  }}
                />
              ))}
            </Box>
          )}
          {/* 搜索结果下拉 */}
          {debouncedSearch && users.length > 0 && (
            <Box sx={{ mt: 0.5, maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'rgba(0,0,0,0.08)', borderRadius: 2 }}>
              {users.map((u) => (
                <Box
                  key={u.id}
                  onClick={() => {
                    setSelectedUsers((prev) => [...prev, u]);
                    setSearchText('');
                  }}
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { bgcolor: 'rgba(99,102,241,0.06)' },
                    borderBottom: '1px solid',
                    borderColor: 'rgba(0,0,0,0.04)',
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>{u.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#a1a1aa' }}>
                    {u.email || `组织: ${u.org_id || '-'}`}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* 分享范围（仅消息级入口时显示） */}
        {message && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#71717a', mb: 0.75 }}>分享范围</Typography>
            <RadioGroup
              value={scope}
              onChange={(e) => setScope(e.target.value as 'session' | 'message')}
              row
            >
              <FormControlLabel
                value="message"
                control={<Radio size="small" sx={{ color: '#a1a1aa', '&.Mui-checked': { color: '#6366f1' } }} />}
                label={<Typography sx={{ fontSize: 13 }}>仅这条消息</Typography>}
              />
              <FormControlLabel
                value="session"
                control={<Radio size="small" sx={{ color: '#a1a1aa', '&.Mui-checked': { color: '#6366f1' } }} />}
                label={<Typography sx={{ fontSize: 13 }}>整个对话</Typography>}
              />
            </RadioGroup>
          </Box>
        )}

        {/* 对方收到后 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#71717a', mb: 0.75 }}>对方收到后</Typography>
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value as 'continue' | 'view')}
          >
            <FormControlLabel
              value="continue"
              control={<Radio size="small" sx={{ color: '#a1a1aa', '&.Mui-checked': { color: '#6366f1' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>可以继续聊（转交，对话上下文完整带过去）</Typography>}
            />
            <FormControlLabel
              value="view"
              control={<Radio size="small" sx={{ color: '#a1a1aa', '&.Mui-checked': { color: '#6366f1' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>仅查看（只读，不能继续对话）</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* 捎句话 */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#71717a', mb: 0.75 }}>捎句话</Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="可选，对方打开对话时会看到这句话"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
              },
            }}
          />
        </Box>

        {/* 预览 */}
        {previewText && (
          <Typography sx={{ fontSize: 11.5, color: '#6366f1', fontStyle: 'italic' }}>
            {previewText}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={handleClose}
          sx={{ fontSize: 13, textTransform: 'none', color: '#71717a' }}
        >
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={selectedUsers.length === 0 || shareMut.isPending}
          sx={{
            fontSize: 13,
            textTransform: 'none',
            borderRadius: 2,
            bgcolor: '#6366f1',
            '&:hover': { bgcolor: '#4f46e5' },
            '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.5)' },
            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
          }}
        >
          发送
        </Button>
      </DialogActions>
    </Dialog>
  );
}
