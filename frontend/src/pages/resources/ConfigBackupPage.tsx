import { useState } from 'react';
import {
  Box, Card, IconButton, Tooltip, Button, Chip, Typography,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Tabs, Tab, TextField, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Switch,
} from '@mui/material';
import {
  Refresh, Add, Edit, Delete, FolderOpen, Schedule, InsertDriveFile,
  CheckCircle, Error as ErrorIcon, HourglassEmpty,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, LoadingState } from '../../components/shared';
import api from '../../api/client';

// ============ 类型 ============
interface BackupRule {
  id: string;
  name: string;
  execution_time: string;
  config_directory: string;
  retention_days: number;
  retention_count: number;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

interface BackupFile {
  id: string;
  filename: string;
  size_mb: number;
  created_at: string;
  source_rule_id: string;
  storage_path: string;
}

type RecordStatus = 'success' | 'failed' | 'running';

interface BackupRecord {
  id: string;
  task_name: string;
  status: RecordStatus;
  started_at: string;
  finished_at: string | null;
}

// ============ 工具 ============
const fmtTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ============ 主组件 ============
export default function ConfigBackupPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);

  // 备份规则列表
  const rulesQ = useQuery({
    queryKey: ['backup-rules'],
    queryFn: () => api.get('/system/backup-rules'),
  });
  const rules: BackupRule[] = Array.isArray(rulesQ.data?.data?.data) ? rulesQ.data!.data!.data : [];

  // 备份文件列表
  const filesQ = useQuery({
    queryKey: ['backup-files'],
    queryFn: () => api.get('/system/backup-files'),
  });
  const files: BackupFile[] = Array.isArray(filesQ.data?.data?.data) ? filesQ.data!.data!.data : [];

  // 备份记录
  const recordsQ = useQuery({
    queryKey: ['backup-records'],
    queryFn: () => api.get('/system/backup-records'),
  });
  const records: BackupRecord[] = Array.isArray(recordsQ.data?.data?.data) ? recordsQ.data!.data!.data : [];

  // 创建规则
  const createRuleMu = useMutation({
    mutationFn: (payload: Omit<BackupRule, 'id' | 'enabled' | 'last_run_at' | 'created_at'>) =>
      api.post('/system/backup-rules', payload),
    onSuccess: () => { enqueueSnackbar('规则已创建', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['backup-rules'] }); },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });

  // 更新规则
  const updateRuleMu = useMutation({
    mutationFn: ({ id, ...payload }: Partial<BackupRule> & { id: string }) =>
      api.put(`/system/backup-rules/${id}`, payload),
    onSuccess: () => { enqueueSnackbar('规则已更新', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['backup-rules'] }); },
    onError: () => enqueueSnackbar('更新失败', { variant: 'error' }),
  });

  // 删除规则
  const deleteRuleMu = useMutation({
    mutationFn: (id: string) => api.delete(`/system/backup-rules/${id}`),
    onSuccess: () => { enqueueSnackbar('规则已删除', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['backup-rules'] }); },
    onError: () => enqueueSnackbar('删除失败', { variant: 'error' }),
  });

  // 重新执行
  const rerunMu = useMutation({
    mutationFn: (id: string) => api.post(`/system/backup-records/${id}/rerun`, {}),
    onSuccess: () => { enqueueSnackbar('已发起重新执行', { variant: 'success' }); qc.invalidateQueries({ queryKey: ['backup-records'] }); },
    onError: () => enqueueSnackbar('操作失败', { variant: 'error' }),
  });

  return (
    <Box>
      <PageHeader
        title="配置备份"
        subtitle="管理系统配置的自动备份规则、备份产物与执行记录"
        actions={
          <Tooltip title="刷新">
            <IconButton onClick={() => { rulesQ.refetch(); filesQ.refetch(); recordsQ.refetch(); }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, borderBottom: '1px solid rgba(0,212,255,0.08)' }}
      >
        <Tab icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" label="备份规则配置" />
        <Tab icon={<InsertDriveFile sx={{ fontSize: 18 }} />} iconPosition="start" label="备份文件列表" />
        <Tab icon={<FolderOpen sx={{ fontSize: 18 }} />} iconPosition="start" label="备份记录" />
      </Tabs>

      {/* ========== Tab 0: 备份规则列表 ========== */}
      {tab === 0 && (
        <BackupRulesTab
          rules={rules}
          loading={rulesQ.isLoading}
          onCreate={(p) => createRuleMu.mutate(p)}
          onUpdate={(p) => updateRuleMu.mutate(p)}
          onDelete={(id) => deleteRuleMu.mutate(id)}
          saving={createRuleMu.isPending || updateRuleMu.isPending}
        />
      )}

      {/* ========== Tab 1: 备份文件列表 ========== */}
      {tab === 1 && <BackupFilesTab files={files} loading={filesQ.isLoading} />}

      {/* ========== Tab 2: 备份记录 ========== */}
      {tab === 2 && <BackupRecordsTab records={records} loading={recordsQ.isLoading} rerunning={rerunMu.isPending} onRerun={(id) => rerunMu.mutate(id)} />}
    </Box>
  );
}

