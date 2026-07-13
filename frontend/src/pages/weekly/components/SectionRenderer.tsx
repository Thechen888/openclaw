

import type {
  ReportSection, AgentOutput, ReportDataContext, TableSection, ChartSection,
  KpiSection, TextSection, MarkdownSection, HtmlSection, StatusStyle,
} from '../report-engine/types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import { resolveBinding, resolveArrayData, resolveHtmlBinding, resolveValue } from '../report-engine/template-engine';
import FlexChart from './FlexChart';
import {
  Users, Wallet, Smile, CheckCircle, TrendingUp, CreditCard, Percent, Bot,
} from 'lucide-react';

const KPI_ICONS: Record<string, React.ElementType> = {
  users: Users, wallet: Wallet, smile: Smile,
  'check-circle': CheckCircle, 'trending-up': TrendingUp,
  'credit-card': CreditCard, percent: Percent, bot: Bot,
};

type CompatibleReportData = ReportDataContext | AgentOutput;

const DEFAULT_STATUS_STYLES: StatusStyle[] = [
  { text: '已完成', backgroundColor: '#dcfce7', color: '#166534' },
  { text: '进行中', backgroundColor: '#dbeafe', color: '#1e40af' },
  { text: '待启动', backgroundColor: '#f3f4f6', color: '#4b5563' },
  { text: '失败', backgroundColor: '#fee2e2', color: '#991b1b' },
];

const AUTOMATIC_RESOURCE_TAGS = new Set(['img', 'picture', 'source']);

const SAFE_HTML_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(tag => !AUTOMATIC_RESOURCE_TAGS.has(tag)),
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
  },
  strip: [
    ...(defaultSchema.strip ?? []),
    'style',
    'iframe',
    'object',
    'embed',
  ],
};

function isPlainRow(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function formatDynamicCell(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '—';
}

function getStatusStyle(value: string, styles?: StatusStyle[]): StatusStyle | null {
  const all = styles && styles.length > 0 ? styles : DEFAULT_STATUS_STYLES;
  return all.find(s => s.text === value) || null;
}

function KpiCards({ section, data }: { section: KpiSection; data: CompatibleReportData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {section.cards.map((card, i) => {
        const Icon = KPI_ICONS[card.icon || 'check-circle'] || CheckCircle;
        const displayVal = resolveValue(data, card.bindingKey);
        const trendVal = card.trendBinding ? resolveValue(data, card.trendBinding) : '';

        return (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-6 py-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                card.trend === 'up' ? 'bg-green-50 text-green-600' :
                card.trend === 'down' ? 'bg-red-50 text-red-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold text-gray-800">
              {card.unit === '¥' && <span className="text-sm font-normal text-gray-400">¥</span>}
              {displayVal}
              {card.unit && card.unit !== '¥' && <span className="text-sm font-normal text-gray-400 ml-0.5">{card.unit}</span>}
            </div>
            {trendVal && trendVal !== '—' && (
              <span className={`text-xs ${
                trendVal.startsWith('+') ? 'text-green-600' : trendVal.startsWith('-') ? 'text-red-600' : 'text-gray-400'
              }`}>{trendVal}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableRenderer({ section, data }: { section: TableSection; data: CompatibleReportData }) {
  const dynamicRows = section.arrayBindingKey
    ? resolveArrayData(data, section.arrayBindingKey)
    : [];
  const safeDynamicRows = dynamicRows.filter(isPlainRow);
  const dynamicColumns = section.dynamicColumns ?? [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {section.title && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">{section.title}</h4>
          {section.arrayBindingKey && (
            <span className="text-[10px] text-gray-400 font-mono">data: {section.arrayBindingKey}</span>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {/* Static rows from template */}
            {section.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell) => {
                  if (cell.merged) return null;
                  const isHeader = row.isHeader;
                  const eff = isHeader
                    ? { ...section.headerStyle, ...cell.style }
                    : { ...section.defaultStyle, ...cell.style };
                  const display = cell.type === 'binding'
                    ? resolveBinding(cell.value, data)
                    : cell.value;

                  return (
                    <td key={cell.id} rowSpan={cell.rowSpan} colSpan={cell.colSpan}
                      className="border border-gray-200"
                      style={{
                        backgroundColor: eff.backgroundColor, color: eff.color,
                        fontWeight: eff.fontWeight, fontSize: eff.fontSize,
                        textAlign: eff.textAlign, padding: eff.padding,
                        borderColor: eff.borderColor || '#e5e7eb',
                      }}>
                      {display || '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Dynamic array rows */}
            {safeDynamicRows.map((row, ri) => {
              return (
                <tr key={`dyn-${ri}`}>
                  {dynamicColumns.map((column, columnIndex) => {
                    const v = formatDynamicCell(row[column.key]);
                    const isStatusCol = section.statusField && column.key === section.statusField;
                    const statusStyle = isStatusCol ? getStatusStyle(v, section.statusStyles) : null;

                    return (
                      <td key={`${column.key}-${columnIndex}`} className="border border-gray-200"
                        style={{ ...section.defaultStyle, borderColor: section.defaultStyle?.borderColor || '#e5e7eb' }}>
                        {statusStyle ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: statusStyle.backgroundColor, color: statusStyle.color }}>
                            {v}
                          </span>
                        ) : v}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartRow({ section, data }: { section: ChartSection; data: CompatibleReportData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {section.charts.map(chart => (
        <FlexChart key={chart.id} config={chart} data={data} />
      ))}
    </div>
  );
}

function TextRenderer({ section, data }: { section: TextSection; data: CompatibleReportData }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 leading-relaxed"
      style={{
        color: section.color || '#374151',
        fontSize: section.fontSize || 14,
        fontWeight: section.fontWeight || 'normal',
        backgroundColor: section.backgroundColor,
      }}>
      {resolveBinding(section.content, data)}
    </div>
  );
}

function MarkdownRenderer({ section, data }: { section: MarkdownSection; data: CompatibleReportData }) {
  const resolved = resolveBinding(section.content, data);
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
      <ReactMarkdown>{resolved}</ReactMarkdown>
    </div>
  );
}

function HtmlRenderer({ section, data }: { section: HtmlSection; data: CompatibleReportData }) {
  const resolved = resolveHtmlBinding(section.content, data);
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <ReactMarkdown rehypePlugins={[rehypeRaw, [rehypeSanitize, SAFE_HTML_SCHEMA]]}>
        {resolved}
      </ReactMarkdown>
    </div>
  );
}

interface SectionRendererProps {
  section: ReportSection;
  data: CompatibleReportData;
}

export default function SectionRenderer({ section, data }: SectionRendererProps) {
  switch (section.type) {
    case 'kpi-cards': return <KpiCards section={section} data={data} />;
    case 'table': return <TableRenderer section={section} data={data} />;
    case 'chart': return <ChartRow section={section} data={data} />;
    case 'text': return <TextRenderer section={section} data={data} />;
    case 'markdown': return <MarkdownRenderer section={section} data={data} />;
    case 'html': return <HtmlRenderer section={section} data={data} />;
  }
}
