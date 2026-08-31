import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Button, IconButton, Tooltip, Skeleton,
  Divider, List, ListItemButton, ListItemText, ListItemIcon, Drawer,
} from '@mui/material';
import {
  ArrowBack, Download, Extension, Person, CalendarToday,
  Description, Code, ContentCopy,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';
import { skillsApi } from '../../api/client';
import api from '../../api/client';
import ForkResourceDialog from '../../components/ForkResourceDialog';

// =================== 文件编辑器弹窗 ===================
function FileEditorDialog({
  open, skillId, filePath, onClose,
}: { open: boolean; skillId: string; filePath: string; onClose: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['skill-file', skillId, filePath],
    queryFn: () => api.get(`/skills/${skillId}/files/${filePath}`),
    enabled: open,
  });

  useEffect(() => {
    if (isLoading) return;
    if (data) {
      setContent(data.data?.content || '');
    } else {
      setContent('// 加载失败');
    }
    setLoading(false);
  }, [data, isLoading]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: '70vw', minWidth: 600 } }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{filePath}</Typography>
        <IconButton onClick={onClose}><ArrowBack /></IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading ? <Skeleton variant="text" width="100%" height={20} /> : (
          <Box sx={{ display: 'flex', gap: 0, fontFamily: 'monospace', fontSize: 12 }}>
            <Box sx={{ color: 'text.disabled', textAlign: 'right', pr: 2, userSelect: 'none', lineHeight: 1.6 }}>
              {content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </Box>
            <Box sx={{ flex: 1, lineHeight: 1.6, whiteSpace: 'pre', color: '#e0e0e0' }}>{content}</Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

// =================== 主页面 ===================
export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editFilePath, setEditFilePath] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['skill-detail', id],
    queryFn: () => skillsApi.get(id!),
    enabled: !!id,
  });
  const skill = data?.data?.data;

  const { data: filesData } = useQuery({
    queryKey: ['skill-files', id],
    queryFn: () => api.get(`/skills/${id}/files`),
    enabled: !!id && drawerOpen,
  });
  const files: string[] = filesData?.data?.data || [];

  const installMutation = useMutation({
    mutationFn: () => skillsApi.publish(id!, { action: 'install' }),
    onSuccess: () => {
      enqueueSnackbar('已安装到技能库', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['skills-installed'] });
    },
  });

  // 创建副本
  const [forkOpen, setForkOpen] = useState(false);
  const forkMutation = useMutation({
    mutationFn: (name: string) => skillsApi.fork(id!, { name }),
    onSuccess: () => {
      enqueueSnackbar('副本已创建到「我创建的」', { variant: 'success' });
      setForkOpen(false);
      navigate('/skills/my');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="100%" sx={{ mt: 2 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
      </Box>
    );
  }

  if (!skill) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">技能不存在</Typography>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>返回</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 顶部导航 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBack />
        </IconButton>
        <Typography variant="body2" color="text.secondary">技能详情</Typography>
      </Box>

      {/* 技能标题区 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Extension sx={{ fontSize: 32, color: '#00D4FF' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{skill.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {skill.owner_name} · {skill.owner_dept}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={() => installMutation.mutate()}
            disabled={installMutation.isPending}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            安装
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopy />}
            onClick={() => setForkOpen(true)}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            创建副本
          </Button>
        </Box>

        {/* 元信息 */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Chip
            label={`v${skill.version || '0.0.0'}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">{skill.owner_name}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {skill.updated_at ? new Date(skill.updated_at).toLocaleDateString() : '-'}
            </Typography>
          </Box>
          <Chip
            label={`${skill.install_count?.toLocaleString() ?? 0} 次安装`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* 描述 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>技能描述</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {skill.description || '暂无描述'}
        </Typography>
      </Box>

      {/* 更新日志 */}
      {skill.changelog && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>更新日志</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {skill.changelog}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* 文件列表 */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>技能文件</Typography>
          <Button
            size="small"
            startIcon={<Description />}
            onClick={() => setDrawerOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            查看全部文件
          </Button>
        </Box>
        {files.length > 0 ? (
          <List dense disablePadding>
            {files.slice(0, 5).map((f: string) => (
              <ListItemButton
                key={f}
                onClick={() => setEditFilePath(f)}
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Code fontSize="small" sx={{ color: '#00D4FF' }} />
                </ListItemIcon>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{f}</Typography>
              </ListItemButton>
            ))}
            {files.length > 5 && (
              <Typography variant="body2" color="text.secondary" sx={{ pl: 4.5, mt: 0.5 }}>
                还有 {files.length - 5} 个文件...
              </Typography>
            )}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">暂无文件</Typography>
        )}
      </Box>

      {/* 文件编辑器 */}
      {editFilePath && (
        <FileEditorDialog
          open={!!editFilePath}
          skillId={id!}
          filePath={editFilePath}
          onClose={() => setEditFilePath('')}
        />
      )}

      <ForkResourceDialog
        open={forkOpen}
        originalName={skill?.name || ''}
        originalOwner={skill?.owner_name}
        onConfirm={(name) => forkMutation.mutate(name)}
        onClose={() => setForkOpen(false)}
        isPending={forkMutation.isPending}
      />
    </Box>
  );
}
