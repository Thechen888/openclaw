import React from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Box, IconButton, Divider, useTheme, Toolbar,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MenuOpen } from '@mui/icons-material';
import { useSidebarStore } from '../../stores/sidebarStore';
import { navConfig } from './navConfig';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

export default function Sidebar() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, mobileOpen, toggleCollapse, setMobileOpen } = useSidebarStore();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    // 精确匹配
    if (location.pathname === path) return true;
    // 前缀匹配：仅用于动态子路由（如 /resources/k8s/:id）
    if (location.pathname.startsWith(path + '/')) {
      // 若存在更精确的菜单项匹配当前路径，则当前项不应高亮
      const hasMoreSpecificMatch = navConfig.some(section =>
        section.items.some(item =>
          item.path !== path &&
          item.path.length > path.length &&
          (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
        )
      );
      return !hasMoreSpecificMatch;
    }
    return false;
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 1, position: 'relative', overflow: 'hidden' }}>
      {/* 侧边栏背景装饰 */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(180deg, rgba(0,212,255,0.03) 0%, transparent 30%, transparent 70%, rgba(124,58,237,0.02) 100%)',
      }} />
      <Box sx={{
        position: 'absolute', top: '15%', left: '-30%',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      {/* Logo */}
      <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, position: 'relative', zIndex: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          background: 'linear-gradient(135deg, #00D4FF, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0,
          animation: 'logoGlow 3s ease-in-out infinite',
        }}>
          OC
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="h6" sx={{
              fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
              background: 'linear-gradient(90deg, #E8ECF0, #00D4FF)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}>
              OpenClaw
            </Typography>
            <Typography variant="caption" sx={{
              color: 'rgba(0,212,255,0.35)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              AI Platform
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: collapsed ? 1 : 2, borderColor: 'rgba(0,212,255,0.08)' }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {navConfig.map((section, si) => (
          <React.Fragment key={si}>
            {section.label && !collapsed && (
              <Typography
                variant="caption"
                sx={{
                  px: 3, py: 1.5, display: 'block',
                  color: 'rgba(0,212,255,0.65)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10,
                }}
              >
                {section.label}
              </Typography>
            )}
            {section.label && collapsed && <Divider sx={{ mx: 1.5, my: 1, borderColor: 'rgba(0,212,255,0.08)' }} />}
            <List disablePadding>
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItem key={item.path} disablePadding sx={{ px: collapsed ? 1 : 1.5, py: 0.25 }}>
                    <ListItemButton
                      onClick={() => { navigate(item.path); setMobileOpen(false); }}
                      sx={{
                        borderRadius: 1.5,
                        py: 0.75,
                        px: collapsed ? 1 : 2,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        bgcolor: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                        color: active ? '#00D4FF' : 'text.primary',
                        border: active ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
                        boxShadow: active ? '0 0 15px rgba(0,212,255,0.08)' : 'none',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          bgcolor: active ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.04)',
                          borderColor: 'rgba(0,212,255,0.12)',
                        },
                        position: 'relative',
                        ...(active && {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: collapsed ? -4 : -8,
                            top: '20%',
                            height: '60%',
                            width: 3,
                            borderRadius: 2,
                            background: 'linear-gradient(180deg, #00D4FF, #7C3AED)',
                            boxShadow: '0 0 8px rgba(0,212,255,0.5)',
                          },
                        }),
                      }}
                    >
                      <ListItemIcon sx={{
                        color: active ? '#00D4FF' : 'rgba(255,255,255,0.55)',
                        minWidth: collapsed ? 0 : 36,
                        justifyContent: 'center',
                        transition: 'color 0.25s ease',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.title}
                          slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: active ? 600 : 400 } } }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </React.Fragment>
        ))}
      </Box>

      {/* Collapse toggle + Status */}
      <Divider sx={{ mx: collapsed ? 1 : 2, borderColor: 'rgba(0,212,255,0.08)' }} />
      {!collapsed && (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00FF88', boxShadow: '0 0 8px #00FF88' }} />
            <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.6)', fontSize: 10 }}>系统运行正常</Typography>
          </Box>
          <Box sx={{
            px: 1.5, py: 1, borderRadius: 1.5,
            bgcolor: 'rgba(0,212,255,0.04)',
            border: '1px solid rgba(0,212,255,0.08)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'rgba(200,210,220,0.55)', fontSize: 10 }}>API 配额</Typography>
              <Typography variant="caption" sx={{ color: '#00D4FF', fontSize: 10, fontFamily: 'monospace' }}>67%</Typography>
            </Box>
            <Box sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', overflow: 'hidden' }}>
              <Box sx={{ width: '67%', height: '100%', borderRadius: 2, bgcolor: '#00D4FF', boxShadow: '0 0 6px rgba(0,212,255,0.4)' }} />
            </Box>
          </Box>
        </Box>
      )}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton onClick={toggleCollapse} size="small" sx={{
          color: 'text.secondary',
          transition: 'all 0.25s ease',
          '&:hover': { color: '#00D4FF', boxShadow: '0 0 12px rgba(0,212,255,0.15)' },
        }}>
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.default' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
            transition: 'width 0.2s ease',
            overflowX: 'hidden',
            bgcolor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
