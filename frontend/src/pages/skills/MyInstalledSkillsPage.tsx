import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Button,
  Typography, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Delete, Refresh, Extension, Visibility, SystemUpdateAlt, Science, ContentCopy } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { PageHeader, FilterBar, DataTable, useTableState, EmptyState, LoadingState, StatusBadge } from '../../components/shared';
import { skillsApi } from '../../api/client';
import ForkResourceDialog from '../../components/ForkResourceDialog';

export default function MyInstalledSkillsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [confirmUninstall, setConfirmUninstall] = useState<any>(null);
  const [forkItem, setForkItem] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills-installed', params],
    queryFn: () => skillsApi.installed(params),
  });
  const items: any[] = data?.data?.data || [];
  const total: number = data?.data?.pagination?.total || 0;

  const uninstallMutation = useMutation({
    mutationFn: (id: string) => skillsApi.uninstall(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills-installed'] });
      setConfirmUninstall(null);
      enqueueSnackbar('已卸载', { variant: 'success' });
    },
  });

  const forkMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => skillsApi.fork(id, { name }),
    onSuccess: () => {
      enqueueSnackbar('副本已创建到「我创建的」', { variant: 'success' });
      setForkItem(null);
      navigate('/skills/my');
    },
  });

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader
        title="我安装的技能"
        subtitle="已安装到工作空间的技能列表"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>技能名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>描述</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>版本</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }}>来源</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>安装时间</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无安装的技能" description="前往技能市场安装技能" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Extension fontSize="small" sx={{ color: '#00D4FF' }} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.skill_name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12, maxWidth: 400 }}>
                    {item.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip label={`v${item.version}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }} />
                    {item.is_beta && (
                      <Tooltip title="内测版">
                        <Chip label="内测" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'warning.main', color: '#fff', fontWeight: 700 }} />
                      </Tooltip>
                    )}
                    {item.has_update && (
                      <Tooltip title={`有新版本 v${item.latest_version}`}>
                        <Chip label="NEW" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'info.main', color: '#fff', fontWeight: 700 }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{item.owner_name}</Typography>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {item.installed_at ? new Date(item.installed_at).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {item.has_update && (
                      <Tooltip title={`升级到 v${item.latest_version}`}>
                        <IconButton size="small" color="warning" onClick={() => enqueueSnackbar(`已升级到 v${item.latest_version}（mock）`, { variant: 'success' })}>
                          <SystemUpdateAlt fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="创建副本">
                      <IconButton size="small" color="primary" onClick={() => setForkItem(item)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="详情">
                      <IconButton size="small" onClick={() => navigate(`/skills/${item.skill_id}/detail`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="卸载">
                      <IconButton size="small" color="error" onClick={() => setConfirmUninstall(item)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      {/* 卸载确认弹窗 */}
      <Dialog open={!!confirmUninstall} onClose={() => setConfirmUninstall(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>确认卸载</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确定要卸载技能「{confirmUninstall?.skill_name}」吗？卸载后已挂载该技能的 Agent 将无法继续使用。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUninstall(null)}>取消</Button>
          <Button
            variant="contained" color="error"
            onClick={() => confirmUninstall && uninstallMutation.mutate(confirmUninstall.id)}
            disabled={uninstallMutation.isPending}
          >
            确认卸载
          </Button>
        </DialogActions>
      </Dialog>

      <ForkResourceDialog
        open={!!forkItem}
        originalName={forkItem?.skill_name || ''}
        originalOwner={forkItem?.owner_name}
        onConfirm={(name) => forkItem && forkMutation.mutate({ id: forkItem.skill_id || forkItem.id, name })}
        onClose={() => setForkItem(null)}
        isPending={forkMutation.isPending}
      />
    </Box>
  );
}
