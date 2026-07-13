import type {
  AgentOutput,
  BindingField,
  ReportDefinition,
  ReportSection,
  TableSection,
} from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_NAMES = new Set(['__proto__', 'prototype', 'constructor']);
const BINDING_PATTERN = /\{\{([\w.]+)\}\}/g;

function result(issues: ValidationIssue[]): ValidationResult {
  return { ok: issues.length === 0, issues };
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

function isValidBindingValue(type: BindingField['type'], value: unknown): boolean {
  if (type === 'single') return isFiniteScalar(value);

  if (type === 'kv') {
    return isPlainObject(value) && Object.values(value).every(isFiniteScalar);
  }

  return Array.isArray(value) && value.every(row => (
    isPlainObject(row) && Object.values(row).every(isFiniteScalar)
  ));
}

export function validateAgentOutput(
  fields: BindingField[],
  output: AgentOutput | Record<string, unknown> | unknown,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(output)) {
    return result([{ path: '$', message: 'Agent 输出必须是普通对象' }]);
  }

  for (const field of fields) {
    const hasValue = Object.hasOwn(output, field.name);
    const value = output[field.name];
    if (!hasValue || value === undefined) {
      if (field.required !== false) {
        issues.push({ path: field.name, message: `缺少必填字段“${field.label}”` });
      }
      continue;
    }

    if (!isValidBindingValue(field.type, value)) {
      issues.push({ path: field.name, message: `字段“${field.label}”不符合 ${field.type} 类型` });
    }
  }

  return result(issues);
}

function bindingPathsFromTemplate(template: string): string[] {
  return Array.from(template.matchAll(BINDING_PATTERN), match => match[1]);
}

function visitSections(
  report: ReportDefinition,
  visitor: (section: ReportSection, path: string) => void,
): void {
  report.sections?.forEach((section, index) => visitor(section, `sections[${index}]`));
  report.tabs?.forEach((tab, tabIndex) => {
    tab.sections.forEach((section, sectionIndex) => (
      visitor(section, `tabs[${tabIndex}].sections[${sectionIndex}]`)
    ));
  });
}

function sectionBindingPaths(section: ReportSection): string[] {
  switch (section.type) {
    case 'table':
      return [
        ...(section.arrayBindingKey ? [section.arrayBindingKey] : []),
        ...section.rows.flatMap(row => row.cells.flatMap(cell => (
          cell.type === 'binding' ? bindingPathsFromTemplate(cell.value) : []
        ))),
      ];
    case 'chart':
      return section.charts.map(chart => chart.bindingKey);
    case 'kpi-cards':
      return section.cards.flatMap(card => [
        card.bindingKey,
        ...(card.trendBinding ? [card.trendBinding] : []),
      ]);
    case 'text':
    case 'markdown':
    case 'html':
      return bindingPathsFromTemplate(section.content);
  }
}

export function collectReportBindingPaths(report: ReportDefinition): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  visitSections(report, section => {
    for (const path of sectionBindingPaths(section)) {
      if (!seen.has(path)) {
        seen.add(path);
        paths.push(path);
      }
    }
  });

  return paths;
}

function identifierIssue(path: string, value: string, label: string): ValidationIssue | null {
  if (!IDENTIFIER_PATTERN.test(value)) {
    return { path, message: `${label}必须是英文字母或下划线开头的标识符` };
  }
  if (RESERVED_NAMES.has(value)) {
    return { path, message: `${label}不能使用保留名称“${value}”` };
  }
  return null;
}

function bindingFieldForPath(
  path: string,
  dataId: string,
  fields: Map<string, BindingField>,
  exact = false,
): BindingField | undefined {
  const parts = path.split('.');
  if (parts.length < 2 || parts[0] !== dataId || (exact && parts.length !== 2)) {
    return undefined;
  }
  return fields.get(parts[1]);
}

