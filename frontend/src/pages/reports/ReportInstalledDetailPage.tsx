import { Box, Card, Typography, Chip, Button, Avatar, Divider } from '@mui/material';
import { ArrowBack, Delete, Visibility, Groups, Science, CalendarToday, InfoOutlined, History } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

const SCOPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  company: { icon: <></>, label: '全公司', color: 'success.main' },
  department: { icon: <Groups fontSize="small" />, label: '部门', color: 'info.main' },
  beta: { icon: <Science fontSize="small" />, label: '内测', color: 'warning.main' },
  private: { icon: <></>, label: '私有', color: 'default' },
};

export default function ReportInstalledDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // 获取已安装报告详情
  const { data, isLoading } = useQuery({
    queryKey: ['report-installed-detail', id],
    queryFn: () => api.get(`/reports/installed/${id}`),
  });
  const item = data?.data?.data;

  // 卸载报告
  const uninstallMutation = useMutation({
    mutationFn: () => api.post(`/reports/${id}/uninstall`),
    onSuccess: () => {
      enqueueSnackbar('已卸载报告', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['reports-installed'] });
      navigate('/reports/installed');
    },
  });

  if (isLoading) return <LoadingState />;
  if (!item) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">报告不存在或已卸载</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/reports/installed')}>返回列表</Button>
      </Box>
    );
  }

  const scope = item.scope || 'department';
  const scopeMeta = SCOPE_META[scope] || SCOPE_META.department;
  const isBeta = scope === 'beta' || item.is_beta;
  const periodLabel = item.period === 'weekly' ? '周报' : item.period === 'monthly' ? '月报' : item.period === 'quarterly' ? '季报' : '报告';

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title="已安装的报告详情"
          subtitle="查看已安装报告的详细信息"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate('/reports/installed')}>返回列表</Button>}
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
            {(item.name || item.title || '?').slice(0, 1).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* 名称 + 内测标识 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.name || item.title}</Typography>
              {isBeta && (
                <Chip label="内测" size="small" sx={{
                  fontSize: 10, height: 20, bgcolor: 'warning.main', color: '#fff', fontWeight: 700,
                }} />
              )}
            </Box>

            {/* 作者 */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {item.owner_name || '未知'} · {item.owner_dept || item.department_name || ''}
            </Typography>

            {/* Chips 行 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={periodLabel}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
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
              variant="contained"
              startIcon={<Visibility />}
              onClick={() => navigate(`/reports/view/${id}`)}
              sx={{ fontWeight: 600, textTransform: 'none', minWidth: 100 }}
            >
              查看报告
            </Button>
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
          </Box>
        </Box>
      </Card>

      {/* 详情内容 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* 报告简介 */}
        <Card sx={{ flex: 1, minWidth: 320, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <InfoOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>报告简介</Typography>
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
              v{item.version || '1.0.0'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* 安装时间 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              安装于 {item.installed_at || item.updated_at || '—'}
            </Typography>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
