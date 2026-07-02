import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  TextField, Button, Tooltip, Grid, MenuItem, Typography, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Sync } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import {
  PageHeader, FilterBar, DataTable, StatusBadge, useTableState,
  EmptyState, LoadingState, CrudDialog,
} from '../../components/shared';
import { chatAdaptersApi } from '../../api/client';

// ---- 平台中文名映射 ----
const CHAT_TYPE_LABELS: Record<string, string> = {
  wechat_work: '企业微信',
  dingtalk: '钉钉',
  feishu: '飞书',
  slack: 'Slack',
  teams: 'Microsoft Teams',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};
const CHAT_TYPES = Object.keys(CHAT_TYPE_LABELS);

// ---- 各平台字段 schema ----
interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'url';
  required?: boolean;
  size?: number; // Grid size，默认 6
  tip?: string;
}

const PLATFORM_FIELDS: Record<string, FieldDef[]> = {
  wechat_work: [
    { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx', size: 12 },
    { key: 'corp_id', label: '企业ID（CorpID）', placeholder: 'wwxxxxxxxxxx', required: true },
    { key: 'agent_id', label: '应用ID（AgentID）', placeholder: '1000001', required: true },
    { key: 'app_secret', label: '应用密钥（Secret）', type: 'password', placeholder: '请输入 AgentSecret', required: true },
  ],
  dingtalk: [
    { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx', size: 12, required: true },
    { key: 'access_token', label: 'Access Token', placeholder: '自定义机器人 access_token', required: true },
    { key: 'sign_secret', label: '加签密钥（Sign Secret）', type: 'password', placeholder: 'SEC开头的加签密钥' },
  ],
  feishu: [
    { key: 'app_id', label: '应用 App ID', placeholder: 'cli_xxxxxxxxx', required: true },
    { key: 'app_secret', label: '应用 App Secret', type: 'password', placeholder: '飞书应用 App Secret', required: true },
    { key: 'webhook_url', label: 'Webhook URL（可选）', type: 'url', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx', size: 12 },
  ],
  slack: [
    { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-xxxxxxx', required: true, size: 12 },
    { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/services/xxx', size: 12 },
    { key: 'channel_id', label: '默认频道 ID', placeholder: 'C0XXXXXXXXX' },
    { key: 'sign_secret', label: 'Signing Secret', type: 'password', placeholder: 'Slack App 签名密钥' },
  ],
  teams: [
    { key: 'webhook_url', label: 'Incoming Webhook URL', type: 'url', placeholder: 'https://xxx.webhook.office.com/webhookb2/xxx', size: 12, required: true },
    { key: 'tenant_id', label: 'Tenant ID', placeholder: 'Azure AD 租户 ID' },
    { key: 'client_id', label: 'Client ID', placeholder: 'Azure 应用程序 ID' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Azure 应用机密' },
  ],
  telegram: [
    { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: '123456:ABCdefGHIjklMNOpqrSTUvwxyz', required: true, size: 12 },
    { key: 'chat_id', label: '默认 Chat ID', placeholder: '-100xxxxxxxxx 或 @channelname', size: 12 },
  ],
  whatsapp: [
    { key: 'phone_number_id', label: '电话号码 ID', placeholder: 'WhatsApp Phone Number ID', required: true },
    { key: 'business_account_id', label: '业务账号 ID', placeholder: 'WhatsApp Business Account ID', required: true },
    { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Meta 永久访问令牌', required: true, size: 12 },
    { key: 'webhook_url', label: 'Webhook URL（可选）', type: 'url', placeholder: 'https://your.domain/webhook/whatsapp', size: 12 },
  ],
};

// 根据平台类型构造空 form
const buildEmptyForm = (chatType: string) => {
  const base = { name: '', chat_type: chatType, status: 'active' };
  const fields = PLATFORM_FIELDS[chatType] || [];
  const extra = fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as Record<string, string>);
  return { ...base, ...extra };
};

// 从原始 item 提取干净的 form 字段（剔除 id/last_sync_at 等服务端字段）
const extractFormFields = (item: any) => {
  const { id: _id, last_sync_at: _lsa, created_at: _ca, updated_at: _ua, ...rest } = item;
  return rest;
};

export default function ChatAdaptersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { page, pageSize, search, setPage, setPageSize, setSearch, params } = useTableState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>(buildEmptyForm('wechat_work'));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['chat-adapters', params],
    queryFn: () => chatAdaptersApi.list(params),
  });
  const items = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const createMutation = useMutation({
    mutationFn: (d: any) => chatAdaptersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-adapters'] });
      setDialogOpen(false);
      enqueueSnackbar('适配器已创建', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('创建失败', { variant: 'error' }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => chatAdaptersApi.update(id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-adapters'] });
      setDialogOpen(false);
      enqueueSnackbar('已保存', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('保存失败', { variant: 'error' }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatAdaptersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-adapters'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });
  const syncMutation = useMutation({
    mutationFn: (id: string) => chatAdaptersApi.update(id, { last_sync_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-adapters'] });
      enqueueSnackbar('同步成功', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('同步失败', { variant: 'error' }),
  });

  // 切换平台类型时重建 form，保留 name 和 status
  const handleChatTypeChange = (newType: string) => {
    setForm((prev: any) => ({
      ...buildEmptyForm(newType),
      name: prev.name,
      status: prev.status,
    }));
  };

  const handleSave = () => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const formatTime = (t?: string) => t ? new Date(t).toLocaleString() : '从未';

  // 当前平台的动态字段列表
  const currentFields = PLATFORM_FIELDS[form.chat_type] || [];

  return (
    <Box>
      <PageHeader
        title="聊天适配器"
        subtitle="管理聊天平台连接（企业微信、钉钉、飞书等）"
        actions={
          <>
            <Tooltip title="刷新"><IconButton onClick={() => refetch()}><Refresh /></IconButton></Tooltip>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(buildEmptyForm('wechat_work')); setEditItem(null); setDialogOpen(true); }}>
              添加适配器
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
              <TableCell>聊天类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>上次同步</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState title="暂无聊天适配器" description="连接你的第一个聊天平台" />
                </TableCell>
              </TableRow>
            ) : items.map((item: any) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 600,
                      bgcolor: 'info.light', color: 'info.contrastText',
                    }}
                  >
                    {CHAT_TYPE_LABELS[item.chat_type] ?? item.chat_type}
                  </Box>
                </TableCell>
                <TableCell><StatusBadge status={item.status} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{formatTime(item.last_sync_at)}</TableCell>
                <TableCell>
                  <Tooltip title="立即同步">
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(item.id)}
                    >
                      <Sync fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
                    <IconButton size="small" color="error" onClick={() => { if (confirm('确认删除此适配器？')) deleteMutation.mutate(item.id); }}>
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
        title={editItem ? '编辑聊天适配器' : '添加聊天适配器'}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      >
        <Grid container spacing={2.5}>
          {/* 名称 */}
          <Grid size={12}>
            <TextField
              fullWidth
              label="名称"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="例：企业微信-客服机器人"
            />
          </Grid>

          {/* 聊天类型 */}
          <Grid size={6}>
            <TextField
              fullWidth select label="聊天类型"
              value={form.chat_type}
              onChange={e => handleChatTypeChange(e.target.value)}
            >
              {CHAT_TYPES.map(t => (
                <MenuItem key={t} value={t}>{CHAT_TYPE_LABELS[t]}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* 状态 */}
          <Grid size={6}>
            <TextField fullWidth select label="状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="disabled">禁用</MenuItem>
            </TextField>
          </Grid>

          {/* 动态字段分隔线 */}
          <Grid size={12}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 0.5, fontWeight: 600 }}>
              {CHAT_TYPE_LABELS[form.chat_type]} 认证配置
            </Typography>
          </Grid>

          {/* 动态字段渲染 */}
          {currentFields.map((field) => (
            <Grid key={field.key} size={field.size ?? 6}>
              <TextField
                fullWidth
                label={field.label + (field.required ? ' *' : '')}
                type={field.type === 'password' ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={form[field.key] ?? ''}
                onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                slotProps={field.type === 'url' ? { input: { sx: { fontFamily: 'monospace', fontSize: 13 } } } : undefined}
              />
            </Grid>
          ))}

          {/* 无字段兜底 */}
          {currentFields.length === 0 && (
            <Grid size={12}>
              <Alert severity="info">该平台暂无配置字段定义。</Alert>
            </Grid>
          )}
        </Grid>
      </CrudDialog>
    </Box>
  );
}
