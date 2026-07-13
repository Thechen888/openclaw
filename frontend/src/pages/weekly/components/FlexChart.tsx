

import type { ChartConfig, AgentOutput, ArrayData, ReportDataContext } from '../report-engine/types';
import { resolveArrayData } from '../report-engine/template-engine';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const CARTESIAN_MARGIN = { top: 5, right: 16, bottom: 5, left: 8 };
const AXIS_TICK = { fontSize: 12 };
const TOOLTIP_CONTENT_STYLE = {
  maxWidth: 240,
  whiteSpace: 'normal' as const,
  borderRadius: 8,
};
const LEGEND_WRAPPER_STYLE = { paddingTop: 8 };

function formatScaledValue(value: number, divisor: number, suffix: string): string {
  const rounded = Math.round((value / divisor) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}${suffix}`;
}

export function formatAxisTick(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '');
  const absolute = Math.abs(value);
  if (absolute >= 100_000_000) return formatScaledValue(value, 100_000_000, '亿');
  if (absolute >= 10_000) return formatScaledValue(value, 10_000, '万');
  return String(value);
}

export function formatTooltipValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('zh-CN')
    : String(value ?? '');
}

type CompatibleReportData = ReportDataContext | AgentOutput;

function isPlainChartRow(value: unknown): value is ArrayData[number] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(cell => (
    typeof cell === 'string'
    || (typeof cell === 'number' && Number.isFinite(cell))
  ));
}

function resolveChartData(config: ChartConfig, context: CompatibleReportData): ArrayData {
  return resolveArrayData(context, config.bindingKey).filter(isPlainChartRow);
}

interface FlexChartProps {
  config: ChartConfig;
  data: CompatibleReportData;
}

export default function FlexChart({ config, data }: FlexChartProps) {
  const chartData = resolveChartData(config, data);
  const colors = config.colors || DEFAULT_COLORS;
  const h = config.height || 280;

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">{config.title}</h4>
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          暂无数据 (binding: {config.bindingKey})
        </div>
      </div>
    );
  }

  const renderPie = () => {
    const vField = config.valueFields?.[0] || 'value';
    return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={vField}
            nameKey={config.labelField || 'name'}
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltipValue} contentStyle={TOOLTIP_CONTENT_STYLE} />
          <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderBar = () => {
    const fields = config.valueFields || ['value'];
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={chartData} margin={CARTESIAN_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={config.labelField || 'name'} tick={AXIS_TICK} tickMargin={8} />
          <YAxis width={64} tick={AXIS_TICK} tickMargin={8} tickFormatter={formatAxisTick} />
          <Tooltip formatter={formatTooltipValue} contentStyle={TOOLTIP_CONTENT_STYLE} />
          <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
          {fields.map((f, i) => (
            <Bar key={f} dataKey={f} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderStackedBar = () => {
    const fields = config.valueFields || ['value'];
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={chartData} margin={CARTESIAN_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={config.labelField || 'name'} tick={AXIS_TICK} tickMargin={8} />
          <YAxis width={64} tick={AXIS_TICK} tickMargin={8} tickFormatter={formatAxisTick} />
          <Tooltip formatter={formatTooltipValue} contentStyle={TOOLTIP_CONTENT_STYLE} />
          <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
          {fields.map((f, i) => (
            <Bar key={f} dataKey={f} stackId="a" fill={colors[i % colors.length]} radius={i === fields.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderLine = () => {
    const fields = config.valueFields || ['value'];
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={chartData} margin={CARTESIAN_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={config.labelField || 'name'} tick={AXIS_TICK} tickMargin={8} />
          <YAxis width={64} tick={AXIS_TICK} tickMargin={8} tickFormatter={formatAxisTick} />
          <Tooltip formatter={formatTooltipValue} contentStyle={TOOLTIP_CONTENT_STYLE} />
          <Legend wrapperStyle={LEGEND_WRAPPER_STYLE} />
          {fields.map((f, i) => (
            <Line key={f} type="monotone" dataKey={f} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-w-0 bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{config.title}</h4>
      {config.type === 'pie' && renderPie()}
      {config.type === 'bar' && renderBar()}
      {config.type === 'stacked-bar' && renderStackedBar()}
      {config.type === 'line' && renderLine()}
    </div>
  );
}
