import {
  Box, Card, CardContent, Typography, Grid, Chip, LinearProgress, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, Divider,
} from '@mui/material';
import {
  MenuBook, Description, Chat, AutoFixHigh,
  PictureAsPdf, TableChart, Article, Link,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

/* ─── 颜色常量 ─── */
const CYAN = '#00D4FF';
const GREEN = '#00E676';
const PURPLE = '#7C3AED';
const AMBER = '#FFB800';
const RED = '#FF3366';

/* ─── 模拟数据 ─── */
const STATS = [
  { label: '知识库', value: '12', sub: '+2 本月新增', color: CYAN, icon: <MenuBook /> },
  { label: '有效文档', value: '1,286', sub: '96.8% 解析成功率', color: GREEN, icon: <Description /> },
  { label: '本周问答', value: '3,472', sub: '+18.6% 环比增长', color: AMBER, icon: <Chat /> },
];

const ENTRY_POINTS = [
  { title: '管理知识库', desc: '导入、解析和检索企业资料', icon: <MenuBook />, color: CYAN, path: '/rag/knowledge-bases' },
  { title: '发起智能问答', desc: '获取带证据引用的专业回答', icon: <AutoFixHigh />, color: GREEN, path: '/chat' },
];

const QUEUE_ITEMS = [
  { name: 'PowerTitan_2.0_运维手册.pdf', kb: '储能产品与运维知识库 · 正在生成向量索引', progress: 78, status: '处理中', statusColor: AMBER, icon: <PictureAsPdf sx={{ color: '#FF5252' }} /> },
  { name: '2026年度故障案例汇总.xlsx', kb: '售后故障案例库 · 表格解析完成', progress: 100, status: '已完成', statusColor: GREEN, icon: <TableChart sx={{ color: '#00E676' }} /> },
  { name: '欧洲并网验收流程_V3.docx', kb: '项目交付规范库 · 解析并生成 46 个分块', progress: 100, status: '已完成', statusColor: GREEN, icon: <Article sx={{ color: '#448AFF' }} /> },
  { name: '国家能源局政策信息同步', kb: '能源政策与市场规则 · RSS 自动同步', progress: 30, status: '等待重试', statusColor: RED, icon: <Link sx={{ color: '#FFB800' }} /> },
];

const ACTIVITY_ITEMS = [
  { user: 'LJ', name: '李静', action: '更新了「运维问答助手」', detail: '启用了知识图谱查询工具 · 12 分钟前', color: '#00D4FF' },
  { user: 'WY', name: '王宇', action: '上传 14 份项目文档', detail: '项目交付规范库 · 1 小时前', color: '#7C3AED' },
  { user: 'CN', name: '陈楠', action: '发布了售前方案助手', detail: '已开放至飞书和网站 Widget · 昨天', color: '#00E676' },
  { user: 'SYS', name: '系统', action: '完成夜间数据源同步', detail: '新增 28 篇，更新 9 篇 · 昨天', color: '#94A0B0' },
];

const KEY_ASSETS = [
  { name: '储能产品与运维', desc: '覆盖 PCS、BMS、EMS、液冷系统的产品手册、告警说明与运维 SOP。', tags: ['产品手册', '故障排查', '多模态'], docs: '428 篇文档', updated: '今天更新', color: GREEN },
  { name: '交付知识 Wiki', desc: '从项目交付文档自动生成的结构化知识导航与关联图谱。', tags: ['并网验收', '施工规范', '知识图谱'], docs: '126 个页面', updated: '昨天更新', color: PURPLE },
  { name: '售后标准问答', desc: '沉淀高频客户问题与审核后的标准口径，保障回答一致性。', tags: ['客户问答', '标准口径'], docs: '786 条问答', updated: '3 天前更新', color: CYAN },
];

/* ─── 组件 ─── */
export default function KnowledgeBaseWorkbenchPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, fontSize: 24, mb: 0.5 }}>
          知识库工作台
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
          统一管理企业知识资产、专业智能体与多渠道问答服务。
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {STATS.map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.label}>
            <Card sx={{ position: 'relative', overflow: 'hidden', '&:hover': { borderColor: `${s.color}40` } }}>
              <CardContent sx={{ py: 2.5, px: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>{s.label}</Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, fontSize: 28, mt: 0.5, color: s.color }}>{s.value}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 11, color: s.color, mt: 0.5, display: 'block' }}>{s.sub}</Typography>
                  </Box>
                  <Box sx={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: `radial-gradient(circle, ${s.color}12 0%, transparent 70%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: `${s.color}60`, fontSize: 28,
                  }}>
                    {s.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 常用入口 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: 15, mb: 0.5 }}>常用入口</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, mb: 2, display: 'block' }}>从知识沉淀到智能问答的核心工作路径</Typography>
        <Grid container spacing={2}>
          {ENTRY_POINTS.map((ep) => (
            <Grid size={{ xs: 12, sm: 6, md: 6 }} key={ep.title}>
              <Card
                sx={{ cursor: 'pointer', '&:hover': { borderColor: `${ep.color}40`, boxShadow: `0 0 20px ${ep.color}10` } }}
                onClick={() => navigate(ep.path)}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5, px: 2.5 }}>
                  <Avatar sx={{
                    width: 44, height: 44, bgcolor: `${ep.color}12`, color: ep.color,
                    border: `1px solid ${ep.color}30`,
                  }}>
                    {ep.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 14 }}>{ep.title}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>{ep.desc}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 文档处理队列 + 最近活动 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* 文档处理队列 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, fontSize: 15 }}>文档处理队列</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>最近上传与同步任务</Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: CYAN, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                  onClick={() => navigate('/rag/knowledge-bases')}
                >
                  查看知识库 →
                </Typography>
              </Box>
              <List disablePadding>
                {QUEUE_ITEMS.map((item, i) => (
                  <Box key={item.name}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,212,255,0.06)', borderRadius: 1, fontSize: 14 }}>
                          {item.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>{item.name}</Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{item.kb}</Typography>
                        }
                      />
                      <Box sx={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress
                          variant="determinate"
                          value={item.progress}
                          sx={{
                            flex: 1, height: 6, borderRadius: 3,
                            '& .MuiLinearProgress-bar': {
                              bgcolor: item.statusColor,
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            height: 20, fontSize: 10, minWidth: 56,
                            color: item.statusColor,
                            borderColor: `${item.statusColor}40`,
                          }}
                          variant="outlined"
                        />
                      </Box>
                    </ListItem>
                    {i < QUEUE_ITEMS.length - 1 && <Divider sx={{ borderColor: 'rgba(0,212,255,0.06)' }} />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近活动 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, fontSize: 15 }}>最近活动</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>空间成员的知识操作</Typography>
              </Box>
              <List disablePadding>
                {ACTIVITY_ITEMS.map((a, i) => (
                  <Box key={a.user}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar sx={{ minWidth: 44 }}>
                        <Avatar sx={{
                          width: 32, height: 32, fontSize: 11, fontWeight: 700,
                          bgcolor: `${a.color}20`, color: a.color,
                        }}>
                          {a.user}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>{a.name}{a.action}</Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{a.detail}</Typography>
                        }
                      />
                    </ListItem>
                    {i < ACTIVITY_ITEMS.length - 1 && <Divider sx={{ borderColor: 'rgba(0,212,255,0.06)' }} />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 重点知识资产 */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, fontSize: 15 }}>重点知识资产</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>近期访问频率最高的知识库</Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: CYAN, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
            onClick={() => navigate('/rag/knowledge-bases')}
          >
            全部知识库 →
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {KEY_ASSETS.map((kb) => (
            <Grid size={{ xs: 12, md: 4 }} key={kb.name}>
              <Card
                sx={{
                  cursor: 'pointer', borderLeft: `3px solid ${kb.color}`,
                  '&:hover': { boxShadow: `0 0 20px ${kb.color}10` },
                }}
                onClick={() => navigate('/rag/knowledge-bases')}
              >
                <CardContent sx={{ py: 2.5, px: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{
                        width: 40, height: 40, bgcolor: `${kb.color}12`, color: kb.color,
                        border: `1px solid ${kb.color}30`, fontSize: 18,
                      }}>
                        <Description />
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 15 }}>{kb.name}</Typography>
                    </Box>
                    <Chip label="文档库" size="small" sx={{ height: 20, fontSize: 10, color: kb.color, borderColor: `${kb.color}40` }} variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 2, lineHeight: 1.6 }}>
                    {kb.desc}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    {kb.tags.map((t) => (
                      <Chip key={t} label={t} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.12)' }} variant="outlined" />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(0,212,255,0.06)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{kb.docs}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{kb.updated}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
