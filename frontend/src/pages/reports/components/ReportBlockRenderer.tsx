import {
  Box, Card, Typography, Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';

/**
 * 共享报告 block 渲染器 — ReportViewPage / SharedReportView 共用
 */
export default function ReportBlockRenderer({ blocks }: { blocks: any[] }) {
  if (!blocks || blocks.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">该报告暂无内容数据</Typography>
      </Card>
    );
  }

  return (
    <>
      {blocks.map((block: any) => {
        switch (block.type) {
          case 'metrics_card':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{block.title}</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {(block.data || []).map((m: any, i: number) => (
                    <Box key={i} sx={{ minWidth: 120 }}>
                      <Typography variant="caption" color="text.secondary">{m.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{m.unit}</Typography>
                      </Box>
                      {m.change !== undefined && (
                        <Typography variant="caption" sx={{
                          color: m.change >= 0 ? 'success.main' : 'error.main',
                          fontSize: 11,
                        }}>
                          {m.change >= 0 ? '↑' : '↓'} {Math.abs(m.change)}%
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Card>
            );
          case 'chart_image':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Box sx={{
                  height: 180, borderRadius: 1,
                  bgcolor: 'rgba(0,212,255,0.04)',
                  border: '1px dashed rgba(0,212,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography variant="body2" color="text.disabled">
                    {block.data?.alt || block.title || '图表区域'}
                  </Typography>
                </Box>
                {block.data?.caption && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {block.data.caption}
                  </Typography>
                )}
              </Card>
            );
          case 'data_table':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {(block.data?.headers || []).map((h: string, i: number) => (
                          <TableCell key={i} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(block.data?.rows || []).map((row: any[], ri: number) => (
                        <TableRow key={ri} hover>
                          {row.map((cell: any, ci: number) => (
                            <TableCell key={ci} sx={{ fontSize: 12 }}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Card>
            );
          case 'rich_text':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {block.data?.content || ''}
                </Typography>
              </Card>
            );
          case 'bullet_list':
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{block.title}</Typography>
                {(block.data?.items || []).map((item: string, i: number) => (
                  <Typography key={i} variant="body2" color="text.secondary" sx={{ mb: 0.5, pl: 1.5, position: 'relative', '&::before': { content: '"•"', position: 'absolute', left: 0, color: 'primary.main' } }}>
                    {item}
                  </Typography>
                ))}
              </Card>
            );
          default:
            return (
              <Card key={block.block_id} sx={{ p: 2.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{block.title}</Typography>
              </Card>
            );
        }
      })}
    </>
  );
}
