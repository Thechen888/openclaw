// =================== Mock 数据（中文） ===================
// 所有模块的完整示例数据，用于无后端时的前端原型展示

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();
const dayAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

function getWeekInfo(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const firstDay = new Date(monday.getFullYear(), 0, 1);
  const pastDays = (monday.getTime() - firstDay.getTime()) / 86400000;
  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return {
    year: monday.getFullYear(),
    week,
    week_start: monday.toISOString(),
    week_end: sunday.toISOString(),
  };
}

function paginate(data: any[], page = 1, page_size = 20, search = '') {
  let filtered = data;
  if (search) {
    const s = search.toLowerCase();
    filtered = data.filter((item: any) =>
      JSON.stringify(item).toLowerCase().includes(s)
    );
  }
  const total = filtered.length;
  const start = (page - 1) * page_size;
  return {
    code: 0,
    message: 'ok',
    data: filtered.slice(start, start + page_size),
    pagination: { page, page_size, total, total_pages: Math.ceil(total / page_size) },
  };
}

function ok(data: any) {
  return { code: 0, message: 'ok', data };
}

function toMarkdown(report: any) {
  const lines = [
    `# ${report.title}`,
    '',
    `- 类型：${report.type === 'operation' ? '运营周报' : '部门周报'}`,
    `- 周期：${report.year}年第${report.week}周`,
    `- 部门：${report.department_name || '运营汇总'}`,
    `- 创建人：${report.creator}`,
    `- 创建时间：${new Date(report.created_at).toLocaleString()}`,
    '',
    '## 核心指标',
    '',
    ...(report.metrics?.map((m: any) => `- **${m.name}**：${m.value}${m.unit}（环比 ${m.week_over_week >= 0 ? '+' : ''}${m.week_over_week}${m.unit}）`) || []),
    '',
    '## AI 总结',
    '',
    report.summary || '',
    '',
    '## 本周亮点',
    '',
    ...(report.highlights?.map((h: string) => `- ${h}`) || []),
    '',
    '## 风险与问题',
    '',
    ...(report.risks?.map((r: string) => `- ${r}`) || []),
    '',
    '## 下周计划',
    '',
    ...(report.next_week_plan?.map((p: string) => `- ${p}`) || []),
  ];
  return lines.join('\n');
}

function generateMetrics(sources: any[], departmentId: string) {
  const relevant = sources.filter((s: any) =>
    !departmentId || (s.department_ids || []).includes(departmentId)
  );
  const picked = relevant.length > 0 ? relevant : sources;
  const shuffled = [...picked].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).map((s: any) => ({
    source_id: s.id,
    name: s.name,
    value: Number((Math.random() * 100).toFixed(1)),
    unit: s.unit,
    week_over_week: Number((Math.random() * 20 - 10).toFixed(1)),
    trend_direction: s.trend_direction || 'neutral',
  }));
}

function buildOperationSummary(reports: any[], week: number) {
  const deptReports = reports.filter((r: any) => r.type === 'department');
  const highlights: string[] = [];
  const risks: string[] = [];
  const plans: string[] = [];
  deptReports.forEach((r: any) => {
    if (r.highlights?.[0]) highlights.push(`${r.department_name}：${r.highlights[0]}`);
    if (r.risks?.[0]) risks.push(`${r.department_name}：${r.risks[0]}`);
    if (r.next_week_plan?.[0]) plans.push(`${r.department_name}：${r.next_week_plan[0]}`);
  });
  return {
    summary: `第${week}周整体运营平稳。${deptReports.map((r: any) => r.department_name).join('、')}等部门已完成周报提交，核心指标表现符合预期。`,
    highlights: highlights.slice(0, 3).length ? highlights.slice(0, 3) : ['各部门完成本周核心目标'],
    risks: risks.slice(0, 2).length ? risks.slice(0, 2) : ['需持续关注跨部门协同风险'],
    next_week_plan: plans.slice(0, 3).length ? plans.slice(0, 3) : ['推进下周重点工作', '完成数据复盘'],
  };
}

function aggregateOperationMetrics(reports: any[], sources: any[]) {
  const metricMap = new Map<string, any>();
  reports.filter((r: any) => r.type === 'department').forEach((r: any) => {
    r.metrics?.forEach((m: any) => {
      const def = sources.find((s: any) => s.id === m.source_id);
      const prev = metricMap.get(m.source_id);
      if (!prev) {
        metricMap.set(m.source_id, { ...m, count: 1, sourceDef: def });
      } else {
        prev.value += m.value;
        prev.week_over_week += m.week_over_week;
        prev.count += 1;
      }
    });
  });

  const aggregated = Array.from(metricMap.values())
    .filter((m: any) => m.count >= 2)
    .map((m: any) => ({
      source_id: m.source_id,
      name: m.name,
      value: Number((m.value / m.count).toFixed(1)),
      unit: m.unit,
      week_over_week: Number((m.week_over_week / m.count).toFixed(1)),
      trend_direction: m.sourceDef?.trend_direction || 'neutral',
    }))
    .slice(0, 4);

  if (aggregated.length === 0) {
    const allMetrics: any[] = [];
    reports.filter((r: any) => r.type === 'department').forEach((r: any) => {
      r.metrics?.forEach((m: any) => {
        const def = sources.find((s: any) => s.id === m.source_id);
        allMetrics.push({ ...m, trend_direction: def?.trend_direction || 'neutral' });
      });
    });
    return allMetrics.slice(0, 4);
  }
  return aggregated;
}

// =================== 模型源 ===================
const modelSources = [
  { id: 'ms-1', provider: 'OpenAI', model_name: 'gpt-4o', display_name: 'GPT-4o', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["文本","视觉","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 456.78, requests_30d: 4521, input_tokens_30d: 1250000, output_tokens_30d: 680000 },
  { id: 'ms-2', provider: 'OpenAI', model_name: 'gpt-4o-mini', display_name: 'GPT-4o Mini', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["文本","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 123.45, requests_30d: 5234, input_tokens_30d: 890000, output_tokens_30d: 450000 },
  { id: 'ms-3', provider: 'Anthropic', model_name: 'claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet', api_endpoint: 'https://api.anthropic.com/v1', auth_type: 'api_key', capabilities: '["文本","视觉","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 234.56, requests_30d: 2345, input_tokens_30d: 680000, output_tokens_30d: 350000 },
  { id: 'ms-4', provider: '阿里云', model_name: 'qwen-vl-max', display_name: '通义千问VL', api_endpoint: 'https://dashscope.aliyuncs.com/api/v1', auth_type: 'api_key', capabilities: '["文本","视觉"]', health_status: 'degraded', status: 'active', estimated_cost_30d: 89.20, requests_30d: 1890, input_tokens_30d: 520000, output_tokens_30d: 280000 },
  { id: 'ms-5', provider: '智谱AI', model_name: 'glm-4', display_name: 'GLM-4', api_endpoint: 'https://open.bigmodel.cn/api/v4', auth_type: 'api_key', capabilities: '["文本","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 67.80, requests_30d: 1234, input_tokens_30d: 340000, output_tokens_30d: 180000 },
  { id: 'ms-6', provider: 'OpenAI', model_name: 'text-embedding-3-small', display_name: 'Embedding 3 Small', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["向量嵌入"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 42.00, requests_30d: 8901, input_tokens_30d: 2100000, output_tokens_30d: 0 },
];

// =================== 模型策略 ===================
const modelPolicies = [
  { id: 'mp-1', name: '通用对话策略', rotation_method: 'priority', status: 'active', is_default: true, upstream_ids: ['ms-1', 'ms-3', 'ms-5'], timeout_seconds: 30, retry_count: 2 },
  { id: 'mp-2', name: '高性价比对话', rotation_method: 'round_robin', status: 'active', is_default: false, upstream_ids: ['ms-2', 'ms-5'], timeout_seconds: 20, retry_count: 1 },
  { id: 'mp-3', name: '视觉理解策略', rotation_method: 'priority', status: 'active', is_default: false, upstream_ids: ['ms-1', 'ms-4'], timeout_seconds: 60, retry_count: 1 },
  { id: 'mp-4', name: '向量嵌入策略', rotation_method: 'round_robin', status: 'active', is_default: false, upstream_ids: ['ms-6'], timeout_seconds: 15, retry_count: 0 },
  { id: 'mp-5', name: '备用国产策略', rotation_method: 'priority', status: 'disabled', is_default: false, upstream_ids: ['ms-5', 'ms-4', 'ms-2'], timeout_seconds: 30, retry_count: 2 },
];

// =================== 聊天适配器 ===================
const chatAdapters = [
  {
    id: 'ca-1', name: '企业微信-主应用', chat_type: 'wechat_work', status: 'active',
    webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
    corp_id: 'ww1234567890', agent_id: '1000001', app_secret: '******',
    last_sync_at: ago(15),
  },
  {
    id: 'ca-2', name: '钉钉-审批通知', chat_type: 'dingtalk', status: 'active',
    webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
    access_token: 'xxxxxxxxxxxxxxxx', sign_secret: '******',
    last_sync_at: ago(60),
  },
  {
    id: 'ca-3', name: '飞书-客服机器人', chat_type: 'feishu', status: 'active',
    app_id: 'cli_xxxxxxxxx', app_secret: '******',
    webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    last_sync_at: ago(120),
  },
  {
    id: 'ca-4', name: 'Slack-开发频道', chat_type: 'slack', status: 'disabled',
    bot_token: '******',
    webhook_url: 'https://hooks.slack.com/services/xxx',
    channel_id: 'C0XXXXXXXXX', sign_secret: '******',
    last_sync_at: ago(7200),
  },
];

// =================== 第三方系统 ===================
const connectors = [
  { id: 'cn-1', name: 'Salesforce CRM', system_type: 'crm', provider: 'salesforce', api_base_url: 'https://myorg.my.salesforce.com/api/v54.0', status: 'active', description: '客户关系管理系统' },
  { id: 'cn-2', name: 'SAP ERP', system_type: 'erp', provider: 'sap', api_base_url: 'https://sap.internal.company.com/api', status: 'active', description: '企业资源规划系统' },
  { id: 'cn-3', name: 'Jira 项目管理', system_type: 'project_management', provider: 'jira', api_base_url: 'https://company.atlassian.net/rest/api/3', status: 'active', description: '项目与任务跟踪系统' },
  { id: 'cn-4', name: 'Zendesk 工单系统', system_type: 'helpdesk', provider: 'zendesk', api_base_url: 'https://company.zendesk.com/api/v2', status: 'disabled', description: '客服工单管理系统' },
  { id: 'cn-5', name: '北森 HR 系统', system_type: 'hr', provider: 'custom', api_base_url: 'https://hr.company.com/api/v1', status: 'active', description: '人力资源管理系统' },
];

// =================== Starlark 适配器 ===================
const starlarkAdapters: any[] = [
  {
    id: 'sa-1', name: 'CRM客户同步', description: '从CRM拉取客户信息并同步到本地',
    version: '1.2.0', last_sync: '2026/5/31 18:00:00', status: 'active', author: '张伟',
    token_id: 'tk-1',
    api_functions: [
      { name: 'read_contacts', method: 'GET', description: '读取联系人列表', script: 'def read_contacts(ctx):\n  return ctx.http.get("/contacts")' },
      { name: 'read_deals', method: 'GET', description: '读取交易列表', script: 'def read_deals(ctx):\n  return ctx.http.get("/deals")' },
      { name: 'write_notes', method: 'POST', description: '写入备注', script: 'def write_notes(ctx, data):\n  return ctx.http.post("/notes", data)' },
    ],
    config_items: [
      { key: 'base_url', value: 'https://crm.example.com/api/v1', is_secret: false },
      { key: 'tenant_id', value: 'tenant-001', is_secret: false },
    ],
    var_items: [
      { key: 'base_url', value: 'https://crm.example.com/api/v1', description: 'CRM API基础地址' },
      { key: 'timeout', value: '30', description: '请求超时时间（秒）' },
      { key: 'env', value: 'production', description: '运行环境：production / staging' },
    ],
    full_script: '# CRM客户同步适配器\ndef read_contacts(ctx):\n  return ctx.http.get("/contacts")\n\ndef read_deals(ctx):\n  return ctx.http.get("/deals")\n\ndef write_notes(ctx, data):\n  return ctx.http.post("/notes", data)',
  },
  {
    id: 'sa-2', name: 'ERP订单查询', description: '查询用友ERP订单状态和库存',
    version: '1.0.0', last_sync: '2026/5/31 16:00:00', status: 'active', author: '李思',
    token_id: 'tk-2',
    api_functions: [
      { name: 'read_orders', method: 'GET', description: '读取订单', script: 'def read_orders(ctx):\n  return ctx.http.get("/orders")' },
      { name: 'read_inventory', method: 'GET', description: '读取库存', script: 'def read_inventory(ctx):\n  return ctx.http.get("/inventory")' },
    ],
    config_items: [
      { key: 'base_url', value: 'https://erp.example.com/openapi', is_secret: false },
      { key: 'app_key', value: 'yonyou-app-key', is_secret: false },
    ],
    var_items: [
      { key: 'base_url', value: 'https://erp.example.com/openapi', description: 'ERP API基础地址' },
      { key: 'page_size', value: '50', description: '分页查询每页数量' },
    ],
    full_script: '# ERP订单查询适配器\ndef read_orders(ctx):\n  return ctx.http.get("/orders")\n\ndef read_inventory(ctx):\n  return ctx.http.get("/inventory")',
  },
  {
    id: 'sa-3', name: 'Jira工单对接', description: '双向同步Jira工单状态',
    version: '2.0.1', last_sync: '2026/5/31 20:00:00', status: 'active', author: '王五',
    token_id: 'tk-3',
    api_functions: [
      { name: 'read_issues', method: 'GET', description: '读取工单', script: 'def read_issues(ctx):\n  return ctx.http.get("/issues")' },
      { name: 'write_issues', method: 'PUT', description: '更新工单', script: 'def write_issues(ctx, data):\n  return ctx.http.put("/issues", data)' },
      { name: 'read_projects', method: 'GET', description: '读取项目', script: 'def read_projects(ctx):\n  return ctx.http.get("/projects")' },
    ],
    config_items: [
      { key: 'base_url', value: 'https://company.atlassian.net', is_secret: false },
      { key: 'username', value: 'bot@company.com', is_secret: false },
    ],
    var_items: [
      { key: 'base_url', value: 'https://company.atlassian.net', description: 'Jira实例域名' },
      { key: 'project_key', value: 'OC', description: '默认项目Key' },
      { key: 'max_results', value: '100', description: '单次查询最大返回数' },
    ],
    full_script: '# Jira工单对接适配器\ndef read_issues(ctx):\n  return ctx.http.get("/issues")\n\ndef write_issues(ctx, data):\n  return ctx.http.put("/issues", data)\n\ndef read_projects(ctx):\n  return ctx.http.get("/projects")',
  },
  {
    id: 'sa-4', name: 'IoT设备状态', description: '读取IoT平台设备状态和告警',
    version: '1.1.0', last_sync: '2026/5/31 23:00:00', status: 'active', author: '赵六',
    api_functions: [
      { name: 'read_devices', method: 'GET', description: '读取设备', script: 'def read_devices(ctx):\n  return ctx.http.get("/devices")' },
      { name: 'read_alerts', method: 'GET', description: '读取告警', script: 'def read_alerts(ctx):\n  return ctx.http.get("/alerts")' },
    ],
    auth_config: { type: 'oauth2', secret: 'iot-oauth-token' },
    config_items: [
      { key: 'base_url', value: 'https://iot.example.com/v2', is_secret: false },
      { key: 'access_token', value: 'iot-oauth-token', is_secret: true },
      { key: 'project_id', value: 'proj-iot-2026', is_secret: false },
    ],
    full_script: '# IoT设备状态适配器\ndef read_devices(ctx):\n  return ctx.http.get("/devices")\n\ndef read_alerts(ctx):\n  return ctx.http.get("/alerts")',
  },
  {
    id: 'sa-5', name: '财务对账(停用)', description: '内部财务系统对账接口',
    version: '0.9.0', last_sync: '-', status: 'disabled', author: '陈七',
    api_functions: [
      { name: 'read_invoices', method: 'GET', description: '读取发票', script: 'def read_invoices(ctx):\n  return ctx.http.get("/invoices")' },
    ],
    auth_config: { type: 'custom', secret: 'custom-auth-xxx' },
    config_items: [
      { key: 'base_url', value: 'https://finance.internal/api', is_secret: false },
      { key: 'sign_key', value: 'custom-auth-xxx', is_secret: true },
    ],
    full_script: '# 财务对账适配器\ndef read_invoices(ctx):\n  return ctx.http.get("/invoices")',
  },
];

// =================== 对接模板（云端模板库） ===================
const integrationTemplates = [
  { id: 'it-1', name: 'Salesforce CRM', description: '标准Salesforce REST API对接模板', source: 'official', vendor: 'OpenClaw官方', version: 'v2.0.0', downloads: 156, tags: ['crm', 'Salesforce', 'v2.0.0'] },
  { id: 'it-2', name: '用友U8+', description: '用友U8+ OpenAPI对接模板', source: 'official', vendor: 'OpenClaw官方', version: 'v1.5.0', downloads: 89, tags: ['erp', '用友', 'v1.5.0'] },
  { id: 'it-3', name: 'Jira Cloud', description: 'Jira Cloud REST API v3对接模板', source: 'official', vendor: 'OpenClaw官方', version: 'v2.1.0', downloads: 134, tags: ['project', 'Atlassian', 'v2.1.0'] },
  { id: 'it-4', name: '钉钉开放平台', description: '钉钉机器人/通讯录/审批对接', source: 'official', vendor: 'OpenClaw官方', version: 'v1.2.0', downloads: 67, tags: ['im', '阿里', 'v1.2.0'] },
  { id: 'it-5', name: '企业微信', description: '企微应用消息/通讯录/客户联系对接', source: 'official', vendor: 'OpenClaw官方', version: 'v1.3.0', downloads: 198, tags: ['im', '腾讯', 'v1.3.0'] },
  { id: 'it-6', name: 'MQTT IoT', description: '通用MQTT协议IoT设备对接模板', source: 'community', vendor: '社区', version: 'v1.0.0', downloads: 23, tags: ['iot', '通用', 'v1.0.0'] },
  { id: 'it-7', name: '通用REST', description: '通用REST API对接骨架脚本', source: 'official', vendor: 'OpenClaw官方', version: 'v1.0.0', downloads: 312, tags: ['custom', '通用', 'v1.0.0'] },
];

// =================== 身份源配置 ===================
const identitySources: any[] = [
  {
    id: 'is-1', name: '公司LDAP', type: 'LDAP', priority: 0,
    sync_cron: '0 */2 * * *', conflict_strategy: 'primary', status: 'active',
    is_builtin: false,
    ldap_server: 'ldaps://ldap.company.com', ldap_port: 636,
    bind_dn: 'cn=admin,dc=company,dc=com', bind_password: '******',
    base_dn: 'ou=users,dc=company,dc=com', filter: '(objectClass=person)',
  },
  {
    id: 'is-2', name: 'HR系统同步脚本', type: 'STARLARK', priority: 1,
    sync_cron: '0 8 * * 1-5', conflict_strategy: 'admin', status: 'active',
    is_builtin: false,
    script: 'def sync(ctx):\n  return ctx.http.get("/hr/employees")',
  },
  {
    id: 'is-3', name: '本地账号(内置)', type: 'LOCAL', priority: 99,
    sync_cron: '', conflict_strategy: 'primary', status: 'active',
    is_builtin: true,
  },
];

// =================== 权限管理（用户组 + Skill 权限） ===================
const permGroups: any[] = [
  { id: 'pg-1', name: '技术部', type: 'department', member_count: 12 },
  { id: 'pg-2', name: '销售部', type: 'department', member_count: 8 },
  { id: 'pg-3', name: '售后部', type: 'department', member_count: 6 },
  { id: 'pg-4', name: '运维部', type: 'team', member_count: 4 },
  { id: 'pg-5', name: '产品部', type: 'department', member_count: 5 },
  { id: 'pg-6', name: '安全组', type: 'team', member_count: 3 },
];

const permSkills: any[] = [
  {
    id: 'ps-1', name: 'CRM客户查询',
    functions: [
      { name: 'read_contacts', display_name: '查询联系人' },
      { name: 'read_deals', display_name: '查询商机' },
      { name: 'write_notes', display_name: '写备注' },
    ],
  },
  {
    id: 'ps-2', name: '设备状态摘要',
    functions: [
      { name: 'read_devices', display_name: '查询设备' },
      { name: 'read_alerts', display_name: '查询告警' },
    ],
  },
  {
    id: 'ps-3', name: '工单自动分派',
    functions: [
      { name: 'read_issues', display_name: '查询工单' },
      { name: 'write_issues', display_name: '创建/修改工单' },
      { name: 'assign_issues', display_name: '分派工单' },
    ],
  },
  {
    id: 'ps-4', name: '图像质量检测',
    functions: [
      { name: 'analyze_image', display_name: '图像分析' },
      { name: 'get_report', display_name: '生成报告' },
    ],
  },
  {
    id: 'ps-5', name: 'ERP数据写入',
    functions: [
      { name: 'read_orders', display_name: '查询订单' },
      { name: 'write_orders', display_name: '创建订单' },
      { name: 'update_status', display_name: '更新状态' },
    ],
  },
  {
    id: 'ps-6', name: '消息模板生成',
    functions: [
      { name: 'generate_message', display_name: '生成消息' },
      { name: 'send_message', display_name: '发送消息' },
    ],
  },
];

// 用户个人权限覆盖（userId -> skillId -> 函数名列表）
// 空字典表示默认全部继承自组权限
const userPermissions: Record<string, Record<string, string[]>> = {
  // 示例：u-5 陈七 有自定义权限
  'u-5': {
    'ps-1': ['read_contacts'],
    'ps-6': ['generate_message'],
  },
};

// 各用户组的 Skill 权限映射（skillId -> 已启用函数列表）
const permGroupConfigs: Record<string, Record<string, string[]>> = {
  'pg-1': {
    'ps-1': ['read_contacts', 'read_deals', 'write_notes'],
    'ps-2': ['read_devices', 'read_alerts'],
    'ps-3': ['read_issues', 'write_issues'],
    'ps-4': ['analyze_image', 'get_report'],
  },
  'pg-2': {
    'ps-1': ['read_contacts', 'read_deals', 'write_notes'],
    'ps-5': ['read_orders', 'update_status'],
    'ps-6': ['generate_message', 'send_message'],
  },
  'pg-3': {
    'ps-1': ['read_contacts'],
    'ps-3': ['read_issues', 'write_issues', 'assign_issues'],
    'ps-6': ['generate_message', 'send_message'],
  },
  'pg-4': {
    'ps-2': ['read_devices', 'read_alerts'],
    'ps-3': ['read_issues', 'write_issues', 'assign_issues'],
    'ps-4': ['analyze_image'],
  },
  'pg-5': {
    'ps-1': ['read_contacts', 'read_deals'],
    'ps-6': ['generate_message'],
  },
  'pg-6': {
    'ps-1': ['read_contacts'],
    'ps-2': ['read_devices', 'read_alerts'],
    'ps-3': ['assign_issues'],
    'ps-4': ['get_report'],
    'ps-5': ['read_orders'],
    'ps-6': ['send_message'],
  },
};

// =================== 权限菜单（菜单树 + 按钮权限） ===================
const permMenus: any[] = [
  { id: 'pm-1', name: '仪表盘', code: 'dashboard', permission: 'dashboard:list', route: '/', icon: 'Dashboard', type: 'menu', parent_id: null, sort_order: 1, remark: '' },
  { id: 'pm-2', name: '模型管理', code: 'models', permission: 'models:list', route: '', icon: 'Psychology', type: 'directory', parent_id: null, sort_order: 2, remark: '' },
  { id: 'pm-3', name: '模型源', code: 'model-source', permission: 'model:source:list', route: '/models/sources', icon: 'CubeOutline', type: 'menu', parent_id: 'pm-2', sort_order: 1, remark: '' },
  { id: 'pm-4', name: '连接器', code: 'connectors', permission: 'connectors:list', route: '', icon: 'Cable', type: 'directory', parent_id: null, sort_order: 3, remark: '' },
  { id: 'pm-5', name: '身份与账号', code: 'identity', permission: 'identity:list', route: '', icon: 'People', type: 'directory', parent_id: null, sort_order: 4, remark: '' },
  { id: 'pm-6', name: '用户', code: 'users', permission: 'users:list', route: '/identity/users', icon: 'People', type: 'menu', parent_id: 'pm-5', sort_order: 1, remark: '' },
  { id: 'pm-7', name: '组织', code: 'organizations', permission: 'organizations:list', route: '/identity/orgs', icon: 'AccountTree', type: 'menu', parent_id: 'pm-5', sort_order: 2, remark: '' },
  { id: 'pm-8', name: '权限菜单', code: 'permissions', permission: 'permissions:list', route: '/identity/permissions', icon: 'VerifiedUser', type: 'menu', parent_id: 'pm-5', sort_order: 3, remark: '' },
  { id: 'pm-9', name: 'Agent', code: 'agent', permission: 'agent:list', route: '', icon: 'SmartToy', type: 'directory', parent_id: null, sort_order: 5, remark: '' },
  { id: 'pm-10', name: '凭证管理', code: 'credentials', permission: 'credentials:list', route: '', icon: 'Key', type: 'directory', parent_id: null, sort_order: 6, remark: '' },
  { id: 'pm-11', name: '凭证', code: 'tokens', permission: 'tokens:list', route: '/tokens', icon: 'Key', type: 'menu', parent_id: 'pm-10', sort_order: 1, remark: '' },
  { id: 'pm-12', name: '凭证新增', code: 'tokens:create', permission: 'tokens:create', route: '', icon: '', type: 'button', parent_id: 'pm-11', sort_order: 1, remark: '' },
  { id: 'pm-13', name: '凭证修改', code: 'tokens:update', permission: 'tokens:update', route: '', icon: '', type: 'button', parent_id: 'pm-11', sort_order: 2, remark: '' },
  { id: 'pm-14', name: '凭证删除', code: 'tokens:delete', permission: 'tokens:delete', route: '', icon: '', type: 'button', parent_id: 'pm-11', sort_order: 3, remark: '' },
  { id: 'pm-15', name: '审批', code: 'approvals', permission: 'tokens:approvals:list', route: '/tokens/approvals', icon: 'Security', type: 'menu', parent_id: 'pm-10', sort_order: 2, remark: '' },
  { id: 'pm-16', name: '资源与运维', code: 'resources', permission: 'resources:list', route: '', icon: 'Storage', type: 'directory', parent_id: null, sort_order: 7, remark: '' },
  { id: 'pm-17', name: '平台SN', code: 'platform-sn', permission: 'resources:sn:list', route: '/resources/sn', icon: 'Fingerprint', type: 'menu', parent_id: 'pm-16', sort_order: 1, remark: '' },
  { id: 'pm-18', name: '远程管理', code: 'remote-management', permission: 'resources:remote:list', route: '/resources/remote', icon: 'SettingsRemote', type: 'menu', parent_id: 'pm-16', sort_order: 2, remark: '' },
  { id: 'pm-19', name: '配置备份', code: 'config-backup', permission: 'resources:backup:list', route: '/resources/backup', icon: 'Backup', type: 'menu', parent_id: 'pm-16', sort_order: 3, remark: '' },
  { id: 'pm-20', name: '磁盘配额', code: 'disk-quota', permission: 'resources:quota:list', route: '/resources/quota', icon: 'DataUsage', type: 'menu', parent_id: 'pm-16', sort_order: 4, remark: '' },
  { id: 'pm-21', name: 'K8s状态', code: 'k8s-status', permission: 'resources:k8s:list', route: '/resources/k8s', icon: 'Cloud', type: 'menu', parent_id: 'pm-16', sort_order: 5, remark: '' },
  { id: 'pm-22', name: '服务重启', code: 'service-restart', permission: 'resources:restart:list', route: '/resources/restart', icon: 'RestartAlt', type: 'menu', parent_id: 'pm-16', sort_order: 6, remark: '' },
];

// =================== 角色 ===================
const roles: any[] = [
  {
    id: 'role-1',
    name: '超级管理员',
    code: 'admin',
    sort_order: 1,
    status: 'active',
    remark: '拥有全部菜单与按钮权限',
    created_at: '2026-06-15T16:43:55',
    menu_ids: permMenus.map(m => m.id),
  },
  {
    id: 'role-2',
    name: '普通用户',
    code: 'user',
    sort_order: 2,
    status: 'active',
    remark: '仅可访问基础菜单',
    created_at: '2026-06-15T16:44:00',
    menu_ids: ['pm-1', 'pm-3', 'pm-6', 'pm-7'],
  },
];

// =================== 用户 ===================
const users: any[] = [
  { id: 'u-1', username: 'admin',    name: '张伟', email: 'zhangwei@company.com', role: 'admin',   org_id: 'org-1', status: 'active' },
  { id: 'u-2', username: 'lisi',     name: '李思', email: 'lisi@company.com',     role: 'manager', org_id: 'org-3', status: 'active' },
  { id: 'u-3', username: 'wangwu',   name: '王五', email: 'wangwu@company.com',   role: 'member',  org_id: 'org-2', status: 'active' },
  { id: 'u-4', username: 'zhaoliu',  name: '赵六', email: 'zhaoliu@company.com',  role: 'member',  org_id: 'org-2', status: 'active' },
  { id: 'u-5', username: 'chenqi',   name: '陈七', email: 'chenqi@company.com',   role: 'viewer',  org_id: 'org-4', status: 'disabled' },
  { id: 'u-6', username: 'sunba',    name: '孙八', email: 'sunba@company.com',    role: 'member',  org_id: 'org-4', status: 'active' },
  { id: 'u-7', username: 'zhoujiu', name: '周九', email: 'zhoujiu@company.com',  role: 'manager', org_id: 'org-3', status: 'active' },
];

// =================== 组织 ===================
const organizations: any[] = [
  { id: 'org-1', name: '总公司',      type: 'company',    parent_id: null,    status: 'active',   description: '集团总公司',       member_count: 156 },
  { id: 'org-2', name: '技术研发部',  type: 'department', parent_id: 'org-1', status: 'active',   description: '技术研发部门',     member_count: 45 },
  { id: 'org-3', name: '销售部',      type: 'department', parent_id: 'org-1', status: 'active',   description: '销售与商务部门',   member_count: 32 },
  { id: 'org-4', name: 'AI平台组',    type: 'team',       parent_id: 'org-2', status: 'active',   description: 'AI平台研发小组',   member_count: 12 },
  { id: 'org-5', name: '智慧客服项目',type: 'project',    parent_id: 'org-2', status: 'active',   description: '智能客服系统项目', member_count: 8 },
  { id: 'org-6', name: '华东大区',    type: 'team',       parent_id: 'org-3', status: 'active',   description: '华东区域销售团队', member_count: 18 },
];

// 组织成员关联（org_id -> userId[]）
const orgMembers: Record<string, string[]> = {
  'org-1': ['u-1'],
  'org-2': ['u-3', 'u-4'],
  'org-3': ['u-2', 'u-7'],
  'org-4': ['u-5', 'u-6'],
  'org-5': [],
  'org-6': [],
};

// =================== 聊天账号 ===================
const chatAccounts = [
  { id: 'cha-1', chat_type: 'wechat_work', external_id: 'wx_zhangwei', nickname: '张伟', phone: '138****1234', email: 'zhangwei@company.com', match_status: 'matched', user_name: '张伟' },
  { id: 'cha-2', chat_type: 'wechat_work', external_id: 'wx_lisi', nickname: '李思-销售', phone: '139****5678', email: '', match_status: 'matched', user_name: '李思' },
  { id: 'cha-3', chat_type: 'dingtalk', external_id: 'dt_wangwu', nickname: '王五', phone: '', email: 'wangwu@company.com', match_status: 'matched', user_name: '王五' },
  { id: 'cha-4', chat_type: 'feishu', external_id: 'fs_chenqi', nickname: '小陈', phone: '136****9012', email: '', match_status: 'unmatched', user_name: '' },
  { id: 'cha-5', chat_type: 'wechat_work', external_id: 'wx_unknown1', nickname: '刘经理', phone: '', email: '', match_status: 'pending', user_name: '' },
  { id: 'cha-6', chat_type: 'dingtalk', external_id: 'dt_zhaoliu', nickname: '赵六', phone: '135****3456', email: 'zhaoliu@company.com', match_status: 'conflict', user_name: '赵六' },
];

// =================== 第三方账号 ===================
const thirdPartyAccounts = [
  { id: 'tpa-1', system_type: 'crm', external_id: 'SF-004321', name: '张伟', email: 'zhangwei@company.com', department: '技术研发部', match_status: 'matched' },
  { id: 'tpa-2', system_type: 'crm', external_id: 'SF-004322', name: '李思', email: 'lisi@company.com', department: '销售部', match_status: 'matched' },
  { id: 'tpa-3', system_type: 'erp', external_id: 'SAP-Emp-1289', name: '王五', email: 'wangwu@company.com', department: '技术研发部', match_status: 'matched' },
  { id: 'tpa-4', system_type: 'hr', external_id: 'HR-20240156', name: '陈七', email: 'chenqi@company.com', department: '财务部', match_status: 'unmatched' },
  { id: 'tpa-5', system_type: 'project_management', external_id: 'JIRA-u789', name: '赵六', email: 'zhaoliu@company.com', department: '技术研发部', match_status: 'pending' },
];

// =================== 匹配结果 ===================
const matchingResults: any[] = [
  {
    id: 'mr-1', source_type: 'wechat_work', account_id: 'wx_zhangwei', external_id: 'wx_zhangwei',
    user_name: '张伟', user_id: 'u-1', score: 0.98, status: 'matched',
    // 第三方账号详情
    external_profile: { name: '张伟', department: '技术研发部', email: 'zhangwei@wechat-work.com', phone: '138****1234' },
    // 平台用户详情
    platform_user: { name: '张伟', department: '技术研发部', email: 'zhangwei@company.com', phone: '138****1234', role: '管理员' },
    // 匹配理由
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '邮箱匹配', detail: '邮箱前缀相同 (zhangwei)', confidence: 0.85 }],
  },
  {
    id: 'mr-2', source_type: 'dingtalk', account_id: 'dt_wangwu', external_id: 'dt_wangwu',
    user_name: '王五', user_id: 'u-3', score: 0.95, status: 'matched',
    external_profile: { name: '王五', department: '研发二组', email: 'wangwu@dingtalk.com', phone: '139****5678' },
    platform_user: { name: '王五', department: '技术研发部', email: 'wangwu@company.com', phone: '139****5678', role: '成员' },
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '姓名+部门匹配', detail: '姓名一致，部门名近似', confidence: 0.7 }],
  },
  {
    id: 'mr-3', source_type: 'crm', account_id: 'SF-004321', external_id: 'SF-004321',
    user_name: '张伟', user_id: 'u-1', score: 0.92, status: 'matched',
    external_profile: { name: 'Zhang Wei', department: 'R&D', email: 'zhangwei@crm-system.com', phone: '' },
    platform_user: { name: '张伟', department: '技术研发部', email: 'zhangwei@company.com', phone: '138****1234', role: '管理员' },
    match_reasons: [{ strategy: '邮箱匹配', detail: '邮箱前缀相同 (zhangwei)', confidence: 0.88 }, { strategy: 'AI语义匹配', detail: '姓名拼音与中文姓名匹配', confidence: 0.72 }],
  },
  {
    id: 'mr-4', source_type: 'feishu', account_id: 'fs_chenqi', external_id: 'fs_chenqi',
    user_name: '', user_id: '', score: 0.45, status: 'unmatched',
    external_profile: { name: '陈琪', department: '市场部', email: 'chenqi@feishu.com', phone: '152****9999' },
    platform_user: null,
    match_reasons: [{ strategy: '姓名+部门匹配', detail: '姓名相似但部门不匹配', confidence: 0.45 }],
  },
  {
    id: 'mr-5', source_type: 'wechat_work', account_id: 'wx_unknown1', external_id: 'wx_unknown1',
    user_name: '李思', user_id: 'u-2', score: 0.62, status: 'pending',
    external_profile: { name: '李思思', department: '销售一部', email: 'lisisi@wechat-work.com', phone: '186****3210' },
    platform_user: { name: '李思', department: '销售部', email: 'lisi@company.com', phone: '186****3210', role: '经理' },
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '姓名+部门匹配', detail: '姓名相似（李思思→李思），部门相关', confidence: 0.42 }],
  },
  {
    id: 'mr-6', source_type: 'dingtalk', account_id: 'dt_zhaoliu', external_id: 'dt_zhaoliu',
    user_name: '赵六', user_id: 'u-4', score: 0.75, status: 'conflict',
    external_profile: { name: '赵六', department: '研发部', email: 'zhaoliu@dingtalk.com', phone: '' },
    platform_user: { name: '赵六', department: '技术研发部', email: 'zhaoliu@company.com', phone: '137****4567', role: '成员' },
    match_reasons: [{ strategy: '姓名+部门匹配', detail: '姓名一致，部门相似', confidence: 0.75 }, { strategy: '邮箱匹配', detail: '邮箱前缀相同', confidence: 0.65 }],
  },
  {
    id: 'mr-7', source_type: 'email', account_id: 'sunba@gmail.com', external_id: 'sunba@gmail.com',
    user_name: '', user_id: '', score: 0.30, status: 'unmatched',
    external_profile: { name: 'Sun Ba', department: '', email: 'sunba@gmail.com', phone: '' },
    platform_user: null,
    match_reasons: [{ strategy: 'AI语义匹配', detail: '邮箱前缀与平台用户「孙八」拼音相似', confidence: 0.30 }],
  },
  {
    id: 'mr-8', source_type: 'feishu', account_id: 'fs_zhoujiu', external_id: 'fs_zhoujiu',
    user_name: '周九', user_id: 'u-7', score: 0.58, status: 'pending',
    external_profile: { name: '周玖', department: '商务部', email: 'zhoujiu@feishu.com', phone: '155****8888' },
    platform_user: { name: '周九', department: '销售部', email: 'zhoujiu@company.com', phone: '155****8888', role: '经理' },
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '姓名+部门匹配', detail: '姓名近似（周玖→周九），部门不同', confidence: 0.35 }],
  },
  // ---- 多平台关联示例：张伟还关联了钉钉 ----
  {
    id: 'mr-9', source_type: 'dingtalk', account_id: 'dt_zhangwei', external_id: 'dt_zhangwei',
    user_name: '张伟', user_id: 'u-1', score: 0.96, status: 'matched',
    external_profile: { name: '张伟', department: '技术研发部', email: 'zhangwei@dingtalk-corp.com', phone: '138****1234' },
    platform_user: { name: '张伟', department: '技术研发部', email: 'zhangwei@company.com', phone: '138****1234', role: '管理员' },
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '姓名+部门匹配', detail: '姓名完全一致，部门一致', confidence: 0.90 }],
  },
  // ---- 多平台关联示例：王五还关联了飞书 ----
  {
    id: 'mr-10', source_type: 'feishu', account_id: 'fs_wangwu', external_id: 'fs_wangwu',
    user_name: '王五', user_id: 'u-3', score: 0.93, status: 'matched',
    external_profile: { name: '王五', department: '技术研发部', email: 'wangwu@feishu-corp.com', phone: '139****5678' },
    platform_user: { name: '王五', department: '技术研发部', email: 'wangwu@company.com', phone: '139****5678', role: '成员' },
    match_reasons: [{ strategy: '手机号匹配', detail: '手机号完全一致', confidence: 0.95 }, { strategy: '邮箱匹配', detail: '邮箱前缀相同 (wangwu)', confidence: 0.82 }],
  },
  // ---- 多平台关联示例：张伟还关联了飞书（待确认状态） ----
  {
    id: 'mr-11', source_type: 'feishu', account_id: 'fs_zhangwei', external_id: 'fs_zhangwei',
    user_name: '张伟', user_id: 'u-1', score: 0.72, status: 'pending',
    external_profile: { name: 'Wei Zhang', department: 'Tech R&D', email: 'weizhang@feishu-corp.com', phone: '' },
    platform_user: { name: '张伟', department: '技术研发部', email: 'zhangwei@company.com', phone: '138****1234', role: '管理员' },
    match_reasons: [{ strategy: 'AI语义匹配', detail: '姓名拼音与中文姓名匹配 (Wei Zhang→张伟)', confidence: 0.72 }],
  },
];

