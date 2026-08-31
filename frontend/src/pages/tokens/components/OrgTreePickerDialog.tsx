import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Checkbox, TextField, Chip, IconButton, Divider, List, ListItem,
  ListItemIcon, ListItemText, Collapse,
} from '@mui/material';
import { Close, ExpandMore, ExpandLess, ChevronRight } from '@mui/icons-material';

interface OrgMember {
  user_id: string;
  name: string;
}

interface OrgDept {
  id: string;
  name: string;
  type: string;
  members: OrgMember[];
}

interface OrgNode {
  id: string;
  name: string;
  type: string;
  members: OrgMember[];
  children: OrgDept[];
}

interface OrgTreePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (userIds: string[], remark: string) => void;
  existingUserIds: string[];
  orgTree: OrgNode[];
}

export default function OrgTreePickerDialog({
  open, onClose, onConfirm, existingUserIds, orgTree,
}: OrgTreePickerDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remark, setRemark] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const existingSet = useMemo(() => new Set(existingUserIds), [existingUserIds]);

  // Collect all available (non-existing) members from tree
  const allAvailableMembers = useMemo(() => {
    const members: OrgMember[] = [];
    const seen = new Set<string>();
    for (const company of orgTree) {
      for (const m of company.members) {
        if (!seen.has(m.user_id)) { members.push(m); seen.add(m.user_id); }
      }
      for (const dept of company.children) {
        for (const m of dept.members) {
          if (!seen.has(m.user_id)) { members.push(m); seen.add(m.user_id); }
        }
      }
    }
    return members;
  }, [orgTree]);

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(deptId) ? next.delete(deptId) : next.add(deptId);
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    if (existingSet.has(userId)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const getDeptMemberIds = (dept: OrgDept) => dept.members.map(m => m.user_id);

  const isDeptChecked = (dept: OrgDept) => {
    const ids = getDeptMemberIds(dept).filter(id => !existingSet.has(id));
    if (ids.length === 0) return false;
    return ids.every(id => selectedIds.has(id));
  };

  const isDeptIndeterminate = (dept: OrgDept) => {
    const ids = getDeptMemberIds(dept).filter(id => !existingSet.has(id));
    if (ids.length === 0) return false;
    const checkedCount = ids.filter(id => selectedIds.has(id)).length;
    return checkedCount > 0 && checkedCount < ids.length;
  };

  const toggleDeptCheck = (dept: OrgDept) => {
    const ids = getDeptMemberIds(dept).filter(id => !existingSet.has(id));
    const allChecked = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const getCompanyMemberIds = (company: OrgNode) => {
    const ids: string[] = company.members.map(m => m.user_id);
    company.children.forEach(dept => dept.members.forEach(m => ids.push(m.user_id)));
    return ids;
  };

  const isCompanyChecked = (company: OrgNode) => {
    const ids = getCompanyMemberIds(company).filter(id => !existingSet.has(id));
    if (ids.length === 0) return false;
    return ids.every(id => selectedIds.has(id));
  };

  const isCompanyIndeterminate = (company: OrgNode) => {
    const ids = getCompanyMemberIds(company).filter(id => !existingSet.has(id));
    if (ids.length === 0) return false;
    const checkedCount = ids.filter(id => selectedIds.has(id)).length;
    return checkedCount > 0 && checkedCount < ids.length;
  };

  const toggleCompanyCheck = (company: OrgNode) => {
    const ids = getCompanyMemberIds(company).filter(id => !existingSet.has(id));
    const allChecked = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const removeSelected = (userId: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds), remark);
    setSelectedIds(new Set());
    setRemark('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setRemark('');
    onClose();
  };

  // Build name lookup for selected list
  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const company of orgTree) {
      for (const m of company.members) map[m.user_id] = m.name;
      for (const dept of company.children) {
        for (const m of dept.members) map[m.user_id] = m.name;
      }
    }
    return map;
  }, [orgTree]);

  const selectedList = Array.from(selectedIds).map(id => ({ user_id: id, name: nameMap[id] || id }));
  const newCount = selectedIds.size;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>添加成员</Typography>
        <IconButton size="small" onClick={handleClose}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          从组织架构中选择要添加的成员。勾选部门将批量添加该部门全部成员。
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, minHeight: 360 }}>
          {/* 左侧：组织树 */}
          <Box sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'auto', p: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 1 }}>组织架构</Typography>
            {orgTree.map(company => (
              <Box key={company.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5 }}>
                  <Checkbox
                    size="small"
                    checked={isCompanyChecked(company)}
                    indeterminate={isCompanyIndeterminate(company)}
                    onChange={() => toggleCompanyCheck(company)}
                  />
                  <ChevronRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{company.name}</Typography>
                </Box>
                {/* 公司成员 */}
                {company.members.map(m => (
                  <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 4, py: 0.25 }}>
                    <Checkbox
                      size="small"
                      checked={existingSet.has(m.user_id) || selectedIds.has(m.user_id)}
                      disabled={existingSet.has(m.user_id)}
                      onChange={() => toggleUser(m.user_id)}
                    />
                    <Typography variant="body2" sx={{ color: existingSet.has(m.user_id) ? 'text.disabled' : 'text.primary' }}>
                      {m.name}
                    </Typography>
                    {existingSet.has(m.user_id) && <Chip size="small" label="已添加" sx={{ height: 18, fontSize: 10 }} />}
                  </Box>
                ))}
                {/* 子部门 */}
                {company.children.map(dept => (
                  <Box key={dept.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 3, py: 0.5 }}>
                      <Checkbox
                        size="small"
                        checked={isDeptChecked(dept)}
                        indeterminate={isDeptIndeterminate(dept)}
                        onChange={() => toggleDeptCheck(dept)}
                      />
                      <IconButton size="small" onClick={() => toggleDept(dept.id)} sx={{ p: 0 }}>
                        {expandedDepts.has(dept.id) ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{dept.name}</Typography>
                      <Typography variant="caption" color="text.secondary">({dept.members.length}人)</Typography>
                    </Box>
                    <Collapse in={expandedDepts.has(dept.id)}>
                      {dept.members.length === 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ pl: 8, py: 0.5, display: 'block' }}>暂无成员</Typography>
                      )}
                      {dept.members.map(m => (
                        <Box key={m.user_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 7, py: 0.25 }}>
                          <Checkbox
                            size="small"
                            checked={existingSet.has(m.user_id) || selectedIds.has(m.user_id)}
                            disabled={existingSet.has(m.user_id)}
                            onChange={() => toggleUser(m.user_id)}
                          />
                          <Typography variant="body2" sx={{ color: existingSet.has(m.user_id) ? 'text.disabled' : 'text.primary' }}>
                            {m.name}
                          </Typography>
                          {existingSet.has(m.user_id) && <Chip size="small" label="已添加" sx={{ height: 18, fontSize: 10 }} />}
                        </Box>
                      ))}
                    </Collapse>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>

          {/* 右侧：已选清单 */}
          <Box sx={{ width: 240, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>已选成员</Typography>
              <Typography variant="caption" color="text.secondary">共 {newCount} 人</Typography>
            </Box>
            <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
              {selectedList.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ p: 2, display: 'block', textAlign: 'center' }}>
                  请从左侧选择成员
                </Typography>
              )}
              {selectedList.map(m => (
                <ListItem key={m.user_id} secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => removeSelected(m.user_id)}><Close sx={{ fontSize: 14 }} /></IconButton>
                }>
                  <ListItemText primary={<Typography variant="body2">{m.name}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <TextField
          fullWidth size="small" label="备注（选填）" multiline rows={2}
          value={remark} onChange={e => setRemark(e.target.value)}
          placeholder="如：参与 XX 项目开发"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={newCount === 0}>
          添加 {newCount} 人
        </Button>
      </DialogActions>
    </Dialog>
  );
}
