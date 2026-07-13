import type { AgentOutput, ArrayData, KVData, ReportDataContext } from './types';

/**
 * Template Engine: resolves bindings in a template against agent data.
 *
 * Binding format: {{agent_name.key.subkey}}
 * - Single: {{dept_agent.headcount}} → "45"
 * - KV:     {{dept_agent.quarterly_revenue.Q1}} → "1200000"
 * - Array:  bindingKey="dept_agent.projects" → renders array rows
 */

type CompatibleReportContext = ReportDataContext | AgentOutput;

const DANGEROUS_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

function formatValue(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createReportDataContext(dataId: string, data: AgentOutput): ReportDataContext {
  return { [dataId]: data };
}

export function resolveBinding(template: string, context: CompatibleReportContext): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path: string) => {
    const val = resolvePath(context, path);
    if (val === undefined || val === null) return match;
    return formatValue(val);
  });
}

export function resolveHtmlBinding(template: string, context: CompatibleReportContext): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path: string) => {
    const value = resolvePath(context, path);
    if (value === undefined || value === null) return match;
    return escapeHtml(formatValue(value));
  });
}

export function resolvePath(context: CompatibleReportContext, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = context;
  for (const p of parts) {
    if (DANGEROUS_PATH_SEGMENTS.has(p)) return undefined;
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, p)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

export function resolveArrayData(context: CompatibleReportContext, bindingKey: string): ArrayData {
  const raw = resolvePath(context, bindingKey);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ArrayData;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.entries(raw as KVData).map(([k, v]) => ({ name: k, value: v }));
  }
  return [];
}

export function resolveValue(context: CompatibleReportContext, key: string): string {
  const val = resolvePath(context, key);
  if (val === undefined || val === null) return '—';
  return formatValue(val);
}
