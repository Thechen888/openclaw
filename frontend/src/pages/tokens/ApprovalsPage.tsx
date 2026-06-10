import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography, IconButton, Button,
} from '@mui/material';
import { Refresh, CheckCircle, Cancel, Pending } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { approvalsApi } from '../../api/client';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [statusFilter, setStatusFilter] = useState('pending');

  const queryParams = { ...params, status: statusFilter || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals', queryParams],
    queryFn: () => approvalsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });

  return (
    <Box>
      <PageHeader
        title="审批"
        subtitle="审核和批准待处理请求"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={
          <TextField
            select size="small" label="Status" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
        }
      />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Requester</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无approvals" description={statusFilter === 'pending' ? 'All caught up! No pending approvals.' : 'No approval records found.'} />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Chip label={item.type || item.approval_type || '-'} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.requester_name || item.requester || '-'}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title || item.subject || '-'}</Typography>
                    {item.description && (
                      <Typography variant="caption" color="text.secondary" sx={{
                        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  {item.status === 'pending' || item.status === 'pending_review' ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Approve">
                        <Button
                          size="small" variant="outlined" color="success"
                          startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
                          onClick={() => { if (confirm('Approve this request?')) approveMutation.mutate(item.id); }}
                          disabled={approveMutation.isPending}
                          sx={{ minWidth: 0, textTransform: 'none', fontSize: 11, py: 0.25, px: 1 }}
                        >
                          Approve
                        </Button>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <Button
                          size="small" variant="outlined" color="error"
                          startIcon={<Cancel sx={{ fontSize: 16 }} />}
                          onClick={() => { if (confirm('Reject this request?')) rejectMutation.mutate(item.id); }}
                          disabled={rejectMutation.isPending}
                          sx={{ minWidth: 0, textTransform: 'none', fontSize: 11, py: 0.25, px: 1 }}
                        >
                          Reject
                        </Button>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : '-'}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
