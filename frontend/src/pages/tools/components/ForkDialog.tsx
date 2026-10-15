import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { toolsApi } from '../../../api/client';

interface Props {
  tool: any;
  onClose: () => void;
}

export default function ForkDialog({ tool, onClose }: Props) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [name, setName] = useState(`${tool.name}（我的副本）`);

  const mutation = useMutation({
    mutationFn: (n: string) => toolsApi.fork(tool.id, n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
      enqueueSnackbar('已复制到「我创建的」', { variant: 'success' });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>复制为我的</DialogTitle>
      <DialogContent>
        <TextField label="副本名称" fullWidth required value={name} onChange={e => setName(e.target.value)} slotProps={{ input: { inputProps: { maxLength: 30 } } }} sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => mutation.mutate(name)} disabled={!name.trim()}>
          确认复制
        </Button>
      </DialogActions>
    </Dialog>
  );
}
