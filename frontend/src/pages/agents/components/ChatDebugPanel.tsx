import { useRef, useState, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Avatar, Chip, CircularProgress,
  Divider, Tooltip, Stack,
} from '@mui/material';
import { Send, SmartToy, Person, RestartAlt, Bolt } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { agentsApi } from '../../../api/client';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  usage?: any;
  duration_ms?: number;
}

export default function ChatDebugPanel({
  agentId, welcome, openingQuestions = [],
}: {
  agentId: string;
  welcome?: string;
  openingQuestions?: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => agentsApi.debugChat(agentId, { message: text }),
    onSuccess: (res: any) => {
      const d = res?.data?.data || res?.data;
      setMessages((m) => [...m, {
        role: 'assistant', content: d.reply, citations: d.citations, usage: d.usage, duration_ms: d.duration_ms,
      }]);
    },
  });

  const send = (text: string) => {
    const t = text.trim();
    if (!t || sendMutation.isPending) return;
    setMessages((m) => [...m, { role: 'user', content: t }]);
    setInput('');
    sendMutation.mutate(t);
  };

  const reset = () => { setMessages([]); setInput(''); };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {/* 头部 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Bolt sx={{ color: 'warning.main', fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>调试预览</Typography>
        <Tooltip title="清空对话">
          <IconButton size="small" onClick={reset}><RestartAlt fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      {/* 消息区 */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Avatar sx={{ width: 48, height: 48, mx: 'auto', mb: 1.5, bgcolor: 'primary.main' }}><SmartToy /></Avatar>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {welcome || '你好，有什么可以帮你？'}
            </Typography>
            {openingQuestions.length > 0 && (
              <Stack spacing={1} sx={{ maxWidth: 320, mx: 'auto' }}>
                {openingQuestions.map((q, i) => (
                  <Chip key={i} label={q} variant="outlined" onClick={() => send(q)} sx={{ cursor: 'pointer', justifyContent: 'flex-start' }} />
                ))}
              </Stack>
            )}
          </Box>
        )}

        {messages.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, mb: 2, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: m.role === 'user' ? 'secondary.main' : 'primary.main' }}>
              {m.role === 'user' ? <Person sx={{ fontSize: 17 }} /> : <SmartToy sx={{ fontSize: 17 }} />}
            </Avatar>
            <Box sx={{ maxWidth: '78%' }}>
              <Box sx={{
                px: 1.5, py: 1, borderRadius: 2,
                bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                color: m.role === 'user' ? '#fff' : 'text.primary',
                border: m.role === 'user' ? 'none' : '1px solid', borderColor: 'divider',
              }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content}</Typography>
              </Box>
              {m.citations && m.citations.length > 0 && (
                <Box sx={{ mt: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>引用来源</Typography>
                  {m.citations.map((c: any, ci: number) => (
                    <Box key={ci} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Chip size="small" label={`${c.doc} · ${c.chunk}`} sx={{ height: 20, fontSize: 10 }} />
                      <Typography variant="caption" color="text.disabled">{(c.score * 100).toFixed(0)}%</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {m.usage && (
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                  {m.duration_ms}ms · {m.usage.input_tokens + m.usage.output_tokens} tokens · ${m.usage.cost}
                </Typography>
              )}
            </Box>
          </Box>
        ))}

        {sendMutation.isPending && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main' }}><SmartToy sx={{ fontSize: 17 }} /></Avatar>
            <Box sx={{ px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <CircularProgress size={14} />
            </Box>
          </Box>
        )}
      </Box>

      <Divider />
      {/* 输入区 */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth size="small" multiline maxRows={4} placeholder="输入消息进行调试…"
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        />
        <IconButton color="primary" onClick={() => send(input)} disabled={!input.trim() || sendMutation.isPending}>
          <Send />
        </IconButton>
      </Box>
    </Box>
  );
}
