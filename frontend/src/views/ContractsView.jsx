import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, ChevronRight, FileText, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';

export const ContractsView = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const data = await api.getContracts();
      setContracts(data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleUploadPDF = async () => {
    if (!pdfFile) return;
    try {
      setUploading(true);
      setUploadMessage(null);
      const res = await api.uploadContractPDF(pdfFile);
      setUploadMessage(res.message);
      setPdfFile(null);
      await fetchContracts();
    } catch (err) {
      setUploadMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Rate Contracts & Ceiling Governance</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {contracts.length} Registered
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitors rate contract ceilings, item coverage, and validity windows. Upload signed contract PDFs to register new or PDF-only contracts.
          </p>
        </div>
      </div>

      {/* PDF Upload Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          <span>Upload Signed Contract PDF (Automated AI Parsing)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload any signed rate contract PDF (such as RC-2026-031 or RC-2026-033). The extraction parser automatically parses Contract ID, Supplier ID, Dates, Value Cap, and Schedule A rate lines.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50/50"
          />
          <button
            onClick={handleUploadPDF}
            disabled={uploading || !pdfFile}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>{uploading ? 'Extracting...' : 'Extract & Register Contract'}</span>
          </button>
        </div>

        {uploadMessage && (
          <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>{uploadMessage}</span>
          </div>
        )}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-sm">Contract Register ({contracts.length} Contracts)</h4>
          <span className="text-xs text-slate-500 font-medium">Requirements consume ceiling in requirement-date order</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <th className="py-3.5 px-4">Contract No.</th>
                <th className="py-3.5 px-3">Supplier</th>
                <th className="py-3.5 px-3">Supplier Status</th>
                <th className="py-3.5 px-3">Validity Window</th>
                <th className="py-3.5 px-4 text-right">Value Cap</th>
                <th className="py-3.5 px-4 text-right">Consumed Value</th>
                <th className="py-3.5 px-4 text-right">Remaining Room</th>
                <th className="py-3.5 px-4 min-w-[150px]">Ceiling Utilization</th>
                <th className="py-3.5 px-3 text-center">Lines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {contracts.map((c) => {
                const isExpanded = expandedId === c.contract_id;
                const isNearCap = c.remaining_ceiling < 50000;
                const isBlockedSupplier = !c.is_active_supplier;

                return (
                  <React.Fragment key={c.contract_id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : c.contract_id)}
                      className={`hover:bg-blue-50/35 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{c.contract_id}</span>
                        {c.source === 'PDF_UPLOAD' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            PDF
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-800">
                        {c.supplier_name} <span className="text-slate-400 font-mono text-[11px]">({c.supplier_id})</span>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <Badge type="status" value={c.supplier_status || 'Active'} />
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {c.start_date} to {c.end_date}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{c.value_cap.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-700 font-bold">
                        ₹{c.consumed_value.toLocaleString('en-IN')}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isNearCap ? 'text-rose-600 font-black' : 'text-emerald-700'
                        }`}
                      >
                        ₹{c.remaining_ceiling.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60 shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                c.utilization_pct > 90
                                  ? 'bg-rose-500 animate-pulse'
                                  : c.utilization_pct > 60
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                              }`}
                              style={{ width: `${Math.min(100, c.utilization_pct)}%` }}
                            ></div>
                          </div>
                          <span
                            className={`font-mono text-[11px] font-bold w-10 text-right ${
                              c.utilization_pct > 90 ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {c.utilization_pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">
                        {c.lines?.length || 0}
                      </td>
                    </tr>

                    {/* Expanded Items & Rates Schedule */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={9} className="p-4 pl-12">
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                            <div className="text-xs font-bold text-slate-800 mb-3 font-sans flex items-center justify-between">
                              <span>Schedule A — Firm Fixed Item Rates for {c.contract_id}</span>
                              {isBlockedSupplier && (
                                <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Supplier is Blocked; contract cannot be used for direct PO (Clause 4.1).
                                </span>
                              )}
                            </div>
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="py-2 px-3">Item Code</th>
                                  <th className="py-2 px-3">Description</th>
                                  <th className="py-2 px-3">UoM</th>
                                  <th className="py-2 px-3 text-right">Firm Rate (INR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {c.lines?.map((line, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2 px-3 text-blue-600 font-bold">{line.item_code}</td>
                                    <td className="py-2 px-3 font-sans text-slate-800 font-medium">{line.description}</td>
                                    <td className="py-2 px-3 text-slate-500">{line.uom}</td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                                      ₹{line.rate.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
