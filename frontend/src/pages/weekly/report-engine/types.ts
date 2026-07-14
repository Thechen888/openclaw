// ===== Data Binding Protocol =====

// Agent outputs data in these formats:
// 1. Single value:  { "key": "value" }
// 2. KV list:       { "key": { "label1": val1, "label2": val2 } }
// 3. Array:         { "key": [ {col1: v1, col2: v2}, ... ] }

export type BindingValueType = 'single' | 'kv' | 'array';

export interface BindingField {
  name: string;           // e.g. "revenue_q1"
  label: string;          // e.g. "Q1收入"
  type: BindingValueType;
  description?: string;
  required?: boolean;     // defaults to true during validation
}

export type SingleValue = string | number;
export type KVData = Record<string, string | number>;
export type ArrayData = Record<string, string | number>[];

export type BindingValue = SingleValue | KVData | ArrayData;
export type AgentOutput = Record<string, BindingValue>;
export type ReportDataContext = Record<string, AgentOutput>;

// ===== Cell & Style =====

export interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  borderColor?: string;
  padding?: number;
}

export type CellType = 'fixed' | 'binding';

export interface TableCell {
  id: string;
  type: CellType;
  value: string;
  style?: CellStyle;
  rowSpan?: number;
  colSpan?: number;
  merged?: boolean;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
  isHeader?: boolean;
}

// ===== Chart =====

export type ChartType = 'pie' | 'bar' | 'line' | 'stacked-bar';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  bindingKey: string;       // key in AgentOutput pointing to array/kv data
  labelField?: string;      // which field in array items is the label
  valueFields?: string[];   // which fields are values (for multi-series)
  colors?: string[];
  width?: number;
  height?: number;
}

// ===== Report Section =====

export type SectionType = 'table' | 'chart' | 'kpi-cards' | 'text';

export interface StatusStyle {
  text: string;           // e.g. "进行中"
  backgroundColor: string;
  color: string;
}

export interface DynamicColumn {
  key: string;
  label: string;
}

export interface TableSection {
  type: 'table';
  title?: string;
  rows: TableRow[];
  colCount: number;
  defaultStyle?: CellStyle;
  headerStyle?: CellStyle;
  arrayBindingKey?: string;   // if set, renders array data as dynamic rows
  dynamicColumns?: DynamicColumn[];
  statusField?: string;       // which column gets status badge styling
  statusStyles?: StatusStyle[];
}

export interface ChartSection {
  type: 'chart';
  charts: ChartConfig[];
  layout?: 'row' | 'grid';
}

export interface KpiCard {
  label: string;
  bindingKey: string;
  unit?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendBinding?: string;
}

export interface KpiSection {
  type: 'kpi-cards';
  cards: KpiCard[];
}

export interface TextSection {
  type: 'text';
  content: string;   // can include {{bindings}}
  color?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  backgroundColor?: string;
}

export interface MarkdownSection {
  type: 'markdown';
  content: string;   // markdown text, can include {{bindings}}
}

export interface HtmlSection {
  type: 'html';
  content: string;   // raw HTML, can include {{bindings}}
}

export type ReportSection = TableSection | ChartSection | KpiSection | TextSection | MarkdownSection | HtmlSection;

// ===== Report =====

export type ReportViewMode = 'page' | 'tab';

export interface ReportTab {
  id: string;
  label: string;
  sections: ReportSection[];
  departmentKey?: string;   // if set, this tab shows data for a specific dept
}

// 报告周期类型（同时决定调度频率与调度表单形态）
export type ReportType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

// 各类型对应的调度参数，按 type 判别
export type ReportSchedule =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; dayOfWeek: number; hour: number; minute: number }              // dayOfWeek: 1-7 (1=周一)
  | { type: 'monthly'; dayOfMonth: number; hour: number; minute: number }            // dayOfMonth: 1-31
  | { type: 'quarterly'; monthOfQuarter: number; dayOfMonth: number; hour: number; minute: number } // monthOfQuarter: 1-3
  | { type: 'yearly'; month: number; dayOfMonth: number; hour: number; minute: number };            // month: 1-12

export interface ReportDefinition {
  id: string;
  name: string;
  period: string;
  dataId: string;
  icon?: string;
  description?: string;
  viewMode: ReportViewMode;
  tabs?: ReportTab[];           // for 'tab' mode
  sections?: ReportSection[];   // for 'page' mode
  bindingFields: BindingField[];
  createdAt: string;
  /** 报告类型（日/周/月/季/年），可选：老数据未设置时默认按 period 字面理解 */
  reportType?: ReportType;
  /** 生成调度配置，可选：与 reportType 联动 */
  schedule?: ReportSchedule;
}

export interface ReportGroup {
  id: string;
  name: string;
  icon?: string;
  reports: ReportDefinition[];
}

/**
 * 报告数据快照：每一次数据“创建/刷新/编辑保存”都会归档为一条快照，
 * 用于展示历史版本、取最新刷新时间。snapshots 以 dataKey 为单位分组存储。
 */
export interface ReportDataSnapshot {
  id: string;
  generatedAt: string;   // ISO
  period: string;        // 归档时的报告周期标识，如 "2026-Q2"
  data: AgentOutput;     // 该快照的完整数据
  note?: string;         // 来源说明，如 "手动刷新" / "定时生成" / "编辑保存"
}

// ===== Sidebar Navigation =====

export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  type: 'report' | 'group' | 'builder' | 'agent-doc';
  children?: SidebarItem[];
  reportId?: string;
}
