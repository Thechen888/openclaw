import { useState, useMemo } from 'react';
import {
  Box, Drawer, Typography, IconButton, Button, Chip, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Divider, TextField, MenuItem,
} from '@mui/material';
import { Close, PersonAdd, Upload, Search } from '@mui/icons-material';
import OrgTreePickerDialog from './OrgTreePickerDialog';

interface Member {
  id: string;
  user_id: string;
  name: string;
  dept: string;
  added_by: string;
  added_at: string;
  status: string;
}

interface AccountInfo {
  id: string;
  name: string;
  model_vendor?: string;
  model_name?: string;
  total_quota: number;
  used_quota: number;
}

interface MembersDrawerProps {
  open: boolean;
  account: AccountInfo | null;
  members: Member[];
  onClose: () => void;
  onAddMembers: (userIds: string[], remark: string) => void;
  onRemoveMember: (memberId: string) => void;
  orgTree: any[];
}

function fmtNum(n: number) { return n.toLocaleString(); }

function quotaColor(pct: number) {
  if (pct >= 95) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}

// 为每个成员生成模拟的月额度/月已用数据（展示用）
function memberMonthlyData(member: Member, accountTotal: number, memberCount: number) {
  const pool = accountTotal;
  const perMemberShare = memberCount > 0 ? Math.floor(pool / memberCount) : 0;
  // 用 user_id 做伪随机种子，保证同一个人每次显示一致
  const seed = member.user_id.charCodeAt(member.user_id.length - 1) || 5;
  const usedPct = ((seed * 17 + 13) % 80) + 5; // 5%~85%
  const monthlyQuota = perMemberShare > 0 ? perMemberShare : 500000;
  const monthlyUsed = Math.floor(monthlyQuota * usedPct / 100);
  return { monthlyQuota, monthlyUsed };
}

// 生成工号
function empId(userId: string, name: string) {
  const code = name.charCodeAt(0) || 65;
  return `EMP${String(code).slice(-3)}${userId.slice(-2)}`;
}

export default function MembersDrawer({
  open, account, members, onClose, onAddMembers, onRemoveMember, orgTree,
}: MembersDrawerProps) {
  if (!account) return null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const remaining = account.total_quota - account.used_quota;
  const pct = account.total_quota > 0 ? (account.used_quota / account.total_quota) * 100 : 0;
  const existingUserIds = members.map(m => m.user_id);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !searchText || m.name.includes(searchText) || m.dept.includes(searchText);
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [members, searchText, statusFilter]);

  const activeCount = members.filter(m => m.status === 'active').length;

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: 720, maxWidth: '100vw' } } }}>
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 头部 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>成员管理</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="outlined" size="small" startIcon={<Upload />}>批量导入</Button>
              <IconButton size="small" onClick={onClose}><Close /></IconButton>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            管理该管理员 Token 账户的成员列表。成员个人额度用完后，可继续消耗该账户池中的共享额度。
          </Typography>

          {/* 账户信息 + 成员概况 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
            {/* 左侧：账户信息 */}
            <Box sx={{ flex: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>账户信息</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">账户名称</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{account.name}</Typography>
                </Box>
                {account.model_vendor && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">关联模型</Typography>
                    <Chip size="small" label={`${account.model_vendor}${account.model_name ? ' / ' + account.model_name : ''}`} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  </Box>
                )}
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">总额度</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmtNum(account.total_quota)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">已消耗</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: `${quotaColor(pct)}.main` }}>{fmtNum(account.used_quota)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">剩余</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: remaining <= 0 ? 'error.main' : 'success.main' }}>{fmtNum(Math.max(remaining, 0))}</Typography>
                </Box>
              </Box>
            </Box>

            {/* 右侧：成员概况 */}
            <Box sx={{ flex: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>成员概况</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">成员总数</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeCount} 人</Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">账户水位</Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>{pct.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={Math.min(pct, 100)} color="primary" sx={{ height: 8, borderRadius: 2 }} />
                </Box>
                <Button
                  variant="contained" size="small" startIcon={<PersonAdd />}
                  onClick={() => setPickerOpen(true)} sx={{ mt: 0.5, alignSelf: 'flex-start' }}
                >
                  添加成员
                </Button>
              </Box>
            </Box>
          </Box>

          {/* 搜索 + 筛选 */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
            <TextField
              size="small" placeholder="搜索成员姓名、工号..." variant="outlined"
              value={searchText} onChange={e => setSearchText(e.target.value)}
              slotProps={{ input: { startAdornment: <Search sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} /> } }}
              sx={{ flex: 1 }}
            />
            <TextField select size="small" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 90 }}>
              <MenuItem value="active">有效</MenuItem>
              <MenuItem value="all">全部</MenuItem>
            </TextField>
          </Box>

          {/* 成员表格 */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {filteredMembers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">暂无成员，请点击上方"添加成员"按钮</Typography>
              </Box>
            ) : (
              <Table size="small" sx={{ '& th': { fontSize: 12 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>姓名/工号</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>部门</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }}>月额度</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 130 }}>月已用</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 60 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 50 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMembers.map(m => {
                    const { monthlyQuota, monthlyUsed } = memberMonthlyData(m, account.total_quota, activeCount);
                    const usedPct = monthlyQuota > 0 ? (monthlyUsed / monthlyQuota) * 100 : 0;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{m.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{empId(m.user_id, m.name)}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{m.dept}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 45 }}>{fmtNum(monthlyQuota)}</Typography>
                            <LinearProgress variant="determinate" value={100} color="primary" sx={{ flex: 1, height: 4, borderRadius: 1, opacity: 0.3 }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 45 }}>{fmtNum(monthlyUsed)}</Typography>
                            <LinearProgress variant="determinate" value={Math.min(usedPct, 100)} color={quotaColor(usedPct) as any} sx={{ flex: 1, height: 4, borderRadius: 1 }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={m.status === 'active' ? '有效' : '已停用'} color={m.status === 'active' ? 'success' : 'default'} sx={{ fontSize: 10 }} />
                        </TableCell>
                        <TableCell>
                          <Button size="small" color="error" onClick={() => setRemoveConfirm({ open: true, member: m })} sx={{ fontSize: 11, minWidth: 'auto', p: 0.5 }}>
                            移除
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>

          {/* 底部说明 */}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'block' }}>
            成员个人额度用完后，可消耗本池共享额度。
          </Typography>
        </Box>
      </Drawer>

      {/* 组织树选择弹窗 */}
      <OrgTreePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(userIds, remark) => { onAddMembers(userIds, remark); }}
        existingUserIds={existingUserIds}
        orgTree={orgTree}
      />

      {/* 移除确认弹窗 */}
      <Dialog open={removeConfirm.open} onClose={() => setRemoveConfirm({ open: false, member: null })} maxWidth="sm" fullWidth>
        <DialogTitle><Typography variant="h6" sx={{ fontWeight: 700 }}>确认移除</Typography></DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            确定要移除成员「{removeConfirm.member?.name}」吗？
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            移除后该成员个人额度用完时将无法使用此资源池。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRemoveConfirm({ open: false, member: null })}>取消</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (removeConfirm.member) onRemoveMember(removeConfirm.member.id);
            setRemoveConfirm({ open: false, member: null });
          }}>确认移除</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
