import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Typography, Tooltip, Divider, Avatar,
  List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, useTheme, alpha, Collapse, Badge, Switch, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox,
} from '@mui/material';
import {
  Add, SmartToy, Folder,
  AutoStories, Search, Settings, Logout,
  ExpandMore, ExpandLess, Chat, MenuBook,
  AutoFixHigh, Extension, Storefront, Download,
  AccountTree, Share, DarkMode, LightMode, Groups,
  MoreHoriz, ChecklistRounded, Edit, Delete, Close,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useViewModeStore } from '../stores/viewModeStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { chatApi } from '../api/client';
import NotificationBell from '../components/NotificationBell';
import NewGroupDialog from '../pages/chat/NewGroupDialog';
import ShareDialog from '../pages/chat/ShareDialog';

const SIDEBAR_WIDTH = 280;

// 相对时间
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

// 导航分区：三模块九页 + 知识库/技能/Token转售
interface NavSubItem { icon: React.ReactNode; label: string; path: string; }
interface NavSectionDef { label: string; icon: React.ReactNode; items: NavSubItem[]; }

const NAV_SECTIONS: NavSectionDef[] = [
  {
    label: '智能体',
    icon: <SmartToy fontSize="small" />,
    items: [
      { icon: <Storefront sx={{ fontSize: 14 }} />, label: '智能体市场', path: '/agents/market' },
      { icon: <Download sx={{ fontSize: 14 }} />, label: '我安装的', path: '/agents/installed' },
      { icon: <SmartToy sx={{ fontSize: 14 }} />, label: '我创建的', path: '/agents/my' },
    ],
  },
  {
    label: '工作流',
    icon: <AccountTree fontSize="small" />,
    items: [
      { icon: <Storefront sx={{ fontSize: 14 }} />, label: '工作流市场', path: '/workflows/market' },
      { icon: <Download sx={{ fontSize: 14 }} />, label: '我安装的', path: '/workflows/installed' },
      { icon: <AccountTree sx={{ fontSize: 14 }} />, label: '我创建的', path: '/workflows/my' },
    ],
  },
  {
    label: '报告',
    icon: <AutoStories fontSize="small" />,
    items: [
      { icon: <Storefront sx={{ fontSize: 14 }} />, label: '报告市场', path: '/reports/market' },
      { icon: <Download sx={{ fontSize: 14 }} />, label: '我安装的', path: '/reports/installed' },
      { icon: <AutoStories sx={{ fontSize: 14 }} />, label: '我创建的', path: '/reports/my' },
    ],
  },
  {
    label: '知识库',
    icon: <MenuBook fontSize="small" />,
    items: [
      { icon: <MenuBook sx={{ fontSize: 14 }} />, label: '知识库列表', path: '/rag/knowledge-bases' },
    ],
  },
  {
    label: '技能',
    icon: <Extension fontSize="small" />,
    items: [
      { icon: <Storefront sx={{ fontSize: 14 }} />, label: '技能市场', path: '/skills/market' },
      { icon: <Download sx={{ fontSize: 14 }} />, label: '我安装的', path: '/skills/my-installed' },
      { icon: <Extension sx={{ fontSize: 14 }} />, label: '我创建的', path: '/skills/my' },
    ],
  },
];

