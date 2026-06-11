import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, IconButton, Tooltip, Button, Chip, Typography, TextField, InputAdornment,
  Tabs, Tab, Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Grid,
} from '@mui/material';
import {
  Refresh, Add, Search, Delete, Edit, SouthWest, NorthEast,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

type Direction = 'inbound' | 'outbound';
type AclStatus = 'active' | 'disabled';

interface AclRule {
  id: string;
  target: string;
  label: string;
  direction: Direction;
  status: AclStatus;
  description: string;
  creator: string;
}

const directionMeta: Record<Direction, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  inbound: {
    label: '入站',
    icon: <SouthWest sx={{ fontSize: 14 }} />,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
  },
  outbound: {
    label: '出站',
    icon: <NorthEast sx={{ fontSize: 14 }} />,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
  },
};

export default function NetworkAclPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState<'all' | Direction>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AclRule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [delItem, setDelItem] = useState<AclRule | null>(null);

  const listQ = useQuery({
    queryKey: ['network-acl'],
    queryFn: () => api.get('/system/network-acl'),
  });

  const items: AclRule[] = Array.isArray(listQ.data?.data?.data)
    ? (listQ.data!.data!.data as AclRule[])
    : [];

  const inboundCount = items.filter((i) => i.direction === 'inbound').length;
  const outboundCount = items.filter((i) => i.direction === 'outbound').length;

  const filtered = useMemo(() => {
    let arr = items;
    if (tab !== 'all') arr = arr.filter((i) => i.direction === tab);
    const kw = search.trim().toLowerCase();
    if (kw) {
      arr = arr.filter((i) =>
        i.target.toLowerCase().includes(kw) ||
        i.label.toLowerCase().includes(kw) ||
        i.description.toLowerCase().includes(kw)
      );
    }
    return arr;
  }, [items, tab, search]);

  const saveMu = useMutation({
    mutationFn: (payload: any) =>
      payload.id
        ? api.put(`/system/network-acl/${payload.id}`, payload)
        : api.post('/system/network-acl', payload),
    onSuccess: () => {
      enqueueSnackbar('保存成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['network-acl'] });
      setDialogOpen(false);
      setEditing(null);
    },
  });

  const delMu = useMutation({
    mutationFn: (id: string) => api.delete(`/system/network-acl/${id}`),
    onSuccess: () => {
      enqueueSnackbar('已删除', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['network-acl'] });
      setDelItem(null);
    },
  });

  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: AclRule) => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="网络白名单"
        subtitle="管理平台入站和出站网络访问规则"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="刷新">
              <IconButton onClick={() => listQ.refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
              添加规则
            </Button>
          </Box>
        }
      />

      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
          <TextField
            placeholder="搜索.."
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ width: 320 }}
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
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setPage(0); }}
            sx={{ minHeight: 36 }}
          >
            <Tab value="all" label={`全部 (${items.length})`} />
            <Tab
              value="inbound"
              label={`入站 (${inboundCount})`}
              icon={<SouthWest sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
            <Tab
              value="outbound"
              label={`出站 (${outboundCount})`}
              icon={<NorthEast sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {listQ.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 220 }}>IP/CIDR/域名</TableCell>
                  <TableCell sx={{ width: 180 }}>标签</TableCell>
                  <TableCell sx={{ width: 110 }}>方向</TableCell>
                  <TableCell sx={{ width: 110 }}>状态</TableCell>
                  <TableCell>描述</TableCell>
                  <TableCell sx={{ width: 130 }}>创建者</TableCell>
                  <TableCell sx={{ width: 110 }} align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                      暂无规则
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((it) => {
                    const dm = directionMeta[it.direction];
                    return (
                      <TableRow key={it.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {it.target}
                        </TableCell>
                        <TableCell>{it.label}</TableCell>
                        <TableCell>
                          <Chip
                            icon={<Box sx={{ display: 'flex', color: dm.color }}>{dm.icon}</Box>}
                            label={dm.label}
                            size="small"
                            sx={{
                              bgcolor: dm.bg,
                              color: dm.color,
                              fontWeight: 600,
                              border: `1px solid ${dm.color}`,
                              '& .MuiChip-icon': { color: dm.color, ml: 0.5 },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={it.status}
                            size="small"
                            color={it.status === 'active' ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {it.description}
                          </Typography>
                        </TableCell>
                        <TableCell>{it.creator}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => openEdit(it)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => setDelItem(it)} sx={{ color: '#ef4444' }}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      <RuleDialog
        open={dialogOpen}
        editing={editing}
        loading={saveMu.isPending}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSubmit={(payload) => saveMu.mutate(payload)}
      />

      <Dialog open={!!delItem} onClose={() => setDelItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确定删除规则 <b>{delItem?.target}</b>?
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

// =============== 添加/编辑规则对话框 ===============
interface RuleDialogProps {
  open: boolean;
  editing: AclRule | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

function RuleDialog({ open, editing, loading, onClose, onSubmit }: RuleDialogProps) {
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [direction, setDirection] = useState<Direction>('inbound');
  const [status, setStatus] = useState<AclStatus>('active');
  const [description, setDescription] = useState('');

  // 同步编辑数据
  useEffect(() => {
    if (open) {
      setTarget(editing?.target || '');
      setLabel(editing?.label || '');
      setDirection(editing?.direction || 'inbound');
      setStatus(editing?.status || 'active');
      setDescription(editing?.description || '');
    }
  }, [open, editing]);

  const handleSubmit = () => {
    if (!target.trim()) return;
    onSubmit({
      id: editing?.id,
      target: target.trim(),
      label: label.trim(),
      direction,
      status,
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? '编辑规则' : '添加规则'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              label="IP/CIDR/域名"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              fullWidth
              autoFocus
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              label="方向"
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              select
              fullWidth
            >
              <MenuItem value="inbound">入站</MenuItem>
              <MenuItem value="outbound">出站</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              label="标签"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              label="状态"
              value={status}
              onChange={(e) => setStatus(e.target.value as AclStatus)}
              select
              fullWidth
            >
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">停用</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              label="描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={loading || !target.trim()} onClick={handleSubmit}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
