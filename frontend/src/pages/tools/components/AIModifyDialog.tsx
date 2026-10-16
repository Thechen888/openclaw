import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toolsApi } from '../../../api/client';

interface Props {
  tool: any;
  onClose: () => void;
}

export default function AIModifyDialog({ tool, onClose }: Props) {
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState('');

  const { data } = useQuery({
    queryKey: ['tool-detail-aimodify', tool.id],
    queryFn: () => toolsApi.detail(tool.id),
    enabled: !!tool.id,
  });

  const htmlContent = data?.data?.data?.html_content || '';

  const handleConfirm = () => {
    if (!requirement.trim()) return;
    const prompt = `请帮我修改一个小工具。\n工具名称：${tool.name}\n我的修改需求：${requirement}\n要求：保持原有样式与功能不变，仅做以下修改，不要重写无关部分。\n以下是当前工具完整 HTML 代码，请输出修改后的完整 HTML：\n\`\`\`html\n${htmlContent}\n\`\`\``;
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>让 AI 修改「{tool.name}」</DialogTitle>
      <DialogContent>
        <TextField label="修改需求" fullWidth multiline rows={3} required value={requirement} onChange={e => setRequirement(e.target.value)} placeholder="例：把折线颜色改成红色，加一个导出 CSV 按钮" sx={{ mt: 1, mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          将打开平台助手会话，AI 会带着工具源码帮你改；改完保存回复里的 HTML，回来点「更新文件」覆盖即可。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!requirement.trim()}>
          打开 AI 助手
        </Button>
      </DialogActions>
    </Dialog>
  );
}