export default function FrontLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewModeStore();
  const { user, logout } = useAuthStore();
  const { mode: themeMode, toggleMode } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState(false);
  const [sidebarSearchText, setSidebarSearchText] = useState('');
  // ---- 侧栏菜单相关状态 ----
  const [itemMenuAnchor, setItemMenuAnchor] = useState<null | { left: number; top: number }>(null);
  const [itemMenuSession, setItemMenuSession] = useState<any>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogState, setShareDialogState] = useState<{ sessionId: string; sessionTitle: string; messages: any[]; sourceReadonly: boolean } | null>(null);
  const qc = useQueryClient();
  const invalidateSessions = useCallback(() => { qc.invalidateQueries({ queryKey: ['chat-sessions'] }); }, [qc]);
  // 各导航分区展开状态（默认全部展开）
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_SECTIONS.map((s) => [s.label, true]))
  );
  const toggleSection = (label: string) =>
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  const [activeId, setActiveId] = useState<string>('');
  const currentPathId = location.pathname.split('/chat/')[1] || '';

  // ---- 处理函数 ----
  const handleItemMenuOpen = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setItemMenuAnchor({ left: rect.right, top: rect.bottom });
    setItemMenuSession(session);
  };
  const handleRenameStart = () => {
    if (!itemMenuSession) return;
    setRenamingId(itemMenuSession.id);
    setRenameValue(itemMenuSession.title || '');
    setItemMenuAnchor(null);
  };
  const handleRenameConfirm = () => {
    if (!renamingId) return;
    const v = renameValue.trim();
    if (!v) { setRenamingId(null); return; }
    chatApi.sessions.update(renamingId, { title: v }).then(() => {
      invalidateSessions();
      setRenamingId(null);
    });
  };
  const handleRenameCancel = () => setRenamingId(null);
  const isNonCreatorGroup = (s: any) => s?.session_type === 'group' && s?.creator_id !== 'u-1';
  const handleDeleteClick = () => {
    setDeleteTarget(itemMenuSession);
    setDeleteConfirmOpen(true);
    setItemMenuAnchor(null);
  };
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const isNCG = isNonCreatorGroup(deleteTarget);
    const promise = isNCG
      ? chatApi.sessions.removeMember(deleteTarget.id, 'u-1')
      : chatApi.sessions.delete(deleteTarget.id);
    promise.then(() => {
      invalidateSessions();
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      if (currentPathId === deleteTarget.id) navigate('/chat');
    });
  };
  const handleBatchDeleteConfirm = () => {
    const ids = Array.from(batchSelectedIds);
    const sessions = allSessions.filter(s => ids.includes(s.id));
    Promise.all(sessions.map(s =>
      isNonCreatorGroup(s) ? chatApi.sessions.removeMember(s.id, 'u-1') : chatApi.sessions.delete(s.id)
    )).then(() => {
      invalidateSessions();
      if (ids.includes(currentPathId)) navigate('/chat');
      setBatchMode(false);
      setBatchSelectedIds(new Set());
      setBatchDeleteOpen(false);
    });
  };
  const handleShareClick = () => {
    if (!itemMenuSession) return;
    const sid = itemMenuSession.id;
    chatApi.messages.list(sid).then(res => {
      const msgs = (res.data?.data || []).map((m: any) => ({ id: m.id, role: m.role, content: m.content }));
      setShareDialogState({ sessionId: sid, sessionTitle: itemMenuSession.title, messages: msgs, sourceReadonly: !!itemMenuSession.readonly });
      setShareDialogOpen(true);
    });
    setItemMenuAnchor(null);
  };
  const handleEnterBatch = () => {
    setBatchMode(true);
    if (itemMenuSession) setBatchSelectedIds(new Set([itemMenuSession.id]));
    setItemMenuAnchor(null);
  };
  const handleBatchToggle = (id: string) => {
    setBatchSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleSelectAll = () => {
    const allIds = allSessions.map(s => s.id);
    const allSel = allIds.every(id => batchSelectedIds.has(id));
    setBatchSelectedIds(allSel ? new Set() : new Set(allIds));
  };
  const handleSpaceBatchToggle = (spaceSessionIds: string[]) => {
    const allSelected = spaceSessionIds.every(id => batchSelectedIds.has(id));
    setBatchSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) { spaceSessionIds.forEach(id => next.delete(id)); }
      else { spaceSessionIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const isDark = themeMode === 'dark';

  // 色彩体系
  const c = {
    bg: isDark ? '#0a0a0f' : '#f8f9fb',
    sidebarBg: isDark ? '#0f1117' : '#ffffff',
    navHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    navActive: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    text1: isDark ? '#e4e4e7' : '#18181b',
    text2: isDark ? '#71717a' : '#71717a',
    text3: isDark ? '#52525b' : '#a1a1aa',
    accent: '#6366f1',
    accentGlow: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
  };

  const isNavActive = (path: string) => location.pathname === path;

  // API 查询会话列表
  const { data: sessionsData } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.sessions.list({ page: 1, page_size: 100 }),
  });
  const allSessions: any[] = sessionsData?.data?.data || [];

  // 分组：任务（workspace_name 为空）和空间（按 workspace_name 分组）
  const filterFn = (s: any) => {
    if (!sidebarSearchText.trim()) return true;
    return s.title?.toLowerCase().includes(sidebarSearchText.toLowerCase());
  };
  const tasks = allSessions.filter((s) => !s.workspace_name && s.session_type !== 'group').filter(filterFn);
  const groupSessions = allSessions.filter((s) => s.session_type === 'group').filter(filterFn);
  const spaceMap = new Map<string, any[]>();
  allSessions.filter(filterFn).forEach((s) => {
    if (s.workspace_name) {
      const list = spaceMap.get(s.workspace_name) || [];
      list.push(s);
      spaceMap.set(s.workspace_name, list);
    }
  });
  const spaces = Array.from(spaceMap.entries());
  const batchSelectState: 'all' | 'partial' | 'none' = (() => {
    const total = allSessions.length;
    if (total === 0 || batchSelectedIds.size === 0) return 'none';
    if (batchSelectedIds.size >= total) return 'all';
    return 'partial';
  })();

  // ---- 通用会话条目渲染（含 hover 菜单 + 批量模式 + 重命名）----
  const renderSessionItem = (session: any, dotColor: string, showMembers?: boolean) => {
    const isRenaming = renamingId === session.id;
    const isHovered = hoveredItemId === session.id;
    const isChecked = batchSelectedIds.has(session.id);
    const itemClick = (e: React.MouseEvent) => {
      if (batchMode) { e.stopPropagation(); handleBatchToggle(session.id); return; }
      if (isRenaming) return;
      setActiveId(session.id);
      navigate(`/chat/${session.id}`);
    };
    return (
      <ListItemButton
        key={session.id}
        selected={!batchMode && activeId === session.id}
        onClick={itemClick}
        onMouseEnter={() => setHoveredItemId(session.id)}
        onMouseLeave={() => setHoveredItemId(null)}
        sx={{ borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25, '&.Mui-selected': { bgcolor: c.navActive }, '&:hover': { bgcolor: c.navHover } }}
      >
        {batchMode ? (
          <Checkbox checked={isChecked} onChange={() => handleBatchToggle(session.id)} size="small" onClick={(e) => e.stopPropagation()}
            sx={{ p: 0, mr: 1, color: c.text3, '&.Mui-checked': { color: '#6366f1' }, '& .MuiSvgIcon-root': { fontSize: 16 } }} />
        ) : (
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dotColor, mr: 1.5, flexShrink: 0 }} />
        )}
        {isRenaming ? (
          <TextField
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') handleRenameCancel(); }}
            onBlur={handleRenameConfirm}
            autoFocus size="small"
            inputRef={(ref: HTMLInputElement | null) => { if (ref) setTimeout(() => { ref.focus(); ref.select(); }, 0); }}
            onClick={(e) => e.stopPropagation()}
            sx={{ flex: 1, minWidth: 0, '& .MuiInputBase-root': { fontSize: 12.5, py: 0, height: 24 }, '& .MuiOutlinedInput-notchedOutline': { borderColor: c.accent } }}
          />
        ) : (
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {!showMembers && session.shared_from && (
                  <Share sx={{ fontSize: 11, color: session.readonly ? '#9ca3af' : c.accent, flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: 12.5, color: c.text1 }} noWrap>{session.title}</Typography>
                {showMembers && session.member_ids?.length > 0 && (
                  <Typography sx={{ fontSize: 10, color: c.text3, flexShrink: 0 }}>· {session.member_ids.length}人</Typography>
                )}
              </Box>
            }
          />
        )}
        {!batchMode && !isRenaming && (
          <>
            {isHovered ? (
              <IconButton size="small" onClick={(e) => handleItemMenuOpen(e, session)}
                sx={{ width: 20, height: 20, ml: 0.5, color: c.text3, '&:hover': { color: c.accent } }}>
                <MoreHoriz sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <Typography variant="caption" sx={{ fontSize: 10, color: c.text3, ml: 1, flexShrink: 0 }}>
                {session.last_message_at ? relativeTime(session.last_message_at) : ''}
              </Typography>
            )}
          </>
        )}
      </ListItemButton>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: c.bg }}>
      {/* ===== 左侧边栏 ===== */}
      <Box sx={{
        width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH,
        bgcolor: c.sidebarBg,
        borderRight: '1px solid', borderColor: c.border,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ---- 顶部：Logo + 导航 ---- */}
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          {/* Logo 行 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: 2,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 12,
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}>
                OC
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13, color: c.text1, lineHeight: 1.2 }}>
                  OpenClaw
                </Typography>
                <Typography variant="caption" sx={{ color: c.text3, fontSize: 9, letterSpacing: '0.1em' }}>
                  AI PLATFORM
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
              <IconButton size="small" onClick={() => { setSidebarSearchOpen(!sidebarSearchOpen); if (sidebarSearchOpen) setSidebarSearchText(''); }} sx={{ color: sidebarSearchOpen ? c.accent : c.text3, width: 28, height: 28, '&:hover': { color: c.text1, bgcolor: c.navHover } }}>
                <Search sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          {/* 侧栏搜索过滤框 */}
          <Collapse in={sidebarSearchOpen}>
            <Box sx={{ mb: 1.5, px: 0.5 }}>
              <TextField
                fullWidth size="small" autoFocus
                placeholder="搜索对话..."
                value={sidebarSearchText}
                onChange={(e) => setSidebarSearchText(e.target.value)}
                slotProps={{ input: { sx: { fontSize: 13, py: 0.75 } } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border },
                  },
                }}
              />
            </Box>
          </Collapse>

          {/* 新建对话按钮 */}
          <Box
            onClick={() => { setActiveId(''); navigate('/chat'); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 1, borderRadius: 2, mb: 1,
              bgcolor: c.accent, color: 'white',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
              transition: 'all 0.2s',
              '&:hover': { bgcolor: '#4f46e5', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' },
            }}
          >
            <Add sx={{ fontSize: 18 }} />
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>新建对话</Typography>
          </Box>

          {/* 导航分区：三模块九页 + 知识库/技能/Token转售（均可折叠） */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {NAV_SECTIONS.map((section) => {
              const expanded = expandedSections[section.label] ?? true;
              // 分区下任一子项激活时，分区标题高亮
              const sectionActive = section.items.some((it) => isNavActive(it.path));
              return (
                <Box key={section.label}>
                  {/* 分区标题（点击折叠/展开） */}
                  <Box
                    onClick={() => toggleSection(section.label)}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      px: 1.5, py: 0.85, cursor: 'pointer', borderRadius: 1.5,
                      '&:hover': { bgcolor: c.navHover },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center', color: sectionActive ? c.accent : c.text2 }}>
                        {section.icon}
                      </Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: sectionActive ? c.accent : c.text2 }}>
                        {section.label}
                      </Typography>
                    </Box>
                    {expanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
                  </Box>
                  {/* 子项 */}
                  <Collapse in={expanded}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, pl: 1 }}>
                      {section.items.map((item) => (
                        <Box
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 1.25,
                            px: 1.5, py: 0.7, borderRadius: 1.5,
                            cursor: 'pointer',
                            bgcolor: isNavActive(item.path) ? c.navActive : 'transparent',
                            color: isNavActive(item.path) ? c.accent : c.text3,
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: c.navHover, color: c.text1 },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center', opacity: 0.7 }}>
                            {item.icon}
                          </Box>
                          <Typography sx={{ fontSize: 12.5, fontWeight: isNavActive(item.path) ? 600 : 400 }}>
                            {item.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Divider sx={{ mx: 2, borderColor: c.border }} />

        {/* ---- 中部：任务 + 空间 列表 ---- */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: 1.5, position: 'relative' }}>
          {/* 任务（纯聊天，workspace_name 为空） */}
          <Box sx={{ mb: 1 }}>
            <Box
              onClick={() => setTasksExpanded(!tasksExpanded)}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 1, py: 0.75, cursor: 'pointer', borderRadius: 1,
                '&:hover': { bgcolor: c.navHover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Chat sx={{ fontSize: 14, color: c.text3 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, color: c.text2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  任务
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: c.text3 }}>
                  ({tasks.length})
                </Typography>
              </Box>
              {tasksExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
            </Box>
            <Collapse in={tasksExpanded}>
              <List dense disablePadding sx={{ pl: 1 }}>
                {tasks.length === 0 ? (
                  <Box sx={{ py: 2, px: 1.5 }}>
                    <Typography sx={{ fontSize: 12, color: c.text3 }}>暂无对话</Typography>
                  </Box>
                ) : (
                  tasks.map((session) => renderSessionItem(session, c.accent))
                )}
              </List>
            </Collapse>
          </Box>

          {/* 空间（按 workspace_name 分组） */}
          <Box>
            <Box
              onClick={() => setSpacesExpanded(!spacesExpanded)}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 1, py: 0.75, cursor: 'pointer', borderRadius: 1,
                '&:hover': { bgcolor: c.navHover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Folder sx={{ fontSize: 14, color: c.text3 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, color: c.text2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  空间
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: c.text3 }}>
                  ({spaces.length})
                </Typography>
              </Box>
              {spacesExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
            </Box>
            <Collapse in={spacesExpanded}>
              {spaces.map(([spaceName, spaceSessions]) => (
                <Box key={spaceName} sx={{ pl: 1 }}>
                  {/* 空间标题 */}
                  <Box
                    onClick={(e) => { if (batchMode) { e.stopPropagation(); handleSpaceBatchToggle(spaceSessions.map(s => s.id)); } }}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, ...(batchMode ? { cursor: 'pointer', '&:hover': { bgcolor: c.navHover }, borderRadius: 1 } : {}) }}
                  >
                    {batchMode && (
                      <Checkbox
                        checked={spaceSessions.every(s => batchSelectedIds.has(s.id))}
                        indeterminate={spaceSessions.some(s => batchSelectedIds.has(s.id)) && !spaceSessions.every(s => batchSelectedIds.has(s.id))}
                        size="small" onClick={(e) => e.stopPropagation()}
                        sx={{ p: 0, color: c.text3, '&.Mui-checked': { color: '#6366f1' }, '& .MuiSvgIcon-root': { fontSize: 16 } }}
                      />
                    )}
                    <Box sx={{ color: '#f59e0b' }}><Folder sx={{ fontSize: 16 }} /></Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: c.text1, flex: 1 }}>{spaceName}</Typography>
                    <Box onClick={(e) => { e.stopPropagation(); setSpacesExpanded(!spacesExpanded); }} sx={{ display: 'flex', cursor: 'pointer' }}>
                      {spacesExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
                    </Box>
                  </Box>
                  {/* 空间下的对话 */}
                  <List dense disablePadding sx={{ pl: 2 }}>
                    {spaceSessions.map((session: any) => renderSessionItem(session, '#f59e0b'))}
                  </List>
                </Box>
              ))}
            </Collapse>
          </Box>

          {/* 群组 */}
          <Box sx={{ mt: 1 }}>
            <Box
              onClick={() => setGroupsExpanded(!groupsExpanded)}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 1, py: 0.75, cursor: 'pointer', borderRadius: 1,
                '&:hover': { bgcolor: c.navHover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Groups sx={{ fontSize: 14, color: c.text3 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, color: c.text2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  群组
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 10, color: c.text3 }}>
                  ({groupSessions.length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Tooltip title="新建群组" placement="right">
                  <Box
                    component="span"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setNewGroupOpen(true); }}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 1, cursor: 'pointer', color: c.text2, '&:hover': { bgcolor: alpha(c.accent, 0.12), color: c.accent } }}
                  >
                    <Add sx={{ fontSize: 16 }} />
                  </Box>
                </Tooltip>
                {groupsExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
              </Box>
            </Box>
            <Collapse in={groupsExpanded}>
              <List dense disablePadding sx={{ pl: 1 }}>
                {groupSessions.length === 0 ? (
                  <Box
                    onClick={() => setNewGroupOpen(true)}
                    sx={{
                      mx: 1, my: 0.5, py: 0.75, px: 1.5,
                      border: '1px dashed', borderColor: c.border, borderRadius: '8px',
                      cursor: 'pointer', textAlign: 'center',
                      '&:hover': { borderColor: c.accent, '& .empty-group-text': { color: c.accent } },
                    }}
                  >
                    <Typography className="empty-group-text" sx={{ fontSize: 12.5, color: c.text3, transition: 'color 0.2s' }}>+ 新建群组</Typography>
                  </Box>
                ) : (
                  groupSessions.map((session) => renderSessionItem(session, '#10b981', true))
                )}
              </List>
            </Collapse>
          </Box>

          {/* 批量操作栏 */}
          {batchMode && (
            <Box sx={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              bgcolor: c.sidebarBg, borderTop: `1px solid ${c.border}`,
              px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={handleSelectAll}>
                <Checkbox
                  checked={batchSelectState === 'all'} indeterminate={batchSelectState === 'partial'}
                  size="small" onClick={(e) => e.stopPropagation()}
                  sx={{ p: 0, color: c.text3, '&.Mui-checked': { color: '#6366f1' }, '&.MuiCheckbox-indeterminate': { color: '#6366f1' } }}
                />
                <Typography sx={{ fontSize: 12, color: c.text2 }}>全选({batchSelectedIds.size})</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button size="small" variant="outlined" disabled={batchSelectedIds.size === 0}
                  onClick={() => setBatchDeleteOpen(true)}
                  sx={{ fontSize: 11, textTransform: 'none', color: '#ef4444', borderColor: '#ef4444', '&.Mui-disabled': { color: 'rgba(239,68,68,0.3)', borderColor: 'rgba(239,68,68,0.3)' }, px: 1.5, py: 0.25, minWidth: 'auto' }}>
                  删除
                </Button>
                <IconButton size="small" onClick={() => { setBatchMode(false); setBatchSelectedIds(new Set()); }}
                  sx={{ color: c.text3, width: 22, height: 22 }}>
                  <Close sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
          )}
        </Box>

        {/* ---- 底部：快捷入口 + 用户 ---- */}
        <Divider sx={{ borderColor: c.border }} />
        <Box sx={{ px: 2, py: 1.5 }}>
          {/* 用户信息行：头像+姓名 | 铃铛+设置 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                flex: 1, minWidth: 0, cursor: 'pointer',
                px: 1, py: 0.5, borderRadius: 1.5,
                '&:hover': { bgcolor: c.navHover },
              }}
            >
              <Avatar sx={{
                width: 28, height: 28, fontSize: 11,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 2px 6px rgba(99,102,241,0.25)',
              }}>
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: c.text1, lineHeight: 1.2 }}>
                  {user?.name || 'Admin'}
                </Typography>
                <Typography sx={{ fontSize: 10, color: c.text3 }}>{user?.role || 'admin'}</Typography>
              </Box>
            </Box>
            <NotificationBell placement="up" dark={isDark} />
            <IconButton size="small" onClick={(e) => setSettingsAnchor(e.currentTarget)} sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.text1, bgcolor: c.navHover } }}>
              <Settings sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* 用户菜单 */}
        <Menu
          anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
          sx={{ '& .MuiPaper-root': { mt: -0.5, minWidth: 140, bgcolor: c.sidebarBg, border: '1px solid', borderColor: c.border } }}
        >
          <MenuItem onClick={() => { setViewMode('admin'); navigate('/'); setAnchorEl(null); }}
            sx={{ fontSize: 12.5, color: c.text1 }}>
            <Settings sx={{ fontSize: 16, mr: 1, color: c.text2 }} /> 切换到后台
          </MenuItem>
          <Divider sx={{ borderColor: c.border }} />
          <MenuItem onClick={() => { logout(); setAnchorEl(null); }}
            sx={{ fontSize: 12.5, color: '#ef4444' }}>
            <Logout sx={{ fontSize: 16, mr: 1 }} /> 退出登录
          </MenuItem>
        </Menu>

        {/* 设置菜单 */}
        <Menu
          anchorEl={settingsAnchor} open={Boolean(settingsAnchor)} onClose={() => setSettingsAnchor(null)}
          transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
          sx={{ '& .MuiPaper-root': { mt: -0.5, minWidth: 200, bgcolor: c.sidebarBg, border: '1px solid', borderColor: c.border, borderRadius: 2 } }}
        >
          <MenuItem onClick={() => toggleMode()} sx={{ fontSize: 12.5, color: c.text1, gap: 1 }}>
            {isDark ? <LightMode sx={{ fontSize: 16, color: c.text2 }} /> : <DarkMode sx={{ fontSize: 16, color: c.text2 }} />}
            <Typography sx={{ flex: 1, fontSize: 12.5 }}>{isDark ? '浅色模式' : '深色模式'}</Typography>
            <Switch checked={isDark} size="small" onClick={(e) => e.stopPropagation()}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366f1' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6366f1' },
              }}
            />
          </MenuItem>
          <Divider sx={{ borderColor: c.border }} />
          <MenuItem onClick={() => { setViewMode('admin'); navigate('/'); setSettingsAnchor(null); }}
            sx={{ fontSize: 12.5, color: c.text1, gap: 1 }}>
            <Settings sx={{ fontSize: 16, color: c.text2 }} />
            <Typography sx={{ fontSize: 12.5 }}>切换到后台</Typography>
          </MenuItem>
        </Menu>

        {/* 会话条目菜单 */}
        <Menu
          anchorReference="anchorPosition"
          anchorPosition={itemMenuAnchor || undefined}
          open={Boolean(itemMenuAnchor)} onClose={() => setItemMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ '& .MuiPaper-root': { minWidth: 140, bgcolor: c.sidebarBg, border: '1px solid', borderColor: c.border, borderRadius: 2 } }}
        >
          <MenuItem onClick={handleEnterBatch} sx={{ fontSize: 13, gap: 1, color: c.text1 }}>
            <ChecklistRounded sx={{ fontSize: 16, color: c.text2 }} /> 批量操作
          </MenuItem>
          {itemMenuSession?.session_type !== 'group' && (
            <MenuItem onClick={handleRenameStart} sx={{ fontSize: 13, gap: 1, color: c.text1 }}>
              <Edit sx={{ fontSize: 16, color: c.text2 }} /> 重命名
            </MenuItem>
          )}
          <MenuItem onClick={handleShareClick} sx={{ fontSize: 13, gap: 1, color: c.text1 }}>
            <Share sx={{ fontSize: 16, color: c.text2 }} /> 分享
          </MenuItem>
          {itemMenuSession?.session_type === 'group' ? (
            itemMenuSession?.creator_id === 'u-1' ? (
              <MenuItem onClick={handleDeleteClick} sx={{ fontSize: 13, gap: 1, color: '#ef4444' }}>
                <Delete sx={{ fontSize: 16 }} /> 解散群组
              </MenuItem>
            ) : (
              <MenuItem onClick={handleDeleteClick} sx={{ fontSize: 13, gap: 1, color: '#ef4444' }}>
                <Delete sx={{ fontSize: 16 }} /> 退出群组
              </MenuItem>
            )
          ) : (
            <MenuItem onClick={handleDeleteClick} sx={{ fontSize: 13, gap: 1, color: '#ef4444' }}>
              <Delete sx={{ fontSize: 16 }} /> 删除
            </MenuItem>
          )}
        </Menu>
      </Box>

      {/* ===== 右侧：主内容区 ===== */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>

      {/* 新建群组弹窗 */}
      <NewGroupDialog
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
      />

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>
          {deleteTarget?.session_type === 'group' && deleteTarget?.creator_id === 'u-1' ? '解散群组' :
           deleteTarget?.session_type === 'group' ? '退出群组' : '删除对话'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {deleteTarget?.session_type === 'group' && deleteTarget?.creator_id === 'u-1'
              ? '解散后群组及全部消息记录将被删除，所有成员将失去访问，此操作不可恢复'
              : deleteTarget?.session_type === 'group'
              ? '退出后你将不再接收该群消息，历史消息不再可见'
              : '此操作不可恢复'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ fontSize: 13, textTransform: 'none', color: 'text.secondary' }}>取消</Button>
          <Button variant="contained" onClick={handleDeleteConfirm}
            sx={{ fontSize: 13, textTransform: 'none', bgcolor: '#ef4444', borderRadius: 2, '&:hover': { bgcolor: '#dc2626' }, boxShadow: 'none' }}>
            {deleteTarget?.session_type === 'group' && deleteTarget?.creator_id === 'u-1' ? '确认解散' :
             deleteTarget?.session_type === 'group' ? '确认退出' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量删除确认弹窗 */}
      <Dialog open={batchDeleteOpen} onClose={() => setBatchDeleteOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>批量操作确认</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            {(() => {
              const sessions = allSessions.filter(s => batchSelectedIds.has(s.id));
              const dismissCount = sessions.filter(s => s.session_type === 'group' && s.creator_id === 'u-1').length;
              const leaveCount = sessions.filter(s => s.session_type === 'group' && s.creator_id !== 'u-1').length;
              const deleteCount = sessions.filter(s => s.session_type !== 'group').length;
              const parts: string[] = [];
              if (dismissCount > 0) parts.push(`解散 ${dismissCount} 个群组(你是群主)`);
              if (leaveCount > 0) parts.push(`退出 ${leaveCount} 个群组`);
              if (deleteCount > 0) parts.push(`删除 ${deleteCount} 个对话`);
              return parts.join('、') + (dismissCount > 0 ? '，此操作不可恢复' : '');
            })()}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setBatchDeleteOpen(false)} sx={{ fontSize: 13, textTransform: 'none', color: 'text.secondary' }}>取消</Button>
          <Button variant="contained" onClick={handleBatchDeleteConfirm}
            sx={{ fontSize: 13, textTransform: 'none', bgcolor: '#ef4444', borderRadius: 2, '&:hover': { bgcolor: '#dc2626' }, boxShadow: 'none' }}>
            确认执行
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分享对话框 */}
      {shareDialogState && (
        <ShareDialog
          open={shareDialogOpen}
          onClose={() => { setShareDialogOpen(false); setShareDialogState(null); }}
          sessionId={shareDialogState.sessionId}
          sessionTitle={shareDialogState.sessionTitle}
          selectedMessages={shareDialogState.messages}
          sourceReadonly={shareDialogState.sourceReadonly}
        />
      )}
    </Box>
  );
}

export { SIDEBAR_WIDTH };
