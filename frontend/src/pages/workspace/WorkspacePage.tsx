import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, TextField,
  Table, TableHead, TableBody, TableRow, TableCell,
  InputAdornment, Tooltip, Pagination, MenuItem,
} from '@mui/material';
import {
  Search, Download,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/shared';
import { workspaceApi } from '../../api/client';

/* ─── 操作类型定义 ─── */
const ACTION_TYPES = [
  { value: 'all', label: '全部类型' },
  { value: 'kb_create', label: '创建知识库' },
  { value: 'kb_update', label: '编辑知识库' },
  { value: 'kb_delete', label: '删除知识库' },
  { value: 'kb_perm', label: '权限变更' },
  { value: 'doc_upload', label: '上传文档' },
  { value: 'doc_delete', label: '删除文档' },
  { value: 'doc_parse', label: '文档解析' },
  { value: 'faq_create', label: '创建 FAQ' },
  { value: 'faq_update', label: '编辑 FAQ' },
  { value: 'faq_delete', label: '删除 FAQ' },
  { value: 'chat_query', label: '知识库问答' },
  { value: 'wiki_edit', label: '编辑 Wiki' },
  { value: 'setting_change', label: '设置变更' },
];

const TYPE_COLORS: Record<string, string> = {
  kb_create: '#00E676', kb_update: '#00D4FF', kb_delete: '#FF3366',
  kb_perm: '#FFB800', doc_upload: '#00E676', doc_delete: '#FF3366',
  doc_parse: '#00D4FF', faq_create: '#00E676', faq_update: '#00D4FF',
  faq_delete: '#FF3366', chat_query: '#A78BFA', wiki_edit: '#00D4FF',
  setting_change: '#FFB800',
};

const TYPE_LABELS: Record<string, string> = {
  kb_create: '创建知识库', kb_update: '编辑知识库', kb_delete: '删除知识库',
  kb_perm: '权限变更', doc_upload: '上传文档', doc_delete: '删除文档',
  doc_parse: '文档解析', faq_create: '创建 FAQ', faq_update: '编辑 FAQ',
  faq_delete: '删除 FAQ', chat_query: '知识库问答', wiki_edit: '编辑 Wiki',
  setting_change: '设置变更',
};

/* ─── 页面 ─── */
export default function WorkspacePage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['kb-audit-logs', page, pageSize],
    queryFn: () => workspaceApi.auditLogs.list({ page, page_size: pageSize }),
  });
  const allLogs = logsData?.data?.data || [];
  const total = logsData?.data?.total || allLogs.length;

  const filtered = allLogs.filter((log: any) => {
    if (typeFilter !== 'all' && log.action_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.operator?.toLowerCase().includes(q) ||
        log.target?.toLowerCase().includes(q) ||
        log.detail?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Box>
      <PageHeader title="知识库日志" subtitle="记录所有知识库管理相关的操作审计日志" />

      {/* 筛选栏 */}
      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ display: 'flex', gap: 1.5, py: 2, px: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="搜索操作人 / 操作对象 / 详情..." value={search} onChange={e => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
            sx={{ minWidth: 260 }} />
          <TextField size="small" select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={{ minWidth: 150 }}>
            {ACTION_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" size="small" startIcon={<Download />}>导出日志</Button>
        </CardContent>
      </Card>

      {/* 日志表格 */}
      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 180 }}>操作时间</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 100 }}>操作人</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 120 }}>操作类型</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>操作对象</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>操作详情</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, width: 130 }}>IP 地址</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>加载中...</Typography></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>暂无日志记录</Typography></TableCell></TableRow>
            ) : (
              filtered.map((log: any) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, fontFamily: 'monospace', color: 'text.secondary' }}>{log.created_at}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF',
                      }}>
                        {log.avatar || log.operator?.charAt(0)?.toUpperCase() || '?'}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{log.operator}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[log.action_type] || log.action_type} size="small"
                      sx={{ height: 20, fontSize: 10, fontWeight: 600, color: TYPE_COLORS[log.action_type] || '#B0BEC5', borderColor: `${TYPE_COLORS[log.action_type] || '#B0BEC5'}40` }}
                      variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>{log.target}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>{log.detail}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary' }}>{log.ip}</Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        {total > pageSize && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
            <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, v) => setPage(v)} size="small" color="primary" />
          </Box>
        )}
      </Card>
    </Box>
  );
}
