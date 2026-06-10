import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography, IconButton,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { thirdPartyAccountsApi } from '../../api/client';

const SYSTEM_TYPES = ['', 'crm', 'erp', 'helpdesk', 'project_management', 'hr', 'finance', 'custom'];
const MATCH_STATUSES = ['', 'matched', 'unmatched', 'pending', 'conflict'];

export default function ThirdPartyAccountsPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [systemFilter, setSystemFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState('');

  const queryParams = {
    ...params,
    system_type: systemFilter || undefined,
    match_status: matchFilter || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['third-party-accounts', queryParams],
    queryFn: () => thirdPartyAccountsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  return (
    <Box>
      <PageHeader
        title="第三方账号"
        subtitle="通过连接器发现的第三方系统账号"
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
              select size="small" label="System Type" value={systemFilter}
              onChange={e => { setSystemFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All Types</MenuItem>
              {SYSTEM_TYPES.filter(Boolean).map(t => (
                <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Match Status" value={matchFilter}
              onChange={e => { setMatchFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Status</MenuItem>
              {MATCH_STATUSES.filter(Boolean).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </>
        }
      />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>System Type</TableCell>
              <TableCell>External ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Match 状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无third-party accounts" description="Sync a connector to discover accounts" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell>
                  <Chip label={item.system_type} size="small" variant="outlined" sx={{ fontSize: 11, height: 22, textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.external_id}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.name || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.email || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.department || '-'}</TableCell>
                <TableCell><StatusBadge status={item.match_status || 'unmatched'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}
    </Box>
  );
}
