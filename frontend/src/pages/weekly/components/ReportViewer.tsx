

import { useEffect, useState } from 'react';
import type { ReportDefinition, AgentOutput, ReportSection, ReportDataSnapshot, ReportType, ReportSchedule } from '../report-engine/types';
import { AGENT_OUTPUT_BY_DEPT, ALL_REPORTS, COMPANY_AGENT_OUTPUT } from '../data/demoData';
import { createReportDataContext } from '../report-engine/template-engine';
import {
  createReportDataKey,
  getReportDataId,
  getReportPeriod,
  getReportStorageScope,
  getReportValidationScope,
  usePrototypeStore,
} from '../report-engine/reportStore';
import SectionRenderer from './SectionRenderer';
import DataEditor from './DataEditor';
import LayoutEditor from './LayoutEditor';
import { CalendarClock, Clock, Database, Download, Eye, History, Layout, RefreshCw, Settings, Share2, Send, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { agentsApi, outputDeclarationsApi } from '../../../api/client';

// 将 ISO 时间格式化为“YYYY-MM-DD HH:mm”（供 tooltip 完整展示）
function formatFullTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 相对时间描述（刚刚 / X 分钟前 / X 小时前 / X 天前 / X 个月前 / X 年前）
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '刚刚';
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  if (diff < 365 * 86_400_000) return `${Math.floor(diff / (30 * 86_400_000))} 个月前`;
  return `${Math.floor(diff / (365 * 86_400_000))} 年前`;
}

// 调度描述格式化（供 header “更新频率” pill 展示）
const WEEK_DAY_LABEL: Record<number, string> = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
function pad2(n: number): string { return n.toString().padStart(2, '0'); }
function formatSchedule(reportType?: ReportType, schedule?: ReportSchedule): string {
  if (!reportType || !schedule) return '未配置调度';
  const time = `${pad2(schedule.hour)}:${pad2(schedule.minute)}`;
  switch (schedule.type) {
    case 'daily':     return `每天 · ${time}`;
    case 'weekly':    return `每周 · ${WEEK_DAY_LABEL[schedule.dayOfWeek] ?? ''} · ${time}`;
    case 'monthly':   return `每月 · ${schedule.dayOfMonth} 号 · ${time}`;
    case 'quarterly': return `每季度 · 第 ${schedule.monthOfQuarter} 个月 ${schedule.dayOfMonth} 号 · ${time}`;
    case 'yearly':    return `每年 · ${schedule.month} 月 ${schedule.dayOfMonth} 号 · ${time}`;
  }
}

interface ReportViewerProps {
  report: ReportDefinition;
  // 点击“设置”按钮时回调予上层（打开 NewReportCreator 的编辑模式）；不传则隐藏按钮
  onEditConfig?: (report: ReportDefinition) => void;
  // ─── 分发能力增强（②③④⑤） ───
  /** 报告元数据（状态/未发布标记） */
  meta?: { status?: string; has_unpublished_changes?: boolean } | null;
  /** 分享按钮回调 */
  onShare?: () => void;
  /** 发布按钮回调 */
  onPublish?: () => void;
  /** 生成记录按钮回调 */
  onShowSnapshots?: (snapshots: ReportDataSnapshot[], reportName: string) => void;
  /** 数据保存成功回调（⑤ 编辑联动） */
  onDataSaved?: () => void;
}

const BUILT_IN_REPORT_IDS = new Set(ALL_REPORTS.map(report => report.id));
const EMPTY_REPORT_DATA: AgentOutput = {};
// 固定引用：避免 selector 内使用 `?? []` 时每次产生新数组，导致 Zustand 默认 Object.is 比对失效而无限 rerender
const EMPTY_SNAPSHOTS: ReportDataSnapshot[] = [];

interface PdfPageWriter {
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
  addImage: (
    imageData: string,
    format: 'PNG',
    x: number,
    y: number,
    width: number,
    height: number,
  ) => unknown;
  addPage: () => unknown;
}

interface CanvasSnapshot {
  width: number;
  height: number;
  toDataURL: (type?: string) => string;
}

