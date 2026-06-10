import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Table, TableHead,
  TableBody, TableRow, TableCell, IconButton, Button, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  TablePagination, Select, MenuItem, FormControl, InputLabel, Tab, Tabs,
  Alert, Tooltip, Paper,
} from '@mui/material';
import {
  Add, Search, Refresh, Delete, Edit, Visibility, PlayArrow,
  CheckCircle, Error, Warning, Pending, Block, ArrowUpward,
  ArrowDownward, TrendingUp, TrendingDown, MoreVert, FilterList,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ===================== SHARED COMPONENTS =====================

// Status Badge
const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success', healthy: 'success', matched: 'success', completed: 'success', approved: 'success', published: 'success',
  degraded: 'warning', pending: 'warning', pending_review: 'warning',
  unhealthy: 'error', error: 'error', failed: 'error', conflict: 'error', revoked: 'error', disabled: 'error',
  inactive: 'default', draft: 'default', unmatched: 'default', archived: 'default',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Chip
      label={label || status}
      size="small"
      color={statusColors[status] || 'default'}
      variant="outlined"
      sx={{ fontWeight: 500, fontSize: 11, height: 22 }}
    />
  );
}

// Stat Card
export function StatCard({ title, value, change, icon, color = 'primary' }: {
  title: string; value: string | number; change?: { value: string; trend: 'up' | 'down' };
  icon: React.ReactNode; color?: string;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
            {change && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {change.trend === 'up' ? <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} /> : <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />}
                <Typography variant="caption" color={change.trend === 'up' ? 'success.main' : 'error.main'}>
                  {change.value}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${color}.main`, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.9,
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Page Header
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
    </Box>
  );
}

// Filter Bar
export function FilterBar({ search, onSearchChange, filters, onAdd }: {
  search: string; onSearchChange: (v: string) => void;
  filters?: React.ReactNode; onAdd?: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        size="small" placeholder="搜索..." value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
        sx={{ minWidth: 240 }}
      />
      {filters}
      {onAdd && (
        <Box sx={{ flex: 1 }} />
      )}
      {onAdd && (
        <Button variant="contained" startIcon={<Add />} onClick={onAdd} size="small">
          新增
        </Button>
      )}
    </Box>
  );
}

// Data Table wrapper
export function DataTable({ children, pagination }: {
  children: React.ReactNode;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void; };
}) {
  return (
    <Card>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">{children}</Table>
      </Box>
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, p) => pagination.onPageChange(p + 1)}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={(e) => pagination.onPageSizeChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 20, 50]}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      )}
    </Card>
  );
}

// Empty State
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>}
        {action}
      </CardContent>
    </Card>
  );
}

// Section Card
export function SectionCard({ title, actions, children, sx }: {
  title?: string; actions?: React.ReactNode; children: React.ReactNode; sx?: any;
}) {
  return (
    <Card sx={sx}>
      {(title || actions) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, pt: 2, pb: 1 }}>
          {title && <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 15 }}>{title}</Typography>}
          {actions}
        </Box>
      )}
      <CardContent sx={{ pt: title ? 0 : 2.5, px: 2.5 }}>{children}</CardContent>
    </Card>
  );
}

// CRUD Dialog
export function CrudDialog({ open, onClose, title, children, onSave, saving }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; onSave: () => void; saving?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Loading
export function LoadingState() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

// useTable hook
export function useTableState() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  return { page, pageSize, search, setPage, setPageSize, setSearch, params: { page, page_size: pageSize, search } };
}

// TanStack Query Client
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30000 } },
});
