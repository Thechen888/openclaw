

import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  AGENT_OUTPUT_BY_DEPT,
  DEPARTMENTS,
  DEPT_QUARTERLY_REPORT,
} from '../data/demoData';
import {
  createReportDataKey,
  getReportPeriod,
  usePrototypeStore,
} from '../report-engine/reportStore';
import type { AgentOutput } from '../report-engine/types';
import {
  validateReportAgentOutput,
  type ValidationIssue,
} from '../report-engine/validation';

type RunStatus = 'idle' | 'running' | 'done' | 'error';
type AgentStepId = 'collect' | 'json' | 'validation' | 'write' | 'complete';

interface AgentStep {
  id: AgentStepId;
  label: string;
  status: RunStatus;
  output?: string;
}

interface AgentRunnerProps {
  dataByDepartment?: Record<string, AgentOutput>;
}

function createSteps(selectedDept: string): AgentStep[] {
  return [
    { id: 'collect', label: `连接并采集数据 (${selectedDept})`, status: 'running' },
    { id: 'json', label: '生成平铺 JSON', status: 'idle' },
    { id: 'validation', label: '共享协议校验', status: 'idle' },
    { id: 'write', label: '写入前端状态', status: 'idle' },
    { id: 'complete', label: '完成', status: 'idle' },
  ];
}

const sleep = (milliseconds: number) => (
  new Promise<void>(resolve => setTimeout(resolve, milliseconds))
);

export default function AgentRunner({
  dataByDepartment = AGENT_OUTPUT_BY_DEPT,
}: AgentRunnerProps) {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const updateStep = (id: AgentStepId, updates: Partial<AgentStep>) => {
    setSteps(previous => previous.map(step => (
      step.id === id ? { ...step, ...updates } : step
    )));
  };

  const runAgent = async () => {
    setRunning(true);
    setResult(null);
    setValidationIssues([]);
    setSteps(createSteps(selectedDept));

    try {
      await sleep(600);
      const departmentData = dataByDepartment[selectedDept];
      if (!departmentData) {
        throw new Error(`没有找到“${selectedDept}”的示例数据`);
      }
      updateStep('collect', {
        status: 'done',
        output: `已获取 ${Object.keys(departmentData).length} 个平铺字段`,
      });

      updateStep('json', { status: 'running' });
      await sleep(400);
      const outputJson = JSON.stringify(departmentData, null, 2);
      setResult(outputJson);
      updateStep('json', {
        status: 'done',
        output: `生成 ${outputJson.length} 字节 JSON`,
      });

      updateStep('validation', { status: 'running' });
      await sleep(400);
      const validation = validateReportAgentOutput(
        DEPT_QUARTERLY_REPORT,
        departmentData,
        selectedDept,
      );
      if (!validation.ok) {
        setValidationIssues(validation.issues);
        updateStep('validation', {
          status: 'error',
          output: `校验失败：${validation.issues.length} 个问题`,
        });
        toast.error(`${selectedDept} 数据校验失败`);
        return;
      }
      updateStep('validation', {
        status: 'done',
        output: '平铺输出符合当前报告范围的字段协议',
      });

      updateStep('write', { status: 'running' });
      await sleep(300);
      const reportDataKey = createReportDataKey(
        DEPT_QUARTERLY_REPORT.id,
        getReportPeriod(DEPT_QUARTERLY_REPORT),
        selectedDept,
      );
      usePrototypeStore.getState().setReportData(reportDataKey, departmentData);
      updateStep('write', {
        status: 'done',
        output: `已写入“${selectedDept}”会话数据`,
      });

      updateStep('complete', { status: 'running' });
      await sleep(200);
      updateStep('complete', {
        status: 'done',
        output: 'Agent 运行结果已可供报告预览使用',
      });
      toast.success(`${selectedDept} Agent 执行完成`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSteps(previous => previous.map(step => (
        step.status === 'running'
          ? { ...step, status: 'error', output: message }
          : step
      )));
      toast.error(`Agent 运行失败：${message}`);
    } finally {
      setRunning(false);
    }
  };

  const resetRun = () => {
    setSteps([]);
    setResult(null);
    setValidationIssues([]);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-700">Agent 运行示例</h3>
        </div>
        <span className="text-xs text-gray-400">平铺 JSON 通过共享协议校验后写入前端状态</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Data ID 说明：</strong>Agent 输出平铺 JSON（如 {`{"headcount": 45}`}）。
          <code className="bg-amber-100 px-1 rounded mx-1">dept_agent</code>
          只属于报告模板引用路径，例如
          <code className="bg-amber-100 px-1 rounded ml-1">{`{{dept_agent.headcount}}`}</code>。
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            aria-label="选择部门"
            value={selectedDept}
            onChange={event => setSelectedDept(event.target.value)}
            disabled={running}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            {DEPARTMENTS.map(department => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>

          <button
            onClick={runAgent}
            disabled={running}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              running
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? '运行中...' : '运行 Agent'}
          </button>
          {!running && steps.length > 0 && (
            <button onClick={resetRun} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw size={12} /> 重置
            </button>
          )}
        </div>

        {steps.length > 0 && (
          <div className="space-y-1">
            {steps.map(step => (
              <div
                key={step.id}
                data-testid={`agent-step-${step.id}`}
                data-status={step.status}
                className="flex items-start gap-2 py-1.5"
              >
                <div className="mt-0.5">
                  {step.status === 'idle' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  {step.status === 'running' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                  {step.status === 'done' && <CheckCircle size={16} className="text-green-500" />}
                  {step.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${
                    step.status === 'done'
                      ? 'text-gray-700'
                      : step.status === 'running'
                        ? 'text-blue-600 font-medium'
                        : step.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                  {step.output && <p className="text-xs text-gray-500 mt-0.5 font-mono">{step.output}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {validationIssues.length > 0 && (
          <div role="alert" className="border border-red-200 bg-red-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">共享协议校验失败</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-red-600">
              {validationIssues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  {issue.message}
                  <code className="ml-1 text-red-400">({issue.path})</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Agent 原始输出 JSON（平铺键）：</p>
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono leading-relaxed">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
