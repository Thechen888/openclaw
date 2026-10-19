import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Tooltip, Skeleton, Tab, Tabs,
  TextField, InputAdornment, IconButton, Table, TableHead, TableBody, TableRow, TableCell, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio,
} from '@mui/material';
import { Search, Delete, Visibility, Edit, IosShare } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { reportShareApi } from '../../api/client';
import { PageHeader } from '../../components/shared';
import SharedReportView from './components/SharedReportView';
import ShareResultDialog from './components/ShareResultDialog';

const scopeLabel = (s: string) => s === 'all' ? '全部结果' : s === 'once' ? '指定某一次' : '此时间之后';

export default function ReportBrowsePage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [search, setSearch] = useState('');

  // 编辑分享对话框
  const [editShare, setEditShare] = useState<any>(null);
  // 再次分享对话框
  const [reshareItem, setReshareItem] = useState<any>(null);
  // 查看分享预览（我分享的 Tab 内）
  const [viewShare, setViewShare] = useState<any>(null);

  // 收到的分享
  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ['report-browse'],
    queryFn: () => reportShareApi.myBrowse(),
  });
  const browseItems: any[] = browseData?.data?.data || [];

  // 我分享的
  const { data: mySharesData, isLoading: mySharesLoading } = useQuery({
    queryKey: ['my-shares'],
    queryFn: () => reportShareApi.mine(),
  });
  const myShares: any[] = mySharesData?.data?.data || [];

  const filteredBrowse = browseItems.filter(item =>
    !search || (item.report_title || '').toLowerCase().includes(search.toLowerCase())
  );

  const revokeMutation = useMutation({
    mutationFn: ({ reportId, shareId }: { reportId: string; shareId: string }) => reportShareApi.remove(reportId, shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-shares'] });
      enqueueSnackbar('已撤销分享', { variant: 'success' });
    },
  });

  // 查看分享结果（我分享的 Tab）
  const { data: viewShareData, isLoading: viewShareLoading } = useQuery({
    queryKey: ['share-view-preview', viewShare?.report_id, viewShare?.id],
    queryFn: () => reportShareApi.sharedView(viewShare.report_id, viewShare.id),
    enabled: !!viewShare,
  });

  return (
    <Box sx={{ px: 3, py: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="报告浏览" subtitle="查看他人分享或管理员发布的报告结果" />

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setSelectedItem(null); setViewShare(null); }} sx={{ mb: 2, minHeight: 36 }}>
        <Tab label="收到的分享" sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600 }} />
        <Tab label="我分享的" sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0 }}>
          {/* 左侧目录 */}
          <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField size="small" placeholder="搜索报告..." value={search} onChange={e => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'rgba(0,212,255,0.5)' }} /></InputAdornment> } }}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(5,5,7,0.5)' } }} />
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {browseLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 1 }} />)
              ) : filteredBrowse.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>暂无分享的报告</Typography>
              ) : (
                filteredBrowse.map((item: any) => (
                  <Card key={item.id} sx={{ mb: 1, cursor: 'pointer', border: selectedItem?.id === item.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(0,212,255,0.06)', bgcolor: selectedItem?.id === item.id ? 'rgba(0,212,255,0.05)' : undefined, '&:hover': { boxShadow: '0 0 12px rgba(0,212,255,0.1)' } }}
                    onClick={() => setSelectedItem(item)}>
                    <CardContent sx={{ py: 1.5, px: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Avatar sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: 12, fontWeight: 700 }}>
                          {(item.report_title || '?').slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.report_title}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {item.source === 'admin' ? (
                          <Chip label="管理员发布" size="small" sx={{ fontSize: 9, height: 16, bgcolor: 'warning.main', color: '#fff' }} />
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{item.granted_by_name} 分享</Typography>
                        )}
                        <Chip label={scopeLabel(item.scope_type)} size="small" variant="outlined" sx={{ fontSize: 9, height: 16, ml: 'auto' }} />
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Box>

          {/* 右侧查看器 */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {selectedItem ? (
              <SharedReportView reportId={selectedItem.report_id} shareId={selectedItem.id} onClose={() => setSelectedItem(null)} />
            ) : (
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">选择一份报告查看</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>从左侧列表中选择报告查看详情</Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2 }}>
          {/* 左侧列表 */}
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
            {mySharesLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : myShares.length === 0 ? (
              <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary">暂无分享记录</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: 13 }}>在「我安装的」报告中可分享结果给他人</Typography>
              </CardContent></Card>
            ) : (
              <Card>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>报告名</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>关系</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>目标</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>范围</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>时间</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>备注</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 12, width: 160 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {myShares.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{s.report_title}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}><Chip label={s.relation === 'created' ? '我创建的' : '我安装的'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{s.target_name} <Chip label={s.target_type === 'user' ? '人员' : s.target_type === 'dept' ? '部门' : '角色'} size="small" sx={{ fontSize: 9, height: 16, ml: 0.5 }} /></TableCell>
                        <TableCell><Chip label={scopeLabel(s.scope_type)} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} /></TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.note || '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="查看">
                              <IconButton size="small" sx={{ color: '#00D4FF' }} onClick={() => setViewShare(s)}><Visibility fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="编辑">
                              <IconButton size="small" sx={{ color: '#f59e0b' }} onClick={() => setEditShare(s)}><Edit fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="再次分享">
                              <IconButton size="small" sx={{ color: '#6366f1' }} onClick={() => setReshareItem(s)}><IosShare fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="撤销">
                              <IconButton size="small" color="error" onClick={() => revokeMutation.mutate({ reportId: s.report_id, shareId: s.id })}><Delete fontSize="small" /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Box>

          {/* 右侧查看器（我分享的 Tab 内查看） */}
          {viewShare && (
            <Box sx={{ width: 480, flexShrink: 0 }}>
              {viewShareLoading ? (
                <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
              ) : viewShareData?.data?.data?.report ? (
                <SharedReportView
                  reportId={viewShare.report_id}
                  shareId={viewShare.id}
                  onClose={() => setViewShare(null)}
                />
              ) : null}
            </Box>
          )}
        </Box>
      )}

      {/* 编辑分享对话框 */}
      {editShare && <EditShareDialog share={editShare} onClose={() => setEditShare(null)} />}

      {/* 再次分享对话框 */}
      {reshareItem && (
        <ShareResultDialog
          reportId={reshareItem.report_id}
          reportTitle={reshareItem.report_title}
          onClose={() => { setReshareItem(null); qc.invalidateQueries({ queryKey: ['my-shares'] }); }}
        />
      )}
    </Box>
  );
}

/* ========== 编辑分享对话框 ========== */
function EditShareDialog({ share, onClose }: { share: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [scopeType, setScopeType] = useState(share.scope_type || 'all');
  const [runId, setRunId] = useState(share.run_id || '');
  const [sinceDate, setSinceDate] = useState(share.since_date || '');
  const [note, setNote] = useState(share.note || '');

  // 获取期次列表（scope_type === 'once' 时需要）
  const { data: runsData } = useQuery({
    queryKey: ['edit-share-runs', share.report_id],
    queryFn: () => reportShareApi.runs(share.report_id),
    enabled: scopeType === 'once',
  });
  const runs: any[] = runsData?.data?.data || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => reportShareApi.update(share.report_id, share.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-shares'] });
      enqueueSnackbar('已更新分享', { variant: 'success' });
      onClose();
    },
    onError: (err: any) => enqueueSnackbar(err?.response?.data?.message || '更新失败', { variant: 'error' }),
  });

  const handleSave = () => {
    const payload: any = { scope_type: scopeType, note };
    if (scopeType === 'once') payload.run_id = runId;
    if (scopeType === 'since') payload.since_date = sinceDate;
    updateMutation.mutate(payload);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>编辑分享 — {share.report_title}</DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>分享范围</Typography>
        <RadioGroup value={scopeType} onChange={e => setScopeType(e.target.value)}>
          <FormControlLabel value="all" control={<Radio size="small" />} label="全部结果" />
          <FormControlLabel value="once" control={<Radio size="small" />} label="指定某一次" />
          {scopeType === 'once' && (
            <TextField select size="small" value={runId} onChange={e => setRunId(e.target.value)} sx={{ ml: 4, mb: 1, minWidth: 200 }} label="选择期次">
              {runs.map(r => (
                <option key={r.id} value={r.id}>{r.period_label} ({new Date(r.finished_at).toLocaleDateString()})</option>
              ))}
            </TextField>
          )}
          <FormControlLabel value="since" control={<Radio size="small" />} label="此时间之后" />
          {scopeType === 'since' && (
            <TextField type="date" size="small" value={sinceDate} onChange={e => setSinceDate(e.target.value)} sx={{ ml: 4, mb: 1 }} slotProps={{ inputLabel: { shrink: true } }} />
          )}
        </RadioGroup>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>备注</Typography>
        <TextField fullWidth multiline rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="可选备注..." size="small" />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontSize: 11 }}>
          目标对象的增删请用「再次分享」追加、用「撤销」移除单个目标
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>保存</Button>
      </DialogActions>
    </Dialog>
  );
}
