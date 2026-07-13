

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ReportDefinition, ReportViewMode, ReportSection, ChartType,
  BindingField, BindingValueType, CellStyle, ChartConfig,
} from '../report-engine/types';
import SectionRenderer from './SectionRenderer';
import { COMPANY_AGENT_OUTPUT } from '../data/demoData';
import { createReportDataContext } from '../report-engine/template-engine';
import { validateReportDefinition, type ValidationIssue } from '../report-engine/validation';
import { Plus, X, BarChart2, PieChart as PieIcon, Table, Type, CreditCard, Trash2, GripVertical, ArrowUp, ArrowDown, Settings, FileText, Code } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

export default function NewReportCreator({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('新报告');
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('2026-Q2');
  const [dataId, setDataId] = useState('report_agent');
  const [viewMode, setViewMode] = useState<ReportViewMode>('page');
  const [headerStyle, setHeaderStyle] = useState<CellStyle>({ backgroundColor: '#1e40af', color: '#fff', fontWeight: 'bold', fontSize: 14, padding: 10, textAlign: 'center' });
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [bindingFields, setBindingFields] = useState<BindingField[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<BindingValueType>('single');
  const [creationIssues, setCreationIssues] = useState<ValidationIssue[]>([]);

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
    setSections(previous => previous.map(section => (
      migrateSectionDataId(section, dataId, nextDataId)
    )));
    setDataId(nextDataId);
  };

  const handleCreate = () => {
    const report: ReportDefinition = {
      id: uuidv4(), name: name.trim(), period, dataId, description, icon: 'layout-grid', viewMode,
      sections: viewMode === 'page' ? sections : undefined,
      tabs: viewMode === 'tab' ? [{ id: uuidv4(), label: '默认', sections }] : undefined,
      bindingFields, createdAt: new Date().toISOString(),
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
    toast.success('报告已创建');
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
            <h2 className="text-lg font-bold text-gray-800">新建报告</h2>
            <button onClick={onCancel} aria-label="取消新建报告" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
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
                <input id="new-report-data-id" type="text" value={dataId} onChange={e => updateDataId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" placeholder="report_agent" />
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
            创建报告
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
