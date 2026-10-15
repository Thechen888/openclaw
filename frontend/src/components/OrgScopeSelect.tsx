import { useMemo } from 'react';
import {
  FormControl, InputLabel, Select, MenuItem, Box, Typography, Tooltip,
} from '@mui/material';
import { Lock } from '@mui/icons-material';

export interface OrgNode {
  id: string;
  name: string;
  parent_id: string | null;
  allowed: boolean;
}

interface Props {
  /** buildOrgTreeWithAllowed 返回的全量组织扁平树 */
  tree: OrgNode[];
  /** 'all' | 'org' */
  scope: string;
  /** 锚点组织 id（org 档默认选中） */
  anchorOrgId: string | null;
  /** 当前选中值；null/undefined = 全部组织（仅 all 档）或回退锚点（org 档） */
  value: string | null | undefined;
  onChange: (orgId: string | null) => void;
  /** 由页面从 org_tree 本地计算传入的全路径文本 */
  orgPathName: (id: string) => string;
}

const ALL_SENTINEL = '__all_orgs__';

export default function OrgScopeSelect({ tree, scope, anchorOrgId, value, onChange, orgPathName }: Props) {
  // DFS 平铺：按 parent_id 建树，从根（parent_id 为 null）向下带深度
  const flat = useMemo(() => {
    const childrenOf: Record<string, OrgNode[]> = {};
    const ROOT = '__root__';
    for (const n of tree) {
      const p = n.parent_id ?? ROOT;
      (childrenOf[p] ||= []).push(n);
    }
    const out: { node: OrgNode; depth: number }[] = [];
    const walk = (pid: string, depth: number) => {
      for (const n of childrenOf[pid] || []) {
        out.push({ node: n, depth });
        walk(n.id, depth + 1);
      }
    };
    walk(ROOT, 0);
    return out;
  }, [tree]);

  const displayValue = scope === 'all'
    ? (value == null ? ALL_SENTINEL : value)
    : (value ?? anchorOrgId ?? '');

  return (
    <FormControl size="small" sx={{ width: 220 }}>
      <InputLabel>组织范围</InputLabel>
      <Select
        label="组织范围"
        value={displayValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === ALL_SENTINEL ? null : (v as string));
        }}
      >
        {scope === 'all' && <MenuItem value={ALL_SENTINEL}>全部组织</MenuItem>}
        {flat.map(({ node, depth }) => (
          <MenuItem
            key={node.id}
            value={node.id}
            disabled={!node.allowed}
            sx={{ pl: `${2 + depth * 18}px` }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: node.allowed ? 'text.primary' : 'text.disabled', whiteSpace: 'normal' }}
              >
                {orgPathName(node.id)}
              </Typography>
              {!node.allowed && (
                <Tooltip title="超出你的可见范围">
                  <Box component="span" sx={{ display: 'inline-flex', color: 'text.disabled' }}>
                    <Lock fontSize="small" />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
