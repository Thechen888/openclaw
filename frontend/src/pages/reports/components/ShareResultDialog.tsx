import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  Alert, Autocomplete, TextField, RadioGroup, Radio, FormControlLabel, FormControl,
  FormLabel, Chip, IconButton, Tooltip, Select, MenuItem,
} from '@mui/material';
import { Close, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { reportShareApi } from '../../../api/client';
import api from '../../../api/client';

interface Props {
  reportId: string;
  reportTitle: string;
  onClose: () => void;
}

function getCurrentUserId(): string {
  return localStorage.getItem('mock-current-user-id') || 'u-1';
}

export default function ShareResultDialog({ reportId, reportTitle, onClose }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<any[]>([]);
  const [scopeType, setScopeType] = useState<'all' | 'once' | 'since'>('all');
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [sinceDate, setSinceDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // 加载用户/组织/角色列表
  const { data: usersData } = useQuery({ queryKey: ['all-users-share'], queryFn: () => api.get('/users', { params: { page_size: 200 } }) });
  const { data: orgsData } = useQuery({ queryKey: ['all-orgs-share'], queryFn: () => api.get('/organizations', { params: { page_size: 200 } }) });
  const { data: rolesData } = useQuery({ queryKey: ['all-roles-share'], queryFn: () => api.get('/roles', { params: { page_size: 200 } }) });
  const { data: runsData } = useQuery({ queryKey: ['report-runs', reportId], queryFn: () => reportShareApi.runs(reportId) });
  const { data: sharesData } = useQuery({ queryKey: ['report-shares', reportId], queryFn: () => reportShareApi.list(reportId) });

  const allUsers: any[] = (usersData?.data?.data || []).filter((u: any) => u.id !== getCurrentUserId() && u.status !== 'disabled');
  const allOrgs: any[] = orgsData?.data?.data || [];
  const allRoles: any[] = rolesData?.data?.data || [];
  const runs: any[] = runsData?.data?.data || [];
  const shares: any[] = sharesData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => reportShareApi.create(reportId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-shares', reportId] });
      enqueueSnackbar('已分享，对方可在报告浏览中查看', { variant: 'success' });
      setSelectedUsers([]); setSelectedDepts([]); setSelectedRoles([]);
      setNote(''); setScopeType('all'); setSelectedRunId(''); setSinceDate('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || '分享失败';
      enqueueSnackbar(msg, { variant: 'error' });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => reportShareApi.remove(reportId, shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-shares', reportId] });
      enqueueSnackbar('已撤销分享', { variant: 'success' });
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
      targets,
      scope_type: scopeType,
      run_id: scopeType === 'once' ? selectedRunId : null,
      since_date: scopeType === 'since' ? sinceDate : null,
      note,
    });
  };

  const hasTargets = selectedUsers.length + selectedDepts.length + selectedRoles.length > 0;
  const scopeLabel = (s: string) => s === 'all' ? '全部结果' : s === 'once' ? '只分享某一次' : '此时间之后的结果';

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        分享结果 — {reportTitle}
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          对方只能查看结果，看不到报告定义与关联工作流。按你的数据权限生成，可随时撤销。
        </Alert>

        {/* 分享给人员 */}
        <Autocomplete
          multiple options={allUsers} value={selectedUsers} onChange={(_, v) => setSelectedUsers(v)}
          getOptionLabel={(o: any) => o.name || o.username}
          renderInput={p => <TextField {...p} size="small" label="分享给人员" placeholder="选择用户" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />

        {/* 分享给部门 */}
        <Autocomplete
          multiple options={allOrgs} value={selectedDepts} onChange={(_, v) => setSelectedDepts(v)}
          getOptionLabel={(o: any) => o.name}
          renderInput={p => <TextField {...p} size="small" label="分享给部门（含下级）" placeholder="选择部门" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />

        {/* 分享给角色 */}
        <Autocomplete
          multiple options={allRoles} value={selectedRoles} onChange={(_, v) => setSelectedRoles(v)}
          getOptionLabel={(o: any) => o.name}
          renderInput={p => <TextField {...p} size="small" label="分享给角色" placeholder="选择角色" sx={{ mb: 2 }} />}
          isOptionEqualToValue={(o, v) => o.id === v.id}
        />

        {/* 分享范围 */}
        <FormControl sx={{ mb: 2 }}>
          <FormLabel sx={{ fontSize: 13 }}>分享范围</FormLabel>
          <RadioGroup value={scopeType} onChange={e => setScopeType(e.target.value as any)}>
            <FormControlLabel value="all" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>全部结果（包括以后每次新生成的结果）</Typography>} />
            <FormControlLabel value="once" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>只分享某一次</Typography>} />
            <FormControlLabel value="since" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>只开放此时间之后的结果</Typography>} />
          </RadioGroup>
        </FormControl>

        {scopeType === 'once' && (
          <Select size="small" value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} displayEmpty sx={{ mb: 2, fontSize: 13 }} fullWidth>
            <MenuItem value="" disabled>选择期次</MenuItem>
            {runs.map(r => <MenuItem key={r.id} value={r.id}>{r.period_label}（{new Date(r.finished_at).toLocaleDateString()}）</MenuItem>)}
          </Select>
        )}

        {scopeType === 'since' && (
          <TextField type="date" size="small" value={sinceDate} onChange={e => setSinceDate(e.target.value)} label="起始日期" sx={{ mb: 2, width: 220 }}
            slotProps={{ inputLabel: { shrink: true } }} />
        )}

        {/* 备注 */}
        <TextField size="small" label="备注" value={note} onChange={e => setNote(e.target.value.slice(0, 512))} multiline rows={2} fullWidth sx={{ mb: 2 }}
          helperText={`${note.length}/512`} />

        {/* 已分享给 */}
        {shares.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>已分享给</Typography>
            {shares.map(s => (
              <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ fontSize: 13, flex: 1 }}>{s.target_name}</Typography>
                <Chip label={s.target_type === 'user' ? '人员' : s.target_type === 'dept' ? '部门' : '角色'} size="small" sx={{ fontSize: 10, height: 20 }} />
                <Chip label={scopeLabel(s.scope_type)} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{new Date(s.created_at).toLocaleDateString()}</Typography>
                {s.note && <Typography sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.note}</Typography>}
                <Tooltip title="撤销">
                  <IconButton size="small" color="error" onClick={() => revokeMutation.mutate(s.id)}><Delete fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!hasTargets || createMutation.isPending}>
          {createMutation.isPending ? '分享中...' : '确认分享'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
