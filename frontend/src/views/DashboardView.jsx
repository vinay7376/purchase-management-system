import React, { useEffect, useState } from 'react';
import {
  FileText,
  Layers,
  Clock,
  CheckCircle2,
  GitPullRequest,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';

export const DashboardView = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[450px]">
        <div className="text-center">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading procurement telemetry...
          </p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total PR Lines',
      value: stats?.totalPrLines || 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      desc: 'Raw lines ingested',
    },
    {
      label: 'Grouped Requirements',
      value: stats?.totalRequirements || 0,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      desc: 'Clubbed by 14d/7d window',
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      desc: 'Awaiting buyer signoff',
    },
    {
      label: 'Direct PO Decisions',
      value: stats?.poDecisions || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      desc: 'Automated contract/spot POs',
    },
    {
      label: 'Sourcing Requests',
      value: stats?.sourcingRequests || 0,
      icon: GitPullRequest,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      desc: 'RFQ, RFP, & Capex bids',
    },
    {
      label: 'Emergency Requisitions',
      value: stats?.emergencyCount || 0,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      desc: 'Fast-tracked emergency path',
    },
  ];

  const ceiling = stats?.contractCeiling || { totalValueCap: 0, totalConsumed: 0, utilizationPct: 0 };
  const suppliers = stats?.suppliersCount || { total: 0, active: 0, blocked: 0, inactive: 0 };

  // Calculate remaining room in INR
  const remainingRoom = ceiling.totalValueCap - ceiling.totalConsumed;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c1427] via-[#111c38] to-[#0a1020] rounded-2xl p-7 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold border border-blue-400/20 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Autonomous Decision Engine Active</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Corvo Procurement Intelligence
            </h2>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              Evaluating purchase requisitions under <strong className="text-white">Corvo Policy v{stats?.activePolicyVersion}</strong> (effective from {stats?.activePolicyEffectiveDate}). Automated PR clubbing, deterministic valuation, contract ceiling enforcement, and preferred supplier scoring.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onNavigate('batch')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 active:scale-95"
            >
              <span>Process PR Batch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-all border border-white/10 backdrop-blur-xs active:scale-95"
            >
              Employee Chat
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`bg-white p-4 rounded-2xl border ${kpi.border} shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {kpi.value.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                  {kpi.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Grid: Contract Ceilings + Supplier Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rate Contract Ceiling Utilization (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Rate Contract Ceilings Utilization</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tracks cumulative order commitments against registered contract value caps (Policy Section 4).
                </p>
              </div>
              <button
                onClick={() => onNavigate('contracts')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>View all contracts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Progress Bar & Metrics */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-baseline text-xs font-semibold">
                <span className="text-slate-600">Total Consumed Value:</span>
                <span className="font-mono text-slate-900 font-bold">
                  ₹{ceiling.totalConsumed.toLocaleString('en-IN')} / ₹{ceiling.totalValueCap.toLocaleString('en-IN')} ({ceiling.utilizationPct}%)
                </span>
              </div>

              {/* Enhanced Visual Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/60 shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    ceiling.utilizationPct >= 90
                      ? 'bg-rose-500 animate-pulse'
                      : ceiling.utilizationPct >= 70
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, ceiling.utilizationPct))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Bottom stats summary */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Cap</div>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                ₹{(ceiling.totalValueCap / 100000).toFixed(1)} Lakh
              </div>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/60">
              <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Consumed</div>
              <div className="text-base font-bold text-blue-900 font-mono mt-0.5">
                ₹{(ceiling.totalConsumed / 100000).toFixed(1)} Lakh
              </div>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100/60">
              <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Remaining Room</div>
              <div className="text-base font-bold text-emerald-900 font-mono mt-0.5">
                ₹{(remainingRoom / 100000).toFixed(1)} Lakh
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Master Network Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Supplier Master Network</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clause 5.7 vendor exclusion enforcement status.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-emerald-900">Active Suppliers</span>
                </div>
                <span className="text-sm font-bold text-emerald-800 font-mono">{suppliers.active}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-xs font-semibold text-rose-900">Blocked (Forbidden)</span>
                </div>
                <span className="text-sm font-bold text-rose-800 font-mono">{suppliers.blocked}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span className="text-xs font-semibold text-slate-700">Inactive</span>
                </div>
                <span className="text-sm font-bold text-slate-700 font-mono">{suppliers.inactive}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('suppliers')}
              className="w-full py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 text-center active:scale-98"
            >
              Explore Preferred Rankings →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
