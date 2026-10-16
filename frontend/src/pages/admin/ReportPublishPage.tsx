import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Autocomplete, TextField, RadioGroup, Radio, FormControlLabel, FormControl, FormLabel, Select, MenuItem,
  TableContainer,
} from '@mui/material';
import { Delete, Publish } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { adminPublishApi } from '../../api/client';
import api from '../../api/client';
import { PageHeader } from '../../components/shared';

function getCurrentUserId(): string {
  return localStorage.getItem('mock-current-user-id') || 'u-1';
}

export default function ReportPublishPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [publishDialog, setPublishDialog] = useState<any>(null);

  // 检查是否管理员
  const { data: meData } = useQuery({ queryKey: ['me-publish'], queryFn: () => api.get('/auth/me') });
  const me = meData?.data?.data;
  const isAdmin = me?.role === 'admin';

  const { data: publishData, isLoading } = useQuery({
    queryKey: ['admin-publishes'],
    queryFn: () => adminPublishApi.list(),
    enabled: isAdmin,
  });

  // 全平台报告 runs 列表
  const { data: allReportsData } = useQuery({
    queryKey: ['all-reports-for-publish'],
    queryFn: () => api.get('/reports/all-runs-summary', { params: { page_size: 100 } }).catch(() => ({ data: { data: [] } })),
    enabled: isAdmin,
  });

  const publishes: any[] = publishData?.data?.data || [];
  const allReports: any[] = allReportsData?.data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminPublishApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-publishes'] });
      enqueueSnackbar('已撤销发布', { variant: 'success' });
    },
  });

  if (!isAdmin) {
    return (
      <Box sx={{ px: 3, py: 3 }}>
        <PageHeader title="报告数据发布" subtitle="" />
        <Card><CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">无权限访问</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>仅超级管理员可访问此页面</Typography>
        </CardContent></Card>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader title="报告数据发布" subtitle="管理员代运行者发布报告结果给指定目标" />

      <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
        发布即生效，无审核环节。目标用户会收到通知。
      </Alert>

      {/* 上半区：可发布的结果 */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>可发布的结果</Typography>
      {allReports.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>暂无可发布的报告运行</Typography>
      ) : (
        <Card sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>报告名</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>运行者</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>最近完成时间</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>期次</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allReports.map(rpt => (
                <TableRow key={rpt.id} hover>
                  <TableCell sx={{ fontSize: 13 }}>{rpt.title}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{rpt.owner_name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{rpt.latest_run ? new Date(rpt.latest_run.finished_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{rpt.latest_run?.period_label || '—'}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" startIcon={<Publish fontSize="small" />}
                      onClick={() => setPublishDialog(rpt)}
                      sx={{ fontSize: 12, textTransform: 'none', minWidth: 60 }}>
                      发布
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 下半区：已发布 */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>已发布</Typography>
      {publishes.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>暂无发布记录</Typography>
      ) : (
        <Card sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>报告名</TableCell>
                <TableCell>目标</TableCell>
                <TableCell>范围</TableCell>
                <TableCell>发布人</TableCell>
                <TableCell>时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {publishes.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontSize: 13 }}>{p.report_title}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.target_name}</TableCell>
                  <TableCell><Chip label={p.scope_type === 'all' ? '全部结果' : p.scope_type === 'once' ? '指定某一次' : '时间后'} size="small" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{p.granted_by_name}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Tooltip title="撤销">
                      <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(p.id)}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 发布弹窗 */}
      {publishDialog && (
        <PublishDialog report={publishDialog} onClose={() => setPublishDialog(null)} />
      )}
    </Box>
  );
}

/* ========== 发布弹窗 ========== */
function PublishDialog({ report, onClose }: { report: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<any[]>([]);
  const [scopeType, setScopeType] = useState<'all' | 'once' | 'since'>('all');
  const [note, setNote] = useState('');

  const { data: usersData } = useQuery({ queryKey: ['all-users-publish'], queryFn: () => api.get('/users', { params: { page_size: 200 } }) });
  const { data: orgsData } = useQuery({ queryKey: ['all-orgs-publish'], queryFn: () => api.get('/organizations', { params: { page_size: 200 } }) });
  const { data: rolesData } = useQuery({ queryKey: ['all-roles-publish'], queryFn: () => api.get('/roles', { params: { page_size: 200 } }) });

  const allUsers: any[] = (usersData?.data?.data || []).filter((u: any) => u.status !== 'disabled');
  const allOrgs: any[] = orgsData?.data?.data || [];
  const allRoles: any[] = rolesData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => adminPublishApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-publishes'] });
      enqueueSnackbar('已发布，目标用户将收到通知', { variant: 'success' });
      onClose();
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.message || '发布失败', { variant: 'error' });
    },
  });

  const handleSubmit = () => {
    const targets: any[] = [
      ...selectedUsers.map(u => ({ target_type: 'user', target_id: u.id })),
      ...selectedDepts.map(d => ({ target_type: 'dept', target_id: d.id })),
      ...selectedRoles.map(r => ({ target_type: 'role', target_id: r.id })),
    ];
    if (targets.length === 0) return;
    createMutation.mutate({
      report_id: report.id,
      targets,
      scope_type: scopeType,
      note,
    });
  };

  const hasTargets = selectedUsers.length + selectedDepts.length + selectedRoles.length > 0;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>发布报告结果 — {report.title}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          以管理员身份发布，结果按运行者数据权限生成。发布即生效。
        </Alert>

        <Autocomplete
          multiple options={allUsers} value={selectedUsers} onChange={(_, v) => setSelectedUsers(v)}
          getOptionLabel={(o: any) => o.name || o.username}
          renderInput={p => <TextField {...p} size="small" label="发布给人员" placeholder="选择用户" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />
        <Autocomplete
          multiple options={allOrgs} value={selectedDepts} onChange={(_, v) => setSelectedDepts(v)}
          getOptionLabel={(o: any) => o.name}
          renderInput={p => <TextField {...p} size="small" label="发布给部门（含下级）" placeholder="选择部门" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />
        <Autocomplete
          multiple options={allRoles} value={selectedRoles} onChange={(_, v) => setSelectedRoles(v)}
          getOptionLabel={(o: any) => o.name}
          renderInput={p => <TextField {...p} size="small" label="发布给角色" placeholder="选择角色" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />

        <FormControl sx={{ mb: 2 }}>
          <FormLabel sx={{ fontSize: 13 }}>分享范围</FormLabel>
          <RadioGroup value={scopeType} onChange={e => setScopeType(e.target.value as any)}>
            <FormControlLabel value="all" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>全部结果（包括以后每次新生成的结果）</Typography>} />
            <FormControlLabel value="once" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>只分享某一次</Typography>} />
            <FormControlLabel value="since" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>只开放此时间之后的结果</Typography>} />
          </RadioGroup>
        </FormControl>

        <TextField size="small" label="备注" value={note} onChange={e => setNote(e.target.value.slice(0, 512))} multiline rows={2} fullWidth
          helperText={`${note.length}/512`} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!hasTargets || createMutation.isPending}>
          {createMutation.isPending ? '发布中...' : '确认发布'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