function validateDynamicTable(
  section: TableSection,
  path: string,
  dataId: string,
  fields: Map<string, BindingField>,
  issues: ValidationIssue[],
): void {
  if (!section.arrayBindingKey) return;

  const columns = section.dynamicColumns ?? [];
  if (columns.length === 0) {
    issues.push({ path: `${path}.dynamicColumns`, message: '动态表格必须配置至少一列' });
  }
  if (section.colCount !== columns.length) {
    issues.push({ path: `${path}.colCount`, message: '动态表格列数必须与动态列配置一致' });
  }

  const seenKeys = new Set<string>();
  columns.forEach((column, index) => {
    const keyPath = `${path}.dynamicColumns[${index}].key`;
    const invalidIdentifier = identifierIssue(keyPath, column.key, '动态列键');
    if (invalidIdentifier) issues.push(invalidIdentifier);
    if (seenKeys.has(column.key)) {
      issues.push({ path: keyPath, message: `动态列键“${column.key}”重复` });
    }
    seenKeys.add(column.key);
    if (column.label.trim().length === 0) {
      issues.push({ path: `${path}.dynamicColumns[${index}].label`, message: '动态列标签不能为空' });
    }
  });

  if (section.statusField && !columns.some(column => column.key === section.statusField)) {
    issues.push({ path: `${path}.statusField`, message: '状态字段必须对应一个动态列键' });
  }

  const field = bindingFieldForPath(section.arrayBindingKey, dataId, fields, true);
  if (!field || field.type !== 'array') {
    issues.push({ path: `${path}.arrayBindingKey`, message: '动态表格只能绑定 array 字段' });
  }
}

function bindingRootsFromSections(sections: ReportSection[]): Set<string> {
  const roots = new Set<string>();
  for (const section of sections) {
    for (const path of sectionBindingPaths(section)) {
      const parts = path.split('.');
      if (parts.length >= 2) roots.add(parts[1]);
    }
  }
  return roots;
}

export function validateReportAgentOutput(
  report: ReportDefinition,
  output: AgentOutput | Record<string, unknown> | unknown,
  validationScope = '__company__',
): ValidationResult {
  let sections: ReportSection[] | undefined;
  if (report.viewMode === 'page') {
    sections = report.sections ?? [];
  } else {
    const tabs = report.tabs ?? [];
    const tab = validationScope === '__company__'
      ? (() => {
        const legacyCompanyTabs = tabs.filter(candidate => candidate.departmentKey === undefined);
        return legacyCompanyTabs.length === 1 ? legacyCompanyTabs[0] : undefined;
      })()
      : tabs.find(candidate => (
        candidate.departmentKey === validationScope || candidate.id === validationScope
      ));
    sections = tab?.sections;
  }

  if (!sections) {
    return result([{ path: 'department', message: `报告中不存在数据范围“${validationScope}”` }]);
  }

  const roots = bindingRootsFromSections(sections);
  const scopedFields = report.bindingFields
    .filter(field => roots.has(field.name))
    .map(field => ({ ...field, required: true }));
  return validateAgentOutput(scopedFields, output);
}

export function validateReportDefinition(report: ReportDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];
  const period = report.period ?? '';
  const dataId = report.dataId ?? '';

  if (period.trim().length === 0) {
    issues.push({ path: 'period', message: '报告周期不能为空' });
  }
  const invalidDataId = identifierIssue('dataId', dataId, 'Data ID');
  if (invalidDataId) issues.push(invalidDataId);

  const fields = new Map<string, BindingField>();
  report.bindingFields.forEach((field, index) => {
    const path = `bindingFields[${index}].name`;
    const invalidName = identifierIssue(path, field.name, '字段名');
    if (invalidName) issues.push(invalidName);
    if (fields.has(field.name)) {
      issues.push({ path, message: `字段名“${field.name}”重复` });
    } else {
      fields.set(field.name, field);
    }
  });

  for (const path of collectReportBindingPaths(report)) {
    const parts = path.split('.');
    const hasValidPrefix = parts.length >= 2 && parts[0] === dataId;
    const hasDangerousPart = parts.some(part => RESERVED_NAMES.has(part));
    if (!hasValidPrefix || hasDangerousPart) {
      issues.push({
        path: `bindings[${path}]`,
        message: `绑定必须使用完整路径“${dataId}.字段名”且不能包含保留名称`,
      });
      continue;
    }
    if (!fields.has(parts[1])) {
      issues.push({ path: `bindings[${path}]`, message: `绑定字段“${parts[1]}”未在 bindingFields 中声明` });
    }
  }

  visitSections(report, (section, path) => {
    if (section.type === 'table') {
      validateDynamicTable(section, path, dataId, fields, issues);
    }
    if (section.type === 'chart') {
      section.charts.forEach((chart, index) => {
        const field = bindingFieldForPath(chart.bindingKey, dataId, fields, true);
        if (!field || (field.type !== 'array' && field.type !== 'kv')) {
          issues.push({
            path: `${path}.charts[${index}].bindingKey`,
            message: '图表只能绑定 array 或 kv 字段',
          });
        }
      });
    }
  });

  return result(issues);
}
