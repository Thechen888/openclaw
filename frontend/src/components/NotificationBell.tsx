import { useState } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Button,
} from '@mui/material';
import {
  Notifications, Gavel, Share, Shield, CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/client';

// 相对时间函数
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString();
}

// 类型图标映射
const typeIconMap: Record<string, { icon: typeof Gavel; color: string }> = {
  approval: { icon: Gavel, color: '#f59e0b' },
  share: { icon: Share, color: '#6366f1' },
  collab: { icon: Share, color: '#6366f1' },
  permission: { icon: Shield, color: '#3b82f6' },
  system: { icon: Notifications, color: '#9ca3af' },
};

interface NotificationBellProps {
  /** 深色主题（后台）或浅色主题（前台） */
  dark?: boolean;
  /** Popover 弹出方向：'down' 向下（默认），'up' 向上浮出 */
  placement?: 'down' | 'up';
}

export default function NotificationBell({ dark = false, placement = 'down' }: NotificationBellProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30000,
  });
  const notifications: any[] = data?.data?.data || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = (n: any) => {
    if (!n.read) markReadMut.mutate(n.id);
    setAnchorEl(null);
    const kind = n.action_kind;
    const tid = n.target_id;
    if (kind === 'chat' && n.session_id) {
      navigate(`/chat/${n.session_id}`);
    } else if (kind === 'skill' && tid) {
      navigate(`/skills/${tid}/detail`);
    } else if (kind === 'agent' && tid) {
      navigate(`/agents/${tid}`);
    } else if (kind === 'report' && tid) {
      navigate(`/reports/view/${tid}`);
    } else if (kind === 'workflow') {
      navigate('/workflows/my');
    }
    // action_kind === 'none' → no navigation
  };

  const textColor = dark ? '#e4e4e7' : '#18181b';
  const subColor = dark ? '#71717a' : '#71717a';
  const hoverBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          color: dark ? 'text.secondary' : '#a1a1aa',
          position: 'relative',
          width: 28,
          height: 28,
          transition: 'all 0.2s',
          '&:hover': { color: dark ? '#00D4FF' : '#6366f1', bgcolor: hoverBg },
        }}
      >
        <Notifications sx={{ fontSize: 16 }} />
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            max={99}
            sx={{
              position: 'absolute',
              top: -2,
              right: -2,
              '& .MuiBadge-badge': {
                fontSize: 9,
                height: 16,
                minWidth: 16,
                padding: '0 4px',
                bgcolor: '#ef4444',
                color: 'white',
                border: '1.5px solid',
                borderColor: dark ? '#0a0a0f' : '#ffffff',
              },
            }}
          />
        )}
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={placement === 'up' ? { vertical: 'top', horizontal: 'left' } : { horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={placement === 'up' ? { vertical: 'bottom', horizontal: 'left' } : { horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              width: 380,
              maxHeight: 480,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: borderColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: dark ? '#1a1b23' : '#ffffff',
            },
          },
        }}
      >
        {/* 头部 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: borderColor,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: textColor }}>
            通知{unreadCount > 0 ? `（未读 ${unreadCount}）` : ''}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={() => markAllReadMut.mutate(undefined)}
              sx={{ fontSize: 12, textTransform: 'none', color: '#6366f1', fontWeight: 500, minWidth: 'auto', p: 0 }}
            >
              全部已读
            </Button>
          )}
        </Box>

        {/* 列表 */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Notifications sx={{ fontSize: 36, color: subColor, opacity: 0.4 }} />
              <Typography sx={{ fontSize: 13, color: subColor }}>暂无通知</Typography>
            </Box>
          ) : (
            notifications.map((n) => {
              const typeInfo = typeIconMap[n.type] || typeIconMap.system;
              const TypeIcon = typeInfo.icon;
              const isClickable = n.action_kind && n.action_kind !== 'none';
              return (
                <Box
                  key={n.id}
                  onClick={() => handleClick(n)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    px: 2.5,
                    py: 1.5,
                    cursor: isClickable ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    '&:hover': isClickable ? { bgcolor: hoverBg } : {},
                    borderBottom: '1px solid',
                    borderColor: borderColor,
                  }}
                >
                  {/* 类型图标 */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${typeInfo.color}15`,
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <TypeIcon sx={{ fontSize: 16, color: typeInfo.color }} />
                  </Box>

                  {/* 内容 */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: n.read ? 400 : 600,
                        color: textColor,
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: subColor,
                        lineHeight: 1.5,
                        mt: 0.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.content}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                      {n.from_name && (
                        <Typography sx={{ fontSize: 11, color: subColor }}>{n.from_name}</Typography>
                      )}
                      <Typography sx={{ fontSize: 11, color: subColor }}>
                        {relativeTime(n.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 未读类型色点 */}
                  {!n.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: typeInfo.color,
                        flexShrink: 0,
                        mt: 0.75,
                      }}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
}
