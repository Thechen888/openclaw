import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography,
  Box, Chip, IconButton, List, ListItemButton, ListItemText, ListItemSecondaryAction, Divider,
} from '@mui/material';
import { Delete, Person, Business } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { toolsApi } from '../../../api/client';
import api from '../../../api/client';

interface Props {
  tool: any;
  onClose: () => void;
}

export default function ShareToolDialog({ tool, onClose }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<{ target_type: string; target_id: string; target_name: string }[]>([]);

  // Fetch existing shares
  const { data: sharesData } = useQuery({
    queryKey: ['tool-shares', tool.id],
    queryFn: () => toolsApi.shares(tool.id),
  });
  const existingShares: any[] = sharesData?.data?.data || [];

  // Fetch users and orgs from existing mock endpoints
  const { data: usersData } = useQuery({
    queryKey: ['tool-share-users'],
    queryFn: () => api.get('/identity/users'),
  });
  const allUsers: any[] = usersData?.data?.data || [];

  const { data: orgsData } = useQuery({
    queryKey: ['tool-share-orgs'],
    queryFn: () => api.get('/identity/organizations'),
  });
  const allOrgs: any[] = orgsData?.data?.data || [];

  const shareMutation = useMutation({
    mutationFn: (targets: any[]) => toolsApi.share(tool.id, targets),
    onSuccess: (_, targets) => {
      qc.invalidateQueries({ queryKey: ['tool-shares', tool.id] });
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar(`已分享给 ${targets.length} 个目标，对方已收到通知`, { variant: 'success' });
      onClose();
    },
  });

  const unshareMutation = useMutation({
    mutationFn: (shareId: string) => toolsApi.unshare(tool.id, shareId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool-shares', tool.id] });
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar('已移除', { variant: 'success' });
    },
  });

  const filteredUsers = allUsers.filter(u => u.status === 'active' && u.name.includes(search));
  const filteredOrgs = allOrgs.filter(o => o.name.includes(search));

  const isAlreadyShared = (type: string, id: string) =>
    existingShares.some(s => s.target_type === type && s.target_id === id);
  const isSelected = (type: string, id: string) =>
    selectedTargets.some(t => t.target_type === type && t.target_id === id);

  const toggleTarget = (type: string, id: string, name: string) => {
    if (isSelected(type, id)) {
      setSelectedTargets(prev => prev.filter(t => !(t.target_type === type && t.target_id === id)));
    } else {
      setSelectedTargets(prev => [...prev, { target_type: type, target_id: id, target_name: name }]);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>分享「{tool.name}」</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" placeholder="搜索人员或部门..." value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2, mt: 1 }} />

        {/* Selected targets chips */}
        {selectedTargets.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {selectedTargets.map(t => (
              <Chip key={`${t.target_type}-${t.target_id}`} label={t.target_name} size="small" onDelete={() => toggleTarget(t.target_type, t.target_id, t.target_name)} />
            ))}
          </Box>
        )}

        {/* Users list */}
        <Typography variant="overline" color="text.secondary">人员</Typography>
        <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
          {filteredUsers.slice(0, 20).map(u => {
            const disabled = isAlreadyShared('user', u.id);
            return (
              <ListItemButton key={u.id} disabled={disabled} onClick={() => toggleTarget('user', u.id, u.name)} selected={isSelected('user', u.id)}>
                <Person sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <ListItemText primary={u.name} secondary={u.org_id} />
              </ListItemButton>
            );
          })}
        </List>

        <Divider sx={{ my: 1 }} />

        {/* Orgs list */}
        <Typography variant="overline" color="text.secondary">部门</Typography>
        <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
          {filteredOrgs.map(o => {
            const disabled = isAlreadyShared('dept', o.id);
            return (
              <ListItemButton key={o.id} disabled={disabled} onClick={() => toggleTarget('dept', o.id, o.name)} selected={isSelected('dept', o.id)}>
                <Business sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                <ListItemText primary={o.name} secondary={o.type} />
              </ListItemButton>
            );
          })}
        </List>

        {/* Existing shares */}
        {existingShares.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" color="text.secondary">已分享</Typography>
            <List dense>
              {existingShares.map(s => (
                <ListItemButton key={s.id}>
                  <ListItemText primary={s.target_name} secondary={`${s.target_type === 'user' ? '人员' : '部门'} · ${s.granted_by_name} · ${new Date(s.created_at).toLocaleDateString()}`} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" size="small" onClick={() => unshareMutation.mutate(s.id)}><Delete fontSize="small" /></IconButton>
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={selectedTargets.length === 0} onClick={() => shareMutation.mutate(selectedTargets)}>
          确认分享
        </Button>
      </DialogActions>
    </Dialog>
  );
}
