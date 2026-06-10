import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TextField, Tooltip, Chip, MenuItem, Typography, IconButton,
  Tabs, Tab, Card, CardContent, Grid, Button, LinearProgress,
} from '@mui/material';
import { Refresh, Settings, CheckCircle, Error, Warning, HelpOutlined } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, SectionCard,
} from '../../components/shared';
import { matchingApi } from '../../api/client';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Matched', value: 'matched' },
  { label: 'Pending', value: 'pending' },
  { label: 'Conflict', value: 'conflict' },
  { label: 'Unmatched', value: 'unmatched' },
];

export default function MatchingPage() {
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [statusTab, setStatusTab] = useState('');

  const queryParams = { ...params, status: statusTab || undefined };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['matching-results', queryParams],
    queryFn: () => matchingApi.results(queryParams),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const { data: stratData } = useQuery({
    queryKey: ['matching-strategies'],
    queryFn: () => matchingApi.strategies(),
  });
  const strategies = stratData?.data?.data || [];

  const { data: runsData } = useQuery({
    queryKey: ['matching-runs'],
    queryFn: () => matchingApi.runs({ page_size: 5 }),
  });
  const recentRuns = runsData?.data?.data || [];

  const summaryStats = {
    total: total,
    matched: items.filter((i: any) => i.status === 'matched').length,
    pending: items.filter((i: any) => i.status === 'pending').length,
    conflict: items.filter((i: any) => i.status === 'conflict').length,
    unmatched: items.filter((i: any) => i.status === 'unmatched').length,
  };

  return (
    <Box>
      <PageHeader
        title="账号匹配"
        subtitle="跨聊天和第三方账号的身份识别"
        actions={
          <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
        }
      />

      {/* Strategy Config Section */}
      <SectionCard
        title="Matching Strategies"
        actions={
          <Button size="small" startIcon={<Settings />} variant="outlined">Configure</Button>
        }
        sx={{ mb: 3 }}
      >
        {strategies.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No strategies configured</Typography>
        ) : (
          <Grid container spacing={1.5}>
            {strategies.map((s: any, idx: number) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id || idx}>
                <Card variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.name}</Typography>
                    <StatusBadge status={s.status || 'active'} />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {s.description || s.strategy_type || 'No description'}
                  </Typography>
                  {s.weight != null && (
                    <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                      Weight: {s.weight}
                    </Typography>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {recentRuns.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Recent Runs</Typography>
            {recentRuns.map((run: any, idx: number) => (
              <Box key={run.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <StatusBadge status={run.status} />
                <Typography variant="caption" color="text.secondary">
                  {run.created_at ? new Date(run.created_at).toLocaleString() : '-'}
                </Typography>
                <Typography variant="caption">
                  {run.matched_count ?? 0} matched, {run.total_count ?? 0} total
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </SectionCard>

      {/* Results Table */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={statusTab} onChange={(_, v) => { setStatusTab(v); setPage(1); }} sx={{ mb: 2 }}>
          {STATUS_TABS.map(tab => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>
      </Box>

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>Source Type</TableCell>
              <TableCell>Account ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>Protected</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无matching results" description="Run a matching job to see results" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any, idx: number) => (
              <TableRow key={item.id || idx} hover>
                <TableCell>
                  <Chip
                    label={item.source_type || 'unknown'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11, height: 22 }}
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.account_id || item.external_id}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>
                  {item.user_name || item.user?.name || (
                    <Typography variant="caption" color="text.secondary">Unlinked</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={(item.score ?? 0) * 100}
                      color={item.score >= 0.8 ? 'success' : item.score >= 0.5 ? 'warning' : 'error'}
                      sx={{ width: 50, height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 32 }}>
                      {item.score != null ? `${(item.score * 100).toFixed(0)}%` : '-'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  {item.protected ? (
                    <Chip label="Protected" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">No</Typography>
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
