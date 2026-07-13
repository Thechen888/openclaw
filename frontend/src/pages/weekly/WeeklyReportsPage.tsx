import { useState } from 'react';
import './report.css';
import ReportSidebar from './components/ReportSidebar';
import ReportViewer from './components/ReportViewer';
import AgentProtocol from './components/AgentProtocol';
import NewReportCreator from './components/NewReportCreator';
import { SIDEBAR_ITEMS, ALL_REPORTS } from './data/demoData';
import { usePrototypeStore } from './report-engine/reportStore';
import type { SidebarItem, ReportDefinition } from './report-engine/types';
import { FileText, Plus } from 'lucide-react';

export default function WeeklyReportsPage() {
  const [activeId, setActiveId] = useState('company-overview');
  const [view, setView] = useState<'report' | 'builder' | 'agent-doc' | 'new-report'>('report');
  const customReports = usePrototypeStore(state => state.customReports);
  const upsertCustomReport = usePrototypeStore(state => state.upsertCustomReport);

  const allReports = [...ALL_REPORTS, ...customReports];

  const handleSelect = (item: SidebarItem) => {
    if (item.type === 'builder') {
      setView('builder');
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
  };

  const activeReport = allReports.find(r => r.id === activeId);

  const sidebarItems: SidebarItem[] = [
    ...SIDEBAR_ITEMS,
    ...(customReports.length > 0
      ? [{
          id: 'grp-custom',
          label: '自定义报告',
          icon: 'layout-grid',
          type: 'group' as const,
          children: customReports.map(r => ({
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
            onClick={() => setView('new-report')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={14} /> 新建报告
          </button>
        </div>

        {view === 'report' && activeReport && (
          <ReportViewer key={activeReport.id} report={activeReport} />
        )}

        {view === 'new-report' && (
          <NewReportCreator onCreate={handleNewReport} onCancel={() => setView('report')} />
        )}

        {view === 'builder' && (
          <div className="flex-1 p-6">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">拖拽式构建器正在开发中。请使用"新建报告"功能创建。</p>
              <button
                onClick={() => setView('new-report')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={14} /> 新建报告
              </button>
            </div>
          </div>
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
