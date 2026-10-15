import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { toolsApi } from '../../../api/client';

const CATEGORIES = ['计算器', '绘图', '转换', '文本处理', '数据处理', '其他'];

interface Props {
  tool: any;
  onClose: () => void;
}

export default function EditToolDialog({ tool, onClose }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState(tool.name || '');
  const [description, setDescription] = useState(tool.description || '');
  const [category, setCategory] = useState(tool.category || '其他');

  const mutation = useMutation({
    mutationFn: (data: any) => toolsApi.update(tool.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar('已更新', { variant: 'success' });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>编辑工具信息</DialogTitle>
      <DialogContent>
        <TextField label="名称" fullWidth required value={name} onChange={e => setName(e.target.value)} slotProps={{ input: { inputProps: { maxLength: 30 } } }} helperText={`${name.length}/30`} sx={{ mb: 2, mt: 1 }} />
        <TextField label="描述" fullWidth multiline rows={2} value={description} onChange={e => setDescription(e.target.value)} slotProps={{ input: { inputProps: { maxLength: 100 } } }} helperText={`${description.length}/100`} sx={{ mb: 2 }} />
        <TextField select label="分类" value={category} onChange={e => setCategory(e.target.value)} fullWidth>
          {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => mutation.mutate({ name: name.trim(), description: description.trim(), category })} disabled={!name.trim()}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
