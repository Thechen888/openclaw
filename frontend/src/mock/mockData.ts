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
  { id: 'mp-1', name: '通用对话策略', task_type: 'chat', rotation_method: 'round_robin', status: 'active', upstream_ids: ['ms-1', 'ms-3', 'ms-5'], upstreams_count: 3 },
  { id: 'mp-2', name: '高性价比对话', task_type: 'chat', rotation_method: 'least_cost', status: 'active', upstream_ids: ['ms-2', 'ms-5'], upstreams_count: 2 },
  { id: 'mp-3', name: '视觉理解策略', task_type: 'chat', rotation_method: 'priority', status: 'active', upstream_ids: ['ms-1', 'ms-4'], upstreams_count: 2 },
  { id: 'mp-4', name: '向量嵌入策略', task_type: 'embedding', rotation_method: 'round_robin', status: 'active', upstream_ids: ['ms-6'], upstreams_count: 1 },
  { id: 'mp-5', name: '低延迟策略', task_type: 'chat', rotation_method: 'least_latency', status: 'disabled', upstream_ids: ['ms-2', 'ms-5'], upstreams_count: 2 },
];

// =================== 聊天适配器 ===================
const chatAdapters = [
  { id: 'ca-1', name: '企业微信-主应用', chat_type: 'wechat_work', status: 'active', webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send', corp_id: 'ww1234567890', agent_id: '1000001', last_sync_at: ago(15) },
  { id: 'ca-2', name: '钉钉-审批通知', chat_type: 'dingtalk', status: 'active', webhook_url: 'https://oapi.dingtalk.com/robot/send', corp_id: '', agent_id: '', last_sync_at: ago(60) },
  { id: 'ca-3', name: '飞书-客服机器人', chat_type: 'feishu', status: 'active', webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook', corp_id: '', agent_id: '', last_sync_at: ago(120) },
  { id: 'ca-4', name: 'Slack-开发频道', chat_type: 'slack', status: 'disabled', webhook_url: 'https://hooks.slack.com/services/xxx', corp_id: '', agent_id: '', last_sync_at: ago(7200) },
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
    auth_config: { type: 'bearer_token', secret: 'crm-api-key-xxx' },
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
    full_script: '# IoT设备状态适配器\ndef read_devices(ctx):\n  return ctx.http.get("/devices")\n\ndef read_alerts(ctx):\n  return ctx.http.get("/alerts")',
  },
  {
    id: 'sa-5', name: '财务对账(停用)', description: '内部财务系统对账接口',
    version: '0.9.0', last_sync: '-', status: 'disabled', author: '陈七',
    api_functions: [
      { name: 'read_invoices', method: 'GET', description: '读取发票', script: 'def read_invoices(ctx):\n  return ctx.http.get("/invoices")' },
    ],
    auth_config: { type: 'custom', secret: 'custom-auth-xxx' },
    full_script: '# 财务对账适配器\ndef read_invoices(ctx):\n  return ctx.http.get("/invoices")',
  },
];

// =================== 用户 ===================
const users = [
  { id: 'u-1', username: 'admin', name: '张伟', email: 'zhangwei@company.com', role: 'admin', status: 'active' },
  { id: 'u-2', username: 'lisi', name: '李思', email: 'lisi@company.com', role: 'manager', status: 'active' },
  { id: 'u-3', username: 'wangwu', name: '王五', email: 'wangwu@company.com', role: 'member', status: 'active' },
  { id: 'u-4', username: 'zhaoliu', name: '赵六', email: 'zhaoliu@company.com', role: 'member', status: 'active' },
  { id: 'u-5', username: 'chenqi', name: '陈七', email: 'chenqi@company.com', role: 'viewer', status: 'disabled' },
  { id: 'u-6', username: 'sunba', name: '孙八', email: 'sunba@company.com', role: 'member', status: 'active' },
  { id: 'u-7', username: 'zhoujiu', name: '周九', email: 'zhoujiu@company.com', role: 'manager', status: 'active' },
];

// =================== 组织 ===================
const organizations = [
  { id: 'org-1', name: '总公司', type: 'company', status: 'active', description: '集团总公司', member_count: 156 },
  { id: 'org-2', name: '技术研发部', type: 'department', status: 'active', description: '技术研发部门', member_count: 45 },
  { id: 'org-3', name: '销售部', type: 'department', status: 'active', description: '销售与商务部门', member_count: 32 },
  { id: 'org-4', name: 'AI平台组', type: 'team', status: 'active', description: 'AI平台研发小组', member_count: 12 },
  { id: 'org-5', name: '智慧客服项目', type: 'project', status: 'active', description: '智能客服系统项目', member_count: 8 },
];

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
const skills = [
  { id: 'sk-1', name: '邮件发送', type: 'tool', category: 'communication', risk_level: 'low', status: 'active', owner: '张伟', owner_name: '张伟', description: '通过SMTP发送邮件通知' },
  { id: 'sk-2', name: '数据库查询', type: 'tool', category: 'data', risk_level: 'medium', status: 'active', owner: '技术研发部', owner_name: '技术研发部', description: '查询PostgreSQL数据库并返回结果' },
  { id: 'sk-3', name: '文档摘要', type: 'knowledge', category: 'analytics', risk_level: 'low', status: 'active', owner: '李思', owner_name: '李思', description: '对长文档进行智能摘要提取' },
  { id: 'sk-4', name: 'CRM数据同步', type: 'integration', category: 'automation', risk_level: 'high', status: 'active', owner: '销售部', owner_name: '销售部', description: '同步CRM系统中的客户数据' },
  { id: 'sk-5', name: '审批流程', type: 'workflow', category: 'automation', risk_level: 'medium', status: 'active', owner: '张伟', owner_name: '张伟', description: '处理多级审批流程' },
  { id: 'sk-6', name: '图像识别', type: 'tool', category: 'analytics', risk_level: 'low', status: 'draft', owner: '王五', owner_name: '王五', description: '基于视觉模型的图像内容识别' },
  { id: 'sk-7', name: '敏感词过滤', type: 'prompt', category: 'security', risk_level: 'critical', status: 'active', owner: '技术研发部', owner_name: '技术研发部', description: '对生成内容进行敏感词检测和过滤' },
];

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
const tokens = [
  { id: 'tk-1', name: 'CRM系统接入令牌', owner: '张伟', owner_name: '张伟', target_system: 'Salesforce', credential_type: 'api_key', status: 'active', quota_used: 8500, quota_limit: 10000, expires_at: dayAgo(-30) },
  { id: 'tk-2', name: 'ERP数据查询', owner: '李思', owner_name: '李思', target_system: 'SAP', credential_type: 'bearer', status: 'active', quota_used: 3200, quota_limit: 5000, expires_at: dayAgo(-60) },
  { id: 'tk-3', name: '工单系统令牌', owner: '王五', owner_name: '王五', target_system: 'Zendesk', credential_type: 'oauth2', status: 'active', quota_used: 1200, quota_limit: 3000, expires_at: dayAgo(-90) },
  { id: 'tk-4', name: 'HR系统接入', owner: '赵六', owner_name: '赵六', target_system: '北森HR', credential_type: 'api_key', status: 'disabled', quota_used: 0, quota_limit: 0, expires_at: dayAgo(-5) },
  { id: 'tk-5', name: '测试环境令牌', owner: '张伟', owner_name: '张伟', target_system: 'Internal API', credential_type: 'jwt', status: 'active', quota_used: 450, quota_limit: 1000, expires_at: dayAgo(2) },
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
const quotas = [
  { id: 'q-1', user_id: 'u-1', user_name: '张伟', username: 'admin', quota_type: 'API调用配额', name: 'API调用配额', quota_limit: 50000, used: 32500 },
  { id: 'q-2', user_id: 'u-2', user_name: '李思', username: 'lisi', quota_type: 'API调用配额', name: 'API调用配额', quota_limit: 20000, used: 15600 },
  { id: 'q-3', user_id: 'u-3', user_name: '王五', username: 'wangwu', quota_type: 'API调用配额', name: 'API调用配额', quota_limit: 10000, used: 8900 },
  { id: 'q-4', user_id: 'u-4', user_name: '赵六', username: 'zhaoliu', quota_type: 'API调用配额', name: 'API调用配额', quota_limit: 10000, used: 2300 },
  { id: 'q-5', user_id: 'u-6', user_name: '孙八', username: 'sunba', quota_type: 'Token配额', name: 'Token配额', quota_limit: 1000000, used: 856000 },
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

// =================== Mock 用户 ===================
const mockUser = {
  id: 'u-1',
  username: 'admin',
  name: '张伟',
  role: 'admin',
  is_admin: true,
};

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
  if (/^\/connectors\/starlark\/[^/]+\/generate-skill$/.test(path)) return ok({ skill_id: 'sk-' + Date.now(), name: 'Auto Skill' });

  // Connectors (Third-party Systems)
  if (path === '/connectors' && method === 'get') return paginate(connectors, p.page, p.page_size, p.search);
  if (path === '/connectors' && method === 'post') return ok(data);
  if (/^\/connectors\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/connectors\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Users
  if (path === '/users' && method === 'get') return paginate(users, p.page, p.page_size, p.search);
  if (path === '/users' && method === 'post') return ok(data);
  if (/^\/users\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/users\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Organizations
  if (path === '/organizations' && method === 'get') return paginate(organizations, p.page, p.page_size, p.search);
  if (path === '/organizations' && method === 'post') return ok(data);
  if (/^\/organizations\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/organizations\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (/^\/organizations\/[^/]+\/members$/.test(path)) return ok([]);

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
  if (/^\/agents\/[^/]+$/.test(path) && method === 'get') return ok(agents[0]);
  if (/^\/agents\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/agents\/[^/]+$/.test(path) && method === 'delete') return ok(null);
  if (/^\/agents\/[^/]+\/executions$/.test(path)) return paginate(agentRuns, p.page, p.page_size);
  if (/^\/agents\/executions\/[^/]+$/.test(path)) return ok(agentRuns[0]);

  // Skills
  if (path === '/skills' && method === 'get') return paginate(skills, p.page, p.page_size, p.search);
  if (path === '/skills' && method === 'post') return ok(data);
  if (/^\/skills\/[^/]+$/.test(path) && method === 'put') return ok(data);
  if (/^\/skills\/[^/]+$/.test(path) && method === 'delete') return ok(null);

  // Marketplace
  if (path === '/skills/marketplace') return paginate(marketplaceSkills, p.page, p.page_size, p.search);
  if (/^\/skills\/marketplace\/[^/]+\/install$/.test(path)) return ok(null);

  // Tokens
  if (path === '/tokens' && method === 'get') return paginate(tokens, p.page, p.page_size, p.search);
  if (path === '/tokens' && method === 'post') return ok(data);
  if (/^\/tokens\/[^/]+$/.test(path) && method === 'get') return ok(tokens[0]);
  if (/^\/tokens\/[^/]+$/.test(path) && method === 'put') return ok(data);

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

  // Queues
  if (path === '/system/queues') return ok(queueStats);
  if (/^\/system\/queues\/failed\/[^/]+\/retry$/.test(path)) return ok(null);
  if (path === '/system/queues/failed' && method === 'delete') return ok(null);

  // Restart
  if (/^\/system\/restart\/[^/]+$/.test(path)) return ok(null);

  // Health
  if (path === '/system/health') return ok(systemHealth);

  // Default
  return ok([]);
}
