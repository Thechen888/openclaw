import { Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from './Sidebar/Sidebar';
import Header from './Header/Header';
import { useSidebarStore } from '../stores/sidebarStore';

export default function DashboardLayout() {
  const theme = useTheme();
  const { collapsed } = useSidebarStore();
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', position: 'relative' }}>
      {/* 全局视觉背景层 —— 仅深色模式 */}
      {isDark && (
        <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {/* 网格线背景 */}
          <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }} />
          {/* 左上光晕 */}
          <Box sx={{
            position: 'absolute', top: '-10%', left: '5%',
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
          {/* 右下光晕 */}
          <Box sx={{
            position: 'absolute', bottom: '-5%', right: '10%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }} />
          {/* 中部横向扫描线 */}
          <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.008) 3px, rgba(0,212,255,0.008) 4px)',
          }} />
        </Box>
      )}

      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          transition: 'margin-left 0.2s ease, width 0.2s ease',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Header />
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, maxWidth: 1400, width: '100%', mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
