

import { useState } from 'react';
import { Bot, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AgentRunner from './AgentRunner';

const EXAMPLES = [
  {
    title: '1. 单值绑定 (Single Value)',
    desc: 'Agent 输出平铺键值对，报告模板通过 Data ID 组成完整引用路径。',
    agentOutput: `{
  "dept_name": "研发部",
  "headcount": 45,
  "satisfaction": "92%",
  "budget_rate": "70.8%"
}`,
    template: '模板中写: {{dept_agent.dept_name}} 部门共 {{dept_agent.headcount}} 人',
    result: '研发部 部门共 45 人',
  },
  {
    title: '2. KV 数据绑定 (Key-Value)',
    desc: 'Agent 输出嵌套对象，模板仍从 Data ID 开始引用子键。',
    agentOutput: `{
  "quarterly_revenue": {
    "Q1": 1200000,
    "Q2": 1350000,
    "Q3": 1500000
  }
}`,
    template: '模板中写: Q1收入 {{finance_agent.quarterly_revenue.Q1}}',
    result: 'Q1收入 1,200,000',
    extra: '模板引用规范：{{agent_name.data_key.sub_key}}，Data ID 用于区分不同 Agent 的数据。',
  },
  {
    title: '3. 数组绑定 (Array)',
    desc: 'Agent 输出对象数组，用于动态表格行或图表。',
    agentOutput: `{
  "project_status": [
    {"project": "Agent平台", "status": "进行中", "progress": "65%", "owner": "张工"},
    {"project": "数据中台V2", "status": "已完成", "progress": "100%", "owner": "李工"},
    {"project": "AI推理服务", "status": "进行中", "progress": "40%", "owner": "王工"}
  ]
}`,
    template: `动态表格:
{
  arrayBindingKey: "dept_agent.project_status",
  dynamicColumns: [
    { key: "project", label: "项目" },
    { key: "status", label: "状态" },
    { key: "progress", label: "进度" },
    { key: "owner", label: "负责人" }
  ]
}
图表:
{ bindingKey: "dept_agent.project_status", labelField: "project", valueFields: ["progress"] }`,
    result: '动态表格按 dynamicColumns 固定列顺序和标题；缺失列显示“—”，对象中的额外 key 不会自动成为列。',
  },
  {
    title: '4. 数组绑定图表 (Array → Chart)',
    desc: '数组数据可直接绑定到饼图、柱状图、折线图',
    agentOutput: `{
  "skill_distribution": [
    {"name": "后端开发", "value": 18},
    {"name": "前端开发", "value": 10},
    {"name": "AI/ML", "value": 8},
    {"name": "测试", "value": 5}
  ],
  "monthly_output": [
    {"month": "4月", "commits": 320, "reviews": 180, "deploys": 24},
    {"month": "5月", "commits": 380, "reviews": 210, "deploys": 28},
    {"month": "6月", "commits": 410, "reviews": 230, "deploys": 32}
  ]
}`,
    template: `饼图: { type: "pie", bindingKey: "analytics_agent.skill_distribution", labelField: "name", valueFields: ["value"] }
柱状图: { type: "bar", bindingKey: "analytics_agent.monthly_output", labelField: "month", valueFields: ["commits","reviews","deploys"] }
堆叠柱状图: { type: "stacked-bar", ... }
折线图: { type: "line", ... }`,
    result: 'labelField → X轴/标签, valueFields → Y轴/数值(多个field=多系列)',
  },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('已复制');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        aria-label="复制代码"
        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function AgentProtocol() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Bot size={22} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Agent 数据协议</h2>
            <p className="text-sm text-gray-500">定义 Agent 如何输出数据，以及数据如何绑定到报告模板</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>原型边界：</strong>这是纯前端会话原型，Agent 运行结果写入前端状态，
          刷新会重置；未接真实 LLM 或后端。
        </div>

        {/* Agent Runner */}
        <div className="mb-8">
          <AgentRunner />
        </div>

        {/* Binding Types */}
        <div className="space-y-3 mb-8">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                {openIdx === i ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-700">{ex.title}</span>
              </button>
              {openIdx === i && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-600">{ex.desc}</p>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Agent 输出:</p>
                    <CodeBlock code={ex.agentOutput} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">模板绑定:</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 font-mono whitespace-pre-wrap">
                      {ex.template}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">渲染结果:</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                      {ex.result}
                    </div>
                  </div>

                  {ex.extra && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                      💡 {ex.extra}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Data Format Summary */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">数据格式速查</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600 border-b">类型</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 border-b">Agent 输出</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 border-b">模板引用</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 border-b">可绑定到</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs text-purple-600">single</td>
                  <td className="px-4 py-2 font-mono text-xs">{`"key": "value"`}</td>
                  <td className="px-4 py-2 font-mono text-xs">{`{{agent_name.key}}`}</td>
                  <td className="px-4 py-2 text-xs">文本、KPI卡片</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-2 font-mono text-xs text-blue-600">kv</td>
                  <td className="px-4 py-2 font-mono text-xs">{`"key": {"a":1,"b":2}`}</td>
                  <td className="px-4 py-2 font-mono text-xs">{`{{agent_name.key.a}} {{agent_name.key.b}}`}</td>
                  <td className="px-4 py-2 text-xs">表格单元格、饼图</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs text-green-600">array</td>
                  <td className="px-4 py-2 font-mono text-xs">{`"key": [{...}, ...]`}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    动态表格: arrayBindingKey=&quot;agent_name.key&quot; + dynamicColumns<br />
                    图表: bindingKey=&quot;agent_name.key&quot;
                  </td>
                  <td className="px-4 py-2 text-xs">动态表格、柱状图、折线图、饼图</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
