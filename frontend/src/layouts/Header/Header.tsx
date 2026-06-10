import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem,
  Breadcrumbs, Link, useTheme, Chip,
} from '@mui/material';
import { Menu as MenuIcon, DarkMode, LightMode, Notifications } from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useSidebarStore } from '../../stores/sidebarStore';
import { navConfig } from '../Sidebar/navConfig';

export default function Header() {
  const theme = useTheme();
  const location = useLocation();
  const { mode, toggleMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { setMobileOpen, collapsed } = useSidebarStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Build breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ title: '首页', path: '/' }];
  let currentPath = '';
  for (const seg of pathSegments) {
    currentPath += `/${seg}`;
    const navItem = navConfig.flatMap(s => s.items).find(i => i.path === currentPath);
    breadcrumbs.push({ title: navItem?.title || seg.charAt(0).toUpperCase() + seg.slice(1), path: currentPath });
  }

  // Find current page title
  const currentPage = navConfig.flatMap(s => s.items).find(i => i.path === location.pathname);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(10,11,13,0.85)' : 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid',
        borderColor: 'divider',
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
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16 }}>
            {currentPage?.title || '仪表盘'}
          </Typography>
          {pathSegments.length > 0 && (
            <Breadcrumbs sx={{ display: { xs: 'none', sm: 'flex' } }}>
              {breadcrumbs.map((crumb, i) => (
                i === breadcrumbs.length - 1 ? (
                  <Typography key={crumb.path} variant="caption" color="text.secondary">
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
                  >
                    {crumb.title}
                  </Link>
                )
              ))}
            </Breadcrumbs>
          )}
        </Box>

        {/* Environment badge */}
        <Chip label="开发" size="small" color="warning" variant="outlined"
          sx={{ display: { xs: 'none', sm: 'flex' }, height: 22, fontSize: 11 }} />

        {/* Theme toggle */}
        <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.secondary' }}>
          {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </IconButton>

        {/* Notifications */}
        <IconButton size="small" sx={{ color: 'text.secondary', position: 'relative' }}>
          <Notifications fontSize="small" />
          <Box sx={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: 'error.main', border: '2px solid', borderColor: 'background.paper',
          }} />
        </IconButton>

        {/* User menu */}
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 13 }}>
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
