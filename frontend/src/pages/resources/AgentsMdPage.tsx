import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, IconButton, Button, Typography, Avatar, Chip,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import {
  Description, Edit, ArrowBack, Save, FiberManualRecord,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/client';
import { LoadingState } from '../../components/shared';

interface AgentsMdFile {
  name: string;
  description: string;
  size: number;
  updatedAt: string;
}

interface AgentsMdFileDetail extends AgentsMdFile {
  content: string;
}

export default function AgentsMdPage() {
  const [editingName, setEditingName] = useState<string | null>(null);

  return editingName ? (
    <FileEditor name={editingName} onBack={() => setEditingName(null)} />
  ) : (
    <FileList onEdit={setEditingName} />
  );
}

// =================== 文件列表 ===================
function FileList({ onEdit }: { onEdit: (name: string) => void }) {
  const filesQ = useQuery<AgentsMdFile[]>({
    queryKey: ['agents-md', 'files'],
    queryFn: async () => {
      const r = await api.get('/system/agents-md/files');
      return (r.data?.data ?? []) as AgentsMdFile[];
    },
  });

  if (filesQ.isLoading) return <LoadingState />;
  const files = filesQ.data ?? [];

  return (
    <Box>
      {/* 顶部条 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#6366f1', width: 44, height: 44 }}>
          <Description />
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            AGENTS.md 管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            维护 Agent 启动模板文件，点击编辑修改文件内容
          </Typography>
        </Box>
      </Box>

      {/* 文件列表 */}
      <Card sx={{ p: 2.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 280 }}>文件名</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>说明</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 110, textAlign: 'right' }}>大小</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 200 }}>最近修改</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100, textAlign: 'right' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((f) => (
              <TableRow key={f.name} hover sx={{ cursor: 'pointer' }} onClick={() => onEdit(f.name)}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FiberManualRecord sx={{ fontSize: 10, color: '#10b981' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {f.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {f.description}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Chip
                    label={`${(f.size / 1024).toFixed(1)} KB`}
                    size="small"
                    sx={{ height: 20, fontSize: 11, bgcolor: '#f1f5f9' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {f.updatedAt}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onEdit(f.name); }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}

// =================== 文件编辑器 ===================
function FileEditor({ name, onBack }: { name: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [content, setContent] = useState<string>('');
  const [original, setOriginal] = useState<string>('');

  const fileQ = useQuery<AgentsMdFileDetail>({
    queryKey: ['agents-md', 'file', name],
    queryFn: async () => {
      const r = await api.get(`/system/agents-md/files/${encodeURIComponent(name)}`);
      return r.data?.data as AgentsMdFileDetail;
    },
  });

  useEffect(() => {
    if (fileQ.data) {
      setContent(fileQ.data.content);
      setOriginal(fileQ.data.content);
    }
  }, [fileQ.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      api.put(`/system/agents-md/files/${encodeURIComponent(name)}`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents-md'] });
      enqueueSnackbar('已保存', { variant: 'success' });
      setOriginal(content);
    },
  });

  if (fileQ.isLoading) return <LoadingState />;

  const dirty = content !== original;

  return (
    <Box>
      {/* 顶部条 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <IconButton size="small" onClick={onBack}>
          <ArrowBack />
        </IconButton>
        <Description sx={{ color: '#6366f1' }} />
        <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
          {name}
        </Typography>
        {dirty && (
          <Chip
            label="未保存"
            size="small"
            sx={{ height: 20, fontSize: 11, bgcolor: '#fef3c7', color: '#b45309' }}
          />
        )}
      </Box>

      {/* 编辑器卡片 */}
      <Card sx={{ overflow: 'hidden', border: '1px solid rgba(148,163,184,0.2)' }}>
        {/* 编辑器头部 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.25,
            bgcolor: '#1f2937',
            borderBottom: '1px solid #334155',
          }}
        >
          <Typography sx={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
            {name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                if (dirty && !confirm('有未保存的修改，确定取消？')) return;
                onBack();
              }}
              sx={{ color: '#e2e8f0', borderColor: '#475569', '&:hover': { borderColor: '#64748b', bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Save sx={{ fontSize: 16 }} />}
              disabled={!dirty || saveMut.isPending}
              onClick={() => saveMut.mutate()}
              sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}
            >
              保存
            </Button>
          </Box>
        </Box>

        {/* 编辑区 */}
        <CodeEditor value={content} onChange={setContent} />
      </Card>
    </Box>
  );
}

// =================== 编辑器 ===================
function CodeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lnRef = useRef<HTMLDivElement>(null);
  const lineCount = value.split('\n').length;

  return (
    <Box
      sx={{
        display: 'flex',
        height: 'calc(100vh - 280px)',
        minHeight: 400,
        bgcolor: '#0f172a',
        fontFamily: 'Consolas, "Courier New", monospace',
      }}
    >
      {/* 行号 */}
      <Box
        sx={{
          width: 56,
          flexShrink: 0,
          py: 2,
          pr: 1.5,
          overflow: 'hidden',
          borderRight: '1px solid #1e293b',
          bgcolor: '#0f172a',
        }}
      >
        <Box
          ref={lnRef}
          sx={{
            color: '#475569',
            fontSize: 13,
            lineHeight: '22px',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: 'inherit',
          }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </Box>
      </Box>

      {/* 文本输入 */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={() => {
            if (lnRef.current && taRef.current) {
              lnRef.current.style.transform = `translateY(${-taRef.current.scrollTop}px)`;
            }
          }}
          spellCheck={false}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            border: 'none',
            outline: 'none',
            resize: 'none',
            background: 'transparent',
            color: '#e2e8f0',
            padding: '16px',
            paddingLeft: '12px',
            fontSize: 13,
            lineHeight: '22px',
            fontFamily: 'inherit',
            whiteSpace: 'pre',
            tabSize: 2,
            caretColor: '#3b82f6',
          }}
        />
      </Box>
    </Box>
  );
}
