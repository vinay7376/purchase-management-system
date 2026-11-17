import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  FileSpreadsheet,
  Layers,
  ScrollText,
  FileCheck,
  Users,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const Sidebar = ({ currentTab, onSelectTab, pendingApprovalsCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Employee PR Intake', icon: MessageSquare },
    { id: 'batch', label: 'Batch Processing & Export', icon: FileSpreadsheet },
    { id: 'requirements', label: 'Requirements Workspace', icon: Layers, count: pendingApprovalsCount },
    { id: 'policies', label: 'Policy Engine (Data-Driven)', icon: ScrollText },
    { id: 'contracts', label: 'Contract Ceilings', icon: FileCheck },
    { id: 'suppliers', label: 'Supplier Ranking Analytics', icon: Users },
    { id: 'audit', label: 'Audit Trail & Overrides', icon: History },
  ];

  return (
    <aside className="w-64 bg-[#0a1020] text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800/80 select-none shadow-xl">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3 bg-[#080d1a]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
          C
        </div>
        <div>
          <div className="font-bold text-white tracking-tight leading-tight text-sm flex items-center gap-1.5">
            Corvo Engineering
          </div>
          <div className="text-[10px] text-blue-400 font-medium tracking-wide flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Policy v5.0 Active</span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25 ring-1 ring-white/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.count && item.count > 0 ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-[#080d1a] text-xs">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Configured Plants:</span>
        </div>
        <div className="flex gap-2 mt-2">
          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            PUN1 (Bhosari)
          </span>
          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            CHK1 (Chakan)
          </span>
        </div>
        <div className="mt-3 text-[10px] text-slate-500 font-medium">
          Cantill.ai Full-Stack Coding Challenge
        </div>
      </div>
    </aside>
  );
};
