import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Chip, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Autocomplete, MenuItem,
} from '@mui/material';
import {
  Add, Edit, Delete, Close, Refresh, People, Warning,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable } from '../../components/shared';
import { tokenAccountsApi, usersApi } from '../../api/client';

function fmtNum(n: number) { return n.toLocaleString(); }

export default function WhitelistPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  // 从 URL query 预选账户
  const urlAccountId = searchParams.get('account_id') || '';

  // 获取 Token 账户列表
  const { data: accountsData } = useQuery({
    queryKey: ['token-accounts'],
    queryFn: () => tokenAccountsApi.list(),
  });
  const allAccounts: any[] = accountsData?.data?.data || [];
  const adminAccounts = allAccounts; // 全部管理员Token账户

  // 当前选中的账户
  const [selectedAccountId, setSelectedAccountId] = useState(urlAccountId || adminAccounts[0]?.id || '');
  const selectedAccount = adminAccounts.find(a => a.id === selectedAccountId);

  // 获取当前账户的成员列表
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['account-whitelist-members', selectedAccountId],
    queryFn: () => tokenAccountsApi.whitelist(selectedAccountId),
    enabled: !!selectedAccountId,
  });
  const members: any[] = membersData?.data?.data || [];

  // 获取全部用户（用于添加成员 Autocomplete）
  const { data: usersData } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
  });
  const allUsers: any[] = usersData?.data?.data || [];

  // 合计月限额
  const totalMemberLimit = useMemo(() =>
    members.reduce((sum, m) => sum + (Number(m.monthly_limit) || 0), 0),
    [members],
  );
  const accountTotalQuota = selectedAccount?.total_quota || 0;
  const isOverQuota = totalMemberLimit > accountTotalQuota;
  const isAccountDisabled = selectedAccount?.status !== 'active';

  // =================== 添加成员弹窗 ===================
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    selectedUsers: [] as any[],
    monthly_limit: '500000',
    reason: '',
  });
  const [addWarnings, setAddWarnings] = useState<{ name: string; count: number }[]>([]);

  const handleOpenAdd = () => {
    setAddForm({ selectedUsers: [], monthly_limit: '500000', reason: '' });
    setAddWarnings([]);
    setAddOpen(true);
  };

  const addMutation = useMutation({
    mutationFn: (data: any) => tokenAccountsApi.addMembers(data),
    onSuccess: (res) => {
      const result = res?.data?.data;
      if (result?.alreadyInOtherAccounts?.length) {
        setAddWarnings(result.alreadyInOtherAccounts);
      }
      qc.invalidateQueries({ queryKey: ['account-whitelist-members'] });
      enqueueSnackbar(`成功添加 ${result?.added?.length || 0} 名成员`, { variant: 'success' });
      setAddOpen(false);
    },
    onError: () => enqueueSnackbar('添加失败', { variant: 'error' }),
  });

  const handleConfirmAdd = () => {
    if (addForm.selectedUsers.length === 0) {
      enqueueSnackbar('请至少选择一名人员', { variant: 'warning' });
      return;
    }
    if (!addForm.reason.trim()) {
      enqueueSnackbar('请填写授权原因', { variant: 'warning' });
      return;
    }
    addMutation.mutate({
      account_id: selectedAccountId,
      user_ids: addForm.selectedUsers.map((u: any) => u.id),
      monthly_limit: Number(addForm.monthly_limit),
      reason: addForm.reason.trim(),
    });
  };

  // 已在本账户的成员 user_id 集合（用于置灰标注）
  const existingUserIds = useMemo(() => new Set(members.map(m => m.user_id)), [members]);

  // 按部门筛选
  const [deptFilter, setDeptFilter] = useState('');
  const departments = useMemo(() => {
    const depts = new Set(allUsers.map(u => {
      const org = (u as any)._org_name || '';
      return org;
    }).filter(Boolean));
    return Array.from(depts);
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    return allUsers
      .filter(u => !deptFilter || (u as any)._org_name === deptFilter)
      .map(u => ({
        ...u,
        label: `${u.name} (${u.username}) - ${(u as any)._org_name || '未知部门'}`,
        alreadyAdded: existingUserIds.has(u.id),
      }));
  }, [allUsers, deptFilter, existingUserIds]);

  // =================== 编辑限额弹窗 ===================
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ monthly_limit: '', status: 'active', reason: '' });

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      monthly_limit: String(item.monthly_limit),
      status: item.status,
      reason: item.reason || '',
    });
  };

  const editMutation = useMutation({
    mutationFn: (data: any) => tokenAccountsApi.updateMember(editItem.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-whitelist-members'] });
      enqueueSnackbar('修改成功', { variant: 'success' });
      setEditItem(null);
    },
    onError: () => enqueueSnackbar('修改失败', { variant: 'error' }),
  });

  const handleConfirmEdit = () => {
    editMutation.mutate({
      monthly_limit: Number(editForm.monthly_limit),
      status: editForm.status,
      reason: editForm.reason,
    });
  };

  // =================== 移除确认弹窗 ===================
  const [removeItem, setRemoveItem] = useState<any>(null);

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => tokenAccountsApi.removeMember(memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-whitelist-members'] });
      enqueueSnackbar('已移除成员', { variant: 'success' });
      setRemoveItem(null);
    },
    onError: () => enqueueSnackbar('移除失败', { variant: 'error' }),
  });

  const handleConfirmRemove = () => {
    if (removeItem) removeMutation.mutate(removeItem.id);
  };

  return (
    <Box>
      <PageHeader
        title="管理员 Token 白名单"
        subtitle="以公用账户为单位管理授权成员，控制谁可以使用管理员 Token 创建 Agent"
        actions={<Tooltip title="刷新"><IconButton onClick={() => qc.invalidateQueries({ queryKey: ['account-whitelist-members'] })}><Refresh /></IconButton></Tooltip>}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        成员月限额为该成员在此账户下的月度总上限（跨所有Agent）；Agent公共额度中的限额为该Agent内的上限，实际生效取较小值。
      </Alert>

      {/* 账户选择器 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>Token 账户：</Typography>
        <TextField
          select
          size="small"
          value={selectedAccountId}
          onChange={e => setSelectedAccountId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          {adminAccounts.map(a => (
            <MenuItem key={a.id} value={a.id}>
              <Box>
                <Typography variant="body2" sx={{ fontSize: 13 }}>{a.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {a.model_vendor} / {a.model_name} · 剩余 {fmtNum(Math.max(a.total_quota - a.used_quota, 0))} / {fmtNum(a.total_quota)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>
        {selectedAccount && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip size="small" label={selectedAccount.cycle_type === 'monthly' ? '按月重置' : '总额度'} variant="outlined" sx={{ fontSize: 11 }} />
            <Chip
              size="small"
              label={selectedAccount.status === 'active' ? '启用' : '停用'}
              color={selectedAccount.status === 'active' ? 'success' : 'default'}
            />
          </Box>
        )}
      </Box>

      {/* 账户停用提示 */}
      {isAccountDisabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          账户停用中，授权暂停生效
        </Alert>
      )}

      {/* 成员统计与告警 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          成员数({members.length})
        </Typography>
        <Typography variant="body2" color="text.secondary">
          合计月限额 {fmtNum(totalMemberLimit)} / 账户总额度 {fmtNum(accountTotalQuota)}
        </Typography>
        {isOverQuota && (
          <Alert severity="warning" sx={{ py: 0, px: 1.5, fontSize: 12 }} icon={<Warning fontSize="small" />}>
            成员限额合计已超账户总额度
          </Alert>
        )}
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            disabled={isAccountDisabled}
          >
            添加成员
          </Button>
        </Box>
      </Box>

      {/* 成员表 */}
      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>姓名 / 工号</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">单月上限</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>授权人</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>授权时间</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 120 }}>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">加载中...</Typography></TableCell></TableRow>
          ) : members.length === 0 ? (
            <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><Typography color="text.secondary">该账户暂无白名单成员</Typography></TableCell></TableRow>
          ) : (
            members.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.emp_id}</Typography>
                </TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.dept}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.monthly_limit)}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.authorized_by}</TableCell>
                <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{item.authorized_at}</TableCell>
                <TableCell>
                  <Chip size="small" label={item.status === 'active' ? '启用' : '冻结'} color={item.status === 'active' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="改限额">
                      <span>
                        <IconButton size="small" onClick={() => handleOpenEdit(item)} disabled={isAccountDisabled}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="移除">
                      <span>
                        <IconButton size="small" color="error" onClick={() => setRemoveItem(item)} disabled={isAccountDisabled}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      {/* =================== 添加成员弹窗 =================== */}
      <Dialog open={addOpen} onClose={() => !addMutation.isPending && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>添加白名单成员</Typography>
          <IconButton size="small" onClick={() => setAddOpen(false)} disabled={addMutation.isPending}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 0.5 }}>
            {/* 部门筛选 */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>按部门筛选</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
              >
                <MenuItem value="">全部部门</MenuItem>
                {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Box>

            {/* 人员多选 */}
            <Autocomplete
              multiple
              options={filteredUsers}
              value={addForm.selectedUsers}
              onChange={(_, v) => setAddForm({ ...addForm, selectedUsers: v })}
              getOptionLabel={(o) => o.label}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderOption={(props, option) => (
                <li {...props} style={{ opacity: option.alreadyAdded ? 0.4 : 1 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 13 }}>{option.label}</Typography>
                    {option.alreadyAdded && (
                      <Typography variant="caption" color="warning.main">已添加</Typography>
                    )}
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="选择人员" placeholder="搜索姓名/工号..." />
              )}
            />

            {/* 跨账户提示 */}
            {addWarnings.length > 0 && (
              <Alert severity="warning" sx={{ fontSize: 12 }}>
                {addWarnings.map(w => `${w.name}同时在${w.count}个账户白名单中`).join('；')}
              </Alert>
            )}

            <TextField
              fullWidth
              size="small"
              label="统一默认月限额 (Tokens)"
              type="number"
              value={addForm.monthly_limit}
              onChange={e => setAddForm({ ...addForm, monthly_limit: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              label="授权原因"
              multiline
              rows={2}
              required
              value={addForm.reason}
              onChange={e => setAddForm({ ...addForm, reason: e.target.value })}
              placeholder="用于审计记录"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddOpen(false)} disabled={addMutation.isPending}>取消</Button>
          <Button variant="contained" onClick={handleConfirmAdd} disabled={addMutation.isPending}>
            {addMutation.isPending ? '添加中...' : '确认添加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== 编辑限额弹窗 =================== */}
      <Dialog open={!!editItem} onClose={() => !editMutation.isPending && setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>编辑成员 — {editItem?.name}</Typography>
          <IconButton size="small" onClick={() => setEditItem(null)} disabled={editMutation.isPending}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 0.5 }}>
            <TextField
              fullWidth
              size="small"
              label="单月上限 (Tokens)"
              type="number"
              value={editForm.monthly_limit}
              onChange={e => setEditForm({ ...editForm, monthly_limit: e.target.value })}
            />
            <TextField
              fullWidth
              size="small"
              select
              label="状态"
              value={editForm.status}
              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
            >
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">冻结</MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="授权原因"
              multiline
              rows={2}
              value={editForm.reason}
              onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEditItem(null)} disabled={editMutation.isPending}>取消</Button>
          <Button variant="contained" onClick={handleConfirmEdit} disabled={editMutation.isPending}>
            {editMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================== 移除确认弹窗 =================== */}
      <Dialog open={!!removeItem} onClose={() => !removeMutation.isPending && setRemoveItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" /> 确认移除成员
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Typography variant="body2">
            确定将 <strong>{removeItem?.name}</strong>（{removeItem?.emp_id}）从该账户白名单中移除？
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
            移除后，该成员在所有 Agent 公共额度中对此账户的勾选将同步失效。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRemoveItem(null)} disabled={removeMutation.isPending}>取消</Button>
          <Button variant="contained" color="error" onClick={handleConfirmRemove} disabled={removeMutation.isPending}>
            {removeMutation.isPending ? '移除中...' : '确认移除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
