import { useState } from 'react';
import {
  Box, Card, Typography, Grid, TextField, MenuItem, Button, Chip, Stack,
} from '@mui/material';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import { agentsApi } from '../../api/client';
import { AGENT_TYPE_META, type AgentType } from './components/agentShared';

const COLOR_PRESETS = ['#00D4FF', '#7C3AED', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ef4444'];

export default function AgentCreatePage() {
  const navigate = useNavigate();
  const [type, setType] = useState<AgentType | ''>('');
  const [form, setForm] = useState({
    name: '', description: '', owner_type: 'personal', avatar_color: '#00D4FF',
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => agentsApi.create(d),
    onSuccess: (res: any) => {
      const created = res?.data?.data || res?.data;
      const id = created?.id;
      if (type === 'chat') navigate(`/agents/${id}/edit/chat`);
      else navigate(`/agents/${id}/edit/workflow`);
    },
  });

  const handleCreate = () => {
    if (!form.name.trim() || !type) return;
    createMutation.mutate({
      ...form,
      agent_type: type,
      system_prompt: type === 'chat' ? '你是一个乐于助人的助手。' : '',
      ...(type === 'chat'
        ? { chat_config: { welcome: '你好，有什么可以帮你？', temperature: 0.7, max_tokens: 2048, authorized_skills: [], knowledge_base_ids: [], variables: [], opening_questions: [] } }
        : {}),
    });
  };

  return (
    <Box>
      <PageHeader
        title="新建智能体"
        subtitle="先选择智能体类型，再填写基础信息"
        actions={<Button startIcon={<ArrowBack />} onClick={() => navigate('/agents')}>返回列表</Button>}
      />

      {/* Step 1: 选择类型 */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
        第一步 · 选择类型
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {(Object.keys(AGENT_TYPE_META) as AgentType[]).map((t) => {
          const meta = AGENT_TYPE_META[t];
          const selected = type === t;
          return (
            <Grid key={t} size={{ xs: 12, md: 6 }}>
              <Card
                onClick={() => setType(t)}
                sx={{
                  p: 3, cursor: 'pointer', position: 'relative', height: '100%',
                  border: '2px solid', borderColor: selected ? meta.color : 'divider',
                  transition: 'all 0.25s',
                  boxShadow: selected ? `0 8px 30px ${meta.color}33` : 'none',
                  '&:hover': { borderColor: meta.color, transform: 'translateY(-2px)' },
                }}
              >
                {selected && (
                  <Box sx={{
                    position: 'absolute', top: 14, right: 14, width: 26, height: 26, borderRadius: '50%',
                    background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check sx={{ fontSize: 16, color: '#fff' }} />
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{
                    width: 52, height: 52, borderRadius: 2, background: meta.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    boxShadow: `0 6px 18px ${meta.color}44`,
                  }}>
                    {meta.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{meta.label}</Typography>
                    <Chip size="small" label={meta.short} sx={{ height: 20, fontSize: 11, mt: 0.5, color: meta.color, bgcolor: `${meta.color}1f` }} />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  {meta.desc}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Step 2: 基础信息 */}
      {type && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
            第二步 · 基础信息
          </Typography>
          <Card sx={{ p: 3, maxWidth: 720 }}>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField
                  fullWidth label="名称" value={form.name} autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={type === 'chat' ? '例如：智能客服助手' : '例如：CRM 销售通知流程'}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth label="描述" value={form.description} multiline rows={2}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  fullWidth select label="归属类型" value={form.owner_type}
                  onChange={(e) => setForm({ ...form, owner_type: e.target.value })}
                  helperText="个人：仅自己可见；组织：可添加协作者"
                >
                  <MenuItem value="personal">个人</MenuItem>
                  <MenuItem value="organization">组织</MenuItem>
                </TextField>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>头像颜色</Typography>
                <Stack direction="row" spacing={1}>
                  {COLOR_PRESETS.map((c) => (
                    <Box
                      key={c}
                      onClick={() => setForm({ ...form, avatar_color: c })}
                      sx={{
                        width: 26, height: 26, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                        border: '2px solid', borderColor: form.avatar_color === c ? '#fff' : 'transparent',
                        boxShadow: form.avatar_color === c ? `0 0 0 2px ${c}` : 'none',
                      }}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => navigate('/agents')}>取消</Button>
              <Button
                variant="contained"
                endIcon={<ArrowForward />}
                disabled={!form.name.trim() || createMutation.isPending}
                onClick={handleCreate}
              >
                创建并配置
              </Button>
            </Box>
          </Card>
        </>
      )}
    </Box>
  );
}
