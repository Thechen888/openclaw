import { Box } from '@mui/material';
import { PageHeader } from '../../components/shared';
import WeeklyReportsPage from '../weekly/WeeklyReportsPage';

/**
 * 我创建的报告 — 复用 WeeklyReportsPage 的完整功能，顶部添加页面标题
 */
export default function ReportMyPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', px: 3, py: 3 }}>
      <PageHeader title="我创建的报告" subtitle="管理你创建的报告模板与生成任务" />
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <WeeklyReportsPage />
      </Box>
    </Box>
  );
}
