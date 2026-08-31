

import { create } from 'zustand';

import type { AgentOutput, ReportDataSnapshot, ReportDefinition, ReportTab } from './types';

export const COMPANY_SCOPE_KEY = '__company__';
export const REPORT_PERIOD_FALLBACK = '__period_missing__';
export const REPORT_DATA_ID_FALLBACK = '__data_id_missing__';

/** 快照保留上限：超过后保留最新的 N 条，防止长期运行内存爆涨 */
const MAX_SNAPSHOTS_PER_KEY = 20;

function randomId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function appendSnapshot(
  previous: ReportDataSnapshot[] | undefined,
  snapshot: ReportDataSnapshot,
): ReportDataSnapshot[] {
  const next = [...(previous ?? []), snapshot];
  return next.length > MAX_SNAPSHOTS_PER_KEY
    ? next.slice(next.length - MAX_SNAPSHOTS_PER_KEY)
    : next;
}

export function createReportDataKey(
  reportId: string,
  period: string,
  scopeKey: string,
): string {
  return [reportId, period, scopeKey]
    .map(value => `${value.length}:${value}`)
    .join('|');
}

export function getReportPeriod(report: ReportDefinition): string {
  return report.period?.trim() || REPORT_PERIOD_FALLBACK;
}

export function getReportDataId(report: ReportDefinition): string {
  return report.dataId?.trim() || REPORT_DATA_ID_FALLBACK;
}

export function getReportValidationScope(tab?: ReportTab): string {
  return tab?.departmentKey || tab?.id || COMPANY_SCOPE_KEY;
}

export function getReportStorageScope(tab?: ReportTab): string {
  return getReportValidationScope(tab);
}

interface PrototypeState {
  customReports: ReportDefinition[];
  reportData: Record<string, AgentOutput>;
  reportDataVersions: Record<string, number>;
  /** 以 dataKey 为单位的历史快照列表（时间升序，末尾 = 最新） */
  reportSnapshots: Record<string, ReportDataSnapshot[]>;
  upsertCustomReport: (report: ReportDefinition) => void;
  setReportData: (key: string, data: AgentOutput, note?: string, period?: string) => void;
  /** 手动“刷新数据”：用当前数据归档一条新快照，模拟 Agent 重新拉取 */
  refreshReportData: (key: string, data: AgentOutput, period: string, note?: string) => void;
  /** 初始化时写入预置的历史快照（幂等：同名 dataKey 不会重复写） */
  seedSnapshots: (bucket: Record<string, ReportDataSnapshot[]>) => void;
}

export const usePrototypeStore = create<PrototypeState>(set => ({
  customReports: [],
  reportData: {},
  reportDataVersions: {},
  reportSnapshots: {},
  upsertCustomReport: report => set(state => {
    const existingIndex = state.customReports.findIndex(candidate => candidate.id === report.id);
    if (existingIndex === -1) {
      return { customReports: [...state.customReports, report] };
    }

    return {
      customReports: state.customReports.map(candidate => (
        candidate.id === report.id ? report : candidate
      )),
    };
  }),
  setReportData: (key, data, note = '编辑保存', period = '') => set(state => {
    const snapshot: ReportDataSnapshot = {
      id: randomId(),
      generatedAt: new Date().toISOString(),
      period,
      data,
      note,
    };
    return {
      reportData: { ...state.reportData, [key]: data },
      reportDataVersions: {
        ...state.reportDataVersions,
        [key]: (state.reportDataVersions[key] ?? 0) + 1,
      },
      reportSnapshots: {
        ...state.reportSnapshots,
        [key]: appendSnapshot(state.reportSnapshots[key], snapshot),
      },
    };
  }),
  refreshReportData: (key, data, period, note = '手动刷新') => set(state => {
    const snapshot: ReportDataSnapshot = {
      id: randomId(),
      generatedAt: new Date().toISOString(),
      period,
      data,
      note,
    };
    return {
      reportData: { ...state.reportData, [key]: data },
      reportDataVersions: {
        ...state.reportDataVersions,
        [key]: (state.reportDataVersions[key] ?? 0) + 1,
      },
      reportSnapshots: {
        ...state.reportSnapshots,
        [key]: appendSnapshot(state.reportSnapshots[key], snapshot),
      },
    };
  }),
  seedSnapshots: bucket => set(state => {
    const merged = { ...state.reportSnapshots };
    Object.entries(bucket).forEach(([key, list]) => {
      // 已经写过的 key 不重复 seed，避免热重启时重复追加
      if (!merged[key]) merged[key] = list;
    });
    return { reportSnapshots: merged };
  }),
}));
