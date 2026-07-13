

import { useState } from 'react';
import {
  LayoutDashboard, Building2, Wallet, LayoutGrid, Bot,
  ChevronDown, ChevronRight, FileText, Globe, Menu, X,
} from 'lucide-react';
import type { SidebarItem } from '../report-engine/types';

const ICON_MAP: Record<string, React.ElementType> = {
  'layout-dashboard': LayoutDashboard,
  'building2': Building2,
  'wallet': Wallet,
  'layout-grid': LayoutGrid,
  'bot': Bot,
  'globe': Globe,
};

function SidebarIcon({ name, size = 16 }: { name?: string; size?: number }) {
  const Icon = name ? ICON_MAP[name] : FileText;
  return Icon ? <Icon size={size} /> : <FileText size={size} />;
}

interface SidebarProps {
  items: SidebarItem[];
  activeId: string;
  onSelect: (item: SidebarItem) => void;
}

export default function Sidebar({ items, activeId, onSelect }: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    items.forEach(i => { if (i.children) init[i.id] = true; });
    return init;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const renderItem = (item: SidebarItem, depth = 0) => {
    const isGroup = item.type === 'group' && item.children;
    const isActive = item.id === activeId || item.reportId === activeId;

    if (isGroup) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggle(item.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            {expanded[item.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <SidebarIcon name={item.icon} size={14} />
            <span>{item.label}</span>
          </button>
          {expanded[item.id] && (
            <div className="ml-2">
              {item.children!.map(child => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => { onSelect(item); setMobileOpen(false); }}
        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm rounded-lg transition-all ${
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        <SidebarIcon name={item.icon} size={16} />
        <span>{item.label}</span>
      </button>
    );
  };

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800">Agent</h1>
            <p className="text-[10px] text-gray-400">企业报告平台</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map(item => renderItem(item))}
      </nav>
      <div className="p-3 border-t border-gray-100 text-[10px] text-gray-400 text-center">
        Agent v0.4 · 2026-Q2
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-56 bg-white border-r border-gray-200 flex flex-col
        transition-transform lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}
