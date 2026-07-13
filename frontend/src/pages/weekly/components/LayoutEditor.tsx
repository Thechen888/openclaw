

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ReportSection, AgentOutput, ReportDataContext, TableSection, DynamicColumn,
  ChartType, ChartConfig,
} from '../report-engine/types';
import SectionRenderer from './SectionRenderer';
import { Trash2, ArrowUp, ArrowDown, Settings, CreditCard, Table, BarChart2, Type, X, FileText, Code } from 'lucide-react';

const STYLE_PRESETS = [
  { name: '蓝', bg: '#1e40af' },
  { name: '绿', bg: '#059669' },
  { name: '紫', bg: '#7c3aed' },
  { name: '深', bg: '#1f2937' },
  { name: '红', bg: '#dc2626' },
  { name: '橙', bg: '#ea580c' },
];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

type CompatibleReportData = ReportDataContext | AgentOutput;

function inferDataId(data: CompatibleReportData): string {
  const keys = Object.keys(data);
  return keys.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(keys[0])
    ? keys[0]
    : 'data';
}

function syncDynamicColumns(
  section: TableSection,
  dynamicColumns: DynamicColumn[],
): TableSection {
  const headerIndex = section.rows.findIndex(row => row.isHeader);
  const existingHeader = headerIndex >= 0 ? section.rows[headerIndex] : undefined;
  const header = {
    id: existingHeader?.id ?? uuidv4(),
    isHeader: true as const,
    cells: dynamicColumns.map((column, index) => ({
      id: existingHeader?.cells[index]?.id ?? uuidv4(),
      type: 'fixed' as const,
      value: column.label,
      style: existingHeader?.cells[index]?.style,
    })),
  };
  const rows = [...section.rows];
  if (headerIndex >= 0) rows[headerIndex] = header;
  else rows.unshift(header);

  return {
    ...section,
    dynamicColumns,
    colCount: dynamicColumns.length,
    rows,
  };
}

function nextDynamicColumnNumber(dynamicColumns: DynamicColumn[]): number {
  const keys = new Set(dynamicColumns.map(column => column.key));
  let columnNumber = dynamicColumns.length + 1;
  while (keys.has(`column_${columnNumber}`)) columnNumber += 1;
  return columnNumber;
}

interface Props {
  sections: ReportSection[];
  data: CompatibleReportData;
  onChange: (sections: ReportSection[]) => void;
}

