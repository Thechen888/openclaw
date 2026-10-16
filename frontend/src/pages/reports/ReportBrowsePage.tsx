import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Tooltip, Skeleton, Grid,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { reportShareApi } from '../../api/client';
import { PageHeader } from '../../components/shared';
import SharedReportView from './components/SharedReportView';

const scopeLabel = (s: string) => s === 'all' ? '全部结果' : s === 'once' ? '指定某一次' : '此时间之后';

export default function ReportBrowsePage() {
  const [viewShare, setViewShare] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['report-browse'],
    queryFn: () => reportShareApi.myBrowse(),
  });

  const items: any[] = data?.data?.data || [];

  return (
    <Box sx={{ px: 3, py: 3 }}>
      <PageHeader title="报告浏览" subtitle="查看他人分享或管理员发布的报告结果" />

      {isLoading ? (
        <Grid container spacing={2}>{[1, 2, 3].map(i => <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}><Card><CardContent><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></CardContent></Card></Grid>)}</Grid>
      ) : items.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary">暂无分享的报告</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>当有人向你分享报告结果后，会在这里显示</Typography>
        </CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((item: any, idx: number) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id || idx}>
              <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: '0 0 20px rgba(0,212,255,0.12)' }, border: '1px solid rgba(0,212,255,0.06)' }}
                onClick={() => setViewShare(item)}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 14, fontWeight: 700 }}>
                      {(item.report_title || '?').slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14 }}>{item.report_title}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                          {item.source === 'admin' ? '管理员发布' : item.granted_by_name + ' 分享'}
                        </Typography>
                        {item.source === 'admin' && <Chip label="管理员发布" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'warning.main', color: '#fff' }} />}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    <Chip label={scopeLabel(item.scope_type)} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  {item.note && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.note}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 查看分享结果 */}
      {viewShare && (
        <SharedReportView reportId={viewShare.report_id} shareId={viewShare.id} onClose={() => setViewShare(null)} />
      )}
    </Box>
  );
}
