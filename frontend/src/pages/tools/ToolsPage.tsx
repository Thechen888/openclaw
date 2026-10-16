import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, IconButton, Menu, MenuItem,
  Grid, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions,
  alpha,
} from '@mui/material';
import {
  Add, MoreVert, OpenInNew, Share, Edit, Delete, UploadFile,
  AltRoute, ContentCopy, AutoFixHigh,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader, EmptyState } from '../../components/shared';
import { toolsApi } from '../../api/client';
import ToolRunnerDialog from './components/ToolRunnerDialog';
import UploadToolDialog from './components/UploadToolDialog';
import EditToolDialog from './components/EditToolDialog';
import ShareToolDialog from './components/ShareToolDialog';
import ForkDialog from './components/ForkDialog';
import AIModifyDialog from './components/AIModifyDialog';

const CATEGORY_COLORS: Record<string, string> = {
  '计算器': '#2e7d32',
  '绘图': '#1565c0',
  '转换': '#e65100',
  '文本处理': '#6a1b9a',
  '数据处理': '#00838f',
  '其他': '#546e7a',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString();
}

function getCurrentUserId(): string {
  return localStorage.getItem('mock-current-user-id') || 'u-1';
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  // tab=shared 旧链接兼容为 discover
  const rawTab = searchParams.get('tab') || 'discover';
  const initialTab = rawTab === 'mine' ? 'mine' : 'discover';
  const [tab, setTab] = useState(initialTab);
  const currentUserId = getCurrentUserId();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [editTool, setEditTool] = useState<any>(null);
  const [shareTool, setShareTool] = useState<any>(null);
  const [forkTool, setForkTool] = useState<any>(null);
  const [aiModifyTool, setAiModifyTool] = useState<any>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTool, setMenuTool] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tools', tab],
    queryFn: () => toolsApi.list({ tab }),
  });
  const items: any[] = data?.data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => toolsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar('已删除', { variant: 'success' });
    },
  });

  const handleTabChange = (_: any, v: string) => {
    setTab(v);
    setSearchParams({ tab: v }, { replace: true });
  };

  const handleOpen = async (tool: any) => {
    await toolsApi.open(tool.id);
    qc.invalidateQueries({ queryKey: ['tools'] });
    setRunnerId(tool.id);
  };

  const handleMenuOpen = (el: HTMLElement, tool: any) => {
    setMenuAnchor(el);
    setMenuTool(tool);
  };

  const handleForkSuccess = () => {
    setForkTool(null);
    setTab('mine');
    setSearchParams({ tab: 'mine' }, { replace: true });
  };

  // 操作矩阵
  const isMine = (tool: any) => tool.creator_id === currentUserId;

  return (
    <Box>
      <PageHeader
        title="小工具"
        subtitle="HTML 小工具：上传即用，分享即用，无需审核"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setUploadOpen(true)}>
            上传工具
          </Button>
        }
      />

      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="发现" value="discover" />
        <Tab label="我创建的" value="mine" />
      </Tabs>

      {isLoading ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : items.length === 0 ? (
        tab === 'discover' ? (
          <EmptyState title="还没有对你可见的工具" description="上传一个，或等同事分享给你" />
        ) : (
          <EmptyState title="你还没有上传过工具" description="点击上方「上传工具」开始创建" action={<Button variant="outlined" startIcon={<UploadFile />} onClick={() => setUploadOpen(true)}>上传工具</Button>} />
        )
      ) : (
        <Grid container spacing={2.5}>
          {items.map((tool: any) => {
            const mine = isMine(tool);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <CardContent sx={{ flex: 1, pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={tool.category} size="small" sx={{ bgcolor: alpha(CATEGORY_COLORS[tool.category] || '#546e7a', 0.12), color: CATEGORY_COLORS[tool.category] || '#546e7a', fontWeight: 600, fontSize: 12 }} />
                        {tab === 'discover' && mine && (
                          <Chip label="我创建的" size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
                        )}
                      </Box>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e.currentTarget, tool)}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>{tool.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 13, lineHeight: 1.5 }}>
                      {tool.description}
                    </Typography>
                    {tool.forked_from && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <AltRoute sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          改编自 {tool.forked_from.creator_name} · {tool.forked_from.name}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {tool.creator_name} · {tool.creator_dept}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        打开 {tool.use_count} 次
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      更新于 {relativeTime(tool.updated_at)}
                    </Typography>
                  </CardContent>
                  <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                    <Button fullWidth size="small" variant="outlined" startIcon={<OpenInNew />} onClick={() => handleOpen(tool)}>
                      打开
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* More menu — 按 tab + isMine 矩阵渲染 */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuTool(null); }}>
        {tab === 'mine' ? (
          // 我创建的 Tab：分享 / 让 AI 修改 / 编辑信息 / 更新文件 / 删除
          <>
            <MenuItem onClick={() => { setShareTool(menuTool); setMenuAnchor(null); }}>
              <Share sx={{ mr: 1, fontSize: 18 }} /> 分享
            </MenuItem>
            <MenuItem onClick={() => { setAiModifyTool(menuTool); setMenuAnchor(null); }}>
              <AutoFixHigh sx={{ mr: 1, fontSize: 18 }} /> 让 AI 修改
            </MenuItem>
            <MenuItem onClick={() => { setEditTool(menuTool); setMenuAnchor(null); }}>
              <Edit sx={{ mr: 1, fontSize: 18 }} /> 编辑信息
            </MenuItem>
            <MenuItem onClick={() => { setEditTool({ ...menuTool, _updateContent: true }); setMenuAnchor(null); }}>
              <UploadFile sx={{ mr: 1, fontSize: 18 }} /> 更新文件
            </MenuItem>
            <MenuItem onClick={() => { setDeleteConfirm(menuTool); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1, fontSize: 18 }} /> 删除
            </MenuItem>
          </>
        ) : menuTool && isMine(menuTool) ? (
          // 发现 Tab · 自己：仅「让 AI 修改」
          <MenuItem onClick={() => { setAiModifyTool(menuTool); setMenuAnchor(null); }}>
            <AutoFixHigh sx={{ mr: 1, fontSize: 18 }} /> 让 AI 修改
          </MenuItem>
        ) : (
          // 发现 Tab · 他人：仅「复制为我的」
          <MenuItem onClick={() => { setForkTool(menuTool); setMenuAnchor(null); }}>
            <ContentCopy sx={{ mr: 1, fontSize: 18 }} /> 复制为我的
          </MenuItem>
        )}
      </Menu>

      {/* Runner */}
      {runnerId && (
        <ToolRunnerDialog
          id={runnerId}
          currentTab={tab}
          onClose={() => setRunnerId(null)}
          onFork={(tool) => { setRunnerId(null); setForkTool(tool); }}
          onAiModify={(tool) => { setRunnerId(null); setAiModifyTool(tool); }}
        />
      )}

      {/* Upload */}
      <UploadToolDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* Edit */}
      {editTool && !editTool._updateContent && (
        <EditToolDialog tool={editTool} onClose={() => setEditTool(null)} />
      )}

      {/* Update content - reuse upload dialog in update mode */}
      {editTool && editTool._updateContent && (
        <UploadToolDialog open={true} onClose={() => setEditTool(null)} tool={editTool} />
      )}

      {/* Share */}
      {shareTool && <ShareToolDialog tool={shareTool} onClose={() => setShareTool(null)} />}

      {/* Fork */}
      {forkTool && <ForkDialog tool={forkTool} onClose={handleForkSuccess} />}

      {/* AI Modify */}
      {aiModifyTool && <AIModifyDialog tool={aiModifyTool} onClose={() => setAiModifyTool(null)} />}

      {/* Delete confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除「{deleteConfirm?.name}」吗？此操作不可撤销，所有分享关系也会一并删除。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={() => { if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); }}>删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
