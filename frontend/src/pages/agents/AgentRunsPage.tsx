import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography, IconButton,
} from '@mui/material';
import { Refresh, Visibility } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { agentRunsApi } from '../../api/client';

const TRIGGER_TYPES = ['', 'chat', 'schedule', 'webhook', 'manual', 'event'];

export default function AgentRunsPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [triggerFilter, setTriggerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const queryParams = {
    ...params,
    trigger_type: triggerFilter || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agent-runs', queryParams],
    queryFn: () => agentRunsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  const formatCost = (cost?: number) => {
    if (cost === undefined || cost === null) return '-';
    return `$${cost.toFixed(4)}`;
  };

  return (
    <Box>
      <PageHeader
        title="智能体运行记录"
        subtitle="执行历史与诊断信息"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={
          <>
            <TextField
              select size="small" label="Trigger Type" value={triggerFilter}
              onChange={e => { setTriggerFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">全部触发类型</MenuItem>
              {TRIGGER_TYPES.filter(Boolean).map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Status" value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">全部状态</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="running">运行中</MenuItem>
              <MenuItem value="failed">失败</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
            </TextField>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>智能体</TableCell>
              <TableCell>触发类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">耗时</TableCell>
              <TableCell align="right">模型Token</TableCell>
              <TableCell align="right">费用</TableCell>
              <TableCell>时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无运行记录" description="运行智能体后将显示执行历史" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.agent_name || item.agent_id || '-'}</TableCell>
                <TableCell>
                  <Chip label={item.trigger_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {formatDuration(item.duration_ms)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {item.model_tokens?.toLocaleString() ?? (
                    <>
                      {(item.input_tokens ?? 0).toLocaleString()} / {(item.output_tokens ?? 0).toLocaleString()}
                    </>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                  {formatCost(item.cost)}
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
