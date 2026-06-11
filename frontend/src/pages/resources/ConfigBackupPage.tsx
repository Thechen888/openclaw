import { useState } from 'react';
import {
  Box, Card, IconButton, Tooltip, Button, Chip, Typography,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  Refresh, CloudUpload, History, CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

type BackupStatus = 'success' | 'failed' | 'running';
type StorageType = 'OSS' | 'LOCAL' | 'S3';

interface BackupItem {
  id: string;
  name: string;
  description: string;
  storage_type: StorageType;
  size_mb: number;
  status: BackupStatus;
  creator: string;
  created_at: string;
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function ConfigBackupPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [restoreItem, setRestoreItem] = useState<BackupItem | null>(null);

  const listQ = useQuery({
    queryKey: ['config-backups'],
    queryFn: () => api.get('/system/config-backups'),
  });

  const items: BackupItem[] = Array.isArray(listQ.data?.data?.data)
    ? (listQ.data!.data!.data as BackupItem[])
    : [];

  const createMu = useMutation({
    mutationFn: (payload: { name: string; description: string; storage_type: StorageType }) =>
      api.post('/system/config-backups', payload),
    onSuccess: () => {
      enqueueSnackbar('备份创建成功', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['config-backups'] });
      setCreateOpen(false);
    },
  });

  const restoreMu = useMutation({
    mutationFn: (id: string) => api.post(`/system/config-backups/${id}/restore`, {}),
    onSuccess: () => {
      enqueueSnackbar('已发起还原任务', { variant: 'success' });
      setRestoreItem(null);
    },
  });

  const pageItems = items.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Box>
      <PageHeader
        title="配置备份"
        subtitle="整站配置推送云备份"
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="刷新">
              <IconButton onClick={() => listQ.refetch()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setCreateOpen(true)}
            >
              创建备份
            </Button>
          </Box>
        }
      />

      <Card>
        {listQ.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>名称</TableCell>
                  <TableCell>描述</TableCell>
                  <TableCell sx={{ width: 120 }}>存储类型</TableCell>
                  <TableCell sx={{ width: 100 }}>大小</TableCell>
                  <TableCell sx={{ width: 120 }}>状态</TableCell>
                  <TableCell sx={{ width: 140 }}>创建者</TableCell>
                  <TableCell sx={{ width: 200 }}>创建时间</TableCell>
                  <TableCell sx={{ width: 100 }} align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                      暂无备份记录
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((it) => (
                    <TableRow key={it.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {it.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {it.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={it.storage_type}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{it.size_mb} MB</TableCell>
                      <TableCell>
                        <Chip
                          label={it.status}
                          size="small"
                          color={
                            it.status === 'success'
                              ? 'success'
                              : it.status === 'failed'
                              ? 'error'
                              : 'warning'
                          }
                          variant="outlined"
                          icon={it.status === 'success' ? <CheckCircle sx={{ fontSize: 14 }} /> : undefined}
                        />
                      </TableCell>
                      <TableCell>{it.creator}</TableCell>
                      <TableCell>{formatDateTime(it.created_at)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="还原">
                          <IconButton
                            size="small"
                            onClick={() => setRestoreItem(it)}
                            sx={{ color: '#f59e0b' }}
                          >
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={items.length}
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

      <CreateBackupDialog
        open={createOpen}
        loading={createMu.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => createMu.mutate(payload)}
      />

      <Dialog open={!!restoreItem} onClose={() => setRestoreItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认还原</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            将使用备份 <b>{restoreItem?.name}</b> 还原整站配置。
          </Typography>
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            此操作会覆盖当前所有连接器、Agent、策略配置，且不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreItem(null)}>取消</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={restoreMu.isPending}
            onClick={() => restoreItem && restoreMu.mutate(restoreItem.id)}
          >
            确认还原
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// =============== 创建备份对话框 ===============
interface CreateBackupDialogProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; description: string; storage_type: StorageType }) => void;
}

function CreateBackupDialog({ open, loading, onClose, onSubmit }: CreateBackupDialogProps) {
  const today = new Date();
  const defaultName = `手动备份 - ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('管理员手动创建的备份');
  const [storageType, setStorageType] = useState<StorageType>('OSS');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), storage_type: storageType });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>创建备份</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="存储类型"
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as StorageType)}
            select
            fullWidth
          >
            <MenuItem value="OSS">OSS</MenuItem>
            <MenuItem value="LOCAL">LOCAL</MenuItem>
            <MenuItem value="S3">S3</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={loading || !name.trim()} onClick={handleSubmit}>
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}
