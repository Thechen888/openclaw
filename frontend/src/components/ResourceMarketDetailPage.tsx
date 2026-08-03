import { useState } from 'react';
import {
  Box, Card, Typography, Chip, Button, Avatar, Divider, Skeleton,
} from '@mui/material';
import {
  ArrowBack, Download, Public, Groups, Person, Science, CalendarToday,
  InfoOutlined, History, ContentCopy,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState } from './shared';
import api from '../api/client';
import ForkResourceDialog from './ForkResourceDialog';

const SCOPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  company: { icon: <Public fontSize="small" />, label: '全公司', color: 'success.main' },
  department: { icon: <Groups fontSize="small" />, label: '他人分享', color: 'info.main' },
  beta: { icon: <Science fontSize="small" />, label: '内测', color: 'warning.main' },
  private: { icon: <Person fontSize="small" />, label: '私有', color: 'default' },
};

const RESOURCE_LABEL: Record<string, string> = {
  agent: '智能体',
  workflow: '工作流',
  skill: '技能',
};

export interface ResourceMarketDetailPageProps {
  /** 资源类型：agent | workflow | skill */
  resourceType: 'agent' | 'workflow' | 'skill';
  /** 返回列表路径 */
  backPath: string;
  /** 安装成功提示 */
  installSuccessMsg?: string;
}

export default function ResourceMarketDetailPage({
  resourceType,
  backPath,
  installSuccessMsg,
}: ResourceMarketDetailPageProps) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const basePath = resourceType === 'workflow' ? '/agents' : `/${resourceType}s`;
  const label = RESOURCE_LABEL[resourceType] || resourceType;

  // 获取市场详情
  const { data, isLoading } = useQuery({
    queryKey: ['market-detail', resourceType, id],
    queryFn: () => api.get(`${basePath}/market/${id}`),
  });
  const item = data?.data?.data;

  // 检查是否已安装
  const { data: installedData } = useQuery({
    queryKey: [`${resourceType}-installed-check`],
    queryFn: () => api.get(`${basePath}/installed`, { params: { page_size: 200 } }),
  });
  const installedList: any[] = installedData?.data?.data || [];
  const isInstalled = installedList.some((i: any) => i.id === id);

  const installMutation = useMutation({
    mutationFn: () => api.post(`${basePath}/${id}/install`),
    onSuccess: () => {
      enqueueSnackbar(installSuccessMsg || `已安装到${label}库`, { variant: 'success' });
      qc.invalidateQueries({ queryKey: [`${resourceType}-installed-check`] });
    },
  });

  const [forkOpen, setForkOpen] = useState(false);
  const forkMutation = useMutation({
    mutationFn: (name: string) => api.post(`${basePath}/${id}/fork`, { name }),
    onSuccess: () => {
      enqueueSnackbar('副本已创建到「我创建的」', { variant: 'success' });
      setForkOpen(false);
      const myListPath = resourceType === 'agent' ? '/agents/my' : resourceType === 'workflow' ? '/workflows/my' : '/skills/my';
      navigate(myListPath);
    },
  });

  if (isLoading) return <LoadingState />;
  if (!item) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">资源不存在或已下架</Typography>
        <Button sx={{ mt: 2 }} onClick={() => navigate(backPath)}>返回列表</Button>
      </Box>
    );
  }

  const scope = item.scope || 'company';
  const scopeMeta = SCOPE_META[scope] || SCOPE_META.company;
  const isBeta = scope === 'beta' || item.is_beta;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      <Box sx={{ '& > div': { mb: 1, pb: 1 } }}>
        <PageHeader
          title={`${label}详情`}
          subtitle="查看市场资源详情并安装"
          actions={<Button startIcon={<ArrowBack />} onClick={() => navigate(backPath)}>返回市场</Button>}
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
              {item.version && (
                <Chip label={`v${item.version}`} size="small" variant="outlined"
                  sx={{ fontSize: 11, height: 22, fontFamily: 'monospace' }} />
              )}
              <Chip
                icon={scopeMeta.icon as any}
                label={scopeMeta.label}
                size="small"
                sx={{ fontSize: 11, height: 22, color: scopeMeta.color, borderColor: scopeMeta.color }}
                variant="outlined"
              />
              {item.install_count !== undefined && (
                <Chip
                  icon={<Download sx={{ fontSize: 14 }} />}
                  label={`${item.install_count?.toLocaleString() ?? 0} 次安装`}
                  size="small" variant="outlined"
                  sx={{ fontSize: 11, height: 22 }}
                />
              )}
            </Box>
          </Box>

          {/* 安装按钮 + 创建副本 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => installMutation.mutate()}
              disabled={isInstalled || installMutation.isPending}
              sx={{
                fontWeight: 600, textTransform: 'none', minWidth: 120,
                ...(isInstalled ? { bgcolor: 'action.disabled', color: 'text.disabled' } : {}),
              }}
            >
              {isInstalled ? '已安装' : '安装'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => setForkOpen(true)}
              sx={{ fontWeight: 600, textTransform: 'none', minWidth: 120 }}
            >
              创建副本
            </Button>
          </Box>
        </Box>
      </Card>

      {/* 详情内容 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* 发布简介 */}
        <Card sx={{ flex: 1, minWidth: 320, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <InfoOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>发布简介</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {item.description || item.publish_description || '暂无描述'}
          </Typography>
        </Card>

        {/* 右侧信息栏 */}
        <Card sx={{ width: 320, p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>发布信息</Typography>

          {/* 变更说明 */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <History sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>变更说明</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.6 }}>
              {item.changelog || item.publish_changelog || '暂无变更说明'}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* 发布时间 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              发布于 {item.published_at || item.updated_at || '—'}
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
