import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Alert, Skeleton, Button,
} from '@mui/material';
import { Close, ContentCopy, AutoFixHigh } from '@mui/icons-material';
import { toolsApi } from '../../../api/client';

interface Props {
  id: string;
  onClose: () => void;
  onFork?: (tool: any) => void;
  onAiModify?: (tool: any) => void;
}

export default function ToolRunnerDialog({ id, onClose, onFork, onAiModify }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['tool-detail', id],
    queryFn: () => toolsApi.detail(id),
    enabled: !!id,
  });

  const detail = data?.data?.data;
  const isError = data?.data?.code === 403;

  return (
    <Dialog open onClose={onClose} fullScreen sx={{ '& .MuiDialog-paper': { width: '90vw', height: '90vh', m: 'auto' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{detail?.name || '加载中...'}</Typography>
          {detail?.creator_name && <Typography variant="caption" color="text.secondary">创建人：{detail.creator_name}</Typography>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {detail && onFork && (
            <Button size="small" startIcon={<ContentCopy />} onClick={() => onFork(detail)}>复制为我的</Button>
          )}
          {detail && onAiModify && (
            <Button size="small" startIcon={<AutoFixHigh />} onClick={() => onAiModify(detail)}>让 AI 修改</Button>
          )}
          <IconButton onClick={onClose}><Close /></IconButton>
        </Box>
      </DialogTitle>
      <Alert severity="warning" variant="outlined" sx={{ mx: 2, mb: 1, py: 0, '& .MuiAlert-message': { fontSize: 13 } }}>
        本工具为用户上传的 AI 生成内容，计算结果请自行核实。
      </Alert>
      <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden' }}>
        {isLoading && <Skeleton variant="rectangular" sx={{ width: '100%', height: '100%' }} />}
        {isError && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography color="error">无权限访问该工具</Typography>
          </Box>
        )}
        {detail && (
          <iframe
            sandbox="allow-scripts"
            srcDoc={detail.html_content}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={detail.name}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
