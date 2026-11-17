import React, { useState, useEffect } from 'react';
import { Award, Users, Search, Download, Calendar, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { api } from '../services/api.js';
import { Badge } from '../components/Badge.jsx';

export const SuppliersView = () => {
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking' | 'directory'
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Preferred Ranking State
  const [selectedItemCode, setSelectedItemCode] = useState('ITM-1048');
  const [asOfDate, setAsOfDate] = useState('2026-11-01');
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Directory Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const sampleItems = [
    { code: 'ITM-1048', desc: 'Nitrile coated gloves (Worked Example 1)' },
    { code: 'ITM-1036', desc: 'Pneumatic cylinder 50x100 (Worked Example 2)' },
    { code: 'ITM-1016', desc: 'MIG wire ER70S-6 1.2mm (Worked Example 3)' },
    { code: 'ITM-1022', desc: 'Ball bearing 6308-ZZ' },
    { code: 'ITM-1010', desc: 'Hex bolt M10x50 grade 8.8' },
  ];

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async (code, date) => {
    try {
      setRankingLoading(true);
      const data = await api.getPreferredRanking(code, date);
      setRankingData(data);
    } catch (err) {
      console.error('Failed to load ranking:', err);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedItemCode) {
      fetchRanking(selectedItemCode, asOfDate);
    }
  }, [selectedItemCode, asOfDate]);

  const handleExportPreferredCSV = async () => {
    try {
      const blob = await api.exportPreferredCSV(asOfDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preferred_suppliers_${asOfDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier_id.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === '' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Supplier Performance & Multi-Factor Ranking</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            548-day history evaluation with normalized scoring: Frequency (35%), Recency (25%), Contract (15%), Delivery (15%), Quality (10%).
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Preferred Ranking Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supplier Directory ({suppliers.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'ranking' ? (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Item Code Selection
                </label>
                <select
                  value={selectedItemCode}
                  onChange={(e) => setSelectedItemCode(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {sampleItems.map((itm) => (
                    <option key={itm.code} value={itm.code}>
                      {itm.code} — {itm.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  As of Date (Requirement Date)
                </label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={asOfDate}
                    onChange={(e) => setAsOfDate(e.target.value)}
                    className="bg-transparent text-xs font-mono font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleExportPreferredCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export Preferred CSV (item_code,rank,supplier_id,price,top_3)</span>
            </button>
          </div>

          {/* Ranking Cards / Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm font-mono">{selectedItemCode}</span>
                <span className="text-slate-600 text-xs ml-2 font-sans font-semibold">{rankingData?.description}</span>
                <span className="text-slate-400 text-xs ml-2 font-sans font-medium">({rankingData?.category})</span>
              </div>
              <span className="text-xs text-slate-500 font-mono font-semibold">Evaluated as of: {asOfDate}</span>
            </div>

            {rankingLoading ? (
              <div className="p-16 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Calculating multi-factor rankings...
              </div>
            ) : !rankingData || rankingData.ranking.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-500">
                No active suppliers have purchase history or contracts for this item within the preceding 548 days.
                Sourcing suggestions will be topped up from category suppliers.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                      <th className="py-3.5 px-4 text-center">Rank</th>
                      <th className="py-3.5 px-4">Supplier</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-3 text-center">POs (548d)</th>
                      <th className="py-3.5 px-3 text-center">Recency</th>
                      <th className="py-3.5 px-3 text-center">Contract</th>
                      <th className="py-3.5 px-3 text-center">On-Time</th>
                      <th className="py-3.5 px-3 text-center">Quality</th>
                      <th className="py-3.5 px-4 text-right">Composite Score</th>
                      <th className="py-3.5 px-4 text-right">Reference Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rankingData.ranking.map((r) => (
                      <tr key={r.supplier_id} className="hover:bg-blue-50/35 transition-colors">
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-2xs ${
                              r.rank === 1
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-white ring-2 ring-amber-300/40'
                                : r.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                          {r.name} <span className="text-slate-400 font-mono text-[11px]">({r.supplier_id})</span>
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <Badge type="status" value="Active" />
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-900">{r.po_count}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{r.recency.toFixed(1)}</td>
                        <td className="py-3 px-3 text-center font-sans font-bold">
                          {r.has_contract ? (
                            <span className="text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px]">
                              yes
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">no</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{r.on_time_pct}%</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{r.quality_rating}</td>
                        <td className="py-3 px-4 text-right font-black text-blue-600 text-sm">
                          {(r.score * 100).toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-800">
                          {r.reference_price ? `₹${r.reference_price.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Supplier Master Directory */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200/80 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search name, supplier ID or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl w-64 text-xs focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <span className="text-slate-500 font-semibold text-xs">
              Showing <strong>{filteredSuppliers.length}</strong> of <strong>{suppliers.length}</strong> Suppliers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="py-3.5 px-4">Supplier ID</th>
                  <th className="py-3.5 px-4">Company Name</th>
                  <th className="py-3.5 px-3">City</th>
                  <th className="py-3.5 px-4">Categories</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3 text-center">On-Time %</th>
                  <th className="py-3.5 px-3 text-center">Quality Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredSuppliers.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.supplier_id}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 px-3 font-sans text-slate-600">{s.city}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 max-w-xs truncate" title={s.categories.join(', ')}>
                      {s.categories.join('; ')}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <Badge type="status" value={s.status} />
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{s.on_time_pct}%</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{s.quality_rating} / 5.0</td>
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
