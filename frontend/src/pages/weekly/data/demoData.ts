import type {
  ReportDefinition, ReportGroup, AgentOutput, SidebarItem,
} from '../report-engine/types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Agent Output Demo Data (simulates what Agent would produce)
// ============================================================

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const DEPARTMENTS = ['研发部', '产品部', '市场部', '运营部', '财务部'];

export const AGENT_OUTPUT_BY_DEPT: Record<string, AgentOutput> = {
  '研发部': {
    dept_name: '研发部',
    period: '2026-Q2',
    headcount: 45,
    headcount_trend: '+3',
    budget_total: '5,200,000',
    budget_used: '3,680,000',
    budget_rate: '70.8%',
    satisfaction: '92%',
    satisfaction_trend: '+2%',
    completion_rate: '87%',
    quarterly_revenue: { Q1: 1200000, Q2: 1350000, Q3: 1500000, Q4: 0 },
    quarterly_cost: { Q1: 800000, Q2: 850000, Q3: 900000, Q4: 0 },
    quarterly_profit: { Q1: 400000, Q2: 500000, Q3: 600000, Q4: 0 },
    project_status: [
      { project: 'Agent报告平台', status: '进行中', progress: '65%', owner: '张工', deadline: '2026-08-30' },
      { project: '数据中台V2', status: '已完成', progress: '100%', owner: '李工', deadline: '2026-06-15' },
      { project: 'AI推理服务', status: '进行中', progress: '40%', owner: '王工', deadline: '2026-09-30' },
      { project: '监控告警系统', status: '待启动', progress: '0%', owner: '赵工', deadline: '2026-10-31' },
    ],
    skill_distribution: [
      { name: '后端开发', value: 18 },
      { name: '前端开发', value: 10 },
      { name: 'AI/ML', value: 8 },
      { name: '测试', value: 5 },
      { name: '架构', value: 4 },
    ],
    monthly_output: [
      { month: '4月', commits: 320, reviews: 180, deploys: 24 },
      { month: '5月', commits: 380, reviews: 210, deploys: 28 },
      { month: '6月', commits: 410, reviews: 230, deploys: 32 },
    ],
  },
  '产品部': {
    dept_name: '产品部',
    period: '2026-Q2',
    headcount: 20,
    headcount_trend: '+1',
    budget_total: '2,800,000',
    budget_used: '1,960,000',
    budget_rate: '70.0%',
    satisfaction: '88%',
    satisfaction_trend: '+1%',
    completion_rate: '91%',
    quarterly_revenue: { Q1: 800000, Q2: 950000, Q3: 1100000, Q4: 0 },
    quarterly_cost: { Q1: 500000, Q2: 550000, Q3: 600000, Q4: 0 },
    quarterly_profit: { Q1: 300000, Q2: 400000, Q3: 500000, Q4: 0 },
    project_status: [
      { project: '用户增长策略', status: '进行中', progress: '55%', owner: '陈PM', deadline: '2026-08-15' },
      { project: '产品体验优化', status: '进行中', progress: '80%', owner: '孙PM', deadline: '2026-07-31' },
      { project: 'B端客户需求', status: '待启动', progress: '10%', owner: '周PM', deadline: '2026-09-30' },
    ],
    skill_distribution: [
      { name: '产品经理', value: 8 },
      { name: 'UX设计', value: 5 },
      { name: '数据分析', value: 4 },
      { name: '用户研究', value: 3 },
    ],
    monthly_output: [
      { month: '4月', commits: 0, reviews: 45, deploys: 0 },
      { month: '5月', commits: 0, reviews: 52, deploys: 0 },
      { month: '6月', commits: 0, reviews: 61, deploys: 0 },
    ],
  },
  '市场部': {
    dept_name: '市场部',
    period: '2026-Q2',
    headcount: 30,
    headcount_trend: '+2',
    budget_total: '8,500,000',
    budget_used: '6,200,000',
    budget_rate: '72.9%',
    satisfaction: '85%',
    satisfaction_trend: '-1%',
    completion_rate: '78%',
    quarterly_revenue: { Q1: 2000000, Q2: 2300000, Q3: 2600000, Q4: 0 },
    quarterly_cost: { Q1: 1500000, Q2: 1600000, Q3: 1700000, Q4: 0 },
    quarterly_profit: { Q1: 500000, Q2: 700000, Q3: 900000, Q4: 0 },
    project_status: [
      { project: '品牌升级', status: '进行中', progress: '70%', owner: '刘总监', deadline: '2026-08-01' },
      { project: '线上获客', status: '进行中', progress: '50%', owner: '吴经理', deadline: '2026-09-15' },
      { project: '行业展会', status: '已完成', progress: '100%', owner: '郑经理', deadline: '2026-06-20' },
    ],
    skill_distribution: [
      { name: '品牌营销', value: 8 },
      { name: '数字营销', value: 10 },
      { name: '内容运营', value: 7 },
      { name: '活动策划', value: 5 },
    ],
    monthly_output: [
      { month: '4月', commits: 0, reviews: 0, deploys: 0 },
      { month: '5月', commits: 0, reviews: 0, deploys: 0 },
      { month: '6月', commits: 0, reviews: 0, deploys: 0 },
    ],
  },
  '运营部': {
    dept_name: '运营部',
    period: '2026-Q2',
    headcount: 25,
    headcount_trend: '0',
    budget_total: '3,200,000',
    budget_used: '2,100,000',
    budget_rate: '65.6%',
    satisfaction: '90%',
    satisfaction_trend: '+3%',
    completion_rate: '83%',
    quarterly_revenue: { Q1: 600000, Q2: 700000, Q3: 800000, Q4: 0 },
    quarterly_cost: { Q1: 400000, Q2: 420000, Q3: 450000, Q4: 0 },
    quarterly_profit: { Q1: 200000, Q2: 280000, Q3: 350000, Q4: 0 },
    project_status: [
      { project: '客户留存提升', status: '进行中', progress: '60%', owner: '马经理', deadline: '2026-08-31' },
      { project: '自动化运营', status: '进行中', progress: '35%', owner: '许经理', deadline: '2026-10-15' },
    ],
    skill_distribution: [
      { name: '用户运营', value: 10 },
      { name: '内容运营', value: 8 },
      { name: '数据运营', value: 5 },
      { name: '客服', value: 2 },
    ],
    monthly_output: [
      { month: '4月', commits: 0, reviews: 0, deploys: 0 },
      { month: '5月', commits: 0, reviews: 0, deploys: 0 },
      { month: '6月', commits: 0, reviews: 0, deploys: 0 },
    ],
  },
  '财务部': {
    dept_name: '财务部',
    period: '2026-Q2',
    headcount: 15,
    headcount_trend: '0',
    budget_total: '1,500,000',
    budget_used: '980,000',
    budget_rate: '65.3%',
    satisfaction: '95%',
    satisfaction_trend: '+1%',
    completion_rate: '96%',
    quarterly_revenue: { Q1: 300000, Q2: 320000, Q3: 350000, Q4: 0 },
    quarterly_cost: { Q1: 200000, Q2: 210000, Q3: 220000, Q4: 0 },
    quarterly_profit: { Q1: 100000, Q2: 110000, Q3: 130000, Q4: 0 },
    project_status: [
      { project: '财务自动化', status: '已完成', progress: '100%', owner: '黄总监', deadline: '2026-06-30' },
      { project: '预算管控系统', status: '进行中', progress: '80%', owner: '林经理', deadline: '2026-07-31' },
    ],
    skill_distribution: [
      { name: '财务管理', value: 6 },
      { name: '审计', value: 4 },
      { name: '税务', value: 3 },
      { name: '出纳', value: 2 },
    ],
    monthly_output: [
      { month: '4月', commits: 0, reviews: 0, deploys: 0 },
      { month: '5月', commits: 0, reviews: 0, deploys: 0 },
      { month: '6月', commits: 0, reviews: 0, deploys: 0 },
    ],
  },
};