const matchingStrategies: any[] = [
  { id: 'strat-1', name: '手机号匹配', strategy_type: 'phone_match', status: 'active', description: '通过手机号进行身份关联', weight: 0.4 },
  { id: 'strat-2', name: '邮箱匹配', strategy_type: 'email_match', status: 'active', description: '通过邮箱地址进行身份关联', weight: 0.3 },
  { id: 'strat-3', name: '姓名+部门匹配', strategy_type: 'name_dept_match', status: 'active', description: '通过姓名和部门组合进行模糊匹配', weight: 0.2 },
  { id: 'strat-4', name: 'AI语义匹配', strategy_type: 'ai_match', status: 'disabled', description: '基于AI语义模型的智能匹配', weight: 0.1 },
];

const matchingRuns: any[] = [
  { id: 'run-1', status: 'completed', created_at: ago(30), matched_count: 167, total_count: 205 },
  { id: 'run-2', status: 'completed', created_at: ago(720), matched_count: 156, total_count: 203 },
  { id: 'run-3', status: 'completed', created_at: ago(1440), matched_count: 148, total_count: 198 },
  { id: 'run-4', status: 'completed', created_at: ago(2880), matched_count: 142, total_count: 195 },
];

// 冲突候选（用于冲突详情弹窗）
const matchingConflicts: Record<string, any[]> = {
  'mr-6': [
    { user_id: 'u-3', user_name: '王五', score: 0.75, reason: '部门相同' },
    { user_id: 'u-4', user_name: '赵六', score: 0.68, reason: '邮箱前缀相似' },
  ],
};

// =================== 智能报告：报告模板 ====================
const reportTemplates: any[] = [
  {
    id: 'tpl-1', name: '部门标准周报模板', description: '适用于各部门的标准周报格式', scope_type: 'department', period_type: 'weekly',
    blocks: [
      { id: 'blk-1', type: 'metrics_card', title: '核心指标', variable_key: 'core_metrics', config: { columns: 4, show_trend: true } },
      { id: 'blk-2', type: 'chart_image', title: '趋势图表', variable_key: 'trend_chart', config: { aspect_ratio: '16:9', caption: '本周趋势' } },
      { id: 'blk-3', type: 'data_table', title: '明细数据', variable_key: 'detail_table', config: { sortable: true, max_rows: 20 } },
      { id: 'blk-4', type: 'rich_text', title: 'AI 智能分析', variable_key: 'ai_summary', config: {} },
      { id: 'blk-5', type: 'bullet_list', title: '本周亮点', variable_key: 'highlights', config: { icon: 'success', max_items: 5 } },
      { id: 'blk-6', type: 'bullet_list', title: '风险与问题', variable_key: 'risks', config: { icon: 'warning', max_items: 5 } },
      { id: 'blk-7', type: 'bullet_list', title: '下周计划', variable_key: 'next_plan', config: { icon: 'plan', max_items: 5 } },
    ],
    created_at: dayAgo(30), updated_at: dayAgo(5),
  },
  {
    id: 'tpl-2', name: '公司日报精简模板', description: '适用于全公司的每日精简汇报', scope_type: 'company', period_type: 'daily',
    blocks: [
      { id: 'blk-11', type: 'metrics_card', title: '今日指标', variable_key: 'core_metrics', config: { columns: 4, show_trend: true } },
      { id: 'blk-12', type: 'rich_text', title: 'AI 摘要', variable_key: 'ai_summary', config: {} },
      { id: 'blk-13', type: 'bullet_list', title: '告警事项', variable_key: 'alerts', config: { icon: 'warning', max_items: 10 } },
    ],
    created_at: dayAgo(20), updated_at: dayAgo(3),
  },
  {
    id: 'tpl-3', name: '公司运营周报模板', description: '适用于全公司级别的完整周报', scope_type: 'company', period_type: 'weekly',
    blocks: [
      { id: 'blk-21', type: 'metrics_card', title: '公司核心指标', variable_key: 'core_metrics', config: { columns: 4, show_trend: true } },
      { id: 'blk-22', type: 'chart_image', title: '各部门趋势对比', variable_key: 'trend_chart', config: { aspect_ratio: '16:9', caption: '部门对比' } },
      { id: 'blk-23', type: 'data_table', title: '部门排行', variable_key: 'dept_ranking', config: { sortable: true, max_rows: 10 } },
      { id: 'blk-24', type: 'rich_text', title: 'AI 综合分析', variable_key: 'ai_summary', config: {} },
      { id: 'blk-25', type: 'bullet_list', title: '本周亮点', variable_key: 'highlights', config: { icon: 'success', max_items: 8 } },
      { id: 'blk-26', type: 'bullet_list', title: '风险与问题', variable_key: 'risks', config: { icon: 'warning', max_items: 5 } },
    ],
    created_at: dayAgo(25), updated_at: dayAgo(4),
  },
  {
    id: 'tpl-4', name: '销售月度报告模板', description: '适用于销售部门月度总结', scope_type: 'department', period_type: 'monthly',
    blocks: [
      { id: 'blk-31', type: 'metrics_card', title: '月度KPI', variable_key: 'core_metrics', config: { columns: 4, show_trend: true } },
      { id: 'blk-32', type: 'chart_image', title: '月度趋势', variable_key: 'trend_chart', config: { aspect_ratio: '16:9', caption: '月度走势' } },
      { id: 'blk-33', type: 'data_table', title: '客户成交明细', variable_key: 'deal_table', config: { sortable: true, max_rows: 30 } },
      { id: 'blk-34', type: 'data_table', title: '销售排行', variable_key: 'sales_ranking', config: { sortable: true, max_rows: 10 } },
      { id: 'blk-35', type: 'rich_text', title: 'AI 分析', variable_key: 'ai_summary', config: {} },
      { id: 'blk-36', type: 'bullet_list', title: '下月计划', variable_key: 'next_plan', config: { icon: 'plan', max_items: 5 } },
    ],
    created_at: dayAgo(15), updated_at: dayAgo(2),
  },
];

// =================== 智能报告：生成配置 ====================
// block_configs 结构：每个元素对应模板的一个 block，key/type 来自模板（只读），
// prompt 与 config 为本配置专属，Agent 生成时按此指令产出对应数据。
const reportConfigs: any[] = [
  {
    id: 'rc-1', name: '公司经营周报', scope: 'company', department_id: '', department_name: '',
    period: 'weekly', template_id: 'tpl-3', template_name: '公司运营周报模板',
    agent_id: 'a-11', agent_name: '预算Agent',
    data_keys: ['revenue', 'cost', 'profit', 'margin', 'growth', 'forecast'],
    dimensions: ['department', 'region', 'product', 'channel', 'time', 'customer'],
    block_configs: [
      { key: 'core_metrics', type: 'metrics', label: '核心指标', description: '部门KPI指标数组', prompt: '按本周研发数据汇总核心指标，每项含数值、单位、环比变化', config: { metrics: [
        { name: '接口调用量', unit: '次', data_source: 'gateway_logs', format: 'integer', aggregation: 'sum', trend: 'higher_better' },
        { name: '平均响应时长', unit: 'ms', data_source: 'apm', format: 'float', aggregation: 'avg', trend: 'lower_better' },
        { name: '服务可用率', unit: '%', data_source: 'uptime', format: 'percent', aggregation: 'avg', trend: 'higher_better' },
        { name: '错误率', unit: '%', data_source: 'error_logs', format: 'percent', aggregation: 'avg', trend: 'lower_better' },
      ] } },
      { key: 'trend_chart', type: 'image', label: '趋势图表', description: 'Agent渲染的图表图片', prompt: '绘制本周接口调用量 7 日趋势折线图', config: {
        chart_title: '接口调用量 7 日趋势', chart_type: 'line', x_axis: '日期', y_axis: '调用量（次）', data_source: 'gateway_logs', color_theme: 'cyber',
      } },
      { key: 'detail_table', type: 'table', label: '明细数据', description: 'API 接口明细表', prompt: '列出本周 TOP20 API 的调用明细', config: {
        columns: [
          { key: 'api', header: '接口名称', width: 200, align: 'left' },
          { key: 'calls', header: '调用量', width: 100, align: 'right' },
          { key: 'avg_rt', header: '平均响应', width: 100, align: 'right' },
          { key: 'error_rate', header: '错误率', width: 100, align: 'right' },
        ], data_source: 'gateway_logs', default_sort: 'calls_desc', max_rows: 20,
      } },
      { key: 'ai_summary', type: 'text', label: 'AI分析', description: '智能分析总结', prompt: '基于指标与明细表输出 AI 总结，含亮点、异常、建议', config: {
        topic: '技术研发部周度运营分析', angle: '性能/稳定性/业务价值', word_limit: 300, tone: '专业简洁', must_include: '核心指标环比变化',
      } },
      { key: 'highlights', type: 'list', label: '亮点', description: '本周亮点列表', prompt: '提炼本周 3~5 项实质性亮点，每项一句', config: {
        list_kind: 'highlight', max_items: 5, category: '技术', style: '简洁中性',
      } },
      { key: 'risks', type: 'list', label: '风险', description: '风险列表', prompt: '列出本周需重点关注的风险与问题', config: {
        list_kind: 'risk', max_items: 5, category: '技术', style: '客观直白',
      } },
      { key: 'next_plan', type: 'list', label: '下周计划', description: '计划列表', prompt: '列出下周重点工作项', config: {
        list_kind: 'plan', max_items: 5, category: '技术', style: '可行动',
      } },
    ],
    schedule: { type: 'weekly', day: 5, time: '18:00', date: null },
    publish_to_portal: true, notify_users: true, enabled: true,
    last_generated_at: dayAgo(2), created_at: dayAgo(14), updated_at: dayAgo(2),
  },
  {
    id: 'rc-2', name: 'AI平台组周报', scope: 'department', department_id: 'org-4', department_name: 'AI平台组',
    period: 'weekly', template_id: 'tpl-1', template_name: '部门标准周报模板',
    agent_id: 'a-8', agent_name: 'AI平台组周报Agent',
    block_configs: [
      { key: 'core_metrics', type: 'metrics', label: '核心指标', description: 'AI平台KPI', prompt: '汇总 AI 平台本周运行核心指标', config: { metrics: [
        { name: '模型调用次数', unit: '万次', data_source: 'model_gateway', format: 'integer', aggregation: 'sum', trend: 'higher_better' },
        { name: 'Token 消耗', unit: 'K', data_source: 'model_gateway', format: 'integer', aggregation: 'sum', trend: 'neutral' },
        { name: '平均错误率', unit: '%', data_source: 'error_logs', format: 'percent', aggregation: 'avg', trend: 'lower_better' },
        { name: '平均时延', unit: 'ms', data_source: 'apm', format: 'float', aggregation: 'avg', trend: 'lower_better' },
      ] } },
      { key: 'trend_chart', type: 'image', label: '趋势图表', description: '调用量与 Token 趋势', prompt: '绘制本周模型调用与 Token 双轴图', config: {
        chart_title: '模型调用与 Token 趋势', chart_type: 'line', x_axis: '日期', y_axis: '调用/Token', data_source: 'model_gateway', color_theme: 'cyber',
      } },
      { key: 'detail_table', type: 'table', label: '模型明细', description: '各模型调用汇总', prompt: '列出 TOP20 模型的调用量与成本', config: {
        columns: [
          { key: 'model', header: '模型', width: 180, align: 'left' },
          { key: 'calls', header: '调用量', width: 100, align: 'right' },
          { key: 'tokens', header: 'Token', width: 100, align: 'right' },
          { key: 'cost', header: '成本', width: 100, align: 'right' },
        ], data_source: 'model_gateway', default_sort: 'calls_desc', max_rows: 20,
      } },
      { key: 'ai_summary', type: 'text', label: 'AI分析', description: '周报总结', prompt: '基于模型调用数据输出周度总结', config: {
        topic: 'AI 平台周度运行分析', angle: '使用量/成本/性能', word_limit: 300, tone: '专业简洁', must_include: '成本优化建议',
      } },
      { key: 'highlights', type: 'list', label: '亮点', description: '本周亮点', prompt: '提炼本周 AI 平台亮点', config: { list_kind: 'highlight', max_items: 5, category: 'AI', style: '简洁中性' } },
      { key: 'risks', type: 'list', label: '风险', description: '风险列表', prompt: '本周需关注的风险', config: { list_kind: 'risk', max_items: 5, category: 'AI', style: '客观直白' } },
      { key: 'next_plan', type: 'list', label: '下周计划', description: '计划', prompt: '下周重点工作', config: { list_kind: 'plan', max_items: 5, category: 'AI', style: '可行动' } },
    ],
    schedule: { type: 'weekly', day: 5, time: '18:00', date: null },
    publish_to_portal: true, notify_users: true, enabled: true,
    last_generated_at: dayAgo(2), created_at: dayAgo(14), updated_at: dayAgo(2),
  },
  {
    id: 'rc-3', name: '个人工作日报', scope: 'personal', department_id: '', department_name: '',
    period: 'daily', template_id: 'tpl-2', template_name: '个人日报模板',
    agent_id: 'a-12', agent_name: '个人工作助手Agent',
    data_keys: ['tasks', 'hours'],
    dimensions: ['project', 'priority'],
    block_configs: [
      { key: 'core_metrics', type: 'metrics', label: '今日指标', description: '公司级KPI', prompt: '今日全公司核心指标汇总', config: { metrics: [
        { name: '当日活跃用户', unit: '人', data_source: 'user_activity', format: 'integer', aggregation: 'count_distinct', trend: 'higher_better' },
        { name: '当日总调用', unit: '次', data_source: 'gateway_logs', format: 'integer', aggregation: 'sum', trend: 'higher_better' },
        { name: '当日成本', unit: '元', data_source: 'billing', format: 'float', aggregation: 'sum', trend: 'lower_better' },
      ] } },
      { key: 'ai_summary', type: 'text', label: 'AI摘要', description: '一句话总结', prompt: '一句话总结今日运营情况', config: {
        topic: '今日运营一句话总结', angle: '整体', word_limit: 60, tone: '简洁', must_include: '核心数字',
      } },
      { key: 'alerts', type: 'list', label: '告警事项', description: '告警列表', prompt: '列出今日需关注的告警', config: { list_kind: 'alert', max_items: 10, category: '全局', style: '紧急直白' } },
    ],
    schedule: { type: 'daily', day: null, time: '20:00', date: null },
    publish_to_portal: true, notify_users: false, enabled: true,
    last_generated_at: dayAgo(0), created_at: dayAgo(10), updated_at: dayAgo(0),
  },
  {
    id: 'rc-4', name: '全公司运营周报', scope: 'company', department_id: '', department_name: '',
    period: 'weekly', template_id: 'tpl-3', template_name: '公司运营周报模板',
    agent_id: 'a-11', agent_name: '运营汇总周报Agent',
    block_configs: [
      { key: 'core_metrics', type: 'metrics', label: '公司核心指标', description: '跨部门汇总', prompt: '本周全公司 KPI 汇总', config: { metrics: [
        { name: '周活跃用户', unit: '人', data_source: 'user_activity', format: 'integer', aggregation: 'count_distinct', trend: 'higher_better' },
        { name: '周 API 调用', unit: '万次', data_source: 'gateway_logs', format: 'integer', aggregation: 'sum', trend: 'higher_better' },
        { name: '周成本', unit: '元', data_source: 'billing', format: 'float', aggregation: 'sum', trend: 'lower_better' },
        { name: '可用率', unit: '%', data_source: 'uptime', format: 'percent', aggregation: 'avg', trend: 'higher_better' },
      ] } },
      { key: 'trend_chart', type: 'image', label: '部门趋势', description: '各部门对比图', prompt: '绘制各部门本周贡献对比柱状图', config: {
        chart_title: '各部门本周运营贡献', chart_type: 'bar', x_axis: '部门', y_axis: '贡献值', data_source: 'department_stats', color_theme: 'cyber',
      } },
      { key: 'dept_ranking', type: 'table', label: '部门排行', description: '部门排行表', prompt: '输出本周部门运营排行', config: {
        columns: [
          { key: 'dept', header: '部门', width: 150, align: 'left' },
          { key: 'score', header: '综合得分', width: 120, align: 'right' },
          { key: 'delta', header: '环比', width: 100, align: 'right' },
        ], data_source: 'department_stats', default_sort: 'score_desc', max_rows: 10,
      } },
      { key: 'ai_summary', type: 'text', label: 'AI综合分析', description: '全局分析', prompt: '基于全部门数据输出周报全局分析', config: {
        topic: '全公司周度运营分析', angle: '整体/异常/机会', word_limit: 500, tone: '专业深入', must_include: '部门对比/重点建议',
      } },
      { key: 'highlights', type: 'list', label: '亮点', description: '全公司亮点', prompt: '列出本周全公司亮点', config: { list_kind: 'highlight', max_items: 8, category: '全局', style: '专业简洁' } },
      { key: 'risks', type: 'list', label: '风险', description: '全公司风险', prompt: '列出本周重点风险', config: { list_kind: 'risk', max_items: 5, category: '全局', style: '客观直白' } },
    ],
    schedule: { type: 'weekly', day: 5, time: '20:00', date: null },
    publish_to_portal: true, notify_users: true, enabled: true,
    last_generated_at: dayAgo(2), created_at: dayAgo(14), updated_at: dayAgo(2),
  },
  {
    id: 'rc-5', name: '销售月报', scope: 'department', department_id: 'org-3', department_name: '销售部',
    period: 'monthly', template_id: 'tpl-4', template_name: '销售月度报告模板',
    agent_id: 'a-9', agent_name: '销售部月报Agent',
    data_keys: ['deals', 'gmv', 'conversion'],
    dimensions: ['product', 'region', 'salesperson'],
    block_configs: [
      { key: 'core_metrics', type: 'metrics', label: '月度KPI', description: '销售月度指标', prompt: '汇总本月销售 KPI', config: { metrics: [
        { name: '新增合同', unit: '个', data_source: 'crm_deals', format: 'integer', aggregation: 'count', trend: 'higher_better' },
        { name: '新增 GMV', unit: '万元', data_source: 'crm_deals', format: 'float', aggregation: 'sum', trend: 'higher_better' },
        { name: '客单价', unit: '元', data_source: 'crm_deals', format: 'float', aggregation: 'avg', trend: 'higher_better' },
        { name: '回款率', unit: '%', data_source: 'finance', format: 'percent', aggregation: 'avg', trend: 'higher_better' },
      ] } },
      { key: 'trend_chart', type: 'image', label: '月度趋势', description: '月度走势图', prompt: '绘制本月 GMV 日度走势面积图', config: {
        chart_title: '月度 GMV 走势', chart_type: 'area', x_axis: '日期', y_axis: 'GMV（万元）', data_source: 'crm_deals', color_theme: 'cyber',
      } },
      { key: 'deal_table', type: 'table', label: '成交明细', description: '客户成交表', prompt: '列出本月 TOP30 成交记录', config: {
        columns: [
          { key: 'customer', header: '客户', width: 200, align: 'left' },
          { key: 'amount', header: '金额', width: 120, align: 'right' },
          { key: 'stage', header: '阶段', width: 100, align: 'left' },
          { key: 'owner', header: '负责人', width: 100, align: 'left' },
        ], data_source: 'crm_deals', default_sort: 'amount_desc', max_rows: 30,
      } },
      { key: 'sales_ranking', type: 'table', label: '销售排行', description: '业绩排名', prompt: '本月销售 TOP10 排行', config: {
        columns: [
          { key: 'name', header: '销售', width: 120, align: 'left' },
          { key: 'gmv', header: 'GMV', width: 120, align: 'right' },
          { key: 'rate', header: '赢单率', width: 100, align: 'right' },
        ], data_source: 'crm_deals', default_sort: 'gmv_desc', max_rows: 10,
      } },
      { key: 'ai_summary', type: 'text', label: 'AI分析', description: '月度分析', prompt: '基于本月销售数据输出月度分析', config: {
        topic: '销售部月度业绩分析', angle: '完成度/客户质量/回款', word_limit: 500, tone: '专业深入', must_include: '目标完成度与下月预测',
      } },
      { key: 'next_plan', type: 'list', label: '下月计划', description: '计划列表', prompt: '列出下月重点工作与目标', config: { list_kind: 'plan', max_items: 5, category: '销售', style: '可行动' } },
    ],
    schedule: { type: 'monthly', day: null, time: '18:00', date: 1 },
    publish_to_portal: true, notify_users: true, enabled: true,
    last_generated_at: dayAgo(15), created_at: dayAgo(30), updated_at: dayAgo(15),
  },
];

// =================== 智能报告：报告实例 ====================
const currentWeek2 = getWeekInfo();
const reports: any[] = [

  {
    id: 'rpt-1', config_id: 'rc-1', template_id: 'tpl-1',
    title: '技术研发部 ' + currentWeek2.year + '年第' + currentWeek2.week + '周周报',
    scope: 'department', department_id: 'org-2', department_name: '技术研发部',
    period: 'weekly', period_start: currentWeek2.week_start, period_end: currentWeek2.week_end,
    agent_id: 'a-7', agent_name: '技术研发部周报Agent',
    status: 'published', published_at: dayAgo(1),
    blocks: [
      { block_id: 'blk-1', type: 'metrics_card', title: '核心指标', data: [
        { name: '算力使用率', value: 78.5, unit: '%', change: 3.2, trend: 'neutral' },
        { name: '存储用量', value: 342.6, unit: 'TB', change: 12.8, trend: 'neutral' },
        { name: '任务完成数', value: 15234, unit: '个', change: -2.1, trend: 'higher_better' },
        { name: '排队时长', value: 4.3, unit: 'min', change: -0.8, trend: 'lower_better' },
      ] },
      { block_id: 'blk-2', type: 'chart_image', title: '趋势图表', data: { url: '/reports/rpt-1/charts/trend.png', alt: '7日调用趋势', caption: '本周调用量走势' } },
      { block_id: 'blk-3', type: 'data_table', title: '明细数据', data: {
        headers: ['模型', '调用次数', '平均延迟', '错误率', '费用'],
        rows: [['GPT-4o', '5,240', '120ms', '0.1%', '¥680'], ['Claude 3.5', '3,890', '95ms', '0.2%', '¥420'], ['DeepSeek V3', '2,100', '68ms', '0.05%', '¥52']],
      } },
      { block_id: 'blk-4', type: 'rich_text', title: 'AI 智能分析', data: { content: '本周算力使用率稳定在78.5%，存储用量环比增长12.8TB，主要受新上模型训练任务影响。任务排队时长下降至4.3分钟，整体运行平稳。' } },
      { block_id: 'blk-5', type: 'bullet_list', title: '本周亮点', data: { items: ['完成集群扩容，新增32张A100 GPU卡', '优化任务调度算法，排队时长下降15%', '处理存储冷数据归档策略异常1起'] } },
      { block_id: 'blk-6', type: 'bullet_list', title: '风险与问题', data: { items: ['下周预计有大模型训练高峰，需提前预留算力缓冲', '某节点磁盘故障率略有上升'] } },
      { block_id: 'blk-7', type: 'bullet_list', title: '下周计划', data: { items: ['完成第二批GPU节点上线', '推进存储分层方案落地', '输出资源成本分摊报表'] } },
    ],
    created_at: dayAgo(1), updated_at: dayAgo(1),
  },
  {
    id: 'rpt-2', config_id: 'rc-2', template_id: 'tpl-1',
    title: 'AI平台组 ' + currentWeek2.year + '年第' + currentWeek2.week + '周周报',
    scope: 'department', department_id: 'org-4', department_name: 'AI平台组',
    period: 'weekly', period_start: currentWeek2.week_start, period_end: currentWeek2.week_end,
    agent_id: 'a-8', agent_name: 'AI平台组周报Agent',
    status: 'published', published_at: dayAgo(1),
    blocks: [
      { block_id: 'blk-1', type: 'metrics_card', title: '核心指标', data: [
        { name: '接口调用量', value: 892100, unit: '次', change: 8.4, trend: 'higher_better' },
        { name: '接口错误率', value: 0.32, unit: '%', change: -0.15, trend: 'lower_better' },
        { name: '任务完成数', value: 4521, unit: '个', change: 5.2, trend: 'higher_better' },
        { name: '平均延迟', value: 145, unit: 'ms', change: -12, trend: 'lower_better' },
      ] },
      { block_id: 'blk-2', type: 'chart_image', title: '趋势图表', data: { url: '/reports/rpt-2/charts/trend.png', alt: 'API调用趋势', caption: '本周接口调用量走势' } },
      { block_id: 'blk-3', type: 'data_table', title: '明细数据', data: {
        headers: ['模型', '调用量', 'P90延迟', '错误率', '可用率'],
        rows: [['GPT-4o', '340K', '125ms', '0.08%', '99.9%'], ['Claude 3.5', '280K', '98ms', '0.12%', '99.8%'], ['GLM-4', '150K', '180ms', '0.3%', '99.5%']],
      } },
      { block_id: 'blk-4', type: 'rich_text', title: 'AI 智能分析', data: { content: '本周AI平台接口调用量突砉89万次，错误率保持在0.32%低位。模型部署效率提升，平均启动时间缩短至45秒。' } },
      { block_id: 'blk-5', type: 'bullet_list', title: '本周亮点', data: { items: ['新版模型策略上线，响应延迟降低20%', '完成3个大模型的灰度发布'] } },
      { block_id: 'blk-6', type: 'bullet_list', title: '风险与问题', data: { items: ['高并发场景下偶现限流，需评估扩容'] } },
      { block_id: 'blk-7', type: 'bullet_list', title: '下周计划', data: { items: ['上线模型版本回滚能力', '完善调用链路监控'] } },
    ],
    created_at: dayAgo(1), updated_at: dayAgo(1),
  },
  {
    id: 'rpt-3', config_id: 'rc-3', template_id: 'tpl-2',
    title: '全公司日报 ' + currentWeek2.year + '-06-15',
    scope: 'company', department_id: '', department_name: '',
    period: 'daily', period_start: dayAgo(0), period_end: dayAgo(0),
    agent_id: 'a-11', agent_name: '运营汇总周报Agent',
    status: 'published', published_at: dayAgo(0),
    blocks: [
      { block_id: 'blk-11', type: 'metrics_card', title: '今日指标', data: [
        { name: '总调用量', value: 24500, unit: '次', change: 5.2, trend: 'higher_better' },
        { name: '活跃用户', value: 128, unit: '人', change: 3, trend: 'higher_better' },
        { name: '平台可用率', value: 99.9, unit: '%', change: 0, trend: 'neutral' },
        { name: '待处理告警', value: 2, unit: '个', change: -1, trend: 'lower_better' },
      ] },
      { block_id: 'blk-12', type: 'rich_text', title: 'AI 摘要', data: { content: '今日平台运行正常，调用量24.5K，活跃用户128人。通义千问VL延迟偶有波动，已自动扩容恢复。' } },
      { block_id: 'blk-13', type: 'bullet_list', title: '告警事项', data: { items: ['通义千问VL 延迟超过300ms × 2次，已自动恢复', 'GPU利用率达82%，接近阈值'] } },
    ],
    created_at: dayAgo(0), updated_at: dayAgo(0),
  },
  {
    id: 'rpt-4', config_id: 'rc-4', template_id: 'tpl-3',
    title: '全公司运营周报（第' + currentWeek2.week + '周）',
    scope: 'company', department_id: '', department_name: '',
    period: 'weekly', period_start: currentWeek2.week_start, period_end: currentWeek2.week_end,
    agent_id: 'a-11', agent_name: '运营汇总周报Agent',
    status: 'published', published_at: dayAgo(1),
    blocks: [
      { block_id: 'blk-21', type: 'metrics_card', title: '公司核心指标', data: [
        { name: '总调用量', value: 143900, unit: '次', change: 8.4, trend: 'higher_better' },
        { name: '销售额', value: 286.5, unit: '万元', change: 15.3, trend: 'higher_better' },
        { name: '客服解决率', value: 92.5, unit: '%', change: 1.8, trend: 'higher_better' },
        { name: '平台可用率', value: 99.7, unit: '%', change: 0.1, trend: 'neutral' },
      ] },
      { block_id: 'blk-22', type: 'chart_image', title: '各部门趋势对比', data: { url: '/reports/rpt-4/charts/dept-compare.png', alt: '部门对比', caption: '各部门本周表现对比' } },
      { block_id: 'blk-23', type: 'data_table', title: '部门排行', data: {
        headers: ['部门', '调用量', '错误率', '满意度', '得分'],
        rows: [['AI平台组', '892K', '0.32%', '98%', '95'], ['技术研发部', '245K', '0.1%', '96%', '92'], ['销售部', '-', '-', '94%', '88']],
      } },
      { block_id: 'blk-24', type: 'rich_text', title: 'AI 综合分析', data: { content: '第' + currentWeek2.week + '周整体运营平稳。AI平台调用量创新高，销售签约表现亮眼，客服解决率持续提升。需关注下周算力高峰影响。' } },
      { block_id: 'blk-25', type: 'bullet_list', title: '本周亮点', data: { items: ['技术部完成32卡GPU扩容', 'AI平台接口调用量创新高', '销售签约金额环比增长15.3%'] } },
      { block_id: 'blk-26', type: 'bullet_list', title: '风险与问题', data: { items: ['下周算力需求预计激增', '高并发限流风险需提前评估'] } },
    ],
    created_at: dayAgo(1), updated_at: dayAgo(1),
  },
  {
    id: 'rpt-5', config_id: 'rc-3', template_id: 'tpl-2',
    title: '全公司日报 ' + currentWeek2.year + '-06-14',
    scope: 'company', department_id: '', department_name: '',
    period: 'daily', period_start: dayAgo(1), period_end: dayAgo(1),
    agent_id: 'a-11', agent_name: '运营汇总周报Agent',
    status: 'published', published_at: dayAgo(1),
    blocks: [
      { block_id: 'blk-11', type: 'metrics_card', title: '今日指标', data: [
        { name: '总调用量', value: 21800, unit: '次', change: 2.1, trend: 'higher_better' },
        { name: '活跃用户', value: 115, unit: '人', change: -5, trend: 'higher_better' },
        { name: '平台可用率', value: 99.8, unit: '%', change: 0, trend: 'neutral' },
        { name: '待处理告警', value: 3, unit: '个', change: 1, trend: 'lower_better' },
      ] },
      { block_id: 'blk-12', type: 'rich_text', title: 'AI 摘要', data: { content: '昨日平台运行正常，调用量稳定在21.8K。GLM-4服务短暂中断5分钟已恢复。' } },
      { block_id: 'blk-13', type: 'bullet_list', title: '告警事项', data: { items: ['GLM-4 服务中断 14:32-14:37，已自动恢复', 'GPU利用率达85%，建议扩容', 'Agent a-3 运行失败×1'] } },
    ],
    created_at: dayAgo(1), updated_at: dayAgo(1),
  },
];

// =================== 报告元数据（分发能力增强 ①） ====================
// 每条含 report_id、owner、status（draft/pending/published/modified）、scope、version、changelog、has_unpublished_changes
// 为 3 个内置报告（公司综合报告/部门季度报告/预算执行报告）生成元数据：owner=平台、status=published、scope=company
const reportMeta: any[] = [
  { report_id: 'company-overview', owner: '平台', status: 'published', scope: 'company', version: '1.0.0', changelog: '初始版本发布', has_unpublished_changes: false },
  { report_id: 'dept-quarterly', owner: '平台', status: 'published', scope: 'company', version: '1.0.0', changelog: '初始版本发布', has_unpublished_changes: false },
  { report_id: 'budget-report', owner: '平台', status: 'published', scope: 'company', version: '1.0.0', changelog: '初始版本发布', has_unpublished_changes: false },
];

