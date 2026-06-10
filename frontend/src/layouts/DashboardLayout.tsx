import { Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from './Sidebar/Sidebar';
import Header from './Header/Header';
import { useSidebarStore } from '../stores/sidebarStore';

export default function DashboardLayout() {
  const theme = useTheme();
  const { collapsed } = useSidebarStore();
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
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
