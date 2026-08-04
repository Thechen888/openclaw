import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography,
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

interface ForkResourceDialogProps {
  open: boolean;
  originalName: string;
  originalOwner?: string;
  confirmText?: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
  isPending?: boolean;
}

export default function ForkResourceDialog({
  open,
  originalName,
  originalOwner,
  confirmText = '确认创建',
  onConfirm,
  onClose,
  isPending,
}: ForkResourceDialogProps) {
  const [name, setName] = useState(`${originalName}（副本）`);
  const [error, setError] = useState('');

  // 每次打开弹窗时重置名称和错误状态
  useEffect(() => {
    if (open) {
      setName(`${originalName}（副本）`);
      setError('');
    }
  }, [open, originalName]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('名称不能为空');
      return;
    }
    if (trimmed.length > 50) {
      setError('名称不能超过50个字符');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  const handleClose = () => {
    setName(`${originalName}（副本）`);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, px: 3, pt: 2.5, pb: 1 }}>
        <ContentCopy sx={{ fontSize: 20, color: 'primary.main' }} />
        创建副本
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1.5, pb: 0.5 }}>
        {/* 静态标签：不用 TextField 的浮动 label，彻底避免被裁剪 */}
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          副本名称
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="请输入副本名称"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          error={!!error}
          helperText={error || `${name.trim().length}/50`}
          sx={{ mb: 2 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
          副本将保存到「我创建的」，与原版互不影响；定时触发器等自动化配置将默认关闭。
          {originalOwner && <> 源自：{originalOwner}</>}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pt: 1.5, pb: 2.5 }}>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={isPending || !name.trim()}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