function selectDeclaredReportData(
  report: ReportDefinition,
  source: AgentOutput,
): AgentOutput {
  return Object.fromEntries(
    report.bindingFields
      .filter(field => Object.hasOwn(source, field.name))
      .map(field => [field.name, source[field.name]]),
  );
}

export function writeCanvasToPdf(pdf: PdfPageWriter, canvas: CanvasSnapshot): void {
  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('报告画布尺寸无效');
  }

  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const pageContentHeight = pageHeight - margin * 2;
  const pageCount = Math.ceil(imageHeight / pageContentHeight);
  const imageData = canvas.toDataURL('image/png');

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      imageData,
      'PNG',
      margin,
      margin - pageIndex * pageContentHeight,
      imageWidth,
      imageHeight,
    );
  }
}

export default function ReportViewer({ report, onEditConfig, meta, onShare, onPublish, onShowSnapshots, onDataSaved }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState<'none' | 'data' | 'layout'>('none');
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, ReportSection[]>>({});
  const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const setReportData = usePrototypeStore(state => state.setReportData);
  const refreshReportData = usePrototypeStore(state => state.refreshReportData);

  const tabs = report.viewMode === 'tab' ? (report.tabs ?? []) : [];
  const resolvedActiveTab = activeTab < tabs.length ? activeTab : 0;
  const currentTab = report.viewMode === 'tab' ? tabs[resolvedActiveTab] : undefined;
  const validationScope = getReportValidationScope(currentTab);
  const storageScope = getReportStorageScope(currentTab);
  const defaultSections = report.viewMode === 'page'
    ? (report.sections ?? [])
    : (currentTab?.sections ?? []);
  const currentSections = sectionOverrides[storageScope] ?? defaultSections;

  const handleSectionsChange = (sections: ReportSection[]) => {
    setSectionOverrides(previous => ({ ...previous, [storageScope]: sections }));
  };

  const handleExportPDF = async () => {
    toast.loading('生成 PDF 中...', { id: 'pdf' });
    try {
      const el = document.getElementById('report-content');
      if (!el) throw new Error('no element');
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const pdf = new jsPDF('l', 'mm', 'a4');
      writeCanvasToPdf(pdf, canvas);
      pdf.save(`${report.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF 已下载', { id: 'pdf' });
    } catch (error) {
      console.error('PDF 生成失败', error);
      toast.error('PDF 生成失败', { id: 'pdf' });
    }
  };

  const currentDeptKey = currentTab?.departmentKey;
  const period = getReportPeriod(report);
  const dataKey = createReportDataKey(report.id, period, storageScope);
  const storedData = usePrototypeStore(state => state.reportData[dataKey]);
  const reportDataVersion = usePrototypeStore(state => state.reportDataVersions[dataKey] ?? 0);
  const snapshots = usePrototypeStore(state => state.reportSnapshots[dataKey]) ?? EMPTY_SNAPSHOTS;
  const fallbackSource = BUILT_IN_REPORT_IDS.has(report.id)
    ? (currentDeptKey ? AGENT_OUTPUT_BY_DEPT[currentDeptKey] : COMPANY_AGENT_OUTPUT)
    : EMPTY_REPORT_DATA;
  const fallbackData = selectDeclaredReportData(report, fallbackSource ?? EMPTY_REPORT_DATA);
  const currentData = storedData ?? fallbackData ?? EMPTY_REPORT_DATA;

  // 历史版本：优先展示用户选中的快照；若未选则展示当前数据
  const viewingSnapshot = viewingSnapshotId
    ? snapshots.find(s => s.id === viewingSnapshotId) ?? null
    : null;
  const displayData = viewingSnapshot?.data ?? currentData;
  const currentDataContext = createReportDataContext(getReportDataId(report), displayData);
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const lastRefreshedAt = latestSnapshot?.generatedAt ?? report.createdAt;

  // dataKey 变化（切报告 / 切 tab）时重置历史版本选择与下拉菜单，避免上下文错位
  useEffect(() => {
    setViewingSnapshotId(null);
    setVersionMenuOpen(false);
  }, [dataKey]);

  // 处于历史版本模式时强制切回预览（避免编辑器修改污染当前数据）
  useEffect(() => {
    if (viewingSnapshot) setEditMode('none');
  }, [viewingSnapshot]);

  const handleRefresh = () => {
    refreshReportData(dataKey, currentData, period, '手动刷新');
    setViewingSnapshotId(null);
    toast.success('数据已刷新');
  };

  // ===== 立即生成：运行工作流产生新数据 =====
  const { data: declListData } = useQuery({
    queryKey: ['output-declarations-viewer'],
    queryFn: () => outputDeclarationsApi.list(),
  });
  const allDeclarations: any[] = declListData?.data?.data || [];
  const sourceDeclaration = allDeclarations.find(d => d.dataKey === report.dataId);

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!sourceDeclaration?.workflow_id) throw new Error('数据源不可用');
      return agentsApi.debugWorkflow(sourceDeclaration.workflow_id, { input: { trigger: 'manual_report_generate' } });
    },
    onSuccess: (res: any) => {
      const result = res?.data?.data || res?.data;
      const reportSnapshots = result?.report_snapshots || [];
      if (reportSnapshots.length > 0) {
        const snap = reportSnapshots.find((s: any) => s.dataKey === report.dataId);
        if (snap?.data) {
          setReportData(dataKey, snap.data, snap.note || '工作流运行生成', period);
        } else {
          // 快照中没有匹配的 dataKey，用第一个快照的数据
          const first = reportSnapshots[0];
          setReportData(dataKey, first.data || {}, first.note || '工作流运行生成', period);
        }
      } else {
        // 没有快照，仍然刷新一下数据
        refreshReportData(dataKey, currentData, period, '工作流运行完成（无输出节点）');
      }
      setViewingSnapshotId(null);
      toast.success('报告已刷新');
    },
    onError: (err: any) => {
      toast.error(err?.message || '生成失败');
    },
  });

  const handleGenerateNow = () => {
    if (!sourceDeclaration?.workflow_id) {
      toast.error('数据源不可用，请联系管理员');
      return;
    }
    generateMutation.mutate();
  };

  const renderHeader = () => (
    <div className="flex items-start justify-between mb-4 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800">{report.name}</h2>
          {meta?.status && (
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] rounded ${
              meta.status === 'published' ? 'bg-green-50 text-green-700 border border-green-200' :
              meta.status === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              meta.status === 'modified' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
              'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>{meta.status === 'published' ? '已上架' : meta.status === 'pending' ? '审核中' : meta.status === 'modified' ? '已修改' : '草稿'}</span>
          )}
        </div>
        {report.description && <p className="text-sm text-gray-500 mt-1">{report.description}</p>}
        {/* 元信息行：最后刷新 + 更新频率 + 历史版本入口 */}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 flex-wrap">
          <Clock size={12} />
          <span title={formatFullTime(lastRefreshedAt)}>
            最后刷新 {formatRelative(lastRefreshedAt)}
          </span>
          {meta?.has_unpublished_changes && (
            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-orange-50 text-orange-600 border border-orange-200 rounded">有未发布修改</span>
          )}
          {latestSnapshot?.note && (
            <span className="text-gray-400">· {latestSnapshot.note}</span>
          )}
          {/* 更新频率：基于 reportType + schedule 以 pill 形式展示，hover 显示完整描述 */}
          <span
            className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded"
            title={`更新频率：${formatSchedule(report.reportType, report.schedule)}`}
          >
            <CalendarClock size={12} />
            {formatSchedule(report.reportType, report.schedule)}
          </span>
          {snapshots.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setVersionMenuOpen(open => !open)}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                <History size={12} /> 历史版本 ({snapshots.length})
              </button>
              {versionMenuOpen && (
                <>
                  {/* 点击外部关闭下拉菜单 */}
                  <div className="fixed inset-0 z-10" onClick={() => setVersionMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setViewingSnapshotId(null); setVersionMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        viewingSnapshotId === null ? 'bg-blue-50 text-blue-700 font-medium' : ''
                      }`}
                    >
                      当前数据（最新）
                    </button>
                    {[...snapshots].reverse().map(snap => (
                      <button
                        key={snap.id}
                        type="button"
                        onClick={() => { setViewingSnapshotId(snap.id); setVersionMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                          viewingSnapshotId === snap.id ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{snap.period || '（未知周期）'}</span>
                          <span className="text-gray-400" title={formatFullTime(snap.generatedAt)}>
                            {formatRelative(snap.generatedAt)}
                          </span>
                        </div>
                        {snap.note && <div className="text-gray-400 mt-0.5">{snap.note}</div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onEditConfig && (
          <button
            onClick={() => onEditConfig(report)}
            disabled={!!viewingSnapshot}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={viewingSnapshot ? '历史版本模式下不可编辑配置' : '编辑报告配置（名称/调度/字段/布局等）'}
          >
            <Settings size={14} /> 设置
          </button>
        )}
        <button
          onClick={() => setEditMode(editMode === 'layout' ? 'none' : 'layout')}
          disabled={!!viewingSnapshot}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
            editMode === 'layout'
              ? 'bg-purple-100 text-purple-700 border border-purple-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={viewingSnapshot ? '历史版本模式下不可编辑' : ''}
        >
          <Layout size={14} /> 布局
        </button>
        <button
          onClick={() => setEditMode(editMode === 'data' ? 'none' : 'data')}
          disabled={!!viewingSnapshot}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
            editMode === 'data'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={viewingSnapshot ? '历史版本模式下不可编辑' : ''}
        >
          <Database size={14} /> 数据
        </button>
        <button
          onClick={() => setEditMode('none')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
            editMode === 'none'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <Eye size={14} /> 预览
        </button>
        {/* 立即生成：运行工作流产生新数据 */}
        <button
          onClick={handleGenerateNow}
          disabled={generateMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          title={'立即生成 = 运行工作流产生新数据（与“刷新”不同：刷新仅重新渲染最新数据）'}
        >
          <Zap size={14} /> {generateMutation.isPending ? '生成中...' : '立即生成'}
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
          title="刷新 = 重新渲染最新数据（不运行工作流）"
        >
          <RefreshCw size={14} /> 刷新
        </button>
        {onShowSnapshots && (
          <button
            onClick={() => onShowSnapshots(snapshots, report.name)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
            title="生成记录"
          >
            <Clock size={14} />
          </button>
        )}
        <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Download size={14} /> PDF
        </button>
        {onShare && (
          <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors">
            <Share2 size={14} /> 分享
          </button>
        )}
        {onPublish && (
          <button onClick={onPublish} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Send size={14} /> 发布
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-0">
        {renderHeader()}
        {/* Tabs for tab mode */}
        {report.viewMode === 'tab' && report.tabs && (
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
            {report.tabs.map((t, i) => (
              <button key={t.id} onClick={() => {
                setActiveTab(i);
                setEditMode('none');
              }}
                className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  i === resolvedActiveTab
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {viewingSnapshot && (
            <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center justify-between">
              <span>
                正在查看历史版本：<strong>{viewingSnapshot.period || '（未知周期）'}</strong>
                {' · 生成于 '}<span title={formatFullTime(viewingSnapshot.generatedAt)}>{formatRelative(viewingSnapshot.generatedAt)}</span>
              </span>
              <button
                type="button"
                onClick={() => setViewingSnapshotId(null)}
                className="text-amber-700 hover:text-amber-900 underline"
              >
                返回当前
              </button>
            </div>
          )}
          {editMode === 'data' && (
            <DataEditor
              key={`${dataKey}:${reportDataVersion}`}
              data={currentData}
              report={report}
              validationScope={validationScope}
              onSave={data => { setReportData(dataKey, data, '编辑保存', period); onDataSaved?.(); }}
            />
          )}
          {editMode === 'layout' && (
            <LayoutEditor
              sections={currentSections}
              data={currentDataContext}
              onChange={handleSectionsChange}
            />
          )}
          {editMode === 'none' && (
            <div id="report-content" className="space-y-5">
              {currentSections.map((section, i) => (
                <SectionRenderer key={`${resolvedActiveTab}-${i}`} section={section} data={currentDataContext} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
