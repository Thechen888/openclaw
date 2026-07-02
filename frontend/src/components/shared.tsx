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

const statusGlow: Record<string, string> = {
  success: '0 0 8px rgba(0,255,136,0.3)',
  warning: '0 0 8px rgba(255,184,0,0.3)',
  error: '0 0 8px rgba(255,51,102,0.3)',
  info: '0 0 8px rgba(0,212,255,0.3)',
  default: 'none',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const color = statusColors[status] || 'default';
  return (
    <Chip
      label={label || status}
      size="small"
      color={color}
      variant="outlined"
      sx={{
        fontWeight: 500, fontSize: 11, height: 22,
        boxShadow: statusGlow[color] || 'none',
      }}
    />
  );
}

// Stat Card — 带迷你柱状图装饰
export function StatCard({ title, value, change, icon, color = 'primary' }: {
  title: string; value: string | number; change?: { value: string; trend: 'up' | 'down' };
  icon: React.ReactNode; color?: string;
}) {
  // 随机但固定的迷你柱状图数据（7列）
  const bars = [35, 55, 40, 70, 50, 80, 60];
  const colorMap: Record<string, string[]> = {
    primary: ['#00D4FF', 'rgba(0,212,255,0.12)'],
    error: ['#FF3366', 'rgba(255,51,102,0.12)'],
    warning: ['#FFB800', 'rgba(255,184,0,0.12)'],
    info: ['#0EA5E9', 'rgba(14,165,233,0.12)'],
  };
  const [accentColor, accentBg] = colorMap[color] || colorMap.primary;

  return (
    <Card sx={{
      transition: 'transform 0.25s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      overflow: 'hidden',
      position: 'relative',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 0 30px ${accentBg}, 0 8px 24px rgba(0,0,0,0.3)`,
        borderColor: `${accentColor}40`,
      },
      /* 顶部渐变装饰线 */
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
        opacity: 0.6,
      },
    }}>
      <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 500, letterSpacing: '0.05em', color: 'rgba(200,210,220,0.7)', textTransform: 'uppercase', fontSize: 11 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: accentColor, textShadow: `0 0 20px ${accentBg}` }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{
            width: 48, height: 48, borderRadius: 2.5,
            background: `linear-gradient(135deg, ${accentBg}, ${accentColor}15)`,
            border: `1px solid ${accentColor}20`,
            color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${accentBg}`,
            fontSize: 26,
          }}>
            {icon}
          </Box>
        </Box>
        {/* 迷你柱状图装饰 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 28, mb: 1 }}>
          {bars.map((h, i) => (
            <Box key={i} sx={{
              flex: 1, height: `${h}%`, borderRadius: '2px 2px 0 0',
              background: i === bars.length - 1
                ? `linear-gradient(180deg, ${accentColor}, ${accentColor}60)`
                : `${accentColor}18`,
              transition: 'height 0.5s ease',
            }} />
          ))}
        </Box>
        {change && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {change.trend === 'up' ? <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} /> : <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />}
            <Typography variant="caption" color={change.trend === 'up' ? 'success.main' : 'error.main'} sx={{ fontWeight: 600 }}>
              {change.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.5)', fontSize: 11, ml: 0.5 }}>vs 昨日</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Page Header — 带装饰底线和副标题徽章
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3,
      pb: 2, position: 'relative',
      '&::after': {
        content: '""', position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, rgba(0,212,255,0.25) 0%, rgba(124,58,237,0.15) 50%, transparent 100%)',
      },
    }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 4, height: 24, borderRadius: 2,
            background: 'linear-gradient(180deg, #00D4FF, #7C3AED)',
            boxShadow: '0 0 10px rgba(0,212,255,0.4)',
          }} />
          <Typography variant="h5" sx={{
            fontWeight: 700, fontSize: 20,
            textShadow: '0 0 20px rgba(0,212,255,0.15)',
            background: 'linear-gradient(90deg, #E8ECF0 0%, #00D4FF 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{title}</Typography>
        </Box>
        {subtitle && (
          <Typography variant="body2" sx={{ mt: 0.75, ml: 2.5, color: 'text.secondary', fontSize: 12, letterSpacing: '0.02em' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{actions}</Box>
      )}
    </Box>
  );
}

// Filter Bar — 工具栏风格带背景面板
export function FilterBar({ search, onSearchChange, filters, onAdd }: {
  search: string; onSearchChange: (v: string) => void;
  filters?: React.ReactNode; onAdd?: () => void;
}) {
  return (
    <Box sx={{
      display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center',
      p: 1.5, borderRadius: 2,
      bgcolor: 'rgba(0,212,255,0.02)',
      border: '1px solid rgba(0,212,255,0.06)',
    }}>
      <TextField
        size="small" placeholder="搜索关键词..." value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
        sx={{
          minWidth: 260,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(5,5,7,0.5)',
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,212,255,0.3)' },
          },
        }}
      />
      {filters}
      <Box sx={{ flex: 1 }} />
      {onAdd && (
        <Button variant="contained" startIcon={<Add />} onClick={onAdd} size="small"
          sx={{ px: 2.5, fontWeight: 600 }}>
          新增
        </Button>
      )}
    </Box>
  );
}

// Data Table wrapper — 增强表头和行交互
export function DataTable({ children, pagination }: {
  children: React.ReactNode;
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void; };
}) {
  return (
    <Card sx={{
      overflow: 'hidden',
      position: 'relative',
      '&::before': {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)',
      },
    }}>
      {/* 表头信息条 */}
      {pagination && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.06)',
          bgcolor: 'rgba(0,212,255,0.015)',
        }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
            共 <Box component="span" sx={{ color: '#00D4FF', fontWeight: 700, fontFamily: 'monospace' }}>{pagination.total}</Box> 条记录
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
            第 {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize) || 1} 页
          </Typography>
        </Box>
      )}
      <Box sx={{
        overflowX: 'auto',
        '& table': { borderCollapse: 'separate', borderSpacing: 0 },
        '& thead tr': {
          bgcolor: 'rgba(0,212,255,0.03)',
        },
        '& thead th': {
          borderBottom: '1px solid rgba(0,212,255,0.1) !important',
          color: 'rgba(0,212,255,0.6)',
          fontWeight: 700,
          fontSize: '11px !important',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
        '& tbody tr': {
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'rgba(0,212,255,0.03)',
            '& td': { color: '#E8ECF0' },
          },
        },
        '& tbody td': {
          borderBottom: '1px solid rgba(0,212,255,0.04) !important',
          transition: 'color 0.2s',
        },
      }}>
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
          sx={{
            borderTop: '1px solid rgba(0,212,255,0.06)',
            bgcolor: 'rgba(0,212,255,0.015)',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 12 },
          }}
        />
      )}
    </Card>
  );
}

