import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Upload,
  CheckCircle2,
  XCircle,
  Send,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';

export const PolicyManagementView = () => {
  const [policies, setPolicies] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('5.0');
  const [loading, setLoading] = useState(true);

  // Amendment upload / text
  const [amendmentFile, setAmendmentFile] = useState(null);
  const [amendmentText, setAmendmentText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [proposedDraft, setProposedDraft] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.getPolicies();
      setPolicies(data);
      if (data.length > 0 && !data.some((p) => p.version === selectedVersion)) {
        const active = data.find((p) => p.status === 'ACTIVE');
        setSelectedVersion(active ? active.version : data[0].version);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const currentPolicy = policies.find((p) => p.version === selectedVersion) || policies[0];

  const handleUploadAmendment = async () => {
    if (!amendmentFile && !amendmentText.trim()) {
      alert('Please select an amendment PDF file or enter natural language description.');
      return;
    }

    try {
      setUploading(true);
      const res = await api.uploadPolicyAmendment(amendmentFile || undefined, amendmentText || undefined);
      setProposedDraft(res);
      await fetchPolicies();
      setSelectedVersion(res.proposedPolicy.version);
      setAmendmentText('');
      setAmendmentFile(null);
    } catch (err) {
      alert(`Amendment parsing failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (version) => {
    try {
      setUploading(true);
      await api.approvePolicy(version, 'Head of Procurement', 'Approved policy change from effective date');
      await fetchPolicies();
      setProposedDraft(null);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReject = async (version) => {
    try {
      setUploading(true);
      await api.rejectPolicy(version, 'Head of Procurement', 'Rejected by procurement reviewer');
      await fetchPolicies();
      setProposedDraft(null);
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Policy as Data Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement rules are versioned data structures with effective dates. Modify thresholds, plants, and categories without changing application code.
          </p>
        </div>

        {/* Version Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Select Policy Version:</span>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-xs focus:ring-1 focus:ring-blue-500"
          >
            {policies.map((p) => (
              <option key={p.version} value={p.version}>
                v{p.version} ({p.status}) — Eff: {p.effective_date}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Details Banner */}
      {currentPolicy && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-slate-900">{currentPolicy.title}</h3>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold">
                v{currentPolicy.version}
              </span>
              <Badge type="status" value={currentPolicy.status} />
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap gap-4 font-mono">
              <span>Effective Date: <strong>{currentPolicy.effective_date}</strong></span>
              <span>Owner: <strong>{currentPolicy.uploaded_by || 'Head of Procurement'}</strong></span>
              <span>Total Rules: <strong>{currentPolicy.rules?.length || 0}</strong></span>
            </div>
            {currentPolicy.diff_summary && (
              <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 font-sans">
                <strong>Change Summary:</strong> {currentPolicy.diff_summary}
              </div>
            )}
          </div>

          {currentPolicy.status === 'PENDING_APPROVAL' && (
            <div className="flex gap-2.5">
              <button
                onClick={() => handleReject(currentPolicy.version)}
                disabled={uploading}
                className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Draft</span>
              </button>
              <button
                onClick={() => handleApprove(currentPolicy.version)}
                disabled={uploading}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Activate v{currentPolicy.version}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid: Rules Table (left 2/3) + Amendment Input (right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-blue-600" />
              <span>Evaluation Rules Order (Exact Priority Sequence)</span>
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Evaluated 1 &rarr; N until first match
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {currentPolicy?.rules?.map((rule) => (
              <div key={rule.rule_id} className="p-4 hover:bg-slate-50 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold font-mono">
                      {rule.priority}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{rule.clause}</span>
                    <span className="text-xs text-slate-500 font-mono">({rule.rule_id})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge type="decision" value={rule.outcome.decision} />
                    <Badge type="route" value={rule.outcome.route} />
                  </div>
                </div>

                <p className="text-xs text-slate-700 font-medium pl-8">{rule.description}</p>

                {/* Structured JSON Conditions */}
                <div className="pl-8 pt-1">
                  <div className="text-[11px] font-mono bg-slate-100 p-2 rounded-lg text-slate-800 border border-slate-200 max-h-24 overflow-y-auto">
                    {JSON.stringify(rule.conditions, null, 2)}
                  </div>
                </div>

                <div className="pl-8 flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Strategy: <strong className="text-slate-700">{rule.outcome.supplier_selection_strategy}</strong></span>
                  {rule.outcome.requires_approval && (
                    <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Req: {rule.outcome.requires_approval}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Policy Amendment Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-semibold text-slate-900 text-base mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Propose Policy Amendment</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload a signed Amendment PDF or describe rule changes in natural language. The AI parser extracts changes and generates structured rules for approval.
            </p>

            <div className="space-y-4 text-xs">
              {/* Option A: PDF */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Option 1: Upload Amendment PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAmendmentFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-2 text-slate-400 font-semibold text-[10px] uppercase">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Option B: Natural Language Text */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Option 2: Natural Language Policy Change
                </label>
                <textarea
                  value={amendmentText}
                  onChange={(e) => setAmendmentText(e.target.value)}
                  placeholder="e.g. Policy Amendment Version 5.1 Effective 2026-12-01: For Chakan (CHK1) plant, emergency threshold is reduced to INR 300,000. All other rules remain unchanged."
                  rows={5}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                <strong>Deterministic Safeguard:</strong> Unapproved amendments never activate automatically. Historical policies remain preserved for audit and re-testing.
              </div>
            </div>
          </div>

          <button
            onClick={handleUploadAmendment}
            disabled={uploading || (!amendmentFile && !amendmentText.trim())}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{uploading ? 'Parsing Amendment...' : 'Parse & Propose Amendment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