// Company-wide aggregated data
export const COMPANY_AGENT_OUTPUT: AgentOutput = {
  company_name: 'OneLine AI',
  period: '2026-Q2',
  total_headcount: 135,
  total_budget: '21,200,000',
  total_budget_used: '14,920,000',
  overall_budget_rate: '70.4%',
  avg_satisfaction: '90%',
  avg_completion: '87%',
  dept_headcount: [
    { name: '研发部', value: 45 },
    { name: '市场部', value: 30 },
    { name: '运营部', value: 25 },
    { name: '产品部', value: 20 },
    { name: '财务部', value: 15 },
  ],
  dept_budget: [
    { dept: '研发部', budget: 5200000, used: 3680000 },
    { dept: '产品部', budget: 2800000, used: 1960000 },
    { dept: '市场部', budget: 8500000, used: 6200000 },
    { dept: '运营部', budget: 3200000, used: 2100000 },
    { dept: '财务部', budget: 1500000, used: 980000 },
  ],
  dept_revenue: [
    { dept: '研发部', Q1: 1200000, Q2: 1350000, Q3: 1500000 },
    { dept: '产品部', Q1: 800000, Q2: 950000, Q3: 1100000 },
    { dept: '市场部', Q1: 2000000, Q2: 2300000, Q3: 2600000 },
    { dept: '运营部', Q1: 600000, Q2: 700000, Q3: 800000 },
    { dept: '财务部', Q1: 300000, Q2: 320000, Q3: 350000 },
  ],
  dept_satisfaction: [
    { dept: '财务部', score: 95 },
    { dept: '研发部', score: 92 },
    { dept: '运营部', score: 90 },
    { dept: '产品部', score: 88 },
    { dept: '市场部', score: 85 },
  ],
  all_projects: [
    { project: 'Agent报告平台', dept: '研发部', status: '进行中', progress: '65%', deadline: '2026-08-30' },
    { project: '数据中台V2', dept: '研发部', status: '已完成', progress: '100%', deadline: '2026-06-15' },
    { project: 'AI推理服务', dept: '研发部', status: '进行中', progress: '40%', deadline: '2026-09-30' },
    { project: '用户增长策略', dept: '产品部', status: '进行中', progress: '55%', deadline: '2026-08-15' },
    { project: '品牌升级', dept: '市场部', status: '进行中', progress: '70%', deadline: '2026-08-01' },
    { project: '客户留存提升', dept: '运营部', status: '进行中', progress: '60%', deadline: '2026-08-31' },
    { project: '财务自动化', dept: '财务部', status: '已完成', progress: '100%', deadline: '2026-06-30' },
    { project: '预算管控系统', dept: '财务部', status: '进行中', progress: '80%', deadline: '2026-07-31' },
  ],
};

