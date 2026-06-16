// =================== Mock 数据（中文） ===================
// 所有模块的完整示例数据，用于无后端时的前端原型展示

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();
const dayAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

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
const starlarkAdapters = [
  {
    id: 'sa-1', name: 'CRM客户同步', description: '从CRM拉取客户信息并同步到本地',
    version: '1.2.0', last_sync: '2026/5/31 18:00:00', status: 'active', author: '张伟',
    api_functions: [
      { name: 'read_contacts', method: 'GET', description: '读取联系人列表', script: 'def read_contacts(ctx):\n  return ctx.http.get("/contacts")' },
      { name: 'read_deals', method: 'GET', description: '读取交易列表', script: 'def read_deals(ctx):\n  return ctx.http.get("/deals")' },
      { name: 'write_notes', method: 'POST', description: '写入备注', script: 'def write_notes(ctx, data):\n  return ctx.http.post("/notes", data)' },
    ],
    auth_config: { type: 'bearer_token', secret: 'crm-api-key-xxx' }, // 兼容旧数据，前端会自动转换为 config_items
    config_items: [
      { key: 'base_url', value: 'https://crm.example.com/api/v1', is_secret: false },
      { key: 'api_key', value: 'crm-api-key-xxx', is_secret: true },
      { key: 'tenant_id', value: 'tenant-001', is_secret: false },
    ],
    full_script: '# CRM客户同步适配器\ndef read_contacts(ctx):\n  return ctx.http.get("/contacts")\n\ndef read_deals(ctx):\n  return ctx.http.get("/deals")\n\ndef write_notes(ctx, data):\n  return ctx.http.post("/notes", data)',
  },
  {
    id: 'sa-2', name: 'ERP订单查询', description: '查询用友ERP订单状态和库存',
    version: '1.0.0', last_sync: '2026/5/31 16:00:00', status: 'active', author: '李思',
    api_functions: [
      { name: 'read_orders', method: 'GET', description: '读取订单', script: 'def read_orders(ctx):\n  return ctx.http.get("/orders")' },
      { name: 'read_inventory', method: 'GET', description: '读取库存', script: 'def read_inventory(ctx):\n  return ctx.http.get("/inventory")' },
    ],
    auth_config: { type: 'api_key', secret: 'erp-key-xxx' },
    config_items: [
      { key: 'base_url', value: 'https://erp.example.com/openapi', is_secret: false },
      { key: 'app_key', value: 'yonyou-app-key', is_secret: false },
      { key: 'app_secret', value: 'erp-key-xxx', is_secret: true },
    ],
    full_script: '# ERP订单查询适配器\ndef read_orders(ctx):\n  return ctx.http.get("/orders")\n\ndef read_inventory(ctx):\n  return ctx.http.get("/inventory")',
  },
  {
    id: 'sa-3', name: 'Jira工单对接', description: '双向同步Jira工单状态',
    version: '2.0.1', last_sync: '2026/5/31 20:00:00', status: 'active', author: '王五',
    api_functions: [
      { name: 'read_issues', method: 'GET', description: '读取工单', script: 'def read_issues(ctx):\n  return ctx.http.get("/issues")' },
      { name: 'write_issues', method: 'PUT', description: '更新工单', script: 'def write_issues(ctx, data):\n  return ctx.http.put("/issues", data)' },
      { name: 'read_projects', method: 'GET', description: '读取项目', script: 'def read_projects(ctx):\n  return ctx.http.get("/projects")' },
    ],
    auth_config: { type: 'basic_auth', secret: 'jira-auth-xxx' },
    config_items: [
      { key: 'base_url', value: 'https://company.atlassian.net', is_secret: false },
      { key: 'username', value: 'bot@company.com', is_secret: false },
      { key: 'api_token', value: 'jira-auth-xxx', is_secret: true },
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
const matchingResults = [
  { id: 'mr-1', source_type: 'wechat_work', account_id: 'wx_zhangwei', external_id: 'wx_zhangwei', user_name: '张伟', score: 0.98, status: 'matched', protected: true },
  { id: 'mr-2', source_type: 'dingtalk', account_id: 'dt_wangwu', external_id: 'dt_wangwu', user_name: '王五', score: 0.95, status: 'matched', protected: false },
  { id: 'mr-3', source_type: 'crm', account_id: 'SF-004321', external_id: 'SF-004321', user_name: '张伟', score: 0.92, status: 'matched', protected: false },
  { id: 'mr-4', source_type: 'feishu', account_id: 'fs_chenqi', external_id: 'fs_chenqi', user_name: '', score: 0.45, status: 'unmatched', protected: false },
  { id: 'mr-5', source_type: 'wechat_work', account_id: 'wx_unknown1', external_id: 'wx_unknown1', user_name: '', score: 0.62, status: 'pending', protected: false },
  { id: 'mr-6', source_type: 'dingtalk', account_id: 'dt_zhaoliu', external_id: 'dt_zhaoliu', user_name: '赵六', score: 0.75, status: 'conflict', protected: true },
];

const matchingStrategies = [
  { id: 'strat-1', name: '手机号匹配', strategy_type: 'phone_match', status: 'active', description: '通过手机号进行身份关联', weight: 0.4 },
  { id: 'strat-2', name: '邮箱匹配', strategy_type: 'email_match', status: 'active', description: '通过邮箱地址进行身份关联', weight: 0.3 },
  { id: 'strat-3', name: '姓名+部门匹配', strategy_type: 'name_dept_match', status: 'active', description: '通过姓名和部门组合进行模糊匹配', weight: 0.2 },
  { id: 'strat-4', name: 'AI语义匹配', strategy_type: 'ai_match', status: 'disabled', description: '基于AI语义模型的智能匹配', weight: 0.1 },
];

const matchingRuns = [
  { id: 'run-1', status: 'completed', created_at: ago(30), matched_count: 156, total_count: 203 },
  { id: 'run-2', status: 'completed', created_at: ago(1440), matched_count: 148, total_count: 198 },
  { id: 'run-3', status: 'completed', created_at: ago(2880), matched_count: 142, total_count: 195 },
];

// =================== Agent ===================
const agents = [
  { id: 'a-1', name: 'CRM销售通知', owner_type: 'organization', status: 'active', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 2, last_run_at: ago(5), description: '监控CRM系统销售事件并发送通知', system_prompt: '你是一个销售助手，负责监控和通知销售相关事件。' },
  { id: 'a-2', name: '设备巡检', owner_type: 'organization', status: 'active', model_policy_id: 'mp-1', policy_name: '通用对话策略', triggers_count: 1, last_run_at: ago(15), description: '定期检查设备状态并生成报告', system_prompt: '你是一个设备巡检助手，负责检查设备运行状态。' },
  { id: 'a-3', name: '摄像头监控#12', owner_type: 'organization', status: 'active', model_policy_id: 'mp-3', policy_name: '视觉理解策略', triggers_count: 1, last_run_at: ago(32), description: '监控12号摄像头的异常情况', system_prompt: '你是一个视觉监控助手，负责分析摄像头画面。' },
  { id: 'a-4', name: '每日总结', owner_type: 'personal', status: 'active', model_policy_id: 'mp-2', policy_name: '高性价比对话', triggers_count: 1, last_run_at: ago(60), description: '每日自动汇总工作日志和待办事项', system_prompt: '你是日报生成助手，负责汇总和整理工作日志。' },
  { id: 'a-5', name: '个人提醒', owner_type: 'personal', status: 'active', model_policy_id: 'mp-2', policy_name: '高性价比对话', triggers_count: 3, last_run_at: ago(120), description: '个人待办和日程提醒', system_prompt: '你是个人助理，负责提醒待办事项和日程安排。' },
  { id: 'a-6', name: '知识库问答', owner_type: 'organization', status: 'draft', model_policy_id: '', policy_name: '', triggers_count: 0, last_run_at: '', description: '基于企业知识库的智能问答（开发中）', system_prompt: '你是知识库问答助手。' },
];

// =================== Agent 工作流配置 ===================
const workflows: Record<string, any> = {
  'a-1': {
    agent_id: 'a-1',
    name: 'CRM通知流程',
    max_iterations: 1,
    timeout_seconds: 60,
    on_error: 'stop',
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
];

// =================== 技能 ===================
// source_adapter_id / source_adapter_name 标记 Skill 来源：
// - 有值：由对应 Starlark 适配器自动登记
// - null：管理员手动创建
const skills: any[] = [
  { id: 'sk-1', name: 'kingdee-erp-query', description: '查询金蝶云星空 ERP 数据时使用，适用于按 formId 查询表单/单据列表、通过 FID 内码查看表单详情、查询销售订单、采购订单、收料通知单、应付单、付款单、库存、生产订单、生产领料、质检单、调拨单、其他入库...', status: 'active', created_at: '2026-04-29 01:06' },
  { id: 'sk-2', name: 'cron', description: '定时任务', status: 'active', created_at: '2026-03-28 05:03' },
  { id: 'sk-3', name: 'recloud', description: 'recloud', status: 'active', created_at: '2026-03-12 04:13' },
  { id: 'sk-4', name: 'mes', description: 'MES Skill 体系：查遍 MES 从工单投产、质量测试、物料追溯、产出交接到供应链报表的 25 个业务域数据', status: 'active', created_at: '2026-03-30 23:39' },
  { id: 'sk-5', name: 'knows', description: '公司内部知识库：生产及工艺、研发知识、产品知识、售后服务、公司流程、法务财务、工程项目', status: 'active', created_at: '2026-04-16 07:08' },
  { id: 'sk-6', name: 'minimax-pdf', description: '基于 token 化设计系统生成、填写和重排 PDF 文档。支持三种模式：CREATE（从零生成，15 种封面风格）、FILL（填写现有表单字段）、REFORMAT（将已有文档重排为新设计）。排版与配色由文档类型自动推导，输...', status: 'active', created_at: '2026-04-14 23:50' },
  { id: 'sk-7', name: 'beisen', description: '北森查用功能', status: 'active', created_at: '2026-03-21 20:06' },
  { id: 'sk-8', name: 'crm', description: 'crm', status: 'active', created_at: '2026-03-11 04:44' },
  { id: 'sk-9', name: 'wecom-smartsheet-schema', description: '企业微信智能表格模式', status: 'active', created_at: '2026-04-09 05:14' },
  { id: 'sk-10', name: 'wecom-send-media', description: '企业微信发送文件 图片等', status: 'active', created_at: '2026-04-09 05:13' },
  { id: 'sk-11', name: 'gen-image', description: '生成图片', status: 'active', created_at: '2026-04-08 00:59' },
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

// =================== Token ===================
const tokens: any[] = [
  { id: 'tk-1', name: 'CRM系统接入令牌', owner: '张伟', owner_name: '张伟', target_system: 'Salesforce', credential_type: 'api_key', status: 'active', quota_used: 8500, quota_limit: 10000, expires_at: dayAgo(-30), token_value: 'oc_tk_crm_a3f8b1c2d4e6' },
  { id: 'tk-2', name: 'ERP数据查询', owner: '李思', owner_name: '李思', target_system: 'SAP', credential_type: 'bearer', status: 'active', quota_used: 3200, quota_limit: 5000, expires_at: dayAgo(-60), token_value: 'oc_tk_erp_7d9f8b6c4x2k' },
  { id: 'tk-3', name: '工单系统令牌', owner: '王五', owner_name: '王五', target_system: 'Zendesk', credential_type: 'oauth2', status: 'active', quota_used: 1200, quota_limit: 3000, expires_at: dayAgo(-90), token_value: 'oc_tk_zd_5c8d7e9f2j4h' },
  { id: 'tk-4', name: 'HR系统接入', owner: '赵六', owner_name: '赵六', target_system: '北森HR', credential_type: 'api_key', status: 'disabled', quota_used: 0, quota_limit: 0, expires_at: dayAgo(-5), token_value: 'oc_tk_hr_6b4e8a1d3n9p' },
  { id: 'tk-5', name: '测试环境令牌', owner: '张伟', owner_name: '张伟', target_system: 'Internal API', credential_type: 'jwt', status: 'active', quota_used: 450, quota_limit: 1000, expires_at: dayAgo(2), token_value: 'oc_tk_test_8f3b2a1c9d4e' },
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
  agent_runs_today: 47,
  failed_tasks_today: 3,
  token_usage_today: '128,450',
  model_cost_today: '89.50',
  pending_matches: 5,
  pending_approvals: 3,
  pending_skill_reviews: 2,
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
    id: 'cl-1', name: 'eu-product', label: '欧洲生产集群', env: '生产环境',
    provider: 'Aliyun ACK', k8s_version: 'v1.21.5', kubesphere_version: 'v3.2.1',
    visibility: '对部分企业空间可见', status: 'active',
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
  {
    id: 'cl-2', name: 'cn-prod', label: '华东生产集群', env: '生产环境',
    provider: 'Aliyun ACK', k8s_version: 'v1.24.8', kubesphere_version: 'v3.3.2',
    visibility: '对所有企业空间可见', status: 'active',
    api_rps: 35.8, api_latency_ms: 1.85, schedule_count: 14320, schedule_fail: 2,
    cpu_used: 24.5, cpu_total: 64, memory_used: 187.3, memory_total: 512,
    pod_used: 320, pod_total: 1200, disk_used: 18.6, disk_total: 30,
    components: ['Kubernetes', 'KubeSphere'],
    nodes: [
      { id: 'n-6', name: 'cn-node-1', ip: '10.0.1.10', status: 'Ready', cpu_pct: 55, memory_pct: 48, pods: 60, role: 'master' },
      { id: 'n-7', name: 'cn-node-2', ip: '10.0.1.11', status: 'Ready', cpu_pct: 42, memory_pct: 35, pods: 48, role: 'worker' },
      { id: 'n-8', name: 'cn-node-3', ip: '10.0.1.12', status: 'Ready', cpu_pct: 39, memory_pct: 32, pods: 45, role: 'worker' },
    ],
  },
  {
    id: 'cl-3', name: 'dev-cluster', label: '开发测试集群', env: '开发环境',
    provider: 'Self-managed', k8s_version: 'v1.26.3', kubesphere_version: '-',
    visibility: '仅开发团队可见', status: 'active',
    api_rps: 5.2, api_latency_ms: 4.1, schedule_count: 2180, schedule_fail: 5,
    cpu_used: 6.4, cpu_total: 16, memory_used: 28.7, memory_total: 64,
    pod_used: 88, pod_total: 300, disk_used: 2.1, disk_total: 5,
    components: ['Kubernetes', 'Monitoring'],
    nodes: [
      { id: 'n-9', name: 'dev-node-1', ip: '192.168.1.10', status: 'Ready', cpu_pct: 40, memory_pct: 45, pods: 44, role: 'master' },
      { id: 'n-10', name: 'dev-node-2', ip: '192.168.1.11', status: 'NotReady', cpu_pct: 0, memory_pct: 0, pods: 0, role: 'worker' },
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

  // Permissions (权限管理)
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
  if (path === '/account-matching/runs') return paginate(matchingRuns, p.page, p.page_size);
  if (path === '/account-matching/strategies') return ok(matchingStrategies);
  if (path === '/account-matching/strategies' && method === 'post') return ok(data);

  // Agents
  if (path === '/agents' && method === 'get') return paginate(agents, p.page, p.page_size, p.search);
  if (path === '/agents' && method === 'post') return ok(data);
  if (/^\/agents\/runs$/.test(path)) return paginate(agentRuns, p.page, p.page_size, p.search);
  // Agent 工作流
  if (/^\/agents\/workflows\/[^/]+$/.test(path) && method === 'get') {
    const id = path.split('/').pop() as string;
    return ok(workflows[id] || {
      agent_id: id, name: '新建流程', max_iterations: 1, timeout_seconds: 60, on_error: 'stop', nodes: [],
    });
  }
  if (/^\/agents\/workflows\/[^/]+$/.test(path) && method === 'put') {
    const id = path.split('/').pop() as string;
    workflows[id] = { ...(workflows[id] || {}), ...data, agent_id: id };
    return ok(workflows[id]);
  }
  if (/^\/agents\/[^/]+$/.test(path) && method === 'get') return ok(agents[0]);
  if (/^\/agents\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/agents\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (/^\/agents\/[^/]+\/executions$/.test(path)) return paginate(agentRuns, p.page, p.page_size);
  if (/^\/agents\/executions\/[^/]+$/.test(path)) return ok(agentRuns[0]);

  // Skills
  if (path === '/skills' && method === 'get') return paginate(skills, p.page, p.page_size, p.search);
  if (path === '/skills' && method === 'post') {
    const newSkill = { id: 'sk-' + Date.now(), status: 'active', created_at: new Date().toISOString().slice(0, 16).replace('T', ' '), ...data };
    skills.push(newSkill);
    skillFiles[newSkill.id] = [];
    return ok(newSkill);
  }
  if (/^\/skills\/[^/]+$/.test(path) && method === 'put') {
    const sid = path.split('/').pop();
    const idx = skills.findIndex(s => s.id === sid);
    if (idx >= 0) skills[idx] = { ...skills[idx], ...data };
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

  // Tokens
  if (path === '/tokens' && method === 'get') return paginate(tokens, p.page, p.page_size, p.search);
  if (path === '/tokens' && method === 'post') {
    const newToken = {
      id: 'tk-' + Date.now(),
      token_value: 'oc_tk_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36).slice(-6),
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

  // Config Backups
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

  // Default
  return ok([]);
}
