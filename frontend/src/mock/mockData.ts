// =================== Mock 数据（中文） ===================
// 所有模块的完整示例数据，用于无后端时的前端原型展示

const now = new Date();
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000).toISOString();
const dayAgo = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

// =================== 工具函数 ===================
function paginate(items: any[], params: any) {
  const p = params || {};
  const page = Number(p.page || 1);
  const page_size = Number(p.page_size || 20);
  let filtered = [...items];
  if (p.search) {
    const q = String(p.search).toLowerCase();
    filtered = filtered.filter(item =>
      Object.values(item).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
    );
  }
  for (const [key, val] of Object.entries(p)) {
    if (['page', 'page_size', 'search', 'sort_by', 'sort_order'].includes(key)) continue;
    if (val !== undefined && val !== '') {
      filtered = filtered.filter(item => String(item[key]) === String(val));
    }
  }
  if (p.sort_by) {
    const order = p.sort_order === 'desc' ? -1 : 1;
    filtered.sort((a, b) => (a[p.sort_by] > b[p.sort_by] ? order : -order));
  }
  const start = (page - 1) * page_size;
  return {
    code: 0, message: 'ok',
    data: filtered.slice(start, start + page_size),
    pagination: { page, page_size, total: filtered.length, total_pages: Math.ceil(filtered.length / page_size) },
  };
}
function ok(data: any) { return { code: 0, message: 'ok', data }; }

// =================== 用户 / 认证 ===================
const users = [
  { id: 'u-1', name: '张伟', email: 'zhangwei@example.com', role: 'admin', org_id: 'org-1', status: 'active', avatar_url: '', created_at: dayAgo(90) },
  { id: 'u-2', name: '李思', email: 'lisi@example.com', role: 'user', org_id: 'org-1', status: 'active', avatar_url: '', created_at: dayAgo(60) },
  { id: 'u-3', name: '王五', email: 'wangwu@example.com', role: 'user', org_id: 'org-2', status: 'active', avatar_url: '', created_at: dayAgo(45) },
  { id: 'u-4', name: '赵六', email: 'zhaoliu@example.com', role: 'user', org_id: 'org-2', status: 'active', avatar_url: '', created_at: dayAgo(30) },
  { id: 'u-5', name: '陈晨', email: 'chenchen@example.com', role: 'user', org_id: 'org-3', status: 'active', avatar_url: '', created_at: dayAgo(20) },
];

const roles = [
  { id: 'r-1', name: '管理员', description: '系统管理员，拥有所有权限', permissions: ['*'], created_at: dayAgo(90) },
  { id: 'r-2', name: '开发者', description: '可创建和管理 Agent', permissions: ['agent:*', 'skill:read'], created_at: dayAgo(90) },
  { id: 'r-3', name: '普通用户', description: '基本使用权限', permissions: ['chat:*', 'skill:read'], created_at: dayAgo(90) },
];

const organizations = [
  { id: 'org-1', name: '技术部', description: '研发与运维', parent_id: '', member_count: 2, created_at: dayAgo(90) },
  { id: 'org-2', name: '产品部', description: '产品设计与运营', parent_id: '', member_count: 2, created_at: dayAgo(90) },
  { id: 'org-3', name: '市场部', description: '市场推广', parent_id: '', member_count: 1, created_at: dayAgo(60) },
];

