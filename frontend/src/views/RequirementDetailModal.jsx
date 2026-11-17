import React, { useState } from 'react';
import { X, CheckCircle2, AlertOctagon, History, FileText } from 'lucide-react';
import { Badge } from '../components/Badge.jsx';
import { api } from '../services/api.js';

export const RequirementDetailModal = ({
  requirement,
  auditLogs,
  onClose,
  onRefresh,
}) => {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideDecision, setOverrideDecision] = useState(requirement.decision);
  const [overrideRoute, setOverrideRoute] = useState(requirement.route);
  const [overrideSupplierId, setOverrideSupplierId] = useState(requirement.supplier_id || '');
  const [overridePrice, setOverridePrice] = useState(String(requirement.unit_price || ''));
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await api.approveRequirement(requirement.group_id, 'Head of Procurement', 'Approved standard decision');
      onRefresh();
      onClose();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      alert('A written reason of at least 5 characters is mandatory for decision overrides.');
      return;
    }

    try {
      setSubmitting(true);
      await api.overrideRequirement(requirement.group_id, {
        user: 'Head of Procurement',
        reason: overrideReason.trim(),
        newDecision: overrideDecision,
        newRoute: overrideRoute,
        newSupplierId: overrideSupplierId,
        newUnitPrice: overridePrice ? parseFloat(overridePrice) : undefined,
      });
      onRefresh();
      onClose();
    } catch (err) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="font-mono text-base font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
              {requirement.group_id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{requirement.resolved_item_code}</span>
                <Badge type="plant" value={requirement.plant} />
                {requirement.is_emergency && <Badge type="urgency" value="Emergency" />}
                <Badge type="status" value={requirement.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Decision Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Automated Decision</span>
              <div className="flex items-center gap-2">
                <Badge type="decision" value={requirement.decision} />
                <Badge type="route" value={requirement.route} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div>
                <span className="text-slate-500 block">Total Quantity:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{requirement.total_quantity}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Unit Price:</span>
                <span className="font-mono font-bold text-slate-800 text-sm">₹{requirement.unit_price.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Value (INR):</span>
                <span className="font-mono font-bold text-blue-700 text-sm">₹{requirement.group_value_inr.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consolidated PO:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{requirement.po_id || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 text-xs block mb-1">Clause & Explainability:</span>
              <p className="text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800">
                <span className="font-bold text-blue-600">[Clause {requirement.clause} | Policy v{requirement.policy_version}]</span>{' '}
                {requirement.reason}
              </p>
            </div>

            {requirement.supplier_id && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">Selected Supplier:</span>
                <span className="font-mono font-bold text-emerald-700">{requirement.supplier_id}</span>
              </div>
            )}

            {requirement.suggested_supplier_ids && requirement.suggested_supplier_ids.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-600 block mb-1">Suggested Suppliers for Sourcing:</span>
                <div className="flex gap-2 font-mono">
                  {requirement.suggested_supplier_ids.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                      {idx + 1}. {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clubbed PR Lines Breakdown */}
          <div>
            <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Consolidated PR Lines ({requirement.pr_lines.length})</span>
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">PR / Line</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Need-by Date</th>
                    <th className="py-2.5 px-3">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {requirement.pr_lines.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800">{l.pr_no}/{l.pr_line}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{l.description}</td>
                      <td className="py-2 px-3 text-slate-900 font-semibold">{l.quantity}</td>
                      <td className="py-2 px-3 text-slate-600">{l.need_by_date}</td>
                      <td className="py-2 px-3 font-sans">
                        <Badge type="urgency" value={l.urgency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Override Form (if toggled) */}
          {showOverride && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
                <AlertOctagon className="w-4 h-4 text-purple-600" />
                <span>Buyer Decision Override</span>
              </div>
              <p className="text-xs text-purple-700">
                Overrides allow buyers to change route, supplier or pricing with an auditable justification.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">New Decision</label>
                  <select
                    value={overrideDecision}
                    onChange={(e) => setOverrideDecision(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="PO">PO</option>
                    <option value="SOURCING_REQUEST">SOURCING_REQUEST</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">New Route</label>
                  <select
                    value={overrideRoute}
                    onChange={(e) => setOverrideRoute(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="CONTRACT_PO">CONTRACT_PO</option>
                    <option value="EMERGENCY_PO">EMERGENCY_PO</option>
                    <option value="SPOT_PO">SPOT_PO</option>
                    <option value="RFQ">RFQ</option>
                    <option value="RFP">RFP</option>
                    <option value="CAPEX_SOURCING">CAPEX_SOURCING</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Supplier ID</label>
                  <input
                    type="text"
                    value={overrideSupplierId}
                    onChange={(e) => setOverrideSupplierId(e.target.value)}
                    placeholder="e.g. S014"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Price (INR)</label>
                  <input
                    type="number"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mandatory Written Justification *</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this policy decision is being overridden..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowOverride(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverrideSubmit}
                  disabled={submitting || overrideReason.length < 5}
                  className="px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg"
                >
                  {submitting ? 'Applying...' : 'Confirm Override'}
                </button>
              </div>
            </div>
          )}

          {/* Audit Trail for this Requirement */}
          {auditLogs && auditLogs.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                <span>Audit Trail ({auditLogs.length} events)</span>
              </h4>
              <div className="space-y-2">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex justify-between font-medium text-slate-700 mb-0.5">
                      <span>{log.action}</span>
                      <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">User: {log.user}</div>
                    {log.reason && <div className="text-slate-800 font-medium mt-1">Reason: {log.reason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:bg-purple-50 px-3 py-2 rounded-lg border border-purple-200 transition-colors"
          >
            {showOverride ? 'Close Override Form' : 'Override Decision'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting || requirement.status === 'APPROVED'}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{requirement.status === 'APPROVED' ? 'Approved' : 'Approve Decision'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