// =================== Agent ===================
// agent_type: 'workflow'（工作流编排，拖拽画布）| 'chat'（对话，右侧调试预览）
const agents = [
  { id: 'a-1', name: 'CRM销售通知', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-1', owner_name: '张伟', avatar_color: '#3b82f6', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 2, last_run_at: ago(5), updated_at: ago(120), description: '监控CRM系统销售事件并发送通知', system_prompt: '你是一个销售助手，负责监控和通知销售相关事件。', editable_roles: ['技术部成员'], viewable_roles: ['普通用户'] },
  { id: 'a-2', name: '设备巡检', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-1', owner_name: '张伟', avatar_color: '#06b6d4', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(15), updated_at: ago(240), description: '定期检查设备状态并生成报告', system_prompt: '你是一个设备巡检助手，负责检查设备运行状态。' },
  { id: 'a-3', name: '摄像头监控#12', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-2', owner_name: '李娜', avatar_color: '#f59e0b', status: 'published', model_policy_id: 'mp-3', policy_name: '视觉理解策略', triggers_count: 1, last_run_at: ago(32), updated_at: ago(300), description: '监控12号摄像头的异常情况', system_prompt: '你是一个视觉监控助手，负责分析摄像头画面。' },
  { id: 'a-4', name: '每日总结', agent_type: 'workflow', category: 'workflow', owner_type: 'personal', owner_id: 'u-1', owner_name: '张伟', avatar_color: '#10b981', status: 'published', model_policy_id: 'mp-2', policy_name: '高性价比对话', triggers_count: 1, last_run_at: ago(60), updated_at: ago(360), description: '每日自动汇总工作日志和待办事项', system_prompt: '你是日报生成助手，负责汇总和整理工作日志。' },
  { id: 'a-5', name: '个人提醒', agent_type: 'workflow', category: 'workflow', owner_type: 'personal', owner_id: 'u-1', owner_name: '张伟', avatar_color: '#a855f7', status: 'published', model_policy_id: 'mp-2', policy_name: '高性价比对话', triggers_count: 3, last_run_at: ago(120), updated_at: ago(400), description: '个人待办和日程提醒', system_prompt: '你是个人助理，负责提醒待办事项和日程安排。' },
  { id: 'a-6', name: '知识库问答助手', agent_type: 'chat', category: 'chat', owner_type: 'organization', owner_id: 'u-2', owner_name: '李娜', avatar_color: '#7C3AED', status: 'published', has_unpublished_changes: true, model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 0, last_run_at: ago(20), updated_at: ago(60), description: '基于企业知识库的智能问答对话助手', system_prompt: '你是知识库问答助手，请依据检索到的资料准确、简洁地回答用户问题。', editable_roles: ['技术部成员', '产品部成员'], viewable_roles: ['普通用户', '运营部成员'], chat_config: { welcome: '你好，我是知识库问答助手，请问有什么可以帮你？', temperature: 0.3, max_tokens: 2048, model_policy_id: 'mp-1', authorized_skills: ['sk-5'], knowledge_base_ids: ['kb-1'], variables: [{ key: 'department', label: '部门', type: 'text', required: false }], opening_questions: ['公司报销流程是怎样的？', '研发规范在哪里查看？'] } },
  { id: 'a-7', name: '技术研发部周报Agent', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-3', owner_name: '王强', avatar_color: '#3b82f6', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(2880), updated_at: ago(3000), description: '自动拉取技术研发部运营数据并生成周报', system_prompt: '你是周报生成助手，负责汇总技术研发部本周运营数据，生成结构化周报。' },
  { id: 'a-8', name: 'AI平台组周报Agent', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-3', owner_name: '王强', avatar_color: '#06b6d4', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(2880), updated_at: ago(3000), description: '自动拉取AI平台组运营数据并生成周报', system_prompt: '你是周报生成助手，负责汇总AI平台组本周运营数据，生成结构化周报。' },
  { id: 'a-9', name: '销售部周报Agent', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-3', owner_name: '王强', avatar_color: '#f59e0b', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(2880), updated_at: ago(3000), description: '自动拉取销售部运营数据并生成周报', system_prompt: '你是周报生成助手，负责汇总销售部本周运营数据，生成结构化周报。' },
  { id: 'a-10', name: '智慧客服项目周报Agent', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-3', owner_name: '王强', avatar_color: '#10b981', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(2880), updated_at: ago(3000), description: '自动拉取智慧客服项目运营数据并生成周报', system_prompt: '你是周报生成助手，负责汇总智慧客服项目本周运营数据，生成结构化周报。' },
  { id: 'a-11', name: '运营汇总周报Agent', agent_type: 'workflow', category: 'workflow', owner_type: 'organization', owner_id: 'u-3', owner_name: '王强', avatar_color: '#a855f7', status: 'published', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(2880), updated_at: ago(3000), description: '聚合各部门周报数据生成运营汇总周报', system_prompt: '你是运营周报生成助手，负责汇总各部门周报数据，生成跨部门运营汇总周报。' },
  { id: 'a-12', name: '智能客服助手', agent_type: 'chat', category: 'chat', owner_type: 'organization', owner_id: 'u-2', owner_name: '李娜', avatar_color: '#00D4FF', status: 'published', has_unpublished_changes: true, model_policy_id: 'mp-2', policy_name: '高性价比对话', triggers_count: 0, last_run_at: ago(8), updated_at: ago(30), description: '面向客户的售前售后对话客服', system_prompt: '你是一名专业、友好的客服助手，请耐心解答客户关于产品与订单的问题。', chat_config: { welcome: '您好！我是智能客服，很高兴为您服务～', temperature: 0.7, max_tokens: 1024, model_policy_id: 'mp-2', authorized_skills: ['sk-8'], knowledge_base_ids: [], variables: [], opening_questions: ['如何查询我的订单？', '产品保修政策是什么？'] } },
  { id: 'a-13', name: '研发问答助手', agent_type: 'chat', category: 'chat', owner_type: 'personal', owner_id: 'u-1', owner_name: '张伟', avatar_color: '#7C3AED', status: 'draft', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 0, last_run_at: '', updated_at: ago(15), description: '辅助研发团队快速查询技术文档与规范', system_prompt: '你是研发问答助手，请结合内部技术文档回答研发相关问题。', chat_config: { welcome: '嗨，我可以帮你查研发文档和规范～', temperature: 0.4, max_tokens: 2048, model_policy_id: 'mp-1', authorized_skills: ['sk-5', 'sk-1'], knowledge_base_ids: ['kb-1'], variables: [], opening_questions: [] } },
];

// =================== 智能体/工作流版本历史（不可变快照） ===================
// status: published | reviewing | rejected | history | deprecated
// is_rollback: 是否为回滚版本
// snapshot: chat类存配置JSON，workflow类存flow_json
const agentVersions: any[] = [
  // a-1 CRM销售通知 版本历史
  { id: 'av-1-1', agent_id: 'a-1', version: '2.0.0', status: 'published', is_rollback: false, changelog: '新增客户分级通知策略', published_at: '2026-06-01 10:00', publisher: '张伟', snapshot: JSON.stringify({ nodes: 4, edges: 3 }) },
  { id: 'av-1-2', agent_id: 'a-1', version: '1.0.0', status: 'history', is_rollback: false, changelog: '首次发布', published_at: '2026-04-15 09:00', publisher: '张伟', snapshot: JSON.stringify({ nodes: 3, edges: 2 }) },
  // a-6 知识库问答助手 版本历史（有未发布修改）
  { id: 'av-6-1', agent_id: 'a-6', version: '1.2.0', status: 'published', is_rollback: false, changelog: '优化检索策略，提升回答准确率', published_at: '2026-05-20 14:00', publisher: '李娜', snapshot: JSON.stringify({ welcome: '你好，我是知识库问答助手', temperature: 0.3 }) },
  { id: 'av-6-2', agent_id: 'a-6', version: '1.0.0', status: 'history', is_rollback: false, changelog: '首次发布', published_at: '2026-03-10 08:00', publisher: '李娜', snapshot: JSON.stringify({ welcome: '你好', temperature: 0.5 }) },
  // a-12 智能客服助手 版本历史
  { id: 'av-12-1', agent_id: 'a-12', version: '1.1.0', status: 'published', is_rollback: false, changelog: '新增订单查询技能集成', published_at: '2026-06-10 11:00', publisher: '李娜', snapshot: JSON.stringify({ welcome: '您好！我是智能客服', temperature: 0.7 }) },
  { id: 'av-12-2', agent_id: 'a-12', version: '1.0.0', status: 'history', is_rollback: false, changelog: '首次发布', published_at: '2026-04-01 09:00', publisher: '李娜', snapshot: JSON.stringify({ welcome: '您好', temperature: 0.7 }) },
];

// =================== Agent 协作者（权限）===================
// role: owner（拥有者）| admin（管理）| editor（可编辑）| viewer（只读）| chat_only（仅使用对话）
// principal_type: user（个人成员，缺省）| department（组织部门，授权后部门下所有人生效）
const agentCollaborators: Record<string, any[]> = {
  'a-1': [
    { principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
    { principal_type: 'user', user_id: 'u-4', name: '赵敏', role: 'editor' },
    { principal_type: 'user', user_id: 'u-5', name: '孙丽', role: 'viewer' },
    { principal_type: 'department', dept_id: 'pg-1', name: '技术部', member_count: 12, role: 'chat_only' },
  ],
  'a-6': [
    { principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'owner' },
    { principal_type: 'user', user_id: 'u-3', name: '王强', role: 'admin' },
    { principal_type: 'user', user_id: 'u-6', name: '周杰', role: 'chat_only' },
    { principal_type: 'department', dept_id: 'pg-3', name: '售后部', member_count: 6, role: 'chat_only' },
  ],
  'a-12': [
    { principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'owner' },
    { principal_type: 'user', user_id: 'u-7', name: '吴芳', role: 'chat_only' },
  ],
};
const getCollaborators = (id: string) => agentCollaborators[id] || [{ principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' }];

// =================== Agent 工作流配置 ===================
const workflows: Record<string, any> = {
  'a-1': {
    agent_id: 'a-1',
    name: 'CRM通知流程',
    max_iterations: 1,
    timeout_seconds: 60,
    on_error: 'stop',
    input_params: [
      { key: 'customer_id', label: '客户ID', type: 'text', required: true },
      { key: 'notify_email', label: '通知邮箱', type: 'text', required: false },
    ],
    nodes: [
      {
        id: 'wn-1-1', name: '解析事件', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'event = input["trigger_payload"]\ncustomer_id = event.get("customer_id")\nreturn {"customer_id": customer_id, "event": event}',
      },
      {
        id: 'wn-1-2', name: '查询客户详情', type: 'skill',
        on_error: 'inherit', enabled: true,
        skill_id: 'sk-4', skill_name: 'CRM数据同步',
      },
      {
        id: 'wn-1-3', name: '生成通知内容', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是销售助手，根据客户信息和事件生成简短的通知消息，要求语气专业、不超过 80 字。',
      },
      {
        id: 'wn-1-4', name: '发送企微消息', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'msg = input["llm_output"]\nresp = http_post("https://qyapi.weixin.qq.com/send", {"msg": msg})\nlog_info("send_result", resp)',
      },
    ],
  },
  'a-2': {
    agent_id: 'a-2',
    name: '设备巡检流程',
    max_iterations: 3,
    timeout_seconds: 120,
    on_error: 'retry',
    input_params: [
      { key: 'device_count', label: '巡检设备数量', type: 'number', required: false },
    ],
    nodes: [
      {
        id: 'wn-2-1', name: '获取设备列表', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'devices = http_get(config["device_endpoint"])\nreturn json_parse(devices)',
      },
      {
        id: 'wn-2-2', name: '遍历设备状态', type: 'loop',
        on_error: 'skip', enabled: true,
        max_loop: 50,
      },
      {
        id: 'wn-2-3', name: '生成巡检报告', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是设备巡检专家，根据 input 中的设备状态列表生成简短巡检报告，标注异常项。',
      },
    ],
  },
  'a-3': {
    agent_id: 'a-3',
    name: '摄像头分析流程',
    max_iterations: 1,
    timeout_seconds: 30,
    on_error: 'stop',
    nodes: [],
  },
  'a-4': {
    agent_id: 'a-4',
    name: '日报汇总流程',
    max_iterations: 1,
    timeout_seconds: 60,
    on_error: 'skip',
    nodes: [
      {
        id: 'wn-4-1', name: '拉取工作日志', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'logs = http_get(config["log_endpoint"])\nreturn json_parse(logs)',
      },
      {
        id: 'wn-4-2', name: '判断日志数量', type: 'condition',
        on_error: 'inherit', enabled: true,
        condition: 'len(input["logs"]) > 0',
      },
      {
        id: 'wn-4-3', name: '生成日报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是日报生成助手，根据工作日志列表撰写当日工作总结。',
      },
    ],
  },
  'a-5': {
    agent_id: 'a-5',
    name: '提醒推送流程',
    max_iterations: 1,
    timeout_seconds: 30,
    on_error: 'stop',
    nodes: [
      {
        id: 'wn-5-1', name: '查询待办', type: 'skill',
        on_error: 'inherit', enabled: true,
        skill_id: 'sk-2', skill_name: '数据库查询',
      },
      {
        id: 'wn-5-2', name: '推送提醒', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'todos = input["rows"]\nfor t in todos:\n  http_post(config["push_url"], t)',
      },
    ],
  },
  'a-6': {
    agent_id: 'a-6',
    name: '问答流程',
    max_iterations: 1,
    timeout_seconds: 30,
    on_error: 'stop',
    nodes: [],
  },
  'a-7': {
    agent_id: 'a-7',
    name: '技术研发部周报生成流程',
    max_iterations: 1,
    timeout_seconds: 120,
    on_error: 'retry',
    nodes: [
      {
        id: 'wn-7-1', name: '拉取运营数据', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: '# 拉取技术研发部本周运营数据\ndata = http_get(config["data_endpoint"])\nreturn json_parse(data)',
      },
      {
        id: 'wn-7-2', name: 'AI分析生成周报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是周报生成助手，根据技术研发部本周运营数据生成结构化周报，包含核心指标、本周亮点、风险与问题、下周计划。',
      },
      {
        id: 'wn-7-3', name: '保存周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'report = input["llm_output"]\nresult = http_post(config["report_endpoint"], report)\nlog_info("weekly_report_saved", result)',
      },
    ],
  },
  'a-8': {
    agent_id: 'a-8',
    name: 'AI平台组周报生成流程',
    max_iterations: 1,
    timeout_seconds: 120,
    on_error: 'retry',
    nodes: [
      {
        id: 'wn-8-1', name: '拉取运营数据', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: '# 拉取AI平台组本周运营数据\ndata = http_get(config["data_endpoint"])\nreturn json_parse(data)',
      },
      {
        id: 'wn-8-2', name: 'AI分析生成周报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是周报生成助手，根据AI平台组本周运营数据生成结构化周报。',
      },
      {
        id: 'wn-8-3', name: '保存周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'report = input["llm_output"]\nresult = http_post(config["report_endpoint"], report)\nlog_info("weekly_report_saved", result)',
      },
    ],
  },
  'a-9': {
    agent_id: 'a-9',
    name: '销售部周报生成流程',
    max_iterations: 1,
    timeout_seconds: 120,
    on_error: 'retry',
    nodes: [
      {
        id: 'wn-9-1', name: '拉取运营数据', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: '# 拉取销售部本周运营数据\ndata = http_get(config["data_endpoint"])\nreturn json_parse(data)',
      },
      {
        id: 'wn-9-2', name: 'AI分析生成周报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是周报生成助手，根据销售部本周运营数据生成结构化周报。',
      },
      {
        id: 'wn-9-3', name: '保存周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'report = input["llm_output"]\nresult = http_post(config["report_endpoint"], report)\nlog_info("weekly_report_saved", result)',
      },
    ],
  },
  'a-10': {
    agent_id: 'a-10',
    name: '智慧客服项目周报生成流程',
    max_iterations: 1,
    timeout_seconds: 120,
    on_error: 'retry',
    nodes: [
      {
        id: 'wn-10-1', name: '拉取运营数据', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: '# 拉取智慧客服项目本周运营数据\ndata = http_get(config["data_endpoint"])\nreturn json_parse(data)',
      },
      {
        id: 'wn-10-2', name: 'AI分析生成周报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是周报生成助手，根据智慧客服项目本周运营数据生成结构化周报。',
      },
      {
        id: 'wn-10-3', name: '保存周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'report = input["llm_output"]\nresult = http_post(config["report_endpoint"], report)\nlog_info("weekly_report_saved", result)',
      },
    ],
  },
  'a-11': {
    agent_id: 'a-11',
    name: '运营汇总周报生成流程',
    max_iterations: 1,
    timeout_seconds: 180,
    on_error: 'retry',
    nodes: [
      {
        id: 'wn-11-1', name: '拉取各部门周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: '# 拉取所有部门本周周报\nreports = http_get(config["reports_endpoint"])\nreturn json_parse(reports)',
      },
      {
        id: 'wn-11-2', name: 'AI汇总生成运营周报', type: 'model',
        on_error: 'inherit', enabled: true,
        prompt: '你是运营周报生成助手，汇总各部门周报数据，生成跨部门运营汇总周报，包含整体指标、亮点、风险和下周计划。',
      },
      {
        id: 'wn-11-3', name: '保存运营周报', type: 'starlark',
        on_error: 'inherit', enabled: true,
        script: 'report = input["llm_output"]\nresult = http_post(config["report_endpoint"], report)\nlog_info("operation_report_saved", result)',
      },
    ],
  },
};

// =================== Agent 运行记录 ===================
const agentRuns = [
  { id: 'ar-1', agent_id: 'a-1', agent_name: 'CRM销售通知', trigger_type: 'event', status: 'completed', duration_ms: 2300, model_tokens: 1240, input_tokens: 820, output_tokens: 420, cost: 0.0234, created_at: ago(5) },
  { id: 'ar-2', agent_id: 'a-2', agent_name: '设备巡检', trigger_type: 'schedule', status: 'completed', duration_ms: 8100, model_tokens: 3420, input_tokens: 2100, output_tokens: 1320, cost: 0.0678, created_at: ago(15) },
  { id: 'ar-3', agent_id: 'a-3', agent_name: '摄像头监控#12', trigger_type: 'schedule', status: 'failed', duration_ms: 30000, model_tokens: 0, input_tokens: 0, output_tokens: 0, cost: 0, created_at: ago(32) },
  { id: 'ar-4', agent_id: 'a-4', agent_name: '每日总结', trigger_type: 'schedule', status: 'completed', duration_ms: 4500, model_tokens: 2180, input_tokens: 1200, output_tokens: 980, cost: 0.0456, created_at: ago(60) },
  { id: 'ar-5', agent_id: 'a-5', agent_name: '个人提醒', trigger_type: 'schedule', status: 'completed', duration_ms: 1200, model_tokens: 380, input_tokens: 200, output_tokens: 180, cost: 0.0089, created_at: ago(120) },
  { id: 'ar-6', agent_id: 'a-1', agent_name: 'CRM销售通知', trigger_type: 'event', status: 'completed', duration_ms: 1800, model_tokens: 960, input_tokens: 620, output_tokens: 340, cost: 0.0178, created_at: ago(180) },
  { id: 'ar-7', agent_id: 'a-2', agent_name: '设备巡检', trigger_type: 'manual', status: 'completed', duration_ms: 6200, model_tokens: 2800, input_tokens: 1600, output_tokens: 1200, cost: 0.0543, created_at: ago(240) },
  { id: 'ar-8', agent_id: 'a-5', agent_name: '个人提醒', trigger_type: 'webhook', status: 'running', duration_ms: 0, model_tokens: 0, input_tokens: 0, output_tokens: 0, cost: 0, created_at: ago(1) },
  { id: 'ar-9', agent_id: 'a-7', agent_name: '技术研发部周报Agent', trigger_type: 'schedule', status: 'completed', duration_ms: 8200, model_tokens: 3180, input_tokens: 1900, output_tokens: 1280, cost: 0.0612, created_at: ago(2880) },
  { id: 'ar-10', agent_id: 'a-8', agent_name: 'AI平台组周报Agent', trigger_type: 'schedule', status: 'completed', duration_ms: 7500, model_tokens: 2940, input_tokens: 1700, output_tokens: 1240, cost: 0.0578, created_at: ago(2880) },
  { id: 'ar-11', agent_id: 'a-9', agent_name: '销售部周报Agent', trigger_type: 'schedule', status: 'completed', duration_ms: 5200, model_tokens: 1860, input_tokens: 980, output_tokens: 880, cost: 0.0367, created_at: ago(2880) },
  { id: 'ar-12', agent_id: 'a-10', agent_name: '智慧客服项目周报Agent', trigger_type: 'schedule', status: 'completed', duration_ms: 6800, model_tokens: 2540, input_tokens: 1400, output_tokens: 1140, cost: 0.0491, created_at: ago(2880) },
  { id: 'ar-13', agent_id: 'a-11', agent_name: '运营汇总周报Agent', trigger_type: 'schedule', status: 'completed', duration_ms: 12500, model_tokens: 5200, input_tokens: 3200, output_tokens: 2000, cost: 0.1024, created_at: ago(2820) },
];

// =================== Agent 辅助函数（工作流画布、调试、运行详情）===================
// 为工作流节点补充画布坐标，并根据顺序生成线性连线（若未显式定义 edges）
function enrichWorkflow(wf: any) {
  const nodes = (wf.nodes || []).map((n: any, i: number) => ({
    ...n,
    position: n.position || { x: 260, y: 60 + i * 140 },
  }));
  const edges = wf.edges || nodes.slice(1).map((n: any, i: number) => ({
    id: `e-${nodes[i].id}-${n.id}`, source: nodes[i].id, target: n.id, animated: true,
  }));
  return {
    ...wf,
    nodes,
    edges,
    client_config: wf.client_config || {
      show_progress: true, allow_interrupt: true, expose_variables: [], max_client_loops: 10,
    },
  };
}

// 对话调试：根据输入合成一段回复 + 引用 + Token/耗时
function debugChat(data: any) {
  const msg = (data?.message || data?.content || '你好').toString();
  const reply = `（调试回复）已收到：“${msg}”。根据当前配置与知识库，我的建议是：请提供更具体的背景信息，我会结合检索到的资料给出准确回答。`;
  return {
    reply,
    citations: [
      { doc: '员工手册.pdf', chunk: '第 3.2 节 报销流程', score: 0.91 },
      { doc: '研发规范.md', chunk: '代码提交规范', score: 0.83 },
    ],
    usage: { input_tokens: 320 + Math.floor(Math.random() * 200), output_tokens: 180 + Math.floor(Math.random() * 200), cost: +(0.01 + Math.random() * 0.03).toFixed(4) },
    duration_ms: 800 + Math.floor(Math.random() * 1200),
  };
}

// 工作流调试：逐节点生成执行结果
function debugWorkflow(id: string, data: any) {
  const wf = workflows[id] || { nodes: [] };
  const node_executions = (wf.nodes || []).map((n: any, i: number) => ({
    node_id: n.id, name: n.name, type: n.type,
    status: 'success',
    duration_ms: 200 + Math.floor(Math.random() * 900),
    input: i === 0 ? (data?.input || { trigger_payload: { demo: true } }) : { from: wf.nodes[i - 1]?.name },
    output: { ok: true, summary: `${n.name} 执行完成` },
    tokens: n.type === 'model' ? 400 + Math.floor(Math.random() * 800) : 0,
    logs: [`[${n.name}] 开始执行`, `[${n.name}] 执行成功`],
  }));
  return {
    run_id: 'debug-' + Date.now(),
    status: 'completed',
    duration_ms: node_executions.reduce((s: number, x: any) => s + x.duration_ms, 0),
    total_tokens: node_executions.reduce((s: number, x: any) => s + x.tokens, 0),
    node_executions,
  };
}

// 运行详情：根据运行记录 + 对应工作流节点合成逐节点执行链路
function buildRunDetail(execId: string) {
  const run = agentRuns.find((r: any) => r.id === execId) || agentRuns[0];
  const wf = workflows[run.agent_id] || { nodes: [] };
  const failed = run.status === 'failed';
  const node_executions = (wf.nodes || []).map((n: any, i: number, arr: any[]) => {
    const isLast = i === arr.length - 1;
    const status = failed && isLast ? 'failed' : 'success';
    return {
      node_id: n.id, name: n.name, type: n.type, status,
      duration_ms: 200 + Math.floor(Math.random() * 900),
      tokens: n.type === 'model' ? 400 + Math.floor(Math.random() * 800) : 0,
      input: i === 0 ? { trigger_payload: { source: run.trigger_type } } : { from: arr[i - 1]?.name },
      output: status === 'failed' ? { error: '节点执行超时' } : { ok: true, summary: `${n.name} 完成` },
      logs: status === 'failed'
        ? [`[${n.name}] 开始执行`, `[${n.name}] 错误：请求超时`]
        : [`[${n.name}] 开始执行`, `[${n.name}] 执行成功`],
    };
  });
  return { ...run, node_executions };
}

// =================== 技能（前台 + 后台共用） ===================
// status: draft | pending | published | rejected | delisted
// scope: private | department | company
const skills: any[] = [
  { id: 'sk-1', name: 'kingdee-erp-query', slug: 'kingdee-erp-query', description: '查询金蝶云星空 ERP 数据时使用，适用于按 formId 查询表单/单据列表、通过 FID 内码查看表单详情、查询销售订单、采购订单、收料通知单、应付单、付款单、库存、生产订单、生产领料、质检单、调拨单、其他入库...', status: 'published', scope: 'company', version: '2.1.0', install_count: 328, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-04-29 01:06', updated_at: '2026-05-10 09:30', changelog: '新增库存报表接口' },
  { id: 'sk-2', name: 'cron', slug: 'cron', description: '定时任务', status: 'published', scope: 'company', version: '1.0.0', install_count: 156, owner_id: 'u-2', owner_name: '李娜', owner_dept: '产品部', created_at: '2026-03-28 05:03', updated_at: '2026-03-28 05:03', changelog: '' },
  { id: 'sk-3', name: 'recloud', slug: 'recloud', description: 'recloud', status: 'published', scope: 'department', version: '1.2.0', install_count: 42, owner_id: 'u-3', owner_name: '王强', owner_dept: '技术研发部', created_at: '2026-03-12 04:13', updated_at: '2026-04-01 10:00', changelog: '修复连接超时问题', scope_dept_ids: ['dept-1'] },
  { id: 'sk-4', name: 'mes', slug: 'mes', description: 'MES Skill 体系：查遍 MES 从工单投产、质量测试、物料追溯、产出交接到供应链报表的 25 个业务域数据', status: 'published', scope: 'company', version: '3.0.1', install_count: 512, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-03-30 23:39', updated_at: '2026-06-01 14:00', changelog: '重构查询路由' },
  { id: 'sk-5', name: 'knows', slug: 'knows', description: '公司内部知识库：生产及工艺、研发知识、产品知识、售后服务、公司流程、法务财务、工程项目', status: 'published', scope: 'company', version: '1.5.0', install_count: 890, owner_id: 'u-2', owner_name: '李娜', owner_dept: '产品部', created_at: '2026-04-16 07:08', updated_at: '2026-05-20 11:00', changelog: '新增法务财务板块' },
  { id: 'sk-6', name: 'minimax-pdf', slug: 'minimax-pdf', description: '基于 token 化设计系统生成、填写和重排 PDF 文档。支持三种模式：CREATE（从零生成，15 种封面风格）、FILL（填写现有表单字段）、REFORMAT（将已有文档重排为新设计）。', status: 'published', scope: 'company', version: '2.0.0', install_count: 234, owner_id: 'u-4', owner_name: '赵敏', owner_dept: '设计部', created_at: '2026-04-14 23:50', updated_at: '2026-05-15 16:00', changelog: '新增 FILL 模式' },
  { id: 'sk-7', name: 'beisen', slug: 'beisen', description: '北森查用功能', status: 'published', scope: 'department', version: '1.0.0', install_count: 67, owner_id: 'u-5', owner_name: '刘芳', owner_dept: '人力资源部', created_at: '2026-03-21 20:06', updated_at: '2026-03-21 20:06', changelog: '', scope_dept_ids: ['dept-3'] },
  { id: 'sk-8', name: 'crm', slug: 'crm', description: 'CRM 客户管理数据查询与同步', status: 'published', scope: 'company', version: '1.3.0', install_count: 178, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-03-11 04:44', updated_at: '2026-04-20 09:00', changelog: '新增客户画像接口' },
  { id: 'sk-9', name: 'wecom-smartsheet-schema', slug: 'wecom-smartsheet', description: '企业微信智能表格模式', status: 'draft', scope: 'private', version: '0.1.0', install_count: 0, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-04-09 05:14', updated_at: '2026-04-09 05:14', changelog: '' },
  { id: 'sk-10', name: 'wecom-send-media', slug: 'wecom-send-media', description: '企业微信发送文件 图片等', status: 'pending', scope: 'department', version: '1.0.0', install_count: 0, owner_id: 'u-3', owner_name: '王强', owner_dept: '技术研发部', created_at: '2026-04-09 05:13', updated_at: '2026-04-09 05:13', changelog: '首次提交发布', scope_dept_ids: ['dept-1'] },
  { id: 'sk-11', name: 'gen-image', slug: 'gen-image', description: '生成图片', status: 'rejected', scope: 'private', version: '0.2.0', install_count: 0, owner_id: 'u-4', owner_name: '赵敏', owner_dept: '设计部', created_at: '2026-04-08 00:59', updated_at: '2026-04-10 10:00', changelog: '', reject_reason: '缺少 SKILL.md 中的安全声明' },
  { id: 'sk-12', name: 'data-cleanup', slug: 'data-cleanup', description: '自动清洗和格式化原始数据，支持 CSV/Excel/JSON', status: 'draft', scope: 'private', version: '0.1.0', install_count: 0, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-06-15 10:00', updated_at: '2026-06-15 10:00', changelog: '' },
  { id: 'sk-13', name: 'meeting-notes', slug: 'meeting-notes', description: '会议纪要自动生成，支持语音转文字和结构化输出', status: 'delisted', scope: 'company', version: '1.1.0', install_count: 45, owner_id: 'u-2', owner_name: '李娜', owner_dept: '产品部', created_at: '2026-02-20 08:00', updated_at: '2026-05-28 14:00', changelog: '管理员强制下架：依赖接口已废弃' },
  { id: 'sk-14', name: 'sales-report', slug: 'sales-report', description: '销售数据报表生成，支持多维度筛选和图表导出', status: 'modified', scope: 'company', version: '2.0.0', install_count: 89, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: '2026-03-15 10:00', updated_at: '2026-07-08 16:30', changelog: '新增季度对比图表功能' },
];

// =================== 技能版本历史（不可变快照） ===================
// status: draft | pending | published | rejected | history | deprecated
// is_rollback: 是否为回滚版本
const skillVersions: any[] = [
  // sk-1 kingdee-erp-query 版本历史
  { id: 'sv-1-1', skill_id: 'sk-1', version: '2.1.0', status: 'published', is_rollback: false, changelog: '新增库存报表接口', published_at: '2026-05-10 09:30', publisher: '张伟', file_count: 9, total_size: 22460 },
  { id: 'sv-1-2', skill_id: 'sk-1', version: '2.0.0', status: 'history', is_rollback: false, changelog: '重构查询路由，优化性能', published_at: '2026-04-15 14:00', publisher: '张伟', file_count: 8, total_size: 19800 },
  { id: 'sv-1-3', skill_id: 'sk-1', version: '1.5.0', status: 'history', is_rollback: false, changelog: '新增生产订单查询', published_at: '2026-03-20 10:00', publisher: '张伟', file_count: 7, total_size: 16500 },
  { id: 'sv-1-4', skill_id: 'sk-1', version: '1.0.0', status: 'history', is_rollback: false, changelog: '首次发布', published_at: '2026-02-01 08:00', publisher: '张伟', file_count: 5, total_size: 12000 },
  // sk-4 mes 版本历史
  { id: 'sv-4-1', skill_id: 'sk-4', version: '3.0.1', status: 'published', is_rollback: false, changelog: '重构查询路由', published_at: '2026-06-01 14:00', publisher: '张伟', file_count: 12, total_size: 35000 },
  { id: 'sv-4-2', skill_id: 'sk-4', version: '3.0.0', status: 'history', is_rollback: false, changelog: '新增供应链报表模块', published_at: '2026-05-15 10:00', publisher: '张伟', file_count: 11, total_size: 32000 },
  { id: 'sv-4-3', skill_id: 'sk-4', version: '2.5.0', status: 'deprecated', is_rollback: false, changelog: '有严重 Bug，已废弃', published_at: '2026-04-20 09:00', publisher: '张伟', file_count: 10, total_size: 28000 },
  // sk-14 sales-report 版本历史（有未发布修改）
  { id: 'sv-14-1', skill_id: 'sk-14', version: '2.0.0', status: 'published', is_rollback: false, changelog: '新增季度对比图表功能', published_at: '2026-06-20 10:00', publisher: '张伟', file_count: 6, total_size: 15000 },
  { id: 'sv-14-2', skill_id: 'sk-14', version: '1.0.0', status: 'history', is_rollback: false, changelog: '首次发布', published_at: '2026-03-15 10:00', publisher: '张伟', file_count: 4, total_size: 10000 },
  // sk-10 wecom-send-media 版本历史（待审核）
  { id: 'sv-10-1', skill_id: 'sk-10', version: '1.0.0', status: 'pending', is_rollback: false, changelog: '首次提交发布', published_at: null, publisher: '王强', file_count: 3, total_size: 4500 },
];

// =================== Skill 文件系统 ===================
const skillFiles: Record<string, { path: string; size: number; updatedAt: string }[]> = {
  'sk-1': [
    { path: 'SKILL.md', size: 3520, updatedAt: '2026-04-29 01:06' },
    { path: 'agents/openai.yaml', size: 420, updatedAt: '2026-04-29 01:06' },
    { path: 'references/endpoint-index.md', size: 1860, updatedAt: '2026-04-29 01:06' },
    { path: 'references/error-responses.md', size: 890, updatedAt: '2026-04-29 01:06' },
    { path: 'references/examples.md', size: 2450, updatedAt: '2026-04-29 01:06' },
    { path: 'references/legacy-full-skill.md', size: 5600, updatedAt: '2026-04-29 01:06' },
    { path: 'references/query-contracts.md', size: 3200, updatedAt: '2026-04-29 01:06' },
    { path: 'references/report-contracts.md', size: 2780, updatedAt: '2026-04-29 01:06' },
    { path: 'references/workflow.md', size: 1540, updatedAt: '2026-04-29 01:06' },
  ],
  'sk-10': [
    { path: 'SKILL.md', size: 2100, updatedAt: '2026-04-09 05:13' },
    { path: 'agents/wecom.yaml', size: 380, updatedAt: '2026-04-09 05:13' },
    { path: 'references/api-spec.md', size: 1200, updatedAt: '2026-04-09 05:13' },
  ],
  'sk-11': [
    { path: 'SKILL.md', size: 800, updatedAt: '2026-04-08 00:59' },
    { path: 'agents/image-gen.yaml', size: 400, updatedAt: '2026-04-08 00:59' },
  ],
};

const skillFileContents: Record<string, string> = {
  'sk-1:SKILL.md': `---
name: kingdee-erp-query
description: 查询金蝶云星空 ERP 数据时使用：把业务问题路由到本项目封装后的只读 ERP API，并为单据、库存、预算、生产缺料、序列号、BOM、替代方案、流程管理中心等场景生成元数据可验证的请求体。凡涉及金蝶、ERP、K3Cloud、云星空、formId、fieldKeys、AuthHeader、FID、单据编号、销... 统一使用此 skill。
---

# 金蝶 ERP 查询

这个 skill 负责把用户的业务查询需求转成项目内封装后的金蝶 ERP 只读 API 调用，并把路由、请求、响应摘要和分析沉淀成可复用 artifacts。入口只编排，细节按需加载，模块输出独立保存。

## 设计原则

1. **模块化**：一次查询拆成 \`intake -> route -> request -> execute -> interpret -> respond\`。每个模块只做一件事。
2. **松耦合**：下游模块只读取上游 artifact，不重新推导上游结论。修改某个模块时，保留前序输出，从该模块继续。
3. **高内聚**：接口映射、请求体规则、异常话术、示例分别放在 references；不要把新接口细节堆回 \`SKILL.md\`。
4. **断点继续**：每个模块必须保存输出。调试时优先从最近失败的模块重跑，不要从头重查。
5. **最小上下文**：先读本入口，再只读需要的 reference。

## Reference 模块

按需读取这些文件：

- \`references/workflow.md\`：模块流水线、artifact 目录、断点继续协议。
- \`references/endpoint-index.md\`：业务名称、formId、API 路径、可用性与替代路径。
- \`references/query-contracts.md\`：普通表单、库存分页报表、系统报表、BOM、过滤方案的请求/响应契约。
- \`references/report-contracts.md\`：库存、预算、生产缺料、序列号等特殊报表的字段与快捷参数。
- \`references/examples.md\`：curl/request 示例与常用查询模板。
- \`references/error-responses.md\`：客户端异常回复模板与禁止暴露内容。

## 必须遵守的执行流程

1. 读取 \`references/workflow.md\`，创建本次查询的 run 目录。
2. 产出 \`00-intake.md\`：用户目标、已知条件、缺失条件、AuthHeader 状态。
3. 读取 \`references/endpoint-index.md\`，产出 \`01-route.md\`：选中的接口、formId、为什么不用其他接口。
4. 按接口类型读取 \`query-contracts.md\` 或 \`report-contracts.md\`，产出 \`02-request.json\` 和 \`02-request.md\`。
5. 执行 API 前确认不保存 AuthHeader；只在 request artifact 中保留 \`<AUTH_HEADER>\` 占位。
6. 执行后保存 \`03-response-summary.md\`。只有用户明确允许或调试确实需要时，才保存脱敏后的 \`03-response.json\`。
7. 产出 \`04-analysis.md\`：字段解释、分页状态、空结果/权限/异常判断。
8. 最终回复前保存 \`05-final-answer.md\`，并给用户简洁结论。

## 调试与断点继续

- 如果用户要求"继续上次查询"，先找最近的 run 目录，读取 \`run-state.json\` 和最新模块输出。
- 如果只改请求参数，从 \`02-request\` 重新生成并继续，不重做 \`00-intake\` 和 \`01-route\`。
- 如果只改解析/话术，从 \`03-response-summary.md\` 或脱敏响应继续，不重调接口。
- 如果接口选错，只重做 \`01-route\` 之后的模块。
- 每次重跑一个模块，写新版本：\`02-request.v2.json\`、\`04-analysis.v2.md\`，不要覆盖旧输出。`,
  'sk-1:agents/openai.yaml': `model: gpt-4o
temperature: 0.2
system_prompt: |
  你是一个金蝶 ERP 数据查询专家。请严格按照 SKILL.md 中的执行流程操作。
  不要暴露 AuthHeader、token、密码等凭证信息。
  只读操作，禁止修改或删除 ERP 数据。`,
  'sk-1:references/endpoint-index.md': `# Endpoint Index

| 业务 | formId | 路径 | 说明 |
|------|--------|------|------|
| 销售订单 | SAL_SaleOrder | /k3cloud/erp/query | 主单据 |
| 采购订单 | PUR_PurchaseOrder | /k3cloud/erp/query | 主单据 |
| 库存 | STK_Inventory | /k3cloud/erp/query | 实时库存 |
| 生产订单 | PRD_MO | /k3cloud/erp/query | 生产工单 |
`,
  'sk-1:references/query-contracts.md': `# Query Contracts

## 普通表单查询

POST /k3cloud/erp/query
{
  "formId": "SAL_SaleOrder",
  "filterString": "FDate >= '2026-01-01'",
  "fieldKeys": "FBillNo,FDate,FCustId,FMaterialId,FQty"
}
`,
  'sk-1:references/examples.md': `# Examples

### 查询最近 30 天的销售订单

\`\`\`bash
curl -X POST https://api.company.com/k3cloud/erp/query \\
  -H "Content-Type: application/json" \\
  -H "Authorization: <AUTH_HEADER>" \\
  -d '{\n    "formId": "SAL_SaleOrder",\n    "filterString": "FDate >= '\\''2026-05-01'\\''"\n  }'
\`\`\`
`,
  'sk-1:references/workflow.md': `# Workflow

## 模块流水线

1. 00-intake：理解用户意图，提取已知/缺失条件
2. 01-route：选择最合适的 endpoint 和 formId
3. 02-request：构建请求体，保留 <AUTH_HEADER> 占位
4. 03-response：执行 API，保存摘要（不保存原始响应）
5. 04-analysis：解析结果，处理异常/空结果
6. 05-final-answer：生成用户友好回复

## 断点继续协议

每个模块输出独立文件。重跑时只需替换当前模块及下游模块的输出。`,
  'sk-1:references/error-responses.md': `# Error Responses

- 权限不足："当前账号无此模块查询权限，请联系 ERP 管理员开通。"
- 接口超时："ERP 接口响应超时，请稍后重试或联系管理员检查网络。"
- 数据不存在："未查询到符合条件的数据，建议放宽筛选条件。"
`,
  'sk-1:references/report-contracts.md': `# Report Contracts

## 库存报表

- endpoint: /k3cloud/erp/report/stk
- 快捷参数: warehouse, materialGroup, dateRange

## 生产缺料分析

- endpoint: /k3cloud/erp/report/prd-shortage
- 快捷参数: moNumber, workCenter, dateRange
`,
  'sk-1:references/legacy-full-skill.md': `# Legacy Full Skill (Deprecated)

旧版全量 skill 已拆分。请使用新版模块化 skill。
`,
  'sk-10:SKILL.md': `---
name: wecom-send-media
description: 企业微信发送文件、图片等多媒体消息。支持通过部门ID或用户ID发送，支持多种文件类型。
---

# 企业微信发送多媒体

通过企业微信 API 发送文件、图片、语音等多媒体消息。

## 使用场景

- 发送文件到指定部门群
- 发送图片给特定用户
- 批量发送通知文件

## 执行流程

1. 确认目标用户/部门
2. 上传文件到企业微信素材库
3. 发送消息

## 注意事项

- 文件大小不超过 20MB
- 仅支持企业微信认证用户`,
  'sk-10:agents/wecom.yaml': `model: gpt-4o-mini
temperature: 0.3
system_prompt: |
  你是企业微信消息发送助手。请严格按照 SKILL.md 中的流程操作。
  不要暴露 API token 和 secret。`,
  'sk-10:references/api-spec.md': `# 企业微信 API 规范

## 上传素材
POST /cgi-bin/media/upload
- type: file/image/voice
- media: 文件内容

## 发送消息
POST /cgi-bin/message/send
- touser / toparty
- msgtype: file/image/voice
- 对应类型的 content 字段`,
  'sk-11:SKILL.md': `---
name: gen-image
description: 根据文字描述生成图片，支持多种风格和尺寸。
---

# 图片生成

根据用户描述生成图片。

## 支持的风格

- 写实照片
- 卡通插画
- 水彩画
- 油画

## 尺寸选项

- 1024x1024 (默认)
- 1792x1024 (宽屏)
- 1024x1792 (竖屏)`,
  'sk-11:agents/image-gen.yaml': `model: dall-e-3
temperature: 0.7
system_prompt: |
  你是图片生成助手。根据用户描述生成高质量图片。
  不要生成包含暴力、色情等不当内容的图片。`,
};

// =================== 技能市场 ===================
const marketplaceSkills = [
  { id: 'mk-1', name: '智能客服', author: 'OpenClaw官方', category: 'Communication', description: '基于大语言模型的智能客服对话引擎，支持多轮对话和意图识别', rating: 4.5, rating_count: 128, install_count: 2340 },
  { id: 'mk-2', name: '文档翻译', author: '社区贡献', category: 'Data', description: '支持100+语言的文档级翻译，保留原始格式', rating: 4.2, rating_count: 89, install_count: 1560 },
  { id: 'mk-3', name: '周报生成', author: 'OpenClaw官方', category: 'Automation', description: '自动汇总工作数据生成周报，支持自定义模板', rating: 4.7, rating_count: 256, install_count: 3890 },
  { id: 'mk-4', name: '合同审查', author: '法智科技', category: 'Security', description: 'AI驱动的合同条款审查，识别潜在风险点', rating: 4.3, rating_count: 67, install_count: 890 },
  { id: 'mk-5', name: 'SQL助手', author: '社区贡献', category: 'Data', description: '自然语言转SQL查询，支持多种数据库方言', rating: 4.6, rating_count: 312, install_count: 4560 },
  { id: 'mk-6', name: '数据可视化', author: 'OpenClaw官方', category: 'Analytics', description: '根据数据自动生成图表和分析报告', rating: 4.1, rating_count: 45, install_count: 670 },
  { id: 'mk-7', name: 'Jira集成', author: '社区贡献', category: 'Integration', description: '与Jira双向同步，自动创建和更新工单', rating: 3.9, rating_count: 34, install_count: 450 },
  { id: 'mk-8', name: '舆情监控', author: '观澜科技', category: 'Analytics', description: '实时监控网络舆情，自动生成分析报告', rating: 4.4, rating_count: 78, install_count: 1200 },
  { id: 'mk-9', name: '会议纪要', author: 'OpenClaw官方', category: 'Automation', description: '自动转录会议录音并生成结构化纪要', rating: 4.8, rating_count: 456, install_count: 5670 },
];

// =================== 我安装的技能 ===================
const installedSkills: any[] = [
  { id: 'inst-1', skill_id: 'sk-1', skill_name: 'kingdee-erp-query', skill_slug: 'kingdee-erp-query', description: '查询金蝶云星空 ERP 数据', version: '2.1.0', version_id: 'sv-1-1', installed_at: dayAgo(30), installed_by: 'u-1', owner_name: '张伟', scope: 'company', has_update: false, latest_version: '2.1.0' },
  { id: 'inst-2', skill_id: 'sk-4', skill_name: 'mes', skill_slug: 'mes', description: 'MES Skill 体系', version: '3.0.0', version_id: 'sv-4-2', installed_at: dayAgo(15), installed_by: 'u-1', owner_name: '张伟', scope: 'company', has_update: true, latest_version: '3.0.1' },
  { id: 'inst-3', skill_id: 'sk-5', skill_name: 'knows', skill_slug: 'knows', description: '公司内部知识库', version: '1.5.0', version_id: 'sv-5-1', installed_at: dayAgo(7), installed_by: 'u-1', owner_name: '李娜', scope: 'company', has_update: false, latest_version: '1.5.0' },
  { id: 'inst-4', skill_id: 'sk-8', skill_name: 'crm', skill_slug: 'crm', description: 'CRM 客户管理数据查询与同步', version: '1.3.0', version_id: 'sv-8-1', installed_at: dayAgo(3), installed_by: 'u-1', owner_name: '张伟', scope: 'company', has_update: false, latest_version: '1.3.0' },
  { id: 'inst-5', skill_id: 'sk-6', skill_name: 'minimax-pdf', skill_slug: 'minimax-pdf', description: 'PDF 文档生成与填写', version: '2.0.0', version_id: 'sv-6-1', installed_at: dayAgo(1), installed_by: 'u-1', owner_name: '赵敏', scope: 'company', has_update: false, latest_version: '2.0.0' },
  { id: 'inst-6', skill_id: 'sk-14', skill_name: 'sales-report', skill_slug: 'sales-report', description: '销售数据报表生成（内测版）', version: '0.1-test', version_id: null, installed_at: dayAgo(2), installed_by: 'u-1', owner_name: '张伟', scope: 'private', has_update: false, latest_version: '2.0.0', is_beta: true },
];

// =================== 通用资源定向授权（内测分享/白名单） ===================
// resource_type: skill / agent / workflow / report
// share_type: test（测试分享，作者发起，免审）/ release（发布白名单，管理员配置）
// target_type: user / role
const resourceShares: any[] = [
  { id: 'rs-1', resource_type: 'skill', resource_id: 'sk-1', resource_name: 'kingdee-erp-query', target_type: 'user', target_id: 'u-2', target_name: '李思', target_dept: '产品部', share_type: 'test', granted_by: 'u-1', granted_by_name: '张伟', created_at: dayAgo(5) },
  { id: 'rs-2', resource_type: 'skill', resource_id: 'sk-1', resource_name: 'kingdee-erp-query', target_type: 'user', target_id: 'u-4', target_name: '赵敏', target_dept: '设计部', share_type: 'test', granted_by: 'u-1', granted_by_name: '张伟', created_at: dayAgo(3) },
  { id: 'rs-3', resource_type: 'skill', resource_id: 'sk-14', resource_name: 'sales-report', target_type: 'user', target_id: 'u-3', target_name: '王五', target_dept: '技术研发部', share_type: 'test', granted_by: 'u-1', granted_by_name: '张伟', created_at: dayAgo(1) },
  { id: 'rs-4', resource_type: 'agent', resource_id: 'a-6', resource_name: '知识库问答助手', target_type: 'user', target_id: 'u-2', target_name: '李思', target_dept: '产品部', share_type: 'test', granted_by: 'u-2', granted_by_name: '李娜', created_at: dayAgo(2) },
  { id: 'rs-5', resource_type: 'workflow', resource_id: 'a-1', resource_name: 'CRM销售通知', target_type: 'user', target_id: 'u-3', target_name: '王五', target_dept: '技术研发部', share_type: 'test', granted_by: 'u-1', granted_by_name: '张伟', created_at: dayAgo(4) },
  { id: 'rs-6', resource_type: 'report', resource_id: 'rpt-1', resource_name: '2026年第20周运营周报', target_type: 'user', target_id: 'u-4', target_name: '赵敏', target_dept: '设计部', share_type: 'test', granted_by: 'u-1', granted_by_name: '张伟', created_at: dayAgo(1) },
];

// =================== 发布审核记录 ===================
const reviewRecords: any[] = [
  { id: 'rv-1', type: 'skill_publish', target_id: 'sk-10', target_name: 'wecom-send-media', applicant: 'u-3', applicant_name: '王强', applicant_dept: '技术研发部', scope: 'department', scope_dept_ids: ['dept-1'], version: '1.0.0', changelog: '首次提交发布', submitted_at: dayAgo(2), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null, auto_check: { has_skill_md: true, file_count: 3, total_size: 4500, danger_keywords: [], slug_conflict: false } },
  { id: 'rv-2', type: 'skill_publish', target_id: 'sk-11', target_name: 'gen-image', applicant: 'u-4', applicant_name: '赵敏', applicant_dept: '设计部', scope: 'company', version: '0.2.0', changelog: '', submitted_at: dayAgo(5), status: 'rejected', reviewer: 'u-admin', review_reason: '缺少 SKILL.md 中的安全声明，请补充后重新提交', reviewed_at: dayAgo(3), auto_check: { has_skill_md: false, file_count: 2, total_size: 1200, danger_keywords: [], slug_conflict: false } },
  { id: 'rv-3', type: 'skill_publish', target_id: 'sk-13', target_name: 'meeting-notes', applicant: 'u-2', applicant_name: '李娜', applicant_dept: '产品部', scope: 'company', version: '1.1.0', changelog: '新增语音转文字支持', submitted_at: dayAgo(60), status: 'approved', reviewer: 'u-admin', review_reason: null, reviewed_at: dayAgo(58), auto_check: { has_skill_md: true, file_count: 5, total_size: 8900, danger_keywords: [], slug_conflict: false } },
  { id: 'rv-4', type: 'report_publish', target_id: 'rpt-1', target_name: '2026年第20周运营周报', applicant: 'u-1', applicant_name: '张伟', applicant_dept: '技术部', scope: 'company', submitted_at: dayAgo(4), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null },
  { id: 'rv-5', type: 'agent_share', target_id: 'a-6', target_name: '知识库问答助手', applicant: 'u-2', applicant_name: '李娜', applicant_dept: '产品部', scope: 'company', submitted_at: dayAgo(1), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null },
];

// =================== 统一资源权限（resource_acl） ===================
const resourceAcls: any[] = [
  // Agent 权限
  { id: 'acl-1', resource_type: 'agent', resource_id: 'a-1', resource_name: '金蝶ERP智能查询助手', principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
  { id: 'acl-2', resource_type: 'agent', resource_id: 'a-1', resource_name: '金蝶ERP智能查询助手', principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'editor' },
  { id: 'acl-3', resource_type: 'agent', resource_id: 'a-1', resource_name: '金蝶ERP智能查询助手', principal_type: 'department', dept_id: 'dept-1', name: '技术部', member_count: 12, role: 'viewer' },
  { id: 'acl-4', resource_type: 'agent', resource_id: 'a-6', resource_name: '售后工单自动处理', principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'owner' },
  { id: 'acl-5', resource_type: 'agent', resource_id: 'a-6', resource_name: '售后工单自动处理', principal_type: 'department', dept_id: 'dept-2', name: '产品部', member_count: 8, role: 'chat_only' },
  // Skill 权限
  { id: 'acl-10', resource_type: 'skill', resource_id: 'sk-1', resource_name: 'kingdee-erp-query', principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
  { id: 'acl-11', resource_type: 'skill', resource_id: 'sk-4', resource_name: 'weekly-report-gen', principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
  { id: 'acl-12', resource_type: 'skill', resource_id: 'sk-5', resource_name: 'data-cleaning', principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'owner' },
  // 知识库权限
  { id: 'acl-20', resource_type: 'knowledge_base', resource_id: 'kb-1', resource_name: '产品技术文档库', principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'owner' },
  { id: 'acl-21', resource_type: 'knowledge_base', resource_id: 'kb-1', resource_name: '产品技术文档库', principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'admin' },
  { id: 'acl-22', resource_type: 'knowledge_base', resource_id: 'kb-1', resource_name: '产品技术文档库', principal_type: 'department', dept_id: 'dept-1', name: '技术部', member_count: 12, role: 'viewer' },
  // 报告权限
  { id: 'acl-30', resource_type: 'report', resource_id: 'rpt-1', resource_name: '公司经营周报', principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
];

// =================== 前台权限管理（角色级资源权限） ===================
const frontPermResources: any[] = [
  // 智能体
  { id: 'fp-a1', resource_type: 'agent', resource_id: 'a-1', name: '金蝶ERP智能查询助手', sub_type: 'chat', owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', status: 'active', last_used_at: dayAgo(0), use_count_30d: 328, created_at: dayAgo(120) },
  { id: 'fp-a2', resource_type: 'agent', resource_id: 'a-2', name: '售后工单自动处理', sub_type: 'workflow', owner_id: 'u-2', owner_name: '李思', owner_dept: '产品部', status: 'active', last_used_at: dayAgo(1), use_count_30d: 156, created_at: dayAgo(90) },
  { id: 'fp-a3', resource_type: 'agent', resource_id: 'a-3', name: '销售数据周报Agent', sub_type: 'workflow', owner_id: 'u-3', owner_name: '王五', owner_dept: '销售部', status: 'active', last_used_at: dayAgo(95), use_count_30d: 0, created_at: dayAgo(200) },
  { id: 'fp-a4', resource_type: 'agent', resource_id: 'a-4', name: 'HR问答助手', sub_type: 'chat', owner_id: 'u-4', owner_name: '赵六', owner_dept: '人事部', status: 'disabled', last_used_at: dayAgo(180), use_count_30d: 0, created_at: dayAgo(300) },
  // 报告
  { id: 'fp-r1', resource_type: 'report', resource_id: 'rpt-1', name: '公司经营周报', sub_type: 'public', owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', status: 'active', last_used_at: dayAgo(0), use_count_30d: 52, created_at: dayAgo(60) },
  { id: 'fp-r2', resource_type: 'report', resource_id: 'rpt-2', name: '销售月报', sub_type: 'public', owner_id: 'u-3', owner_name: '王五', owner_dept: '销售部', status: 'active', last_used_at: dayAgo(3), use_count_30d: 12, created_at: dayAgo(45) },
  { id: 'fp-r3', resource_type: 'report', resource_id: 'rpt-3', name: '个人工作日报', sub_type: 'personal', owner_id: 'u-2', owner_name: '李思', owner_dept: '产品部', status: 'active', last_used_at: dayAgo(100), use_count_30d: 0, created_at: dayAgo(150) },
  // 知识库
  { id: 'fp-k1', resource_type: 'kb', resource_id: 'kb-1', name: '产品技术文档库', sub_type: 'document', owner_id: 'u-2', owner_name: '李思', owner_dept: '产品部', status: 'active', last_used_at: dayAgo(0), use_count_30d: 89, created_at: dayAgo(80) },
  { id: 'fp-k2', resource_type: 'kb', resource_id: 'kb-2', name: '制度规范库', sub_type: 'faq', owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', status: 'active', last_used_at: dayAgo(5), use_count_30d: 34, created_at: dayAgo(100) },
  { id: 'fp-k3', resource_type: 'kb', resource_id: 'kb-3', name: '项目资料库', sub_type: 'document', owner_id: 'u-3', owner_name: '王五', owner_dept: '销售部', status: 'disabled', last_used_at: dayAgo(200), use_count_30d: 0, created_at: dayAgo(250) },
  // 技能
  { id: 'fp-s1', resource_type: 'skill', resource_id: 'sk-1', name: 'kingdee-erp-query', sub_type: 'v2.1.0', owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', status: 'published', last_used_at: dayAgo(0), use_count_30d: 210, created_at: dayAgo(90) },
  { id: 'fp-s2', resource_type: 'skill', resource_id: 'sk-2', name: 'weekly-report-gen', sub_type: 'v1.3.0', owner_id: 'u-2', owner_name: '李思', owner_dept: '产品部', status: 'published', last_used_at: dayAgo(2), use_count_30d: 67, created_at: dayAgo(70) },
  { id: 'fp-s3', resource_type: 'skill', resource_id: 'sk-3', name: 'data-cleaning', sub_type: 'v0.9.0', owner_id: 'u-3', owner_name: '王五', owner_dept: '销售部', status: 'pending', last_used_at: dayAgo(110), use_count_30d: 0, created_at: dayAgo(30) },
];

// 角色级资源权限（perm: edit / view）
const frontPermRoleAcls: any[] = [
  { id: 'fpa-1', resource_type: 'agent', resource_id: 'a-1', role_id: 'role-2', role_name: '普通用户', perm: 'view' },
  { id: 'fpa-2', resource_type: 'agent', resource_id: 'a-1', role_id: 'role-3', role_name: '技术部成员', perm: 'edit' },
  { id: 'fpa-3', resource_type: 'agent', resource_id: 'a-2', role_id: 'role-2', role_name: '普通用户', perm: 'view' },
  { id: 'fpa-4', resource_type: 'report', resource_id: 'rpt-1', role_id: 'role-2', role_name: '普通用户', perm: 'view' },
  { id: 'fpa-5', resource_type: 'report', resource_id: 'rpt-1', role_id: 'role-4', role_name: '管理层', perm: 'edit' },
  { id: 'fpa-6', resource_type: 'kb', resource_id: 'kb-1', role_id: 'role-3', role_name: '技术部成员', perm: 'edit' },
  { id: 'fpa-7', resource_type: 'kb', resource_id: 'kb-1', role_id: 'role-2', role_name: '普通用户', perm: 'view' },
  { id: 'fpa-8', resource_type: 'skill', resource_id: 'sk-1', role_id: 'role-2', role_name: '普通用户', perm: 'view' },
  { id: 'fpa-9', resource_type: 'skill', resource_id: 'sk-1', role_id: 'role-3', role_name: '技术部成员', perm: 'edit' },
];

// 补充角色（现有只有 role-1 和 role-2，PRD 需要更多角色）
const extraRoles: any[] = [
  { id: 'role-3', name: '技术部成员', code: 'tech_member', sort_order: 3, status: 'active', remark: '技术部全部成员' },
  { id: 'role-4', name: '管理层', code: 'management', sort_order: 4, status: 'active', remark: '部门经理及以上' },
  { id: 'role-5', name: '销售部成员', code: 'sales_member', sort_order: 5, status: 'active', remark: '销售部全部成员' },
];
const allRoles = [...roles, ...extraRoles];

// =================== Token ===================
// 平台公共 Token 账户
const tokenAccounts: any[] = [
  { id: 'ta-1', name: '平台公共账户-DeepSeek', model_vendor: 'DeepSeek', model_name: 'DeepSeek-V3', total_quota: 10000000, used_quota: 7650000, status: 'active' },
  { id: 'ta-2', name: '平台公共账户-Qwen', model_vendor: '阿里云', model_name: 'Qwen-Max', total_quota: 5000000, used_quota: 4800000, status: 'active' },
  { id: 'ta-3', name: '平台公共账户-GPT4o', model_vendor: 'OpenAI', model_name: 'GPT-4o', total_quota: 8000000, used_quota: 2100000, status: 'active' },
];

// Token 白名单人员
const tokenWhitelist: any[] = [
  { id: 'wl-1', user_id: 'u-1', name: '张三', emp_id: 'EMP001', dept: '研发部', token_account_ids: ['ta-1', 'ta-2'], monthly_limit: 500000, monthly_used: 45000, status: 'active' },
  { id: 'wl-2', user_id: 'u-2', name: '李四', emp_id: 'EMP002', dept: '研发部', token_account_ids: ['ta-1'], monthly_limit: 300000, monthly_used: 210000, status: 'active' },
  { id: 'wl-3', user_id: 'u-3', name: '王五', emp_id: 'EMP003', dept: '产品部', token_account_ids: ['ta-3'], monthly_limit: 200000, monthly_used: 85000, status: 'active' },
  { id: 'wl-4', user_id: 'u-5', name: '孙七', emp_id: 'EMP005', dept: '运营部', token_account_ids: ['ta-2'], monthly_limit: 150000, monthly_used: 32000, status: 'active' },
];

// Agent 公共额度配置
const agentPublicQuotas: any[] = [
  // 预置一条示例，a-1 已开启公共额度
  {
    id: 'pq-1', resource_id: 'a-1', resource_name: 'CRM销售通知',
    account_id: 'ta-1', account_name: '平台公共账户-DeepSeek',
    monthly_limit: 500000, enabled_users: [
      { user_id: 'u-1', name: '张三', dept: '研发部', monthly_used: 45000 },
      { user_id: 'u-2', name: '李四', dept: '研发部', monthly_used: 210000 },
    ],
  },
];
const tokens: any[] = [
  { id: 'tk-1', name: 'CRM系统接入令牌', owner: '张伟', owner_name: '张伟', target_system: 'Salesforce', credential_type: 'api_key', status: 'active', quota_used: 8500, quota_limit: 10000, expires_at: dayAgo(-30), token_value: 'oc_tk_crm_a3f8b1c2d4e6', credential_config: { api_key: 'crm_api_key_sample_xxx', api_secret: '' } },
  { id: 'tk-2', name: 'ERP数据查询', owner: '李思', owner_name: '李思', target_system: 'SAP', credential_type: 'bearer', status: 'active', quota_used: 3200, quota_limit: 5000, expires_at: dayAgo(-60), token_value: 'oc_tk_erp_7d9f8b6c4x2k', credential_config: { bearer_token: 'erp_bearer_token_sample_yyy', issuer: 'erp.openclaw.local' } },
  { id: 'tk-3', name: '工单系统令牌', owner: '王五', owner_name: '王五', target_system: 'Zendesk', credential_type: 'oauth2', status: 'active', quota_used: 1200, quota_limit: 3000, expires_at: dayAgo(-90), token_value: 'oc_tk_zd_5c8d7e9f2j4h', credential_config: { client_id: 'zendesk_client_001', client_secret: 'zendesk_secret_masked', auth_url: 'https://zendesk.com/oauth/authorize', token_url: 'https://zendesk.com/oauth/tokens', redirect_uri: 'https://openclaw.local/oauth/callback', scope: 'read write' } },
  { id: 'tk-4', name: 'HR系统接入', owner: '赵六', owner_name: '赵六', target_system: '北森HR', credential_type: 'basic', status: 'disabled', quota_used: 0, quota_limit: 0, expires_at: dayAgo(-5), token_value: 'oc_tk_hr_6b4e8a1d3n9p', credential_config: { username: 'hr_bot', password: 'hr_basic_password_masked' } },
  { id: 'tk-5', name: '测试环境令牌', owner: '张伟', owner_name: '张伟', target_system: 'Internal API', credential_type: 'jwt', status: 'active', quota_used: 450, quota_limit: 1000, expires_at: dayAgo(2), token_value: 'oc_tk_test_8f3b2a1c9d4e', credential_config: { private_key: '-----BEGIN RSA PRIVATE KEY-----\n...sample...\n-----END RSA PRIVATE KEY-----', algorithm: 'RS256', issuer: 'openclaw.local', audience: 'test-api.openclaw.local', subject: 'test-client' } },
];

// =================== 审批 ===================
const approvals = [
  { id: 'ap-1', type: 'token_request', approval_type: '令牌申请', requester: '王五', requester_name: '王五', title: '申请Jira API访问令牌', subject: '申请Jira API访问令牌', description: '需要访问Jira API以实现工单自动同步功能', status: 'pending', created_at: ago(30) },
  { id: 'ap-2', type: 'skill_review', approval_type: '技能审核', requester: '李思', requester_name: '李思', title: '发布"周报生成"技能到市场', subject: '发布"周报生成"技能到市场', description: '申请将自定义技能发布到技能市场', status: 'pending', created_at: ago(120) },
  { id: 'ap-3', type: 'quota_increase', approval_type: '配额调整', requester: '张伟', requester_name: '张伟', title: 'CRM令牌配额提升至20000', subject: 'CRM令牌配额提升至20000', description: '业务量增长，当前配额不足', status: 'pending', created_at: ago(240) },
  { id: 'ap-4', type: 'token_request', approval_type: '令牌申请', requester: '赵六', requester_name: '赵六', title: '申请HR系统接入令牌', subject: '申请HR系统接入令牌', description: '', status: 'approved', created_at: ago(1440), resolved_at: ago(1380) },
  { id: 'ap-5', type: 'skill_review', approval_type: '技能审核', requester: '周九', requester_name: '周九', title: '发布"数据清洗"技能', subject: '发布"数据清洗"技能', description: '', status: 'rejected', created_at: ago(2880), resolved_at: ago(2760) },
];

// =================== 配额 ===================
const quotas: any[] = [
  { id: 'q-1', user_id: 'u-1', user_name: '张伟', username: 'admin', quota_type: '磁盘配额', name: '磁盘配额', quota_limit: 100, used: 63.5 },
  { id: 'q-2', user_id: 'u-2', user_name: '李思', username: 'lisi', quota_type: '磁盘配额', name: '磁盘配额', quota_limit: 50, used: 41.2 },
  { id: 'q-3', user_id: 'u-3', user_name: '王五', username: 'wangwu', quota_type: '磁盘配额', name: '磁盘配额', quota_limit: 50, used: 47.8 },
  { id: 'q-4', user_id: 'u-4', user_name: '赵六', username: 'zhaoliu', quota_type: '磁盘配额', name: '磁盘配额', quota_limit: 20, used: 5.1 },
  { id: 'q-5', user_id: 'u-6', user_name: '孙八', username: 'sunba', quota_type: '磁盘配额', name: '磁盘配额', quota_limit: 200, used: 183.6 },
];

// =================== Token 转售 ===================
// 重构：以"模型源"为售卖粒度，通道拆分（自用/转售），三种分配模式。
// 金额单位：cost_input/cost_output 为 分/1M tokens；售价 = 成本 × (1 + markup_rate/100)
// mode: priority_self 优先自用 | priority_sell 优先转售 | fixed_split 固定拆分

// 可售资源：每个模型源的转售配置
const resaleSources: any[] = [
  { source_id: 'ms-1', display_name: 'GPT-4o', provider: 'OpenAI', resale_enabled: true, mode: 'priority_self', total_channels: 8, self_channels: 5, resale_channels: 3, cost_input: 300, cost_output: 600, markup_rate: 30, status: 'active' },
  { source_id: 'ms-2', display_name: 'GPT-4o Mini', provider: 'OpenAI', resale_enabled: true, mode: 'priority_sell', total_channels: 10, self_channels: 3, resale_channels: 7, cost_input: 100, cost_output: 200, markup_rate: 40, status: 'active' },
  { source_id: 'ms-3', display_name: 'Claude 3.5 Sonnet', provider: 'Anthropic', resale_enabled: true, mode: 'fixed_split', total_channels: 6, self_channels: 3, resale_channels: 3, cost_input: 300, cost_output: 600, markup_rate: 35, status: 'active' },
  { source_id: 'ms-4', display_name: '通义千问VL', provider: '阿里云', resale_enabled: false, mode: 'priority_self', total_channels: 4, self_channels: 4, resale_channels: 0, cost_input: 120, cost_output: 240, markup_rate: 30, status: 'active' },
  { source_id: 'ms-5', display_name: 'GLM-4', provider: '智谱AI', resale_enabled: true, mode: 'fixed_split', total_channels: 5, self_channels: 2, resale_channels: 3, cost_input: 100, cost_output: 200, markup_rate: 25, status: 'active' },
];

// 客户账户（买方）：余额/信用额度/各模型源通道借用分配
const resaleBuyers: any[] = [
  { id: 'by-1', name: '深圳星辰科技', contact: 'tech@starchen.com', status: 'active', balance: 2340, credit_limit: 10000, total_consumed: 3580, month_consumed: 1260, opened_at: dayAgo(20),
    allocations: [ { source_id: 'ms-1', channels: 2, token_limit: 2000000, token_used: 860000 }, { source_id: 'ms-2', channels: 3, token_limit: 5000000, token_used: 2300000 } ] },
  { id: 'by-2', name: '杭州数据智联', contact: 'ai@datazl.cn', status: 'active', balance: 4200, credit_limit: 10000, total_consumed: 2100, month_consumed: 890, opened_at: dayAgo(35),
    allocations: [ { source_id: 'ms-3', channels: 2, token_limit: 1500000, token_used: 420000 }, { source_id: 'ms-5', channels: 2, token_limit: 3000000, token_used: 1800000 } ] },
  { id: 'by-3', name: '北京云途信息', contact: 'dev@yuntu.io', status: 'suspended', balance: 0, credit_limit: 5000, total_consumed: 480, month_consumed: 0, opened_at: dayAgo(50),
    allocations: [ { source_id: 'ms-2', channels: 1, token_limit: 1000000, token_used: 420000 } ] },
];

// 用量明细（按买方 × 模型源聚合）；cost_amount/sell_amount 单位：元
const resaleUsage: any[] = [
  { id: 'ru-01', buyer_id: 'by-1', buyer_name: '深圳星辰科技', source_id: 'ms-1', source_name: 'GPT-4o', calls: 8600, input_tokens: 120000, output_tokens: 46000, cost_amount: 636, sell_amount: 827, settle_status: 'pending', created_at: dayAgo(1) },
  { id: 'ru-02', buyer_id: 'by-1', buyer_name: '深圳星辰科技', source_id: 'ms-2', source_name: 'GPT-4o Mini', calls: 21000, input_tokens: 150000, output_tokens: 30000, cost_amount: 210, sell_amount: 294, settle_status: 'pending', created_at: dayAgo(1) },
  { id: 'ru-03', buyer_id: 'by-2', buyer_name: '杭州数据智联', source_id: 'ms-3', source_name: 'Claude 3.5 Sonnet', calls: 5200, input_tokens: 92000, output_tokens: 38000, cost_amount: 504, sell_amount: 680, settle_status: 'settled', created_at: dayAgo(2) },
  { id: 'ru-04', buyer_id: 'by-2', buyer_name: '杭州数据智联', source_id: 'ms-5', source_name: 'GLM-4', calls: 43200, input_tokens: 420000, output_tokens: 120000, cost_amount: 660, sell_amount: 825, settle_status: 'settled', created_at: dayAgo(3) },
  { id: 'ru-05', buyer_id: 'by-3', buyer_name: '北京云途信息', source_id: 'ms-2', source_name: 'GPT-4o Mini', calls: 8600, input_tokens: 48000, output_tokens: 12000, cost_amount: 72, sell_amount: 101, settle_status: 'settled', created_at: dayAgo(4) },
];

// 结算记录（单位：元）
const resaleSettlements: any[] = [
  { id: 'st-01', period: '2026-06 上半月', gross: 46800, platform_fee: 7020, net: 39780, status: 'settled', settled_at: dayAgo(1) },
  { id: 'st-02', period: '2026-05 下半月', gross: 22500, platform_fee: 3375, net: 19125, status: 'settled', settled_at: dayAgo(16) },
  { id: 'st-03', period: '2026-06 下半月', gross: 27300, platform_fee: 4095, net: 23205, status: 'pending', settled_at: null },
];

// 派生：某模型源被买方借用的通道总数
function borrowedChannels(sourceId: string) {
  let n = 0;
  resaleBuyers.forEach((b: any) => {
    (b.allocations || []).forEach((a: any) => { if (a.source_id === sourceId) n += a.channels || 0; });
  });
  return n;
}

// 派生：模型源附加运行态字段（借用通道数、可分配余量、售价）
function enrichSource(s: any) {
  const borrowed = borrowedChannels(s.source_id);
  return {
    ...s,
    borrowed_channels: borrowed,
    free_resale_channels: Math.max(0, (s.resale_channels || 0) - borrowed),
    sell_input: Math.round((s.cost_input || 0) * (1 + (s.markup_rate || 0) / 100)),
    sell_output: Math.round((s.cost_output || 0) * (1 + (s.markup_rate || 0) / 100)),
  };
}

// 派生：转售总览
function resaleOverview() {
  const activeSources = resaleSources.filter((s: any) => s.resale_enabled).length;
  const totalResaleChannels = resaleSources.reduce((n: number, s: any) => n + (s.resale_enabled ? (s.resale_channels || 0) : 0), 0);
  const usedChannels = resaleSources.reduce((n: number, s: any) => n + borrowedChannels(s.source_id), 0);
  const monthRevenue = resaleUsage.reduce((sum: number, u: any) => sum + (u.sell_amount || 0), 0);
  const monthCost = resaleUsage.reduce((sum: number, u: any) => sum + (u.cost_amount || 0), 0);
  const pendingSettle = resaleUsage.filter((u: any) => u.settle_status === 'pending').reduce((sum: number, u: any) => sum + (u.sell_amount || 0), 0);
  return {
    active_sources: activeSources,
    total_resale_channels: totalResaleChannels,
    used_channels: usedChannels,
    free_channels: Math.max(0, totalResaleChannels - usedChannels),
    buyers: resaleBuyers.length,
    active_buyers: resaleBuyers.filter((b: any) => b.status === 'active').length,
    month_revenue: monthRevenue,
    month_profit: monthRevenue - monthCost,
    pending_settle: pendingSettle,
  };
}


// =================== 调用日志 ===================
const callLogs = [
  { id: 'cl-1', created_at: ago(2), policy_name: '通用对话策略', source_name: 'GPT-4o', model_name: 'gpt-4o', caller: 'agent:a-1', client_id: 'agent-crm', input_tokens: 820, output_tokens: 420, cost: 0.0234, latency_ms: 1820, status: 'success' },
  { id: 'cl-2', created_at: ago(8), policy_name: '高性价比对话', source_name: 'GPT-4o Mini', model_name: 'gpt-4o-mini', caller: 'agent:a-5', client_id: 'agent-reminder', input_tokens: 200, output_tokens: 180, cost: 0.0089, latency_ms: 950, status: 'success' },
  { id: 'cl-3', created_at: ago(15), policy_name: '通用对话策略', source_name: 'Claude 3.5 Sonnet', model_name: 'claude-3.5-sonnet', caller: 'agent:a-2', client_id: 'agent-inspect', input_tokens: 2100, output_tokens: 1320, cost: 0.0678, latency_ms: 3200, status: 'success' },
  { id: 'cl-4', created_at: ago(32), policy_name: '视觉理解策略', source_name: '通义千问VL', model_name: 'qwen-vl-max', caller: 'agent:a-3', client_id: 'agent-camera', input_tokens: 1500, output_tokens: 0, cost: 0, latency_ms: 30000, status: 'timeout' },
  { id: 'cl-5', created_at: ago(60), policy_name: '高性价比对话', source_name: 'GLM-4', model_name: 'glm-4', caller: 'agent:a-4', client_id: 'agent-summary', input_tokens: 1200, output_tokens: 980, cost: 0.0456, latency_ms: 4100, status: 'success' },
  { id: 'cl-6', created_at: ago(90), policy_name: '向量嵌入策略', source_name: 'Embedding 3 Small', model_name: 'text-embedding-3-small', caller: 'user:u-1', client_id: 'sdk-python', input_tokens: 5200, output_tokens: 0, cost: 0.0052, latency_ms: 320, status: 'success' },
  { id: 'cl-7', created_at: ago(180), policy_name: '通用对话策略', source_name: 'GPT-4o', model_name: 'gpt-4o', caller: 'user:u-2', client_id: 'sdk-node', input_tokens: 640, output_tokens: 380, cost: 0.0189, latency_ms: 2100, status: 'success' },
  { id: 'cl-8', created_at: ago(300), policy_name: '低延迟策略', source_name: 'GPT-4o Mini', model_name: 'gpt-4o-mini', caller: 'agent:a-1', client_id: 'agent-crm', input_tokens: 420, output_tokens: 210, cost: 0.0098, latency_ms: 680, status: 'rate_limited' },
];

// =================== 成本统计 ===================
const costStats = {
  total_cost_30d: 925.79,
  cost_change_pct: 12.3,
  total_requests_30d: 24521,
  requests_change_pct: 8.5,
  avg_latency_ms: 1580,
};

// =================== 仪表盘统计 ===================
const dashboardStats = {
  // 顶部 KPI
  total_calls_today: '12,847',
  token_usage_today: '2.4M',
  model_cost_today: '1,280',
  agent_success_rate: '98.2%',
  active_users_today: 156,
  pending_approvals: 8,
  // Agent 相关
  agent_runs_today: 47,
  failed_tasks_today: 3,
  pending_matches: 5,
  pending_skill_reviews: 2,
  model_alerts: 2,
  // 系统资源
  cpu_usage: 67,
  mem_usage: 82,
  disk_usage: 45,
  api_p90: '245ms',
  success_rate: '99.7%',
  gpu_usage: '54%',
  pod_ready: '8/8',
  // 7日趋势
  token_trend: [18200, 22400, 19800, 25600, 21000, 12400, 24500],
  cost_trend: [52, 68, 61, 78, 64, 38, 72],
  call_trend: [1820, 2240, 1980, 2560, 2100, 1240, 2450],
  // 模型源健康
  model_health: [
    { name: 'GPT-4o', status: 'healthy', latency: '120ms', calls: '5,240', cost: '¥680' },
    { name: 'Claude 3.5 Sonnet', status: 'healthy', latency: '95ms', calls: '3,890', cost: '¥420' },
    { name: '通义千问 VL', status: 'degraded', latency: '340ms', calls: '1,560', cost: '¥85' },
    { name: 'DeepSeek V3', status: 'healthy', latency: '68ms', calls: '2,100', cost: '¥52' },
    { name: 'GLM-4', status: 'error', latency: 'N/A', calls: '0', cost: '¥0' },
  ],
  // 成本 TOP5
  cost_top5: [
    { name: 'GPT-4o', cost: 2680 },
    { name: 'Claude 3.5 Sonnet', cost: 1920 },
    { name: 'GPT-4o-mini', cost: 850 },
    { name: '通义千问 VL', cost: 420 },
    { name: 'DeepSeek V3', cost: 180 },
  ],
  total_cost_month: 6050,
  // 最近审计
  recent_audit: [
    { actor: '张伟', action: '执行', target: 'CRM销售通知 Agent', time: '2分钟前', outcome: 'success' },
    { actor: '李思', action: '创建', target: 'API Token #tk-12', time: '15分钟前', outcome: 'success' },
    { actor: '王五', action: '更新', target: '通义千问 VL 配置', time: '45分钟前', outcome: 'success' },
    { actor: '赵六', action: '登录', target: '管理控制台', time: '1小时前', outcome: 'success' },
    { actor: '陈七', action: '登录', target: '管理控制台', time: '2小时前', outcome: 'failure' },
  ],
  // 最近 Agent 运行
  recent_runs: [
    { agent: 'CRM销售通知', owner: '销售部', trigger: '事件触发', status: 'completed', duration: '2.3s', tokens: '1,240', cost: '¥0.12', time: '2分钟前' },
    { agent: '设备巡检Agent', owner: '售后部', trigger: '定时任务', status: 'completed', duration: '8.1s', tokens: '3,420', cost: '¥0.34', time: '15分钟前' },
    { agent: '摄像头监控#12', owner: '安保部', trigger: '定时任务', status: 'failed', duration: '30s', tokens: '0', cost: '¥0', time: '32分钟前' },
    { agent: '每日智能总结', owner: '管理员', trigger: '定时任务', status: 'completed', duration: '4.5s', tokens: '2,180', cost: '¥0.22', time: '1小时前' },
    { agent: '客户意向分析', owner: '市场部', trigger: '手动触发', status: 'completed', duration: '12.3s', tokens: '8,560', cost: '¥0.86', time: '2小时前' },
    { agent: '周报自动生成', owner: '全员', trigger: '定时任务', status: 'completed', duration: '6.8s', tokens: '4,200', cost: '¥0.42', time: '3小时前' },
  ],
};

// =================== 使用统计 ===================
const usageStats = {
  total_api_calls_30d: 24521,
  active_users: 48,
  agent_executions_30d: 3289,
  total_cost_30d: 925.79,
  avg_response_time_ms: 1580,
  active_skills: 24,
};

// =================== 审计日志 ===================
const auditLogs = [
  { id: 'al-1', created_at: ago(5), actor_name: '张伟', actor: 'admin', actor_ip: '192.168.1.100', action: 'execute', resource_type: 'agent', resource_id: 'a-1', outcome: 'success', duration_ms: 2300 },
  { id: 'al-2', created_at: ago(15), actor_name: '李思', actor: 'lisi', actor_ip: '192.168.1.101', action: 'create', resource_type: 'token', resource_id: 'tk-3', outcome: 'success', duration_ms: 150 },
  { id: 'al-3', created_at: ago(45), actor_name: '王五', actor: 'wangwu', actor_ip: '10.0.0.55', action: 'update', resource_type: 'model_source', resource_id: 'ms-4', outcome: 'success', duration_ms: 89 },
  { id: 'al-4', created_at: ago(90), actor_name: '张伟', actor: 'admin', actor_ip: '192.168.1.100', action: 'delete', resource_type: 'skill', resource_id: 'sk-old', outcome: 'success', duration_ms: 45 },
  { id: 'al-5', created_at: ago(120), actor_name: '赵六', actor: 'zhaoliu', actor_ip: '10.0.0.78', action: 'login', resource_type: 'user', resource_id: 'u-4', outcome: 'success', duration_ms: 320 },
  { id: 'al-6', created_at: ago(180), actor_name: '陈七', actor: 'chenqi', actor_ip: '10.0.0.99', action: 'login', resource_type: 'user', resource_id: 'u-5', outcome: 'failure', duration_ms: 180 },
  { id: 'al-7', created_at: ago(240), actor_name: '张伟', actor: 'admin', actor_ip: '192.168.1.100', action: 'approve', resource_type: 'approval', resource_id: 'ap-4', outcome: 'success', duration_ms: 67 },
  { id: 'al-8', created_at: ago(300), actor_name: '周九', actor: 'zhoujiu', actor_ip: '192.168.1.105', action: 'reject', resource_type: 'approval', resource_id: 'ap-5', outcome: 'success', duration_ms: 54 },
  { id: 'al-9', created_at: ago(360), actor_name: '李思', actor: 'lisi', actor_ip: '192.168.1.101', action: 'read', resource_type: 'agent', resource_id: 'a-2', outcome: 'success', duration_ms: 23 },
  { id: 'al-10', created_at: ago(420), actor_name: '王五', actor: 'wangwu', actor_ip: '10.0.0.55', action: 'execute', resource_type: 'agent', resource_id: 'a-4', outcome: 'error', duration_ms: 15000 },
];

// =================== K8s ===================
const k8sPods = [
  { name: 'oc-api-7d9f8b6c4-x2k9p', namespace: 'openclaw', status: 'Running', restarts: 0, age: '3天', cpu: '45m', memory: '128Mi', node: 'node-1' },
  { name: 'oc-api-7d9f8b6c4-m8n3q', namespace: 'openclaw', status: 'Running', restarts: 0, age: '3天', cpu: '38m', memory: '115Mi', node: 'node-2' },
  { name: 'oc-worker-5c8d7e9f2-j4h7r', namespace: 'openclaw', status: 'Running', restarts: 1, age: '5天', cpu: '120m', memory: '256Mi', node: 'node-1' },
  { name: 'oc-worker-5c8d7e9f2-k2m5p', namespace: 'openclaw', status: 'Running', restarts: 0, age: '5天', cpu: '95m', memory: '230Mi', node: 'node-2' },
  { name: 'oc-scheduler-6b4e8a1d3-n9p2r', namespace: 'openclaw', status: 'Running', restarts: 0, age: '7天', cpu: '25m', memory: '64Mi', node: 'node-1' },
  { name: 'redis-master-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14天', cpu: '15m', memory: '96Mi', node: 'node-1' },
  { name: 'postgres-primary-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14天', cpu: '80m', memory: '512Mi', node: 'node-2' },
  { name: 'postgres-replica-0', namespace: 'openclaw', status: 'Running', restarts: 0, age: '14天', cpu: '40m', memory: '384Mi', node: 'node-1' },
];

const k8sClusters: any[] = [
  {
    id: 'cl-1', name: 'openclaw-prod', label: '主生产集群', env: '生产环境',
    provider: 'Aliyun ACK', k8s_version: 'v1.24.8', kubesphere_version: 'v3.3.2',
    visibility: '对所有企业空间可见', status: 'active',
    api_rps: 21.4, api_latency_ms: 2.47, schedule_count: 8572, schedule_fail: 0,
    cpu_used: 18.02, cpu_total: 42, memory_used: 122.46, memory_total: 229.18,
    pod_used: 199, pod_total: 880, disk_used: 9.46, disk_total: 13.24,
    components: ['Kubernetes', 'KubeSphere', 'Monitoring'],
    nodes: [
      { id: 'n-1', name: 'eu-5', ip: '172.29.245.39', status: 'Ready', cpu_pct: 78, memory_pct: 65, pods: 42, role: 'worker' },
      { id: 'n-2', name: 'tsdb-245-37', ip: '172.29.245.37', status: 'Ready', cpu_pct: 64, memory_pct: 58, pods: 38, role: 'worker' },
      { id: 'n-3', name: 'tsdb-245-36', ip: '172.29.245.36', status: 'Ready', cpu_pct: 61, memory_pct: 53, pods: 35, role: 'worker' },
      { id: 'n-4', name: 'eu-1', ip: '172.29.245.23', status: 'Ready', cpu_pct: 38, memory_pct: 41, pods: 28, role: 'master' },
      { id: 'n-5', name: 'eu-3', ip: '172.29.245.35', status: 'Ready', cpu_pct: 31, memory_pct: 30, pods: 22, role: 'worker' },
    ],
  },
];

const k8sNodes = [
  { name: 'node-1', status: 'Ready', cpu_allocatable: '8', memory_allocatable: '32Gi', pods: 5 },
  { name: 'node-2', status: 'Ready', cpu_allocatable: '8', memory_allocatable: '32Gi', pods: 3 },
];

// =================== 队列 ===================
const queueStats = {
  queues: [
    { name: 'default', active: 3, waiting: 12, completed: 1456, failed: 2, delayed: 5 },
    { name: 'model-inference', active: 1, waiting: 8, completed: 892, failed: 0, delayed: 0 },
    { name: 'account-sync', active: 0, waiting: 0, completed: 234, failed: 1, delayed: 0 },
    { name: 'notifications', active: 0, waiting: 2, completed: 567, failed: 0, delayed: 3 },
  ],
  failed_tasks: [
    { id: 'ft-1', queue: 'default', job: 'send_notification', error: '连接超时', failed_at: ago(5), attempts: 3 },
    { id: 'ft-2', queue: 'default', job: 'process_webhook', error: '无效的负载格式', failed_at: ago(10), attempts: 1 },
    { id: 'ft-3', queue: 'account-sync', job: 'sync_chat_accounts', error: '频率限制超出', failed_at: ago(20), attempts: 5 },
  ],
};

// =================== 系统健康 ===================
const systemHealth = {
  status: 'healthy',
  services: {
    api: 'healthy',
    worker: 'healthy',
    scheduler: 'healthy',
    redis: 'healthy',
    postgres: 'healthy',
  },
  uptime: '14d 6h 23m',
};

const platformSn = {
  serial_no: 'OC-HW-2026-A3F8B1C2D4E6',
  hardware_fingerprint: 'sha256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
  machine_id: 'node-cn-hangzhou-prod-01',
  cpu_signature: 'Intel Xeon E5-2690 v4 @ 2.60GHz',
  bound_at: '2026-03-15T16:00:00Z',
  platform_version: 'v1.4.2',
  license_level: 'ENTERPRISE',
  max_agents: 100,
  max_users: 500,
  expires_at: '2027-03-16T00:00:00Z',
};

const remoteManagement: any = {
  enabled: true,
  last_heartbeat: '2026-06-03T20:58:00',
  uptime_hours: 720,
  endpoint: 'remote.openclaw.example.com',
  port: 8443,
  protocol: 'WSS',
  auth_token: 'rmt_8f3b2a1c9d4e6f7a8b1c2d3e4f5a6b7c8d9e0f1a',
  history: [
    { id: 'rh-1', event: 'connected', remote_ip: '203.0.113.42', time: '2026-06-03T16:00:00', duration_min: 295, reason: null },
    { id: 'rh-2', event: 'disconnected', remote_ip: '203.0.113.42', time: '2026-06-03T06:15:00', duration_min: null, reason: 'idle_timeout' },
    { id: 'rh-3', event: 'connected', remote_ip: '203.0.113.42', time: '2026-06-02T16:00:00', duration_min: 855, reason: null },
    { id: 'rh-4', event: 'connected', remote_ip: '198.51.100.10', time: '2026-06-01T17:30:00', duration_min: 480, reason: null },
    { id: 'rh-5', event: 'auth_failed', remote_ip: '192.0.2.99', time: '2026-05-31T22:22:00', duration_min: null, reason: 'invalid_token' },
  ],
};

const configBackups: any[] = [
  {
    id: 'cb-1',
    name: '2026-05-31 全量备份',
    description: '包含所有连接器、Agent、策略配置',
    storage_type: 'OSS',
    size_mb: 2.3,
    status: 'success',
    creator: '系统定时',
    created_at: '2026-05-31T11:00:00',
  },
  {
    id: 'cb-2',
    name: '2026-05-30 全量备份',
    description: '包含所有连接器、Agent、策略配置',
    storage_type: 'OSS',
    size_mb: 2.3,
    status: 'success',
    creator: '系统定时',
    created_at: '2026-05-30T11:00:00',
  },
  {
    id: 'cb-3',
    name: '手动备份 - 迁移前',
    description: '迁移前手动创建的备份',
    storage_type: 'LOCAL',
    size_mb: 2.3,
    status: 'success',
    creator: '张伟',
    created_at: '2026-05-28T22:00:00',
  },
];

// 备份规则配置
const backupRules: any[] = [
  { id: 'rule-1', name: '主配置每日备份', execution_time: '04:00', config_directory: '/etc/openclaw/configs/', retention_days: 30, retention_count: 10, enabled: true, last_run_at: '2026-07-13T04:00:00', created_at: '2026-01-15T10:00:00' },
  { id: 'rule-2', name: '数据库配置备份', execution_time: '02:30', config_directory: '/etc/openclaw/database/', retention_days: 60, retention_count: 20, enabled: true, last_run_at: '2026-07-13T02:30:00', created_at: '2026-03-20T09:00:00' },
  { id: 'rule-3', name: 'Nginx配置备份', execution_time: '03:00', config_directory: '/etc/nginx/', retention_days: 15, retention_count: 5, enabled: false, last_run_at: '2026-07-10T03:00:00', created_at: '2026-05-10T14:00:00' },
];

// 备份文件列表
const backupFiles: any[] = [
  { id: 'bf-1', filename: 'openclaw-config-20260713-040000.tar.gz', size_mb: 2.4, created_at: '2026-07-13T04:01:56', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260713-040000.tar.gz' },
  { id: 'bf-2', filename: 'openclaw-config-20260712-040000.tar.gz', size_mb: 2.4, created_at: '2026-07-12T04:01:55', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260712-040000.tar.gz' },
  { id: 'bf-3', filename: 'openclaw-config-20260711-040000.tar.gz', size_mb: 2.3, created_at: '2026-07-11T04:01:57', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260711-040000.tar.gz' },
  { id: 'bf-4', filename: 'openclaw-config-20260710-070000.tar.gz', size_mb: 2.3, created_at: '2026-07-10T07:01:57', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260710-070000.tar.gz' },
  { id: 'bf-5', filename: 'openclaw-config-20260130-040000.tar.gz', size_mb: 2.1, created_at: '2026-01-30T04:00:22', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260130-040000.tar.gz' },
  { id: 'bf-6', filename: 'openclaw-config-20260129-040000.tar.gz', size_mb: 2.1, created_at: '2026-01-29T04:00:24', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260129-040000.tar.gz' },
  { id: 'bf-7', filename: 'openclaw-config-20260128-040000.tar.gz', size_mb: 2.0, created_at: '2026-01-28T04:00:25', source_rule_id: 'rule-1', storage_path: '/data/backups/openclaw-config-20260128-040000.tar.gz' },
];

// 备份记录
const backupRecords: any[] = [
  { id: 'br-1', task_name: 'mysql-backup-29492400', status: 'success', started_at: '2026-01-28T04:00:00', finished_at: '2026-01-28T04:00:25' },
  { id: 'br-2', task_name: 'mysql-backup-29493840', status: 'success', started_at: '2026-01-29T04:00:00', finished_at: '2026-01-29T04:00:24' },
  { id: 'br-3', task_name: 'mysql-backup-29495280', status: 'success', started_at: '2026-01-30T04:00:00', finished_at: '2026-01-30T04:00:22' },
  { id: 'br-4', task_name: 'mysql-backup-all-29728740', status: 'success', started_at: '2026-07-11T07:00:00', finished_at: '2026-07-11T07:01:57' },
  { id: 'br-5', task_name: 'mysql-backup-all-29730180', status: 'success', started_at: '2026-07-12T07:00:00', finished_at: '2026-07-12T07:01:55' },
  { id: 'br-6', task_name: 'mysql-backup-all-29731620', status: 'success', started_at: '2026-07-13T07:00:00', finished_at: '2026-07-13T07:01:56' },
];

const pythonPackages: any[] = [
  { id: 'pp-1', name: 'requests', description: 'HTTP library for Python', required_version: '2.32.3', installed_version: '2.32.3', status: 'up_to_date', module: 'core', updated_at: '2026-05-20' },
  { id: 'pp-2', name: 'pydantic', description: 'Data validation using Python type hints', required_version: '2.11.1', installed_version: '2.11.1', status: 'up_to_date', module: 'core', updated_at: '2026-05-18' },
  { id: 'pp-3', name: 'sqlalchemy', description: 'SQL toolkit and ORM', required_version: '2.0.40', installed_version: '2.0.38', status: 'outdated', module: 'core', updated_at: '2026-05-10' },
  { id: 'pp-4', name: 'celery', description: 'Distributed task queue', required_version: '5.5.2', installed_version: '5.5.2', status: 'up_to_date', module: 'worker', updated_at: '2026-05-15' },
  { id: 'pp-5', name: 'redis', description: 'Redis client', required_version: '5.3.0', installed_version: '5.3.0', status: 'up_to_date', module: 'worker', updated_at: '2026-05-12' },
  { id: 'pp-6', name: 'openai', description: 'OpenAI API client', required_version: '1.82.0', installed_version: '1.78.0', status: 'outdated', module: 'agent-runtime', updated_at: '2026-04-28' },
  { id: 'pp-7', name: 'anthropic', description: 'Anthropic API client', required_version: '0.52.0', installed_version: '0.52.0', status: 'up_to_date', module: 'agent-runtime', updated_at: '2026-05-22' },
  { id: 'pp-8', name: 'starlark-go', description: 'Starlark interpreter bindings', required_version: '0.0.0', installed_version: '0.0.0', status: 'up_to_date', module: 'connector-engine', updated_at: '2026-03-01' },
  { id: 'pp-9', name: 'cryptography', description: 'Cryptographic recipes and primitives', required_version: '44.0.3', installed_version: '44.0.3', status: 'up_to_date', module: 'core', updated_at: '2026-05-05' },
  { id: 'pp-10', name: 'boto3', description: 'AWS SDK for Python', required_version: '1.38.30', installed_version: '1.38.30', status: 'up_to_date', module: 'backup-service', updated_at: '2026-06-11' },
  { id: 'pp-11', name: 'numpy', description: 'Fundamental package for scientific computing', required_version: '2.2.6', installed_version: '2.2.6', status: 'up_to_date', module: 'analytics', updated_at: '2026-05-08' },
  { id: 'pp-12', name: 'pillow', description: 'Python Imaging Library', required_version: '11.2.1', installed_version: null, status: 'missing', module: 'vision-skill', updated_at: null },
];

const networkAcl: any[] = [
  { id: 'na-1', target: '10.0.0.0/8', label: '内网段', direction: 'inbound', status: 'active', description: '公司内网全网段', creator: '张伟' },
  { id: 'na-2', target: '172.16.0.0/12', label: 'K8s Pod网段', direction: 'inbound', status: 'active', description: 'Kubernetes Pod CIDR', creator: '系统' },
  { id: 'na-3', target: '203.0.113.0/24', label: '远程运维网段', direction: 'inbound', status: 'active', description: '远程运维团队出口IP段', creator: '张伟' },
  { id: 'na-4', target: 'api.openai.com', label: 'OpenAI API', direction: 'outbound', status: 'active', description: '允许Agent访问OpenAI', creator: '系统' },
  { id: 'na-5', target: 'api.anthropic.com', label: 'Anthropic API', direction: 'outbound', status: 'active', description: '允许Agent访问Anthropic', creator: '系统' },
  { id: 'na-6', target: 'dashscope.aliyuncs.com', label: '通义千问', direction: 'outbound', status: 'active', description: '允许Agent访问通义千问', creator: '系统' },
  { id: 'na-7', target: 'open.bigmodel.cn', label: '智谱GLM', direction: 'outbound', status: 'active', description: '允许Agent访问GLM', creator: '系统' },
  { id: 'na-8', target: '*.company.com', label: '公司域名', direction: 'outbound', status: 'active', description: '允许访问所有公司域名', creator: '张伟' },
  { id: 'na-9', target: '192.0.2.0/24', label: '已废弃测试段', direction: 'inbound', status: 'disabled', description: '旧测试环境，已停用', creator: '陈丽' },
  { id: 'na-10', target: 'crm.salesforce.com', label: 'Salesforce CRM', direction: 'outbound', status: 'active', description: 'CRM系统API', creator: '刘芳' },
];

// =================== Pods (容器组) ===================
const podList: any[] = [
  { id: 'pod-1', name: 'open-api-core-eu-dfc5bdd74-874hv', status: 'running', status_label: '运行中', node_name: 'k8s-109', node_ip: '192.168.130.229', pod_ip: '10.233.127.186', app: 'open-api', updated_at: '2026-06-03 16:49:41' },
  { id: 'pod-2', name: 'open-api-core-au-84d67555c-ddc2s', status: 'running', status_label: '运行中', node_name: 'k8s-109', node_ip: '192.168.130.229', pod_ip: '10.233.127.176', app: 'open-api', updated_at: '2026-06-03 16:49:41' },
  { id: 'pod-3', name: 'open-api-core-6ddc67ff96-sbm6b', status: 'running', status_label: '运行中', node_name: 'k8s-109', node_ip: '192.168.130.229', pod_ip: '10.233.127.253', app: 'open-api', updated_at: '2026-06-03 16:49:41' },
  { id: 'pod-4', name: 'nginx-599b6689d9-wfhs7', status: 'running', status_label: '运行中', node_name: 'k8s-69', node_ip: '192.168.130.69', pod_ip: '10.233.91.46', app: null, updated_at: '2026-05-04 16:08:57' },
  { id: 'pod-5', name: 'docs-8b8c94f6d-lwgsw', status: 'running', status_label: '运行中', node_name: 'k8s-107', node_ip: '192.168.130.227', pod_ip: '10.233.118.176', app: null, updated_at: '2026-05-04 15:50:57' },
  { id: 'pod-6', name: 'open-api-core-dev-eu-7f45996f5f-qx5bd', status: 'running', status_label: '运行中', node_name: 'k8s-107', node_ip: '192.168.130.227', pod_ip: '10.233.118.137', app: 'open-api-dev-eu', updated_at: '2026-04-27 20:48:59' },
  { id: 'pod-7', name: 'redis-74d7bb4cf7-rrjpr', status: 'running', status_label: '运行中', node_name: 'k8s-107', node_ip: '192.168.130.227', pod_ip: '10.233.118.194', app: null, updated_at: '2026-04-27 20:48:35' },
  { id: 'pod-8', name: 'open-api-core-dev-686689748f-bxbdg', status: 'running', status_label: '运行中', node_name: 'k8s-107', node_ip: '192.168.130.227', pod_ip: '10.233.118.100', app: 'open-api-dev', updated_at: '2026-04-27 20:47:49' },
];

function genSeries(points: number, base: number, jitter: number, decimals = 0) {
  const now = new Date();
  const arr: { time: string; value: number }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 20 * 60 * 1000);
    const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
    const v = base + (Math.random() - 0.5) * jitter;
    arr.push({ time, value: Number(v.toFixed(decimals)) });
  }
  return arr;
}

function buildPodDetail(pod: any) {
  const containerName = pod.name.split('-').slice(0, 3).join('-') || 'app';
  const imagePrefix = pod.app || 'app';
  return {
    ...pod,
    cluster: 'dev',
    project: 'open-api',
    qos: 'Burstable',
    restart: 0,
    created_at: pod.updated_at,
    containers: [
      {
        name: containerName,
        image: `harbor.weiheng-tech.com/dev/${imagePrefix}/${imagePrefix}:v1.3.0-beta.1-74-g754bad0`,
        status: 'running',
        restart: 0,
        port: '9000/TCP',
        has_probe: true,
      },
    ],
    volumes: [
      {
        name: 'core-config',
        type: '配置字典',
        source_name: pod.app || 'config',
        source_type: '配置字典',
        mounts: [{ container: containerName, path: '/etc/open-api', mode: '读写' }],
      },
      {
        name: 'kube-api-access-tvddg',
        type: '-',
        mounts: [{ container: containerName, path: '/var/run/secrets/kubernetes.io/serviceaccount', mode: '只读' }],
      },
    ],
    metrics: {
      cpu: genSeries(25, 0.4, 1.2, 2),
      memory: genSeries(25, 32, 6, 0),
      egress: genSeries(25, 1.2, 0.9, 2),
      ingress: genSeries(25, 720, 280, 0),
    },
    events: [
      { id: 'ev-1', type: 'normal', reason: 'Pulling', age: '5 分钟前', source: 'kubelet', message: `Pulling image "harbor.weiheng-tech.com/dev/aging/agave-aging-ultra-hotfix-copy2-test:v2.1.0-fix24"` },
      { id: 'ev-2', type: 'normal', reason: 'Pulled', age: '5 分钟前', source: 'kubelet', message: `Successfully pulled image "harbor.weiheng-tech.com/dev/aging/agave-aging-ultra-hotfix-copy2-test:v2.1.0-fix24" in 658.566138ms` },
      { id: 'ev-3', type: 'normal', reason: 'Created', age: '5 分钟前', source: 'kubelet', message: 'Created container agave-aging-america-uyjkm1' },
      { id: 'ev-4', type: 'normal', reason: 'Started', age: '5 分钟前', source: 'kubelet', message: 'Started container agave-aging-america-uyjkm1' },
    ],
  };
}

// =================== Compose Stacks（服务重启） ===================
const monitorComposeYaml = `version: '3.8'

services:

  # ---- 指标采集 & 存储 ----------------------------------------------
  prometheus:
    image: harbor.weiheng-tech.com/library/prom/prometheus:v2.53.0
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=5d'
      - '--storage.tsdb.retention.size=10GB'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    ports:
      - "9090:9090"

  grafana:
    image: harbor.weiheng-tech.com/library/grafana/grafana:11.1.0
    container_name: grafana
    restart: unless-stopped
    depends_on:
      - prometheus
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: harbor.weiheng-tech.com/library/prom/node-exporter:v1.8.1
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"

volumes:
  prometheus_data:
  grafana_data:
`;

const openrestyComposeYaml = `version: '3.8'

services:
  openresty:
    image: harbor.weiheng-tech.com/library/openresty/openresty:1.25.3.1-alpine
    container_name: openresty
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
      - openresty_log:/var/log/nginx

volumes:
  openresty_log:
`;

const stackList: any[] = [
  {
    id: 'stack-monitor',
    name: 'monitor',
    directory: '/data/stack/monitor',
    compose_file: '/data/stack/monitor/docker-compose.yaml',
    health: 'unknown',
    health_label: '未知',
    is_platform_self: false,
    running_count: 0,
    total_count: 3,
    services: [
      { name: 'prometheus', image: 'harbor.weiheng-tech.com/library/prom/prometheus:v2.53.0', status: 'exited', status_label: '未运行', restart: 0, ports: '9090:9090', has_probe: false },
      { name: 'grafana', image: 'harbor.weiheng-tech.com/library/grafana/grafana:11.1.0', status: 'exited', status_label: '未运行', restart: 0, ports: '3000:3000', has_probe: false },
      { name: 'node-exporter', image: 'harbor.weiheng-tech.com/library/prom/node-exporter:v1.8.1', status: 'exited', status_label: '未运行', restart: 0, ports: '9100:9100', has_probe: false },
    ],
    compose_yaml: monitorComposeYaml,
  },
  {
    id: 'stack-openresty',
    name: 'openresty',
    directory: '/data/stack/openresty',
    compose_file: '/data/stack/openresty/docker-compose.yaml',
    health: 'unknown',
    health_label: '未知',
    is_platform_self: false,
    running_count: 0,
    total_count: 1,
    services: [
      { name: 'openresty', image: 'harbor.weiheng-tech.com/library/openresty/openresty:1.25.3.1-alpine', status: 'exited', status_label: '未运行', restart: 0, ports: '80:80, 443:443', has_probe: false },
    ],
    compose_yaml: openrestyComposeYaml,
  },
];

function buildStackDetail(stack: any) {
  const containers = stack.services.map((s: any) => ({
    name: s.name,
    image: s.image,
    status: s.status,
    status_label: s.status_label,
    restart: s.restart,
    port: s.ports,
    has_probe: s.has_probe,
    metrics: {
      cpu: genSeries(25, 0.35, 0.9, 2),
      memory: genSeries(25, 48, 12, 0),
      egress: genSeries(25, 0.9, 0.7, 2),
      ingress: genSeries(25, 640, 220, 0),
    },
  }));
  return { ...stack, containers };
}

// =================== Mock 用户 ===================
const mockUser = {
  id: 'u-1',
  username: 'admin',
  name: '张伟',
  role: 'admin',
  is_admin: true,
};

// =================== AGENTS.md 模板文件 ===================
export interface AgentsMdFile {
  name: string;
  description: string;
  content: string;
  updatedAt: string;
}

const agentsMdFiles: AgentsMdFile[] = [
  {
    name: 'AGENTS.md.template',
    description: 'Agent 启动入口：已安装技能、关键词路由、启动必做、认证说明、记忆与行为规范',
    updatedAt: '2026-06-09 14:32:18',
    content: `---
name: agents
description: Agent 启动入口模板
---

# AGENTS.md

## 启动时必做

1. 读取 SOUL.md、USER.md、TOOLS.md、HEARTBEAT.md（如果存在）
2. 读取 memory/ 目录下的记忆文件

## 认证说明

认证 token 统一从 /workspace/.skill-auth.json 读取 token 字段，所有 skills 共用一个 token，禁止硬编码。
每次调用前必须从 .skill-auth.json 实时读取。

## 已安装技能

| 技能 | 用途 |
| ---- | ---- |
| beisen | 北森 HR 人事系统 |
| crm | 纷享销客 CRM |
| gitlab | GitLab 代码管理 |
| mes | MES 生产制造 |
| cron | 定时任务管理 |

## 核心行为规范

- 文件读写使用 exec：cat / echo / sed，禁止使用 read/write/edit 工具
- 记忆管理：所有要记住的东西必须写文件，mental notes 不跨会话存活
- MEMORY.md 仅在私聊加载（群聊不加载，防泄露）
- 隐私红线：禁止泄露隐私数据、破坏性操作需确认、优先用 trash 而非 rm
`,
  },
  {
    name: 'MEMORY.md.template',
    description: '长期记忆文件模板：仅私聊加载，存储从日记中提炼出的重要信息',
    updatedAt: '2026-06-08 10:15:42',
    content: `# MEMORY.md

## 说明

- 此文件仅在私聊加载，群聊不加载，防泄露。
- memory/YYYY-MM-DD.md — 每日原始笔记（短期）
- MEMORY.md — 精炼的长期记忆（定期从日记中提炼）
- 心跳期间每隔几天回顾日记，更新 MEMORY.md，删除过时内容

## 重要人物

- 在此记录用户偏好、重要事件

## 项目历史

- 记录重大决策、技术选型

## 待办事项

- 未完成的跟进事项
`,
  },
  {
    name: 'SOUL.md.template',
    description: 'Agent 人格与价值观模板：定义语气、原则、边界与表达风格',
    updatedAt: '2026-06-05 09:48:11',
    content: `# SOUL.md

## 身份

你是一个严谨、高效、有判断力的工作所 Agent，服务于企业内部运营。

## 原则

1. **先读后写**：任何修改前先了解现状
2. **少即是多**：输出精准，不堆砌
3. **明确边界**：不确定时询问，不脑补
4. **泄露防护**：不泄露隐私数据与凭证

## 表达风格

- 中文优先，需要时使用英文术语
- 不使用 emoji，除非用户要求
- 结论先行，详情后附

## 不做什么

- 不会主动重构与任务无关的代码
- 不会创建不被要求的文档
- 不会重复提交同样的命令
`,
  },
  {
    name: 'USER.md.template',
    description: '用户信息与偏好模板：存储语言偏好、时区、职位、沟通习惯',
    updatedAt: '2026-06-04 16:20:55',
    content: `# USER.md

## 基本信息

- **姓名**：
- **邮箱**：
- **职位**：
- **所在部门**：

## 偏好

- **语言**：中文
- **时区**：Asia/Shanghai
- **输出风格**：简洁、结论先行
- **不要**：不要使用 emoji、不要过度问肸

## 常用词汇映射

- “那个表” → 需重点结合上下文识别是 CRM 表还是 MES 报工表
- “老地方” → share-disk 下的 产品资料 目录

## 快捷指令

- /todo：查看未完成的任务
- /digest：生成今天的工作摘要
`,
  },
];

// =================== RAG 知识库 ===================
const knowledgeBases: any[] = [
  {
    id: 'kb-1', name: '储能产品与运维', description: 'PCS、BMS、EMS、液冷系统的产品手册、告警说明、维护规程与故障案例。',
    type: 'document', tags: ['产品手册', '故障排查'], favorite: true,
    embedding_model: 'bge-m3', chunk_strategy: 'hierarchical', chunk_size: 1200, chunk_overlap: 200,
    doc_count: 428, vector_count: 8642, status: 'active', creator: '管理员', created_at: dayAgo(30),
    today_retrievals: 316, last_sync: ago(14), knowledge_graph_enabled: true,
  },
  {
    id: 'kb-2', name: '项目交付规范', description: '涵盖项目前期勘察、施工、调试、并网验收和移交的标准流程与模板。',
    type: 'document', tags: ['并网验收', '施工SOP', '模板'], favorite: false,
    embedding_model: 'bge-m3', chunk_strategy: 'hierarchical', chunk_size: 1200, chunk_overlap: 200,
    doc_count: 236, vector_count: 4310, status: 'active', creator: '管理员', created_at: dayAgo(25),
    today_retrievals: 128, last_sync: ago(60), knowledge_graph_enabled: false,
  },
  {
    id: 'kb-5', name: '售前解决方案库', description: '行业方案、典型项目、选型原则、客户需求澄清与投标技术材料。',
    type: 'document', tags: ['售前', '解决方案', '共享'], favorite: false,
    embedding_model: 'text-embedding-3-large', chunk_strategy: 'paragraph', chunk_size: 800, chunk_overlap: 100,
    doc_count: 194, vector_count: 3862, status: 'active', creator: '管理员', created_at: dayAgo(18),
    today_retrievals: 67, last_sync: ago(180),
  },
  {
    id: 'kb-6', name: '能源政策与市场规则', description: '电力市场、辅助服务、容量补偿及各省储能相关政策的自动同步资料。',
    type: 'document', tags: ['政策', 'RSS同步'], favorite: false,
    embedding_model: 'bge-m3', chunk_strategy: 'sentence', chunk_size: 300, chunk_overlap: 30,
    doc_count: 162, vector_count: 2206, status: 'active', creator: '管理员', created_at: dayAgo(12),
    today_retrievals: 45, last_sync: ago(5), pending_docs: 4,
  },
  {
    id: 'kb-9', name: '研发设计规范', description: '软硬件设计规范、接口说明、测试标准和研发流程文档。',
    type: 'document', tags: ['研发', '接口', '仅内部'], favorite: false,
    embedding_model: 'text-embedding-3-large', chunk_strategy: 'fixed', chunk_size: 500, chunk_overlap: 50,
    doc_count: 312, vector_count: 7195, status: 'active', creator: '研发总监', created_at: dayAgo(6),
    today_retrievals: 98, last_sync: ago(90),
  },
];

// =================== RAG 文档 ===================
const ragDocuments: any[] = [
  { id: 'doc-1', kb_id: 'kb-1', name: 'API设计规范v2.pdf', type: 'pdf', size: '2.3MB', chunk_count: 45, vector_count: 45, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(28) },
  { id: 'doc-2', kb_id: 'kb-1', name: '微服务架构白皮书.docx', type: 'docx', size: '1.8MB', chunk_count: 38, vector_count: 38, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(27) },
  { id: 'doc-3', kb_id: 'kb-1', name: '代码规范指南.md', type: 'markdown', size: '45KB', chunk_count: 12, vector_count: 12, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(26) },
  { id: 'doc-4', kb_id: 'kb-1', name: '数据库设计文档.pdf', type: 'pdf', size: '3.1MB', chunk_count: 0, vector_count: 0, status: 'processing', uploaded_by: '管理员', uploaded_at: ago(30) },
  { id: 'doc-5', kb_id: 'kb-1', name: '系统架构图说明.txt', type: 'text', size: '12KB', chunk_count: 8, vector_count: 8, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(20) },
  { id: 'doc-6', kb_id: 'kb-1', name: '安全规范v3.pdf', type: 'pdf', size: '1.5MB', chunk_count: 39, vector_count: 39, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(18) },
  { id: 'doc-7', kb_id: 'kb-2', name: 'OpenClaw平台PRD.docx', type: 'docx', size: '5.2MB', chunk_count: 67, vector_count: 67, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(24) },
  { id: 'doc-8', kb_id: 'kb-2', name: '智能周报需求文档.docx', type: 'docx', size: '890KB', chunk_count: 15, vector_count: 15, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(22) },
  { id: 'doc-9', kb_id: 'kb-2', name: 'RAG功能设计稿.md', type: 'markdown', size: '67KB', chunk_count: 7, vector_count: 7, status: 'completed', uploaded_by: '管理员', uploaded_at: dayAgo(10) },
  { id: 'doc-10', kb_id: 'kb-3', name: 'K8s部署手册.pdf', type: 'pdf', size: '4.2MB', chunk_count: 28, vector_count: 28, status: 'completed', uploaded_by: '运维管理员', uploaded_at: dayAgo(19) },
  { id: 'doc-11', kb_id: 'kb-3', name: '故障处理SOP.md', type: 'markdown', size: '89KB', chunk_count: 18, vector_count: 18, status: 'completed', uploaded_by: '运维管理员', uploaded_at: dayAgo(17) },
  { id: 'doc-12', kb_id: 'kb-3', name: '监控告警配置.txt', type: 'text', size: '23KB', chunk_count: 10, vector_count: 10, status: 'completed', uploaded_by: '运维管理员', uploaded_at: dayAgo(15) },
  { id: 'doc-13', kb_id: 'kb-4', name: '产品常见FAQ.pdf', type: 'pdf', size: '1.1MB', chunk_count: 52, vector_count: 52, status: 'completed', uploaded_by: '客服主管', uploaded_at: dayAgo(14) },
  { id: 'doc-14', kb_id: 'kb-4', name: '标准话术手册.docx', type: 'docx', size: '780KB', chunk_count: 63, vector_count: 63, status: 'completed', uploaded_by: '客服主管', uploaded_at: dayAgo(12) },
  { id: 'doc-15', kb_id: 'kb-4', name: '退换货政策.md', type: 'markdown', size: '34KB', chunk_count: 22, vector_count: 22, status: 'completed', uploaded_by: '客服主管', uploaded_at: dayAgo(8) },
  { id: 'doc-16', kb_id: 'kb-4', name: '投诉处理流程.pdf', type: 'pdf', size: '920KB', chunk_count: 41, vector_count: 0, status: 'failed', uploaded_by: '客服主管', uploaded_at: dayAgo(3) },
];

// 文档分块样例
const docChunks: any[] = [
  { id: 'chk-1', doc_id: 'doc-1', kb_id: 'kb-1', chunk_index: 0, content: '## API设计原则\n\n1. RESTful风格：所有API遵循REST架构风格，使用HTTP动词语义化操作资源。\n2. 统一响应格式：所有接口返回统一JSON结构，包含code、message、data三个字段。\n3. 版本管理：API路径以/v1/开头，重大变更时升级版本号。\n4. 分页规范：列表接口统一使用page和page_size参数，返回total和total_pages。', token_count: 128, score: 0 },
  { id: 'chk-2', doc_id: 'doc-1', kb_id: 'kb-1', chunk_index: 1, content: '## 认证与授权\n\n所有API需携带Bearer Token进行认证。Token通过登录接口获取，有效期2小时。权限校验基于RBAC模型，用户通过角色关联权限点。管理接口需admin角色，普通接口需user角色。', token_count: 96, score: 0 },
  { id: 'chk-3', doc_id: 'doc-1', kb_id: 'kb-1', chunk_index: 2, content: '## 错误码定义\n\n- 200: 成功\n- 400: 请求参数错误\n- 401: 未认证或Token过期\n- 403: 无权限访问\n- 404: 资源不存在\n- 409: 资源冲突\n- 429: 请求频率超限\n- 500: 服务器内部错误', token_count: 72, score: 0 },
  { id: 'chk-4', doc_id: 'doc-2', kb_id: 'kb-1', chunk_index: 0, content: '## 微服务拆分原则\n\n1. 单一职责：每个服务只负责一个业务领域。\n2. 独立部署：服务可独立构建、部署、扩展。\n3. 数据隔离：每个服务拥有独立数据库，通过API通信。\n4. 容错设计：使用熔断器模式，避免级联故障。\n5. 服务发现：通过注册中心实现服务自动发现和负载均衡。', token_count: 115, score: 0 },
  { id: 'chk-5', doc_id: 'doc-3', kb_id: 'kb-1', chunk_index: 0, content: '## 代码规范\n\n- 命名：变量用驼峰，常量用大写下划线，类型用帕斯卡\n- 注释：公开API必须有文档注释，复杂逻辑需行内注释\n- 错误处理：不可忽略error返回值，必须显式处理\n- 测试：核心逻辑单元测试覆盖率不低于80%', token_count: 98, score: 0 },
];

// =================== KB FAQ 条目 ===================
const kbFaqItems: any[] = [
  { id: 'faq-1', kb_id: 'kb-1', question: '储能系统出现电池簇压差过大告警时，应该如何处理？', answer: '先核对告警发生时的 SOC、温度和单体电压数据，再检查采样线束及均衡状态。若压差持续扩大，应按停机流程隔离对应电池簇并联系技术支持。', status: 'published', tags: ['高频问题'], created_at: dayAgo(10) },
  { id: 'faq-2', kb_id: 'kb-1', question: '液冷机组入口温度超过阈值，会对系统产生什么影响？', answer: '入口温度过高会降低电芯散热能力，触发降功率运行，极端情况下可能引发系统保护停机。应依次检查冷却液液位、泵运行状态、过滤器和换热环境。', status: 'published', tags: ['液冷系统'], created_at: dayAgo(8) },
  { id: 'faq-3', kb_id: 'kb-1', question: 'EMS 远程升级前需要确认哪些条件？', answer: '需确认站端通信稳定、配置已备份、设备处于允许升级状态，同时准备对应版本的回退包和升级窗口。', status: 'pending', tags: ['软件升级'], created_at: dayAgo(5) },
];

// =================== KB 检索分析 ===================
const kbAnalytics: Record<string, any> = {
  'kb-1': {
    metrics: { monthly_retrievals: 8931, avg_latency_ms: 420, hit_rate: 96.2, no_match_rate: 3.8 },
    topics: [
      { topic: 'PCS 告警代码', count: 1826, hit_rate: 96.4, suggestion: '充足' },
      { topic: '液冷系统维护', count: 1104, hit_rate: 91.8, suggestion: '充足' },
      { topic: '海外认证要求', count: 438, hit_rate: 64.2, suggestion: '建议补充' },
      { topic: 'BMS 巡检流程', count: 312, hit_rate: 88.5, suggestion: '充足' },
    ],
  },
};

// =================== 文档详情（解析时间线 + 自动生成问题） ===================
const docDetailData: Record<string, any> = {
  'doc-1': {
    title: 'API设计规范v2.pdf',
    content_sections: [
      { heading: '4.2 日常巡检要求', body: '运维人员应根据站点运行环境和设备负荷制定巡检计划。常规巡检至少包括系统运行状态、关键温度、绝缘状态、消防系统、液冷回路以及通信状态。' },
      { heading: '4.3 告警处置原则', body: '告警处置应遵循"确认影响范围、保存现场数据、按级别隔离、完成原因闭环"的顺序。禁止在未确认系统状态前直接清除告警或强制复位。' },
    ],
    chunks_with_content: [
      { id: 'chk-d1-1', chunk_index: 87, relevance: 0.92, content: '检查液冷机组运行状态，确认供液温度、回液温度、压力及流量处于规定范围。观察管路接头、阀门及换热器是否存在渗漏，检查膨胀罐液位是否正常。当入口温度连续 10 分钟高于 30℃ 时，应检查外部换热条件、过滤器堵塞情况和循环泵工作状态。' },
      { id: 'chk-d1-2', chunk_index: 94, relevance: 0.89, content: '出现电池簇压差过大告警时，应首先核对告警发生时刻的 SOC、最高及最低单体电压、温度和电流数据。检查采样线束连接和均衡状态。若静置后压差仍超过设定阈值，应停止对应簇充放电并联系技术支持评估。' },
      { id: 'chk-d1-3', chunk_index: 101, relevance: 0.84, content: '软件升级前必须完成当前配置、策略参数和关键运行数据的备份。升级期间保持辅助电源稳定，不得执行其他远程控制操作。升级结束后应核对版本、参数和通信状态，并保留回退包至少 90 天。' },
    ],
    timeline: [
      { step: '文件接收与安全检查', status: 'done', detail: '完成 · 0.4 秒' },
      { step: 'PDF 结构解析', status: 'done', detail: '识别 126 页、38 张图片 · 18.6 秒' },
      { step: '自适应父子分块', status: 'done', detail: '生成 386 个文本分块 · 2.1 秒' },
      { step: '多模态图片描述', status: 'done', detail: '完成 32/38，6 张已跳过 · 42.8 秒' },
      { step: 'Embedding 与索引', status: 'processing', detail: '已完成 302/386 · 正在处理' },
    ],
    parse_config: { engine: 'DocReader Auto', chunk_strategy: '父子分块 1200/400', embedding: 'BGE-M3 · 1024 维' },
    auto_questions: [
      { question: '液冷机组入口温度过高时如何排查？', chunk_ref: 'Chunk 087' },
      { question: '电池簇压差过大告警怎么处理？', chunk_ref: 'Chunk 094' },
      { question: 'EMS 升级前需要备份哪些内容？', chunk_ref: 'Chunk 101' },
    ],
    meta: { version: 'V2.3', publish_date: '2026-05-18', pages: 126, total_chunks: 386 },
  },
};

// =================== Wiki 数据 ===================
const wikiData: Record<string, any> = {
  'kb-1': {
    tree: [
      { id: 'w-1', label: '系统概览', level: 0, children: ['w-2', 'w-3'] },
      { id: 'w-2', label: '系统组成', level: 1 },
      { id: 'w-3', label: '安全边界', level: 1 },
      { id: 'w-4', label: '项目交付', level: 0, children: ['w-5', 'w-6', 'w-7', 'w-8'] },
      { id: 'w-5', label: '前期勘察', level: 1 },
      { id: 'w-6', label: '施工安装', level: 1 },
      { id: 'w-7', label: '系统调试', level: 1 },
      { id: 'w-8', label: '并网验收', level: 1 },
      { id: 'w-9', label: '运行与维护', level: 0 },
      { id: 'w-10', label: '故障处理', level: 0 },
      { id: 'w-11', label: '附录与模板', level: 0 },
    ],
    content: {
      title: '液冷储能系统交付与运维概览',
      badges: ['自动生成', '12 条可靠引用', '更新于 2 小时前'],
      intro: '本页面汇总液冷储能系统从项目勘察、设备安装、系统调试到并网验收和运行维护的关键知识。内容来源于企业内部产品手册、交付规范和现场案例，并保留可追溯引用。',
      sections: [
        { heading: '系统组成', body: '典型储能系统由电池系统、功率变换系统、能量管理系统、液冷系统、消防系统和站级监控组成。各子系统通过统一通信协议交换运行状态、告警和控制指令。', items: ['电池系统：由电芯、模组、电池簇、BMS 与高压箱构成。', 'PCS：负责直流与交流之间的双向能量转换。', 'EMS：执行功率调度、运行策略和站级协调控制。', '温控与消防：维持设备运行环境并提供安全保护。'] },
        { heading: '安全边界', body: '所有交付和运维活动均应以设备安全状态为前提。涉及高压回路、消防联动、软件升级和保护参数修改的操作，必须经过授权并保留完整记录。', citations: ['运维手册 V2.3', '并网调试规范 V4.0', '现场安全操作规程'] },
      ],
    },
    graph_nodes: [
      { id: 'g-main', label: '液冷储能系统', is_main: true },
      { id: 'g-1', label: '电池系统' }, { id: 'g-2', label: 'PCS' },
      { id: 'g-3', label: '液冷系统' }, { id: 'g-4', label: 'EMS' },
      { id: 'g-5', label: '消防系统' }, { id: 'g-6', label: '并网验收' },
    ],
  },
};

// =================== 工作空间 ===================
const workspaceMembers: any[] = [
  { id: 'wm-1', name: 'Ryan Zhang', email: 'ryan.zhang@whes.com', avatar: 'RZ', role: 'Owner', department: 'AI 平台', last_active: '在线', status: 'active' },
  { id: 'wm-2', name: '李静', email: 'li.jing@whes.com', avatar: 'LJ', role: 'Admin', department: '售后运维', last_active: '12 分钟前', status: 'active' },
  { id: 'wm-3', name: '王宇', email: 'wang.yu@whes.com', avatar: 'WY', role: 'Contributor', department: '项目交付', last_active: '1 小时前', status: 'active' },
  { id: 'wm-4', name: '陈楠', email: 'chen.nan@whes.com', avatar: 'CN', role: 'Contributor', department: '市场与售前', last_active: '昨天', status: 'active' },
  { id: 'wm-5', name: '周鑫', email: 'zhou.xin@whes.com', avatar: 'ZX', role: 'Viewer', department: '财务', last_active: '5 天前', status: 'invited' },
];

const workspaceOrgs: any[] = [
  { id: 'wo-1', name: '市场与售前中心', icon: '售', permission: 'editable', description: '共享售前方案库、政策研究助手和典型项目案例。', member_count: 18, resource_count: 7 },
  { id: 'wo-2', name: '全球售后运维', icon: '运', permission: 'admin', description: '共享产品运维知识、故障案例和储能运维专家。', member_count: 36, resource_count: 12 },
  { id: 'wo-3', name: '项目交付中心', icon: '交', permission: 'readonly', description: '交付规范、Wiki、项目模板与区域验收资料。', member_count: 22, resource_count: 9 },
];

const workspaceApiKeys: any[] = [
  { id: 'wak-1', name: 'Codex 知识检索', prefix: 'sk-wn-8a2…', scope: 'retrieve', kb_scope: '3 个知识库', last_used: '刚刚', status: 'active' },
  { id: 'wak-2', name: '文档同步服务', prefix: 'sk-wn-4f9…', scope: 'ingest', kb_scope: '项目交付规范', last_used: '14 分钟前', status: 'active' },
  { id: 'wak-3', name: '历史测试脚本', prefix: 'sk-wn-19c…', scope: 'full_access', kb_scope: '全部', last_used: '92 天前', status: 'disabled' },
];

const workspaceAuditLogs: any[] = [
  { id: 'wal-1', avatar: 'LJ', operator: '李静', action_type: 'kb_perm', target: '储能产品与运维', detail: '将王宇的角色从可编辑改为仅查看', ip: '10.23.18.16', created_at: '2026-07-10 14:32:18' },
  { id: 'wal-2', avatar: 'WY', operator: '王宇', action_type: 'doc_upload', target: '项目交付规范库', detail: '批量上传 14 份项目文档，解析完成 12 份', ip: '10.23.21.44', created_at: '2026-07-10 13:15:07' },
  { id: 'wal-3', avatar: 'RZ', operator: 'Ryan Zhang', action_type: 'kb_create', target: '售后标准问答库', detail: '创建知识库，配置 bge-m3 向量模型', ip: '10.23.12.8', created_at: '2026-07-09 16:42:33' },
  { id: 'wal-4', avatar: 'CN', operator: '陈楠', action_type: 'faq_create', target: '售后标准问答库', detail: '创建 FAQ「如何处理客户投诉」', ip: '10.23.15.22', created_at: '2026-07-09 11:20:05' },
  { id: 'wal-5', avatar: 'LJ', operator: '李静', action_type: 'doc_delete', target: '储能产品与运维', detail: '删除文档 old_manual_v1.pdf（3 个分块）', ip: '10.23.18.16', created_at: '2026-07-09 09:15:41' },
  { id: 'wal-6', avatar: 'SYS', operator: '系统', action_type: 'doc_parse', target: '能源政策与市场规则', detail: 'RSS 自动同步完成，新增 28 篇，更新 9 篇', ip: '127.0.0.1', created_at: '2026-07-09 03:00:00' },
  { id: 'wal-7', avatar: 'WY', operator: '王宇', action_type: 'kb_update', target: '项目交付规范库', detail: '修改知识库描述与标签', ip: '10.23.21.44', created_at: '2026-07-08 17:30:22' },
  { id: 'wal-8', avatar: 'RZ', operator: 'Ryan Zhang', action_type: 'setting_change', target: '储能产品与运维', detail: '开启 FAQ 自动生成，每文档生成 5 条', ip: '10.23.12.8', created_at: '2026-07-08 14:10:55' },
  { id: 'wal-9', avatar: 'CN', operator: '陈楠', action_type: 'chat_query', target: '售后标准问答库', detail: '发起知识库问答：「退货流程是什么」', ip: '10.23.15.22', created_at: '2026-07-08 10:05:18' },
  { id: 'wal-10', avatar: 'LJ', operator: '李静', action_type: 'wiki_edit', target: '项目交付规范库', detail: '编辑 Wiki 页面「并网验收流程」', ip: '10.23.18.16', created_at: '2026-07-07 16:45:30' },
  { id: 'wal-11', avatar: 'WY', operator: '王宇', action_type: 'faq_update', target: '售后标准问答库', detail: '编辑 FAQ「如何处理客户投诉」，更新标准口径', ip: '10.23.21.44', created_at: '2026-07-07 11:22:08' },
  { id: 'wal-12', avatar: 'RZ', operator: 'Ryan Zhang', action_type: 'kb_delete', target: '临时测试库', detail: '删除知识库及其全部 23 个文档', ip: '10.23.12.8', created_at: '2026-07-06 09:30:15' },
];

// =================== AI 对话 ===================
const chatSessions: any[] = [
  { id: 'cs-1', title: '关于API设计规范的讨论', mode: 'rag', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: 'kb-1', kb_name: '技术研发知识库', agent_id: '', agent_name: '', message_count: 6, last_message_at: ago(60), created_at: dayAgo(1) },
  { id: 'cs-2', title: '微服务架构选型咨询', mode: 'rag', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: 'kb-1', kb_name: '技术研发知识库', agent_id: '', agent_name: '', message_count: 4, last_message_at: ago(180), created_at: dayAgo(1) },
  { id: 'cs-3', title: 'K8s部署问题排查', mode: 'rag', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: 'kb-3', kb_name: '运维手册库', agent_id: '', agent_name: '', message_count: 8, last_message_at: ago(300), created_at: dayAgo(2) },
  { id: 'cs-4', title: '客服话术优化建议', mode: 'rag', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: 'kb-4', kb_name: '客服FAQ库', agent_id: '', agent_name: '', message_count: 3, last_message_at: ago(720), created_at: dayAgo(3) },
  { id: 'cs-5', title: '产品需求讨论', mode: 'rag', model_policy_id: 'mp-2', model_policy: '高性价比对话', kb_id: 'kb-2', kb_name: '产品文档库', agent_id: '', agent_name: '', message_count: 5, last_message_at: ago(1440), created_at: dayAgo(4) },
  { id: 'cs-6', title: '闲聊', mode: 'chat', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: '', kb_name: '', agent_id: '', agent_name: '', message_count: 2, last_message_at: ago(2880), created_at: dayAgo(5) },
  { id: 'cs-7', title: 'CRM销售助手对话', mode: 'agent', model_policy_id: 'mp-1', model_policy: '通用对话策略', kb_id: '', kb_name: '', agent_id: 'a-1', agent_name: 'CRM销售通知', message_count: 4, last_message_at: ago(45), created_at: dayAgo(1) },
];

const chatMessages: Record<string, any[]> = {
  'cs-1': [
    { id: 'msg-1', role: 'user', content: 'API设计中如何处理分页？', created_at: ago(120) },
    { id: 'msg-2', role: 'assistant', content: '根据知识库中的API设计规范，分页应统一使用 `page` 和 `page_size` 参数，返回结果包含 `total` 和 `total_pages` 字段。\n\n**示例请求：**\n```\nGET /api/v1/users?page=1&page_size=20\n```\n\n**响应格式：**\n```json\n{\n  "code": 200,\n  "data": [...],\n  "pagination": {\n    "page": 1,\n    "page_size": 20,\n    "total": 156,\n    "total_pages": 8\n  }\n}\n```\n\n默认 `page_size` 建议设为20，最大不超过100。', created_at: ago(119), sources: [
      { doc_name: 'API设计规范v2.pdf', chunk_index: 0, score: 0.94, content: '## API设计原则\n\n1. RESTful风格：所有API遵循REST架构风格...\n4. 分页规范：列表接口统一使用page和page_size参数，返回total和total_pages。' },
      { doc_name: 'API设计规范v2.pdf', chunk_index: 2, score: 0.72, content: '## 错误码定义\n\n- 200: 成功\n- 400: 请求参数错误...' },
    ] },
    { id: 'msg-3', role: 'user', content: '错误码有哪些规范？', created_at: ago(90) },
    { id: 'msg-4', role: 'assistant', content: '根据API设计规范，错误码定义如下：\n\n| 状态码 | 含义 |\n|--------|------|\n| 200 | 成功 |\n| 400 | 请求参数错误 |\n| 401 | 未认证或Token过期 |\n| 403 | 无权限访问 |\n| 404 | 资源不存在 |\n| 409 | 资源冲突 |\n| 429 | 请求频率超限 |\n| 500 | 服务器内部错误 |\n\n所有错误响应应附带 `message` 字段描述具体错误原因，便于前端处理和用户理解。', created_at: ago(89), sources: [
      { doc_name: 'API设计规范v2.pdf', chunk_index: 2, score: 0.97, content: '## 错误码定义\n\n- 200: 成功\n- 400: 请求参数错误\n- 401: 未认证或Token过期\n- 403: 无权限访问\n- 404: 资源不存在...' },
    ] },
    { id: 'msg-5', role: 'user', content: '认证机制是怎样的？', created_at: ago(62) },
    { id: 'msg-6', role: 'assistant', content: '根据API设计规范文档：\n\n1. **认证方式**：Bearer Token，所有API需在Header中携带 `Authorization: Bearer <token>`\n2. **Token获取**：通过登录接口 `/auth/login` 获取\n3. **有效期**：Token有效期2小时，可通过刷新接口续期\n4. **权限模型**：基于RBAC，用户通过角色关联权限点\n5. **角色要求**：管理接口需 `admin` 角色，普通接口需 `user` 角色', created_at: ago(61), sources: [
      { doc_name: 'API设计规范v2.pdf', chunk_index: 1, score: 0.96, content: '## 认证与授权\n\n所有API需携带Bearer Token进行认证。Token通过登录接口获取，有效期2小时。权限校验基于RBAC模型...' },
    ] },
  ],
  'cs-2': [
    { id: 'msg-7', role: 'user', content: '微服务拆分有哪些原则？', created_at: ago(240) },
    { id: 'msg-8', role: 'assistant', content: '根据微服务架构白皮书，拆分原则包括：\n\n1. **单一职责**：每个服务只负责一个业务领域\n2. **独立部署**：服务可独立构建、部署、扩展\n3. **数据隔离**：每个服务拥有独立数据库，通过API通信\n4. **容错设计**：使用熔断器模式，避免级联故障\n5. **服务发现**：通过注册中心实现自动发现和负载均衡', created_at: ago(239), sources: [
      { doc_name: '微服务架构白皮书.pdf', chunk_index: 0, score: 0.95, content: '## 微服务拆分原则\n\n1. 单一职责：每个服务只负责一个业务领域。\n2. 独立部署：服务可独立构建、部署、扩展...' },
    ] },
    { id: 'msg-9', role: 'user', content: '服务间通信用什么方式？', created_at: ago(200) },
    { id: 'msg-10', role: 'assistant', content: '服务间通信主要有两种方式：\n\n**同步通信**：\n- REST API（适合简单查询）\n- gRPC（适合高性能场景，支持流式）\n\n**异步通信**：\n- 消息队列（Kafka/RabbitMQ，适合解耦和削峰）\n- 事件总线（适合领域事件驱动）\n\n建议根据场景选择：查询类用同步，通知/审计类用异步。', created_at: ago(199), sources: [
      { doc_name: '微服务架构白皮书.pdf', chunk_index: 3, score: 0.91, content: '## 服务间通信\n\n同步方式：REST API、gRPC\n异步方式：消息队列（Kafka/RabbitMQ）、事件总线' },
    ] },
  ],
  'cs-3': [
    { id: 'msg-11', role: 'user', content: 'Pod一直CrashLoopBackOff怎么办？', created_at: ago(360) },
    { id: 'msg-12', role: 'assistant', content: '根据运维手册，排查CrashLoopBackOff的步骤：\n\n1. **查看Pod日志**：\n```bash\nkubectl logs <pod-name> --previous\n```\n\n2. **检查事件**：\n```bash\nkubectl describe pod <pod-name>\n```\n\n3. **常见原因**：\n- 容器启动命令错误\n- 配置文件或环境变量缺失\n- 资源限制不足（OOMKilled）\n- 健康检查配置不当\n- 镜像拉取失败\n\n4. **处理建议**：\n- 修正启动命令和参数\n- 确认ConfigMap/Secret已正确挂载\n- 调整resources.requests/limits\n- 检查livenessProbe配置', created_at: ago(359), sources: [
      { doc_name: 'K8s运维排障指南.md', chunk_index: 5, score: 0.93, content: '## CrashLoopBackOff排查\n\n常见原因：容器启动命令错误、配置文件缺失、OOMKilled、健康检查不当...' },
    ] },
    { id: 'msg-13', role: 'user', content: '如何查看资源使用情况？', created_at: ago(330) },
    { id: 'msg-14', role: 'assistant', content: '可以使用以下命令查看资源使用：\n\n```bash\n# 节点资源\nkubectl top nodes\n\n# Pod资源\nkubectl top pods --all-namespaces\n\n# 详细描述\nkubectl describe node <node-name>\n```\n\n也可以通过 `kubectl get pods -o wide` 查看Pod分布，结合监控面板（如Prometheus + Grafana）进行长期资源分析。', created_at: ago(329), sources: [
      { doc_name: 'K8s运维排障指南.md', chunk_index: 2, score: 0.88, content: '## 资源监控\n\nkubectl top nodes / kubectl top pods --all-namespaces...' },
    ] },
  ],
  'cs-4': [
    { id: 'msg-15', role: 'user', content: '客户投诉产品不好用怎么回复？', created_at: ago(780) },
    { id: 'msg-16', role: 'assistant', content: '根据客服FAQ库的标准话术：\n\n**回复模板：**\n非常抱歉给您带来了不好的体验，感谢您的反馈。我们非常重视您的意见，已经记录并反馈给产品团队。请问具体是哪个功能使用不便呢？我们可以为您提供详细的操作指导，或者帮您反馈给技术团队优化。\n\n**注意事项：**\n1. 先表达歉意和理解\n2. 引导客户描述具体问题\n3. 提供即时解决方案\n4. 承诺反馈和跟进', created_at: ago(779), sources: [
      { doc_name: '客服标准话术集.docx', chunk_index: 8, score: 0.92, content: '## 投诉处理话术\n\n模板：非常抱歉给您带来了不好的体验...' },
    ] },
  ],
  'cs-5': [
    { id: 'msg-17', role: 'user', content: '周报中心的需求是什么？', created_at: ago(1500) },
    { id: 'msg-18', role: 'assistant', content: '根据智能周报需求文档：\n\n**核心需求：**\n1. 各部门有自己的Agent负责生成周报\n2. 周报数据有存放位置\n3. 周报分权限，按部门隔离\n4. AI自动生成周报内容\n5. 每周有运营汇总周报（跨部门聚合）\n\n**技术方案：**\n- 配置中绑定Agent ID\n- Agent工作流负责数据拉取→AI分析→周报保存\n- 支持手动触发和定时触发\n- 非管理员只能查看本部门周报', created_at: ago(1499), sources: [
      { doc_name: '智能周报需求PRD.pdf', chunk_index: 0, score: 0.96, content: '## 智能周报核心需求\n\n1. 各部门有自己的Agent负责生成周报\n2. 周报数据有存放位置...' },
    ] },
  ],
  'cs-6': [
    { id: 'msg-19', role: 'user', content: '你好', created_at: ago(2900) },
    { id: 'msg-20', role: 'assistant', content: '你好！我是OpenClaw AI助手，有什么可以帮您的吗？\n\n我可以帮您：\n- 基于知识库进行文档问答（RAG增强）\n- 与智能体对话完成复杂任务\n- 回答技术问题\n- 协助分析和生成文档内容\n\n请随时提问！', created_at: ago(2899) },
  ],
  'cs-7': [
    { id: 'msg-21', role: 'user', content: '最近有什么新的销售线索？', created_at: ago(50) },
    { id: 'msg-22', role: 'assistant', content: '通过CRM系统查询，最近24小时有以下新销售线索：\n\n1. **华为技术有限公司** - AI平台采购意向，预估金额 ¥500万\n   - 联系人：张经理\n   - 阶段：初步接洽\n\n2. **中国移动** - 智能客服项目POC，预估金额 ¥200万\n   - 联系人：李总监\n   - 阶段：方案评估\n\n3. **比亚迪** - 生产质检AI方案，预估金额 ¥150万\n   - 联系人：王工\n   - 阶段：需求确认', created_at: ago(49), agent_action: { type: 'call_skill', skill_name: 'CRM数据同步', status: 'completed', duration_ms: 1200 } },
    { id: 'msg-23', role: 'user', content: '帮我给华为的张经理发一封跟进邮件', created_at: ago(30) },
    { id: 'msg-24', role: 'assistant', content: '已为您草拟跟进邮件并通过企业微信发送：\n\n---\n**收件人**：张经理（华为技术有限公司）\n**主题**：OpenClaw AI平台合作方案跟进\n\n张经理您好，\n\n感谢贵司对我们AI平台的关注。针对贵司的采购需求，我们已准备了详细的方案材料和Demo环境，方便您进一步评估。\n\n如您方便，希望能安排一次线上演示，为您展示平台核心能力。\n\n期待您的回复。\n\n---\n\n邮件已发送成功。', created_at: ago(29), agent_action: { type: 'send_im', channel: '企业微信', status: 'completed', duration_ms: 800 } },
  ],
};

// 模拟AI回复（返回结构化数据：content + sources）
function generateAIReply(query: string, session: any): { content: string; sources?: any[]; agent_action?: any } {
  const kbName = session.kb_name;
  const mode = session.mode || 'chat';

  if (mode === 'agent' && session.agent_name) {
    return {
      content: `[${session.agent_name}] 已收到您的指令"${query}"，正在执行相关操作...\n\n执行完成。根据Agent工作流处理结果，已完成对应操作。如需进一步操作请继续指示。`,
      agent_action: { type: 'call_skill', skill_name: session.agent_name, status: 'completed', duration_ms: Math.floor(Math.random() * 2000 + 500) },
    };
  }

  if (mode === 'rag' && kbName) {
    const sources = [
      { doc_name: `${kbName}文档1.pdf`, chunk_index: Math.floor(Math.random() * 10), score: +(0.85 + Math.random() * 0.12).toFixed(4), content: `与"${query}"相关的文档片段内容...该部分描述了核心概念和操作规范。` },
      { doc_name: `${kbName}文档2.md`, chunk_index: Math.floor(Math.random() * 5), score: +(0.7 + Math.random() * 0.15).toFixed(4), content: `补充参考内容：关于"${query}"的延伸说明和注意事项。` },
    ];
    return {
      content: `根据「${kbName}」知识库中的相关文档，针对您的问题"${query}"：\n\n这是基于检索到的文档片段生成的回答。RAG系统首先将您的问题向量化，然后从知识库中检索最相关的文档片段，最后结合检索结果生成回答。\n\n如需更详细的信息，可以展开下方「参考来源」查看原始文档片段。`,
      sources,
    };
  }

  return {
    content: `您好！关于"${query}"，这是一个很好的问题。\n\n目前该对话未关联知识库，我将基于通用知识进行回答。建议您创建新对话时选择「知识库问答」模式并关联相关知识库，以获得更准确的基于文档的RAG增强回答。\n\n您也可以选择「智能体对话」模式，让Agent帮您执行更复杂的任务。`,
  };
}

// =================== 路由匹配 & 响应 ===================
export function handleMockRequest(method: string, url: string, params?: any, data?: any) {
  const path = url.replace(/^\/api\/v1/, '');
  const p = params || {};

  // Auth
  if (path === '/auth/admin/login' && method === 'post') {
    return ok({ access_token: 'mock-jwt-token-admin', user: mockUser });
  }
  if (path === '/auth/me') {
    return ok(mockUser);
  }

  // Dashboard
  if (path === '/stats/dashboard') return ok(dashboardStats);
  if (path === '/stats/usage') return ok(usageStats);

  // Model Sources
  if (path === '/models/sources' && method === 'get') return paginate(modelSources, p.page, p.page_size, p.search);
  if (path === '/models/sources' && method === 'post') return ok(data);
  if (/^\/models\/sources\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/models\/sources\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Model Policies
  if (path === '/models/policies' && method === 'get') return paginate(modelPolicies, p.page, p.page_size, p.search);
  if (path === '/models/policies' && method === 'post') return ok(data);
  if (/^\/models\/policies\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/models\/policies\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Call Logs
  if (path === '/models/call-logs') return paginate(callLogs, p.page, p.page_size, p.search);

  // Cost Stats
  if (path === '/models/cost-stats') return ok(costStats);

  // Chat Adapters
  if (path === '/connectors/chat-adapters' && method === 'get') return paginate(chatAdapters, p.page, p.page_size, p.search);
  if (path === '/connectors/chat-adapters' && method === 'post') return ok(data);
  if (/^\/connectors\/chat-adapters\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/connectors\/chat-adapters\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Starlark Adapters
  if (path === '/connectors/starlark' && method === 'get') return paginate(starlarkAdapters, p.page, p.page_size, p.search);
  if (path === '/connectors/starlark' && method === 'post') return ok(data);
  if (/^\/connectors\/starlark\/[^/]+$/.test(path) && method === 'get') return ok(starlarkAdapters[0]);
  if (/^\/connectors\/starlark\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/connectors\/starlark\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (/^\/connectors\/starlark\/[^/]+\/generate-skill$/.test(path)) {
    // 实质化：扫描适配器的 api_functions，每个函数登记为 1 个 Skill 入库（去重 by 来源+名称），返回新增 Skill 列表供前端跳转高亮
    const adapterId = path.split('/')[3];
    const adapter: any = (starlarkAdapters as any[]).find(a => a.id === adapterId);
    if (!adapter) return ok({ skills: [] });
    const baseTs = Date.now();
    const newSkills = ((adapter.api_functions as any[]) || []).map((fn: any, i: number) => ({
      id: 'sk-' + (baseTs + i),
      name: fn.name,
      type: 'tool',
      category: 'integration',
      risk_level: 'medium',
      status: 'active',
      owner: adapter.author || '系统',
      owner_name: adapter.author || '系统',
      description: fn.description || `从 ${adapter.name} 适配器自动生成`,
      source_adapter_id: adapter.id,
      source_adapter_name: adapter.name,
    }));
    const added: any[] = [];
    newSkills.forEach((s: any) => {
      const dup = skills.find((x: any) => x.source_adapter_id === s.source_adapter_id && x.name === s.name);
      if (!dup) { skills.unshift(s); added.push(s); }
    });
    return ok({ skills: added, total_added: added.length, total_existed: newSkills.length - added.length });
  }

  // Integration Templates (对接模板)
  if (path === '/connectors/integration-templates' && method === 'get') return paginate(integrationTemplates, p.page, p.page_size, p.search);
  if (path === '/connectors/integration-templates/sync' && method === 'post') return ok({ synced: integrationTemplates.length });
  if (/^\/connectors\/integration-templates\/[^/]+\/install$/.test(path)) return ok({ adapter_id: 'sa-' + Date.now() });

  // Connectors (Third-party Systems)
  if (path === '/connectors' && method === 'get') return paginate(connectors, p.page, p.page_size, p.search);
  if (path === '/connectors' && method === 'post') return ok(data);
  if (/^\/connectors\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/connectors\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Identity Sources (身份源配置)
  if (path === '/identity/sources' && method === 'get') return paginate(identitySources, p.page, p.page_size, p.search);
  if (path === '/identity/sources' && method === 'post') {
    const newItem = { id: 'is-' + Date.now(), is_builtin: false, ...data };
    identitySources.push(newItem);
    return ok(newItem);
  }
  if (/^\/identity\/sources\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop();
    const idx = identitySources.findIndex(s => s.id === id);
    if (idx >= 0) identitySources[idx] = { ...identitySources[idx], ...data };
    return ok(data);
  }
  if (/^\/identity\/sources\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop();
    const idx = identitySources.findIndex(s => s.id === id);
    if (idx >= 0 && !identitySources[idx].is_builtin) identitySources.splice(idx, 1);
    return ok(null);
  }
  if (/^\/identity\/sources\/[^/]+\/test-connection$/.test(path)) return ok({ success: true });
  if (/^\/identity\/sources\/[^/]+\/sync$/.test(path)) return ok({ triggered: true, run_id: 'isr-' + Date.now() });

  // Permissions (权限菜单)
  if (path === '/identity/permissions/menus' && method === 'get') return ok(permMenus);
  if (path === '/identity/permissions/menus' && method === 'post') {
    const newMenu = { id: 'pm-' + Date.now(), ...data };
    permMenus.push(newMenu);
    return ok(newMenu);
  }
  if (/^\/identity\/permissions\/menus\/[^/]+$/.test(path) && method === 'get') {
    const id = path.split('/').pop()!;
    return ok(permMenus.find(m => m.id === id) || null);
  }
  if (/^\/identity\/permissions\/menus\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop()!;
    const idx = permMenus.findIndex(m => m.id === id);
    if (idx >= 0) permMenus[idx] = { ...permMenus[idx], ...data };
    return ok(permMenus[idx]);
  }
  if (/^\/identity\/permissions\/menus\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop()!;
    const idx = permMenus.findIndex(m => m.id === id);
    if (idx >= 0) {
      // 删除子节点
      const idsToDelete = new Set<string>();
      const collect = (pid: string) => {
        idsToDelete.add(pid);
        permMenus.filter(m => m.parent_id === pid).forEach(c => collect(c.id));
      };
      collect(id);
      for (let i = permMenus.length - 1; i >= 0; i--) {
        if (idsToDelete.has(permMenus[i].id)) permMenus.splice(i, 1);
      }
    }
    return ok(null);
  }

  // 旧权限管理 API（保留兼容）
  if (path === '/identity/permissions/groups' && method === 'get') return ok(permGroups);
  if (path === '/identity/permissions/skills' && method === 'get') return ok(permSkills);
  if (/^\/identity\/permissions\/groups\/[^/]+$/.test(path) && method === 'get') {
    const id = path.split('/').pop() as string;
    return ok(permGroupConfigs[id] || {});
  }
  if (/^\/identity\/permissions\/groups\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop() as string;
    permGroupConfigs[id] = data || {};
    return ok(permGroupConfigs[id]);
  }
  // 用户个人权限覆盖
  if (/^\/identity\/permissions\/users\/[^/]+$/.test(path) && method === 'get') {
    const uid = path.split('/').pop() as string;
    const override = userPermissions[uid] || null;
    return ok({ override, fallback_group: users.find(u => u.id === uid)?.org_id || null });
  }
  if (/^\/identity\/permissions\/users\/[^/]+$/.test(path) && method === 'put') {
    const uid = path.split('/').pop() as string;
    if (data && Object.keys(data).length > 0) {
      userPermissions[uid] = data;
    } else {
      delete userPermissions[uid];
    }
    return ok(data);
  }

  // Roles
  if (path === '/roles' && method === 'get') return paginate(roles, p.page, p.page_size, p.search);
  if (path === '/roles' && method === 'post') {
    const newRole = { id: 'role-' + Date.now(), created_at: new Date().toISOString(), ...data };
    roles.push(newRole);
    return ok(newRole);
  }
  if (/^\/roles\/[^/]+$/.test(path) && method === 'get') {
    const rid = path.split('/').pop()!;
    return ok(roles.find(r => r.id === rid) || null);
  }
  if (/^\/roles\/[^/]+$/.test(path) && method === 'put') {
    const rid = path.split('/').pop()!;
    const idx = roles.findIndex(r => r.id === rid);
    if (idx >= 0) roles[idx] = { ...roles[idx], ...data };
    return ok(roles[idx]);
  }
  if (/^\/roles\/[^/]+$/.test(path) && method === 'delete') {
    const rid = path.split('/').pop()!;
    const idx = roles.findIndex(r => r.id === rid);
    if (idx >= 0) roles.splice(idx, 1);
    return ok(null);
  }

  // Users
  if (path === '/users' && method === 'get') return paginate(users, p.page, p.page_size, p.search);
  if (path === '/users' && method === 'post') {
    const newUser = { id: 'u-' + Date.now(), ...data };
    users.push(newUser);
    return ok(newUser);
  }
  if (/^\/users\/[^/]+$/.test(path) && method === 'put') {
    const uid = path.split('/').pop();
    const idx = users.findIndex(u => u.id === uid);
    if (idx >= 0) users[idx] = { ...users[idx], ...data };
    return ok(users[idx < 0 ? 0 : idx]);
  }
  if (/^\/users\/[^/]+$/.test(path) && method === 'delete') {
    const uid = path.split('/').pop();
    const idx = users.findIndex(u => u.id === uid);
    if (idx >= 0) users.splice(idx, 1);
    return ok(null);
  }

  // Organizations
  if (path === '/organizations' && method === 'get') {
    // 返回全量，前端做树形展示
    const filtered = p.search
      ? organizations.filter((o: any) => JSON.stringify(o).toLowerCase().includes(p.search.toLowerCase()))
      : organizations;
    return ok(filtered);
  }
  if (path === '/organizations' && method === 'post') {
    const newOrg = { id: 'org-' + Date.now(), member_count: 0, ...data };
    organizations.push(newOrg);
    orgMembers[newOrg.id] = [];
    return ok(newOrg);
  }
  if (/^\/organizations\/[^/]+$/.test(path) && method === 'put') {
    const oid = path.split('/').pop();
    const idx = organizations.findIndex(o => o.id === oid);
    if (idx >= 0) organizations[idx] = { ...organizations[idx], ...data };
    return ok(organizations[idx < 0 ? 0 : idx]);
  }
  if (/^\/organizations\/[^/]+$/.test(path) && method === 'delete') {
    const oid = path.split('/').pop();
    const idx = organizations.findIndex(o => o.id === oid);
    if (idx >= 0) organizations.splice(idx, 1);
    return ok(null);
  }
  // 获取组织成员列表
  if (/^\/organizations\/[^/]+\/members$/.test(path) && method === 'get') {
    const oid = path.split('/')[2];
    const memberIds = orgMembers[oid] || [];
    const memberList = users.filter(u => memberIds.includes(u.id));
    return ok(memberList);
  }
  // 添加成员
  if (/^\/organizations\/[^/]+\/members$/.test(path) && method === 'post') {
    const oid = path.split('/')[2];
    if (!orgMembers[oid]) orgMembers[oid] = [];
    const uid = data?.user_id;
    if (uid && !orgMembers[oid].includes(uid)) orgMembers[oid].push(uid);
    // 更新 user 的 org_id
    const uIdx = users.findIndex(u => u.id === uid);
    if (uIdx >= 0) users[uIdx].org_id = oid;
    return ok(null);
  }
  // 移除成员
  if (/^\/organizations\/[^/]+\/members\/[^/]+$/.test(path) && method === 'delete') {
    const parts = path.split('/');
    const oid = parts[2];
    const uid = parts[4];
    if (orgMembers[oid]) {
      const mi = orgMembers[oid].indexOf(uid);
      if (mi >= 0) orgMembers[oid].splice(mi, 1);
    }
    return ok(null);
  }

  // Chat Accounts
  if (path === '/accounts/chat') return paginate(chatAccounts, p.page, p.page_size, p.search);

  // Third-Party Accounts
  if (path === '/accounts/third-party') return paginate(thirdPartyAccounts, p.page, p.page_size, p.search);

  // Matching
  if (path === '/account-matching/results') return paginate(matchingResults, p.page, p.page_size, p.search);
  if (/^\/account-matching\/results\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop()!;
    const idx = matchingResults.findIndex(r => r.id === id);
    if (idx >= 0) Object.assign(matchingResults[idx], data);
    return ok(idx >= 0 ? matchingResults[idx] : data);
  }
  if (/^\/account-matching\/results\/[^/]+\/conflicts$/.test(path) && method === 'get') {
    const id = path.split('/')[3]!;
    return ok(matchingConflicts[id] || []);
  }
  if (path === '/account-matching/runs') return paginate(matchingRuns, p.page, p.page_size);
  if (path === '/account-matching/strategies' && method === 'get') return ok(matchingStrategies);
  if (path === '/account-matching/strategies' && method === 'post') return ok(data);
  if (/^\/account-matching\/strategies\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop()!;
    const idx = matchingStrategies.findIndex(s => s.id === id);
    if (idx >= 0) Object.assign(matchingStrategies[idx], data);
    return ok(idx >= 0 ? matchingStrategies[idx] : data);
  }
  if (path === '/account-matching/trigger' && method === 'post') {
    const newRun = { id: `run-${Date.now()}`, status: 'completed', created_at: new Date().toISOString(), matched_count: Math.floor(Math.random() * 50) + 140, total_count: Math.floor(Math.random() * 20) + 195 };
    matchingRuns.unshift(newRun);
    return ok(newRun);
  }

  // Agents
  if (path === '/agents' && method === 'get') return paginate(agents, p.page, p.page_size, p.search);
  if (path === '/agents' && method === 'post') {
    const newAgent = {
      id: 'a-' + Date.now(),
      agent_type: data?.agent_type || 'workflow',
      owner_type: data?.owner_type || 'personal',
      owner_id: 'u-1', owner_name: '张伟', avatar_color: data?.avatar_color || '#00D4FF',
      status: 'draft', triggers_count: 0, last_run_at: '', updated_at: new Date().toISOString(),
      policy_name: '', ...data,
    };
    agents.unshift(newAgent);
    return ok(newAgent);
  }
  if (/^\/agents\/runs$/.test(path)) return paginate(agentRuns, p.page, p.page_size, p.search);
  // Agent 工作流（补充画布坐标与连线）
  if (/^\/agents\/workflows\/[^/]+$/.test(path) && method === 'get') {
    const id = path.split('/').pop() as string;
    const wf = workflows[id] || { agent_id: id, name: '新建流程', max_iterations: 1, timeout_seconds: 60, on_error: 'stop', nodes: [] };
    return ok(enrichWorkflow(wf));
  }
  if (/^\/agents\/workflows\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop() as string;
    workflows[id] = { ...(workflows[id] || {}), ...data, agent_id: id };
    return ok(workflows[id]);
  }
  // Agent 协作者（权限）
  if (/^\/agents\/[^/]+\/collaborators$/.test(path) && method === 'get') {
    const id = path.split('/')[2];
    return ok(getCollaborators(id));
  }
  if (/^\/agents\/[^/]+\/collaborators$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const list = agentCollaborators[id] || (agentCollaborators[id] = getCollaborators(id).slice());
    if (data?.principal_type === 'department') {
      list.push({ principal_type: 'department', dept_id: data?.dept_id, name: data?.name, member_count: data?.member_count || 0, role: data?.role || 'viewer' });
    } else {
      list.push({ principal_type: 'user', user_id: data?.user_id, name: data?.name, role: data?.role || 'viewer' });
    }
    return ok(list);
  }
  if (/^\/agents\/[^/]+\/collaborators\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/')[2];
    const pid = path.split('/')[4];
    const list = agentCollaborators[id] || (agentCollaborators[id] = getCollaborators(id).slice());
    const c = list.find((x: any) => x.user_id === pid || x.dept_id === pid);
    if (c) c.role = data?.role;
    return ok(list);
  }
  if (/^\/agents\/[^/]+\/collaborators\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/')[2];
    const pid = path.split('/')[4];
    agentCollaborators[id] = (agentCollaborators[id] || getCollaborators(id)).filter((x: any) => x.user_id !== pid && x.dept_id !== pid);
    return ok(agentCollaborators[id]);
  }
  // Agent 所有权转让：目标成员升为 owner，原 owner 降为 admin，并更新 agent 归属
  if (/^\/agents\/[^/]+\/transfer$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const list = agentCollaborators[id] || (agentCollaborators[id] = getCollaborators(id).slice());
    const target = list.find((x: any) => x.user_id === data?.user_id && x.principal_type !== 'department');
    if (target) {
      list.forEach((x: any) => { if (x.role === 'owner') x.role = 'admin'; });
      target.role = 'owner';
      const ai = agents.findIndex((a: any) => a.id === id);
      if (ai >= 0) { agents[ai].owner_id = target.user_id; agents[ai].owner_name = target.name; agents[ai].updated_at = new Date().toISOString(); }
    }
    return ok(list);
  }
  // Agent 调试
  if (/^\/agents\/[^/]+\/debug\/chat$/.test(path) && method === 'post') {
    return ok(debugChat(data));
  }
  if (/^\/agents\/[^/]+\/debug\/workflow$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    return ok(debugWorkflow(id, data));
  }
  if (/^\/agents\/[^/]+\/executions$/.test(path) && method === 'post') {
    // 工作流运行：读取在架版本快照而非工作副本
    const id = path.split('/')[2];
    const agent = agents.find((a: any) => a.id === id);
    const publishedVer = agentVersions
      .filter((v: any) => v.agent_id === id && v.status === 'published')
      .sort((a: any, b: any) => (b.published_at || '').localeCompare(a.published_at || ''))[0];
    const snapshot = publishedVer ? JSON.parse(publishedVer.snapshot) : null;
    const newRun = {
      id: 'run-' + Date.now(),
      agent_id: id,
      agent_name: agent?.name || '未知',
      trigger_type: 'manual',
      status: 'completed',
      duration_ms: 300 + Math.floor(Math.random() * 700),
      model_tokens: 200 + Math.floor(Math.random() * 500),
      input_tokens: 100 + Math.floor(Math.random() * 300),
      output_tokens: 100 + Math.floor(Math.random() * 200),
      cost: 0.01,
      created_at: new Date().toISOString(),
    };
    agentRuns.unshift(newRun);
    return ok({ ...newRun, snapshot_version: publishedVer?.version || null });
  }
  if (/^\/agents\/[^/]+\/executions$/.test(path) && method === 'get') {
    const id = path.split('/')[2];
    return paginate(agentRuns.filter((r: any) => r.agent_id === id), p.page, p.page_size);
  }
  if (/^\/agents\/executions\/[^/]+$/.test(path)) {
    const execId = path.split('/').pop() as string;
    return ok(buildRunDetail(execId));
  }
  // Agent 发布/下架/撤回
  if (/^\/agents\/[^/]+\/publish$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) {
      agents[idx] = { ...agents[idx], ...data, status: 'pending', updated_at: new Date().toISOString() };
      reviewRecords.unshift({
        id: 'rv-' + Date.now(), type: 'agent_publish', target_id: id, target_name: agents[idx].name,
        applicant: agents[idx].owner_id || 'u-1', applicant_name: agents[idx].owner_name || 'Admin',
        applicant_dept: '技术部',
        scope: 'company', version: data.version || '1.0.0', changelog: data.changelog || '',
        submitted_at: new Date().toISOString(), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null,
      });
    }
    return ok({ status: 'pending' });
  }
  if (/^\/agents\/[^/]+\/delist$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) agents[idx] = { ...agents[idx], status: 'delisted', updated_at: new Date().toISOString() };
    return ok(null);
  }
  if (/^\/agents\/[^/]+\/cancel$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) agents[idx] = { ...agents[idx], status: 'draft', updated_at: new Date().toISOString() };
    return ok(null);
  }
  // ===== 智能体/工作流版本历史 =====
  // GET /agents/:id/versions
  if (/^\/agents\/[^/]+\/versions$/.test(path) && method === 'get') {
    const id = path.split('/')[2];
    const versions = agentVersions.filter(v => v.agent_id === id);
    return ok(versions);
  }
  // POST /agents/:id/versions/:vid/rollback
  if (/^\/agents\/[^/]+\/versions\/[^/]+\/rollback$/.test(path) && method === 'post') {
    const agentId = path.split('/')[2];
    const versionId = path.split('/')[4];
    const sourceVersion = agentVersions.find(v => v.id === versionId);
    if (!sourceVersion) return { status: 404, data: { error: '版本不存在' } };
    const agentVersionsForAgent = agentVersions.filter(v => v.agent_id === agentId);
    const maxVer = agentVersionsForAgent.reduce((max, v) => {
      const parts = v.version.split('.').map(Number);
      return parts[0] > max ? parts[0] : max;
    }, 0);
    const newVersion = {
      id: 'av-' + Date.now(),
      agent_id: agentId,
      version: `${maxVer + 1}.0.0`,
      status: 'history',
      is_rollback: true,
      changelog: `基于 v${sourceVersion.version} 回滚`,
      published_at: null,
      publisher: '张伟',
      snapshot: sourceVersion.snapshot,
    };
    agentVersions.unshift(newVersion);
    const idx = agents.findIndex(a => a.id === agentId);
    if (idx >= 0) (agents[idx] as any) = { ...(agents[idx] as any), status: 'draft', has_unpublished_changes: true, updated_at: new Date().toISOString() };
    return ok(newVersion);
  }
  // POST /agents/:id/save (设置 has_unpublished_changes)
  if (/^\/agents\/[^/]+\/save$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) (agents[idx] as any) = { ...(agents[idx] as any), ...data, has_unpublished_changes: true, updated_at: new Date().toISOString() };
    return ok(idx >= 0 ? agents[idx] : data);
  }
  // ===== 通用资源市场 GET /{resourceType}/market =====
  // 必须置于 /:id 路由之前，否则 "market" 会被误当作资源 ID
  if (/^\/(skills|agents|workflows|reports)\/market$/.test(path) && method === 'get') {
    const rType = path.split('/')[1].replace(/s$/, '');
    const category = p.category; // 'chat' | 'workflow' | undefined
    let sourceData: any[] = [];
    if (rType === 'skill') {
      sourceData = skills.filter((s: any) => s.status === 'published');
    } else if (rType === 'agent') {
      // 按 category 过滤：chat 或 workflow
      const catFilter = category === 'workflow'
        ? (a: any) => a.category === 'workflow'
        : (a: any) => a.category !== 'workflow'; // 默认 chat
      sourceData = agents
        .filter((a: any) => catFilter(a) && a.status === 'published')
        .map((a: any) => ({ ...a, scope: a.owner_type === 'organization' ? 'company' : 'private', version: '1.0.0', install_count: a.triggers_count ?? 0, owner_dept: a.owner_type === 'organization' ? '组织' : '个人' }));
    } else if (rType === 'workflow') {
      sourceData = agents
        .filter((a: any) => a.category === 'workflow' && a.status === 'published')
        .map((a: any) => ({ ...a, scope: a.owner_type === 'organization' ? 'company' : 'private', version: '1.0.0', install_count: a.triggers_count ?? 0, owner_dept: a.owner_type === 'organization' ? '组织' : '个人' }));
    } else if (rType === 'report') {
      sourceData = reports
        .filter((r: any) => r.status === 'published')
        .map((r: any) => ({ id: r.id, name: r.title, description: `${r.department_name || ''}${r.period === 'weekly' ? '周报' : '报告'}，由 ${r.agent_name || '系统'} 自动生成`, owner_name: r.agent_name || '系统', owner_dept: r.department_name || '', scope: r.scope || 'department', version: '', install_count: undefined }));
    }
    return paginate(sourceData, p.page, p.page_size, p.search);
  }
  // ===== 通用资源市场详情 GET /{resourceType}/market/:id =====
  if (/^\/(agents|workflows|skills)\/market\/[^/]+$/.test(path) && method === 'get') {
    const parts = path.split('/');
    const rType = parts[1].replace(/s$/, '');
    const itemId = parts[3];
    let sourceData: any[] = [];
    if (rType === 'skill') {
      sourceData = skills.filter((s: any) => s.status === 'published');
    } else {
      sourceData = agents
        .filter((a: any) => a.status === 'active' || a.status === 'published')
        .map((a: any) => ({ ...a, scope: a.owner_type === 'organization' ? 'company' : 'private', version: '1.0.0', install_count: a.triggers_count ?? 0, owner_dept: a.owner_type === 'organization' ? '技术部' : '个人', publish_description: a.description, changelog: '初始版本发布', published_at: a.updated_at }));
    }
    const found = sourceData.find((s: any) => s.id === itemId);
    if (found) return ok(found);
    return ok(sourceData[0] || null);
  }
  // ===== 报告市场详情 GET /reports/market/:id =====
  if (/^\/reports\/market\/[^/]+$/.test(path) && method === 'get') {
    const itemId = path.split('/')[3];
    const sourceData = reports
      .filter((r: any) => r.status === 'published')
      .map((r: any) => ({
        id: r.id, name: r.title, title: r.title,
        description: `${r.department_name || ''}${r.period === 'weekly' ? '周报' : '报告'}，由 ${r.agent_name || '系统'} 自动生成`,
        owner_name: r.agent_name || '系统', owner_dept: r.department_name || '',
        scope: r.scope || 'department', version: '1.0.0',
        install_count: 0, is_beta: false,
        changelog: '初始版本发布', published_at: r.published_at || r.updated_at,
        period: r.period, department_name: r.department_name,
      }));
    const found = sourceData.find((s: any) => s.id === itemId);
    if (found) return ok(found);
    return ok(sourceData[0] || null);
  }
  // ===== 通用资源 — 获取内测分享的资源（给市场用） GET /{resourceType}/shared-to-me =====
  // 必须置于 /:id 路由之前，否则 "shared-to-me" 会被误当作资源 ID
  if (/^\/(skills|agents|workflows|reports)\/shared-to-me$/.test(path) && method === 'get') {
    const rType = path.split('/')[1].replace(/s$/, '');
    const myShares = resourceShares.filter(s => s.resource_type === rType && (s.target_id === 'u-1' || s.target_id === 'dept-1'));
    const sharedIds = [...new Set(myShares.map(s => s.resource_id))];
    // 根据 resourceType 从对应数据集查找
    let srcData: any[] = [];
    if (rType === 'skill') srcData = skills;
    else if (rType === 'agent' || rType === 'workflow') srcData = agents;
    else srcData = []; // reports 暂无统一数据源
    const sharedItems = srcData.filter(s => sharedIds.includes(s.id));
    return paginate(sharedItems, p.page, p.page_size, p.search);
  }
  // ===== 通用资源 — 我安装的 GET /{resourceType}/installed =====
  // 必须置于 /:id 路由之前，否则 "installed" 会被误当作资源 ID
  if (/^\/(agents|workflows|reports)\/installed$/.test(path) && method === 'get') {
    const rType = path.split('/')[1].replace(/s$/, '');
    let installedData: any[] = [];
    if (rType === 'agent') {
      // 安装他人发布的对话类智能体（读取在架版本快照）
      installedData = agents
        .filter((a: any) => a.category !== 'workflow' && a.owner_id !== 'u-1')
        .map((a: any, i: number) => {
          const pubVer = agentVersions
            .filter((v: any) => v.agent_id === a.id && v.status === 'published')
            .sort((x: any, y: any) => (y.published_at || '').localeCompare(x.published_at || ''))[0];
          let snapshotData = {};
          if (pubVer) { try { snapshotData = JSON.parse(pubVer.snapshot); } catch {} }
          return { ...a, ...snapshotData, installed_at: dayAgo(i + 1), is_beta: i === 0, installed_version: pubVer?.version || '1.0.0' };
        });
    } else if (rType === 'workflow') {
      // 安装他人发布的工作流类智能体（读取在架版本快照）
      installedData = agents
        .filter((a: any) => a.category === 'workflow' && a.owner_id !== 'u-1')
        .map((a: any, i: number) => {
          const pubVer = agentVersions
            .filter((v: any) => v.agent_id === a.id && v.status === 'published')
            .sort((x: any, y: any) => (y.published_at || '').localeCompare(x.published_at || ''))[0];
          let snapshotData = {};
          if (pubVer) { try { snapshotData = JSON.parse(pubVer.snapshot); } catch {} }
          return { ...a, ...snapshotData, installed_at: dayAgo(i + 2), is_beta: false, installed_version: pubVer?.version || '1.0.0' };
        });
    } else if (rType === 'report') {
      // 安装他人发布的报告
      installedData = reports
        .filter((r: any) => r.status === 'published')
        .slice(0, 3)
        .map((r: any, i: number) => ({ id: r.id, name: r.title, description: `${r.department_name || ''}${r.period === 'weekly' ? '周报' : '报告'}`, owner_name: r.agent_name || '系统', agent_type: 'report', installed_at: dayAgo(i + 1), is_beta: false }));
    }
    return paginate(installedData, p.page, p.page_size, p.search);
  }
  // ===== POST /{resourceType}/:id/install — 安装资源（读取在架版本快照） =====
  if (/^\/(agents|workflows)\/[^/]+\/install$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const agent = agents.find((a: any) => a.id === id);
    if (!agent) return { status: 404, data: { error: '资源不存在' } };
    // 查找最新在架版本的快照
    const publishedVer = agentVersions
      .filter((v: any) => v.agent_id === id && v.status === 'published')
      .sort((a: any, b: any) => (b.published_at || '').localeCompare(a.published_at || ''))[0];
    if (publishedVer) {
      try {
        const snapshot = JSON.parse(publishedVer.snapshot);
        return ok({ ...agent, installed_snapshot: snapshot, version: publishedVer.version });
      } catch { /* fallback */ }
    }
    return ok({ ...agent, installed_snapshot: null });
  }
  // ===== POST /reports/:id/install — 安装报告 =====
  if (/^\/reports\/[^/]+\/install$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const report = reports.find((r: any) => r.id === id);
    if (!report) return { status: 404, data: { error: '报告不存在' } };
    return ok({ ...report, installed_at: new Date().toISOString() });
  }
  if (/^\/agents\/[^/]+$/.test(path) && method === 'get') {
    const id = path.split('/').pop() as string;
    const agent = agents.find((a: any) => a.id === id) || agents[0];
    return ok({ ...agent, collaborators: getCollaborators(id) });
  }
  if (/^\/agents\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop() as string;
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) agents[idx] = { ...agents[idx], ...data, updated_at: new Date().toISOString() };
    return ok(idx >= 0 ? agents[idx] : data);
  }
  if (/^\/agents\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop() as string;
    const idx = agents.findIndex((a: any) => a.id === id);
    if (idx >= 0) agents.splice(idx, 1);
    return ok(null);
  }

  // Skills — 前台路由优先匹配（必须在 /skills/:id 之前）
  if (path === '/skills/installed' && method === 'get') return paginate(installedSkills, p.page, p.page_size, p.search);
  if (/^\/skills\/installed\/[^/]+\/uninstall$/.test(path)) {
    const iid = path.split('/')[3];
    const idx = installedSkills.findIndex(i => i.id === iid);
    if (idx >= 0) installedSkills.splice(idx, 1);
    return ok(null);
  }
  if (path === '/skills/my' && method === 'get') {
    const mySkills = skills.filter(s => s.owner_id === 'u-1');
    return paginate(mySkills, p.page, p.page_size, p.search);
  }
  if (/^\/skills\/[^/]+\/publish$/.test(path) && method === 'post') {
    const sid = path.split('/')[2];
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) {
      skills[idx] = { ...skills[idx], ...data, status: 'pending', updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      reviewRecords.unshift({
        id: 'rv-' + Date.now(), type: 'skill_publish', target_id: sid, target_name: skills[idx].name,
        applicant: skills[idx].owner_id, applicant_name: skills[idx].owner_name, applicant_dept: skills[idx].owner_dept,
        scope: data.scope || 'department', version: data.version || '1.0.0', changelog: data.changelog || '',
        submitted_at: new Date().toISOString(), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null,
        auto_check: { has_skill_md: true, file_count: 3, total_size: 2000, danger_keywords: [], slug_conflict: false },
      });
    }
    return ok(idx >= 0 ? skills[idx] : data);
  }
  if (/^\/skills\/[^/]+\/delist$/.test(path) && method === 'post') {
    const sid = path.split('/')[2];
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) skills[idx] = { ...skills[idx], status: 'delisted', updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    return ok(idx >= 0 ? skills[idx] : null);
  }
  // Skills — 回滚版本（modified → published）
  if (/^\/skills\/[^/]+\/rollback$/.test(path) && method === 'post') {
    const sid = path.split('/')[2];
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) skills[idx] = { ...skills[idx], status: 'published', updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    return ok(idx >= 0 ? skills[idx] : null);
  }

  // Skills — 版本历史
  if (/^\/skills\/[^/]+\/versions$/.test(path) && method === 'get') {
    const sid = path.split('/')[2];
    const versions = skillVersions.filter(v => v.skill_id === sid);
    return ok(versions);
  }

  // Skills — 基于历史版本回滚（创建新版本草稿）
  if (/^\/skills\/[^/]+\/versions\/[^/]+\/rollback$/.test(path) && method === 'post') {
    const sid = path.split('/')[2];
    const vid = path.split('/')[4];
    const sourceVersion = skillVersions.find(v => v.id === vid);
    if (!sourceVersion) return { status: 404, data: { error: 'Version not found' } };
    // 生成新版本号（基于当前最新版本 +1）
    const skill = skills.find(s => s.id === sid);
    const currentVer = skill?.version || '1.0.0';
    const parts = currentVer.split('.').map(Number);
    const newVer = `${parts[0]}.${parts[1] + 1}.0`;
    const newVersion = {
      id: 'sv-' + Date.now(),
      skill_id: sid,
      version: newVer,
      status: 'draft',
      is_rollback: true,
      changelog: `回滚自 v${sourceVersion.version}`,
      published_at: null,
      publisher: '张伟',
      file_count: sourceVersion.file_count,
      total_size: sourceVersion.total_size,
    };
    skillVersions.unshift(newVersion);
    if (skill) {
      skill.status = 'modified';
      skill.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ');
    }
    return ok(newVersion);
  }

  // 通用资源 — 分享（定向授权） POST /{resourceType}/:id/shares
  if (/^\/(skills|agents|workflows|reports)\/[^/]+\/shares$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const rType = parts[1].replace(/s$/, ''); // skills->skill, agents->agent, etc.
    const rid = parts[2];
    const targets = data.targets || [];
    const existing = resourceShares.filter(s => s.resource_type === rType && s.resource_id === rid);
    if (existing.length + targets.length > 20) {
      return { status: 400, data: { error: '内测分享仅限小范围（最多20人/角色），如需更大范围请走发布流程' } };
    }
    const newShares = targets.map((t: any) => ({
      id: 'rs-' + Date.now() + '-' + t.target_id,
      resource_type: rType,
      resource_id: rid,
      resource_name: t.resource_name || rid,
      target_type: t.target_type || 'user',
      target_id: t.target_id,
      target_name: t.target_name,
      target_dept: t.target_dept || '',
      share_type: 'test',
      granted_by: 'u-1',
      granted_by_name: '张伟',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    }));
    resourceShares.push(...newShares);
    return ok(newShares);
  }

  // 通用资源 — 移除分享 DELETE /{resourceType}/:id/shares/:shareId
  if (/^\/(skills|agents|workflows|reports)\/[^/]+\/shares\/[^/]+$/.test(path) && method === 'delete') {
    const shareId = path.split('/')[4];
    const idx = resourceShares.findIndex(s => s.id === shareId);
    if (idx >= 0) resourceShares.splice(idx, 1);
    return ok(null);
  }

  // 通用资源 — 获取分享列表 GET /{resourceType}/:id/shares
  if (/^\/(skills|agents|workflows|reports)\/[^/]+\/shares$/.test(path) && method === 'get') {
    const parts = path.split('/');
    const rType = parts[1].replace(/s$/, '');
    const rid = parts[2];
    const shares = resourceShares.filter(s => s.resource_type === rType && s.resource_id === rid);
    return ok(shares);
  }

  // Skills — 验证通过（白名单验证发布 → 正式上架）
  if (/^\/skills\/[^/]+\/verify$/.test(path) && method === 'post') {
    const sid = path.split('/')[2];
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) {
      skills[idx] = { ...skills[idx], status: 'published', updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    }
    return ok(idx >= 0 ? skills[idx] : null);
  }

  // Skills — 后台 CRUD
  if (path === '/skills' && method === 'get') return paginate(skills, p.page, p.page_size, p.search);
  if (path === '/skills' && method === 'post') {
    const newSkill = { id: 'sk-' + Date.now(), status: 'draft', scope: 'private', version: '0.1.0', install_count: 0, owner_id: 'u-1', owner_name: '张伟', owner_dept: '技术部', created_at: new Date().toISOString().slice(0, 16).replace('T', ' '), updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '), changelog: '', ...data };
    skills.push(newSkill);
    skillFiles[newSkill.id] = [];
    return ok(newSkill);
  }
  // Skills — 获取单个技能详情
  if (/^\/skills\/[^/]+$/.test(path) && method === 'get') {
    const sid = path.split('/').pop();
    const idx = skills.findIndex(s => s.id === sid);
    return ok(idx >= 0 ? skills[idx] : null);
  }
  if (/^\/skills\/[^/]+$/.test(path) && method === 'put') {
    const sid = path.split('/').pop();
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) {
      // 已上架/已下架的技能被编辑后，状态变为 modified（有未发布的修改）
      const oldStatus = skills[idx].status;
      skills[idx] = { ...skills[idx], ...data, updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      if (oldStatus === 'published' || oldStatus === 'delisted') {
        skills[idx].status = 'modified';
      }
    }
    return ok(skills[idx < 0 ? 0 : idx]);
  }
  if (/^\/skills\/[^/]+$/.test(path) && method === 'delete') {
    const sid = path.split('/').pop();
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) skills.splice(idx, 1);
    delete skillFiles[sid!];
    return ok(null);
  }
  // Skill 文件列表
  if (/^\/skills\/[^/]+\/files$/.test(path) && method === 'get') {
    const sid = path.split('/')[2];
    return ok(skillFiles[sid] || []);
  }
  // Skill 文件内容（GET /skills/:id/files/:path）
  if (/^\/skills\/[^/]+\/files\//.test(path) && method === 'get') {
    const parts = path.split('/');
    const sid = parts[2];
    const filePath = parts.slice(4).join('/');
    const key = `${sid}:${filePath}`;
    const content = skillFileContents[key] || '';
    return ok({ content });
  }
  if (/^\/skills\/[^/]+\/files\//.test(path) && method === 'put') {
    const parts = path.split('/');
    const sid = parts[2];
    const filePath = parts.slice(4).join('/');
    const key = `${sid}:${filePath}`;
    skillFileContents[key] = data?.content || '';
    return ok(null);
  }

  // Marketplace
  if (path === '/skills/marketplace') return paginate(marketplaceSkills, p.page, p.page_size, p.search);
  if (/^\/skills\/marketplace\/[^/]+\/install$/.test(path)) return ok(null);

  // 审核记录
  if (path === '/review/records' && method === 'get') {
    let filtered = reviewRecords;
    if (p.type) filtered = filtered.filter(r => r.type === p.type);
    if (p.status) filtered = filtered.filter(r => r.status === p.status);
    return paginate(filtered, p.page, p.page_size, p.search);
  }
  if (/^\/review\/[^/]+\/approve$/.test(path) && method === 'post') {
    const rid = path.split('/')[2];
    const idx = reviewRecords.findIndex(r => r.id === rid);
    if (idx >= 0) {
      reviewRecords[idx] = { ...reviewRecords[idx], status: 'approved', reviewer: 'u-admin', reviewed_at: new Date().toISOString(), review_reason: null };
      const skillIdx = skills.findIndex(s => s.id === reviewRecords[idx].target_id);
      if (skillIdx >= 0) {
        const scopeType = data?.scope_type || 'all';
        const scopeRoleIds = data?.scope_role_ids || [];
        skills[skillIdx] = {
          ...skills[skillIdx], status: 'published',
          scope: scopeType === 'all' ? 'company' : 'private',
          scope_role_ids: scopeType === 'roles' ? scopeRoleIds : undefined,
          updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
      }
    }
    return ok(idx >= 0 ? reviewRecords[idx] : null);
  }
  if (/^\/review\/[^/]+\/reject$/.test(path) && method === 'post') {
    const rid = path.split('/')[2];
    const idx = reviewRecords.findIndex(r => r.id === rid);
    if (idx >= 0) {
      reviewRecords[idx] = { ...reviewRecords[idx], status: 'rejected', reviewer: 'u-admin', reviewed_at: new Date().toISOString(), review_reason: data?.reason || '审核未通过' };
      const skillIdx = skills.findIndex(s => s.id === reviewRecords[idx].target_id);
      if (skillIdx >= 0) skills[skillIdx] = { ...skills[skillIdx], status: 'rejected', reject_reason: data?.reason || '审核未通过', updated_at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    }
    return ok(idx >= 0 ? reviewRecords[idx] : null);
  }

  // 统一资源权限
  if (path === '/resource-acl' && method === 'get') {
    let list = [...resourceAcls];
    if (p.resource_type) list = list.filter(a => a.resource_type === p.resource_type);
    return ok(list);
  }
  if (/^\/resource-acl\/[^/]+\/[^/]+$/.test(path) && method === 'get') {
    const parts = path.split('/');
    const rtype = parts[2]; const rid = parts[3];
    return ok(resourceAcls.filter(a => a.resource_type === rtype && a.resource_id === rid));
  }
  if (/^\/resource-acl\/[^/]+\/[^/]+$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const rtype = parts[2]; const rid = parts[3];
    const newAcl = { id: 'acl-' + Date.now(), resource_type: rtype, resource_id: rid, ...data };
    resourceAcls.push(newAcl);
    return ok(newAcl);
  }
  if (/^\/resource-acl\/[^/]+\/[^/]+\/[^/]+$/.test(path) && method === 'put') {
    const parts = path.split('/');
    const aclId = parts[4];
    const idx = resourceAcls.findIndex(a => a.id === aclId);
    if (idx >= 0) resourceAcls[idx] = { ...resourceAcls[idx], ...data };
    return ok(idx >= 0 ? resourceAcls[idx] : data);
  }
  if (/^\/resource-acl\/[^/]+\/[^/]+\/[^/]+$/.test(path) && method === 'delete') {
    const parts = path.split('/');
    const aclId = parts[4];
    const idx = resourceAcls.findIndex(a => a.id === aclId);
    if (idx >= 0) resourceAcls.splice(idx, 1);
    return ok(null);
  }

  // 前台权限管理（角色级）
  if (path === '/front-perm/resources' && method === 'get') {
    let list = [...frontPermResources];
    if (p.resource_type) list = list.filter(r => r.resource_type === p.resource_type);
    if (p.status) list = list.filter(r => r.status === p.status);
    if (p.search) {
      const kw = (p.search as string).toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(kw) || r.owner_name.includes(p.search));
    }
    if (p.idle === '1') list = list.filter(r => r.use_count_30d === 0);
    // 附加授权概况
    const enriched = list.map(r => {
      const acls = frontPermRoleAcls.filter(a => a.resource_type === r.resource_type && a.resource_id === r.resource_id);
      const editCount = acls.filter(a => a.perm === 'edit').length;
      const viewCount = acls.filter(a => a.perm === 'view').length;
      return { ...r, edit_role_count: editCount, view_role_count: viewCount };
    });
    return paginate(enriched, p.page, p.page_size);
  }
  if (/^\/front-perm\/acl\/[^/]+\/[^/]+$/.test(path) && method === 'get') {
    const parts = path.split('/');
    const rtype = parts[3]; const rid = parts[4];
    return ok(frontPermRoleAcls.filter(a => a.resource_type === rtype && a.resource_id === rid));
  }
  if (/^\/front-perm\/acl\/[^/]+\/[^/]+$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const rtype = parts[3]; const rid = parts[4];
    const newAcl = { id: 'fpa-' + Date.now(), resource_type: rtype, resource_id: rid, ...data };
    frontPermRoleAcls.push(newAcl);
    return ok(newAcl);
  }
  if (/^\/front-perm\/acl\/[^/]+\/[^/]+\/[^/]+$/.test(path) && method === 'delete') {
    const parts = path.split('/');
    const aclId = parts[5];
    const idx = frontPermRoleAcls.findIndex(a => a.id === aclId);
    if (idx >= 0) frontPermRoleAcls.splice(idx, 1);
    return ok(null);
  }
  if (path === '/front-perm/roles' && method === 'get') {
    return ok(allRoles.filter(r => r.status === 'active'));
  }
  if (/^\/front-perm\/resources\/[^/]+\/toggle$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const resId = parts[3];
    const idx = frontPermResources.findIndex(r => r.id === resId);
    if (idx >= 0) {
      const res = frontPermResources[idx];
      if (res.resource_type === 'skill') {
        res.status = res.status === 'published' ? 'disabled' : 'published';
      } else {
        res.status = res.status === 'active' ? 'disabled' : 'active';
      }
    }
    return ok(frontPermResources[idx]);
  }
  if (/^\/front-perm\/resources\/[^/]+\/transfer$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const resId = parts[3];
    const idx = frontPermResources.findIndex(r => r.id === resId);
    if (idx >= 0) { frontPermResources[idx].owner_name = data.owner_name; frontPermResources[idx].owner_dept = data.owner_dept; }
    return ok(frontPermResources[idx]);
  }
  if (/^\/front-perm\/resources\/[^/]+$/.test(path) && method === 'delete') {
    const parts = path.split('/');
    const resId = parts[3];
    const idx = frontPermResources.findIndex(r => r.id === resId);
    if (idx >= 0) {
      const removed = frontPermResources[idx];
      frontPermResources.splice(idx, 1);
      // 同步清除关联权限记录
      for (let i = frontPermRoleAcls.length - 1; i >= 0; i--) {
        if (frontPermRoleAcls[i].resource_type === removed.resource_type && frontPermRoleAcls[i].resource_id === removed.resource_id) {
          frontPermRoleAcls.splice(i, 1);
        }
      }
    }
    return ok(null);
  }

  // Tokens
  if (path === '/tokens' && method === 'get') return paginate(tokens, p.page, p.page_size, p.search);
  if (path === '/tokens' && method === 'post') {
    const cfg = data.credential_config || {};
    let tokenValue = '';
    const ct = data.credential_type || 'api_key';
    if (ct === 'api_key' && cfg.api_key) {
      tokenValue = cfg.api_key;
    } else if (ct === 'bearer' && cfg.bearer_token) {
      tokenValue = cfg.bearer_token;
    } else if (ct === 'basic' && cfg.username) {
      tokenValue = 'Basic ' + btoa(cfg.username + ':' + (cfg.password || ''));
    } else if (ct === 'oauth2' && cfg.client_id) {
      tokenValue = cfg.client_id + ':' + (cfg.client_secret || '');
    } else if (ct === 'jwt' && cfg.issuer) {
      tokenValue = 'jwt_' + cfg.issuer.replace(/[^a-z0-9]/gi, '_') + '_' + Date.now().toString(36).slice(-6);
    }
    if (!tokenValue) {
      tokenValue = 'oc_tk_' + ct + '_' + Math.random().toString(36).slice(2, 10);
    }
    const newToken = {
      id: 'tk-' + Date.now(),
      token_value: tokenValue,
      ...data,
    };
    tokens.push(newToken);
    return ok(newToken);
  }
  if (/^\/tokens\/[^/]+$/.test(path) && method === 'get') {
    const tid = path.split('/').pop();
    const token = tokens.find(t => t.id === tid);
    return ok(token || null);
  }
  if (/^\/tokens\/[^/]+$/.test(path) && method === 'put') {
    const tid = path.split('/').pop();
    const idx = tokens.findIndex(t => t.id === tid);
    if (idx >= 0) tokens[idx] = { ...tokens[idx], ...data };
    return ok(tokens[idx < 0 ? 0 : idx]);
  }
  if (/^\/tokens\/[^/]+$/.test(path) && method === 'delete') {
    const tid = path.split('/').pop();
    const idx = tokens.findIndex(t => t.id === tid);
    if (idx >= 0) tokens.splice(idx, 1);
    return ok(null);
  }

  // Approvals
  if (path === '/approvals' && method === 'get') return paginate(approvals, p.page, p.page_size, p.search);
  if (/^\/approvals\/[^/]+$/.test(path) && method === 'get') return ok(approvals[0]);
  if (/^\/approvals\/[^/]+\/approve$/.test(path)) return ok(null);
  if (/^\/approvals\/[^/]+\/reject$/.test(path)) return ok(null);

  // Quotas
  if (path === '/quotas' && method === 'get') return paginate(quotas, p.page, p.page_size, p.search);
  if (/^\/quotas\/[^/]+$/.test(path) && method === 'get') return ok(quotas[0]);
  if (/^\/quotas\/[^/]+$/.test(path) && method === 'put') return ok(data);

  // Audit
  if (path === '/audit/logs') return paginate(auditLogs, p.page, p.page_size, p.search);

  // K8s
  if (path === '/system/k8s/pods') return ok(k8sPods);
  if (path === '/system/k8s/nodes') return ok(k8sNodes);
  if (path === '/system/k8s/clusters') return ok(k8sClusters);
  if (/^\/system\/k8s\/clusters\/[^/]+$/.test(path) && method === 'get') {
    const cid = path.split('/').pop();
    return ok(k8sClusters.find(c => c.id === cid) || null);
  }

  // Queues
  if (path === '/system/queues') return ok(queueStats);
  if (/^\/system\/queues\/failed\/[^/]+\/retry$/.test(path)) return ok(null);
  if (path === '/system/queues/failed' && method === 'delete') return ok(null);

  // Restart
  if (/^\/system\/restart\/[^/]+$/.test(path)) return ok(null);

  // Compose Stacks（服务重启）
  if (path === '/system/stacks' && method === 'get') {
    const q = String(p.q || '').trim().toLowerCase();
    let list = stackList.map((s: any) => ({
      id: s.id, name: s.name, directory: s.directory,
      compose_file: s.compose_file, health: s.health, health_label: s.health_label,
      is_platform_self: s.is_platform_self,
      running_count: s.running_count, total_count: s.total_count,
    }));
    if (q) list = list.filter((s: any) => s.name.toLowerCase().includes(q));
    return ok(list);
  }
  const stackMatch = path.match(/^\/system\/stacks\/([^/]+)$/);
  if (stackMatch && method === 'get') {
    const st = stackList.find(s => s.id === stackMatch[1]);
    return ok(st ? buildStackDetail(st) : null);
  }
  const stackYamlMatch = path.match(/^\/system\/stacks\/([^/]+)\/compose$/);
  if (stackYamlMatch && method === 'get') {
    const st = stackList.find(s => s.id === stackYamlMatch[1]);
    return ok(st ? { compose_file: st.compose_file, yaml: st.compose_yaml } : null);
  }
  if (stackYamlMatch && method === 'put') {
    const st = stackList.find(s => s.id === stackYamlMatch[1]);
    if (st && data && typeof data.yaml === 'string') {
      st.compose_yaml = data.yaml;
    }
    return ok(null);
  }
  const stackLogMatch = path.match(/^\/system\/stacks\/([^/]+)\/logs$/);
  if (stackLogMatch && method === 'get') {
    const st = stackList.find(s => s.id === stackLogMatch[1]);
    return ok({ stack_name: st?.name || '', log: '{"code":500,"msg":"操作失败"}' });
  }
  const stackActionMatch = path.match(/^\/system\/stacks\/([^/]+)\/(restart|start|stop|pause|pull)$/);
  if (stackActionMatch && method === 'post') {
    return ok(null);
  }

  // Health
  if (path === '/system/health') return ok(systemHealth);

  // Platform SN
  if (path === '/system/platform-sn') return ok(platformSn);

  // Remote Management
  if (path === '/system/remote-management' && method === 'get') return ok(remoteManagement);
  if (path === '/system/remote-management' && method === 'put') {
    Object.assign(remoteManagement, data);
    return ok(remoteManagement);
  }

  // Config Backups (legacy)
  if (path === '/system/config-backups' && method === 'get') return ok(configBackups);
  if (path === '/system/config-backups' && method === 'post') {
    const now = new Date().toISOString().replace('Z', '');
    const item = {
      id: 'cb-' + Date.now(),
      name: data?.name || '手动备份',
      description: data?.description || '',
      storage_type: data?.storage_type || 'OSS',
      size_mb: 2.3,
      status: 'success',
      creator: '管理员',
      created_at: now,
    };
    configBackups.unshift(item);
    return ok(item);
  }
  if (/^\/system\/config-backups\/[^/]+\/restore$/.test(path) && method === 'post') {
    return ok({ task_id: 'rt-' + Date.now() });
  }

  // Backup Rules CRUD
  if (path === '/system/backup-rules' && method === 'get') return ok(backupRules);
  if (path === '/system/backup-rules' && method === 'post') {
    const newRule = { id: 'rule-' + Date.now(), ...data, enabled: true, last_run_at: null, created_at: new Date().toISOString() };
    backupRules.push(newRule);
    return ok(newRule);
  }
  if (/^\/system\/backup-rules\/[^/]+$/.test(path) && method === 'put') {
    const rId = path.split('/').pop();
    const rule = backupRules.find((r: any) => r.id === rId);
    if (rule) { Object.assign(rule, data); return ok(rule); }
    return [404, { code: 404, message: 'Not found' }];
  }
  if (/^\/system\/backup-rules\/[^/]+$/.test(path) && method === 'delete') {
    const rId = path.split('/').pop();
    const idx = backupRules.findIndex((r: any) => r.id === rId);
    if (idx >= 0) { backupRules.splice(idx, 1); return ok(null); }
    return [404, { code: 404, message: 'Not found' }];
  }

  // Backup Files
  if (path === '/system/backup-files' && method === 'get') return ok(backupFiles);

  // Backup Records
  if (path === '/system/backup-records' && method === 'get') return ok(backupRecords);
  if (/^\/system\/backup-records\/[^/]+\/rerun$/.test(path) && method === 'post') {
    const recordId = path.split('/')[3];
    const record = backupRecords.find((r: any) => r.id === recordId);
    if (record) {
      const now = new Date();
      const newRecord = {
        id: 'br-' + Date.now(),
        task_name: record.task_name + '-rerun',
        status: 'success',
        started_at: now.toISOString(),
        finished_at: new Date(now.getTime() + 22000).toISOString(),
      };
      backupRecords.unshift(newRecord);
      return ok(newRecord);
    }
    return ok(null);
  }

  // Python Packages
  if (path === '/system/python-packages' && method === 'get') return ok(pythonPackages);
  if (path === '/system/python-packages' && method === 'post') {
    const today = new Date();
    const item = {
      id: 'pp-' + Date.now(),
      name: data?.name || 'unknown',
      description: data?.description || '',
      required_version: data?.required_version || 'latest',
      installed_version: data?.required_version || 'latest',
      status: 'up_to_date',
      module: data?.module || 'custom',
      updated_at: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    };
    pythonPackages.push(item);
    return ok(item);
  }
  if (path === '/system/python-packages/sync' && method === 'post') return ok(null);
  if (/^\/system\/python-packages\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop();
    const idx = pythonPackages.findIndex((p) => p.id === id);
    if (idx >= 0) pythonPackages.splice(idx, 1);
    return ok(null);
  }
  if (/^\/system\/python-packages\/[^/]+\/upgrade$/.test(path) && method === 'post') {
    const id = path.split('/')[3];
    const item = pythonPackages.find((p) => p.id === id);
    if (item) {
      item.installed_version = item.required_version;
      item.status = 'up_to_date';
      const t = new Date();
      item.updated_at = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    return ok(item);
  }
  if (/^\/system\/python-packages\/[^/]+\/install$/.test(path) && method === 'post') {
    const id = path.split('/')[3];
    const item = pythonPackages.find((p) => p.id === id);
    if (item) {
      item.installed_version = item.required_version;
      item.status = 'up_to_date';
      const t = new Date();
      item.updated_at = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }
    return ok(item);
  }

  // Network ACL
  if (path === '/system/network-acl' && method === 'get') return ok(networkAcl);
  if (path === '/system/network-acl' && method === 'post') {
    const item = {
      id: 'na-' + Date.now(),
      target: data?.target || '',
      label: data?.label || '',
      direction: data?.direction || 'inbound',
      status: data?.status || 'active',
      description: data?.description || '',
      creator: '管理员',
    };
    networkAcl.unshift(item);
    return ok(item);
  }
  if (/^\/system\/network-acl\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop();
    const idx = networkAcl.findIndex((x) => x.id === id);
    if (idx >= 0) networkAcl[idx] = { ...networkAcl[idx], ...data, id };
    return ok(networkAcl[idx]);
  }
  if (/^\/system\/network-acl\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop();
    const idx = networkAcl.findIndex((x) => x.id === id);
    if (idx >= 0) networkAcl.splice(idx, 1);
    return ok(null);
  }

  // Pods
  if (path === '/system/pods' && method === 'get') return ok(podList);
  if (/^\/system\/pods\/[^/]+$/.test(path) && method === 'get') {
    const pid = path.split('/').pop();
    const pod = podList.find((p) => p.id === pid) || podList[0];
    return ok(buildPodDetail(pod));
  }

  // AGENTS.md 模板文件
  if (path === '/system/agents-md/files' && method === 'get') {
    return ok(
      agentsMdFiles.map((f) => ({
        name: f.name,
        description: f.description,
        size: new TextEncoder().encode(f.content).length,
        updatedAt: f.updatedAt,
      }))
    );
  }
  if (/^\/system\/agents-md\/files\/[^/]+$/.test(path) && method === 'get') {
    const name = decodeURIComponent(path.split('/').pop() || '');
    const f = agentsMdFiles.find((x) => x.name === name);
    if (!f) return { code: 404, message: 'not found', data: null };
    return ok({
      name: f.name,
      description: f.description,
      content: f.content,
      updatedAt: f.updatedAt,
      size: new TextEncoder().encode(f.content).length,
    });
  }
  if (/^\/system\/agents-md\/files\/[^/]+$/.test(path) && method === 'put') {
    const name = decodeURIComponent(path.split('/').pop() || '');
    const idx = agentsMdFiles.findIndex((x) => x.name === name);
    if (idx < 0) return { code: 404, message: 'not found', data: null };
    if (typeof data?.content === 'string') agentsMdFiles[idx].content = data.content;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    agentsMdFiles[idx].updatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return ok(agentsMdFiles[idx]);
  }

  // =================== 智能报告 ===================
  // 报告模板 CRUD
  if (path === '/reports/templates' && method === 'get') {
    return ok(reportTemplates);
  }
  if (path === '/reports/templates' && method === 'post') {
    const tpl = { id: 'tpl-' + Date.now(), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    reportTemplates.unshift(tpl);
    return ok(tpl);
  }
  if (/^\/reports\/templates\/[^/]+$/.test(path) && method === 'put') {
    const tid = path.split('/').pop();
    const idx = reportTemplates.findIndex((t: any) => t.id === tid);
    if (idx < 0) return { code: 404, message: 'not found', data: null };
    reportTemplates[idx] = { ...reportTemplates[idx], ...data, updated_at: new Date().toISOString() };
    return ok(reportTemplates[idx]);
  }
  if (/^\/reports\/templates\/[^/]+$/.test(path) && method === 'delete') {
    const tid = path.split('/').pop();
    const idx = reportTemplates.findIndex((t: any) => t.id === tid);
    if (idx >= 0) reportTemplates.splice(idx, 1);
    return ok(null);
  }

  // 报告配置 CRUD
  if (path === '/reports/configs' && method === 'get') {
    return paginate(reportConfigs, p.page, p.page_size, p.search);
  }
  if (path === '/reports/configs' && method === 'post') {
    const dept = organizations.find((o: any) => o.id === data.department_id);
    const agent = agents.find((a: any) => a.id === data.agent_id);
    const tpl = reportTemplates.find((t: any) => t.id === data.template_id);
    const nc = {
      id: 'rc-' + Date.now(), ...data,
      department_name: dept?.name || '',
      agent_name: agent?.name || '',
      template_name: tpl?.name || '',
      last_generated_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    reportConfigs.unshift(nc);
    return ok(nc);
  }
  if (/^\/reports\/configs\/[^/]+$/.test(path) && method === 'put') {
    const cid = path.split('/').pop();
    const idx = reportConfigs.findIndex((c: any) => c.id === cid);
    if (idx < 0) return { code: 404, message: 'not found', data: null };
    const dept = organizations.find((o: any) => o.id === data.department_id);
    const agent = agents.find((a: any) => a.id === data.agent_id);
    const tpl = reportTemplates.find((t: any) => t.id === data.template_id);
    reportConfigs[idx] = {
      ...reportConfigs[idx], ...data,
      department_name: dept?.name || data.department_name || '',
      agent_name: agent?.name || data.agent_name || '',
      template_name: tpl?.name || data.template_name || '',
      updated_at: new Date().toISOString(),
    };
    return ok(reportConfigs[idx]);
  }
  if (/^\/reports\/configs\/[^/]+$/.test(path) && method === 'delete') {
    const cid = path.split('/').pop();
    const idx = reportConfigs.findIndex((c: any) => c.id === cid);
    if (idx >= 0) reportConfigs.splice(idx, 1);
    return ok(null);
  }
  if (/^\/reports\/configs\/[^/]+\/toggle$/.test(path) && method === 'post') {
    const cid = path.split('/')[3];
    const config = reportConfigs.find((c: any) => c.id === cid);
    if (config) config.enabled = !config.enabled;
    return ok(config || null);
  }
  if (/^\/reports\/configs\/[^/]+\/trigger$/.test(path) && method === 'post') {
    const cid = path.split('/')[3];
    const config = reportConfigs.find((c: any) => c.id === cid);
    if (!config) return { code: 404, message: 'not found', data: null };
    // 模拟 Agent 执行记录
    const agent = agents.find((a: any) => a.id === config.agent_id);
    if (agent) {
      agent.last_run_at = new Date().toISOString();
      agentRuns.unshift({
        id: 'ar-' + Date.now(), agent_id: agent.id, agent_name: agent.name,
        trigger_type: 'manual', status: 'completed',
        duration_ms: Math.floor(Math.random() * 8000) + 3000,
        model_tokens: Math.floor(Math.random() * 3000) + 1000,
        input_tokens: Math.floor(Math.random() * 2000) + 500,
        output_tokens: Math.floor(Math.random() * 1500) + 300,
        cost: Number((Math.random() * 0.08).toFixed(4)),
        created_at: new Date().toISOString(),
      });
    }
    config.last_generated_at = new Date().toISOString();
    // 生成新报告实例：按 block_configs 逐块生成对应类型的结构化数据
    const weekInfo = getWeekInfo();
    const dept = organizations.find((o: any) => o.id === config.department_id);
    const tpl = reportTemplates.find((t: any) => t.id === config.template_id);
    const tplBlocks = tpl?.blocks || [];
    const cfgList = config.block_configs || [];
    const blocks = tplBlocks.map((tb: any) => {
      const bc = cfgList.find((c: any) => c.key === tb.variable_key) || { config: {} };
      const bcCfg = bc.config || {};
      const commonBlock: any = { block_id: tb.id, type: tb.type, title: tb.title };
      if (tb.type === 'metrics_card') {
        const metrics = (bcCfg.metrics || []).map((m: any) => {
          const isPercent = m.format === 'percent';
          const isFloat = m.format === 'float';
          const base = isPercent ? 90 + Math.random() * 9 : (isFloat ? Math.random() * 500 : Math.floor(Math.random() * 90000) + 10000);
          return { name: m.name, value: isPercent ? +base.toFixed(1) : (isFloat ? +base.toFixed(1) : Math.floor(base)), unit: m.unit, change: +(Math.random() * 10 - 3).toFixed(1), trend: m.trend || 'neutral' };
        });
        return { ...commonBlock, data: metrics };
      }
      if (tb.type === 'chart_image') {
        return { ...commonBlock, data: { chart_title: bcCfg.chart_title || tb.title, chart_type: bcCfg.chart_type || 'line', caption: bcCfg.chart_title || tb.title, alt: bcCfg.chart_title || tb.title, image_url: '' } };
      }
      if (tb.type === 'data_table') {
        const cols = bcCfg.columns || [];
        const headers = cols.map((c: any) => c.header);
        const rowCnt = Math.min(bcCfg.max_rows || 10, 8);
        const rows: string[][] = [];
        for (let i = 0; i < rowCnt; i++) {
          rows.push(cols.map((c: any) => {
            if (c.align === 'right') return String(Math.floor(Math.random() * 10000));
            return `${c.header}-${i + 1}`;
          }));
        }
        return { ...commonBlock, data: { headers, rows } };
      }
      if (tb.type === 'rich_text') {
        const topic = bcCfg.topic || tb.title;
        return { ...commonBlock, data: { content: `【${topic}】本期报告由 Agent 按配置指令自动生成，覆盖${bcCfg.angle || '整体'}角度，字数约 ${bcCfg.word_limit || 300} 字。核心指标整体表现${Math.random() > 0.5 ? '优于预期' : '符合预期'}，重点建议已提炼如下。` } };
      }
      if (tb.type === 'bullet_list') {
        const cnt = Math.min(bcCfg.max_items || 5, 5);
        const kind = bcCfg.list_kind || 'item';
        const items = Array.from({ length: cnt }).map((_, i) => `${kind === 'risk' ? '风险' : kind === 'plan' ? '计划' : kind === 'alert' ? '告警' : '亮点'} ${i + 1}：${tb.title} 相关内容`);
        return { ...commonBlock, data: { items } };
      }
      return { ...commonBlock, data: {} };
    });
    const newReport: any = {
      id: 'rpt-' + Date.now(), config_id: config.id, template_id: config.template_id,
      title: config.scope === 'company'
        ? `全公司${config.period === 'daily' ? '日报' : config.period === 'weekly' ? '运营周报' : '月报'}（第${weekInfo.week}周）`
        : `${dept?.name || config.department_name} ${weekInfo.year}年第${weekInfo.week}周${config.period === 'daily' ? '日报' : config.period === 'weekly' ? '周报' : '月报'}`,
      scope: config.scope, department_id: config.department_id, department_name: dept?.name || config.department_name || '',
      period: config.period, period_start: weekInfo.week_start, period_end: weekInfo.week_end,
      agent_id: config.agent_id, agent_name: config.agent_name,
      status: 'published', published_at: new Date().toISOString(),
      blocks,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    reports.unshift(newReport);
    return ok(newReport);
  }

  // 报告实例查询
  if (path === '/reports/list' && method === 'get') {
    let filtered: any[] = [...reports];
    if (p.scope) filtered = filtered.filter(r => r.scope === p.scope);
    if (p.period) filtered = filtered.filter(r => r.period === p.period);
    if (p.department_id) filtered = filtered.filter(r => r.department_id === p.department_id);
    if (p.status) filtered = filtered.filter(r => r.status === p.status);
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return paginate(filtered, p.page, p.page_size, p.search);
  }
  if (/^\/reports\/[^/]+$/.test(path) && method === 'get' && !path.includes('/templates') && !path.includes('/configs') && !path.includes('/list')) {
    const rid = path.split('/').pop();
    return ok(reports.find(r => r.id === rid) || null);
  }
  if (/^\/reports\/[^/]+\/export$/.test(path) && method === 'get') {
    const rid = path.split('/')[2];
    const report = reports.find(r => r.id === rid);
    if (!report) return { code: 404, message: 'not found', data: null };
    const md = report.blocks.map((b: any) => {
      if (b.type === 'rich_text') return `## ${b.title}\n${b.data.content}`;
      if (b.type === 'bullet_list') return `## ${b.title}\n${b.data.items.map((i: string) => `- ${i}`).join('\n')}`;
      if (b.type === 'metrics_card') return `## ${b.title}\n${b.data.map((m: any) => `- ${m.name}: ${m.value}${m.unit} (环比${m.change >= 0 ? '+' : ''}${m.change})`).join('\n')}`;
      return `## ${b.title}`;
    }).join('\n\n');
    return ok({ format: 'markdown', content: `# ${report.title}\n\n${md}`, filename: `${report.title}.md` });
  }
  // 部门列表（复用）
  if (path === '/reports/departments' && method === 'get') {
    return ok(organizations.filter((o: any) => o.type !== 'company'));
  }
  // 报告元数据（分发能力增强 ①）
  if (path === '/report-meta' && method === 'get') {
    const rid = p.report_id;
    const meta = reportMeta.find((m: any) => m.report_id === rid) || null;
    return ok(meta);
  }
  if (path === '/report-meta' && method === 'post') {
    const idx = reportMeta.findIndex((m: any) => m.report_id === data.report_id);
    if (idx >= 0) reportMeta[idx] = { ...reportMeta[idx], ...data };
    else reportMeta.push({ ...data });
    return ok(idx >= 0 ? reportMeta[idx] : reportMeta[reportMeta.length - 1]);
  }
  // 报告 发布/下架/撤回
  if (/^\/reports\/[^/]+\/publish$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = reports.findIndex((r: any) => r.id === id);
    if (idx >= 0) {
      reports[idx] = { ...reports[idx], ...data, status: 'pending', updated_at: new Date().toISOString() };
      reviewRecords.unshift({
        id: 'rv-' + Date.now(), type: 'report_publish', target_id: id, target_name: reports[idx].title,
        applicant: 'u-1', applicant_name: 'Admin', applicant_dept: '技术部',
        scope: 'department', version: data.version || '1.0.0', changelog: data.changelog || '',
        submitted_at: new Date().toISOString(), status: 'pending', reviewer: null, review_reason: null, reviewed_at: null,
      });
    }
    return ok({ status: 'pending' });
  }
  if (/^\/reports\/[^/]+\/delist$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = reports.findIndex((r: any) => r.id === id);
    if (idx >= 0) reports[idx] = { ...reports[idx], status: 'delisted', updated_at: new Date().toISOString() };
    return ok(null);
  }
  if (/^\/reports\/[^/]+\/cancel$/.test(path) && method === 'post') {
    const id = path.split('/')[2];
    const idx = reports.findIndex((r: any) => r.id === id);
    if (idx >= 0) reports[idx] = { ...reports[idx], status: 'draft', updated_at: new Date().toISOString() };
    return ok(null);
  }
  // 报告 我创建的
  if (path === '/reports/my' && method === 'get') {
    const myReports = reports.filter(r => r.owner_id === 'u-1' || !r.owner_id);
    return paginate(myReports, p.page, p.page_size, p.search);
  }
  // 报告 我安装的
  if (path === '/reports/installed' && method === 'get') {
    return paginate(reports.filter((r: any) => r.status === 'published'), p.page, p.page_size, p.search);
  }
  // 报告 我安装的 - 详情
  if (/^\/reports\/installed\/[^/]+$/.test(path) && method === 'get') {
    const itemId = path.split('/')[3];
    const src = reports.filter((r: any) => r.status === 'published');
    const found = src.find((r: any) => r.id === itemId);
    const r = found || src[0];
    if (!r) return ok(null);
    return ok({
      id: r.id, name: r.title, title: r.title,
      description: `${r.department_name || ''}${r.period === 'weekly' ? '周报' : '报告'}，由 ${r.agent_name || '系统'} 自动生成`,
      owner_name: r.agent_name || '系统', owner_dept: r.department_name || '',
      scope: r.scope || 'department', version: '1.0.0',
      is_beta: false, installed_at: r.updated_at || r.published_at,
      period: r.period, department_name: r.department_name,
    });
  }
  // 报告 卸载
  if (/^\/reports\/[^/]+\/uninstall$/.test(path) && method === 'post') {
    return ok(null);
  }

  // =================== RAG 知识库 ===================
  if (path === '/rag/knowledge-bases' && method === 'get') {
    return paginate(knowledgeBases, p.page, p.page_size, p.search);
  }
  if (path === '/rag/knowledge-bases' && method === 'post') {
    const newKB = {
      id: 'kb-' + Date.now(), ...data,
      doc_count: 0, vector_count: 0, status: 'active',
      creator: '当前用户', created_at: new Date().toISOString(),
    };
    knowledgeBases.unshift(newKB);
    return ok(newKB);
  }
  if (/^\/rag\/knowledge-bases\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop();
    const kb = knowledgeBases.find(k => k.id === id);
    if (kb) Object.assign(kb, data);
    return ok(kb);
  }
  if (/^\/rag\/knowledge-bases\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop();
    const idx = knowledgeBases.findIndex(k => k.id === id);
    if (idx >= 0) {
      knowledgeBases.splice(idx, 1);
      // 同步删除关联文档
      for (let i = ragDocuments.length - 1; i >= 0; i--) {
        if (ragDocuments[i].kb_id === id) ragDocuments.splice(i, 1);
      }
    }
    return ok(null);
  }

  // =================== RAG 文档 ===================
  if (path === '/rag/documents' && method === 'get') {
    let filtered = ragDocuments;
    if (p.kb_id) filtered = filtered.filter(d => d.kb_id === p.kb_id);
    return paginate(filtered, p.page, p.page_size, p.search);
  }
  if (path === '/rag/documents' && method === 'post') {
    const newDoc = {
      id: 'doc-' + Date.now(), ...data,
      chunk_count: 0, vector_count: 0, status: 'processing',
      uploaded_by: '当前用户', uploaded_at: new Date().toISOString(),
    };
    ragDocuments.unshift(newDoc);
    // 更新知识库文档数
    const kb = knowledgeBases.find(k => k.id === data.kb_id);
    if (kb) kb.doc_count = ragDocuments.filter(d => d.kb_id === data.kb_id).length;
    // 模拟处理完成
    setTimeout(() => {
      const doc = ragDocuments.find(d => d.id === newDoc.id);
      if (doc) {
        doc.status = 'completed';
        doc.chunk_count = Math.floor(Math.random() * 50) + 10;
        doc.vector_count = doc.chunk_count;
        if (kb) kb.vector_count = ragDocuments
          .filter(d => d.kb_id === data.kb_id && d.status === 'completed')
          .reduce((sum: number, d: any) => sum + d.vector_count, 0);
      }
    }, 3000);
    return ok(newDoc);
  }
  if (/^\/rag\/documents\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop();
    const idx = ragDocuments.findIndex(d => d.id === id);
    if (idx >= 0) {
      const doc = ragDocuments[idx];
      const kbId = doc.kb_id;
      ragDocuments.splice(idx, 1);
      const kb = knowledgeBases.find(k => k.id === kbId);
      if (kb) {
        kb.doc_count = ragDocuments.filter(d => d.kb_id === kbId).length;
        kb.vector_count = ragDocuments
          .filter(d => d.kb_id === kbId && d.status === 'completed')
          .reduce((sum: number, d: any) => sum + d.vector_count, 0);
      }
    }
    return ok(null);
  }
  if (/^\/rag\/documents\/[^/]+\/chunks$/.test(path) && method === 'get') {
    const docId = path.split('/')[3];
    const chunks = docChunks.filter(c => c.doc_id === docId);
    // 如果没有真实分块数据，生成模拟分块
    if (chunks.length === 0) {
      const doc = ragDocuments.find(d => d.id === docId);
      if (doc && doc.chunk_count > 0) {
        const mockChunks = [];
        for (let i = 0; i < Math.min(doc.chunk_count, 5); i++) {
          mockChunks.push({
            id: `chk-${docId}-${i}`, doc_id: docId, kb_id: doc.kb_id,
            chunk_index: i, content: `文档分块 ${i + 1}：这是从文档《${doc.name}》中提取的第 ${i + 1} 个文本片段。包含文档的部分内容，用于向量化检索。`,
            token_count: Math.floor(Math.random() * 200) + 50, score: 0,
          });
        }
        return ok(mockChunks);
      }
    }
    return ok(chunks);
  }

  // =================== RAG 检索测试 ===================
  if (path === '/rag/retrieve' && method === 'post') {
    const { query, kb_id, top_k = 5 } = data;
    // 从指定知识库的分块中模拟检索
    const candidates = docChunks.filter(c => c.kb_id === kb_id);
    const results: any[] = [];
    if (candidates.length > 0) {
      candidates.slice(0, top_k).forEach((chunk, i) => {
        results.push({
          ...chunk,
          score: Number((0.95 - i * 0.08 - Math.random() * 0.05).toFixed(4)),
          doc_name: ragDocuments.find(d => d.id === chunk.doc_id)?.name || '',
        });
      });
    } else {
      // 生成模拟检索结果
      const kb = knowledgeBases.find(k => k.id === kb_id);
      const docs = ragDocuments.filter(d => d.kb_id === kb_id && d.status === 'completed');
      docs.slice(0, top_k).forEach((doc, i) => {
        results.push({
          id: `ret-${Date.now()}-${i}`, doc_id: doc.id, doc_name: doc.name,
          kb_id, chunk_index: 0,
          content: `从《${doc.name}》检索到的相关片段：与查询"${query}"相关的文档内容。该文档属于「${kb?.name || ''}」知识库。`,
          token_count: Math.floor(Math.random() * 200) + 50,
          score: Number((0.92 - i * 0.1 - Math.random() * 0.05).toFixed(4)),
        });
      });
    }
    return ok({ query, kb_id, total: results.length, results });
  }

  // =================== KB 详情 / FAQ / 分析 / Wiki / 文档详情 ===================
  // 获取单个知识库详情
  if (/^\/rag\/knowledge-bases\/[^/]+$/.test(path) && method === 'get') {
    const kbId = path.split('/')[3];
    return ok(knowledgeBases.find(k => k.id === kbId) || null);
  }
  // FAQ 列表
  if (path === '/rag/faq' && method === 'get') {
    let filtered = kbFaqItems;
    if (p.kb_id) filtered = filtered.filter(f => f.kb_id === p.kb_id);
    return paginate(filtered, p.page, p.page_size, p.search);
  }
  // FAQ 新增
  if (path === '/rag/faq' && method === 'post') {
    const newFaq = { id: `faq-${Date.now()}`, kb_id: data.kb_id, question: data.question, answer: data.answer, status: 'published', tags: data.tags || [], created_at: new Date().toISOString() };
    kbFaqItems.push(newFaq);
    return ok(newFaq);
  }
  // FAQ 删除
  if (/^\/rag\/faq\/[^/]+$/.test(path) && method === 'delete') {
    const faqId = path.split('/')[3];
    const idx = kbFaqItems.findIndex(f => f.id === faqId);
    if (idx >= 0) kbFaqItems.splice(idx, 1);
    return ok({ success: true });
  }
  // 检索分析
  if (/^\/rag\/knowledge-bases\/[^/]+\/analytics$/.test(path) && method === 'get') {
    const kbId = path.split('/')[3];
    return ok(kbAnalytics[kbId] || { metrics: { monthly_retrievals: 0, avg_latency_ms: 0, hit_rate: 0, no_match_rate: 0 }, topics: [] });
  }
  // 文档详情（含分块、时间线、自动问题）
  if (/^\/rag\/documents\/[^/]+\/detail$/.test(path) && method === 'get') {
    const docId = path.split('/')[3];
    const detail = docDetailData[docId];
    if (detail) return ok(detail);
    // 为没有详细数据的文档生成默认数据
    const doc = ragDocuments.find(d => d.id === docId);
    if (!doc) return ok(null);
    return ok({
      title: doc.name, content_sections: [{ heading: '文档内容', body: '这是文档《' + doc.name + '》的内容预览。' }],
      chunks_with_content: docChunks.filter(c => c.doc_id === docId).map((c, i) => ({ id: c.id, chunk_index: c.chunk_index, relevance: 0.9 - i * 0.05, content: c.content })),
      timeline: [
        { step: '文件接收', status: 'done', detail: '完成' },
        { step: '文本解析', status: 'done', detail: '完成' },
        { step: '分块处理', status: 'done', detail: `生成 ${doc.chunk_count || 10} 个分块` },
        { step: '向量化', status: doc.status === 'completed' ? 'done' : 'processing', detail: doc.status === 'completed' ? '完成' : '处理中' },
      ],
      parse_config: { engine: 'DocReader Auto', chunk_strategy: '固定大小 500/50', embedding: 'BGE-M3 · 1024 维' },
      auto_questions: [], meta: { pages: 0, total_chunks: doc.chunk_count || 0 },
    });
  }
  // Wiki 数据
  if (/^\/rag\/knowledge-bases\/[^/]+\/wiki$/.test(path) && method === 'get') {
    const kbId = path.split('/')[3];
    return ok(wikiData[kbId] || null);
  }
  // Markdown 上传
  if (path === '/rag/documents/markdown' && method === 'post') {
    const newDoc = {
      id: 'doc-md-' + Date.now(), kb_id: data.kb_id, name: data.title + '.md',
      type: 'markdown', size: data.content.length, chunk_count: 0, vector_count: 0,
      status: 'processing', uploaded_by: '当前用户', uploaded_at: new Date().toISOString(),
    };
    ragDocuments.unshift(newDoc);
    const kb = knowledgeBases.find(k => k.id === data.kb_id);
    if (kb) kb.doc_count = ragDocuments.filter(d => d.kb_id === data.kb_id).length;
    setTimeout(() => {
      const doc = ragDocuments.find(d => d.id === newDoc.id);
      if (doc) {
        doc.status = 'completed';
        doc.chunk_count = Math.max(1, Math.floor(data.content.split('\n').length / 5));
        doc.vector_count = doc.chunk_count;
        if (kb) kb.vector_count = ragDocuments
          .filter(d => d.kb_id === data.kb_id && d.status === 'completed')
          .reduce((sum: number, d: any) => sum + d.vector_count, 0);
      }
    }, 2000);
    return ok(newDoc);
  }
  // KB 聊天
  if (path === '/rag/chat' && method === 'post') {
    const responses = [
      '根据知识库中的文档，PCS（储能控制系统）的主要功能包括：电池状态监控、充放电管理、温度控制和安全告警。系统采用分布式架构，支持多机并联运行。',
      '关于液冷系统的维护规程：建议每季度检查一次冷却液液位，每半年更换一次冷却液，每年对管路进行一次全面检查。常见故障包括泵体异响、管路泄漏和温度异常。',
      'BMS（电池管理系统）的告警代码说明：E001 表示电池过压，E002 表示电池欠压，E003 表示温度过高，E004 表示通信故障。处理方法请参考产品手册第 3 章。',
      '根据 EMS（能量管理系统）文档，系统支持多种运行模式：削峰填谷、需量控制、动态增容和虚拟电厂模式。各模式的切换策略和参数配置详见操作手册。',
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    return ok({ message: reply, sources: [{ doc_name: 'PCS产品手册v2.pdf', chunk_index: 1, relevance: 0.92 }, { doc_name: '液冷系统维护规程.docx', chunk_index: 3, relevance: 0.85 }] });
  }

  // =================== 知识库协作者（权限）===================
  const kbCollaborators: Record<string, any[]> = {
    'kb-1': [
      { principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
      { principal_type: 'user', user_id: 'u-2', name: '李娜', role: 'admin' },
      { principal_type: 'user', user_id: 'u-4', name: '赵敏', role: 'editor' },
      { principal_type: 'user', user_id: 'u-5', name: '孙丽', role: 'viewer' },
      { principal_type: 'department', dept_id: 'pg-1', name: '技术部', member_count: 12, role: 'viewer' },
    ],
    'kb-2': [
      { principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' },
      { principal_type: 'user', user_id: 'u-3', name: '王强', role: 'admin' },
    ],
  };
  const getKbCollaborators = (id: string) => kbCollaborators[id] || [{ principal_type: 'user', user_id: 'u-1', name: '张伟', role: 'owner' }];

  if (/^\/rag\/knowledge-bases\/[^/]+\/collaborators$/.test(path) && method === 'get') {
    const id = path.split('/')[3];
    return ok(getKbCollaborators(id));
  }
  if (/^\/rag\/knowledge-bases\/[^/]+\/collaborators$/.test(path) && method === 'post') {
    const id = path.split('/')[3];
    const list = kbCollaborators[id] || (kbCollaborators[id] = getKbCollaborators(id).slice());
    if (data?.principal_type === 'department') {
      list.push({ principal_type: 'department', dept_id: data?.dept_id, name: data?.name, member_count: data?.member_count || 0, role: data?.role || 'viewer' });
    } else {
      list.push({ principal_type: 'user', user_id: data?.user_id, name: data?.name, role: data?.role || 'viewer' });
    }
    return ok(list);
  }
  if (/^\/rag\/knowledge-bases\/[^/]+\/collaborators\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/')[3];
    const pid = path.split('/')[5];
    const list = kbCollaborators[id] || (kbCollaborators[id] = getKbCollaborators(id).slice());
    const c = list.find((x: any) => x.user_id === pid || x.dept_id === pid);
    if (c) c.role = data?.role;
    return ok(list);
  }
  if (/^\/rag\/knowledge-bases\/[^/]+\/collaborators\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/')[3];
    const pid = path.split('/')[5];
    kbCollaborators[id] = (kbCollaborators[id] || getKbCollaborators(id)).filter((x: any) => x.user_id !== pid && x.dept_id !== pid);
    return ok(kbCollaborators[id]);
  }

  // =================== 工作空间 ===================
  if (path === '/workspace/members' && method === 'get') return paginate(workspaceMembers, p.page, p.page_size, p.search);
  if (path === '/workspace/members' && method === 'post') return ok({ id: 'wm-' + Date.now(), ...data });
  if (/^\/workspace\/members\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/workspace\/members\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (path === '/workspace/organizations' && method === 'get') return paginate(workspaceOrgs, p.page, p.page_size, p.search);
  if (path === '/workspace/organizations' && method === 'post') return ok({ id: 'wo-' + Date.now(), ...data });
  if (/^\/workspace\/organizations\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/workspace\/organizations\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (path === '/workspace/api-keys' && method === 'get') return paginate(workspaceApiKeys, p.page, p.page_size, p.search);
  if (path === '/workspace/api-keys' && method === 'post') return ok({ id: 'wak-' + Date.now(), ...data });
  if (/^\/workspace\/api-keys\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (path === '/workspace/audit-logs' && method === 'get') return paginate(workspaceAuditLogs, p.page, p.page_size, p.search);

  // =================== AI 对话 ===================
  if (path === '/chat/sessions' && method === 'get') {
    return paginate(chatSessions, p.page, p.page_size, p.search);
  }
  if (path === '/chat/sessions' && method === 'post') {
    const newSession = {
      id: 'cs-' + Date.now(), title: data.title || '新对话',
      model_policy: data.model_policy || '通用对话策略',
      kb_id: data.kb_id || '', kb_name: data.kb_name || '',
      agent_id: data.agent_id || '', agent_name: data.agent_name || '',
      message_count: 0, last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    chatSessions.unshift(newSession);
    chatMessages[newSession.id] = [];
    return ok(newSession);
  }
  if (/^\/chat\/sessions\/[^/]+$/.test(path) && method === 'delete') {
    const id = path.split('/').pop()!;
    const idx = chatSessions.findIndex(s => s.id === id);
    if (idx >= 0) chatSessions.splice(idx, 1);
    delete chatMessages[id];
    return ok(null);
  }
  if (/^\/chat\/sessions\/[^/]+\/messages$/.test(path) && method === 'get') {
    const sid = path.split('/')[3];
    return ok(chatMessages[sid] || []);
  }
  if (/^\/chat\/sessions\/[^/]+\/messages$/.test(path) && method === 'post') {
    const sid = path.split('/')[3];
    const session = chatSessions.find(s => s.id === sid);
    if (!session) return { code: 404, message: 'session not found', data: null };
    const userMsg = {
      id: 'msg-' + Date.now(), role: 'user', content: data.content,
      created_at: new Date().toISOString(),
    };
    if (!chatMessages[sid]) chatMessages[sid] = [];
    chatMessages[sid].push(userMsg);
    // 生成AI回复（结构化，含sources）
    const aiResult = generateAIReply(data.content, session);
    const aiMsg = {
      id: 'msg-' + (Date.now() + 1), role: 'assistant', content: aiResult.content,
      created_at: new Date().toISOString(),
      sources: aiResult.sources || undefined,
      agent_action: aiResult.agent_action || undefined,
    };
    chatMessages[sid].push(aiMsg);
    session.message_count = chatMessages[sid].length;
    session.last_message_at = new Date().toISOString();
    if (session.title === '新对话' && data.content) {
      session.title = data.content.slice(0, 20) + (data.content.length > 20 ? '...' : '');
    }
    return ok({ user_message: userMsg, ai_message: aiMsg });
  }

  // =================== Token 转售 ===================
  // 概览
  if (path === '/token-resale/overview' && method === 'get') return ok(resaleOverview());

  // 可售资源（模型源转售配置）
  if (path === '/token-resale/sources' && method === 'get') {
    return ok(resaleSources.map(enrichSource));
  }
  if (/^\/token-resale\/sources\/[^/]+$/.test(path) && method === 'put') {
    const sid = path.split('/')[3];
    const s: any = resaleSources.find(x => x.source_id === sid);
    if (!s) return { code: 404, message: 'source not found', data: null };
    ['resale_enabled', 'mode', 'total_channels', 'self_channels', 'resale_channels', 'cost_input', 'cost_output', 'markup_rate', 'status'].forEach(k => {
      if (data[k] !== undefined) s[k] = data[k];
    });
    // 校验：自用通道 + 转售通道 不得超过总通道
    if ((s.self_channels || 0) + (s.resale_channels || 0) > (s.total_channels || 0)) {
      return { code: 400, message: '自用通道 + 转售通道 不得超过总通道数', data: null };
    }
    // 校验：转售通道不得低于已借出
    const borrowed = borrowedChannels(s.source_id);
    if ((s.resale_channels || 0) < borrowed) {
      return { code: 400, message: '转售通道不得低于已借出的 ' + borrowed + ' 个', data: null };
    }
    return ok(enrichSource(s));
  }
  if (/^\/token-resale\/sources\/[^/]+\/toggle$/.test(path) && method === 'post') {
    const sid = path.split('/')[3];
    const s: any = resaleSources.find(x => x.source_id === sid);
    if (!s) return { code: 404, message: 'source not found', data: null };
    s.resale_enabled = !s.resale_enabled;
    return ok(enrichSource(s));
  }

  // 客户账户（买方）
  if (path === '/token-resale/buyers' && method === 'get') {
    return paginate(resaleBuyers, p.page, p.page_size, p.search);
  }
  if (path === '/token-resale/buyers' && method === 'post') {
    const b = {
      id: 'by-' + String(Date.now()).slice(-6),
      name: data.name,
      contact: data.contact || '',
      status: 'active',
      balance: Number(data.balance || 0),
      credit_limit: Number(data.credit_limit || 10000),
      total_consumed: 0,
      month_consumed: 0,
      opened_at: new Date().toISOString(),
      allocations: data.allocations || [],
    };
    resaleBuyers.unshift(b);
    return ok(b);
  }
  if (/^\/token-resale\/buyers\/[^/]+$/.test(path) && method === 'put') {
    const bid = path.split('/')[3];
    const b: any = resaleBuyers.find(x => x.id === bid);
    if (!b) return { code: 404, message: 'buyer not found', data: null };
    const nextAllocations = data.allocations !== undefined ? data.allocations : b.allocations;
    // 校验：更新后每个模型源被借用通道总数不得超过其转售通道
    for (const a of (nextAllocations || [])) {
      const s: any = resaleSources.find(x => x.source_id === a.source_id);
      if (!s) return { code: 400, message: '模型源不存在：' + a.source_id, data: null };
      let used = a.channels || 0;
      resaleBuyers.forEach((other: any) => {
        if (other.id === bid) return;
        (other.allocations || []).forEach((oa: any) => { if (oa.source_id === a.source_id) used += oa.channels || 0; });
      });
      if (used > (s.resale_channels || 0)) {
        return { code: 400, message: s.display_name + ' 转售通道不足（可用 ' + s.resale_channels + '，需 ' + used + '）', data: null };
      }
    }
    ['name', 'contact', 'status', 'balance', 'credit_limit', 'allocations'].forEach(k => {
      if (data[k] !== undefined) b[k] = data[k];
    });
    return ok(b);
  }
  if (/^\/token-resale\/buyers\/[^/]+$/.test(path) && method === 'delete') {
    const bid = path.split('/')[3];
    const i = resaleBuyers.findIndex(x => x.id === bid);
    if (i >= 0) resaleBuyers.splice(i, 1);
    return ok(null);
  }
  if (/^\/token-resale\/buyers\/[^/]+\/toggle$/.test(path) && method === 'post') {
    const bid = path.split('/')[3];
    const b: any = resaleBuyers.find(x => x.id === bid);
    if (!b) return { code: 404, message: 'buyer not found', data: null };
    b.status = b.status === 'active' ? 'suspended' : 'active';
    return ok(b);
  }
  if (/^\/token-resale\/buyers\/[^/]+\/deposit$/.test(path) && method === 'post') {
    const bid = path.split('/')[3];
    const b: any = resaleBuyers.find(x => x.id === bid);
    if (!b) return { code: 404, message: 'buyer not found', data: null };
    b.balance += Number(data.amount || 0);
    if (b.status === 'suspended' && b.balance > 0) b.status = 'active';
    return ok(b);
  }

  // 交易账单：用量明细 + 结算
  if (path === '/token-resale/usage' && method === 'get') {
    let list = resaleUsage;
    if (p.buyer_id) list = list.filter((u: any) => u.buyer_id === p.buyer_id);
    if (p.source_id) list = list.filter((u: any) => u.source_id === p.source_id);
    return paginate(list, p.page, p.page_size, p.search);
  }
  if (path === '/token-resale/settlements' && method === 'get') return ok(resaleSettlements);

  // 执行结算：将当前 pending 用量归集为 settled，并更新/创建结算记录
  if (path === '/token-resale/settle' && method === 'post') {
    const pendingItems = resaleUsage.filter((u: any) => u.settle_status === 'pending');
    if (pendingItems.length === 0) return { data: { code: 400, message: '没有待结算的用量记录' } };
    // 将所有 pending 用量标记为 settled
    pendingItems.forEach((u: any) => { u.settle_status = 'settled'; });
    // 汇总金额
    const gross = pendingItems.reduce((s: number, u: any) => s + (u.sell_amount || 0), 0);
    const platformFeeRate = 0.15;
    const platformFee = Math.round(gross * platformFeeRate);
    const net = gross - platformFee;
    // 查找当前周期 pending 的结算记录并更新，或新建
    const now = new Date();
    const periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} ${now.getDate() <= 15 ? '上半月' : '下半月'}`;
    let record = resaleSettlements.find((s: any) => s.status === 'pending');
    if (record) {
      record.gross = gross;
      record.platform_fee = platformFee;
      record.net = net;
      record.status = 'settled';
      record.settled_at = now.toISOString();
    } else {
      record = { id: `st-${Date.now()}`, period: periodLabel, gross, platform_fee: platformFee, net, status: 'settled', settled_at: now.toISOString() };
      resaleSettlements.unshift(record);
    }
    return ok(record);
  }

  // Token 账户列表
  if (path === '/token-accounts' && method === 'get') {
    return ok(tokenAccounts.map(a => ({ ...a, remaining: a.total_quota - a.used_quota })));
  }
  // Token 白名单（按账户 ID 筛选）
  if (path === '/token-accounts/whitelist' && method === 'get') {
    const accountId = p.account_id;
    if (accountId) {
      const users = tokenWhitelist.filter(w => w.token_account_ids.includes(accountId) && w.status === 'active');
      return ok(users);
    }
    return ok(tokenWhitelist);
  }
  // 获取 Agent 公共额度配置
  if (/^\/front-perm\/resources\/[^/]+\/public-quota$/.test(path) && method === 'get') {
    const parts = path.split('/');
    const resId = parts[3];
    const quota = agentPublicQuotas.find(q => q.resource_id === resId);
    return ok(quota || null);
  }
  // 开启/更新 Agent 公共额度
  if (/^\/front-perm\/resources\/[^/]+\/public-quota$/.test(path) && method === 'post') {
    const parts = path.split('/');
    const resId = parts[3];
    const idx = agentPublicQuotas.findIndex(q => q.resource_id === resId);
    const quotaData = { resource_id: resId, ...data, updated_at: new Date().toISOString() };
    if (idx >= 0) { agentPublicQuotas[idx] = { ...agentPublicQuotas[idx], ...quotaData }; }
    else { agentPublicQuotas.push({ id: `pq-${Date.now()}`, ...quotaData }); }
    return ok(agentPublicQuotas.find(q => q.resource_id === resId));
  }
  // 关闭 Agent 公共额度
  if (/^\/front-perm\/resources\/[^/]+\/public-quota$/.test(path) && method === 'delete') {
    const parts = path.split('/');
    const resId = parts[3];
    const idx = agentPublicQuotas.findIndex(q => q.resource_id === resId);
    if (idx >= 0) agentPublicQuotas.splice(idx, 1);
    return ok({ success: true });
  }

  // Default
  return ok([]);
}