// ============================================================
// Report Definitions
// ============================================================

const hdr = (cells: string[]): { id: string; isHeader: true; cells: { id: string; type: 'fixed'; value: string; style?: object }[] } => ({
  id: uuidv4(),
  isHeader: true,
  cells: cells.map(v => ({ id: uuidv4(), type: 'fixed' as const, value: v })),
});

const row = (cells: { v: string; t?: 'fixed' | 'binding' }[]): { id: string; isHeader?: false; cells: { id: string; type: 'fixed' | 'binding'; value: string }[] } => ({
  id: uuidv4(),
  cells: cells.map(c => ({ id: uuidv4(), type: c.t || 'fixed', value: c.v })),
});

const b = (key: string) => ({ v: `{{${key}}}`, t: 'binding' as const });
const f = (text: string) => ({ v: text });

// Report 1: Department Quarterly Report (Tabbed - one tab per dept)
export const DEPT_QUARTERLY_REPORT: ReportDefinition = {
  id: 'dept-quarterly',
  name: '部门季度报告',
  period: '2026-Q2',
  dataId: 'dept_agent',
  icon: 'building2',
  description: '各部门季度经营数据汇总',
  viewMode: 'tab',
  tabs: DEPARTMENTS.map(dept => ({
    id: `tab-${dept}`,
    label: dept,
    departmentKey: dept,
    sections: [
      {
        type: 'kpi-cards' as const,
        cards: [
          { label: '人员总数', bindingKey: 'dept_agent.headcount', unit: '人', icon: 'users', trend: 'up' as const, trendBinding: 'dept_agent.headcount_trend' },
          { label: '预算执行率', bindingKey: 'dept_agent.budget_rate', icon: 'wallet', trend: 'neutral' as const },
          { label: '满意度', bindingKey: 'dept_agent.satisfaction', icon: 'smile', trend: 'up' as const, trendBinding: 'dept_agent.satisfaction_trend' },
          { label: '完成率', bindingKey: 'dept_agent.completion_rate', icon: 'check-circle', trend: 'neutral' as const },
        ],
      },
      {
        type: 'table' as const,
        title: '季度财务数据',
        colCount: 4,
        headerStyle: { backgroundColor: '#1e40af', color: '#fff', fontWeight: 'bold' as const, padding: 10, textAlign: 'center' as const },
        defaultStyle: { padding: 8, textAlign: 'center' as const, borderColor: '#e5e7eb' },
        rows: [
          hdr(['指标', 'Q1', 'Q2', 'Q3']),
          row([f('收入'), b('dept_agent.quarterly_revenue.Q1'), b('dept_agent.quarterly_revenue.Q2'), b('dept_agent.quarterly_revenue.Q3')]),
          row([f('成本'), b('dept_agent.quarterly_cost.Q1'), b('dept_agent.quarterly_cost.Q2'), b('dept_agent.quarterly_cost.Q3')]),
          row([f('利润'), b('dept_agent.quarterly_profit.Q1'), b('dept_agent.quarterly_profit.Q2'), b('dept_agent.quarterly_profit.Q3')]),
        ],
      },
      {
        type: 'chart' as const,
        layout: 'row' as const,
        charts: [
          { id: 'skill-pie', title: '人员技能分布', type: 'pie' as const, bindingKey: 'dept_agent.skill_distribution', labelField: 'name', valueFields: ['value'], colors: COLORS },
          { id: 'output-bar', title: '月度产出', type: 'bar' as const, bindingKey: 'dept_agent.monthly_output', labelField: 'month', valueFields: ['commits', 'reviews', 'deploys'], colors: ['#3b82f6', '#10b981', '#f59e0b'] },
        ],
      },
      {
        type: 'table' as const,
        title: '项目进展',
        colCount: 5,
        headerStyle: { backgroundColor: '#059669', color: '#fff', fontWeight: 'bold' as const, padding: 10, textAlign: 'center' as const },
        defaultStyle: { padding: 8, textAlign: 'center' as const, borderColor: '#e5e7eb' },
        arrayBindingKey: 'dept_agent.project_status',
        dynamicColumns: [
          { key: 'project', label: '项目' },
          { key: 'status', label: '状态' },
          { key: 'progress', label: '进度' },
          { key: 'owner', label: '负责人' },
          { key: 'deadline', label: '截止日期' },
        ],
        statusField: 'status',
        statusStyles: [
          { text: '已完成', backgroundColor: '#dcfce7', color: '#166534' },
          { text: '进行中', backgroundColor: '#dbeafe', color: '#1e40af' },
          { text: '待启动', backgroundColor: '#f3f4f6', color: '#4b5563' },
        ],
        rows: [
          hdr(['项目', '状态', '进度', '负责人', '截止日期']),
        ],
      },
    ],
  })),
  bindingFields: [
    { name: 'headcount', label: '人数', type: 'single' },
    { name: 'headcount_trend', label: '人数趋势', type: 'single' },
    { name: 'budget_rate', label: '预算执行率', type: 'single' },
    { name: 'satisfaction', label: '满意度', type: 'single' },
    { name: 'satisfaction_trend', label: '满意度趋势', type: 'single' },
    { name: 'completion_rate', label: '完成率', type: 'single' },
    { name: 'quarterly_revenue', label: '季度收入', type: 'kv' },
    { name: 'quarterly_cost', label: '季度成本', type: 'kv' },
    { name: 'quarterly_profit', label: '季度利润', type: 'kv' },
    { name: 'skill_distribution', label: '技能分布', type: 'array' },
    { name: 'project_status', label: '项目状态', type: 'array' },
    { name: 'monthly_output', label: '月度产出', type: 'array' },
  ],
  createdAt: new Date().toISOString(),
};

