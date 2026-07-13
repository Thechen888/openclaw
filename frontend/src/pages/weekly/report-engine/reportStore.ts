

import { create } from 'zustand';

import type { AgentOutput, ReportDefinition, ReportTab } from './types';

export const COMPANY_SCOPE_KEY = '__company__';
export const REPORT_PERIOD_FALLBACK = '__period_missing__';
export const REPORT_DATA_ID_FALLBACK = '__data_id_missing__';

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
  upsertCustomReport: (report: ReportDefinition) => void;
  setReportData: (key: string, data: AgentOutput) => void;
}

export const usePrototypeStore = create<PrototypeState>(set => ({
  customReports: [],
  reportData: {},
  reportDataVersions: {},
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
  setReportData: (key, data) => set(state => ({
    reportData: { ...state.reportData, [key]: data },
    reportDataVersions: {
      ...state.reportDataVersions,
      [key]: (state.reportDataVersions[key] ?? 0) + 1,
    },
  })),
}));
