import { useState } from 'react';
import {
  Menu, MenuItem, ListItemIcon, ListItemText, IconButton, Tooltip,
} from '@mui/material';
import {
  MoreVert, Edit, Delete, Send, CloudOff, PersonAdd, PlayArrow, History,
} from '@mui/icons-material';

/**
 * 各状态对应的可用操作按钮
 * 与 Skill 模块 STATUS_ACTIONS 保持一致
 */
export const STATUS_ACTIONS: Record<string, string[]> = {
  draft: ['edit', 'publish', 'share', 'delete'],
  pending: ['cancel', 'delete'],
  published: ['edit', 'delist', 'publish_new', 'share', 'delete'],
  modified: ['edit', 'publish', 'share', 'delete'],
  rejected: ['edit', 'publish', 'share', 'delete'],
  delisted: ['edit', 'publish', 'share', 'delete'],
};

/** 操作按钮元数据 */
export const ACTION_META: Record<string, { icon: React.ReactNode; label: string; color?: string }> = {
  edit: { icon: <Edit fontSize="small" />, label: '编辑', color: 'text.secondary' },
  publish: { icon: <Send fontSize="small" />, label: '发布', color: 'primary.main' },
  publish_new: { icon: <Send fontSize="small" />, label: '发布新版本', color: 'primary.main' },
  delist: { icon: <CloudOff fontSize="small" />, label: '下架', color: 'warning.main' },
  share: { icon: <PersonAdd fontSize="small" />, label: '分享', color: 'info.main' },
  cancel: { icon: <CloudOff fontSize="small" />, label: '撤回', color: 'text.secondary' },
  delete: { icon: <Delete fontSize="small" />, label: '删除', color: 'error.main' },
  run: { icon: <PlayArrow fontSize="small" />, label: '立即运行', color: 'success.main' },
  debug: { icon: <PlayArrow fontSize="small" />, label: '调试', color: 'info.main' },
  run_records: { icon: <History fontSize="small" />, label: '运行记录', color: 'text.secondary' },
};

export interface ResourceActionsMenuProps {
  /** 资源状态 */
  status: string;
  /** 额外操作（如工作流的调试） */
  extraActions?: string[];
  /** 操作回调 */
  onAction: (action: string) => void;
  /** 是否显示为按钮组（true）或菜单（false） */
  asButtons?: boolean;
}

/**
 * 资源操作菜单组件
 * 用于智能体、工作流、报告、技能的"我创建的"列表
 */
export default function ResourceActionsMenu({
  status,
  extraActions = [],
  onAction,
  asButtons = false,
}: ResourceActionsMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const actions = [...(STATUS_ACTIONS[status] || STATUS_ACTIONS.draft), ...extraActions];

  const handleAction = (action: string) => {
    setAnchor(null);
    onAction(action);
  };

  if (asButtons) {
    return (
      <>
        {actions.map(action => {
          const meta = ACTION_META[action];
          if (!meta) return null;
          return (
            <Tooltip key={action} title={meta.label}>
              <IconButton size="small" onClick={() => handleAction(action)} sx={{ color: meta.color }}>
                {meta.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </>
    );
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map(action => {
          const meta = ACTION_META[action];
          if (!meta) return null;
          return (
            <MenuItem
              key={action}
              onClick={() => handleAction(action)}
              sx={action === 'delete' ? { color: 'error.main' } : {}}
            >
              <ListItemIcon sx={{ color: meta.color, minWidth: 36 }}>
                {meta.icon}
              </ListItemIcon>
              <ListItemText>{meta.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
