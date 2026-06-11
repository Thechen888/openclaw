import { useMemo, useState } from 'react';
import {
  Box, Card, IconButton, Tooltip, Button, Chip, Typography, TextField, InputAdornment,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
} from '@mui/material';
import {
  Refresh, Add, Search, CheckCircle, ErrorOutlined, WarningAmber,
  Delete, Upgrade, Download, Sync,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

type PkgStatus = 'up_to_date' | 'outdated' | 'missing';

interface PythonPackage {
  id: string;
  name: string;
  description: string;
  required_version: string;
  installed_version: string | null;
  status: PkgStatus;
  module: string;
  updated_at: string | null;
}

const MODULES = [
  'core', 'worker', 'agent-runtime', 'connector-engine',
  'backup-service', 'analytics', 'vision-skill', 'custom',
];

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

const statusMeta: Record<PkgStatus, { label: string; color: 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
  up_to_date: { label: '已是最新', color: 'success', icon: <CheckCircle sx={{ fontSize: 18, color: '#10b981' }} /> },
  outdated: { label: '有更新', color: 'warning', icon: <WarningAmber sx={{ fontSize: 18, color: '#f59e0b' }} /> },
  missing: { label: '未安装', color: 'error', icon: <ErrorOutlined sx={{ fontSize: 18, color: '#ef4444' }} /> },
};

export default function PythonPackagesPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [delItem, setDelItem] = useState<PythonPackage | null>(null);

  const listQ = useQuery({
    queryKey: ['python-packages'],
    queryFn: () => api.get('/system/python-packages'),
  });

  const items: PythonPackage[] = Array.isArray(listQ.data?.data?.data)
    ? (listQ.data!.data!.data as PythonPackage[])
    : [];

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((p) =>
      p.name.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw) ||
      p.module.toLowerCase().includes(kw)
    );
  }, [items, search]);

  const outdatedCount = items.filter((p) => p.status === 'outdated').length;
  const missingCount = items.filter((p) => p.status === 'missing').length;

  const addMu = useMutation({
    mutationFn: (payload: any) => api.post('/system/python-packages', payload),
    onSuccess: () => {
      enqueueSnackbar('已添加包', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['python-packages'] });
      setAddOpen(false);
    },
  });

  const delMu = useMutation({
    mutationFn: (id: string) => api.delete(`/system/python-packages/${id}`),
    onSuccess: () => {
      enqueueSnackbar('已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['python-packages'] });
      setDelItem(null);
    },
  });

  const upgradeMu = useMutation({
    mutationFn: (id: string) => api.post(`/system/python-packages/${id}/upgrade`, {}),
    onSuccess: () => {
      enqueueSnackbar('升级成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['python-packages'] });
    },
  });

  const installMu = useMutation({
    mutationFn: (id: string) => api.post(`/system/python-packages/${id}/install`, {}),
    onSuccess: () => {
      enqueueSnackbar('安装成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['python-packages'] });
    },
  });

  const syncMu = useMutation({
    mutationFn: () => api.post('/system/python-packages/sync', {}),
    onSuccess: () => {
      enqueueSnackbar('已同步 requirements', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['python-packages'] });
    },
  });

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Box>
      <PageHeader
        title="Python依赖管理"
        subtitle="管理平台和Agent运行时所需的Python包"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {outdatedCount > 0 && (
              <Chip
                label={`${outdatedCount} 可更新`}
                size="small"
                sx={{ bgcolor: 'rgba(245,158,11,0.18)', color: '#f59e0b', fontWeight: 600 }}
              />
            )}
            {missingCount > 0 && (
              <Chip
                label={`${missingCount} 未安装`}
                size="small"
                sx={{ bgcolor: 'rgba(239,68,68,0.18)', color: '#ef4444', fontWeight: 600 }}
              />
            )}
            <Tooltip title="同步 requirements.txt">
              <IconButton onClick={() => syncMu.mutate()} disabled={syncMu.isPending}>
                <Sync />
              </IconButton>
            </Tooltip>
            <Tooltip title="刷新">
              <IconButton onClick={() => listQ.refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
              添加包
            </Button>
          </Box>
        }
      />

      <Card sx={{ p: 2 }}>
        <TextField
          placeholder="搜索.."
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ mb: 2, width: 360 }}
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

        {listQ.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>包名</TableCell>
                  <TableCell sx={{ width: 120 }}>要求版本</TableCell>
                  <TableCell sx={{ width: 120 }}>已安装版本</TableCell>
                  <TableCell sx={{ width: 110 }}>状态</TableCell>
                  <TableCell sx={{ width: 160 }}>所属模块</TableCell>
                  <TableCell sx={{ width: 130 }}>更新时间</TableCell>
                  <TableCell sx={{ width: 110 }} align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                      暂无依赖
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((p) => {
                    const meta = statusMeta[p.status];
                    return (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ pt: 0.25 }}>{meta.icon}</Box>
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.description}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{p.required_version}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{p.installed_version || '-'}</TableCell>
                        <TableCell>
                          <Chip label={meta.label} size="small" color={meta.color} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={p.module} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                        </TableCell>
                        <TableCell>{formatDate(p.updated_at)}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            {p.status === 'outdated' && (
                              <Tooltip title="升级">
                                <IconButton
                                  size="small"
                                  onClick={() => upgradeMu.mutate(p.id)}
                                  sx={{ color: '#f59e0b' }}
                                >
                                  <Upgrade fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {p.status === 'missing' && (
                              <Tooltip title="安装">
                                <IconButton
                                  size="small"
                                  onClick={() => installMu.mutate(p.id)}
                                  sx={{ color: 'primary.main' }}
                                >
                                  <Download fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="删除">
                              <IconButton
                                size="small"
                                onClick={() => setDelItem(p)}
                                sx={{ color: '#ef4444' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Card>

      <AddPackageDialog
        open={addOpen}
        loading={addMu.isPending}
        onClose={() => setAddOpen(false)}
        onSubmit={(payload) => addMu.mutate(payload)}
      />

      <Dialog open={!!delItem} onClose={() => setDelItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确定删除依赖包 <b>{delItem?.name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelItem(null)}>取消</Button>
          <Button
            color="error"
            variant="contained"
            disabled={delMu.isPending}
            onClick={() => delItem && delMu.mutate(delItem.id)}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// =============== 添加包对话框 ===============
interface AddPackageDialogProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

function AddPackageDialog({ open, loading, onClose, onSubmit }: AddPackageDialogProps) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [moduleName, setModuleName] = useState('custom');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      required_version: version.trim() || 'latest',
      description: description.trim(),
      module: moduleName,
    });
  };

  const handleClose = () => {
    setName(''); setVersion(''); setDescription(''); setModuleName('custom');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>添加包</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="包名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="版本"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              sx={{ width: 200 }}
              placeholder="latest"
            />
          </Box>
          <TextField
            label="描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <TextField
            label="所属模块"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            select
            fullWidth
          >
            {MODULES.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" disabled={loading || !name.trim()} onClick={handleSubmit}>
          添加
        </Button>
      </DialogActions>
    </Dialog>
  );
}
