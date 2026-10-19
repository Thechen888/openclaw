import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, IconButton, Tooltip, TextField, InputAdornment, Button, Drawer, Divider,
} from '@mui/material';
import { Search, Publish, Close, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { adminRegistryApi } from '../../api/client';
import api from '../../api/client';
import { PageHeader } from '../../components/shared';

export default function ReportRegistryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [drawerItem, setDrawerItem] = useState<any>(null);

  const { data: meData } = useQuery({ queryKey: ['me-registry'], queryFn: () => api.get('/auth/me') });
  const me = meData?.data?.data;
  const isAdmin = me?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registry', { search }],
    queryFn: () => adminRegistryApi.list({ search }),
    enabled: isAdmin,
  });

  const items: any[] = data?.data?.data || [];

  if (!isAdmin) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <PageHeader title="报告结果台账" subtitle="" />
        <Card><CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">无权限访问</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>仅超级管理员可访问此页面</Typography>
        </CardContent></Card>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader title="报告结果台账" subtitle="以报告定义为聚合根，查看全平台报告运行与分享情况" />

      <Box sx={{ mb: 2 }}>
        <TextField size="small" placeholder="搜索报告名或创建者..." value={search} onChange={e => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
          sx={{ minWidth: 280 }} />
      </Box>

      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>报告名</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>创建者</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>安装人数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>累计期数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>最近运行</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>活跃分享</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{item.creator_name || '—'}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{item.install_count}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{item.run_count}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.last_run_at ? new Date(item.last_run_at).toLocaleDateString() : '—'}</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{item.active_shares}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={() => setDrawerItem(item)} sx={{ fontSize: 12, textTransform: 'none', minWidth: 100 }}>
                    数据结果管理
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* 数据结果管理 Drawer */}
      <Drawer anchor="right" open={!!drawerItem} onClose={() => setDrawerItem(null)} sx={{ '& .MuiDrawer-paper': { width: 560, p: 0 } }}>
        {drawerItem && <RegistryDrawerContent item={drawerItem} onClose={() => setDrawerItem(null)} onNavigatePublish={() => { setDrawerItem(null); navigate('/admin/report-publish'); }} />}
      </Drawer>
    </Box>
  );
}

/* ========== Drawer 内容 ========== */
function RegistryDrawerContent({ item, onClose, onNavigatePublish }: { item: any; onClose: () => void; onNavigatePublish: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data: runsData } = useQuery({
    queryKey: ['admin-registry-runs', item.id],
    queryFn: () => adminRegistryApi.runs(item.id),
  });
  const runs: any[] = runsData?.data?.data || [];

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => adminRegistryApi.revokeShare(shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-registry'] });
      qc.invalidateQueries({ queryKey: ['admin-registry-runs', item.id] });
      enqueueSnackbar('已撤销该分享', { variant: 'success' });
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '撤销失败', { variant: 'error' }),
  });

  // 收集该定义下所有报告实例的分享链
  const { data: sharesDetailData } = useQuery({
    queryKey: ['registry-shares-detail', item.id],
    queryFn: async () => {
      // 通过 runs 数据拿到所有 report_id，再查每个 report 的 shares
      const r = runsData?.data?.data || [];
      const reportIds = [...new Set(r.map((run: any) => run.report_id))];
      const allShares: any[] = [];
      for (const rid of reportIds) {
        const res = await api.get(`/reports/${rid}/result-shares`);
        const shares = res?.data?.data || [];
        allShares.push(...shares);
      }
      return allShares;
    },
    enabled: runs.length > 0,
  });
  const allShares: any[] = sharesDetailData || [];

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.name}</Typography>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>创建者：{item.creator_name || '—'}</Typography>

      {/* 上半区：期次表 */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>运行期次</Typography>
      {runs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>暂无运行期次</Typography>
      ) : (
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead><TableRow>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>运行者</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>期次</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>完成时间</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>状态</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>分享对象</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {runs.map(run => (
              <TableRow key={run.run_id} hover>
                <TableCell sx={{ fontSize: 12 }}>{run.runner_name}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{run.period_label}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{new Date(run.finished_at).toLocaleDateString()}</TableCell>
                <TableCell><Chip label={run.status} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                <TableCell sx={{ fontSize: 11 }}>
                  {(run.shares || []).length === 0 ? '—' : (run.shares || []).map((s: any, i: number) => (
                    <Chip key={i} label={`${s.target_name}(${s.scope_type})`} size="small" sx={{ fontSize: 9, height: 18, mr: 0.5 }} />
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 下半区：分享链 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>分享链路</Typography>
        <Button size="small" variant="outlined" startIcon={<Publish fontSize="small" />} onClick={onNavigatePublish} sx={{ fontSize: 12, textTransform: 'none' }}>代发布</Button>
      </Box>
      {allShares.length === 0 ? (
        <Typography variant="body2" color="text.secondary">暂无分享记录</Typography>
      ) : (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>授予人</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>目标</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>范围</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>时间</TableCell>
            <TableCell sx={{ fontSize: 11, fontWeight: 600, width: 50 }}>操作</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {allShares.map(s => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ fontSize: 12 }}>{s.granted_by_name}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{s.target_name} <Chip label={s.target_type === 'user' ? '人员' : s.target_type === 'dept' ? '部门' : '角色'} size="small" sx={{ fontSize: 9, height: 16 }} /></TableCell>
                <TableCell><Chip label={s.scope_type === 'all' ? '全部结果' : s.scope_type === 'once' ? '指定某一次' : '时间后'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                <TableCell sx={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Tooltip title="撤销">
                    <IconButton size="small" color="error" onClick={() => revokeMutation.mutate(s.id)}><Delete fontSize="small" /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
