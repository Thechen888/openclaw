import { useState } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Button, Tooltip, Chip, Typography, LinearProgress, Tabs, Tab,
  Card, CardContent, Grid, MenuItem, TextField,
} from '@mui/material';
import { Download, Refresh, TrendingUp, TrendingDown, People, SmartToy } from '@mui/icons-material';
import { PageHeader, DataTable } from '../../components/shared';

// ===================== Mock Data =====================
const MOCK_USER_USAGE = [
  { id: '1', name: '张三', dept: '研发部', calls: 1250, input_tokens: 2400000, output_tokens: 1800000, total: 4200000, pct: 22.3 },
  { id: '2', name: '李四', dept: '研发部', calls: 980, input_tokens: 1900000, output_tokens: 1400000, total: 3300000, pct: 17.5 },
  { id: '3', name: '王五', dept: '市场部', calls: 750, input_tokens: 1200000, output_tokens: 900000, total: 2100000, pct: 11.2 },
  { id: '4', name: '赵六', dept: '产品部', calls: 620, input_tokens: 1100000, output_tokens: 800000, total: 1900000, pct: 10.1 },
  { id: '5', name: '孙七', dept: '运营部', calls: 540, input_tokens: 950000, output_tokens: 700000, total: 1650000, pct: 8.8 },
  { id: '6', name: '周八', dept: '研发部', calls: 480, input_tokens: 850000, output_tokens: 620000, total: 1470000, pct: 7.8 },
  { id: '7', name: '吴九', dept: '产品部', calls: 320, input_tokens: 580000, output_tokens: 420000, total: 1000000, pct: 5.3 },
  { id: '8', name: '郑十', dept: '市场部', calls: 280, input_tokens: 500000, output_tokens: 360000, total: 860000, pct: 4.6 },
];

const MOCK_DEPT_USAGE = [
  { id: 'd1', name: '研发部', headcount: 25, total: 9500000, pct: 50.5, avg_per_person: 380000 },
  { id: 'd2', name: '产品部', headcount: 12, total: 4200000, pct: 22.3, avg_per_person: 350000 },
  { id: 'd3', name: '市场部', headcount: 8, total: 3100000, pct: 16.5, avg_per_person: 387500 },
  { id: 'd4', name: '运营部', headcount: 6, total: 2000000, pct: 10.7, avg_per_person: 333333 },
];

const MOCK_AGENT_USAGE = [
  { id: 'a1', name: '代码审查Bot', owner: '研发部', calls: 3200, input_tokens: 5800000, output_tokens: 4200000, total: 10000000, pct: 38.2, token_type: 'admin' },
  { id: 'a2', name: '客服助手', owner: '运营部', calls: 2100, input_tokens: 3200000, output_tokens: 2400000, total: 5600000, pct: 21.4, token_type: 'admin' },
  { id: 'a3', name: '数据分析Agent', owner: '研发部', calls: 1500, input_tokens: 2800000, output_tokens: 2000000, total: 4800000, pct: 18.3, token_type: 'admin' },
  { id: 'a4', name: '周报生成器', owner: '产品部', calls: 800, input_tokens: 1500000, output_tokens: 1100000, total: 2600000, pct: 9.9, token_type: 'self' },
  { id: 'a5', name: '营销文案助手', owner: '市场部', calls: 600, input_tokens: 1200000, output_tokens: 880000, total: 2080000, pct: 7.9, token_type: 'self' },
];

const MOCK_SKILL_USAGE = [
  { id: 's1', name: '代码生成', calls: 4500, input_tokens: 8200000, output_tokens: 6100000, total: 14300000, pct: 42.1 },
  { id: 's2', name: '文本摘要', calls: 3200, input_tokens: 5500000, output_tokens: 2800000, total: 8300000, pct: 24.4 },
  { id: 's3', name: '数据分析', calls: 1800, input_tokens: 3200000, output_tokens: 2400000, total: 5600000, pct: 16.5 },
  { id: 's4', name: '翻译', calls: 2100, input_tokens: 2800000, output_tokens: 2600000, total: 5400000, pct: 15.9 },
  { id: 's5', name: '知识问答', calls: 1200, input_tokens: 1800000, output_tokens: 1200000, total: 3000000, pct: 8.8 },
];

