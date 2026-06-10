import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Chip, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Alert, Paper, Divider,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Code, Extension, ArrowBack } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState,
} from '../../components/shared';
import api from '../../api/client';

const AUTH_TYPES = [
  { value: 'bearer_token', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic_auth', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth2' },
  { value: 'custom', label: '自定义(脚本)' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

interface ApiFunction {
  name: string;
  method: string;
  description: string;
  script: string;
}

interface StarlarkAdapter {
  id: string;
  name: string;
  description: string;
  version: string;
  last_sync: string;
  status: string;
  author: string;
  api_functions: ApiFunction[];
  auth_config: { type: string; secret: string };
  full_script: string;
}

function buildFullScript(name: string, apiFunctions: ApiFunction[]) {
  const funcs = apiFunctions.map(f => `def ${f.name}(ctx):\n  ${f.script.replace(/\n/g, '\n  ')}`).join('\n\n');
  return `# ${name}适配器\n${funcs}`;
}

export default function StarlarkAdaptersPage() {
  const qc = useQueryClient();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<StarlarkAdapter | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [form, setForm] = useState<StarlarkAdapter>({
    id: '', name: '', description: '', version: '1.0.0', last_sync: '-',
    status: 'active', author: '', api_functions: [],
    auth_config: { type: 'bearer_token', secret: '' },
    full_script: '',
  });

  const [newFunc, setNewFunc] = useState<ApiFunction>({
    name: '', method: 'GET', description: '', script: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['starlark-adapters', params],
    queryFn: () => api.get('/connectors/starlark', { params }),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/connectors/starlark', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['starlark-adapters'] }); setDialogOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => api.put(`/connectors/starlark/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['starlark-adapters'] }); setDialogOpen(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/connectors/starlark/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['starlark-adapters'] }),
  });
  const generateSkillMutation = useMutation({
    mutationFn: (id: string) => api.post(`/connectors/starlark/${id}/generate-skill`),
    onSuccess: () => alert('Skill 生成成功'),
  });

  const resetForm = () => {
    setForm({
      id: '', name: '', description: '', version: '1.0.0', last_sync: '-',
      status: 'active', author: '', api_functions: [],
      auth_config: { type: 'bearer_token', secret: '' },
      full_script: '',
    });
    setNewFunc({ name: '', method: 'GET', description: '', script: '' });
    setActiveTab(0);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditItem(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: StarlarkAdapter) => {
    setEditItem(item);
    setForm({ ...item });
    setActiveTab(0);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = { ...form, full_script: buildFullScript(form.name, form.api_functions) };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleAddFunction = () => {
    if (!newFunc.name) return;
    setForm(prev => ({
      ...prev,
      api_functions: [...prev.api_functions, { ...newFunc }],
    }));
    setNewFunc({ name: '', method: 'GET', description: '', script: '' });
  };

  const handleRemoveFunction = (idx: number) => {
    setForm(prev => ({
      ...prev,
      api_functions: prev.api_functions.filter((_, i) => i !== idx),
    }));
  };

  return (
    <Box>
      <PageHeader
        title="Starlark适配器"
        subtitle="用Starlark脚本定义三方系统对接逻辑"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
              新建适配器
            </Button>
          </>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} />

      {isLoading ? <LoadingState /> : (
        <DataTable pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: setPageSize }}>
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>API功能</TableCell>
              <TableCell>版本</TableCell>
              <TableCell>最近同步</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="暂无Starlark适配器" description="创建适配器以对接三方系统" />
                </TableCell>
              </TableRow>
            ) : items.map((item: StarlarkAdapter) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Code sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {item.api_functions?.map((fn: ApiFunction) => (
                      <Chip key={fn.name} label={fn.name} size="small" color="info" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    ))}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{item.version}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{item.last_sync}</TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  <Tooltip title="生成Skill">
                    <IconButton size="small" color="success" onClick={() => generateSkillMutation.mutate(item.id)}>
                      <Extension fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="编辑"><IconButton size="small" onClick={() => handleOpenEdit(item)}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => { if (confirm('确认删除？')) deleteMutation.mutate(item.id); }}><Delete fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><ArrowBack fontSize="small" /></IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{editItem ? '编辑适配器' : '新建适配器'}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="基本信息" />
            <Tab label="API功能编辑" icon={<Code sx={{ fontSize: 14 }} />} iconPosition="start" />
            <Tab label="登录/认证配置" />
            <Tab label="完整脚本" icon={<Code sx={{ fontSize: 14 }} />} iconPosition="start" />
          </Tabs>

          {/* Tab 1: 基本信息 */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid size={8}>
                <TextField fullWidth label="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid size={4}>
                <TextField fullWidth label="版本" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField fullWidth multiline rows={2} label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth label="作者" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="disabled">禁用</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          )}

          {/* Tab 2: API功能编辑 */}
          {activeTab === 1 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                每个API功能对应一个 Starlark 脚本片段。可以为适配器定义多个能力（如 read_contacts, write_orders），每个功能独立编辑。
              </Alert>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>添加新API功能</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={3}>
                    <TextField fullWidth size="small" label="功能名" value={newFunc.name} onChange={e => setNewFunc({ ...newFunc, name: e.target.value })} placeholder="read_contacts" />
                  </Grid>
                  <Grid size={2}>
                    <TextField fullWidth size="small" select label="Method" value={newFunc.method} onChange={e => setNewFunc({ ...newFunc, method: e.target.value })}>
                      {HTTP_METHODS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={4}>
                    <TextField fullWidth size="small" label="描述" value={newFunc.description} onChange={e => setNewFunc({ ...newFunc, description: e.target.value })} />
                  </Grid>
                  <Grid size={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                    <Button variant="outlined" size="small" fullWidth onClick={handleAddFunction} disabled={!newFunc.name}>添加功能</Button>
                  </Grid>
                  <Grid size={12}>
                    <TextField fullWidth size="small" multiline rows={3} label="Starlark脚本" value={newFunc.script} onChange={e => setNewFunc({ ...newFunc, script: e.target.value })} placeholder="return ctx.http.get(&quot;/path&quot;)" />
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>已有功能</Typography>
              {form.api_functions.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>暂无API功能</Typography>
              ) : (
                form.api_functions.map((fn, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip label={fn.name} size="small" color="info" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                      <Chip label={fn.method} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{fn.description}</Typography>
                      <IconButton size="small" color="error" onClick={() => handleRemoveFunction(idx)}><Delete fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                      {fn.script}
                    </Box>
                  </Paper>
                ))
              )}
            </Box>
          )}

          {/* Tab 3: 登录/认证配置 */}
          {activeTab === 2 && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                认证Token继承自主账号。用户登录后系统自动分配Platform Token，Starlark脚本通过此Token进行关联账号登录和数据获取，无需单独配置凭据。
              </Alert>
              <Alert severity="info" sx={{ mb: 2 }}>
                配置此适配器连接三方系统时的认证方式。Token会加密存储，在脚本中通过 config[&quot;token&quot;] 访问。
              </Alert>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField fullWidth select label="认证方式" value={form.auth_config.type} onChange={e => setForm({ ...form, auth_config: { ...form.auth_config, type: e.target.value } })}>
                    {AUTH_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label="Token / Secret" value={form.auth_config.secret} onChange={e => setForm({ ...form, auth_config: { ...form.auth_config, secret: e.target.value } })} type="password" />
                </Grid>
              </Grid>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                脚本中通过 config[&quot;token&quot;]、config[&quot;api_key&quot;] 等访问认证凭据。Token自动随请求注入或在脚本中手动使用。
              </Typography>
            </Box>
          )}

          {/* Tab 4: 完整脚本 */}
          {activeTab === 3 && (
            <Box>
              <TextField
                fullWidth multiline rows={16}
                label="完整 Starlark 脚本"
                value={form.full_script || buildFullScript(form.name, form.api_functions)}
                onChange={e => setForm({ ...form, full_script: e.target.value })}
                slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                直接编辑完整脚本。如果通过「API功能编辑」tab修改，此处会自动生成。
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
