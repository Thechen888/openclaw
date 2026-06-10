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

export const navConfig: NavSection[] = [
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
      { title: '用户', path: '/identity/users', icon: <PeopleIcon fontSize="small" /> },
      { title: '组织', path: '/identity/orgs', icon: <AccountTree fontSize="small" /> },
      { title: '聊天账号', path: '/identity/chat-accounts', icon: <PersonSearch fontSize="small" /> },
      { title: '第三方账号', path: '/identity/3p-accounts', icon: <PersonSearch fontSize="small" /> },
      { title: '匹配队列', path: '/identity/matching', icon: <PlaylistAddCheckCircle fontSize="small" /> },
    ],
  },
  {
    label: '智能体',
    items: [
      { title: '全部智能体', path: '/agents', icon: <SmartToyIcon fontSize="small" /> },
      { title: '运行记录', path: '/agents/runs', icon: <BarChartIcon fontSize="small" /> },
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
      { title: '令牌', path: '/tokens', icon: <KeyIcon fontSize="small" /> },
      { title: '审批', path: '/tokens/approvals', icon: <Security fontSize="small" /> },
    ],
  },
  {
    label: '资源与运维',
    items: [
      { title: '磁盘配额', path: '/resources/quota', icon: <DataUsage fontSize="small" /> },
      { title: 'K8s状态', path: '/resources/k8s', icon: <Cloud fontSize="small" /> },
      { title: '服务重启', path: '/resources/restart', icon: <RestartAlt fontSize="small" /> },
      { title: '任务队列', path: '/resources/queues', icon: <Queue fontSize="small" /> },
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