// Empty State — 带装饰图标和渐变提示
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card sx={{ border: '1px dashed rgba(0,212,255,0.15)' }}>
      <CardContent sx={{ textAlign: 'center', py: 6 }}>
        <Box sx={{
          width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2,
          background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08))',
          border: '1px solid rgba(0,212,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px dashed rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(0,212,255,0.4)' }} />
          </Box>
        </Box>
        <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>{title}</Typography>
        {description && <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontSize: 13 }}>{description}</Typography>}
        {action}
      </CardContent>
    </Card>
  );
}

// Section Card — 带左侧渐变条和装饰角标
export function SectionCard({ title, actions, children, sx }: {
  title?: string; actions?: React.ReactNode; children: React.ReactNode; sx?: any;
}) {
  return (
    <Card sx={{
      ...sx,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      /* 顶部渐变线 */
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), rgba(124,58,237,0.2), transparent)',
      },
      /* 左侧渐变装饰条 */
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, bottom: 0, width: '2px',
        background: 'linear-gradient(180deg, #00D4FF, #7C3AED, transparent)',
        opacity: 0.4,
      },
    }}>
      {(title || actions) && (
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: 2.5, pt: 2, pb: 1,
          borderBottom: '1px solid rgba(0,212,255,0.06)',
        }}>
          {title && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 4, height: 16, borderRadius: 1,
                background: 'linear-gradient(180deg, #00D4FF, #7C3AED)',
                boxShadow: '0 0 8px rgba(0,212,255,0.4)',
              }} />
              <Typography variant="h6" sx={{
                fontWeight: 600, fontSize: 15,
                color: '#00D4FF',
                textShadow: '0 0 12px rgba(0,212,255,0.15)',
              }}>{title}</Typography>
            </Box>
          )}
          {actions}
        </Box>
      )}
      <CardContent sx={{ pt: title ? 1.5 : 2.5, px: 2.5, flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>{children}</CardContent>
    </Card>
  );
}

// CRUD Dialog — 精致毛玻璃弹窗
export function CrudDialog({ open, onClose, title, children, onSave, saving }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; onSave: () => void; saving?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: '1px solid rgba(0,212,255,0.12)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* 弹窗标题栏 */}
      <DialogTitle sx={{
        fontWeight: 700, fontSize: 16,
        background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(124,58,237,0.04))',
        borderBottom: '1px solid rgba(0,212,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 1.5,
        py: 2,
      }}>
        <Box sx={{
          width: 4, height: 18, borderRadius: 2,
          background: 'linear-gradient(180deg, #00D4FF, #7C3AED)',
          boxShadow: '0 0 8px rgba(0,212,255,0.4)',
        }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important', pb: 2, px: 3 }}>
        {children}
      </DialogContent>
      <DialogActions sx={{
        px: 3, py: 2,
        borderTop: '1px solid rgba(0,212,255,0.06)',
        bgcolor: 'rgba(0,212,255,0.015)',
      }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>取消</Button>
        <Button variant="contained" onClick={onSave} disabled={saving} sx={{ px: 3, fontWeight: 600 }}>
          {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Loading — 带脉冲环动画
export function LoadingState() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
      <Box sx={{ position: 'relative', width: 56, height: 56 }}>
        <CircularProgress size={56} thickness={2} sx={{
          color: '#00D4FF',
          '& .MuiCircularProgress-circle': { filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.4))' },
        }} />
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{
            width: 12, height: 12, borderRadius: '50%',
            bgcolor: '#00D4FF',
            animation: 'neonPulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 12px rgba(0,212,255,0.5)',
          }} />
        </Box>
      </Box>
      <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary', letterSpacing: '0.1em', fontSize: 11 }}>
        加载中...
      </Typography>
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
