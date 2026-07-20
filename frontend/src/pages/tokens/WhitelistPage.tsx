import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Chip, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Autocomplete, Grid, MenuItem, Switch,
} from '@mui/material';
import {
  Add, Edit, Delete, Close, Refresh, PersonAdd,
} from '@mui/icons-material';
import { PageHeader, DataTable } from '../../components/shared';

// ===================== Mock Data =====================
const MOCK_WHITELIST = [
  { id: '1', name: '张三', emp_id: 'EMP001', dept: '研发部', token_accounts: ['平台公共账户-DeepSeek', '平台公共账户-Qwen'], monthly_limit: 500000, authorized_by: 'admin', authorized_at: '2026-06-15', status: 'active', reason: '负责核心 Agent 开发' },
  { id: '2', name: '李四', emp_id: 'EMP002', dept: '研发部', token_accounts: ['平台公共账户-DeepSeek'], monthly_limit: 300000, authorized_by: 'admin', authorized_at: '2026-06-20', status: 'active', reason: '参与 Agent 联调测试' },
  { id: '3', name: '王五', emp_id: 'EMP003', dept: '产品部', token_accounts: ['平台公共账户-GPT4o'], monthly_limit: 200000, authorized_by: 'admin', authorized_at: '2026-07-01', status: 'active', reason: '产品原型验证' },
  { id: '4', name: '赵六', emp_id: 'EMP004', dept: '市场部', token_accounts: ['平台公共账户-DeepSeek', '平台公共账户-GPT4o'], monthly_limit: 400000, authorized_by: 'admin', authorized_at: '2026-05-10', status: 'disabled', reason: '临时项目需要' },
  { id: '5', name: '孙七', emp_id: 'EMP005', dept: '运营部', token_accounts: ['平台公共账户-Qwen'], monthly_limit: 150000, authorized_by: 'admin', authorized_at: '2026-07-05', status: 'active', reason: '运营数据分析 Agent' },
];

const MOCK_USERS = [
  { label: '张三 (EMP001) - 研发部', value: 'zhangsan' },
  { label: '李四 (EMP002) - 研发部', value: 'lisi' },
  { label: '王五 (EMP003) - 产品部', value: 'wangwu' },
  { label: '赵六 (EMP004) - 市场部', value: 'zhaoliu' },
  { label: '孙七 (EMP005) - 运营部', value: 'sunqi' },
  { label: '周八 (EMP006) - 研发部', value: 'zhouba' },
  { label: '吴九 (EMP007) - 产品部', value: 'wujiu' },
  { label: '郑十 (EMP008) - 市场部', value: 'zhengshi' },
];

const TOKEN_ACCOUNTS = ['平台公共账户-DeepSeek', '平台公共账户-Qwen', '平台公共账户-GPT4o', '测试账户-Claude'];

function fmtNum(n: number) { return n.toLocaleString(); }

export default function WhitelistPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    user: null as any, token_accounts: [] as string[], monthly_limit: '', reason: '',
  });

  const handleOpenAdd = () => {
    setEditItem(null);
    setForm({ user: null, token_accounts: [], monthly_limit: '', reason: '' });
    setAddOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setForm({ user: { label: `${item.name} (${item.emp_id}) - ${item.dept}`, value: item.id }, token_accounts: [...item.token_accounts], monthly_limit: String(item.monthly_limit), reason: item.reason });
    setAddOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="管理员 Token 白名单"
        subtitle="管理哪些用户可以使用管理员 Token 创建 Agent"
        actions={<Tooltip title="刷新"><IconButton><Refresh /></IconButton></Tooltip>}
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        以下人员创建 Agent 时可选择「管理员 Token」计费方式。白名单可细化到指定管理员账户。
      </Alert>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={handleOpenAdd}>添加人员</Button>
      </Box>

      <DataTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>姓名 / 工号</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
            <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>可用 Token 账户</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">单月消耗上限</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>授权人</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>授权时间</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
            <TableCell sx={{ fontWeight: 700, width: 120 }}>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {MOCK_WHITELIST.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary">{item.emp_id}</Typography>
              </TableCell>
              <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.dept}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {item.token_accounts.map((acc: string) => (
                    <Chip key={acc} size="small" label={acc} variant="outlined" sx={{ fontSize: 10, height: 22 }} />
                  ))}
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.monthly_limit)}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{item.authorized_by}</TableCell>
              <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{item.authorized_at}</TableCell>
              <TableCell>
                <Chip size="small" label={item.status === 'active' ? '启用' : '停用'} color={item.status === 'active' ? 'success' : 'default'} />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="编辑"><IconButton size="small" onClick={() => handleOpenEdit(item)}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="移除"><IconButton size="small" color="error"><Delete fontSize="small" /></IconButton></Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTable>

      {/* =================== 添加/编辑人员弹窗 =================== */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{editItem ? '编辑白名单人员' : '添加白名单人员'}</Typography>
          <IconButton size="small" onClick={() => setAddOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Autocomplete
              options={MOCK_USERS}
              value={form.user}
              onChange={(_, v) => setForm({ ...form, user: v })}
              renderInput={(params) => <TextField {...params} label="人员选择" placeholder="搜索姓名/工号..." required />}
              disabled={!!editItem}
            />
            <Autocomplete
              multiple
              options={TOKEN_ACCOUNTS}
              value={form.token_accounts}
              onChange={(_, v) => setForm({ ...form, token_accounts: v })}
              renderInput={(params) => <TextField {...params} label="可用 Token 账户" required placeholder="选择账户..." />}
            />
            <TextField fullWidth label="单月消耗上限 (Tokens)" type="number" required value={form.monthly_limit} onChange={e => setForm({ ...form, monthly_limit: e.target.value })} helperText="该人员使用管理员 Token 的月度消耗上限" />
            <TextField fullWidth label="授权原因" multiline rows={2} required value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="用于审计记录" />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => setAddOpen(false)}>{editItem ? '保存' : '添加'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