// =================== 模型源 ===================
const modelSources = [
  { id: 'ms-1', provider: 'OpenAI', model_name: 'gpt-4o', display_name: 'GPT-4o', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["文本","视觉","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 456.78, requests_30d: 4521, input_tokens_30d: 1250000, output_tokens_30d: 680000 },
  { id: 'ms-2', provider: 'OpenAI', model_name: 'gpt-4o-mini', display_name: 'GPT-4o Mini', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["文本","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 123.45, requests_30d: 5234, input_tokens_30d: 890000, output_tokens_30d: 450000 },
  { id: 'ms-3', provider: 'Anthropic', model_name: 'claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet', api_endpoint: 'https://api.anthropic.com/v1', auth_type: 'api_key', capabilities: '["文本","视觉","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 234.56, requests_30d: 2345, input_tokens_30d: 680000, output_tokens_30d: 350000 },
  { id: 'ms-4', provider: '阿里云', model_name: 'qwen-vl-max', display_name: '通义千问VL', api_endpoint: 'https://dashscope.aliyuncs.com/api/v1', auth_type: 'api_key', capabilities: '["文本","视觉"]', health_status: 'degraded', status: 'active', estimated_cost_30d: 89.20, requests_30d: 1890, input_tokens_30d: 520000, output_tokens_30d: 280000 },
  { id: 'ms-5', provider: '智谱AI', model_name: 'glm-4', display_name: 'GLM-4', api_endpoint: 'https://open.bigmodel.cn/api/v4', auth_type: 'api_key', capabilities: '["文本","函数调用"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 67.80, requests_30d: 1234, input_tokens_30d: 340000, output_tokens_30d: 180000 },
  { id: 'ms-6', provider: 'OpenAI', model_name: 'text-embedding-3-small', display_name: 'Embedding 3 Small', api_endpoint: 'https://api.openai.com/v1', auth_type: 'api_key', capabilities: '["向量嵌入"]', health_status: 'healthy', status: 'active', estimated_cost_30d: 42.00, requests_30d: 8901, input_tokens_30d: 2100000, output_tokens_30d: 0 },
];

const modelPolicies = [
  { id: 'mp-1', name: '通用对话策略', rotation_method: 'priority', status: 'active', is_default: true, upstream_ids: ['ms-1', 'ms-3', 'ms-5'], timeout_seconds: 30, retry_count: 2 },
  { id: 'mp-2', name: '高性价比对话', rotation_method: 'round_robin', status: 'active', is_default: false, upstream_ids: ['ms-2', 'ms-5'], timeout_seconds: 20, retry_count: 1 },
  { id: 'mp-3', name: '视觉理解策略', rotation_method: 'priority', status: 'active', is_default: false, upstream_ids: ['ms-1', 'ms-4'], timeout_seconds: 60, retry_count: 1 },
  { id: 'mp-4', name: '向量嵌入策略', rotation_method: 'round_robin', status: 'active', is_default: false, upstream_ids: ['ms-6'], timeout_seconds: 15, retry_count: 0 },
  { id: 'mp-5', name: '备用国产策略', rotation_method: 'priority', status: 'disabled', is_default: false, upstream_ids: ['ms-5', 'ms-4', 'ms-2'], timeout_seconds: 30, retry_count: 2 },
];

// =================== 连接器 ===================
const connectors = [
  { id: 'cn-1', name: '企业微信主应用', type: 'wechat_work', status: 'active', endpoint: 'https://qyapi.weixin.qq.com', created_at: dayAgo(60) },
  { id: 'cn-2', name: '钉钉审批通知', type: 'dingtalk', status: 'active', endpoint: 'https://oapi.dingtalk.com', created_at: dayAgo(45) },
  { id: 'cn-3', name: '飞书客服机器人', type: 'feishu', status: 'active', endpoint: 'https://open.feishu.cn', created_at: dayAgo(30) },
];

const chatAdapters = [
  { id: 'ca-1', name: '企业微信-主应用', chat_type: 'wechat_work', status: 'active', webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx', corp_id: 'ww1234567890', agent_id: '1000001', app_secret: '******', last_sync_at: ago(15) },
  { id: 'ca-2', name: '钉钉-审批通知', chat_type: 'dingtalk', status: 'active', webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx', access_token: 'xxxxxxxxxxxxxxxx', sign_secret: '******', last_sync_at: ago(60) },
  { id: 'ca-3', name: '飞书-客服机器人', chat_type: 'feishu', status: 'active', app_id: 'cli_xxxxxxxxx', app_secret: '******', webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx', last_sync_at: ago(120) },
  { id: 'ca-4', name: 'Slack-开发频道', chat_type: 'slack', status: 'disabled', bot_token: '******', webhook_url: 'https://hooks.slack.com/services/xxx', last_sync_at: ago(1440) },
];

const integrationTemplates = [
  { id: 'it-1', name: '企业微信标准接入', type: 'wechat_work', description: '适用于企业内部通讯场景', config_schema: '{}', created_at: dayAgo(60) },
  { id: 'it-2', name: '钉钉机器人模板', type: 'dingtalk', description: '钉钉群机器人快速接入', config_schema: '{}', created_at: dayAgo(60) },
  { id: 'it-3', name: '飞书应用模板', type: 'feishu', description: '飞书开放平台标准接入', config_schema: '{}', created_at: dayAgo(60) },
];

const thirdPartySystems = [
  { id: 'tp-1', name: 'ERP系统', system_type: 'erp', status: 'connected', endpoint: 'https://erp.example.com/api', last_sync_at: ago(30) },
  { id: 'tp-2', name: 'CRM系统', system_type: 'crm', status: 'connected', endpoint: 'https://crm.example.com/api', last_sync_at: ago(60) },
  { id: 'tp-3', name: 'OA系统', system_type: 'oa', status: 'disconnected', endpoint: 'https://oa.example.com/api', last_sync_at: dayAgo(7) },
];

// =================== 技能 ===================
const skills = [
  { id: 'sk-1', name: '文档总结', description: '自动提取文档要点并生成摘要', status: 'published', author: '张伟', author_id: 'u-1', category: '效率工具', install_count: 128, rating: 4.5, created_at: dayAgo(30), updated_at: dayAgo(5) },
  { id: 'sk-2', name: '代码审查', description: '检查代码质量与规范', status: 'published', author: '张伟', author_id: 'u-1', category: '开发工具', install_count: 256, rating: 4.8, created_at: dayAgo(25), updated_at: dayAgo(3) },
  { id: 'sk-3', name: '数据分析', description: '可视化数据分析报告', status: 'published', author: '李思', author_id: 'u-2', category: '数据工具', install_count: 89, rating: 4.2, created_at: dayAgo(20), updated_at: dayAgo(2) },
  { id: 'sk-4', name: '邮件撰写助手', description: '根据要点自动生成邮件', status: 'draft', author: '张伟', author_id: 'u-1', category: '效率工具', install_count: 0, rating: 0, created_at: dayAgo(10), updated_at: dayAgo(1) },
  { id: 'sk-5', name: 'SQL生成器', description: '自然语言转SQL查询', status: 'published', author: '王五', author_id: 'u-3', category: '数据工具', install_count: 67, rating: 4.0, created_at: dayAgo(15), updated_at: dayAgo(4) },
];

// =================== Agent ===================
const agents = [
  { id: 'ag-1', name: '客服助手', description: '智能客服问答Agent', status: 'active', model_policy_id: 'mp-1', skill_ids: ['sk-1', 'sk-3'], created_at: dayAgo(30), updated_at: dayAgo(2) },
  { id: 'ag-2', name: '代码审查Bot', description: '自动代码审查与优化建议', status: 'active', model_policy_id: 'mp-2', skill_ids: ['sk-2'], created_at: dayAgo(20), updated_at: dayAgo(1) },
  { id: 'ag-3', name: '数据分析师', description: '数据分析与可视化', status: 'inactive', model_policy_id: 'mp-3', skill_ids: ['sk-3', 'sk-5'], created_at: dayAgo(15), updated_at: dayAgo(5) },
];

const agentExecutions = [
  { id: 'ae-1', agent_id: 'ag-1', status: 'success', input: '用户咨询退款政策', output: '已回复退款流程', tokens_used: 350, duration_ms: 2100, created_at: ago(30) },
  { id: 'ae-2', agent_id: 'ag-1', status: 'success', input: '如何修改收货地址', output: '已指导用户修改', tokens_used: 280, duration_ms: 1800, created_at: ago(60) },
  { id: 'ae-3', agent_id: 'ag-2', status: 'failed', input: '审查PR #123', output: '', tokens_used: 0, duration_ms: 5000, created_at: ago(120) },
];

// =================== Token ===================
const tokens = [
  { id: 'tk-1', name: '开发环境Token', prefix: 'sk-dev', user_id: 'u-1', status: 'active', rate_limit: 1000, quota_remaining: 50000, created_at: dayAgo(30), last_used_at: ago(15) },
  { id: 'tk-2', name: '生产环境Token', prefix: 'sk-prod', user_id: 'u-1', status: 'active', rate_limit: 5000, quota_remaining: 200000, created_at: dayAgo(60), last_used_at: ago(5) },
  { id: 'tk-3', name: '测试Token', prefix: 'sk-test', user_id: 'u-2', status: 'revoked', rate_limit: 100, quota_remaining: 0, created_at: dayAgo(10), last_used_at: dayAgo(3) },
];

// =================== 知识库 / 文档 ===================
const knowledgeBases = [
  { id: 'kb-1', name: '产品文档库', description: '产品需求文档与设计稿', document_count: 128, embedding_model: 'text-embedding-3-small', status: 'active', created_at: dayAgo(60), updated_at: dayAgo(2) },
  { id: 'kb-2', name: '技术规范库', description: '技术架构与接口文档', document_count: 56, embedding_model: 'text-embedding-3-small', status: 'active', created_at: dayAgo(45), updated_at: dayAgo(5) },
  { id: 'kb-3', name: '常见问题库', description: 'FAQ与客服话术', document_count: 234, embedding_model: 'text-embedding-3-small', status: 'active', created_at: dayAgo(30), updated_at: dayAgo(1) },
];

const documents = [
  { id: 'doc-1', kb_id: 'kb-1', title: '产品需求文档v2.0', status: 'completed', chunk_count: 45, word_count: 12000, created_at: dayAgo(30) },
  { id: 'doc-2', kb_id: 'kb-1', title: '用户调研报告', status: 'completed', chunk_count: 28, word_count: 8500, created_at: dayAgo(20) },
  { id: 'doc-3', kb_id: 'kb-2', title: 'API接口规范', status: 'completed', chunk_count: 62, word_count: 15000, created_at: dayAgo(15) },
  { id: 'doc-4', kb_id: 'kb-3', title: '客服标准话术', status: 'completed', chunk_count: 89, word_count: 22000, created_at: dayAgo(10) },
];

const faqItems = [
  { id: 'faq-1', kb_id: 'kb-3', question: '如何重置密码？', answer: '请在登录页点击"忘记密码"，按提示操作即可。', created_at: dayAgo(10) },
  { id: 'faq-2', kb_id: 'kb-3', question: '支持哪些支付方式？', answer: '目前支持支付宝、微信支付和银行转账。', created_at: dayAgo(8) },
];

// =================== 聊天会话与消息 ===================
const chatSessions: any[] = [
  { id: 'cs-1', title: '关于API设计规范', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: 'openclaw-main', message_count: 6, created_at: dayAgo(3), updated_at: ago(120), last_message_at: ago(120) },
  { id: 'cs-2', title: '项目新手指引', user_id: 'u-1', mode: 'plan', model_policy_id: 'mp-2', model_policy: '性能', status: 'active', workspace_name: '项目新手指引', message_count: 4, created_at: dayAgo(2), updated_at: ago(60), last_message_at: ago(60) },
  { id: 'cs-t1', title: '帮我写一段 Python 快排', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 2, created_at: dayAgo(1), updated_at: ago(30), last_message_at: ago(30) },
  { id: 'cs-3', title: '数据库索引优化建议', user_id: 'u-1', mode: 'ask', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 4, created_at: dayAgo(5), updated_at: dayAgo(4), last_message_at: dayAgo(4) },
  { id: 'cs-4', title: 'React性能优化方案', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-2', model_policy: '极致', status: 'active', workspace_name: 'openclaw-main', message_count: 8, created_at: dayAgo(7), updated_at: dayAgo(6), last_message_at: dayAgo(6) },
  { id: 'cs-5', title: 'Kubernetes部署配置', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 3, created_at: dayAgo(10), updated_at: dayAgo(9), last_message_at: dayAgo(9) },
  { id: 'cs-6', title: '产品需求评审要点', user_id: 'u-1', mode: 'plan', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 5, created_at: dayAgo(12), updated_at: dayAgo(11), last_message_at: dayAgo(11) },
  { id: 'cs-7', title: '周报自动生成', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-3', model_policy: '性能', status: 'active', workspace_name: 'openclaw-main', message_count: 6, created_at: dayAgo(14), updated_at: dayAgo(13), last_message_at: dayAgo(13) },
  // 任务：采购申请审批跟进
  { id: 'cs-9', title: '采购申请审批跟进', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 2, created_at: ago(180), updated_at: ago(170), last_message_at: ago(170) },
  // 转交会话
  { id: 'cs-handoff-1', title: '【转交】ERP审批失败排查', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', readonly: false, shared_from: { name: '王五', note: '这单 ERP 审批卡住了，客户催得紧，你帮我看看怎么推进' }, message_count: 4, created_at: ago(90), updated_at: ago(80), last_message_at: ago(80) },
  // 分享会话（只读）
  { id: 'cs-shared-1', title: '【分享】CRM销售话术讨论', user_id: 'u-1', mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto', status: 'active', workspace_name: '', readonly: true, shared_from: { name: '李思', note: '这段分析你看看，下次评审用得上' }, message_count: 3, created_at: ago(60), updated_at: ago(50), last_message_at: ago(50) },
  // 群组会话
  { id: 'grp-1', title: '销售预测平台攻坚群', user_id: 'u-1', session_type: 'group', creator_id: 'u-1', member_ids: ['u-1', 'u-2', 'u-3', 'u-4'], agent_ids: ['ag-1'], skill_ids: ['sk-1'], mode: 'chat', model_policy: 'Auto', status: 'active', workspace_name: '', message_count: 5, created_at: dayAgo(2), last_message_at: ago(40) },
];

const chatMessages: Record<string, any[]> = {
  'cs-1': [
    { id: 'm-cs1-1', role: 'user', content: '请帮我整理一下 REST API 的设计规范', created_at: dayAgo(3), tokens: 15, model: 'gpt-4o' },
    { id: 'm-cs1-2', role: 'assistant', content: '## REST API 设计规范\n\n以下是核心设计原则：\n\n- **资源命名**：使用名词复数形式，如 `/users`、`/orders`\n- **HTTP 方法**：GET 查询、POST 创建、PUT 全量更新、PATCH 部分更新、DELETE 删除\n- **状态码**：200 成功、201 创建成功、400 参数错误、401 未认证、403 无权限、404 不存在\n- **分页**：使用 `page` + `page_size` 参数，返回 `pagination` 对象\n- **版本控制**：URL 前缀 `/api/v1/`\n\n需要我针对某个方面展开说明吗？', created_at: dayAgo(3), tokens: 180, model: 'gpt-4o' },
    { id: 'm-cs1-3', role: 'user', content: '错误响应格式怎么设计？', created_at: ago(4320), tokens: 10, model: 'gpt-4o' },
    { id: 'm-cs1-4', role: 'assistant', content: '推荐统一错误响应格式：\n\n```json\n{\n  "code": 40001,\n  "message": "参数校验失败",\n  "details": [\n    { "field": "email", "message": "邮箱格式不正确" }\n  ]\n}\n```\n\n- `code`：业务错误码，前 2 位为 HTTP 状态码\n- `message`：人类可读的错误描述\n- `details`：字段级别的错误详情（表单场景）', created_at: ago(4320), tokens: 120, model: 'gpt-4o' },
    { id: 'm-cs1-5', role: 'user', content: '版本升级策略呢？', created_at: ago(4300), tokens: 8, model: 'gpt-4o' },
    { id: 'm-cs1-6', role: 'assistant', content: 'API 版本升级建议：\n\n1. **URL 版本**：`/api/v1/` → `/api/v2/`，最直观\n2. **Header 版本**：`Accept: application/vnd.myapi.v2+json`\n3. **兼容策略**：旧版本至少维护 6 个月\n4. **迁移文档**：提供 changelog 和迁移指南\n\n推荐使用 URL 版本，简单直接。', created_at: ago(4300), tokens: 95, model: 'gpt-4o' },
  ],
  'cs-2': [
    { id: 'm-cs2-1', role: 'user', content: '给我介绍一下这个项目的整体架构', created_at: dayAgo(2), tokens: 12, model: 'glm-4' },
    { id: 'm-cs2-2', role: 'assistant', content: '## OpenClaw 平台架构概览\n\n### 前端\n- **技术栈**：React 18 + TypeScript + MUI + Vite\n- **状态管理**：Zustand + React Query\n- **Mock 模式**：Axios 适配器拦截，无需后端\n\n### 后端\n- **框架**：Go + Gin\n- **数据库**：PostgreSQL / SQLite\n- **认证**：JWT\n\n### 核心模块\n1. **Agent 引擎**：智能体创建、技能编排、工作流执行\n2. **模型网关**：多模型源轮转、策略路由、成本统计\n3. **RAG 系统**：知识库管理、文档分块、向量检索\n4. **连接器**：企业微信/钉钉/飞书等第三方接入\n5. **身份管理**：用户/角色/组织/权限体系', created_at: dayAgo(2), tokens: 250, model: 'glm-4' },
    { id: 'm-cs2-3', role: 'user', content: '如何启动开发环境？', created_at: ago(60), tokens: 10, model: 'glm-4' },
    { id: 'm-cs2-4', role: 'assistant', content: '## 开发环境启动\n\n### 前端\n```bash\ncd frontend\nnpm install\nnpm run dev\n```\n访问 http://localhost:5173\n\n### 后端\n```bash\ngo run cmd/openclaw/main.go\n```\nAPI 运行在 http://localhost:8000\n\n### Docker 一键启动\n```bash\ndocker-compose up -d\n```\n\n> 提示：前端设置 `VITE_MOCK_ENABLED=true` 可跳过后端依赖。', created_at: ago(60), tokens: 150, model: 'glm-4' },
  ],
  'cs-t1': [
    { id: 'm-t1-1', role: 'user', content: '帮我写一段 Python 快排', created_at: dayAgo(1), tokens: 8, model: 'gpt-4o' },
    { id: 'm-t1-2', role: 'assistant', content: '```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)\n\n# 示例\nprint(quicksort([3, 6, 8, 10, 1, 2, 1]))\n# 输出: [1, 1, 2, 3, 6, 8, 10]\n```\n\n这是经典的 Python 快速排序实现，简洁易懂。如果需要原地排序版本（更省内存），我也可以提供。', created_at: dayAgo(1), tokens: 160, model: 'gpt-4o' },
  ],
  'cs-3': [
    { id: 'm-cs3-1', role: 'user', content: '数据库查询很慢，怎么优化？', created_at: dayAgo(5), tokens: 10, model: 'gpt-4o' },
    { id: 'm-cs3-2', role: 'assistant', content: '## 数据库查询优化建议\n\n1. **添加索引**：对 WHERE、JOIN、ORDER BY 的列建索引\n2. **避免全表扫描**：检查 EXPLAIN 输出\n3. **分页优化**：使用游标分页代替 OFFSET\n4. **查询改写**：避免 SELECT *，只查需要的列\n5. **缓存**：对热点数据使用 Redis 缓存\n\n能提供具体的慢查询 SQL 吗？我可以针对性优化。', created_at: dayAgo(5), tokens: 130, model: 'gpt-4o' },
    { id: 'm-cs3-3', role: 'user', content: '这个查询要 5 秒：SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC', created_at: dayAgo(4), tokens: 20, model: 'gpt-4o' },
    { id: 'm-cs3-4', role: 'assistant', content: '针对这条查询的优化方案：\n\n```sql\n-- 创建复合索引\nCREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);\n\n-- 改写查询（只查需要的列）\nSELECT id, order_no, amount, created_at\nFROM orders\nWHERE status = \'pending\'\nORDER BY created_at DESC\nLIMIT 50;\n```\n\n**关键点**：\n- 复合索引覆盖 WHERE + ORDER BY\n- 避免 SELECT *，减少 IO\n- 加 LIMIT 防止返回过多数据', created_at: dayAgo(4), tokens: 140, model: 'gpt-4o', attachments: [{ name: '索引优化方案.sql', type: 'sql', content: '-- 数据库索引优化方案\n-- 生成时间：2026-08-25\n\n-- 1. 主查询优化：复合索引覆盖 WHERE + ORDER BY\nCREATE INDEX idx_orders_status_created\n  ON orders (status, created_at DESC);\n\n-- 2. 关联查询索引：用户表外键\nCREATE INDEX idx_orders_user_id\n  ON orders (user_id);\n\n-- 3. 统计查询覆盖索引\nCREATE INDEX idx_orders_amount_status\n  ON orders (amount, status)\n  INCLUDE (order_no, created_at);\n\n-- 4. 改写后的查询示例\nSELECT id, order_no, amount, created_at\nFROM orders\nWHERE status = \'pending\'\nORDER BY created_at DESC\nLIMIT 50;' }] },
  ],
  'cs-4': [
    { id: 'm-cs4-1', role: 'user', content: 'React 应用越来越慢，有什么优化方案？', created_at: dayAgo(7), tokens: 12, model: 'claude-3.5-sonnet' },
    { id: 'm-cs4-2', role: 'assistant', content: '## React 性能优化方案\n\n### 渲染优化\n- `React.memo` 避免不必要的重渲染\n- `useMemo` / `useCallback` 缓存计算结果和回调\n- 虚拟列表（react-window）处理长列表\n\n### 代码分割\n- `React.lazy` + `Suspense` 路由级懒加载\n- 动态 import 按需加载组件\n\n### 状态管理\n- 状态下沉：将 state 放在尽可能低的层级\n- 使用 Zustand/Jotai 替代全局 Context\n\n### 构建优化\n- Tree shaking 移除死代码\n- 图片压缩与 WebP 格式', created_at: dayAgo(7), tokens: 200, model: 'claude-3.5-sonnet' },
  ],
  'cs-5': [
    { id: 'm-cs5-1', role: 'user', content: '帮我写一个 K8s Deployment 配置', created_at: dayAgo(10), tokens: 12, model: 'gpt-4o' },
    { id: 'm-cs5-2', role: 'assistant', content: '```yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: openclaw-api\n  labels:\n    app: openclaw\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: openclaw\n  template:\n    metadata:\n      labels:\n        app: openclaw\n    spec:\n      containers:\n      - name: api\n        image: openclaw/api:latest\n        ports:\n        - containerPort: 8000\n        resources:\n          requests:\n            memory: "256Mi"\n            cpu: "250m"\n          limits:\n            memory: "512Mi"\n            cpu: "500m"\n        livenessProbe:\n          httpGet:\n            path: /health\n            port: 8000\n          initialDelaySeconds: 10\n```\n\n包含 3 副本、资源限制和健康检查。需要 Service 配置吗？', created_at: dayAgo(10), tokens: 180, model: 'gpt-4o' },
  ],
  'cs-6': [
    { id: 'm-cs6-1', role: 'user', content: '产品需求评审需要注意哪些要点？', created_at: dayAgo(12), tokens: 12, model: 'gpt-4o' },
    { id: 'm-cs6-2', role: 'assistant', content: '## 产品需求评审要点\n\n1. **用户价值**：需求是否解决真实用户痛点\n2. **可行性**：技术实现难度与工期评估\n3. **边界条件**：异常流程和边界情况是否覆盖\n4. **数据指标**：如何衡量需求上线效果\n5. **依赖关系**：是否依赖其他模块或外部服务\n6. **安全合规**：数据隐私和权限设计', created_at: dayAgo(12), tokens: 120, model: 'gpt-4o' },
  ],
  'cs-7': [
    { id: 'm-cs7-1', role: 'user', content: '帮我生成本周工作周报', created_at: dayAgo(14), tokens: 12, model: 'glm-4' },
    { id: 'm-cs7-2', role: 'assistant', content: '## 本周工作周报\n\n### 已完成\n- 完成用户管理模块的 CRUD 接口开发\n- 修复了 3 个线上 Bug（登录超时、数据导出异常、权限校验遗漏）\n- 参与产品需求评审，完成技术方案设计\n\n### 进行中\n- Agent 工作流引擎开发（进度 60%）\n- 单元测试覆盖率提升至 75%\n\n### 下周计划\n- 完成工作流引擎核心逻辑\n- 启动性能优化专项\n\n需要调整内容吗？', created_at: dayAgo(14), tokens: 160, model: 'glm-4', attachments: [{ name: '2026年8月第4周周报.html', type: 'html', content: '<h1>2026年8月第4周工作周报</h1><h2>一、本周完成工作</h2><ul><li>完成用户管理模块 CRUD 接口开发，覆盖增删改查全部 12 个端点</li><li>修复线上 Bug 3 项：登录超时（Token 刷新竞态）、数据导出异常（分页越界）、权限校验遗漏（/api/agents/:id/debug）</li><li>参与 v2.3 产品需求评审，输出技术方案设计文档</li><li>完成 Agent 工作流引擎核心调度逻辑（DAG 解析 + 节点执行）</li></ul><h2>二、进行中工作</h2><ul><li>Agent 工作流引擎开发（整体进度 60%，预计下周完成）</li><li>单元测试覆盖率从 62% 提升至 75%</li><li>编写 API 接口文档（Swagger OpenAPI 3.0 格式）</li></ul><h2>三、下周计划</h2><ul><li>完成工作流引擎可视化画布与节点编排</li><li>启动性能优化专项：接口 P99 延迟从 800ms 降至 300ms</li><li>协助 QA 完成 v2.3 回归测试</li></ul><h2>四、风险与阻塞</h2><p>模型网关在并发超过 200 QPS 时偶发超时，需运维协助排查网络层配置。</p>' }] },
  ],
  // cs-9: 采购申请审批跟进
  'cs-9': [
    { id: 'm-cs9-1', role: 'user', content: '帮我查一下采购申请 PO-2026-0831 的审批进度', created_at: ago(180), tokens: 15, model: 'gpt-4o' },
    { id: 'm-cs9-2', role: 'assistant', content: '## 采购申请 PO-2026-0831 审批状态\n\n**状态：审批未通过（已驳回）**\n\n**驳回原因**：预算超出部门季度额度\n\n**详细说明**：\n- 申请金额：¥85,000\n- 部门季度剩余额度：¥62,000\n- 超出额度：¥23,000\n\n**建议方案**：\n1. **缩减采购数量重报**：将采购数量从 200 台降至 150 台，金额控制在 ¥63,750\n2. **申请临时额度**：向财务部提交临时额度申请，说明采购紧急程度\n\n你可以直接告诉我怎么处理，我来帮你重新整理申请材料。', created_at: ago(170), tokens: 200, model: 'gpt-4o', attachments: [{ name: '采购申请单-PO-2026-0831.pdf', type: 'pdf', content: '采购申请单\n═══════════════════════════════\n单号：PO-2026-0831\n申请日期：2026-08-28\n申请部门：技术部\n申请人：张伟\n\n一、采购明细\n───────────────────────────────\n品名          数量    单价      小计\n办公笔记本    200台   ¥425     ¥85,000\n\n二、审批记录\n───────────────────────────────\n部门主管  审批通过  2026-08-28\n财务审核  审批驳回  2026-08-29\n  驳回原因：超出部门季度预算额度\n\n三、备注\n───────────────────────────────\n请缩减数量后重新提交，或申请临时额度。' }] },
  ],
  // cs-handoff-1: 转交会话
  'cs-handoff-1': [
    { id: 'm-handoff-1', role: 'user', content: '王五让我帮忙看 ERP 审批接口的问题', created_at: ago(90), tokens: 15, model: 'gpt-4o' },
    { id: 'm-handoff-2', role: 'assistant', content: '好的，我来帮你排查 ERP 审批接口的问题。请提供以下信息：\n\n1. 接口地址和请求参数\n2. 报错信息或状态码\n3. 问题出现的时间点\n\n或者你可以直接描述一下具体现象。', created_at: ago(89), tokens: 60, model: 'gpt-4o' },
    { id: 'm-handoff-3', role: 'user', content: '报错是 500，接口是 /api/erp/approval/submit，参数是 {"po_id": "PO-2026-0831"}', created_at: ago(88), tokens: 20, model: 'gpt-4o' },
    { id: 'm-handoff-4', role: 'assistant', content: '## 初步定位\n\n根据报错信息分析：\n\n- **接口**：`/api/erp/approval/submit`\n- **状态码**：500（服务端内部错误）\n- **可能原因**：\n  1. ERP 系统连接超时（网络或服务端宕机）\n  2. 采购申请数据校验失败（字段缺失或格式错误）\n  3. 审批流程配置异常（流程节点缺失）\n\n**建议排查步骤**：\n1. 检查 ERP 系统服务端日志\n2. 确认 PO-2026-0831 的数据完整性\n3. 验证审批流程配置是否正确\n\n需要我帮你生成调试请求的脚本吗？', created_at: ago(80), tokens: 180, model: 'gpt-4o' },
  ],
  // cs-shared-1: 分享会话（只读）
  'cs-shared-1': [
    { id: 'm-shared-1', role: 'user', content: '帮我优化 CRM 系统的销售话术模板', created_at: ago(60), tokens: 15, model: 'gpt-4o' },
    { id: 'm-shared-2', role: 'assistant', content: '## CRM 销售话术优化建议\n\n### 初次接触\n- 原话术："你好，我是XX公司的销售经理"\n- 优化后："您好，我是XX公司的[姓名]，看到贵公司在[领域]发展很快，我们帮助过类似企业提升了30%的效率"\n\n### 需求挖掘\n- 使用 SPIN 提问法：背景→难点→暗示→价值\n- 避免直接推销，先了解客户痛点\n\n### 异议处理\n- 价格异议：强调 ROI 和长期价值\n- 竞品对比：突出差异化优势，不贬低对手\n\n### 促成交易\n- 假设成交法："您看是周三还是周五方便签约？"\n- 限时优惠：制造紧迫感', created_at: ago(55), tokens: 220, model: 'gpt-4o' },
    { id: 'm-shared-3', role: 'user', content: '很好，帮我整理成一份话术手册', created_at: ago(50), tokens: 10, model: 'gpt-4o' },
  ],
  // grp-1: 群组会话
  'grp-1': [
    { id: 'm-grp-1', role: 'user', user_id: 'u-3', user_name: '王五', to_ai: false, content: '预测模型 v2 的 bug 我修完了，大家回归一下', created_at: ago(120), tokens: 0, model: '' },
    { id: 'm-grp-2', role: 'user', user_id: 'u-2', user_name: '李思', to_ai: false, content: '收到，下午我跑一遍回归', created_at: ago(100), tokens: 0, model: '' },
    { id: 'm-grp-3', role: 'user', user_id: 'u-1', user_name: '张伟', to_ai: true, content: '帮我汇总一下本周各区域的销售预测完成情况', created_at: ago(80), tokens: 15, model: 'gpt-4o' },
    { id: 'm-grp-4', role: 'assistant', reply_to_name: '张伟', content: '@张伟 本周各区域销售预测汇总如下：\n\n| 区域 | 预测目标 | 实际完成 | 完成率 |\n|------|---------|---------|--------|\n| 华东 | 1,200万 | 1,104万 | 92% |\n| 华南 | 980万 | 931万 | 95% |\n| 华北 | 860万 | 843万 | 98% |\n| 西南 | 520万 | 452万 | 87% |\n| 华中 | 740万 | 718万 | 97% |\n\n**整体完成率 93.2%**，其中华东和西南区域偏低，建议重点关注。\n\n- 华东：受促销退单影响，约 96万订单延迟确认\n- 西南：新客户拓展不及预期，缺口约 68万\n- 其他区域均接近或超过目标', created_at: ago(75), tokens: 220, model: 'gpt-4o' },
    { id: 'm-grp-5', role: 'user', user_id: 'u-4', user_name: '赵六', to_ai: false, content: '数据口径和上周一致吗？别又混了退货单', created_at: ago(40), tokens: 0, model: '' },
  ],
};

// =================== 通知 ===================
const notifications: any[] = [
  { id: 'n-1', user_id: 'u-1', type: 'approval', title: '采购申请审批未通过', content: 'ERP 采购申请 PO-2026-0831 被驳回：预算超出部门季度额度。点击进入对话查看详情并继续处理。', from_name: '采购审批Agent', action_kind: 'chat', session_id: 'cs-9', read: false, created_at: ago(170) },
  { id: 'n-2', user_id: 'u-1', type: 'share', title: '王五 转交给你一段对话', content: 'ERP审批失败排查，附言：这单 ERP 审批卡住了，客户催得紧，你帮我看看怎么推进', from_name: '王五', action_kind: 'chat', session_id: 'cs-handoff-1', read: false, created_at: ago(85) },
  { id: 'n-3', user_id: 'u-1', type: 'share', title: '李思 向你分享了一段对话', content: 'CRM销售话术讨论，附言：这段分析你看看，下次评审用得上', from_name: '李思', action_kind: 'chat', session_id: 'cs-shared-1', read: false, created_at: ago(55) },
  { id: 'n-4', user_id: 'u-1', type: 'permission', title: '知识库编辑请求已转交', content: '你申请编辑「售后标准问答库」的请求已通知负责人王五，处理结果会再通知你。', from_name: '系统', action_kind: 'none', session_id: '', read: true, created_at: dayAgo(1) },
];

// =================== 审计日志 ===================
const auditLogs = [
  { id: 'al-1', user_id: 'u-1', user_name: '张伟', action: 'login', resource_type: 'auth', resource_id: '', detail: '管理员登录', ip: '192.168.1.100', created_at: ago(30) },
  { id: 'al-2', user_id: 'u-1', user_name: '张伟', action: 'create', resource_type: 'agent', resource_id: 'ag-1', detail: '创建 Agent：客服助手', ip: '192.168.1.100', created_at: dayAgo(1) },
  { id: 'al-3', user_id: 'u-2', user_name: '李思', action: 'update', resource_type: 'skill', resource_id: 'sk-3', detail: '更新技能：数据分析', ip: '192.168.1.101', created_at: dayAgo(2) },
];

// =================== K8s ===================
const k8sPods = [
  { id: 'pod-1', name: 'openclaw-api-7d8f9c6b5-x2k4j', namespace: 'openclaw', status: 'Running', restarts: 0, cpu: '120m', memory: '256Mi', node: 'node-1', created_at: dayAgo(5) },
  { id: 'pod-2', name: 'openclaw-api-7d8f9c6b5-m3n5p', namespace: 'openclaw', status: 'Running', restarts: 1, cpu: '95m', memory: '230Mi', node: 'node-2', created_at: dayAgo(5) },
  { id: 'pod-3', name: 'openclaw-web-5c4d3b2a1-q8r7s', namespace: 'openclaw', status: 'Running', restarts: 0, cpu: '45m', memory: '128Mi', node: 'node-1', created_at: dayAgo(3) },
  { id: 'pod-4', name: 'postgres-0', namespace: 'openclaw', status: 'Running', restarts: 0, cpu: '200m', memory: '512Mi', node: 'node-3', created_at: dayAgo(30) },
];

const k8sNodes = [
  { id: 'node-1', name: 'node-1', status: 'Ready', role: 'worker', cpu: '2.5/4', memory: '6.2/8Gi', pods: 12, created_at: dayAgo(30) },
  { id: 'node-2', name: 'node-2', status: 'Ready', role: 'worker', cpu: '1.8/4', memory: '5.1/8Gi', pods: 8, created_at: dayAgo(30) },
  { id: 'node-3', name: 'node-3', status: 'Ready', role: 'master', cpu: '3.2/8', memory: '12.5/16Gi', pods: 20, created_at: dayAgo(60) },
];

// =================== 队列 ===================
const queues = [
  { id: 'q-1', name: 'agent-execution', pending: 3, processing: 1, failed: 0, completed_today: 128 },
  { id: 'q-2', name: 'document-indexing', pending: 0, processing: 0, failed: 2, completed_today: 45 },
  { id: 'q-3', name: 'notification-send', pending: 12, processing: 2, failed: 1, completed_today: 567 },
];

// =================== 统计 ===================
const dashboardStats = {
  total_users: users.length,
  active_agents: agents.filter(a => a.status === 'active').length,
  total_requests_30d: modelSources.reduce((s, m) => s + m.requests_30d, 0),
  total_cost_30d: modelSources.reduce((s, m) => s + m.estimated_cost_30d, 0),
  active_sessions: chatSessions.length,
  knowledge_bases: knowledgeBases.length,
};

// =================== 账户匹配 ===================
const matchingResults = [
  { id: 'mr-1', chat_account_id: 'ca-1', chat_account_name: '微信-张三', third_party_id: 'tp-1', third_party_name: 'ERP-张三', confidence: 0.95, status: 'pending', created_at: dayAgo(1) },
  { id: 'mr-2', chat_account_id: 'ca-2', chat_account_name: '钉钉-李四', third_party_id: 'tp-2', third_party_name: 'CRM-李四', confidence: 0.88, status: 'confirmed', created_at: dayAgo(2) },
];

// =================== 智能报告 ===================
const reportTemplates = [
  { id: 'rt-1', name: '运营周报', description: '每周运营数据汇总', type: 'weekly', created_at: dayAgo(30) },
  { id: 'rt-2', name: '部门月报', description: '部门月度工作总结', type: 'monthly', created_at: dayAgo(30) },
];

const reportConfigs = [
  { id: 'rc-1', name: '技术部运营周报', template_id: 'rt-1', department_id: 'org-1', status: 'active', schedule: 'weekly', last_run_at: dayAgo(3), created_at: dayAgo(20) },
  { id: 'rc-2', name: '产品部月报', template_id: 'rt-2', department_id: 'org-2', status: 'active', schedule: 'monthly', last_run_at: dayAgo(15), created_at: dayAgo(15) },
];

// =================== 路由处理 ===================
export function handleMockRequest(method: string, url: string, params: any, data: any): any {
  const p = params || {};
  const d = data || {};
  const m = method.toLowerCase();

  // ---- 认证 ----
  if (url.match(/\/auth\/admin\/login$/) && m === 'post') {
    return ok({ access_token: 'mock-jwt-token', refresh_token: 'mock-refresh', user: users[0] });
  }
  if (url.match(/\/auth\/me$/) && m === 'get') {
    return ok(users[0]);
  }

  // ---- 用户 CRUD ----
  if (url.match(/\/users\/([^/]+)$/) && m === 'get') { const id = url.match(/\/users\/([^/]+)$/)![1]; return ok(users.find(u => u.id === id) || users[0]); }
  if (url.match(/\/users\/([^/]+)$/) && m === 'put') { const id = url.match(/\/users\/([^/]+)$/)![1]; const u = users.find(x => x.id === id); if (u) Object.assign(u, d); return ok(u); }
  if (url.match(/\/users\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/users$/) && m === 'post') { const nu = { id: 'u-' + Date.now(), ...d, status: 'active', created_at: now.toISOString() }; users.push(nu); return ok(nu); }
  if (url.match(/\/users/) && m === 'get') { return paginate(users, p); }

  // ---- 角色 ----
  if (url.match(/\/roles\/([^/]+)$/) && m === 'get') { return ok(roles.find(r => r.id === p.id) || roles[0]); }
  if (url.match(/\/roles\/([^/]+)$/) && m === 'put') { return ok({ ...roles[0], ...d }); }
  if (url.match(/\/roles\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/roles$/) && m === 'post') { return ok({ id: 'r-' + Date.now(), ...d }); }
  if (url.match(/\/roles/) && m === 'get') { return paginate(roles, p); }

  // ---- 组织 ----
  if (url.match(/\/organizations\/([^/]+)\/members$/) && m === 'get') { return ok(users.slice(0, 2)); }
  if (url.match(/\/organizations\/([^/]+)\/members/) && m === 'post') { return ok({ added: true }); }
  if (url.match(/\/organizations\/([^/]+)\/members/) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/organizations\/([^/]+)$/) && m === 'get') { return ok(organizations.find(o => o.id === url.match(/([^/]+)$/)![1]) || organizations[0]); }
  if (url.match(/\/organizations/) && m === 'get') { return paginate(organizations, p); }

  // ---- 模型源 ----
  if (url.match(/\/models\/sources\/([^/]+)$/) && m === 'get') { return ok(modelSources.find(s => s.id === url.match(/([^/]+)$/)![1]) || modelSources[0]); }
  if (url.match(/\/models\/sources\/([^/]+)$/) && m === 'put') { return ok({ ...modelSources[0], ...d }); }
  if (url.match(/\/models\/sources\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/models\/sources$/) && m === 'post') { return ok({ id: 'ms-' + Date.now(), ...d }); }
  if (url.match(/\/models\/sources/) && m === 'get') { return paginate(modelSources, p); }

  // ---- 模型策略 ----
  if (url.match(/\/models\/policies\/([^/]+)$/) && m === 'get') { return ok(modelPolicies.find(s => s.id === url.match(/([^/]+)$/)![1]) || modelPolicies[0]); }
  if (url.match(/\/models\/policies\/([^/]+)$/) && m === 'put') { return ok({ ...modelPolicies[0], ...d }); }
  if (url.match(/\/models\/policies\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/models\/policies$/) && m === 'post') { return ok({ id: 'mp-' + Date.now(), ...d }); }
  if (url.match(/\/models\/policies/) && m === 'get') { return paginate(modelPolicies, p); }

  // ---- 调用日志 & 费用 ----
  if (url.match(/\/models\/call-logs/) && m === 'get') {
    const logs = Array.from({ length: 20 }, (_, i) => ({ id: 'cl-' + i, model_name: modelSources[i % modelSources.length].model_name, tokens: Math.floor(Math.random() * 1000), cost: +(Math.random() * 0.5).toFixed(4), latency_ms: Math.floor(Math.random() * 3000), status: i % 7 === 0 ? 'failed' : 'success', created_at: ago(i * 30) }));
    return paginate(logs, p);
  }
  if (url.match(/\/models\/cost-stats/) && m === 'get') {
    return ok(modelSources.map(s => ({ model_name: s.display_name, cost: s.estimated_cost_30d, requests: s.requests_30d })));
  }

  // ---- 连接器 ----
  if (url.match(/\/connectors\/chat-adapters\/([^/]+)$/) && m === 'put') { return ok({ ...chatAdapters[0], ...d }); }
  if (url.match(/\/connectors\/chat-adapters\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/connectors\/chat-adapters$/) && m === 'post') { return ok({ id: 'ca-' + Date.now(), ...d }); }
  if (url.match(/\/connectors\/chat-adapters/) && m === 'get') { return paginate(chatAdapters, p); }
  if (url.match(/\/connectors\/integration-templates/) && m === 'get') { return paginate(integrationTemplates, p); }
  if (url.match(/\/connectors\/third-party-systems/) && m === 'get') { return paginate(thirdPartySystems, p); }
  if (url.match(/\/connectors\/([^/]+)$/) && m === 'get') { return ok(connectors.find(c => c.id === url.match(/([^/]+)$/)![1]) || connectors[0]); }
  if (url.match(/\/connectors/) && m === 'get') { return paginate(connectors, p); }

  // ---- 技能 ----
  if (url.match(/\/skills\/marketplace\/([^/]+)\/install/) && m === 'post') { return ok({ installed: true }); }
  if (url.match(/\/skills\/marketplace/) && m === 'get') { return paginate(skills.filter(s => s.status === 'published'), p); }
  if (url.match(/\/skills\/my/) && m === 'get') { return paginate(skills.filter(s => s.author_id === 'u-1'), p); }
  if (url.match(/\/skills\/installed/) && m === 'get') { return paginate(skills.slice(0, 3), p); }
  if (url.match(/\/skills\/([^/]+)\/fork/) && m === 'post') { return ok({ id: 'sk-' + Date.now(), ...d }); }
  if (url.match(/\/skills\/([^/]+)\/publish/) && m === 'post') { return ok({ published: true }); }
  if (url.match(/\/skills\/([^/]+)\/delist/) && m === 'post') { return ok({ delisted: true }); }
  if (url.match(/\/skills\/([^/]+)$/) && m === 'get') { return ok(skills.find(s => s.id === url.match(/([^/]+)$/)![1]) || skills[0]); }
  if (url.match(/\/skills\/([^/]+)$/) && m === 'put') { return ok({ ...skills[0], ...d }); }
  if (url.match(/\/skills\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/skills$/) && m === 'post') { return ok({ id: 'sk-' + Date.now(), ...d, status: 'draft' }); }
  if (url.match(/\/skills/) && m === 'get') { return paginate(skills, p); }

  // ---- 审核 ----
  if (url.match(/\/review\/([^/]+)\/approve/) && m === 'post') { return ok({ approved: true }); }
  if (url.match(/\/review\/([^/]+)\/reject/) && m === 'post') { return ok({ rejected: true }); }
  if (url.match(/\/review\/records/) && m === 'get') { return paginate([], p); }

  // ---- 资源权限 ----
  if (url.match(/\/resource-acl\//) && m === 'get') { return ok([]); }
  if (url.match(/\/resource-acl\//) && (m === 'post' || m === 'put')) { return ok({ id: 'acl-' + Date.now(), ...d }); }
  if (url.match(/\/resource-acl\//) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/resource-acl/) && m === 'get') { return ok([]); }

  // ---- 前台权限 ----
  if (url.match(/\/front-perm\/resources/) && m === 'get') { return paginate([], p); }
  if (url.match(/\/front-perm\/roles/) && m === 'get') { return ok(roles); }
  if (url.match(/\/front-perm\//) && m === 'get') { return ok([]); }
  if (url.match(/\/front-perm\//) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/front-perm\//) && m === 'delete') { return ok({ deleted: true }); }

  // ---- Agent ----
  if (url.match(/\/agents\/runs/) && m === 'get') { return paginate(agentExecutions, p); }
  if (url.match(/\/agents\/executions\/([^/]+)$/) && m === 'get') { return ok(agentExecutions.find(e => e.id === url.match(/([^/]+)$/)![1]) || agentExecutions[0]); }
  if (url.match(/\/agents\/([^/]+)\/executions/) && m === 'get') { return paginate(agentExecutions.filter(e => e.agent_id === url.match(/\/agents\/([^/]+)/)![1]), p); }
  if (url.match(/\/agents\/([^/]+)\/collaborators/) && m === 'get') { return ok(users.slice(0, 2)); }
  if (url.match(/\/agents\/([^/]+)\/collaborators/) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/agents\/([^/]+)\/collaborators/) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/agents\/([^/]+)\/transfer/) && m === 'post') { return ok({ transferred: true }); }
  if (url.match(/\/agents\/([^/]+)\/fork/) && m === 'post') { return ok({ id: 'ag-' + Date.now(), ...d }); }
  if (url.match(/\/agents\/([^/]+)\/save/) && m === 'post') { return ok({ saved: true }); }
  if (url.match(/\/agents\/([^/]+)\/debug\/chat/) && m === 'post') { return ok({ reply: '这是调试模式的回复', tokens: 50 }); }
  if (url.match(/\/agents\/([^/]+)\/debug\/workflows/) && m === 'post') { return ok({ result: '调试完成' }); }
  if (url.match(/\/agents\/workflows\/([^/]+)$/) && m === 'get') { return ok({ id: url.match(/([^/]+)$/)![1], nodes: [], edges: [] }); }
  if (url.match(/\/agents\/workflows\/([^/]+)$/) && m === 'put') { return ok({ saved: true }); }
  if (url.match(/\/agents\/([^/]+)$/) && m === 'get') { return ok(agents.find(a => a.id === url.match(/([^/]+)$/)![1]) || agents[0]); }
  if (url.match(/\/agents\/([^/]+)$/) && m === 'put') { return ok({ ...agents[0], ...d }); }
  if (url.match(/\/agents\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/agents$/) && m === 'post') { return ok({ id: 'ag-' + Date.now(), ...d, status: 'inactive' }); }
  if (url.match(/\/agents/) && m === 'get') { return paginate(agents, p); }

  // ---- 输出声明 ----
  if (url.match(/\/output-declarations\/register/) && m === 'post') { return ok({ id: 'od-' + Date.now() }); }
  if (url.match(/\/output-declarations\/check/) && m === 'post') { return ok({ valid: true }); }
  if (url.match(/\/output-declarations/) && m === 'get') { return ok([]); }

  // ---- Token ----
  if (url.match(/\/tokens\/whitelist\/check\//) && m === 'get') { return ok({ allowed: true }); }
  if (url.match(/\/tokens\/whitelist\/([^/]+)$/) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/tokens\/whitelist/) && m === 'get') { return ok([]); }
  if (url.match(/\/tokens\/whitelist/) && m === 'post') { return ok({ id: 'tw-' + Date.now(), ...d }); }
  if (url.match(/\/tokens\/quotas\/([^/]+)\/toggle/) && m === 'post') { return ok({ toggled: true }); }
  if (url.match(/\/tokens\/quotas\/([^/]+)\/top-up/) && m === 'post') { return ok({ topped_up: true }); }
  if (url.match(/\/tokens\/quotas\/top-up-logs\//) && m === 'get') { return ok([]); }
  if (url.match(/\/tokens\/quotas\/([^/]+)$/) && m === 'get') { return ok({ user_id: url.match(/([^/]+)$/)![1], quota: 100000, used: 50000 }); }
  if (url.match(/\/tokens\/quotas\/([^/]+)$/) && m === 'put') { return ok({ ...d }); }
  if (url.match(/\/tokens\/quotas/) && m === 'get') { return ok([]); }
  if (url.match(/\/tokens\/([^/]+)$/) && m === 'get') { return ok(tokens.find(t => t.id === url.match(/([^/]+)$/)![1]) || tokens[0]); }
  if (url.match(/\/tokens\/([^/]+)$/) && m === 'put') { return ok({ ...tokens[0], ...d }); }
  if (url.match(/\/tokens\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/tokens$/) && m === 'post') { return ok({ id: 'tk-' + Date.now(), ...d }); }
  if (url.match(/\/tokens/) && m === 'get') { return paginate(tokens, p); }

  // ---- Token 账户 ----
  if (url.match(/\/token-accounts\/([^/]+)\/members/) && m === 'get') { return ok(users.slice(0, 2)); }
  if (url.match(/\/token-accounts\/([^/]+)\/members/) && m === 'post') { return ok({ added: true }); }
  if (url.match(/\/token-accounts\/members\/([^/]+)$/) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/token-accounts\/whitelist/) && m === 'get') { return ok([]); }
  if (url.match(/\/token-accounts/) && m === 'get') { return ok([{ id: 'ta-1', name: '公共Token账户', balance: 500000 }]); }

  // ---- 组织树 ----
  if (url.match(/\/org-tree/) && m === 'get') {
    return ok({ id: 'root', name: '总公司', children: organizations.map(o => ({ id: o.id, name: o.name, children: [] })) });
  }

  // ---- 公共额度 ----
  if (url.match(/\/front-perm\/resources\/([^/]+)\/public-quota/) && m === 'get') { return ok({ enabled: true, quota: 100000 }); }
  if (url.match(/\/front-perm\/resources\/([^/]+)\/public-quota/) && m === 'post') { return ok({ enabled: true }); }
  if (url.match(/\/front-perm\/resources\/([^/]+)\/public-quota/) && m === 'delete') { return ok({ disabled: true }); }

  // ---- 账户管理 ----
  if (url.match(/\/accounts\/chat\/([^/]+)\/bindUser/) && m === 'put') { return ok({ bound: true }); }
  if (url.match(/\/accounts\/chat/) && m === 'get') { return paginate([{ id: 'acc-1', name: '微信-张三', platform: 'wechat', bound_user_id: 'u-1', bound_user_name: '张伟' }], p); }
  if (url.match(/\/accounts\/third-party\/([^/]+)\/bindUser/) && m === 'put') { return ok({ bound: true }); }
  if (url.match(/\/accounts\/third-party/) && m === 'get') { return paginate([{ id: 'acc-tp-1', name: 'ERP-张三', system: 'erp', bound_user_id: 'u-1', bound_user_name: '张伟' }], p); }

  // ---- 账户匹配 ----
  if (url.match(/\/account-matching\/results\/([^/]+)$/) && m === 'put') { return ok({ ...d }); }
  if (url.match(/\/account-matching\/results/) && m === 'get') { return paginate(matchingResults, p); }
  if (url.match(/\/account-matching\/runs/) && m === 'get') { return paginate([{ id: 'run-1', status: 'completed', matched: 5, created_at: dayAgo(1) }], p); }
  if (url.match(/\/account-matching\/strategies\/swap/) && m === 'post') { return ok({ swapped: true }); }
  if (url.match(/\/account-matching\/strategies/) && m === 'get') { return ok([{ id: 'str-1', name: '邮箱匹配', priority: 1 }, { id: 'str-2', name: '姓名匹配', priority: 2 }]); }
  if (url.match(/\/account-matching\/strategies/) && m === 'post') { return ok({ id: 'str-' + Date.now(), ...d }); }
  if (url.match(/\/account-matching\/trigger/) && m === 'post') { return ok({ triggered: true }); }

  // ---- 额度 ----
  if (url.match(/\/quotas\/([^/]+)$/) && m === 'get') { return ok({ user_id: url.match(/([^/]+)$/)![1], quota: 100000, used: 50000 }); }
  if (url.match(/\/quotas\/([^/]+)$/) && m === 'put') { return ok({ ...d }); }
  if (url.match(/\/quotas/) && m === 'get') { return ok([]); }

  // ---- 审计日志 ----
  if (url.match(/\/audit\/logs/) && m === 'get') { return paginate(auditLogs, p); }

  // ---- 统计 ----
  if (url.match(/\/stats\/dashboard/) && m === 'get') { return ok(dashboardStats); }
  if (url.match(/\/stats\/usage/) && m === 'get') {
    return ok({ daily: Array.from({ length: 7 }, (_, i) => ({ date: dayAgo(6 - i).slice(0, 10), requests: Math.floor(Math.random() * 500 + 100), tokens: Math.floor(Math.random() * 100000 + 20000) })) });
  }

  // ---- 聊天会话 ----
  if (url.match(/\/chat\/sessions\/([^/]+)\/messages$/) && m === 'get') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)\/messages/)![1];
    return ok(chatMessages[sid] || []);
  }
  if (url.match(/\/chat\/sessions\/([^/]+)\/messages$/) && m === 'post') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)\/messages/)![1];
    if (!chatMessages[sid]) chatMessages[sid] = [];
    const session = chatSessions.find(s => s.id === sid);
    const isGroup = session?.session_type === 'group';
    const toAi = d.to_ai !== false; // default true
    const userMsg: any = { id: 'm-' + Date.now(), role: 'user', content: d.content, created_at: new Date().toISOString(), tokens: d.content?.length || 10, model: 'gpt-4o' };
    if (d.user_name) { userMsg.user_name = d.user_name; userMsg.user_id = 'u-1'; }
    if (isGroup) { userMsg.to_ai = toAi; if (!toAi) { userMsg.tokens = 0; userMsg.model = ''; } }
    chatMessages[sid].push(userMsg);
    // AI 回复：仅 single 或 to_ai!==false 时生成
    if (!isGroup || toAi) {
      const aiContent = isGroup
        ? `@${d.user_name || '张伟'} 收到你的消息："${d.content}"。这是 mock 模式下的自动回复。`
        : '收到你的消息："' + d.content + '"。这是 mock 模式下的自动回复，实际场景会调用 AI 模型生成回复。';
      const aiMsg: any = { id: 'm-' + (Date.now() + 1), role: 'assistant', content: aiContent, created_at: new Date().toISOString(), tokens: 80, model: 'gpt-4o' };
      if (isGroup) aiMsg.reply_to_name = d.user_name || '张伟';
      chatMessages[sid].push(aiMsg);
    }
    if (session) { session.message_count = chatMessages[sid].length; session.last_message_at = new Date().toISOString(); }
    return ok(userMsg);
  }
  if (url.match(/\/chat\/sessions\/([^/]+)\/share$/) && m === 'post') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)\/share/)![1];
    const source = chatSessions.find(s => s.id === sid);
    const mode = d.mode || 'continue';
    const messageIds: string[] | undefined = d.message_ids;
    const prefix = mode === 'view' ? '【分享】' : '【转交】';
    const sharedSessions: string[] = [];
    (d.recipient_ids || []).forEach((rid: string, idx: number) => {
      const newId = 'cs-' + Date.now() + idx;
      const newTitle = prefix + (source?.title || '对话');
      const srcMsgs = chatMessages[sid] || [];
      const msgs = messageIds && messageIds.length > 0
        ? messageIds.map(mid => srcMsgs.find(m => m.id === mid)).filter(Boolean)
        : [...srcMsgs];
      chatSessions.push({
        id: newId, title: newTitle, user_id: rid, mode: 'chat', model_policy_id: 'mp-1', model_policy: 'Auto',
        status: 'active', workspace_name: '', readonly: mode === 'view',
        shared_from: { name: '张伟', note: d.note || '' },
        session_type: source?.session_type, creator_id: source?.creator_id,
        member_ids: source?.member_ids ? [...source.member_ids] : undefined,
        agent_ids: source?.agent_ids ? [...source.agent_ids] : undefined,
        skill_ids: source?.skill_ids ? [...source.skill_ids] : undefined,
        message_count: msgs.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
      });
      chatMessages[newId] = msgs.map(msg => ({ ...msg, id: msg.id + '-copy-' + idx }));
      sharedSessions.push(newId);
      // 创建通知
      const recipient = users.find(u => u.id === rid);
      const msgCountSuffix = msgs.length > 0 ? `（共 ${msgs.length} 条消息）` : '';
      notifications.unshift({
        id: 'n-' + Date.now() + idx, user_id: rid, type: 'share',
        title: `张伟 ${mode === 'view' ? '向你分享了' : '转交给你'}一段对话`,
        content: `${source?.title || '对话'}，附言：${d.note || ''}${msgCountSuffix}`,
        from_name: '张伟', action_kind: 'chat', session_id: newId,
        read: false, created_at: new Date().toISOString(),
      });
    });
    return ok({ shared_count: (d.recipient_ids || []).length });
  }
  if (url.match(/\/chat\/sessions\/([^/]+)$/) && m === 'get') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)$/)![1];
    return ok(chatSessions.find(s => s.id === sid) || null);
  }
  if (url.match(/\/chat\/sessions\/([^/]+)$/) && m === 'put') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)$/)![1];
    const s = chatSessions.find(x => x.id === sid);
    if (s) Object.assign(s, d);
    return ok(s);
  }
  if (url.match(/\/chat\/sessions\/([^/]+)$/) && m === 'delete') {
    const sid = url.match(/\/chat\/sessions\/([^/]+)$/)![1];
    const idx = chatSessions.findIndex(s => s.id === sid);
    if (idx >= 0) chatSessions.splice(idx, 1);
    return ok({ deleted: true });
  }
  if (url.match(/\/chat\/sessions$/) && m === 'post') {
    const ns = { id: 'cs-' + Date.now(), ...d, user_id: 'u-1', status: 'active', workspace_name: d.workspace_name || '', message_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() };
    chatSessions.unshift(ns);
    chatMessages[ns.id] = [];
    return ok(ns);
  }
  if (url.match(/\/chat\/sessions/) && m === 'get') { return paginate(chatSessions.filter(s => (!s.user_id || s.user_id === 'u-1') || (s.session_type === 'group' && s.member_ids?.includes('u-1'))), p); }

  // ---- 通知 ----
  if (url.match(/\/notifications\/read-all$/) && m === 'post') {
    let count = 0;
    notifications.forEach(n => { if (!n.read) { n.read = true; count++; } });
    return ok({ count });
  }
  if (url.match(/\/notifications\/([^/]+)\/read$/) && m === 'post') {
    const nid = url.match(/\/notifications\/([^/]+)\/read/)![1];
    const n = notifications.find(x => x.id === nid);
    if (n) n.read = true;
    return ok(n);
  }
  if (url.match(/\/notifications$/) && m === 'post') {
    const nn = { id: 'n-' + Date.now(), ...d, read: false, created_at: new Date().toISOString() };
    notifications.unshift(nn);
    return ok(nn);
  }
  if (url.match(/\/notifications/) && m === 'get') { return ok(notifications.filter(n => n.user_id === 'u-1').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())); }

  // ---- RAG 知识库 ----
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)\/analytics/) && m === 'get') {
    return ok({ total_documents: 128, total_chunks: 4560, total_queries: 890, hit_rate: 0.85 });
  }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)\/wiki/) && m === 'get') {
    return ok({ content: '# 知识库Wiki\n\n这是自动生成的知识库概览。' });
  }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)\/collaborators/) && m === 'get') { return ok(users.slice(0, 2)); }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)\/collaborators/) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)\/collaborators/) && m === 'delete') { return ok({ removed: true }); }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)$/) && m === 'get') { return ok(knowledgeBases.find(k => k.id === url.match(/([^/]+)$/)![1]) || knowledgeBases[0]); }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)$/) && m === 'put') { return ok({ ...knowledgeBases[0], ...d }); }
  if (url.match(/\/rag\/knowledge-bases\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/rag\/knowledge-bases$/) && m === 'post') { return ok({ id: 'kb-' + Date.now(), ...d, document_count: 0 }); }
  if (url.match(/\/rag\/knowledge-bases/) && m === 'get') { return paginate(knowledgeBases, p); }

  if (url.match(/\/rag\/documents\/([^/]+)\/chunks/) && m === 'get') {
    return ok(Array.from({ length: 5 }, (_, i) => ({ id: 'chunk-' + i, content: `这是第 ${i + 1} 个分块的内容...`, index: i, tokens: 200 + i * 50 })));
  }
  if (url.match(/\/rag\/documents\/([^/]+)\/detail/) && m === 'get') { return ok({ ...documents[0], chunks: [] }); }
  if (url.match(/\/rag\/documents\/([^/]+)$/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/rag\/documents\/markdown/) && m === 'post') { return ok({ id: 'doc-' + Date.now(), ...d }); }
  if (url.match(/\/rag\/documents/) && m === 'post') { return ok({ id: 'doc-' + Date.now(), ...d }); }
  if (url.match(/\/rag\/documents/) && m === 'get') { return paginate(documents, p); }

  if (url.match(/\/rag\/faq/) && m === 'post') { return ok({ id: 'faq-' + Date.now(), ...d }); }
  if (url.match(/\/rag\/faq/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/rag\/faq/) && m === 'get') { return paginate(faqItems, p); }

  if (url.match(/\/rag\/chat/) && m === 'post') { return ok({ answer: '这是 RAG 模式下的回复。根据知识库检索结果：' + (d.message || ''), sources: documents.slice(0, 2).map(doc => ({ doc_name: doc.title, score: 0.85 - Math.random() * 0.2, content: '相关文档内容片段...' })) }); }
  if (url.match(/\/rag\/retrieve/) && m === 'post') { return ok({ results: documents.slice(0, 3).map(doc => ({ doc_name: doc.title, score: 0.9 - Math.random() * 0.2, content: '检索到的相关内容...' })) }); }

  // ---- 工作空间 ----
  if (url.match(/\/workspace\/members/) && m === 'get') { return paginate(users, p); }
  if (url.match(/\/workspace\/members/) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/workspace\/members/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/workspace\/organizations/) && m === 'get') { return paginate(organizations, p); }
  if (url.match(/\/workspace\/organizations/) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/workspace\/organizations/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/workspace\/api-keys/) && m === 'get') { return ok([]); }
  if (url.match(/\/workspace\/api-keys/) && m === 'post') { return ok({ id: 'wk-' + Date.now(), ...d }); }
  if (url.match(/\/workspace\/api-keys/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/workspace\/audit-logs/) && m === 'get') { return paginate(auditLogs, p); }

  // ---- 系统 ----
  if (url.match(/\/system\/k8s\/pods/) && m === 'get') { return ok(k8sPods); }
  if (url.match(/\/system\/k8s\/nodes/) && m === 'get') { return ok(k8sNodes); }
  if (url.match(/\/system\/k8s\/clusters/) && m === 'get') { return ok([{ id: 'cluster-1', name: 'production', nodes: 3, pods: 40 }]); }
  if (url.match(/\/system\/k8s\/clusters\/([^/]+)$/) && m === 'get') { return ok({ id: 'cluster-1', name: 'production', nodes: 3, pods: 40 }); }
  if (url.match(/\/system\/queues/) && m === 'get') { return ok(queues); }
  if (url.match(/\/system\/queues\/failed/) && m === 'delete') { return ok({ cleared: true }); }
  if (url.match(/\/system\/queues\/failed\/([^/]+)\/retry/) && m === 'post') { return ok({ retried: true }); }
  if (url.match(/\/system\/restart\/([^/]+)$/) && m === 'post') { return ok({ restarted: true }); }
  if (url.match(/\/system\/stacks\/([^/]+)\/compose/) && m === 'get') { return ok({ yaml: 'version: "3"\nservices:\n  api:\n    image: openclaw/api\n' }); }
  if (url.match(/\/system\/stacks\/([^/]+)\/compose/) && m === 'put') { return ok({ saved: true }); }
  if (url.match(/\/system\/stacks\/([^/]+)\/logs/) && m === 'get') { return ok({ logs: 'Starting service...\nService ready.\n' }); }
  if (url.match(/\/system\/stacks\/([^/]+)\/(restart|start|stop|pause|pull)/) && m === 'post') { return ok({ done: true }); }
  if (url.match(/\/system\/stacks\/([^/]+)$/) && m === 'get') { return ok({ id: url.match(/([^/]+)$/)![1], name: 'openclaw-stack', status: 'running', services: 3 }); }
  if (url.match(/\/system\/stacks/) && m === 'get') { return paginate([{ id: 'openclaw', name: 'openclaw-stack', status: 'running', services: 3 }, { id: 'monitor', name: 'monitor-stack', status: 'running', services: 2 }], p); }
  if (url.match(/\/system\/health/) && m === 'get') { return ok({ status: 'healthy', uptime: '7d 12h' }); }

  // ---- 报告 ----
  if (url.match(/\/reports\/templates/) && m === 'get') { return ok(reportTemplates); }
  if (url.match(/\/reports\/templates/) && m === 'post') { return ok({ id: 'rt-' + Date.now(), ...d }); }
  if (url.match(/\/reports\/templates/) && m === 'put') { return ok({ ...d }); }
  if (url.match(/\/reports\/templates/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/reports\/configs\/([^/]+)\/toggle/) && m === 'post') { return ok({ toggled: true }); }
  if (url.match(/\/reports\/configs\/([^/]+)\/trigger/) && m === 'post') { return ok({ triggered: true }); }
  if (url.match(/\/reports\/configs/) && m === 'get') { return paginate(reportConfigs, p); }
  if (url.match(/\/reports\/configs/) && (m === 'post' || m === 'put')) { return ok({ ...d }); }
  if (url.match(/\/reports\/configs/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/reports\/departments/) && m === 'get') { return ok(organizations); }
  if (url.match(/\/reports\/([^/]+)\/export/) && m === 'get') { return ok({ url: '#', format: 'pdf' }); }
  if (url.match(/\/reports\/([^/]+)\/fork/) && m === 'post') { return ok({ id: 'rpt-' + Date.now(), ...d }); }
  if (url.match(/\/reports\/([^/]+)$/) && m === 'get') { return ok({ id: url.match(/([^/]+)$/)![1], title: '运营周报', content: '# 周报内容\n\n## 核心指标\n\n- DAU: 1,234\n- 转化率: 3.2%' }); }
  if (url.match(/\/reports\/list/) && m === 'get') { return paginate([], p); }

  // ---- Token 转售 ----
  if (url.match(/\/token-resale\/overview/) && m === 'get') { return ok({ total_buyers: 5, monthly_revenue: 125000, active_sources: 3 }); }
  if (url.match(/\/token-resale\/sources/) && m === 'get') { return ok(modelSources.slice(0, 3).map(s => ({ ...s, resale_enabled: true, resale_price: s.estimated_cost_30d * 1.2 }))); }
  if (url.match(/\/token-resale\/sources\/([^/]+)\/toggle/) && m === 'post') { return ok({ toggled: true }); }
  if (url.match(/\/token-resale\/sources\/([^/]+)$/) && m === 'put') { return ok({ ...d }); }
  if (url.match(/\/token-resale\/buyers/) && m === 'get') { return paginate([{ id: 'buyer-1', name: '客户A', balance: 50000, status: 'active' }], p); }
  if (url.match(/\/token-resale\/buyers/) && (m === 'post' || m === 'put')) { return ok({ id: 'buyer-' + Date.now(), ...d }); }
  if (url.match(/\/token-resale\/buyers/) && m === 'delete') { return ok({ deleted: true }); }
  if (url.match(/\/token-resale\/usage/) && m === 'get') { return paginate([], p); }
  if (url.match(/\/token-resale\/settlements/) && m === 'get') { return ok([]); }
  if (url.match(/\/token-resale\/settle/) && m === 'post') { return ok({ settled: true }); }

  // ---- 默认 ----
  return ok([]);
}
