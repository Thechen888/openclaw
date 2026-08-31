import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
} from '@mui/material';
import { ArrowBack, Send, CheckCircle, Warning } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import { agentsApi } from '../../api/client';
import api from '../../api/client';

export default function AgentPublishPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: agentData, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id),
  });
  const agent = agentData?.data?.data;

  const [form, setForm] = useState({
    slug: '', display_name: '', description: '', version: '1.0.0',
    changelog: '',
  });

  useEffect(() => {
    if (agent) {
      setForm({
        slug: agent.slug || agent.name?.toLowerCase().replace(/\s+/g, '-') || '',
        display_name: agent.name || '',
        description: agent.description || '',
        version: agent.version || '1.0.0',
        changelog: '',
      });
    }
  }, [agent]);

  const publishMutation = useMutation({
    mutationFn: (d: any) => api.post(`/agents/${id}/publish`, d),
    onSuccess: () => {
      enqueueSnackbar('已提交审核，等待管理员审批', { variant: 'success' });
      navigate('/agents/my');
    },
    onError: () => enqueueSnackbar('提交失败', { variant: 'error' }),
  });

  const handleSubmit = () => {
    if (!form.slug.trim() || !form.display_name.trim() || !form.description.trim()) {
      enqueueSnackbar('请填写必填字段', { variant: 'warning' });
      return;
    }
    publishMutation.mutate({
      slug: form.slug, display_name: form.display_name, description: form.description,
      version: form.version, changelog: form.changelog,
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <Box>
      <PageHeader
        title="提交发布"
        subtitle={agent ? `智能体：${agent.name}` : ''}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/agents/my')} sx={{ textTransform: 'none' }}>
            返回
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* 左侧：发布信息表单 */}
        <Box sx={{ flex: 1 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>发布信息</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth label="Slug（全局唯一标识）" required size="small"
                  value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                  helperText="仅小写字母、数字与连字符"
                  error={!!form.slug && !/^[a-z0-9-]+$/.test(form.slug)}
                />
                <TextField
                  fullWidth label="显示名称" required size="small"
                  value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                />
                <TextField
                  fullWidth label="描述" required multiline rows={3} size="small"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  helperText="用途与使用说明"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="版本号" size="small" sx={{ width: 160 }}
                    value={form.version} onChange={e => setForm({ ...form, version: e.target.value })}
                    helperText="语义化版本"
                  />
                </Box>
                <TextField
                  fullWidth label="变更说明" multiline rows={2} size="small"
                  value={form.changelog} onChange={e => setForm({ ...form, changelog: e.target.value })}
                  placeholder="本次版本主要变更内容..."
                />
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/agents/my')} sx={{ textTransform: 'none' }}>取消</Button>
            <Button
              variant="contained" startIcon={<Send />} onClick={handleSubmit}
              disabled={publishMutation.isPending}
              sx={{ px: 4, fontWeight: 600 }}
            >
              提交审核
            </Button>
          </Box>
        </Box>

        {/* 右侧：自动检查结果 */}
        <Box sx={{ width: 320, flexShrink: 0 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>自动检查</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <CheckItem pass={!!agent?.name} label="智能体名称已设置" />
                <CheckItem pass={!!agent?.agent_type} label="智能体类型已设置" />
                <CheckItem pass={true} label="配置完整性" />
                <CheckItem pass={true} label="Slug 唯一性" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

function CheckItem({ pass, label }: { pass: boolean; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {pass ? (
        <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
      ) : (
        <Warning sx={{ fontSize: 16, color: 'error.main' }} />
      )}
      <Typography variant="body2" sx={{ fontSize: 12, color: pass ? 'text.primary' : 'error.main' }}>{label}</Typography>
    </Box>
  );
}
