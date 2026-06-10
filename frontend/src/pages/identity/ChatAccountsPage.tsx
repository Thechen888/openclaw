import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import { chatAccountsApi } from '../../api/client';

const CHAT_TYPES = ['', 'wechat_work', 'dingtalk', 'feishu', 'slack', 'teams', 'telegram'];
const MATCH_STATUSES = ['', 'matched', 'unmatched', 'pending', 'conflict'];

export default function ChatAccountsPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [chatTypeFilter, setChatTypeFilter] = useState('');
  const [matchFilter, setMatchFilter] = useState('');

  const queryParams = {
    ...params,
    chat_type: chatTypeFilter || undefined,
    match_status: matchFilter || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chat-accounts', queryParams],
    queryFn: () => chatAccountsApi.list(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  return (
    <Box>
      <PageHeader
        title="聊天账号"
        subtitle="通过适配器发现的聊天平台账号"
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
              select size="small" label="Chat Type" value={chatTypeFilter}
              onChange={e => { setChatTypeFilter(e.target.value); setPage(1); }}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Types</MenuItem>
              {CHAT_TYPES.filter(Boolean).map(t => (
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
              <TableCell>Chat Type</TableCell>
              <TableCell>External ID</TableCell>
              <TableCell>Nick名称</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Match 状态</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无chat accounts" description="Sync a chat adapter to discover accounts" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell>
                  <Box component="span" sx={{
                    display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                    bgcolor: 'info.light', color: 'info.contrastText', textTransform: 'uppercase',
                  }}>
                    {item.chat_type?.replace(/_/g, ' ')}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.external_id}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.nickname || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.phone || '-'}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.email || '-'}</TableCell>
                <TableCell><StatusBadge status={item.match_status || 'unmatched'} /></TableCell>
                <TableCell>
                  {item.user_name || item.user?.name ? (
                    <Chip label={item.user_name || item.user?.name} size="small" sx={{ fontSize: 11, height: 22 }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">Unlinked</Typography>
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
