import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem,
  Breadcrumbs, Link, useTheme, Chip, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Menu as MenuIcon, DarkMode, LightMode, AdminPanelSettings, Storefront } from '@mui/icons-material';
import { useLocation, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import { useViewModeStore, VIEW_DEFAULT_PATH, type ViewMode } from '../../stores/viewModeStore';
import { allNavConfig } from '../Sidebar/navConfig';
import NotificationBell from '../../components/NotificationBell';

export default function Header() {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { setMobileOpen, collapsed } = useSidebarStore();
  const { viewMode, setViewMode } = useViewModeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleViewChange = (_e: React.MouseEvent<HTMLElement>, next: ViewMode | null) => {
    if (!next || next === viewMode) return;
    setViewMode(next);
    navigate(VIEW_DEFAULT_PATH[next]);
  };

  // Build breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ title: '首页', path: '/' }];
  let currentPath = '';
  for (const seg of pathSegments) {
    currentPath += `/${seg}`;
    const navItem = allNavConfig.flatMap(s => s.items).find(i => i.path === currentPath);
    breadcrumbs.push({ title: navItem?.title || seg.charAt(0).toUpperCase() + seg.slice(1), path: currentPath });
  }

  // Find current page title
  const currentPage = allNavConfig.flatMap(s => s.items).find(i => i.path === location.pathname);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(10,11,13,0.72)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, #00D4FF 0%, #7C3AED 40%, transparent 80%)',
          opacity: 0.6,
        },
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          onClick={() => setMobileOpen(true)}
          sx={{ display: { md: 'none' }, color: 'text.primary' }}
        >
          <MenuIcon />
        </IconButton>

        {/* Page Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Typography variant="h6" sx={{
            fontWeight: 700,
            fontSize: 16,
            background: 'linear-gradient(135deg, #E8ECF0 30%, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
          }}>
            {currentPage?.title || '仪表盘'}
          </Typography>
          {pathSegments.length > 0 && (
            <Breadcrumbs sx={{ display: { xs: 'none', sm: 'flex' }, '& .MuiBreadcrumbs-separator': { color: 'rgba(0,212,255,0.3)' } }}>
              {breadcrumbs.map((crumb, i) => (
                i === breadcrumbs.length - 1 ? (
                  <Typography key={crumb.path} variant="caption" sx={{ color: 'rgba(0,212,255,0.6)' }}>
                    {crumb.title}
                  </Typography>
                ) : (
                  <Link
                    key={crumb.path}
                    component={RouterLink}
                    to={crumb.path}
                    underline="hover"
                    variant="caption"
                    color="text.secondary"
                    sx={{ '&:hover': { color: '#00D4FF' } }}
                  >
                    {crumb.title}
                  </Link>
                )
              ))}
            </Breadcrumbs>
          )}
        </Box>

        {/* 前台/后台切换 */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewChange}
          size="small"
          sx={{
            mr: 0.5,
            '& .MuiToggleButton-root': {
              px: 1.25, py: 0.35, fontSize: 12, fontWeight: 600, textTransform: 'none',
              color: 'text.secondary', borderColor: 'rgba(0,212,255,0.25)', gap: 0.5,
              '&.Mui-selected': {
                color: '#00D4FF', bgcolor: 'rgba(0,212,255,0.12)',
                borderColor: 'rgba(0,212,255,0.5)',
                '&:hover': { bgcolor: 'rgba(0,212,255,0.18)' },
              },
            },
          }}
        >
          <ToggleButton value="admin">
            <AdminPanelSettings sx={{ fontSize: 16 }} /> 后台
          </ToggleButton>
          <ToggleButton value="front">
            <Storefront sx={{ fontSize: 16 }} /> 前台
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Environment badge */}
        <Chip label="开发" size="small" variant="outlined"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            height: 22,
            fontSize: 11,
            fontWeight: 600,
            color: '#00D4FF',
            borderColor: 'rgba(0,212,255,0.4)',
            textShadow: '0 0 8px rgba(0,212,255,0.5)',
            boxShadow: '0 0 8px rgba(0,212,255,0.15), inset 0 0 8px rgba(0,212,255,0.05)',
          }} />

        {/* Theme toggle */}
        <IconButton onClick={toggleMode} size="small" sx={{
          color: 'text.secondary',
          transition: 'all 0.3s',
          '&:hover': { color: '#00D4FF', boxShadow: '0 0 12px rgba(0,212,255,0.3)' },
        }}>
          {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </IconButton>

        {/* Notifications */}
        <NotificationBell dark />

        {/* User menu */}
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
          <Avatar sx={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, #00D4FF, #7C3AED)',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 0 12px rgba(0,212,255,0.3)',
            border: '2px solid rgba(0,212,255,0.3)',
          }}>
            {user?.name?.charAt(0) || 'A'}
          </Avatar>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <Typography variant="body2">{user?.name || 'Admin'}</Typography>
          </MenuItem>
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">{user?.role || 'admin'}</Typography>
          </MenuItem>
          <MenuItem onClick={() => { logout(); setAnchorEl(null); }}>退出登录</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
