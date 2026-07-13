

import { useState } from 'react';
import type { ReportDefinition, AgentOutput, ReportSection } from '../report-engine/types';
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
import { Download, Eye, Database, Layout } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportViewerProps {
  report: ReportDefinition;
}

const BUILT_IN_REPORT_IDS = new Set(ALL_REPORTS.map(report => report.id));
const EMPTY_REPORT_DATA: AgentOutput = {};

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

export default function ReportViewer({ report }: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState<'none' | 'data' | 'layout'>('none');
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, ReportSection[]>>({});
  const setReportData = usePrototypeStore(state => state.setReportData);

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
  const fallbackSource = BUILT_IN_REPORT_IDS.has(report.id)
    ? (currentDeptKey ? AGENT_OUTPUT_BY_DEPT[currentDeptKey] : COMPANY_AGENT_OUTPUT)
    : EMPTY_REPORT_DATA;
  const fallbackData = selectDeclaredReportData(report, fallbackSource ?? EMPTY_REPORT_DATA);
  const currentData = storedData ?? fallbackData ?? EMPTY_REPORT_DATA;
  const currentDataContext = createReportDataContext(getReportDataId(report), currentData);

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-800">{report.name}</h2>
        {report.description && <p className="text-sm text-gray-500 mt-1">{report.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditMode(editMode === 'layout' ? 'none' : 'layout')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
            editMode === 'layout'
              ? 'bg-purple-100 text-purple-700 border border-purple-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <Layout size={14} /> 布局
        </button>
        <button
          onClick={() => setEditMode(editMode === 'data' ? 'none' : 'data')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
            editMode === 'data'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
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
        <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          <Download size={14} /> PDF
        </button>
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
          {editMode === 'data' && (
            <DataEditor
              key={`${dataKey}:${reportDataVersion}`}
              data={currentData}
              report={report}
              validationScope={validationScope}
              onSave={data => setReportData(dataKey, data)}
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