export default function LayoutEditor({ sections, data, onChange }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const dataId = inferDataId(data);

  const addSection = (type: ReportSection['type']) => {
    let section: ReportSection;
    switch (type) {
      case 'kpi-cards':
        section = { type: 'kpi-cards', cards: [
          { label: '指标1', bindingKey: `${dataId}.total_headcount`, icon: 'users' },
          { label: '指标2', bindingKey: `${dataId}.total_budget`, icon: 'wallet' },
          { label: '指标3', bindingKey: `${dataId}.avg_satisfaction`, icon: 'smile' },
        ] };
        break;
      case 'table':
        section = {
          type: 'table', title: '数据表格', colCount: 3,
          headerStyle: { backgroundColor: '#1e40af', color: '#fff', fontWeight: 'bold', padding: 10, textAlign: 'center' },
          defaultStyle: { padding: 8, textAlign: 'center', borderColor: '#e5e7eb' },
          rows: [
            { id: uuidv4(), isHeader: true, cells: ['列1', '列2', '列3'].map(v => ({ id: uuidv4(), type: 'fixed' as const, value: v })) },
            { id: uuidv4(), cells: [
              { id: uuidv4(), type: 'fixed' as const, value: '行1' },
              { id: uuidv4(), type: 'binding' as const, value: `{{${dataId}.total_headcount}}` },
              { id: uuidv4(), type: 'binding' as const, value: `{{${dataId}.total_budget}}` },
            ]},
          ],
        };
        break;
      case 'chart':
        section = {
          type: 'chart', layout: 'row',
          charts: [{
            id: uuidv4(), title: '图表', type: 'bar' as ChartType,
            bindingKey: `${dataId}.dept_headcount`, labelField: 'name', valueFields: ['value'], colors: CHART_COLORS,
          }],
        };
        break;
      case 'text':
        section = { type: 'text', content: '报告说明文字', color: '#374151', fontSize: 14 };
        break;
      case 'markdown':
        section = { type: 'markdown', content: `## 标题\n\n这里是 **Markdown** 内容，支持 \`{{${dataId}.value}}\`。\n\n- 列表项 1\n- 列表项 2` };
        break;
      case 'html':
        section = { type: 'html', content: `<div>\n  <h3>自定义 HTML</h3>\n  <p>支持安全 HTML + {{${dataId}.value}}</p>\n</div>` };
        break;
      default: return;
    }
    onChange([...sections, section]);
    setEditingIdx(sections.length);
  };

  const removeSection = (idx: number) => {
    onChange(sections.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const arr = [...sections];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange(arr);
    if (editingIdx === idx) setEditingIdx(newIdx);
  };

  const updateSection = (idx: number, updated: ReportSection) => {
    onChange(sections.map((s, i) => i === idx ? updated : s));
  };

  const renderEditor = (section: ReportSection, idx: number) => {
    if (section.type === 'table') {
      return (
        <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">表格标题</label>
              <input type="text" value={section.title || ''} onChange={e => updateSection(idx, { ...section, title: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">表头颜色</label>
              <div className="flex gap-1">
                {STYLE_PRESETS.map(p => (
                  <button key={p.bg} onClick={() => updateSection(idx, { ...section, headerStyle: { ...section.headerStyle, backgroundColor: p.bg, color: '#fff', fontWeight: 'bold' as const } })}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform" style={{ backgroundColor: p.bg }}
                    title={p.name} />
                ))}
                <input type="color" value={section.headerStyle?.backgroundColor || '#1e40af'}
                  onChange={e => updateSection(idx, { ...section, headerStyle: { ...section.headerStyle, backgroundColor: e.target.value } })}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">数组数据绑定键</label>
              <input type="text" value={section.arrayBindingKey || ''} onChange={e => updateSection(idx, { ...section, arrayBindingKey: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
                placeholder="如: project_status" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">状态字段（自动添加样式）</label>
              <input type="text" value={section.statusField || ''} onChange={e => updateSection(idx, { ...section, statusField: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
                placeholder="如: status" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">动态列</label>
            <div className="space-y-1.5">
              {(section.dynamicColumns ?? []).map((column, columnIndex) => (
                <div key={columnIndex} className="flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-[10px] text-gray-400">
                    第 {columnIndex + 1} 列
                  </span>
                  <input
                    type="text"
                    aria-label={`第 ${columnIndex + 1} 列键`}
                    value={column.key}
                    onChange={event => {
                      const dynamicColumns = [...(section.dynamicColumns ?? [])];
                      dynamicColumns[columnIndex] = { ...column, key: event.target.value };
                      updateSection(idx, syncDynamicColumns(section, dynamicColumns));
                    }}
                    className="w-1/2 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-300 focus:outline-none"
                    placeholder="key"
                  />
                  <input
                    type="text"
                    aria-label={`第 ${columnIndex + 1} 列标题`}
                    value={column.label}
                    onChange={event => {
                      const dynamicColumns = [...(section.dynamicColumns ?? [])];
                      dynamicColumns[columnIndex] = { ...column, label: event.target.value };
                      updateSection(idx, syncDynamicColumns(section, dynamicColumns));
                    }}
                    className="w-1/2 border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-300 focus:outline-none"
                    placeholder="列标题"
                  />
                  <button
                    type="button"
                    aria-label={`删除第 ${columnIndex + 1} 列`}
                    onClick={() => {
                      const dynamicColumns = (section.dynamicColumns ?? []).filter((_, index) => index !== columnIndex);
                      updateSection(idx, syncDynamicColumns(section, dynamicColumns));
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="添加动态列"
              onClick={() => {
                const dynamicColumns = section.dynamicColumns ?? [];
                const columnNumber = nextDynamicColumnNumber(dynamicColumns);
                updateSection(idx, syncDynamicColumns(section, [
                  ...dynamicColumns,
                  { key: `column_${columnNumber}`, label: `列${columnNumber}` },
                ]));
              }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1.5"
            >
              + 添加动态列
            </button>
          </div>
          {section.dynamicColumns === undefined && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">列头（逗号分隔）</label>
              <input type="text"
                value={section.rows.find(r => r.isHeader)?.cells.map(c => c.value).join(', ') || ''}
                onChange={e => {
                  const cols = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const headerRow = { id: uuidv4(), isHeader: true as const, cells: cols.map(v => ({ id: uuidv4(), type: 'fixed' as const, value: v })) };
                  const dataRows = section.rows.filter(r => !r.isHeader);
                  updateSection(idx, { ...section, colCount: cols.length, rows: [headerRow, ...dataRows] });
                }}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none font-mono"
                placeholder="项目, 部门, 状态, 进度" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">数据行（每行逗号分隔，支持 {'{{key}}'} 绑定）</label>
            {section.rows.filter(r => !r.isHeader).map(row => (
              <div key={row.id} className="flex items-center gap-1 mb-1">
                <input type="text" value={row.cells.map(c => c.value).join(', ')}
                  onChange={e => {
                    const vals = e.target.value.split(',').map(s => s.trim());
                    const newRow = {
                      ...row,
                      cells: vals.map(v => ({
                        id: uuidv4(),
                        type: (v.includes('{{') ? 'binding' : 'fixed') as 'fixed' | 'binding',
                        value: v,
                      })),
                    };
                    const rows = [...section.rows];
                    const actualIdx = section.rows.findIndex(r => r.id === row.id);
                    rows[actualIdx] = newRow;
                    updateSection(idx, { ...section, rows });
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-300 focus:outline-none"
                  placeholder="固定文本, {{binding}}, {{binding}}" />
                <button onClick={() => {
                  updateSection(idx, { ...section, rows: section.rows.filter(r => r.id !== row.id) });
                }} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => {
              const colCount = section.rows.find(r => r.isHeader)?.cells.length || 3;
              const newRow = {
                id: uuidv4(),
                cells: Array.from({ length: colCount }, () => ({ id: uuidv4(), type: 'fixed' as const, value: '' })),
              };
              updateSection(idx, { ...section, rows: [...section.rows, newRow] });
            }} className="text-xs text-blue-600 hover:text-blue-800 mt-1">+ 添加数据行</button>
          </div>
        </div>
      );
    }

    if (section.type === 'chart') {
      const chart = section.charts[0];
      return (
        <div className="space-y-3 p-3 bg-green-50/50 rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">标题</label>
              <input type="text" value={chart.title} onChange={e => {
                updateSection(idx, { ...section, charts: [{ ...chart, title: e.target.value }, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">图表类型</label>
              <select value={chart.type} onChange={e => {
                updateSection(idx, { ...section, charts: [{ ...chart, type: e.target.value as ChartType }, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="bar">柱状图</option>
                <option value="pie">饼图</option>
                <option value="line">折线图</option>
                <option value="stacked-bar">堆叠柱状图</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">数据键</label>
              <input type="text" value={chart.bindingKey} onChange={e => {
                updateSection(idx, { ...section, charts: [{ ...chart, bindingKey: e.target.value }, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono" placeholder="dept_headcount" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">标签字段</label>
              <input type="text" value={chart.labelField || ''} onChange={e => {
                updateSection(idx, { ...section, charts: [{ ...chart, labelField: e.target.value }, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono" placeholder="name" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">数值字段</label>
              <input type="text" value={chart.valueFields?.join(', ') || ''} onChange={e => {
                updateSection(idx, { ...section, charts: [{ ...chart, valueFields: e.target.value.split(',').map(s => s.trim()) }, ...section.charts.slice(1)] });
              }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono" placeholder="value" />
            </div>
          </div>
          {/* Add more charts */}
          <button onClick={() => {
            const newChart: ChartConfig = {
              id: uuidv4(), title: '图表', type: 'bar',
              bindingKey: `${dataId}.dept_headcount`, labelField: 'name', valueFields: ['value'], colors: CHART_COLORS,
            };
            updateSection(idx, { ...section, charts: [...section.charts, newChart] });
          }} className="text-xs text-blue-600 hover:text-blue-800">+ 添加图表</button>
        </div>
      );
    }

    if (section.type === 'kpi-cards') {
      return (
        <div className="space-y-2 p-3 bg-orange-50/50 rounded-lg">
          {section.cards.map((card, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <input type="text" value={card.label} onChange={e => {
                const cards = [...section.cards]; cards[ci] = { ...card, label: e.target.value };
                updateSection(idx, { ...section, cards });
              }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs" placeholder="标签" />
              <input type="text" value={card.bindingKey} onChange={e => {
                const cards = [...section.cards]; cards[ci] = { ...card, bindingKey: e.target.value };
                updateSection(idx, { ...section, cards });
              }} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs font-mono" placeholder="数据键" />
              <select value={card.icon || 'check-circle'} onChange={e => {
                const cards = [...section.cards]; cards[ci] = { ...card, icon: e.target.value };
                updateSection(idx, { ...section, cards });
              }} className="border border-gray-300 rounded px-1 py-1 text-xs w-20">
                <option value="users">用户</option>
                <option value="wallet">钱包</option>
                <option value="smile">笑脸</option>
                <option value="check-circle">勾选</option>
                <option value="trending-up">趋势</option>
                <option value="credit-card">卡片</option>
              </select>
              <button onClick={() => {
                updateSection(idx, { ...section, cards: section.cards.filter((_, j) => j !== ci) });
              }} className="text-red-400 hover:text-red-600"><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => {
            updateSection(idx, { ...section, cards: [...section.cards, { label: '新指标', bindingKey: `${dataId}.new_metric`, icon: 'check-circle' }] });
          }} className="text-xs text-blue-600 hover:text-blue-800">+ 添加指标</button>
        </div>
      );
    }

    if (section.type === 'text') {
      return (
        <div className="space-y-3 p-3">
          <textarea value={section.content} onChange={e => updateSection(idx, { ...section, content: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-16 resize-y focus:ring-2 focus:ring-blue-300 focus:outline-none"
            placeholder="文本内容，支持 {{key}} 绑定" />
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">文字颜色</label>
              <input type="color" value={section.color || '#374151'} onChange={e => updateSection(idx, { ...section, color: e.target.value })}
                className="w-full h-7 rounded border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">背景色</label>
              <input type="color" value={section.backgroundColor || '#ffffff'} onChange={e => updateSection(idx, { ...section, backgroundColor: e.target.value })}
                className="w-full h-7 rounded border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">字号</label>
              <input type="number" value={section.fontSize || 14} min={10} max={32} onChange={e => updateSection(idx, { ...section, fontSize: parseInt(e.target.value) || 14 })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">粗体</label>
              <select value={section.fontWeight || 'normal'} onChange={e => updateSection(idx, { ...section, fontWeight: e.target.value as 'normal' | 'bold' })}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
                <option value="normal">正常</option>
                <option value="bold">粗体</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (section.type === 'markdown') {
      return (
        <div className="p-3">
          <textarea value={section.content} onChange={e => updateSection(idx, { ...section, content: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-32 resize-y font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
            placeholder="# Markdown 标题\n\n正文内容，支持 **粗体**、*斜体*、`代码` 等" />
        </div>
      );
    }

    if (section.type === 'html') {
      return (
        <div className="p-3">
          <textarea value={section.content} onChange={e => updateSection(idx, { ...section, content: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-xs h-32 resize-y font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none"
            placeholder='<div style="...">\n  <h3>标题</h3>\n  <p>内容 {{binding}}</p>\n</div>' />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Add section toolbar */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <span className="text-xs text-gray-500 mr-2">添加区块:</span>
        <button onClick={() => addSection('kpi-cards')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-orange-200 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
          <CreditCard size={12} /> KPI卡片
        </button>
        <button onClick={() => addSection('table')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
          <Table size={12} /> 表格
        </button>
        <button onClick={() => addSection('chart')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
          <BarChart2 size={12} /> 图表
        </button>
        <button onClick={() => addSection('text')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <Type size={12} /> 文本
        </button>
        <button onClick={() => addSection('markdown')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-purple-200 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
          <FileText size={12} /> Markdown
        </button>
        <button onClick={() => addSection('html')} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
          <Code size={12} /> HTML
        </button>
      </div>

      {/* Section list with inline editors and previews */}
      {sections.map((section, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">#{i + 1}</span>
              <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                section.type === 'kpi-cards' ? 'bg-orange-100 text-orange-700' :
                section.type === 'table' ? 'bg-blue-100 text-blue-700' :
                section.type === 'chart' ? 'bg-green-100 text-green-700' :
                section.type === 'markdown' ? 'bg-purple-100 text-purple-700' :
                section.type === 'html' ? 'bg-red-100 text-red-700' :
                'bg-gray-200 text-gray-600'
              }`}>{section.type}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => setEditingIdx(editingIdx === i ? null : i)} className={`p-1 rounded ${editingIdx === i ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-blue-600'}`}><Settings size={14} /></button>
              <button onClick={() => removeSection(i)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Editor */}
          {editingIdx === i && renderEditor(section, i)}

          {/* Live Preview */}
          <div className="p-4 bg-gray-50/50">
            <SectionRenderer section={section} data={data} />
          </div>
        </div>
      ))}

      {sections.length === 0 && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-white">
          <p className="text-sm mb-1">点击上方按钮添加内容区块</p>
          <p className="text-xs">每个区块都会实时预览效果</p>
        </div>
      )}
    </div>
  );
}
