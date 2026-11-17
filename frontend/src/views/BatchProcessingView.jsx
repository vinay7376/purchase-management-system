import React, { useState } from 'react';
import { Download, Play, FileSpreadsheet, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';

export const BatchProcessingView = () => {
  const [file, setFile] = useState(null);
  const [policyVersion, setPolicyVersion] = useState('5.0');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDecision, setFilterDecision] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      alert('Please select a PR batch CSV file.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.processBatch(file, undefined, policyVersion);
      setResult(data);
    } catch (err) {
      alert(`Error processing batch: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!result || !result.records.length) return;
    try {
      const blob = await api.exportDecisions(result.records);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `corvo_decisions_v${policyVersion}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const filteredRecords = (result?.records || []).filter((r) => {
    const s = search.toLowerCase();
    const matchSearch =
      search === '' ||
      (r.pr_no || '').toLowerCase().includes(s) ||
      (r.resolved_item_code || '').toLowerCase().includes(s) ||
      (r.group_id || '').toLowerCase().includes(s) ||
      (r.po_id || '').toLowerCase().includes(s) ||
      (r.supplier_id || '').toLowerCase().includes(s);

    const matchDecision = filterDecision === '' || r.decision === filterDecision;
    return matchSearch && matchDecision;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>PR Batch Ingestion & Decision Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload raw PR batches in CSV format to trigger the policy-driven decision engine (POST /api/process-batch)
          </p>
        </div>

        {result && (
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Decisions CSV (13 Columns)</span>
          </button>
        )}
      </div>

      {/* Upload & Run Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Batch CSV File
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50/50"
              />
              {file && (
                <div className="text-xs font-mono font-bold text-slate-700 whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-lg">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Supports standard Corvo 13-column PR schema with creation timestamps, plant codes, and quantities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3 justify-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Policy Version
              </label>
              <select
                value={policyVersion}
                onChange={(e) => setPolicyVersion(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-800"
              >
                <option value="5.0">Policy v5.0 (Standard)</option>
                <option value="5.1">Policy v5.1 (Amendment)</option>
              </select>
            </div>

            <button
              onClick={handleProcess}
              disabled={loading || !file}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Processing...' : 'Run Decision Engine'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PR Lines</span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">{result.summary.totalPrLines}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clubbed Reqs</span>
            <div className="text-2xl font-black font-mono text-blue-600 mt-1">{result.summary.totalRequirements}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Consolidated POs</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">{result.summary.totalPOs}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PO Decisions</span>
            <div className="text-2xl font-black font-mono text-indigo-600 mt-1">{result.summary.poDecisions}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sourcing Bids</span>
            <div className="text-2xl font-black font-mono text-purple-600 mt-1">{result.summary.sourcingRequests}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Emergencies</span>
            <div className="text-2xl font-black font-mono text-rose-600 mt-1">{result.summary.emergencyRequirements}</div>
          </div>
        </div>
      )}

      {/* Decisions Output Table */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Header Filter Toolbar */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Search PR, item, group or PO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl w-64 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterDecision}
                onChange={(e) => setFilterDecision(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                <option value="">All Decisions</option>
                <option value="PO">Direct PO</option>
                <option value="SOURCING_REQUEST">Sourcing Request</option>
              </select>
            </div>
            <span className="text-slate-500 font-semibold text-xs">
              Showing <strong>{filteredRecords.length}</strong> of <strong>{result.records.length}</strong> Decision Lines
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">PR Number</th>
                  <th className="py-3.5 px-3">Line</th>
                  <th className="py-3.5 px-3">Resolved Item</th>
                  <th className="py-3.5 px-3">Group ID</th>
                  <th className="py-3.5 px-3">Consolidated PO</th>
                  <th className="py-3.5 px-3">Decision</th>
                  <th className="py-3.5 px-3">Route</th>
                  <th className="py-3.5 px-3">Supplier ID</th>
                  <th className="py-3.5 px-3 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-right">Group Val (INR)</th>
                  <th className="py-3.5 px-4">Policy Reason / Clause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.pr_no}</td>
                    <td className="py-3 px-3 text-slate-500 font-semibold">{r.pr_line}</td>
                    <td className="py-3 px-3">
                      {r.resolved_item_code === 'NEW' ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200">
                          NEW
                        </span>
                      ) : (
                        <span className="text-blue-600 font-bold">{r.resolved_item_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{r.group_id || '-'}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{r.po_id || '-'}</td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="decision" value={r.decision} />
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="route" value={r.route} />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{r.supplier_id || '-'}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-800">
                      {r.unit_price ? `₹${parseFloat(r.unit_price).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {r.group_value_inr ? `₹${parseFloat(r.group_value_inr).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-sm truncate text-[11px]" title={r.reason}>
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
