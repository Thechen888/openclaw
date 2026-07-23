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
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useViewModeStore } from '../stores/viewModeStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const SIDEBAR_WIDTH = 280;

// 导航项
const NAV_ITEMS = [
  { icon: <SmartToy fontSize="small" />, label: '智能体', path: '/agents' },
  { icon: <AutoStories fontSize="small" />, label: '报告中心', path: '/reports' },
  { icon: <MenuBook fontSize="small" />, label: '知识库', path: '/rag/knowledge-bases' },
];

// Mock 数据
const MOCK_SPACES = [
  {
    id: 'space-1',
    name: 'openclaw-main',
    icon: <Folder fontSize="small" />,
    conversations: [
      { id: 'c1', title: 'AI Agent管理平台代码...', time: '2小时前' },
    ],
  },
  {
    id: 'space-2',
    name: '项目新手指引',
    icon: <AutoFixHigh fontSize="small" />,
    conversations: [
      { id: 'c2', title: '生成项目功能介绍', time: '1天前' },
    ],
  },
];

const MOCK_TASKS = [
  { id: 't1', title: '你好', time: '10分钟前' },
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
  const [skillsExpanded, setSkillsExpanded] = useState(true);
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
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              <IconButton size="small" sx={{ color: c.text3, width: 28, height: 28, '&:hover': { color: c.text1, bgcolor: c.navHover } }}>
                <Search sx={{ fontSize: 16 }} />
              </IconButton>
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

          {/* 导航项 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {NAV_ITEMS.map((item) => (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  px: 1.5, py: 0.85, borderRadius: 1.5,
                  cursor: 'pointer',
                  bgcolor: isNavActive(item.path) ? c.navActive : 'transparent',
                  color: isNavActive(item.path) ? c.accent : c.text2,
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: c.navHover, color: c.text1 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center' }}>
                  {item.icon}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: isNavActive(item.path) ? 600 : 400 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 技能（可折叠子菜单） */}
          <Box sx={{ mt: 0.5 }}>
            <Box
              onClick={() => setSkillsExpanded(!skillsExpanded)}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 1.5, py: 0.85, cursor: 'pointer', borderRadius: 1.5,
                '&:hover': { bgcolor: c.navHover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Extension sx={{ fontSize: 'small', color: c.text2 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: c.text2 }}>
                  技能
                </Typography>
              </Box>
              {skillsExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
            </Box>
            <Collapse in={skillsExpanded}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, pl: 1 }}>
                {[
                  { icon: <Storefront sx={{ fontSize: 14 }} />, label: '技能市场', path: '/skills/market' },
                  { icon: <Download sx={{ fontSize: 14 }} />, label: '我安装的', path: '/skills/my-installed' },
                  { icon: <Extension sx={{ fontSize: 14 }} />, label: '我创建的', path: '/skills/my' },
                ].map((item) => (
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
        </Box>

        <Divider sx={{ mx: 2, borderColor: c.border }} />

        {/* ---- 中部：任务 + 空间 列表 ---- */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: 1.5 }}>
          {/* 任务（纯聊天） */}
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
                  ({MOCK_TASKS.length})
                </Typography>
              </Box>
              {tasksExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
            </Box>
            <Collapse in={tasksExpanded}>
              <List dense disablePadding sx={{ pl: 1 }}>
                {MOCK_TASKS.map((task) => (
                  <ListItemButton
                    key={task.id}
                    selected={activeId === task.id}
                    onClick={() => { setActiveId(task.id); navigate(`/chat/${task.id}`); }}
                    sx={{
                      borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25,
                      '&.Mui-selected': { bgcolor: c.navActive },
                      '&:hover': { bgcolor: c.navHover },
                    }}
                  >
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.accent, mr: 1.5, flexShrink: 0 }} />
                    <ListItemText
                      primary={task.title}
                      slotProps={{ primary: { sx: { fontSize: 12.5, color: c.text1 }, noWrap: true } }}
                    />
                    <Typography variant="caption" sx={{ fontSize: 10, color: c.text3, ml: 1, flexShrink: 0 }}>{task.time}</Typography>
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>

          {/* 空间（关联项目文件夹的对话） */}
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
                  ({MOCK_SPACES.length})
                </Typography>
              </Box>
              {spacesExpanded ? <ExpandLess sx={{ fontSize: 14, color: c.text3 }} /> : <ExpandMore sx={{ fontSize: 14, color: c.text3 }} />}
            </Box>
            <Collapse in={spacesExpanded}>
              {MOCK_SPACES.map((space) => (
                <Box key={space.id} sx={{ pl: 1 }}>
                  {/* 空间标题 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75 }}>
                    <Box sx={{ color: '#f59e0b' }}>{space.icon}</Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: c.text1 }}>{space.name}</Typography>
                    <ExpandMore sx={{ fontSize: 14, color: c.text3, ml: 'auto' }} />
                  </Box>
                  {/* 空间下的对话 */}
                  <List dense disablePadding sx={{ pl: 2 }}>
                    {space.conversations.map((conv) => (
                      <ListItemButton
                        key={conv.id}
                        selected={activeId === conv.id}
                        onClick={() => { setActiveId(conv.id); navigate(`/chat/${conv.id}`); }}
                        sx={{
                          borderRadius: 1.5, py: 0.75, px: 1.5, mb: 0.25,
                          '&.Mui-selected': { bgcolor: c.navActive },
                          '&:hover': { bgcolor: c.navHover },
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', mr: 1.5, flexShrink: 0 }} />
                        <ListItemText
                          primary={conv.title}
                          slotProps={{ primary: { sx: { fontSize: 12.5, color: c.text1 }, noWrap: true } }}
                        />
                        <Typography variant="caption" sx={{ fontSize: 10, color: c.text3, ml: 1, flexShrink: 0 }}>{conv.time}</Typography>
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
