import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Tooltip, Chip, MenuItem, Typography,
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { callLogsApi, modelSourcesApi } from '../../api/client';

const STATUS_OPTIONS = ['', 'success', 'failed', 'timeout', 'rate_limited'];

export default function CallLogsPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const queryParams = { ...params, status: statusFilter || undefined, source_id: sourceFilter || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['call-logs', queryParams],
    queryFn: () => callLogsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const { data: sourcesData } = useQuery({
    queryKey: ['model-sources-all'],
    queryFn: () => modelSourcesApi.list({ page_size: 200 }),
  });
  const sources = sourcesData?.data?.data || [];

  const formatLatency = (ms?: number) => {
    if (!ms) return '-';
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  };

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '-';
    return `$${cost.toFixed(4)}`;
  };

  return (
    <Box>
      <PageHeader
        title="调用日志"
        subtitle="模型调用历史与诊断"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Tooltip title="导出CSV">
              <IconButton><Download /></IconButton>
            </Tooltip>
          </>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={
          <>
            <TextField
              select size="small" label="Status" value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">全部状态</MenuItem>
              {STATUS_OPTIONS.filter(Boolean).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Model Source" value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">全部模型</MenuItem>
              {sources.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.display_name || s.model_name}</MenuItem>
              ))}
            </TextField>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>策略</TableCell>
              <TableCell>模型源</TableCell>
              <TableCell>调用者</TableCell>
              <TableCell align="right">输入Token</TableCell>
              <TableCell align="right">输出Token</TableCell>
              <TableCell align="right">费用</TableCell>
              <TableCell align="right">延迟</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState title="暂无调用日志" description="调整筛选条件或等待新的调用" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.policy_name || '-'}</TableCell>
                <TableCell>
                  <Chip label={item.source_name || item.model_name || '-'} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.caller || item.client_id || '-'}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {item.input_tokens?.toLocaleString() ?? '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {item.output_tokens?.toLocaleString() ?? '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                  {formatCost(item.cost)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {formatLatency(item.latency_ms)}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
