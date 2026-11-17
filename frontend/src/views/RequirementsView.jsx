import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Eye, Filter, Layers, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';
import { RequirementDetailModal } from './RequirementDetailModal.jsx';

export const RequirementsView = () => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Filters
  const [plant, setPlant] = useState('');
  const [decision, setDecision] = useState('');
  const [route, setRoute] = useState('');
  const [status, setStatus] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [batchId, setBatchId] = useState('');
  const [availableBatches, setAvailableBatches] = useState([]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const data = await api.getRequirements({
        plant,
        decision,
        route,
        status,
        emergency: emergencyOnly ? 'true' : undefined,
        search,
        batch_id: batchId || undefined,
      });
      setRequirements(data);

      // Extract unique batch IDs if available
      if (data && Array.isArray(data)) {
        const batches = [...new Set(data.map((r) => r.batch_id).filter(Boolean))];
        if (batches.length > 0) {
          setAvailableBatches((prev) => [...new Set([...prev, ...batches])]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requirements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [plant, decision, route, status, emergencyOnly, search, batchId]);

  const handleOpenDetail = async (req) => {
    setSelectedReq(req);
    try {
      const data = await api.getRequirementDetail(req.group_id);
      setAuditLogs(data.auditLogs);
    } catch (err) {
      setAuditLogs([]);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Buyer Requirements Workspace</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {requirements.length} Groups
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review clubbed requirements, inspect deterministic clause reasoning, approve decisions, or apply auditable overrides.
          </p>
        </div>
        <button
          onClick={fetchRequirements}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-2xs active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search group, item, PO or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {availableBatches.length > 1 && (
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-xs"
          >
            <option value="">All Batches</option>
            {availableBatches.map((b, idx) => (
              <option key={b} value={b}>
                Batch {idx + 1} ({b.slice(-6)})
              </option>
            ))}
          </select>
        )}

        <select
          value={plant}
          onChange={(e) => setPlant(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <option value="">All Plants</option>
          <option value="PUN1">PUN1 (Bhosari)</option>
          <option value="CHK1">CHK1 (Chakan)</option>
        </select>

        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <option value="">All Decisions</option>
          <option value="PO">Direct PO</option>
          <option value="SOURCING_REQUEST">Sourcing Request</option>
        </select>

        <select
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <option value="">All Routes</option>
          <option value="CONTRACT_PO">CONTRACT_PO</option>
          <option value="EMERGENCY_PO">EMERGENCY_PO</option>
          <option value="SPOT_PO">SPOT_PO</option>
          <option value="RFQ">RFQ</option>
          <option value="RFP">RFP</option>
          <option value="CAPEX_SOURCING">CAPEX_SOURCING</option>
          <option value="NEW_ITEM_SOURCING">NEW_ITEM_SOURCING</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
        >
          <option value="">All Statuses</option>
          <option value="DECIDED">DECIDED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="OVERRIDDEN">OVERRIDDEN</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 ml-1 select-none">
          <input
            type="checkbox"
            checked={emergencyOnly}
            onChange={(e) => setEmergencyOnly(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span className="text-xs">Emergency Only</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading requirements...
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">
            No requirements match the selected filters. Upload a batch or raise a PR via chat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Group ID</th>
                  <th className="py-3.5 px-3">Plant</th>
                  <th className="py-3.5 px-3">Item Code</th>
                  <th className="py-3.5 px-3">PR Lines</th>
                  <th className="py-3.5 px-3">Total Qty</th>
                  <th className="py-3.5 px-4 text-right">Group Value (INR)</th>
                  <th className="py-3.5 px-3">Decision</th>
                  <th className="py-3.5 px-3">Route</th>
                  <th className="py-3.5 px-3">Supplier</th>
                  <th className="py-3.5 px-3">Consolidated PO</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {requirements.map((r, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.group_id}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                        {r.plant}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {r.resolved_item_code === 'NEW' ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200">
                          NEW
                        </span>
                      ) : (
                        <span className="text-blue-600 font-bold">{r.resolved_item_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{r.pr_lines.length} lines</td>
                    <td className="py-3 px-3 text-slate-800 font-bold">{r.total_quantity}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ₹{r.group_value_inr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="decision" value={r.decision} />
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="route" value={r.route} />
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{r.supplier_id || '-'}</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">{r.po_id || '-'}</td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="status" value={r.status} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleOpenDetail(r)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                        title="View Full Detail & Actions"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedReq && (
        <RequirementDetailModal
          requirement={selectedReq}
          auditLogs={auditLogs}
          onClose={() => setSelectedReq(null)}
          onRefresh={fetchRequirements}
        />
      )}
    </div>
  );
};
