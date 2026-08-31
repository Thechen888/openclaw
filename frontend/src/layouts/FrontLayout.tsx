import React, { useState } from 'react';
import {
  Box, IconButton, Typography, Tooltip, Divider, Avatar,
  List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, useTheme, alpha, Collapse, Badge,
} from '@mui/material';
import {
  Add, SmartToy, Folder,
  AutoStories, Search, Settings, Logout,
  ExpandMore, ExpandLess, Chat, MenuBook,
  AutoFixHigh, Extension, Storefront, Download,
  AccountTree, Share,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useViewModeStore } from '../stores/viewModeStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { chatApi } from '../api/client';
import NotificationBell from '../components/NotificationBell';

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
  const { mode: themeMode } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  // 各导航分区展开状态（默认全部展开）
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_SECTIONS.map((s) => [s.label, true]))
  );
  const toggleSection = (label: string) =>
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  const [activeId, setActiveId] = useState<string>('');

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
  const tasks = allSessions.filter((s) => !s.workspace_name);
  const spaceMap = new Map<string, any[]>();
  allSessions.forEach((s) => {
    if (s.workspace_name) {
      const list = spaceMap.get(s.workspace_name) || [];
      list.push(s);
      spaceMap.set(s.workspace_name, list);
    }
  });
  const spaces = Array.from(spaceMap.entries());

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
              <IconButton size="small" sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.text1, bgcolor: c.navHover } }}>
                <Search sx={{ fontSize: 16 }} />
              </IconButton>
              <NotificationBell />
              <IconButton size="small" sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.text1, bgcolor: c.navHover } }}>
                <Settings sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          {/* 新建对话按钮 */}
          <Box
            onClick={() => { setActiveId(''); navigate('/chat'); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 1, borderRadius: 2, mb: 1.5,
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
        <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: 1.5 }}>
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
                  tasks.map((session) => (
                    <ListItemButton
                      key={session.id}
                      selected={activeId === session.id}
                      onClick={() => { setActiveId(session.id); navigate(`/chat/${session.id}`); }}
                      sx={{
                        borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25,
                        '&.Mui-selected': { bgcolor: c.navActive },
                        '&:hover': { bgcolor: c.navHover },
                      }}
                    >
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.accent, mr: 1.5, flexShrink: 0 }} />
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {session.shared_from && (
                              <Share sx={{ fontSize: 11, color: session.readonly ? '#9ca3af' : c.accent, flexShrink: 0 }} />
                            )}
                            <Typography sx={{ fontSize: 12.5, color: c.text1 }} noWrap>{session.title}</Typography>
                          </Box>
                        }
                      />
                      <Typography variant="caption" sx={{ fontSize: 10, color: c.text3, ml: 1, flexShrink: 0 }}>
                        {session.last_message_at ? relativeTime(session.last_message_at) : ''}
                      </Typography>
                    </ListItemButton>
                  ))
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75 }}>
                    <Box sx={{ color: '#f59e0b' }}><Folder sx={{ fontSize: 16 }} /></Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: c.text1 }}>{spaceName}</Typography>
                    <ExpandMore sx={{ fontSize: 14, color: c.text3, ml: 'auto' }} />
                  </Box>
                  {/* 空间下的对话 */}
                  <List dense disablePadding sx={{ pl: 2 }}>
                    {spaceSessions.map((session: any) => (
                      <ListItemButton
                        key={session.id}
                        selected={activeId === session.id}
                        onClick={() => { setActiveId(session.id); navigate(`/chat/${session.id}`); }}
                        sx={{
                          borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25,
                          '&.Mui-selected': { bgcolor: c.navActive },
                          '&:hover': { bgcolor: c.navHover },
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', mr: 1.5, flexShrink: 0 }} />
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {session.shared_from && (
                                <Share sx={{ fontSize: 11, color: session.readonly ? '#9ca3af' : c.accent, flexShrink: 0 }} />
                              )}
                              <Typography sx={{ fontSize: 12.5, color: c.text1 }} noWrap>{session.title}</Typography>
                            </Box>
                          }
                        />
                        <Typography variant="caption" sx={{ fontSize: 10, color: c.text3, ml: 1, flexShrink: 0 }}>
                          {session.last_message_at ? relativeTime(session.last_message_at) : ''}
                        </Typography>
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              ))}
            </Collapse>
          </Box>
        </Box>

        {/* ---- 底部：快捷入口 + 用户 ---- */}
        <Divider sx={{ borderColor: c.border }} />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.25, py: 0.6, borderRadius: 1.5,
                bgcolor: c.navHover, cursor: 'pointer',
                color: c.text2, fontSize: 11.5, fontWeight: 500,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: c.accentGlow, color: c.accent },
              }}
            >
              <MenuBook sx={{ fontSize: 13 }} />
              知识库
            </Box>
          </Box>

          {/* 用户信息 */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1, py: 0.75, borderRadius: 1.5,
              cursor: 'pointer', transition: 'all 0.15s',
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
            <IconButton size="small" sx={{ color: c.text3, width: 24, height: 24 }}>
              <Logout sx={{ fontSize: 14 }} />
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
      </Box>

      {/* ===== 右侧：主内容区 ===== */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export { SIDEBAR_WIDTH };
