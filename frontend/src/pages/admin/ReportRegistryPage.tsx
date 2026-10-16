import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, IconButton, Tooltip, Collapse, TextField, InputAdornment, Button,
} from '@mui/material';
import { Search, ExpandMore, ExpandLess, Publish } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminRegistryApi } from '../../api/client';
import api from '../../api/client';
import { PageHeader } from '../../components/shared';

export default function ReportRegistryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: meData } = useQuery({ queryKey: ['me-registry'], queryFn: () => api.get('/auth/me') });
  const me = meData?.data?.data;
  const isAdmin = me?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registry', { search }],
    queryFn: () => adminRegistryApi.list({ search }),
    enabled: isAdmin,
  });

  const { data: runsData } = useQuery({
    queryKey: ['admin-registry-runs', expandedId],
    queryFn: () => adminRegistryApi.runs(expandedId!),
    enabled: isAdmin && !!expandedId,
  });

  const items: any[] = data?.data?.data || [];
  const expandedRuns: any[] = runsData?.data?.data || [];

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
              <TableCell sx={{ fontWeight: 700, width: 50 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <React.Fragment key={item.id}>
                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{item.creator_name || '—'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{item.install_count}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{item.run_count}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{item.last_run_at ? new Date(item.last_run_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{item.active_shares}</TableCell>
                  <TableCell>
                    <IconButton size="small">{expandedId === item.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 0, borderBottom: expandedId === item.id ? undefined : 'none' }}>
                    <Collapse in={expandedId === item.id} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 2, px: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>期次明细</Typography>
                          <Button size="small" variant="outlined" startIcon={<Publish fontSize="small" />}
                            onClick={() => navigate('/admin/report-publish')}
                            sx={{ fontSize: 12, textTransform: 'none' }}>
                            代发布
                          </Button>
                        </Box>
                        {expandedRuns.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">暂无运行期次</Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>运行者</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>期次</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>时间</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>状态</TableCell>
                                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>分享链路</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {expandedRuns.map(run => (
                                <TableRow key={run.run_id} hover>
                                  <TableCell sx={{ fontSize: 12 }}>{run.runner_name}</TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{run.period_label}</TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{new Date(run.finished_at).toLocaleDateString()}</TableCell>
                                  <TableCell><Chip label={run.status} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                                  <TableCell sx={{ fontSize: 11 }}>
                                    {(run.shares || []).length === 0 ? '—' : (run.shares || []).map((s: any, i: number) => (
                                      <Chip key={i} label={`${s.target_name}(${s.scope_type}) by ${s.granted_by_name}`} size="small" sx={{ fontSize: 9, height: 18, mr: 0.5 }} />
                                    ))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
