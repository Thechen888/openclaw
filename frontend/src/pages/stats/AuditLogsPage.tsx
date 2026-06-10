import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography, IconButton,
} from '@mui/material';
import { Refresh, Download, FilterList } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { auditApi } from '../../api/client';

const ACTION_TYPES = ['', 'create', 'update', 'delete', 'login', 'logout', 'read', 'execute', 'approve', 'reject'];
const RESOURCE_TYPES = ['', 'user', 'organization', 'agent', 'skill', 'model_source', 'model_policy', 'token', 'connector', 'approval'];
const OUTCOMES = ['', 'success', 'failure', 'error'];

export default function AuditLogsPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const queryParams = {
    ...params,
    action: actionFilter || undefined,
    resource_type: resourceFilter || undefined,
    outcome: outcomeFilter || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const actionColors: Record<string, string> = {
    create: 'success', update: 'info', delete: 'error', login: 'primary',
    logout: 'default', read: 'default', execute: 'warning', approve: 'success', reject: 'error',
  };

  return (
    <Box>
      <PageHeader
        title="审计日志"
        subtitle="安全与合规的完整活动日志"
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
              select size="small" label="Action" value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">All Actions</MenuItem>
              {ACTION_TYPES.filter(Boolean).map(a => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Resource" value={resourceFilter}
              onChange={e => { setResourceFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All Resources</MenuItem>
              {RESOURCE_TYPES.filter(Boolean).map(r => (
                <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Outcome" value={outcomeFilter}
              onChange={e => { setOutcomeFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Outcomes</MenuItem>
              {OUTCOMES.filter(Boolean).map(o => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </TextField>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Outcome</TableCell>
              <TableCell align="right">Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无audit logs" description="Adjust filters or check back later" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap', color: 'text.secondary' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                      {item.actor_name || item.actor || '-'}
                    </Typography>
                    {item.actor_ip && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {item.actor_ip}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.action}
                    size="small"
                    color={(actionColors[item.action] || 'default') as any}
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      {item.resource_type?.replace(/_/g, ' ')}
                    </Typography>
                    {item.resource_id && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {item.resource_id}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={item.outcome || 'success'} /></TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                  {formatDuration(item.duration_ms)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
