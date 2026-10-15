import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Typography, Box, Tab, Tabs,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { toolsApi } from '../../../api/client';

const CATEGORIES = ['计算器', '绘图', '转换', '文本处理', '数据处理', '其他'];

interface Props {
  open: boolean;
  onClose: () => void;
  tool?: any; // if provided, update mode
}

export default function UploadToolDialog({ open, onClose, tool }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const isUpdate = !!tool;

  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [category, setCategory] = useState(tool?.category || '其他');
  const [htmlContent, setHtmlContent] = useState('');
  const [fileInfo, setFileInfo] = useState('');
  const [tabIdx, setTabIdx] = useState(0);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: any) => toolsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar(isUpdate ? '已更新文件' : '已上传，仅自己可见，可在更多菜单中分享', { variant: 'success' });
      resetAndClose();
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: (html: string) => toolsApi.updateContent(tool.id, html),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar('已更新文件', { variant: 'success' });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setName(''); setDescription(''); setCategory('其他'); setHtmlContent(''); setFileInfo(''); setError(''); setTabIdx(0);
    onClose();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('文件大小超过 2MB 限制');
      return;
    }
    setError('');
    setFileInfo(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = () => setHtmlContent(reader.result as string);
    reader.readAsText(file);
  };

  const canSubmit = isUpdate ? htmlContent.trim().length > 0 : (htmlContent.trim().length > 0 && name.trim().length > 0);

  const handleSubmit = () => {
    if (isUpdate) {
      updateContentMutation.mutate(htmlContent);
    } else {
      if (!name.trim()) { setError('请填写名称'); return; }
      createMutation.mutate({ name: name.trim(), description: description.trim(), category, html_content: htmlContent });
    }
  };

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isUpdate ? '更新工具文件' : '上传工具'}</DialogTitle>
      <DialogContent>
        {!isUpdate && (
          <>
            <TextField label="名称" fullWidth required value={name} onChange={e => setName(e.target.value)} error={!name && error !== ''} helperText={`${name.length}/30`} slotProps={{ input: { inputProps: { maxLength: 30 } } }} sx={{ mb: 2, mt: 1 }} />
            <TextField label="描述" fullWidth multiline rows={2} value={description} onChange={e => setDescription(e.target.value)} helperText={`${description.length}/100`} slotProps={{ input: { inputProps: { maxLength: 100 } } }} sx={{ mb: 2 }} />
            <TextField select label="分类" value={category} onChange={e => setCategory(e.target.value)} fullWidth sx={{ mb: 2 }}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </>
        )}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)}>
            <Tab label="上传文件" />
            <Tab label="粘贴代码" />
          </Tabs>
        </Box>
        {tabIdx === 0 ? (
          <Box>
            <input type="file" accept=".html" onChange={handleFile} />
            {fileInfo && <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>{fileInfo}</Typography>}
          </Box>
        ) : (
          <TextField multiline rows={10} fullWidth placeholder="粘贴完整 HTML 代码..." value={htmlContent} onChange={e => setHtmlContent(e.target.value)} />
        )}
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          小工具为纯前端页面、沙箱运行，无需审核；如需让 Agent 调用的能力，请发布技能（走审核）。上传后仅自己可见，分享后指定的人或部门可见。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {isUpdate ? '更新' : '提交'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
