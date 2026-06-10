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
    return location.pathname.startsWith(path);
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', pt: 1 }}>
      {/* Logo */}
      <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>
          OC
        </Box>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            OpenClaw
          </Typography>
        )}
      </Box>

      <Divider sx={{ mx: collapsed ? 1 : 2 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {navConfig.map((section, si) => (
          <React.Fragment key={si}>
            {section.label && !collapsed && (
              <Typography
                variant="caption"
                sx={{
                  px: 3, py: 1.5, display: 'block',
                  color: 'text.secondary', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10,
                }}
              >
                {section.label}
              </Typography>
            )}
            {section.label && collapsed && <Divider sx={{ mx: 1.5, my: 1 }} />}
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
                        bgcolor: active ? 'primary.main' : 'transparent',
                        color: active ? 'white' : 'text.primary',
                        '&:hover': {
                          bgcolor: active ? 'primary.dark' : 'action.hover',
                        },
                        position: 'relative',
                        ...(active && {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: collapsed ? -4 : -8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 3,
                            height: 20,
                            borderRadius: 1,
                            bgcolor: 'primary.main',
                          },
                        }),
                      }}
                    >
                      <ListItemIcon sx={{
                        color: active ? 'white' : 'text.secondary',
                        minWidth: collapsed ? 0 : 36,
                        justifyContent: 'center',
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

      {/* Collapse toggle */}
      <Divider sx={{ mx: collapsed ? 1 : 2 }} />
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton onClick={toggleCollapse} size="small" sx={{ color: 'text.secondary' }}>
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