// ============ Tab 0: 备份规则列表 + 弹窗 ============
function BackupRulesTab({ rules, loading, onCreate, onUpdate, onDelete, saving }: {
  rules: BackupRule[];
  loading: boolean;
  saving: boolean;
  onCreate: (p: { name: string; execution_time: string; config_directory: string; retention_days: number; retention_count: number }) => void;
  onUpdate: (p: Partial<BackupRule> & { id: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BackupRule | null>(null);

  const handleAdd = () => { setEditingRule(null); setDialogOpen(true); };
  const handleEdit = (r: BackupRule) => { setEditingRule(r); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingRule(null); };

  const handleSubmit = (values: { name: string; execution_time: string; config_directory: string; retention_days: number; retention_count: number }) => {
    if (editingRule) {
      onUpdate({ id: editingRule.id, ...values });
    } else {
      onCreate(values);
    }
    handleClose();
  };

  return (
    <Card>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>备份规则列表</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={handleAdd}>新增规则</Button>
      </Box>
      {loading ? <LoadingState /> : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>规则名称</TableCell>
              <TableCell sx={{ width: 100 }}>执行时间</TableCell>
              <TableCell>配置目录</TableCell>
              <TableCell sx={{ width: 100 }} align="center">保留天数</TableCell>
              <TableCell sx={{ width: 100 }} align="center">保留数量</TableCell>
              <TableCell sx={{ width: 90 }}>启用</TableCell>
              <TableCell sx={{ width: 180 }}>上次执行</TableCell>
              <TableCell sx={{ width: 120 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 6 }}>暂无备份规则，点击"新增规则"添加</TableCell>
              </TableRow>
            ) : (
              rules.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography></TableCell>
                  <TableCell><Chip label={r.execution_time} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{r.config_directory}</Typography></TableCell>
                  <TableCell align="center"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{r.retention_days ?? '—'} 天</Typography></TableCell>
                  <TableCell align="center"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{r.retention_count ?? '—'} 份</Typography></TableCell>
                  <TableCell>
                    <Switch
                      size="small"
                      checked={r.enabled}
                      onChange={(_, checked) => onUpdate({ id: r.id, enabled: checked })}
                    />
                  </TableCell>
                  <TableCell>{fmtTime(r.last_run_at)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="编辑"><IconButton size="small" onClick={() => handleEdit(r)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => { if (confirm(`确认删除规则「${r.name}」？`)) onDelete(r.id); }}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* 新增/编辑弹窗 */}
      <RuleDialog open={dialogOpen} rule={editingRule} saving={saving} onClose={handleClose} onSubmit={handleSubmit} />
    </Card>
  );
}

// ============ 规则弹窗 ============
function RuleDialog({ open, rule, saving, onClose, onSubmit }: {
  open: boolean;
  rule: BackupRule | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; execution_time: string; config_directory: string; retention_days: number; retention_count: number }) => void;
}) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [dir, setDir] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');
  const [retentionCount, setRetentionCount] = useState('10');

  const isEdit = !!rule;

  // 每次 open/rule 变化重置
  const resetKey = `${open}-${rule?.id ?? ''}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    if (rule) {
      setName(rule.name);
      setTime(rule.execution_time);
      setDir(rule.config_directory);
      setRetentionDays(String(rule.retention_days ?? 30));
      setRetentionCount(String(rule.retention_count ?? 10));
    } else {
      setName(''); setTime(''); setDir(''); setRetentionDays('30'); setRetentionCount('10');
    }
  }

  const daysNum = Number(retentionDays);
  const countNum = Number(retentionCount);
  const valid = name.trim() && time.trim() && dir.trim() && daysNum > 0 && countNum > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 2, fontSize: 18, fontWeight: 700 }}>{isEdit ? '编辑备份规则' : '新增备份规则'}</DialogTitle>
      <DialogContent sx={{ px: 3, pt: '20px !important', pb: 2.5 }}>
        <Stack spacing={3.5} sx={{ mt: 0.5 }}>
          <TextField label="规则名称" value={name} onChange={(e) => setName(e.target.value)} fullWidth placeholder="如：主配置每日备份" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="执行时间" value={time} onChange={(e) => setTime(e.target.value)} fullWidth placeholder="HH:mm 格式，如 04:00" helperText="系统每天在该时间点自动执行备份" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="配置目录" value={dir} onChange={(e) => setDir(e.target.value)} fullWidth placeholder="/etc/openclaw/configs/" helperText="需要备份的配置文件所在目录的绝对路径" slotProps={{ inputLabel: { shrink: true } }} />
          <Box sx={{ display: 'flex', gap: 2.5 }}>
            <TextField
              label="保留天数"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value.replace(/[^0-9]/g, ''))}
              fullWidth
              type="number"
              placeholder="30"
              helperText="超过天数的备份将自动清理"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1 } }}
            />
            <TextField
              label="保留数量"
              value={retentionCount}
              onChange={(e) => setRetentionCount(e.target.value.replace(/[^0-9]/g, ''))}
              fullWidth
              type="number"
              placeholder="10"
              helperText="最多保留的备份份数"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1 } }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={saving || !valid} onClick={() => onSubmit({
          name: name.trim(),
          execution_time: time.trim(),
          config_directory: dir.trim(),
          retention_days: daysNum,
          retention_count: countNum,
        })}>
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============ Tab 1: 备份文件列表 ============
function BackupFilesTab({ files, loading }: { files: BackupFile[]; loading: boolean }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const pageItems = files.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Card>
      {loading ? <LoadingState /> : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>文件名</TableCell>
                <TableCell sx={{ width: 120 }}>大小</TableCell>
                <TableCell sx={{ width: 300 }}>存储路径</TableCell>
                <TableCell sx={{ width: 200 }}>创建时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                    暂无备份文件
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InsertDriveFile sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.filename}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{f.size_mb} MB</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{f.storage_path}</Typography>
                    </TableCell>
                    <TableCell>{fmtTime(f.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={files.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </>
      )}
    </Card>
  );
}

// ============ Tab 2: 备份记录 ============
function BackupRecordsTab({ records, loading, rerunning, onRerun }: {
  records: BackupRecord[];
  loading: boolean;
  rerunning: boolean;
  onRerun: (id: string) => void;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const pageItems = records.slice(page * pageSize, page * pageSize + pageSize);

  const statusIcon = (s: RecordStatus) => {
    if (s === 'success') return <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />;
    if (s === 'failed') return <ErrorIcon sx={{ fontSize: 14, color: '#f44336' }} />;
    return <HourglassEmpty sx={{ fontSize: 14, color: '#ff9800' }} />;
  };
  const statusLabel = (s: RecordStatus) => s === 'success' ? '已完成' : s === 'failed' ? '失败' : '运行中';

  return (
    <Card>
      {loading ? <LoadingState /> : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>任务</TableCell>
                <TableCell sx={{ width: 130 }}>状态</TableCell>
                <TableCell sx={{ width: 200 }}>开始时间</TableCell>
                <TableCell sx={{ width: 200 }}>结束时间</TableCell>
                <TableCell sx={{ width: 60 }} align="center" />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                    暂无备份记录
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.task_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={statusIcon(r.status)}
                        label={statusLabel(r.status)}
                        size="small"
                        variant="outlined"
                        color={r.status === 'success' ? 'success' : r.status === 'failed' ? 'error' : 'warning'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>{fmtTime(r.started_at)}</TableCell>
                    <TableCell>{fmtTime(r.finished_at)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="重新执行">
                        <IconButton
                          size="small"
                          disabled={rerunning}
                          onClick={() => onRerun(r.id)}
                        >
                          <Refresh fontSize="small" />
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
            count={records.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </>
      )}
    </Card>
  );
}
