import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, History, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../services/api.js';

export const AuditLogView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const s = search.toLowerCase();
    return (
      search === '' ||
      (l.user || '').toLowerCase().includes(s) ||
      (l.action || '').toLowerCase().includes(s) ||
      (l.entity_id || '').toLowerCase().includes(s) ||
      (l.reason && l.reason.toLowerCase().includes(s))
    );
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Audit Trail & Governance Logs</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {logs.length} Recorded Events
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all buyer decisions, approvals, written overrides, and policy version activations.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, entity or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl w-72 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-slate-500 font-semibold text-xs">
            Showing <strong>{filteredLogs.length}</strong> Events
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading audit trail...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-3">Target Entity</th>
                  <th className="py-3.5 px-3">Entity ID</th>
                  <th className="py-3.5 px-4">Reason / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{log.user}</td>
                    <td className="py-3 px-4 font-sans">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-tight ${
                          log.action.includes('OVERRIDDEN')
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : log.action.includes('APPROVED')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.action.includes('REGISTERED')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-600 font-bold text-[10px]">{log.entity_type}</td>
                    <td className="py-3 px-3 font-bold text-blue-600">{log.entity_id}</td>
                    <td className="py-3 px-4 font-sans text-slate-700 max-w-md truncate text-[11px]" title={log.reason}>
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