function fmtNum(n: number) { return n.toLocaleString(); }
function fmtTokens(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function quotaColor(pct: number) {
  if (pct >= 95) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
}

export default function TokenUsagePage() {
  const [tab, setTab] = useState(0);
  const [timeRange, setTimeRange] = useState('7d');
  const [accountFilter, setAccountFilter] = useState('all');

  return (
    <Box>
      <PageHeader
        title="用量看板"
        subtitle="查看 Token 消耗详情，辅助优化成本"
        actions={<Tooltip title="刷新"><IconButton><Refresh /></IconButton></Tooltip>}
      />

      {/* =================== 公共筛选区 =================== */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select size="small" label="时间范围" value={timeRange} onChange={e => setTimeRange(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="today">今天</MenuItem>
          <MenuItem value="yesterday">昨天</MenuItem>
          <MenuItem value="7d">近 7 天</MenuItem>
          <MenuItem value="30d">近 30 天</MenuItem>
          <MenuItem value="custom">自定义</MenuItem>
        </TextField>
        <TextField select size="small" label="Token 账户" value={accountFilter} onChange={e => setAccountFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">全部</MenuItem>
          <MenuItem value="personal">个人 Token</MenuItem>
          <MenuItem value="admin-deepseek">管理员 - DeepSeek</MenuItem>
          <MenuItem value="admin-qwen">管理员 - Qwen</MenuItem>
          <MenuItem value="admin-gpt4o">管理员 - GPT4o</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<Download />}>导出报表</Button>
      </Box>

      {/* =================== 汇总卡片 =================== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">总消耗 Tokens</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>18.8M</Typography>
              <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUp sx={{ fontSize: 14 }} /> +12.3% 环比
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">环比变化</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'warning.main' }}>+12.3%</Typography>
              <Typography variant="caption" color="text.secondary">较上周期</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">人均消耗</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                <People sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />376K
              </Typography>
              <Typography variant="caption" color="text.secondary">50 位活跃用户</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" color="text.secondary">消耗最高</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                <SmartToy sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />代码审查Bot
              </Typography>
              <Typography variant="caption" color="text.secondary">研发部 · 10.0M tokens</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="按人" />
        <Tab label="按部门" />
        <Tab label="按 Agent" />
        <Tab label="按 Skill" />
      </Tabs>

      {/* =================== Tab 0: 按人 =================== */}
      {tab === 0 && (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>姓名</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">调用次数</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">输入 Tokens</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">输出 Tokens</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">总消耗</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>占比</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_USER_USAGE.map((item, idx) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{idx + 1}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.dept}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.calls)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.input_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.output_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtTokens(item.total)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={item.pct * 4} color="primary" sx={{ flex: 1, height: 6, borderRadius: 2 }} />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36 }}>{item.pct}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      {/* =================== Tab 1: 按部门 =================== */}
      {tab === 1 && (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">人数</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">总消耗</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 160 }}>占比</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">人均消耗</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_DEPT_USAGE.map((item) => {
              const colors = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0'];
              const idx = MOCK_DEPT_USAGE.indexOf(item);
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colors[idx] }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.headcount}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtTokens(item.total)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={item.pct} color="primary" sx={{ flex: 1, height: 8, borderRadius: 2 }} />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36 }}>{item.pct}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.avg_per_person)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* =================== Tab 2: 按 Agent =================== */}
      {tab === 2 && (
        <DataTable>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Agent 名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>归属</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">调用次数</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">输入 Tokens</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">输出 Tokens</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">总消耗</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>计费方式</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>占比</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_AGENT_USAGE.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{item.owner}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.calls)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.input_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.output_tokens)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtTokens(item.total)}</TableCell>
                <TableCell>
                  <Chip size="small" label={item.token_type === 'admin' ? '管理员' : '个人'} color={item.token_type === 'admin' ? 'primary' : 'default'} variant="outlined" sx={{ fontSize: 10 }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={item.pct * 2.5} color="primary" sx={{ flex: 1, height: 6, borderRadius: 2 }} />
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36 }}>{item.pct}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTable>
      )}

      {/* =================== Tab 3: 按 Skill =================== */}
      {tab === 3 && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            分析各技能的 Token 消耗，辅助优化 Prompt 和调用策略。
          </Typography>
          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>技能名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">调用次数</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">输入 Tokens</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">输出 Tokens</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">总消耗</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>占比</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>优化建议</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {MOCK_SKILL_USAGE.map((item) => {
                const suggestions: Record<string, string> = {
                  '代码生成': '考虑缓存常见代码片段',
                  '文本摘要': '可尝试更小的模型',
                  '数据分析': '减少不必要的上下文传递',
                  '翻译': '合并短文本批量翻译',
                  '知识问答': '优化 RAG 检索精度',
                };
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtNum(item.calls)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.input_tokens)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(item.output_tokens)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtTokens(item.total)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={item.pct * 2.3} color="primary" sx={{ flex: 1, height: 6, borderRadius: 2 }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 36 }}>{item.pct}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={suggestions[item.name] || '-'} variant="outlined" sx={{ fontSize: 10 }} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTable>
        </>
      )}
    </Box>
  );
}
