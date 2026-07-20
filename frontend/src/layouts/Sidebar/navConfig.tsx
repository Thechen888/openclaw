import {
  Dashboard as DashboardIcon,
  Psychology as PsychologyIcon,
  Cable as CableIcon,
  People as PeopleIcon,
  SmartToy as SmartToyIcon,
  Extension as ExtensionIcon,
  Key as KeyIcon,
  Storage as StorageIcon,
  BarChart as BarChartIcon,
  AccountTree,
  Policy,
  Dns,
  Lan,
  PersonSearch,
  PlaylistAddCheckCircle,
  Token,
  Security,
  DataUsage,
  Cloud,
  RestartAlt,
  Queue,
  Speed,
  Gavel,
  Code,
  LibraryBooks,
  ManageAccounts,
  VerifiedUser,
  Fingerprint,
  AutoStories,
  SettingsRemote,
  Backup,
  Inventory2,
  Shield,
  ViewInAr,
  Description as DescriptionIcon,
  MenuBook,
  Chat,
  FindInPage,
  Storefront,
  Workspaces,
  History as HistoryIcon,
} from '@mui/icons-material';

export interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

// ==================== 前台（面向业务用户） ====================
export const frontNavConfig: NavSection[] = [
  {
    label: '智能体',
    items: [
      { title: '全部智能体', path: '/agents', icon: <SmartToyIcon fontSize="small" /> },
      { title: '运行记录', path: '/agents/runs', icon: <BarChartIcon fontSize="small" /> },
    ],
  },
  {
    label: '智能报告',
    items: [
      { title: '报告中心', path: '/reports', icon: <AutoStories fontSize="small" /> },
    ],
  },
  {
    label: '知识库',
    items: [
      { title: '知识库列表', path: '/rag/knowledge-bases', icon: <MenuBook fontSize="small" /> },
    ],
  },
  {
    label: '技能',
    items: [
      { title: '技能列表', path: '/skills', icon: <ExtensionIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Token 转售',
    items: [
      { title: 'Token 转售', path: '/tokens/resale', icon: <Storefront fontSize="small" /> },
    ],
  },
];

// ==================== 后台（面向平台管理员） ====================
export const adminNavConfig: NavSection[] = [
  {
    label: '',
    items: [
      { title: '仪表盘', path: '/', icon: <DashboardIcon fontSize="small" /> },
    ],
  },
  {
    label: '模型管理',
    items: [
      { title: '模型源', path: '/models/sources', icon: <PsychologyIcon fontSize="small" /> },
      { title: '模型策略', path: '/models/policies', icon: <Policy fontSize="small" /> },
      { title: '调用日志', path: '/models/logs', icon: <Dns fontSize="small" /> },
      { title: '成本统计', path: '/models/costs', icon: <Speed fontSize="small" /> },
    ],
  },
  {
    label: '连接器',
    items: [
      { title: 'Starlark适配器', path: '/connectors/starlark', icon: <Code fontSize="small" /> },
      { title: '对接模板', path: '/connectors/templates', icon: <LibraryBooks fontSize="small" /> },
      { title: '聊天适配器', path: '/connectors/chat', icon: <Lan fontSize="small" /> },
      { title: '第三方系统', path: '/connectors/systems', icon: <CableIcon fontSize="small" /> },
    ],
  },
  {
    label: '身份与账号',
    items: [
      { title: '身份源配置', path: '/identity/sources', icon: <ManageAccounts fontSize="small" /> },
      { title: '用户', path: '/identity/users', icon: <PeopleIcon fontSize="small" /> },
      { title: '组织', path: '/identity/orgs', icon: <AccountTree fontSize="small" /> },
      { title: '聊天账号', path: '/identity/chat-accounts', icon: <PersonSearch fontSize="small" /> },
      { title: '第三方账号', path: '/identity/3p-accounts', icon: <PersonSearch fontSize="small" /> },
      { title: '匹配队列', path: '/identity/matching', icon: <PlaylistAddCheckCircle fontSize="small" /> },
      { title: '权限菜单', path: '/identity/permissions', icon: <VerifiedUser fontSize="small" /> },
      { title: '角色', path: '/identity/roles', icon: <Policy fontSize="small" /> },
    ],
  },
  {
    label: '知识库 (RAG)',
    items: [
      { title: '知识库工作台', path: '/rag/workbench', icon: <Workspaces fontSize="small" /> },
      { title: '知识库管理', path: '/rag/knowledge-bases', icon: <MenuBook fontSize="small" /> },
      { title: '知识库日志', path: '/workspace', icon: <HistoryIcon fontSize="small" /> },
    ],
  },
  {
    label: '技能',
    items: [
      { title: '技能列表', path: '/skills', icon: <ExtensionIcon fontSize="small" /> },
      { title: '技能市场', path: '/skills/marketplace', icon: <ExtensionIcon fontSize="small" /> },
    ],
  },
  {
    label: '令牌管理',
    items: [
      { title: 'Token 账户', path: '/tokens/accounts', icon: <KeyIcon fontSize="small" /> },
      { title: '白名单', path: '/tokens/whitelist', icon: <Security fontSize="small" /> },
      { title: '配额管理', path: '/tokens/quotas', icon: <DataUsage fontSize="small" /> },
      { title: '用量看板', path: '/tokens/usage', icon: <BarChartIcon fontSize="small" /> },
      { title: '超额策略', path: '/tokens/overage', icon: <Gavel fontSize="small" /> },
      { title: '审批', path: '/tokens/approvals', icon: <PlaylistAddCheckCircle fontSize="small" /> },
    ],
  },
  {
    label: 'Token 转售',
    items: [
      { title: 'Token 转售', path: '/tokens/resale', icon: <Storefront fontSize="small" /> },
    ],
  },
  {
    label: '资源与运维',
    items: [
      { title: '平台SN', path: '/resources/sn', icon: <Fingerprint fontSize="small" /> },
      { title: '远程管理', path: '/resources/remote', icon: <SettingsRemote fontSize="small" /> },
      { title: '配置备份', path: '/resources/backup', icon: <Backup fontSize="small" /> },
      { title: '磁盘配额', path: '/resources/quota', icon: <DataUsage fontSize="small" /> },
      { title: 'K8s状态', path: '/resources/k8s', icon: <Cloud fontSize="small" /> },
      { title: '服务重启', path: '/resources/restart', icon: <RestartAlt fontSize="small" /> },
      { title: '任务队列', path: '/resources/queues', icon: <Queue fontSize="small" /> },
      { title: 'Python依赖', path: '/resources/python', icon: <Inventory2 fontSize="small" /> },
      { title: '网络白名单', path: '/resources/network-acl', icon: <Shield fontSize="small" /> },
      { title: '容器组', path: '/resources/pods', icon: <ViewInAr fontSize="small" /> },
      { title: 'AGENTS.md 管理', path: '/resources/agents-md', icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
  {
    label: '统计与审计',
    items: [
      { title: '使用统计', path: '/stats/usage', icon: <BarChartIcon fontSize="small" /> },
      { title: '审计日志', path: '/stats/audit', icon: <Gavel fontSize="small" /> },
    ],
  },
];

// 兼容旧引用，默认指向后台导航
export const navConfig: NavSection[] = adminNavConfig;

// 合并全部导航项：供面包屑 / 页面标题查找使用
export const allNavConfig: NavSection[] = [...adminNavConfig, ...frontNavConfig];
