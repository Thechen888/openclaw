import { useState } from 'react';
import { Box, Card, Typography, Chip, Button, Avatar, Divider } from '@mui/material';
import { ArrowBack, Delete, Chat, Groups, Science, CalendarToday, InfoOutlined, History, ContentCopy } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';
import ForkResourceDialog from '../../components/ForkResourceDialog';

const SCOPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  company: { icon: <></>, label: '全公司', color: 'success.main' },
  department: { icon: <Groups fontSize="small" />, label: '部门', color: 'info.main' },
  beta: { icon: <Science fontSize="small" />, label: '内测', color: 'warning.main' },
  private: { icon: <></>, label: '私有', color: 'default' },
};

export default function AgentInstalledDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // 获取已安装智能体详情
  const { data, isLoading } = useQuery({
    queryKey: ['agent-installed-detail', id],
    queryFn: () => api.get(`/agents/installed/${id}`),
  });
  const item = data?.data?.data;

  // 卸载智能体
  const uninstallMutation = useMutation({
    mutationFn: () => api.post(`/agents/${id}/uninstall`),
    onSuccess: () => {
      enqueueSnackbar('已卸载智能体', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['agents-installed'] });
      navigate('/agents/installed');
    },
  });

  const [forkOpen, setForkOpen] = useState(false);
  const forkMutation = useMutation({
    mutationFn: (name: string) => api.post(`/agents/${id}/fork`, { name }),
    onSuccess: () => {
      enqueueSnackbar('副本已创建到「我创建的」', { variant: 'success' });
      setForkOpen(false);
      navigate('/agents/my');
    },
  });

  if (isLoading) return <LoadingState />;
  if (!item) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">智能体不存在或已卸载</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/agents/installed')}>返回列表</Button>
      </Box>
    );
  }

  const scope = item.scope || 'department';
  const scopeMeta = SCOPE_META[scope] || SCOPE_META.department;
  const isBeta = scope === 'beta' || item.is_beta;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="已安装智能体详情"
          subtitle="查看已安装智能体的详细信息"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate('/agents/installed')}>返回列表</Button>}
        />
      </Box>

      {/* 头部信息卡片 */}
      <Card sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
          {/* 图标 */}
          <Avatar sx={{
            width: 64, height: 64, borderRadius: 2,
            bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF',
            border: '1px solid rgba(0,212,255,0.2)',
            fontSize: 28, fontWeight: 700,
          }}>
            {(item.name || '?').slice(0, 1).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* 名称 + 内测标识 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.name}</Typography>
              {isBeta && (
                <Chip label="内测" size="small" sx={{
                  fontSize: 10, height: 20, bgcolor: 'warning.main', color: '#fff', fontWeight: 700,
                }} />
              )}
            </Box>

            {/* 作者 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {item.owner_name || '未知'} · {item.owner_dept || ''}
            </Typography>

            {/* Chips 行 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`v${item.installed_version || item.version || '1.0.0'}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22, fontFamily: 'monospace' }}
              />
              <Chip
                icon={scopeMeta.icon as any}
                label={scopeMeta.label}
                size="small"
                sx={{ fontSize: 11, height: 22, color: scopeMeta.color, borderColor: scopeMeta.color }}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => uninstallMutation.mutate()}
              disabled={uninstallMutation.isPending}
              sx={{ fontWeight: 600, textTransform: 'none', minWidth: 100 }}
            >
              卸载
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => setForkOpen(true)}
              sx={{ fontWeight: 600, textTransform: 'none', minWidth: 100 }}
            >
              创建副本
            </Button>
            <Button
              variant="contained"
              startIcon={<Chat />}
              onClick={() => navigate(`/chat?agent=${id}`)}
              sx={{ fontWeight: 600, textTransform: 'none', minWidth: 100,
                bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' } }}
            >
              发起对话
            </Button>
          </Box>
        </Box>
      </Card>

      {/* 详情内容 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* 智能体简介 */}
        <Card sx={{ flex: 1, minWidth: 320, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <InfoOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>智能体简介</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {item.description || '暂无描述'}
          </Typography>
        </Card>

        {/* 右侧安装信息栏 */}
        <Card sx={{ width: 320, p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>安装信息</Typography>

          {/* 安装版本 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <History sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>安装版本</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.6 }}>
              v{item.installed_version || item.version || '1.0.0'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* 安装时间 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              安装于 {item.installed_at || '—'}
            </Typography>
          </Box>
        </Card>
      </Box>

      <ForkResourceDialog
        open={forkOpen}
        originalName={item?.name || ''}
        originalOwner={item?.owner_name}
        onConfirm={(name) => forkMutation.mutate(name)}
        onClose={() => setForkOpen(false)}
        isPending={forkMutation.isPending}
      />
    </Box>
  );
}
