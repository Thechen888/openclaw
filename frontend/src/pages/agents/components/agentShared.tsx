import {
  Box, Card, Typography, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Avatar,
} from '@mui/material';
import {
  AccountTree, Chat, MoreVert, Edit, Delete, Security, PlayArrow, SmartToy,
} from '@mui/icons-material';
import { useState } from 'react';
import { StatusBadge } from '../../../components/shared';

// ===================== Agent 类型元数据 =====================
export type AgentType = 'workflow' | 'chat';

export const AGENT_TYPE_META: Record<AgentType, {
  label: string;
  short: string;
  icon: React.ReactElement;
  color: string;
  gradient: string;
  desc: string;
}> = {
  workflow: {
    label: '工作流 Agent',
    short: '工作流',
    icon: <AccountTree />,
    color: '#00D4FF',
    gradient: 'linear-gradient(135deg, #00D4FF, #0EA5E9)',
    desc: '通过拖拽节点与连线编排复杂流程，支持条件、循环、多步骤自动化',
  },
  chat: {
    label: '对话 Agent',
    short: '对话',
    icon: <Chat />,
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    desc: '面向对话交互，配置提示词、知识库与技能，右侧实时调试预览',
  },
};

export const getTypeMeta = (t?: string) => AGENT_TYPE_META[(t as AgentType)] || AGENT_TYPE_META.workflow;

// ===================== 协作者角色 =====================
export type CollaboratorRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'chat_only';

export const ROLE_META: Record<CollaboratorRole, { label: string; color: any; desc: string }> = {
  owner: { label: '拥有者', color: 'primary', desc: '完全控制，可转让与删除' },
  admin: { label: '管理', color: 'secondary', desc: '可管理协作者与配置' },
  editor: { label: '可编辑', color: 'info', desc: '可编辑配置与工作流' },
  viewer: { label: '只读', color: 'default', desc: '仅可查看配置与运行记录' },
  chat_only: { label: '仅对话', color: 'success', desc: '仅可在前台使用对话' },
};

export const getRoleMeta = (r?: string) => ROLE_META[(r as CollaboratorRole)] || ROLE_META.viewer;

// ===================== 时间格式化 =====================
export const formatTime = (t?: string) => (t ? new Date(t).toLocaleString('zh-CN', { hour12: false }) : '从未');

export const relativeTime = (t?: string) => {
  if (!t) return '从未运行';
  const diff = Date.now() - new Date(t).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
};

// ===================== Agent 头像 =====================
export function AgentAvatar({ agent, size = 44 }: { agent: any; size?: number }) {
  const meta = getTypeMeta(agent?.agent_type);
  return (
    <Avatar
      sx={{
        width: size, height: size,
        background: agent?.avatar_color
          ? `linear-gradient(135deg, ${agent.avatar_color}, ${agent.avatar_color}99)`
          : meta.gradient,
        boxShadow: `0 4px 14px ${meta.color}44`,
      }}
    >
      {meta.icon}
    </Avatar>
  );
}

// ===================== Agent 卡片 =====================
export function AgentCard({
  agent, onClick, onEdit, onDelete, onPermission, onRun,
}: {
  agent: any;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPermission?: () => void;
  onRun?: () => void;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const meta = getTypeMeta(agent.agent_type);

  const closeMenu = () => setAnchor(null);
  const act = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); setAnchor(null); fn?.(); };

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2, cursor: 'pointer', minHeight: 148, position: 'relative',
        display: 'flex', flexDirection: 'column',
        border: '1px solid', borderColor: 'divider',
        transition: 'all 0.25s',
        '&:hover': {
          borderColor: meta.color,
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${meta.color}18`,
          '& .card-menu-btn': { opacity: 1 },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1 }}>
        <AgentAvatar agent={agent} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
            <Chip
              size="small"
              label={meta.short}
              sx={{
                height: 18, fontSize: 10, fontWeight: 600,
                color: meta.color, bgcolor: `${meta.color}1f`, border: `1px solid ${meta.color}55`,
              }}
            />
            <StatusBadge status={agent.status} />
          </Box>
        </Box>
        <IconButton
          size="small"
          className="card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
          sx={{ opacity: 0, transition: 'opacity 0.2s' }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          flex: 1, mb: 1, fontSize: 12.5, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {agent.description || '暂无描述'}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <SmartToy sx={{ fontSize: 13, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11 }}>
            {agent.owner_name || '—'} · {agent.owner_type === 'organization' ? '组织' : '个人'}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
          {relativeTime(agent.last_run_at)}
        </Typography>
      </Box>

      <Menu anchorEl={anchor} open={!!anchor} onClose={closeMenu} onClick={(e) => e.stopPropagation()}>
        {onRun && (
          <MenuItem onClick={act(onRun)}>
            <ListItemIcon><PlayArrow fontSize="small" /></ListItemIcon>
            <ListItemText>立即运行</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={act(onEdit)}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>编辑</ListItemText>
        </MenuItem>
        <MenuItem onClick={act(onPermission)}>
          <ListItemIcon><Security fontSize="small" /></ListItemIcon>
          <ListItemText>权限协作</ListItemText>
        </MenuItem>
        <MenuItem onClick={act(onDelete)} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}
