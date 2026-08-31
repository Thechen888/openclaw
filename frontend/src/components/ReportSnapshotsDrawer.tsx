import { useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Collapse, Divider,
} from '@mui/material';
import { Close, ExpandMore, History } from '@mui/icons-material';
import type { ReportDataSnapshot } from '../pages/weekly/report-engine/types';

interface ReportSnapshotsDrawerProps {
  open: boolean;
  onClose: () => void;
  snapshots: ReportDataSnapshot[];
  reportName: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 生成记录抽屉 — 只读展示 ReportDataSnapshot 列表
 */
export default function ReportSnapshotsDrawer({ open, onClose, snapshots, reportName }: ReportSnapshotsDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 420,
            bgcolor: '#fff',
            borderLeft: '2px solid #333',
            color: '#1a1a2e',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 标题栏 */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', bgcolor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History fontSize="small" sx={{ color: '#374151' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>生成记录</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>

        {/* 报告名称 */}
        <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f8f9fa', borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="body2" sx={{ color: '#374151' }}>
            报告：<strong style={{ color: '#111827' }}>{reportName}</strong>
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
            共 {snapshots.length} 条快照记录
          </Typography>
        </Box>

        {/* 快照列表 */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>
          {snapshots.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#6b7280' }}>
              <History sx={{ fontSize: 40, mb: 1, color: '#9ca3af' }} />
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>暂无生成记录</Typography>
            </Box>
          ) : (
            [...snapshots].reverse().map((snap, idx) => (
              <Box key={snap.id} sx={{ mb: 1.5 }}>
                <Box
                  onClick={() => toggleExpand(snap.id)}
                  sx={{
                    px: 2, py: 1.5, bgcolor: '#fff', borderRadius: 1.5,
                    border: '1px solid #d1d5db', cursor: 'pointer',
                    '&:hover': { borderColor: '#3b82f6', bgcolor: '#f0f7ff' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                      #{snapshots.length - idx} {snap.period || '（未知周期）'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                        {formatTime(snap.generatedAt)}
                      </Typography>
                      <ExpandMore sx={{ fontSize: 16, color: '#4b5563', transform: expandedId === snap.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </Box>
                  </Box>
                  {snap.note && (
                    <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {snap.note}
                    </Typography>
                  )}
                </Box>
                <Collapse in={expandedId === snap.id}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: '#f1f5f9', borderRadius: '0 0 8px 8px', border: '1px solid #d1d5db', borderTop: 'none', mt: -1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: '#1e293b' }}>数据预览：</Typography>
                    <Box
                      component="pre"
                      sx={{
                        m: 0, fontSize: 11, fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        color: '#1e293b', maxHeight: 300, overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(snap.data, null, 2)}
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
