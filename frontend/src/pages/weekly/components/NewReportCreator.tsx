

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ReportDefinition, ReportViewMode, ReportSection, ChartType,
  BindingField, BindingValueType, CellStyle, ChartConfig,
  ReportType, ReportSchedule,
} from '../report-engine/types';
import SectionRenderer from './SectionRenderer';
import { COMPANY_AGENT_OUTPUT } from '../data/demoData';
import { createReportDataContext } from '../report-engine/template-engine';
import { validateReportDefinition, type ValidationIssue } from '../report-engine/validation';
import { Plus, X, BarChart2, PieChart as PieIcon, Table, Type, CreditCard, Trash2, GripVertical, ArrowUp, ArrowDown, Settings, FileText, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { outputDeclarationsApi } from '../../../api/client';

const STYLE_PRESETS = [
  { name: '蓝色商务', header: { backgroundColor: '#1e40af', color: '#fff' } },
  { name: '绿色清新', header: { backgroundColor: '#059669', color: '#fff' } },
  { name: '紫色优雅', header: { backgroundColor: '#7c3aed', color: '#fff' } },
  { name: '深色专业', header: { backgroundColor: '#1f2937', color: '#fff' } },
  { name: '红色醒目', header: { backgroundColor: '#dc2626', color: '#fff' } },
  { name: '橙色活力', header: { backgroundColor: '#ea580c', color: '#fff' } },
];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const DEFAULT_CELL_STYLE: CellStyle = {
  padding: 8,
  textAlign: 'center',
  borderColor: '#e5e7eb',
  fontSize: 14,
};

// 报告类型与调度相关常量
const REPORT_TYPE_OPTIONS: { value: ReportType; label: string; frequency: string }[] = [
  { value: 'daily',     label: '日报',   frequency: '每天' },
  { value: 'weekly',    label: '周报',   frequency: '每周' },
  { value: 'monthly',   label: '月报',   frequency: '每月' },
  { value: 'quarterly', label: '季度报', frequency: '每季度' },
  { value: 'yearly',    label: '年报',   frequency: '每年' },
];
const WEEK_DAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

function defaultScheduleFor(type: ReportType): ReportSchedule {
  switch (type) {
    case 'daily':     return { type, hour: 9, minute: 0 };
    case 'weekly':    return { type, dayOfWeek: 1, hour: 9, minute: 0 };
    case 'monthly':   return { type, dayOfMonth: 1, hour: 9, minute: 0 };
    case 'quarterly': return { type, monthOfQuarter: 1, dayOfMonth: 1, hour: 9, minute: 0 };
    case 'yearly':    return { type, month: 1, dayOfMonth: 1, hour: 9, minute: 0 };
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function migrateBindingPath(path: string, previousDataId: string, nextDataId: string): string {
  const previousPrefix = `${previousDataId}.`;
  if (!path.startsWith(previousPrefix)) return path;
  return `${nextDataId}.${path.slice(previousPrefix.length)}`;
}

function migrateTemplateBindings(
  template: string,
  previousDataId: string,
  nextDataId: string,
): string {
  return template
    .split(`{{${previousDataId}.`)
    .join(`{{${nextDataId}.`);
}

function migrateSectionDataId(
  section: ReportSection,
  previousDataId: string,
  nextDataId: string,
): ReportSection {
  switch (section.type) {
    case 'table':
      return {
        ...section,
        arrayBindingKey: section.arrayBindingKey
          ? migrateBindingPath(section.arrayBindingKey, previousDataId, nextDataId)
          : undefined,
        rows: section.rows.map(row => ({
          ...row,
          cells: row.cells.map(cell => (
            cell.type === 'binding'
              ? {
                ...cell,
                value: migrateTemplateBindings(cell.value, previousDataId, nextDataId),
              }
              : cell
          )),
        })),
      };
    case 'chart':
      return {
        ...section,
        charts: section.charts.map(chart => ({
          ...chart,
          bindingKey: migrateBindingPath(chart.bindingKey, previousDataId, nextDataId),
        })),
      };
    case 'kpi-cards':
      return {
        ...section,
        cards: section.cards.map(card => ({
          ...card,
          bindingKey: migrateBindingPath(card.bindingKey, previousDataId, nextDataId),
          trendBinding: card.trendBinding
            ? migrateBindingPath(card.trendBinding, previousDataId, nextDataId)
            : undefined,
        })),
      };
    case 'text':
    case 'markdown':
    case 'html':
      return {
        ...section,
        content: migrateTemplateBindings(section.content, previousDataId, nextDataId),
      };
  }
}

interface Props {
  onCreate: (report: ReportDefinition) => void;
  onCancel: () => void;
  // 传入时表单以该报告初始化，handleCreate 会保留原 id/createdAt（等同编辑模式）
  initialReport?: ReportDefinition;
}

export default function NewReportCreator({ onCreate, onCancel, initialReport }: Props) {
  const isEditing = !!initialReport;
  const [name, setName] = useState(initialReport?.name ?? '新报告');
  const [description, setDescription] = useState(initialReport?.description ?? '');
  const [period, setPeriod] = useState(initialReport?.period ?? '2026-Q2');
  const [dataId, setDataId] = useState(initialReport?.dataId ?? 'report_agent');
  const [viewMode, setViewMode] = useState<ReportViewMode>(initialReport?.viewMode ?? 'page');
  const [reportType, setReportType] = useState<ReportType>(initialReport?.reportType ?? 'weekly');
  const [schedule, setSchedule] = useState<ReportSchedule>(
    initialReport?.schedule ?? defaultScheduleFor(initialReport?.reportType ?? 'weekly'),
  );
  const [headerStyle, setHeaderStyle] = useState<CellStyle>({ backgroundColor: '#1e40af', color: '#fff', fontWeight: 'bold', fontSize: 14, padding: 10, textAlign: 'center' });
  // tab 化数据结构：page 模式仅使用 tabList[0]，tab 模式可编辑多个 tab
  const [tabList, setTabList] = useState<{ id: string; label: string; sections: ReportSection[] }[]>(
    () => {
      if (initialReport) {
        if (initialReport.viewMode === 'tab' && initialReport.tabs && initialReport.tabs.length > 0) {
          // 编辑已有 tab 报告：保留完整的 tab 字段（含 departmentKey 等）
          return initialReport.tabs.map(t => ({ ...t }));
        }
        // 编辑 page 模式报告：包一层默认 tab
        return [{ id: uuidv4(), label: '默认', sections: initialReport.sections ?? [] }];
      }
      return [{ id: uuidv4(), label: '默认', sections: [] }];
    },
  );
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const activeTab = tabList[activeTabIdx] ?? tabList[0];
  const sections = activeTab?.sections ?? [];
  const setSections = (updater: (prev: ReportSection[]) => ReportSection[]) => {
    setTabList(prev => prev.map((tab, i) => (
      i !== activeTabIdx ? tab : { ...tab, sections: updater(tab.sections) }
    )));
  };
  const [bindingFields, setBindingFields] = useState<BindingField[]>(initialReport?.bindingFields ?? []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<BindingValueType>('single');
  const [creationIssues, setCreationIssues] = useState<ValidationIssue[]>([]);

  // ===== 工作流输出声明（报告联动） =====
  const { data: declData } = useQuery({ queryKey: ['output-declarations'], queryFn: () => outputDeclarationsApi.list() });
  const declarations: any[] = declData?.data?.data || [];
  // 判断初始 dataId 是否在登记表中，不在则视为“自定义”
  const initialIsCustom = !!initialReport?.dataId && !declarations.some(d => d.dataKey === initialReport.dataId);
  const [isCustomDataId, setIsCustomDataId] = useState(initialIsCustom || declarations.length === 0);
  // 当登记表加载完成后，若当前 dataId 不在登记表中且非自定义模式，则切为自定义
  useEffect(() => {
    if (declarations.length > 0 && dataId && !declarations.some(d => d.dataKey === dataId)) {
      setIsCustomDataId(true);
    }
  }, [declarations]);

  const handleSelectDeclaration = (dk: string) => {
    if (dk === '__custom__') {
      setIsCustomDataId(true);
      return;
    }
    setIsCustomDataId(false);
    const decl = declarations.find(d => d.dataKey === dk);
    if (decl) {
      updateDataId(decl.dataKey);
      // 自动带出 Schema 填入 bindingFields
      if (decl.output_fields?.length) {
        setBindingFields(decl.output_fields.map((f: any) => ({ name: f.name, label: f.label || f.name, type: f.type || 'single' })));
      }
    }
  };

  // 切换报告类型时同步重置 schedule 为对应默认值
  const changeReportType = (nextType: ReportType) => {
    setReportType(nextType);
    setSchedule(defaultScheduleFor(nextType));
  };

  // Tab 增删改名切换
  const addTab = () => {
    setTabList(prev => [...prev, { id: uuidv4(), label: `标签 ${prev.length + 1}`, sections: [] }]);
    setActiveTabIdx(tabList.length);
    setEditingIdx(null);
  };
  const removeTab = (idx: number) => {
    if (tabList.length <= 1) {
      toast.error('至少保留一个标签');
      return;
    }
    setTabList(prev => prev.filter((_, i) => i !== idx));
    setActiveTabIdx(prev => {
      if (idx < prev) return prev - 1;
      if (idx === prev) return Math.max(0, prev - 1);
      return prev;
    });
    setEditingIdx(null);
  };
  const renameTab = (idx: number, label: string) => {
    setTabList(prev => prev.map((tab, i) => (i === idx ? { ...tab, label } : tab)));
  };

  // 部分覆盖 schedule（字段可能只属于某个分支，依靠 UI 保证不在错误 type 下调用）
  const patchSchedule = (patch: Record<string, number>) => {
    setSchedule(s => ({ ...s, ...patch }) as ReportSchedule);
  };

  const addBinding = () => {
    if (!newFieldName || !newFieldLabel) return;
    setBindingFields(prev => [...prev, {
      name: newFieldName,
      label: newFieldLabel,
      type: newFieldType,
    }]);
    setNewFieldName('');
    setNewFieldLabel('');
  };

  const addSection = (type: ReportSection['type']) => {
    let section: ReportSection;
    switch (type) {
      case 'kpi-cards':
        section = { type: 'kpi-cards', cards: [
          { label: '指标1', bindingKey: `${dataId}.metric1`, icon: 'check-circle' },
          { label: '指标2', bindingKey: `${dataId}.metric2`, icon: 'users' },
          { label: '指标3', bindingKey: `${dataId}.metric3`, icon: 'wallet' },
        ] };
        break;
      case 'table':
        section = {
          type: 'table', title: '数据表格', colCount: 3,
          headerStyle, defaultStyle: DEFAULT_CELL_STYLE,
          arrayBindingKey: `${dataId}.table_data`,
          dynamicColumns: [
            { key: 'col1', label: '列1' },
            { key: 'col2', label: '列2' },
            { key: 'col3', label: '列3' },
          ],
          rows: [
            { id: uuidv4(), isHeader: true, cells: ['列1', '列2', '列3'].map(v => ({ id: uuidv4(), type: 'fixed' as const, value: v })) },
          ],
        };
        break;
      case 'chart':
        section = {
          type: 'chart', layout: 'row',
          charts: [{
            id: uuidv4(), title: '图表标题', type: 'bar' as ChartType,
            bindingKey: `${dataId}.chart_data`, labelField: 'name', valueFields: ['value'], colors: CHART_COLORS,
          }],
        };
        break;
      case 'text':
        section = { type: 'text', content: `报告说明 {{${dataId}.description}}`, color: '#374151', fontSize: 14 };
        break;
      case 'markdown':
        section = { type: 'markdown', content: '## 报告说明\n\n这里是 **Markdown** 格式的内容。' };
        break;
      case 'html':
        section = { type: 'html', content: '<div><p>自定义 HTML 内容</p></div>' };
        break;
      default: return;
    }
    setSections(prev => [...prev, section]);
    setEditingIdx(sections.length);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    if (editingIdx === idx) setEditingIdx(newIdx);
  };

  const updateSection = (idx: number, updated: ReportSection) => {
    setSections(prev => prev.map((s, i) => i === idx ? updated : s));
  };

  const updateDataId = (nextDataId: string) => {
    if (nextDataId === dataId) return;
    setTabList(previous => previous.map(tab => ({
      ...tab,
      sections: tab.sections.map(section => migrateSectionDataId(section, dataId, nextDataId)),
    })));
    setDataId(nextDataId);
  };

  const handleCreate = () => {
    const report: ReportDefinition = {
      // 编辑模式下保留原 id 与 createdAt，确保 upsert 到同一条报告
      id: initialReport?.id ?? uuidv4(),
      name: name.trim(), period, dataId, description,
      icon: initialReport?.icon ?? 'layout-grid',
      viewMode,
      reportType,
      schedule,
      sections: viewMode === 'page' ? (tabList[0]?.sections ?? []) : undefined,
      tabs: viewMode === 'tab' ? tabList : undefined,
      bindingFields,
      createdAt: initialReport?.createdAt ?? new Date().toISOString(),
    };
    const validation = validateReportDefinition(report);
    const issues = [
      ...(name.trim() ? [] : [{ path: 'name', message: '报告名称不能为空' }]),
      ...validation.issues,
    ];
    setCreationIssues(issues);
    if (issues.length > 0) {
      toast.error('请修正报告定义中的问题');
      return;
    }
    onCreate(report);
    toast.success(isEditing ? '报告已保存' : '报告已创建');
  };

  const renderSectionEditor = (section: ReportSection, idx: number) => {
    if (section.type === 'table') {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">表格标题</label>
            <input type="text" value={section.title || ''} onChange={e => updateSection(idx, { ...section, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">数据绑定键 (arrayBindingKey)</label>
            <input type="text" value={section.arrayBindingKey || ''} onChange={e => updateSection(idx, { ...section, arrayBindingKey: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder={`${dataId}.table_data`} />
            <p className="text-[10px] text-gray-400 mt-0.5">绑定到 Agent 输出的数组字段，如 company_agent.all_projects</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">表头背景</label>
              <input type="color" value={section.headerStyle?.backgroundColor || '#1e40af'}
                onChange={e => updateSection(idx, { ...section, headerStyle: { ...section.headerStyle, backgroundColor: e.target.value } })}
                className="w-full h-8 rounded border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">表头文字</label>
              <input type="color" value={section.headerStyle?.color || '#ffffff'}
                onChange={e => updateSection(idx, { ...section, headerStyle: { ...section.headerStyle, color: e.target.value } })}
                className="w-full h-8 rounded border border-gray-300 cursor-pointer" />
            </div>
          </div>
          {/* Dynamic Columns Editor */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">动态列定义</label>
            <div className="space-y-1.5">
              {(section.dynamicColumns || []).map((col, ci) => (
                <div key={ci} className="flex items-center gap-1.5">
                  <input type="text" value={col.key} onChange={e => {
                    const cols = [...(section.dynamicColumns || [])];
                    cols[ci] = { ...col, key: e.target.value };
                    const headerRow = { id: uuidv4(), isHeader: true as const, cells: cols.map(c => ({ id: uuidv4(), type: 'fixed' as const, value: c.label })) };
                    updateSection(idx, { ...section, dynamicColumns: cols, colCount: cols.length, rows: [headerRow] });
                  }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono" placeholder="字段key" />
                  <input type="text" value={col.label} onChange={e => {
                    const cols = [...(section.dynamicColumns || [])];
                    cols[ci] = { ...col, label: e.target.value };
                    const headerRow = { id: uuidv4(), isHeader: true as const, cells: cols.map(c => ({ id: uuidv4(), type: 'fixed' as const, value: c.label })) };
                    updateSection(idx, { ...section, dynamicColumns: cols, colCount: cols.length, rows: [headerRow] });
                  }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="列标签" />
                  <button onClick={() => {
                    const cols = (section.dynamicColumns || []).filter((_, j) => j !== ci);
                    const headerRow = { id: uuidv4(), isHeader: true as const, cells: cols.map(c => ({ id: uuidv4(), type: 'fixed' as const, value: c.label })) };
                    updateSection(idx, { ...section, dynamicColumns: cols, colCount: cols.length, rows: [headerRow] });
                  }} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                </div>
              ))}
              <button onClick={() => {
                const cols = [...(section.dynamicColumns || []), { key: 'new_col', label: '新列' }];
                const headerRow = { id: uuidv4(), isHeader: true as const, cells: cols.map(c => ({ id: uuidv4(), type: 'fixed' as const, value: c.label })) };
                updateSection(idx, { ...section, dynamicColumns: cols, colCount: cols.length, rows: [headerRow] });
              }} className="text-xs text-blue-600 hover:text-blue-800">+ 添加列</button>
            </div>
          </div>
          {/* Status Field */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态字段 (可选)</label>
            <input type="text" value={section.statusField || ''} onChange={e => updateSection(idx, { ...section, statusField: e.target.value || undefined })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
              placeholder="如 status，该列自动应用状态标签样式" />
          </div>
        </div>
      );
    }

    if (section.type === 'chart') {
      const chart = section.charts[0];
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">图表标题</label>
            <input type="text" value={chart.title} onChange={e => {
              const updated = { ...chart, title: e.target.value };
              updateSection(idx, { ...section, charts: [updated, ...section.charts.slice(1)] });
            }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">图表类型</label>
              <select value={chart.type} onChange={e => {
                const updated: ChartConfig = { ...chart, type: e.target.value as ChartType };
                updateSection(idx, { ...section, charts: [updated, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="bar">柱状图</option>
                <option value="pie">饼图</option>
                <option value="line">折线图</option>
                <option value="stacked-bar">堆叠柱状图</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">数据绑定键</label>
              <input type="text" value={chart.bindingKey} onChange={e => {
                const updated = { ...chart, bindingKey: e.target.value };
                updateSection(idx, { ...section, charts: [updated, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                placeholder={`${dataId}.data_key`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">标签字段</label>
              <input type="text" value={chart.labelField || ''} onChange={e => {
                const updated = { ...chart, labelField: e.target.value };
                updateSection(idx, { ...section, charts: [updated, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" placeholder="name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">数值字段（逗号分隔）</label>
              <input type="text" value={chart.valueFields?.join(', ') || ''} onChange={e => {
                const updated = { ...chart, valueFields: e.target.value.split(',').map(s => s.trim()) };
                updateSection(idx, { ...section, charts: [updated, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" placeholder="value" />
            </div>
          </div>
        </div>
      );
    }

    if (section.type === 'kpi-cards') {
      return (
        <div className="space-y-2">
          {section.cards.map((card, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <input type="text" value={card.label} onChange={e => {
                const cards = [...section.cards];
                cards[ci] = { ...card, label: e.target.value };
                updateSection(idx, { ...section, cards });
              }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="标签" />
              <input type="text" value={card.bindingKey} onChange={e => {
                const cards = [...section.cards];
                cards[ci] = { ...card, bindingKey: e.target.value };
                updateSection(idx, { ...section, cards });
              }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono" placeholder={`${dataId}.key`} />
              <button onClick={() => {
                const cards = section.cards.filter((_, j) => j !== ci);
                updateSection(idx, { ...section, cards });
              }} className="text-red-400 hover:text-red-600"><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => {
            updateSection(idx, { ...section, cards: [...section.cards, { label: '新指标', bindingKey: `${dataId}.new`, icon: 'check-circle' }] });
          }} className="text-xs text-blue-600 hover:text-blue-800">+ 添加指标</button>
        </div>
      );
    }

    if (section.type === 'text' || section.type === 'markdown' || section.type === 'html') {
      const labels = {
        text: '文本内容',
        markdown: 'Markdown 内容',
        html: 'HTML 内容',
      } as const;
      return (
        <textarea value={section.content} onChange={e => updateSection(idx, { ...section, content: e.target.value })}
          aria-label={labels[section.type]}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm h-20 resize-y focus:ring-2 focus:ring-blue-300 focus:outline-none"
          placeholder={`内容支持 {{${dataId}.key}} 绑定`} />
      );
    }

    return null;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Editor */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">{isEditing ? '编辑报告' : '新建报告'}</h2>
            <button onClick={onCancel} aria-label={isEditing ? '取消编辑' : '取消新建报告'} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          {/* Basic */}
          <div className="space-y-3">
            <div>
              <label htmlFor="new-report-name" className="block text-xs text-gray-500 mb-1">报告名称</label>
              <input id="new-report-name" type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full text-lg font-bold border border-gray-300 rounded px-2 py-1.5 outline-none bg-transparent placeholder-gray-300" placeholder="报告名称" />
            </div>
            <div>
              <label htmlFor="new-report-description" className="block text-xs text-gray-500 mb-1">报告描述</label>
              <input id="new-report-description" type="text" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none bg-transparent text-gray-500 placeholder-gray-300" placeholder="报告描述..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="new-report-period" className="block text-xs text-gray-500 mb-1">报告周期</label>
                <input id="new-report-period" type="text" value={period} onChange={e => setPeriod(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
              </div>
              <div>
                <label htmlFor="new-report-data-id" className="block text-xs text-gray-500 mb-1">Data ID</label>
                {isCustomDataId ? (
                  <div>
                    <input id="new-report-data-id" type="text" value={dataId} onChange={e => updateDataId(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" placeholder="report_agent" />
                    {declarations.length > 0 && (
                      <button type="button" onClick={() => setIsCustomDataId(false)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 mt-0.5">切换到工作流输出</button>
                    )}
                  </div>
                ) : (
                  <div>
                    <select id="new-report-data-id" value={dataId} onChange={e => handleSelectDeclaration(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono">
                      {declarations.map(d => (
                        <option key={d.dataKey} value={d.dataKey}>
                          {d.dataKey} — {d.description || '无说明'} ({d.workflow_name || '未知工作流'})
                        </option>
                      ))}
                      <option value="__custom__">自定义...</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="new-report-view-mode" className="block text-xs text-gray-500 mb-1">展示模式</label>
                <select id="new-report-view-mode" value={viewMode} onChange={e => setViewMode(e.target.value as ReportViewMode)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                  <option value="page">单页</option>
                  <option value="tab">标签页</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">报告调度</h4>
              <span className="text-[10px] text-gray-400">频率：{REPORT_TYPE_OPTIONS.find(t => t.value === reportType)?.frequency ?? ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-report-type" className="block text-xs text-gray-500 mb-1">报告类型</label>
                <select id="new-report-type" value={reportType} onChange={e => changeReportType(e.target.value as ReportType)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                  {REPORT_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">生成时间</label>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={23} value={schedule.hour}
                    aria-label="小时"
                    onChange={e => patchSchedule({ hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
                    className="w-14 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-center" />
                  <span className="text-xs text-gray-400">:</span>
                  <input type="number" min={0} max={59} value={schedule.minute}
                    aria-label="分钟"
                    onChange={e => patchSchedule({ minute: Math.max(0, Math.min(59, Number(e.target.value) || 0)) })}
                    className="w-14 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-center" />
                </div>
              </div>
            </div>

            {schedule.type === 'weekly' && (
              <div>
                <label htmlFor="new-report-day-of-week" className="block text-xs text-gray-500 mb-1">每周几生成</label>
                <select id="new-report-day-of-week" value={schedule.dayOfWeek}
                  onChange={e => patchSchedule({ dayOfWeek: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                  {WEEK_DAY_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}

            {schedule.type === 'monthly' && (
              <div>
                <label htmlFor="new-report-day-of-month" className="block text-xs text-gray-500 mb-1">每月几号生成</label>
                <input id="new-report-day-of-month" type="number" min={1} max={31} value={schedule.dayOfMonth}
                  onChange={e => patchSchedule({ dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
              </div>
            )}

            {schedule.type === 'quarterly' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="new-report-month-of-quarter" className="block text-xs text-gray-500 mb-1">季度中第几个月</label>
                  <select id="new-report-month-of-quarter" value={schedule.monthOfQuarter}
                    onChange={e => patchSchedule({ monthOfQuarter: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                    <option value={1}>第 1 个月</option>
                    <option value={2}>第 2 个月</option>
                    <option value={3}>第 3 个月</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-report-q-day" className="block text-xs text-gray-500 mb-1">几号</label>
                  <input id="new-report-q-day" type="number" min={1} max={31} value={schedule.dayOfMonth}
                    onChange={e => patchSchedule({ dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
                </div>
              </div>
            )}

            {schedule.type === 'yearly' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="new-report-year-month" className="block text-xs text-gray-500 mb-1">月份</label>
                  <select id="new-report-year-month" value={schedule.month}
                    onChange={e => patchSchedule({ month: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m} 月</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-report-year-day" className="block text-xs text-gray-500 mb-1">几号</label>
                  <input id="new-report-year-day" type="number" min={1} max={31} value={schedule.dayOfMonth}
                    onChange={e => patchSchedule({ dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
                </div>
              </div>
            )}

            <p className="text-[10px] text-gray-400">
              预览：{REPORT_TYPE_OPTIONS.find(t => t.value === reportType)?.frequency ?? ''}
              {schedule.type === 'weekly' && ` · ${WEEK_DAY_OPTIONS.find(d => d.value === schedule.dayOfWeek)?.label ?? ''}`}
              {schedule.type === 'monthly' && ` · ${schedule.dayOfMonth} 号`}
              {schedule.type === 'quarterly' && ` · 第 ${schedule.monthOfQuarter} 个月 ${schedule.dayOfMonth} 号`}
              {schedule.type === 'yearly' && ` · ${schedule.month} 月 ${schedule.dayOfMonth} 号`}
              {` · ${pad2(schedule.hour)}:${pad2(schedule.minute)}`}
            </p>
          </div>

          {creationIssues.length > 0 && (
            <div role="alert" className="border border-red-200 bg-red-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">请修正以下问题</p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs text-red-600">
                {creationIssues.map((issue, index) => (
                  <li key={`${issue.path}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Styles */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">样式</h4>
            <div className="flex gap-1.5 flex-wrap">
              {STYLE_PRESETS.map(p => (
                <button key={p.name} onClick={() => setHeaderStyle(s => ({ ...s, ...p.header }))}
                  className="flex items-center gap-1 px-2 py-1 border border-gray-200 rounded text-[10px] hover:border-blue-400">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: p.header.backgroundColor }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bindings */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase">数据绑定</h4>
            {bindingFields.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bindingFields.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-gray-50 font-mono">
                    {f.name} <button onClick={() => setBindingFields(prev => prev.filter((_, j) => j !== i))} className="text-red-400"><X size={8} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1">
              <input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                aria-label="字段名"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="键名" />
              <input type="text" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                aria-label="字段标签"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="标签" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as BindingValueType)}
                aria-label="字段类型"
                className="border border-gray-300 rounded px-1 py-1 text-xs w-16">
                <option value="single">single</option><option value="kv">kv</option><option value="array">array</option>
              </select>
              <button onClick={addBinding} aria-label="添加数据绑定" className="px-2 py-1 bg-blue-600 text-white text-xs rounded"><Plus size={12} /></button>
            </div>
          </div>

          {/* Tabs config (tab 模式专属) */}
          {viewMode === 'tab' && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">标签页配置</h4>
                <button onClick={addTab} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                  <Plus size={12} /> 添加标签
                </button>
              </div>
              <div className="space-y-1.5">
                {tabList.map((tab, i) => {
                  const isActive = i === activeTabIdx;
                  return (
                    <div key={tab.id}
                      className={`flex items-center gap-1.5 border rounded p-1.5 ${isActive ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-white'}`}>
                      <button
                        onClick={() => { setActiveTabIdx(i); setEditingIdx(null); }}
                        className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        aria-label={`切换到标签 ${tab.label}`}
                        title="点击切换编辑"
                      >
                        {i + 1}
                      </button>
                      <input
                        type="text" value={tab.label}
                        onChange={e => renameTab(i, e.target.value)}
                        onFocus={() => { setActiveTabIdx(i); setEditingIdx(null); }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                        placeholder="标签名称"
                        aria-label={`标签 ${i + 1} 名称`}
                      />
                      <span className="text-[10px] text-gray-400">{tab.sections.length} 区块</span>
                      <button onClick={() => removeTab(i)}
                        className="p-0.5 text-gray-400 hover:text-red-600" aria-label="删除标签">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400">正在编辑：<span className="font-semibold text-gray-600">{activeTab?.label ?? '默认'}</span>（下方“内容区块”仅展示当前标签）</p>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">内容区块</h4>
              <div className="flex gap-1">
                <button onClick={() => addSection('kpi-cards')} aria-label="KPI卡片" className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="KPI卡片"><CreditCard size={14} /></button>
                <button onClick={() => addSection('table')} aria-label="表格" className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="表格"><Table size={14} /></button>
                <button onClick={() => addSection('chart')} aria-label="图表" className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="图表"><BarChart2 size={14} /></button>
                <button onClick={() => addSection('text')} aria-label="文本" className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="文本"><Type size={14} /></button>
                <button onClick={() => addSection('markdown')} aria-label="Markdown" className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Markdown"><FileText size={14} /></button>
                <button onClick={() => addSection('html')} aria-label="HTML" className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="HTML"><Code size={14} /></button>
              </div>
            </div>

            {sections.map((section, i) => (
              <div key={i} className={`border rounded-lg overflow-hidden ${editingIdx === i ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} className="text-gray-300" />
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                      section.type === 'kpi-cards' ? 'bg-orange-100 text-orange-700' :
                      section.type === 'table' ? 'bg-blue-100 text-blue-700' :
                      section.type === 'chart' ? 'bg-green-100 text-green-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>{section.type}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => moveSection(i, -1)} className="p-0.5 text-gray-400 hover:text-gray-600"><ArrowUp size={12} /></button>
                    <button onClick={() => moveSection(i, 1)} className="p-0.5 text-gray-400 hover:text-gray-600"><ArrowDown size={12} /></button>
                    <button onClick={() => setEditingIdx(editingIdx === i ? null : i)} className="p-0.5 text-gray-400 hover:text-blue-600"><Settings size={12} /></button>
                    <button onClick={() => removeSection(i)} className="p-0.5 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
                {editingIdx === i && (
                  <div className="p-3">{renderSectionEditor(section, i)}</div>
                )}
              </div>
            ))}

            {sections.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-300 rounded-lg">
                点击上方图标添加区块<br />
                <span className="text-xs">KPI卡片 / 表格 / 图表 / 文本</span>
              </div>
            )}
          </div>

          <button onClick={handleCreate} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            {isEditing ? '保存修改' : '创建报告'}
          </button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="w-1/2 overflow-y-auto bg-gray-50">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600">实时预览</h3>
            <span className="text-xs text-gray-400">使用示例数据</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{name || '未命名报告'}</h2>
            {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
            {sections.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <PieIcon size={40} className="mx-auto mb-2" />
                <p className="text-sm">添加区块后这里将实时预览</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <SectionRenderer
                    key={i}
                    section={section}
                    data={createReportDataContext(dataId, COMPANY_AGENT_OUTPUT)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
