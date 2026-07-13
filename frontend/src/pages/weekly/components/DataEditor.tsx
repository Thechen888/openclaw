

import { useState } from 'react';
import type {
  AgentOutput,
  BindingField,
  BindingValue,
  ReportDefinition,
} from '../report-engine/types';
import type { ValidationIssue } from '../report-engine/validation';
import { validateReportAgentOutput } from '../report-engine/validation';
import { ChevronDown, ChevronRight, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DataEditorProps {
  data: AgentOutput;
  report: ReportDefinition;
  validationScope: string;
  onSave: (data: AgentOutput) => void;
}

function parseInputValue(value: string): string | number {
  if (value === '') return '';
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
}

function isFiniteScalar(value: unknown): value is string | number {
  return typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isEditableObject(value: unknown): value is Record<string, string | number> {
  return isPlainObject(value) && Object.values(value).every(isFiniteScalar);
}

function isEditableRow(value: unknown): value is Record<string, string | number> {
  return isEditableObject(value);
}

function editableInputValue(value: unknown): string | number {
  return isFiniteScalar(value) ? value : '';
}

function nextObjectKey(object: Record<string, unknown>): string {
  let index = 1;
  let key = 'key';
  while (Object.hasOwn(object, key)) {
    index += 1;
    key = `key_${index}`;
  }
  return key;
}

export default function DataEditor({
  data,
  report,
  validationScope,
  onSave,
}: DataEditorProps) {
  const [draft, setDraft] = useState<AgentOutput>(() => data);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(data, null, 2));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  const toggleExpand = (key: string) => {
    setExpanded(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const updateField = (key: string, value: BindingValue) => {
    const nextDraft = { ...draft, [key]: value };
    setDraft(nextDraft);
    setJsonText(JSON.stringify(nextDraft, null, 2));
  };

  const updateJsonDraft = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (
        isPlainObject(parsed)
        && validateReportAgentOutput(report, parsed, validationScope).ok
      ) {
        setDraft(parsed as AgentOutput);
      }
    } catch {
      // Keep invalid JSON text intact so validation can show the syntax error.
    }
  };

  const saveCandidate = (candidate: unknown) => {
    const validation = validateReportAgentOutput(report, candidate, validationScope);
    if (!validation.ok) {
      setIssues(validation.issues);
      toast.error('数据校验失败');
      return;
    }

    const nextData = candidate as AgentOutput;
    setDraft(nextData);
    setIssues([]);
    onSave(nextData);
    toast.success('数据已保存');
  };

  const handleSave = () => {
    if (!jsonMode) {
      saveCandidate(draft);
      return;
    }

    try {
      saveCandidate(JSON.parse(jsonText));
    } catch {
      setIssues([{ path: '$', message: 'JSON 格式错误' }]);
      toast.error('JSON 格式错误');
    }
  };

  const renderSingleValue = (key: string, label: string, value: unknown) => (
    <input
      aria-label={label}
      type="text"
      value={editableInputValue(value)}
      onChange={event => updateField(key, parseInputValue(event.target.value))}
      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-300 focus:outline-none"
    />
  );

  const renderKVData = (
    key: string,
    label: string,
    object: Record<string, string | number>,
  ) => {
    const isOpen = expanded[key] !== false;
    const entries = Object.entries(object);

    const updateEntry = (oldKey: string, newKey: string, value: string | number) => {
      const nextEntries = entries.map(([entryKey, entryValue]) => (
        entryKey === oldKey ? [newKey, value] : [entryKey, entryValue]
      ));
      updateField(key, Object.fromEntries(nextEntries));
    };

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          aria-label={`${label}：对象 ${entries.length} 键`}
          onClick={() => toggleExpand(key)}
          className="w-full flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100"
        >
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          对象 {'{'}{entries.length} 键{'}'}
        </button>
        {isOpen && (
          <div className="p-2 space-y-1">
            {entries.map(([entryKey, entryValue]) => (
              <div key={entryKey} className="flex items-center gap-2">
                <input
                  aria-label={`${label}键 ${entryKey}`}
                  type="text"
                  value={entryKey}
                  onChange={event => updateEntry(entryKey, event.target.value, entryValue)}
                  className="w-24 border border-gray-300 rounded px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-blue-300 focus:outline-none"
                />
                <input
                  aria-label={`${label}值 ${entryKey}`}
                  type="text"
                  value={editableInputValue(entryValue)}
                  onChange={event => updateEntry(
                    entryKey,
                    entryKey,
                    parseInputValue(event.target.value),
                  )}
                  className="flex-1 border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-300 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`删除${label}键 ${entryKey}`}
                  onClick={() => updateField(
                    key,
                    Object.fromEntries(entries.filter(([candidate]) => candidate !== entryKey)),
                  )}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField(key, { ...object, [nextObjectKey(object)]: '' })}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={10} /> 添加键值
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderArrayData = (
    key: string,
    label: string,
    array: Record<string, string | number>[],
  ) => {
    const isOpen = expanded[key] !== false;
    const columns = array.length > 0 ? Object.keys(array[0]) : [];

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          aria-label={`${label}：数组 ${array.length} 项`}
          onClick={() => toggleExpand(key)}
          className="w-full flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100"
        >
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          数组 [{array.length} 项]
        </button>
        {isOpen && (
          <div className="p-2">
            {array.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {columns.map(column => (
                        <th key={column} className="px-2 py-1 bg-gray-100 border border-gray-200 text-left font-medium text-gray-600">
                          {column}
                        </th>
                      ))}
                      <th className="px-1 py-1 bg-gray-100 border border-gray-200 w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {array.map((item, rowIndex) => (
                      <tr key={rowIndex}>
                        {columns.map(column => (
                          <td key={column} className="border border-gray-200 p-0">
                            <input
                              aria-label={`${label}第 ${rowIndex + 1} 行 ${column}`}
                              type="text"
                              value={editableInputValue(item[column])}
                              onChange={event => {
                                const nextArray = [...array];
                                nextArray[rowIndex] = {
                                  ...nextArray[rowIndex],
                                  [column]: parseInputValue(event.target.value),
                                };
                                updateField(key, nextArray);
                              }}
                              className="w-full px-2 py-1 text-xs border-none focus:ring-1 focus:ring-blue-300 focus:outline-none bg-transparent"
                            />
                          </td>
                        ))}
                        <td className="border border-gray-200 px-1">
                          <button
                            type="button"
                            aria-label={`删除${label}第 ${rowIndex + 1} 行`}
                            onClick={() => updateField(
                              key,
                              array.filter((_, candidateIndex) => candidateIndex !== rowIndex),
                            )}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const newItem = columns.length > 0
                  ? Object.fromEntries(columns.map(column => [column, '']))
                  : { key: '', value: '' };
                updateField(key, [...array, newItem]);
              }}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={10} /> 添加行
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDeclaredValue = (field: BindingField) => {
    const value = draft[field.name];
    if (field.type === 'kv') {
      return renderKVData(
        field.name,
        field.label,
        isEditableObject(value) ? value : {},
      );
    }
    if (field.type === 'array') {
      return renderArrayData(
        field.name,
        field.label,
        Array.isArray(value) ? value.filter(isEditableRow) : [],
      );
    }
    return renderSingleValue(field.name, field.label, value);
  };

  const renderExtraValue = (key: string, value: unknown) => {
    if (Array.isArray(value)) {
      return renderArrayData(key, key, value.filter(isEditableRow));
    }
    if (isEditableObject(value)) {
      return renderKVData(key, key, value);
    }
    return renderSingleValue(key, key, value);
  };

  return (
    <div className="mb-5 bg-white border border-blue-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-200">
        <span className="text-sm font-semibold text-blue-700">数据编辑</span>
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={jsonMode}
            onChange={event => {
              setJsonMode(event.target.checked);
              setIssues([]);
            }}
            className="rounded"
          />
          JSON 模式
        </label>
      </div>

      {jsonMode ? (
        <div className="p-3">
          <textarea
            aria-label="JSON 数据草稿"
            value={jsonText}
            onChange={event => updateJsonDraft(event.target.value)}
            className="w-full h-64 border border-gray-300 rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-blue-300 focus:outline-none resize-y"
          />
        </div>
      ) : (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {report.bindingFields.map(field => (
            <div key={field.name} className="flex items-start gap-3">
              <div className="w-28 shrink-0 pt-1">
                <span className="text-xs font-medium text-gray-700">{field.label}</span>
                <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                  field.type === 'single' ? 'bg-purple-100 text-purple-600'
                    : field.type === 'kv' ? 'bg-blue-100 text-blue-600'
                      : 'bg-green-100 text-green-600'
                }`}
                >
                  {field.type}
                </span>
              </div>
              <div className="flex-1">{renderDeclaredValue(field)}</div>
            </div>
          ))}

          {Object.keys(draft)
            .filter(key => !report.bindingFields.some(field => field.name === key))
            .map(key => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-28 shrink-0 pt-1">
                  <span className="text-xs font-medium text-gray-500 font-mono">{key}</span>
                </div>
                <div className="flex-1">{renderExtraValue(key, draft[key])}</div>
              </div>
            ))}
        </div>
      )}

      {issues.length > 0 && (
        <div role="alert" className="mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs font-semibold text-red-700">数据未保存，请修正以下问题：</p>
          <ul className="mt-1 list-disc pl-4 text-xs text-red-600">
            {issues.map(issue => (
              <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-blue-100 px-3 py-2">
        <p className="text-xs text-amber-700">未保存的草稿在切换报告或标签后会丢失。</p>
        <button
          type="button"
          onClick={handleSave}
          className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          <Save size={12} /> 保存数据
        </button>
      </div>
    </div>
  );
}
