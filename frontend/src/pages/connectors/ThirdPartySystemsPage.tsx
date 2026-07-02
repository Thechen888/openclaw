import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Alert, Link,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, OpenInNew } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { connectorsApi } from '../../api/client';

// 系统类型中文映射
const SYSTEM_TYPE_LABELS: Record<string, string> = {
  crm: 'CRM 客户关系',
  erp: 'ERP 企业资源',
  helpdesk: '工单客服',
  project_management: '项目管理',
  hr: 'HR 人力资源',
  finance: '财务系统',
  custom: '自定义',
};

// 系统类型 → 服务商联动列表
const TYPE_PROVIDERS: Record<string, { value: string; label: string }[]> = {
  crm:                [{ value: 'salesforce', label: 'Salesforce' }, { value: 'hubspot', label: 'HubSpot' }, { value: 'custom', label: '自定义' }],
  erp:                [{ value: 'sap', label: 'SAP' }, { value: 'yonyou', label: '用友 U8+' }, { value: 'kingdee', label: '金蝶云星' }, { value: 'custom', label: '自定义' }],
  helpdesk:           [{ value: 'zendesk', label: 'Zendesk' }, { value: 'freshdesk', label: 'Freshdesk' }, { value: 'custom', label: '自定义' }],
  project_management: [{ value: 'jira', label: 'Jira' }, { value: 'asana', label: 'Asana' }, { value: 'custom', label: '自定义' }],
  hr:                 [{ value: 'beisen', label: '北森 HR' }, { value: 'moka', label: 'Moka' }, { value: 'custom', label: '自定义' }],
  finance:            [{ value: 'sap', label: 'SAP FI' }, { value: 'custom', label: '自定义' }],
  custom:             [{ value: 'custom', label: '自定义' }],
};

const emptyForm = () => ({
  name: '', system_type: 'crm', provider: 'salesforce', api_base_url: '', status: 'active', description: '',
});

// 剔除服务端字段防止表单污染
const extractFormFields = (item: any) => {
  const { id: _id, created_at: _ca, updated_at: _ua, last_sync_at: _lsa, ...rest } = item;
  return rest;
};

export default function ThirdPartySystemsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['connectors', params],
    queryFn: () => connectorsApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => connectorsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connectors'] });
      setDialogOpen(false);
      enqueueSnackbar('系统已添加', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('添加失败', { variant: 'error' }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => connectorsApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connectors'] });
      setDialogOpen(false);
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectorsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connectors'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });

  // 切换系统类型时，自动重置服务商为该类型首选
  const handleTypeChange = (newType: string) => {
    const providers = TYPE_PROVIDERS[newType] || [];
    setForm((prev: any) => ({
      ...prev,
      system_type: newType,
      provider: providers[0]?.value ?? 'custom',
    }));
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const currentProviders = TYPE_PROVIDERS[form.system_type] || [];

  return (
    <Box>
      <PageHeader
        title="第三方系统"
        subtitle="管理外部系统集成与连接器"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm()); setEditItem(null); setDialogOpen(true); }}>
              添加系统
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
              <TableCell>系统类型</TableCell>
              <TableCell>服务商</TableCell>
              <TableCell>API地址</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState title="暂无连接器" description="添加第三方系统以开始使用" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Box component="span" sx={{
                    display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                    bgcolor: 'secondary.light', color: 'secondary.contrastText',
                  }}>
                    {SYSTEM_TYPE_LABELS[item.system_type] ?? item.system_type}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>
                  {(TYPE_PROVIDERS[item.system_type] ?? []).find((p: any) => p.value === item.provider)?.label ?? item.provider ?? '-'}
                </TableCell>
                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, fontFamily: 'monospace' }}>
                  {item.api_base_url || '-'}
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell>
                  {item.api_base_url && (
                    <Tooltip title="在浏览器打开">
                      <IconButton size="small" component="a" href={item.api_base_url} target="_blank" rel="noopener noreferrer">
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="编辑">
                    <IconButton size="small" onClick={() => {
                      setEditItem(item);
                      setForm(extractFormFields(item));
                      setDialogOpen(true);
                    }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除">
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此连接器？')) deleteMutation.mutate(item.id); }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      <CrudDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editItem ? '编辑第三方系统' : '添加第三方系统'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          <Grid size={12}>
            <TextField
              fullWidth label="名称" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="例：Salesforce CRM 生产环境"
            />
          </Grid>

          {/* 系统类型 */}
          <Grid size={6}>
            <TextField fullWidth select label="系统类型" value={form.system_type} onChange={e => handleTypeChange(e.target.value)}>
              {Object.entries(SYSTEM_TYPE_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>{l}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 服务商（联动） */}
          <Grid size={6}>
            <TextField fullWidth select label="服务商" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
              {currentProviders.map(p => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth label="API 地址" value={form.api_base_url}
              onChange={e => setForm({ ...form, api_base_url: e.target.value })}
              placeholder="https://api.example.com/v1"
              slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}
            />
          </Grid>

          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth multiline rows={2} label="描述"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="该系统的用途说明（可选）"
            />
          </Grid>

          {/* 认证引导提示 */}
          <Grid size={12}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              <strong>认证配置</strong>（API Key、Secret 等）请在{' '}
              <Link
                component="button"
                underline="always"
                sx={{ fontSize: 13, cursor: 'pointer', verticalAlign: 'baseline' }}
                onClick={() => { setDialogOpen(false); navigate('/connectors/starlark'); }}
              >
                Starlark 适配器
              </Link>
              {' '}的「登录/认证配置」中填写，职责更清晰，密钥也会加密存储。
            </Alert>
          </Grid>
        </Grid>
      </CrudDialog>
    </Box>
  );
}
