import { Box, Typography, Paper } from '@mui/material';
import { CloudSync, HourglassEmpty } from '@mui/icons-material';
import { PageHeader } from '../../components/shared';

export default function CloudForwardPage() {
  return (
    <Box>
      <PageHeader title="云版转发" subtitle="将平台数据同步转发至云端实例" />
      <Paper sx={{ p: 6, textAlign: 'center', mt: 2 }}>
        <HourglassEmpty sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          功能规划中
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          云版转发功能正在设计中，该模块将支持将本地平台的数据、配置和运行状态同步转发至云端实例，
          实现混合云部署下的数据互通。具体方案待确定后上线。
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <CloudSync sx={{ fontSize: 20, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled">
            待方案确定后开发
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
