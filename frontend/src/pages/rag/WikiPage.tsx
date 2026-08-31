import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, IconButton, Button, List,
  ListItem, ListItemButton, ListItemText, Collapse, Divider,
} from '@mui/material';
import {
  ArrowBack, ExpandMore, ExpandLess, Folder, Description, Hub,
  CheckCircle, Update,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, EmptyState } from '../../components/shared';
import { ragApi } from '../../api/client';

interface TreeNode {
  id: string;
  label: string;
  level: number;
  children?: string[];
}

export default function WikiPage() {
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['wiki-data', kbId],
    queryFn: () => ragApi.knowledgeBases.wiki(kbId!),
    enabled: !!kbId,
  });
  const wiki = data?.data?.data;

  const tree: TreeNode[] = wiki?.tree || [];
  const rootNodes = tree.filter(n => n.level === 0);
  const content = wiki?.content;
  const graphNodes = wiki?.graph_nodes || [];

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderTreeNode = (node: TreeNode) => {
    const children = node.children ? tree.filter(n => node.children!.includes(n.id)) : [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;

    return (
      <Box key={node.id}>
        <ListItem disablePadding sx={{ pl: node.level * 2 }}>
          <ListItemButton
            selected={isSelected}
            onClick={() => { setSelectedNodeId(node.id); if (hasChildren) toggleExpand(node.id); }}
            sx={{ borderRadius: 1, py: 0.5, px: 1, '&.Mui-selected': { bgcolor: 'rgba(0,212,255,0.08)' }}
          }>
            {hasChildren && (
              <IconButton size="small" onClick={e => { e.stopPropagation(); toggleExpand(node.id); }} sx={{ mr: 0.5, p: 0 }}>
                {isExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 24 }} />}
            {hasChildren ? <Folder sx={{ fontSize: 16, mr: 0.5, color: '#00D4FF' }} /> : <Description sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
            <ListItemText primary={<Typography variant="body2" sx={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{node.label}</Typography>} />
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto">
            {children.map(child => renderTreeNode(child))}
          </Collapse>
        )}
      </Box>
    );
  };

  if (isLoading) return <LoadingState />;
  if (!wiki) return <EmptyState title="暂无 Wiki 数据" description="该知识库尚未生成 Wiki 内容" />;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', px: 3, py: 2.5 }}>
      {/* 面包屑 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton size="small" onClick={() => navigate(`/rag/knowledge-bases/${kbId}`)}><ArrowBack /></IconButton>
        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }} onClick={() => navigate('/rag/knowledge-bases')}>知识库</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', cursor: 'pointer' }} onClick={() => navigate(`/rag/knowledge-bases/${kbId}`)}>详情</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>/</Typography>
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>Wiki</Typography>
      </Box>

      {/* 操作栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20 }}>Wiki 与知识图谱</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<CheckCircle />}>内容校验</Button>
          <Button variant="contained" size="small" startIcon={<Update />}>更新 Wiki</Button>
        </Box>
      </Box>

      {/* 三栏布局 */}
      <Grid container spacing={2.5}>
        {/* 左侧 - 目录树 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', maxHeight: 700, overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#00D4FF', fontSize: 13 }}>页面目录</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>{tree.length} 个页面</Typography>
            </Box>
            <List dense sx={{ p: 1 }}>
              {rootNodes.map(node => renderTreeNode(node))}
            </List>
          </Card>
        </Grid>

        {/* 中间 - Wiki 正文 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ minHeight: 500 }}>
            <CardContent sx={{ p: 3 }}>
              {content ? (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20, mb: 1.5 }}>{content.title}</Typography>
                  {content.badges && (
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                      {content.badges.map((b: string, i: number) => (
                        <Chip key={i} label={b} size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.15)' }} variant="outlined" />
                      ))}
                    </Box>
                  )}
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.8, mb: 3, p: 2, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.02)', borderLeft: '3px solid rgba(0,212,255,0.3)' }}>
                    {content.intro}
                  </Typography>
                  {content.sections?.map((section: any, i: number) => (
                    <Box key={i} sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 16, mb: 1.5, color: '#E8ECF0', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 4, height: 16, borderRadius: 1, background: 'linear-gradient(180deg, #00D4FF, #7C3AED)' }} />
                        {section.heading}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.8, mb: 1.5 }}>{section.body}</Typography>
                      {section.items && (
                        <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                          {section.items.map((item: string, j: number) => {
                            const boldMatch = item.match(/^(.+?)：/);
                            if (boldMatch) {
                              return (
                                <Typography key={j} variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7 }}>
                                  <Box component="span" sx={{ fontWeight: 600, color: '#E8ECF0' }}>{boldMatch[1]}</Box>
                                  {item.slice(boldMatch[1].length)}
                                </Typography>
                              );
                            }
                            return (
                              <Typography key={j} variant="body2" sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.7 }}>
                                <Box component="span" sx={{ color: '#00D4FF', mr: 1 }}>•</Box>{item}
                              </Typography>
                            );
                          })}
                        </Box>
                      )}
                      {section.citations && (
                        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}>
                          <Typography variant="caption" sx={{ color: '#00D4FF', fontWeight: 600, fontSize: 11, mb: 0.5, display: 'block' }}>引用</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {section.citations.map((c: string, j: number) => (
                              <Chip key={j} label={c} size="small" sx={{ height: 20, fontSize: 10, color: '#00D4FF', borderColor: 'rgba(0,212,255,0.2)' }} variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.secondary">请从左侧目录选择一个页面</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 右侧 - 知识图谱 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Hub sx={{ color: '#00D4FF', fontSize: 18 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#00D4FF', fontSize: 13 }}>知识关系</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>当前页面关联实体</Typography>
            </Box>
            <CardContent sx={{ p: 2 }}>
              {/* SVG 图谱示意 */}
              <Box sx={{ position: 'relative', width: '100%', height: 280, mb: 2 }}>
                <svg width="100%" height="280" viewBox="0 0 240 280">
                  {/* 连线 */}
                  {graphNodes.filter((n: any) => !n.is_main).map((node: any, i: number) => {
                    const angle = (i / (graphNodes.length - 1)) * 2 * Math.PI - Math.PI / 2;
                    const cx = 120 + Math.cos(angle) * 90;
                    const cy = 140 + Math.sin(angle) * 90;
                    return (
                      <line key={`line-${i}`} x1="120" y1="140" x2={cx} y2={cy} stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
                    );
                  })}
                  {/* 主节点 */}
                  <circle cx="120" cy="140" r="28" fill="rgba(0,212,255,0.1)" stroke="#00D4FF" strokeWidth="1.5" />
                  <text x="120" y="144" textAnchor="middle" fill="#00D4FF" fontSize="9" fontWeight="600">
                    {graphNodes.find((n: any) => n.is_main)?.label || '核心'}
                  </text>
                  {/* 子节点 */}
                  {graphNodes.filter((n: any) => !n.is_main).map((node: any, i: number) => {
                    const angle = (i / (graphNodes.length - 1)) * 2 * Math.PI - Math.PI / 2;
                    const cx = 120 + Math.cos(angle) * 90;
                    const cy = 140 + Math.sin(angle) * 90;
                    return (
                      <g key={node.id || i}>
                        <circle cx={cx} cy={cy} r="22" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.4)" strokeWidth="1" />
                        <text x={cx} y={cy + 4} textAnchor="middle" fill="#CE93D8" fontSize="8" fontWeight="500">{node.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </Box>
              {/* 节点列表 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {graphNodes.map((node: any) => (
                  <Box key={node.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1,
                    bgcolor: node.is_main ? 'rgba(0,212,255,0.06)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,212,255,0.04)' },
                  }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: node.is_main ? '#00D4FF' : '#CE93D8', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: 11, fontWeight: node.is_main ? 600 : 400, color: node.is_main ? '#00D4FF' : 'text.secondary' }}>{node.label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