// Report 2: Company Overview (Single page)
export const COMPANY_OVERVIEW_REPORT: ReportDefinition = {
  id: 'company-overview',
  name: '公司综合报告',
  period: '2026-Q2',
  dataId: 'company_agent',
  icon: 'globe',
  description: '全公司经营总览与各部门对比',
  viewMode: 'page',
  sections: [
    {
      type: 'kpi-cards' as const,
      cards: [
        { label: '总人数', bindingKey: 'company_agent.total_headcount', unit: '人', icon: 'users', trend: 'up' as const },
        { label: '总预算', bindingKey: 'company_agent.total_budget', unit: '¥', icon: 'wallet', trend: 'neutral' as const },
        { label: '预算执行率', bindingKey: 'company_agent.overall_budget_rate', icon: 'trending-up', trend: 'up' as const },
        { label: '平均满意度', bindingKey: 'company_agent.avg_satisfaction', icon: 'smile', trend: 'up' as const },
        { label: '平均完成率', bindingKey: 'company_agent.avg_completion', icon: 'check-circle', trend: 'up' as const },
      ],
    },
    {
      type: 'chart' as const,
      layout: 'row' as const,
      charts: [
        { id: 'dept-hc-pie', title: '各部门人员占比', type: 'pie' as const, bindingKey: 'company_agent.dept_headcount', labelField: 'name', valueFields: ['value'], colors: COLORS },
        { id: 'dept-revenue-bar', title: '各部门季度收入', type: 'bar' as const, bindingKey: 'company_agent.dept_revenue', labelField: 'dept', valueFields: ['Q1', 'Q2', 'Q3'], colors: ['#3b82f6', '#10b981', '#f59e0b'] },
      ],
    },
    {
      type: 'chart' as const,
      layout: 'row' as const,
      charts: [
        { id: 'dept-budget-bar', title: '各部门预算 vs 使用', type: 'stacked-bar' as const, bindingKey: 'company_agent.dept_budget', labelField: 'dept', valueFields: ['budget', 'used'], colors: ['#e5e7eb', '#3b82f6'] },
        { id: 'dept-sat-bar', title: '各部门满意度', type: 'bar' as const, bindingKey: 'company_agent.dept_satisfaction', labelField: 'dept', valueFields: ['score'], colors: ['#10b981'] },
      ],
    },
    {
      type: 'table' as const,
      title: '全公司项目总览',
      colCount: 5,
      headerStyle: { backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold' as const, padding: 10, textAlign: 'center' as const },
      defaultStyle: { padding: 8, textAlign: 'center' as const, borderColor: '#e5e7eb' },
      arrayBindingKey: 'company_agent.all_projects',
      dynamicColumns: [
        { key: 'project', label: '项目' },
        { key: 'dept', label: '所属部门' },
        { key: 'status', label: '状态' },
        { key: 'progress', label: '进度' },
        { key: 'deadline', label: '截止日期' },
      ],
      statusField: 'status',
      statusStyles: [
        { text: '已完成', backgroundColor: '#dcfce7', color: '#166534' },
        { text: '进行中', backgroundColor: '#dbeafe', color: '#1e40af' },
        { text: '待启动', backgroundColor: '#f3f4f6', color: '#4b5563' },
      ],
      rows: [
        hdr(['项目', '所属部门', '状态', '进度', '截止日期']),
      ],
    },
  ],
  bindingFields: [
    { name: 'total_headcount', label: '总人数', type: 'single' },
    { name: 'total_budget', label: '总预算', type: 'single' },
    { name: 'overall_budget_rate', label: '预算执行率', type: 'single' },
    { name: 'avg_satisfaction', label: '平均满意度', type: 'single' },
    { name: 'avg_completion', label: '平均完成率', type: 'single' },
    { name: 'dept_headcount', label: '部门人数', type: 'array' },
    { name: 'dept_revenue', label: '部门收入', type: 'array' },
    { name: 'dept_budget', label: '部门预算', type: 'array' },
    { name: 'dept_satisfaction', label: '部门满意度', type: 'array' },
    { name: 'all_projects', label: '全部项目', type: 'array' },
  ],
  createdAt: new Date().toISOString(),
};

// Report 3: Budget Report (Tabbed - dept + company)
export const BUDGET_REPORT: ReportDefinition = {
  id: 'budget-report',
  name: '预算执行报告',
  period: '2026-Q2',
  dataId: 'budget_agent',
  icon: 'wallet',
  description: '预算分配与执行情况',
  viewMode: 'tab',
  tabs: [
    ...DEPARTMENTS.map(dept => ({
      id: `budget-${dept}`,
      label: dept,
      departmentKey: dept,
      sections: [
        {
          type: 'kpi-cards' as const,
          cards: [
            { label: '总预算', bindingKey: 'budget_agent.budget_total', unit: '¥', icon: 'wallet', trend: 'neutral' as const },
            { label: '已使用', bindingKey: 'budget_agent.budget_used', unit: '¥', icon: 'credit-card', trend: 'up' as const },
            { label: '执行率', bindingKey: 'budget_agent.budget_rate', icon: 'percent', trend: 'neutral' as const },
          ],
        },
        {
          type: 'chart' as const,
          layout: 'row' as const,
          charts: [
            { id: `budget-${dept}-cost`, title: '季度成本', type: 'bar' as const, bindingKey: 'budget_agent.quarterly_cost', labelField: 'name', valueFields: ['value'], colors: ['#ef4444'] },
          ],
        },
      ],
    })),
    {
      id: 'budget-company',
      label: '公司汇总',
      sections: [
        {
          type: 'chart' as const,
          layout: 'row' as const,
          charts: [
            { id: 'budget-all', title: '各部门预算对比', type: 'stacked-bar' as const, bindingKey: 'budget_agent.dept_budget', labelField: 'dept', valueFields: ['budget', 'used'], colors: ['#e5e7eb', '#3b82f6'] },
          ],
        },
      ],
    },
  ],
  bindingFields: [
    { name: 'budget_total', label: '总预算', type: 'single', required: false },
    { name: 'budget_used', label: '已使用', type: 'single', required: false },
    { name: 'budget_rate', label: '执行率', type: 'single', required: false },
    { name: 'quarterly_cost', label: '季度成本', type: 'kv', required: false },
    { name: 'dept_budget', label: '部门预算', type: 'array', required: false },
  ],
  createdAt: new Date().toISOString(),
};

// ============================================================
// Report Groups & Sidebar
// ============================================================

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: 'grp-overview',
    name: '总览',
    icon: 'layout-dashboard',
    reports: [COMPANY_OVERVIEW_REPORT],
  },
  {
    id: 'grp-dept',
    name: '部门报告',
    icon: 'building2',
    reports: [DEPT_QUARTERLY_REPORT],
  },
  {
    id: 'grp-finance',
    name: '财务',
    icon: 'wallet',
    reports: [BUDGET_REPORT],
  },
];

export const ALL_REPORTS: ReportDefinition[] = [
  COMPANY_OVERVIEW_REPORT,
  DEPT_QUARTERLY_REPORT,
  BUDGET_REPORT,
];

export const SIDEBAR_ITEMS: SidebarItem[] = [
  ...REPORT_GROUPS.map(g => ({
    id: g.id,
    label: g.name,
    icon: g.icon,
    type: 'group' as const,
    children: g.reports.map((r: ReportDefinition) => ({
      id: r.id,
      label: r.name,
      icon: r.icon,
      type: 'report' as const,
      reportId: r.id,
    })),
  })),
  { id: 'builder', label: '模板构建器', icon: 'layout-grid', type: 'builder' as const },
  { id: 'agent-doc', label: 'Agent 数据协议', icon: 'bot', type: 'agent-doc' as const },
];
