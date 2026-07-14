import { useState } from 'react';
import { useEffect } from 'react';
import './report.css';
import ReportSidebar from './components/ReportSidebar';
import ReportViewer from './components/ReportViewer';
import AgentProtocol from './components/AgentProtocol';
import NewReportCreator from './components/NewReportCreator';
import { SIDEBAR_ITEMS, ALL_REPORTS, INITIAL_REPORT_SNAPSHOTS } from './data/demoData';
import { usePrototypeStore } from './report-engine/reportStore';
import type { SidebarItem, ReportDefinition } from './report-engine/types';
import { FileText, Plus } from 'lucide-react';

export default function WeeklyReportsPage() {
  const [activeId, setActiveId] = useState('company-overview');
  const [view, setView] = useState<'report' | 'agent-doc' | 'new-report'>('report');
  // 不为 null 时表示处于“编辑现有报告”模式（内置报告也走 upsertCustomReport 以同 id 覆盖）
  const [editingReport, setEditingReport] = useState<ReportDefinition | null>(null);
  const customReports = usePrototypeStore(state => state.customReports);
  const upsertCustomReport = usePrototypeStore(state => state.upsertCustomReport);
  const seedSnapshots = usePrototypeStore(state => state.seedSnapshots);

  // 首屏初始化时写入预置历史快照（seedSnapshots 内部幂等，重复调用不会污染现有数据）
  useEffect(() => {
    seedSnapshots(INITIAL_REPORT_SNAPSHOTS);
  }, [seedSnapshots]);

  // 内置报告若被用户“编辑保存”后写进 customReports，取现存的覆写版本，避免仍命中内置原定义
  const overrideById = new Map(customReports.map(r => [r.id, r]));
  const builtInIds = new Set(ALL_REPORTS.map(r => r.id));
  const allReports: ReportDefinition[] = [
    ...ALL_REPORTS.map(r => overrideById.get(r.id) ?? r),
    ...customReports.filter(r => !builtInIds.has(r.id)),
  ];
  // 侧栏“自定义报告”分组只展示非内置的报告，避免内置报告被编辑后重复出现一份
  const customOnly = customReports.filter(r => !builtInIds.has(r.id));

  const handleSelect = (item: SidebarItem) => {
    if (item.type === 'builder') {
      // “模板构建器”入口直接跳转到新建报告表单，保留 activeId 以保证侧边栏高亮
      setView('new-report');
      setActiveId(item.id);
    } else if (item.type === 'agent-doc') {
      setView('agent-doc');
      setActiveId(item.id);
    } else if (item.reportId) {
      setView('report');
      setActiveId(item.reportId);
    }
  };

  const handleNewReport = (report: ReportDefinition) => {
    upsertCustomReport(report);
    setView('report');
    setActiveId(report.id);
    setEditingReport(null);
  };

  // 从 ReportViewer 的“设置”按钮触发：打开 NewReportCreator 并以当前报告初始化表单
  const handleEditReport = (report: ReportDefinition) => {
    setEditingReport(report);
    setView('new-report');
  };

  const activeReport = allReports.find(r => r.id === activeId);

  const sidebarItems: SidebarItem[] = [
    ...SIDEBAR_ITEMS,
    ...(customOnly.length > 0
      ? [{
          id: 'grp-custom',
          label: '自定义报告',
          icon: 'layout-grid',
          type: 'group' as const,
          children: customOnly.map(r => ({
            id: r.id,
            label: r.name,
            icon: r.icon || 'layout-grid',
            type: 'report' as const,
            reportId: r.id,
          })),
        }]
      : []),
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50 text-gray-900 -m-6 -mt-4" style={{ colorScheme: 'light' }}>
      <ReportSidebar items={sidebarItems} activeId={activeId} onSelect={handleSelect} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-6 py-2 bg-white border-b border-gray-200">
          <button
            onClick={() => { setView('new-report'); setActiveId('builder'); setEditingReport(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={14} /> 新建报告
          </button>
        </div>

        {view === 'report' && activeReport && (
          <ReportViewer key={activeReport.id} report={activeReport} onEditConfig={handleEditReport} />
        )}

        {view === 'new-report' && (
          <NewReportCreator
            key={editingReport?.id ?? 'new'}
            initialReport={editingReport ?? undefined}
            onCreate={handleNewReport}
            onCancel={() => { setView('report'); setEditingReport(null); }}
          />
        )}

        {view === 'agent-doc' && <AgentProtocol />}

        {view === 'report' && !activeReport && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-3" />
              <p className="text-sm">从左侧选择一份报告</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
