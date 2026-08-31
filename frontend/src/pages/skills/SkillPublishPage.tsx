import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Chip,
  Divider, IconButton,
} from '@mui/material';
import { ArrowBack, Send, CheckCircle, Warning } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingState } from '../../components/shared';
import { skillsApi } from '../../api/client';
import api from '../../api/client';

export default function SkillPublishPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isNewVersion = searchParams.get('new_version') === 'true';
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: skillData, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => skillsApi.get(id),
  });
  const skill = skillData?.data?.data;

  const { data: filesData } = useQuery({
    queryKey: ['skill-files', id],
    queryFn: () => api.get(`/skills/${id}/files`),
    enabled: !!id,
  });
  const files: any[] = filesData?.data?.data || [];

  const [form, setForm] = useState({
    slug: '', display_name: '', description: '', version: '1.0.0',
    changelog: '',
  });

  useEffect(() => {
    if (skill) {
      setForm({
        slug: skill.slug || skill.name || '',
        display_name: skill.name || '',
        description: skill.description || '',
        version: isNewVersion ? bumpVersion(skill.version || '1.0.0') : (skill.version || '1.0.0'),
        changelog: '',
      });
    }
  }, [skill, isNewVersion]);

  const publishMutation = useMutation({
    mutationFn: (d: any) => skillsApi.publish(id, d),
    onSuccess: () => {
      enqueueSnackbar('已提交审核，等待管理员审批', { variant: 'success' });
      navigate('/skills/my');
    },
    onError: () => enqueueSnackbar('提交失败', { variant: 'error' }),
  });

  const hasSkillMd = files.some(f => f.path === 'SKILL.md');
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
  const hasDangerKeywords = false; // mock: 简化
  const slugConflict = false; // mock: 简化
  const autoCheckPass = hasSkillMd && files.length <= 200 && totalSize <= 10 * 1024 * 1024 && !hasDangerKeywords && !slugConflict;

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
        title={isNewVersion ? '发布新版本' : '提交发布'}
        subtitle={skill ? `技能：${skill.name}` : ''}
        actions={
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/skills/my')} sx={{ textTransform: 'none' }}>
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
            <Button onClick={() => navigate('/skills/my')} sx={{ textTransform: 'none' }}>取消</Button>
            <Button
              variant="contained" startIcon={<Send />} onClick={handleSubmit}
              disabled={publishMutation.isPending || !autoCheckPass}
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
                <CheckItem pass={hasSkillMd} label="包含 SKILL.md" />
                <CheckItem pass={files.length <= 200} label={`文件数量 ${files.length}/200`} />
                <CheckItem pass={totalSize <= 10 * 1024 * 1024} label={`总大小 ${(totalSize / 1024).toFixed(1)}KB / 10MB`} />
                <CheckItem pass={!hasDangerKeywords} label="危险命令扫描" />
                <CheckItem pass={!slugConflict} label="Slug 唯一性" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>文件列表</Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {files.map(f => (
                  <Box key={f.path} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{f.path}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.size}B</Typography>
                  </Box>
                ))}
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

function bumpVersion(v: string): string {
  const parts = v.split('.').map(Number);
  if (parts.length === 3) {
    parts[1]++; parts[2] = 0;
    return parts.join('.');
  }
  return v;
}
