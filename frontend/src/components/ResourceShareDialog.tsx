import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, TextField, Box, Chip,
} from '@mui/material';
import { PersonAdd, Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../api/client';

const RESOURCE_LABEL: Record<string, string> = {
  skill: '技能',
  agent: '智能体',
  workflow: '工作流',
  report: '报告',
};

export interface ResourceShareDialogProps {
  open: boolean;
  resourceType: 'skill' | 'agent' | 'workflow' | 'report';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

// 模拟可选用户列表（后续可改为 API 调用）
const AVAILABLE_USERS = [
  { target_type: 'user', target_id: 'u-2', target_name: '李思', target_dept: '产品部' },
  { target_type: 'user', target_id: 'u-3', target_name: '王五', target_dept: '技术研发部' },
  { target_type: 'user', target_id: 'u-4', target_name: '赵敏', target_dept: '设计部' },
  { target_type: 'user', target_id: 'u-5', target_name: '刘芳', target_dept: '人力资源部' },
  { target_type: 'role', target_id: 'role-1', target_name: '研发测试组', target_dept: '' },
  { target_type: 'role', target_id: 'role-2', target_name: '产品体验组', target_dept: '' },
];

export default function ResourceShareDialog({
  open, resourceType, resourceId, resourceName, onClose,
}: ResourceShareDialogProps) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [searchText, setSearchText] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<any[]>([]);

  const label = RESOURCE_LABEL[resourceType] || resourceType;
  const basePath = `/${resourceType}s`; // skills / agents / workflows / reports

  // 获取已分享列表
  const { data: sharesData, refetch: refetchShares } = useQuery({
    queryKey: ['resource-shares', resourceType, resourceId],
    queryFn: () => api.get(`${basePath}/${resourceId}/shares`),
    enabled: open && !!resourceId,
  });
  const shares: any[] = sharesData?.data?.data || [];

  const filteredUsers = AVAILABLE_USERS.filter(u =>
    u.target_name.toLowerCase().includes(searchText.toLowerCase()) ||
    u.target_dept.toLowerCase().includes(searchText.toLowerCase())
  );

  // 分享
  const shareMutation = useMutation({
    mutationFn: (targets: any[]) => api.post(`${basePath}/${resourceId}/shares`, { targets }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-shares', resourceType] });
      setSelectedTargets([]);
      setSearchText('');
      refetchShares();
      enqueueSnackbar(`分享成功，被分享者可在${label}市场「内测」分组看到`, { variant: 'success' });
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.error || '分享失败', { variant: 'error' }),
  });

  // 移除分享
  const removeMutation = useMutation({
    mutationFn: (shareId: string) => api.delete(`${basePath}/${resourceId}/shares/${shareId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resource-shares', resourceType] });
      refetchShares();
      enqueueSnackbar('已移除分享', { variant: 'info' });
    },
  });

  const handleAddTarget = (user: any) => {
    if (selectedTargets.find(t => t.target_id === user.target_id)) return;
    if (shares.length + selectedTargets.length >= 20) {
      enqueueSnackbar('内测分享仅限小范围（最多20人/角色），如需更大范围请走发布流程', { variant: 'warning' });
      return;
    }
    setSelectedTargets([...selectedTargets, user]);
    setSearchText('');
  };

  const handleRemoveTarget = (targetId: string) => {
    setSelectedTargets(selectedTargets.filter(t => t.target_id !== targetId));
  };

  const handleShare = () => {
    if (selectedTargets.length === 0) return;
    shareMutation.mutate(selectedTargets);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <PersonAdd sx={{ color: 'info.main' }} />
        分享「{resourceName}」
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {/* 搜索并选择 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>分享给 *</Typography>
          <TextField
            fullWidth size="small" placeholder="搜索用户或角色..."
            value={searchText} onChange={e => setSearchText(e.target.value)}
            sx={{ mb: 1 }}
          />
          {searchText && (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 160, overflow: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>无匹配结果</Typography>
              ) : filteredUsers.map(u => (
                <Box
                  key={u.target_id}
                  onClick={() => handleAddTarget(u)}
                  sx={{
                    px: 1.5, py: 1, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{u.target_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.target_dept} · {u.target_type === 'role' ? '角色' : '用户'}</Typography>
                  </Box>
                  <Add fontSize="small" sx={{ color: 'text.secondary' }} />
                </Box>
              ))}
            </Box>
          )}
          {/* 已选目标 */}
          {selectedTargets.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {selectedTargets.map(t => (
                <Chip
                  key={t.target_id}
                  label={t.target_name}
                  size="small"
                  onDelete={() => handleRemoveTarget(t.target_id)}
                  sx={{ fontSize: 11 }}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, alignSelf: 'center' }}>
                {shares.length + selectedTargets.length}/20
              </Typography>
            </Box>
          )}
        </Box>

        {/* 已分享列表 */}
        {shares.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>已分享列表</Typography>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
              {shares.map(s => (
                <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{s.target_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.target_dept} · {s.created_at} 由{s.granted_by_name}分享</Typography>
                  </Box>
                  <Button size="small" color="error" onClick={() => removeMutation.mutate(s.id)}>移除</Button>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          说明：内测分享免审核，被分享者可在{label}市场的「内测」分组看到并安装此{label}。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={handleShare} disabled={shareMutation.isPending || selectedTargets.length === 0}>
          完成分享
        </Button>
      </DialogActions>
    </Dialog>
  );
}
