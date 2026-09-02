import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, IconButton, Chip,
  RadioGroup, FormControlLabel, Radio, Button,
  InputAdornment, Collapse,
} from '@mui/material';
import { Close, Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { chatApi, usersApi } from '../../api/client';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  selectedMessages: { id: string; role: string; content: string; to_ai?: boolean }[];
  sourceReadonly?: boolean;
}

export default function ShareDialog({ open, onClose, sessionId, sessionTitle, selectedMessages, sourceReadonly }: ShareDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [mode, setMode] = useState<'continue' | 'view'>('continue');
  const [note, setNote] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(false);

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
    setMode('continue');
    setNote('');
    setPreviewExpanded(false);
    onClose();
  };

  const handleSend = () => {
    if (selectedUsers.length === 0) return;
    shareMut.mutate({
      recipient_ids: selectedUsers.map((u) => u.id),
      mode,
      message_ids: selectedMessages.map(m => m.id),
      note: note.trim() || undefined,
    });
  };

  // 预览文字
  const previewText = (() => {
    if (selectedUsers.length === 0) return '';
    const names = selectedUsers.map((u) => u.name).join('、');
    const action = mode === 'continue' ? '可以继续这段对话' : '仅可查看';
    return `${names} 将在通知中心收到通知，并${action}（共 ${selectedMessages.length} 条消息）`;
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
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>发送给同事</Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        {/* 已精选消息摘要 */}
        <Box sx={{ mb: 2 }}>
          <Box
            onClick={() => setPreviewExpanded(!previewExpanded)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              cursor: 'pointer', py: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 1.5, px: 1,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', flex: 1 }}>
              已精选 {selectedMessages.length} 条消息
            </Typography>
            {previewExpanded ? <ExpandLess sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ExpandMore sx={{ fontSize: 16, color: 'text.secondary' }} />}
          </Box>
          <Collapse in={previewExpanded}>
            <Box sx={{ mt: 0.5, maxHeight: 160, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2, py: 0.5 }}>
              {selectedMessages.map((m, idx) => (
                <Box key={m.id} sx={{
                  px: 2, py: 0.75, fontSize: 12,
                  borderBottom: idx < selectedMessages.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: m.role === 'user' ? '#6366f1' : 'text.secondary', mb: 0.25 }}>
                    {m.role === 'user' ? '我：' : 'AI：'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5 }}>
                    {m.content.length > 30 ? m.content.slice(0, 30) + '...' : m.content}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>

        {/* 搜索同事 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>搜索同事</Typography>
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
                    <Search sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 13,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
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
            <Box sx={{ mt: 0.5, maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
                    borderColor: 'divider',
                  }}
                >
                  <Typography sx={{ fontWeight: 500 }}>{u.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {u.email || `组织: ${u.org_id || '-'}`}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* 对方收到后 */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>对方收到后</Typography>
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(e.target.value as 'continue' | 'view')}
          >
            <FormControlLabel
              value="continue"
              control={<Radio size="small" sx={{ color: 'text.disabled', '&.Mui-checked': { color: '#6366f1' } }} />}
              label={
                <Box>
                  <Typography sx={{ fontSize: 13 }}>可以继续聊（转交，对话上下文完整带过去）</Typography>
                  {sourceReadonly && (
                    <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>
                      转发的对话仅支持只读分享
                    </Typography>
                  )}
                </Box>
              }
              disabled={sourceReadonly}
            />
            <FormControlLabel
              value="view"
              control={<Radio size="small" sx={{ color: 'text.disabled', '&.Mui-checked': { color: '#6366f1' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>仅查看（只读，不能继续对话）</Typography>}
            />
          </RadioGroup>
        </Box>

        {/* 捎句话 */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>捎句话</Typography>
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
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
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
        {selectedMessages.some(m => m.to_ai === false) && (
          <Box sx={{ width: '100%', mb: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid', borderColor: 'rgba(245,158,11,0.3)' }}>
            <Typography sx={{ fontSize: 12, color: '#f59e0b' }}>所选内容包含仅成员可见的消息，分享后对接收人可见</Typography>
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={handleClose}
          sx={{ fontSize: 13, textTransform: 'none', color: 'text.secondary' }}
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
