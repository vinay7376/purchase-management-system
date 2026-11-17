import React from 'react';
import { Database, RefreshCw, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../services/api.js';

export const Header = ({
  title,
  subtitle,
  onRefresh,
  activePolicyVersion = '5.0',
}) => {
  const [seeding, setSeeding] = React.useState(false);
  const [seedMsg, setSeedMsg] = React.useState(null);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await api.seedData();
      setSeedMsg('Database successfully seeded!');
      if (onRefresh) onRefresh();
      setTimeout(() => setSeedMsg(null), 3000);
    } catch (err) {
      setSeedMsg(`Seed error: ${err.message}`);
      setTimeout(() => setSeedMsg(null), 4000);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 shadow-2xs">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {seedMsg && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-fade-in flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {seedMsg}
          </span>
        )}

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-slate-600">
            Engine Policy: <strong className="text-slate-900 font-bold">v{activePolicyVersion}</strong>
          </span>
        </div>

        {/* Seed Data button */}
        <button
          onClick={handleSeed}
          disabled={seeding}
          title="Seed master data and contracts into DB"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs disabled:opacity-50 active:scale-95"
        >
          <Database className={`w-3.5 h-3.5 text-blue-600 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Seeding...' : 'Seed Data'}</span>
        </button>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh current view data"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200/80 active:scale-95 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
