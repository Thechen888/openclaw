import { useMemo, useState } from 'react';
import {
  Box, Card, IconButton, Tooltip, Typography, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, Avatar,
} from '@mui/material';
import {
  Refresh, Search, ViewInAr, Settings, FiberManualRecord,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

interface PodItem {
  id: string;
  name: string;
  status: 'running' | 'pending' | 'failed';
  status_label: string;
  node_name: string;
  node_ip: string;
  pod_ip: string;
  app: string | null;
  updated_at: string;
}

export default function PodsPage() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');

  const listQ = useQuery({
    queryKey: ['pods'],
    queryFn: () => api.get('/system/pods'),
  });

  const items: PodItem[] = Array.isArray(listQ.data?.data?.data)
    ? (listQ.data!.data!.data as PodItem[])
    : [];

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(kw) ||
        i.node_name.toLowerCase().includes(kw) ||
        i.pod_ip.includes(kw) ||
        (i.app || '').toLowerCase().includes(kw)
    );
  }, [items, search]);

  return (
    <Box>
      <PageHeader
        title="容器组"
        subtitle="容器组（Pod）是 Kubernetes 应用程序的基本执行单元，是您创建或部署的 Kubernetes 对象模型中最小和最简单的单元。"
      />

      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TextField
            placeholder="搜索"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Tooltip title="刷新">
            <IconButton onClick={() => listQ.refetch()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="设置">
            <IconButton>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>

        {listQ.isLoading ? (
          <LoadingState />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '32%' }}>名称 ▾</TableCell>
                <TableCell sx={{ width: 100 }}>状态 ▾</TableCell>
                <TableCell sx={{ width: 220 }}>节点</TableCell>
                <TableCell sx={{ width: 160 }}>容器组 IP 地址</TableCell>
                <TableCell sx={{ width: 160 }}>应用</TableCell>
                <TableCell sx={{ width: 200 }}>更新时间 ▾</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                    暂无容器组
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    onClick={() => nav(`/resources/pods/${p.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36, height: 36, bgcolor: 'rgba(99,102,241,0.12)',
                            color: '#6366f1',
                          }}
                        >
                          <ViewInAr fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: '#3b82f6' }}
                          >
                            {p.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.status}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FiberManualRecord sx={{ fontSize: 10, color: '#10b981' }} />
                        <Typography variant="body2">{p.status_label}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: '#10b981', fontWeight: 500 }}
                      >
                        {p.node_name}{' '}
                        <Typography component="span" variant="body2" color="text.secondary">
                          ({p.node_ip})
                        </Typography>
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {p.pod_ip}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ color: p.app ? '#3b82f6' : 'text.disabled' }}
                      >
                        {p.app || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {p.updated_at}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <Box
          sx={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', pt: 2, color: 'text.secondary',
          }}
        >
          <Typography variant="caption">总数: {filtered.length}</Typography>
          <Typography variant="caption">1 / 1</Typography>
        </Box>
      </Card>
    </Box>
  );
}
