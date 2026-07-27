import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ProcurementTab() {
  const [activeSubTab, setActiveSubTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [rfqItems, setRfqItems] = useState([{ item: '', quantity: 1, unit: 'meters' }]);
  const [selectedSupplierEmail, setSelectedSupplierEmail] = useState('');
  const [generatedRfq, setGeneratedRfq] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingRfq, setLoadingRfq] = useState(false);

  useEffect(() => {
    fetchSupplierPerformance();
    fetchProcurementSuggestions();
  }, []);

  const fetchSupplierPerformance = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/procurement/vendor-performance');
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcurementSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await axios.get('/procurement/ai-recommendations');
      setAiSuggestions(res.data.recommendations);
      setReorderAlerts(res.data.reorder_alerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddRfqItem = () => {
    setRfqItems([...rfqItems, { item: '', quantity: 1, unit: 'meters' }]);
  };

  const handleRemoveRfqItem = (index) => {
    setRfqItems(rfqItems.filter((_, i) => i !== index));
  };

  const handleRfqItemChange = (index, field, value) => {
    const updated = [...rfqItems];
    updated[index][field] = value;
    setRfqItems(updated);
  };

  const handleGenerateRfq = async () => {
    setLoadingRfq(true);
    try {
      const payload = {
        bom_items: rfqItems.filter(item => item.item !== ''),
        supplier_email: selectedSupplierEmail
      };
      const res = await axios.post('/procurement/rfq-generate', payload);
      setGeneratedRfq(res.data.rfq_text);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRfq(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Procurement Operations</h2>
          <p className="text-xs text-slate-400 font-normal">Manage supplier profiles, trigger AI-driven Request For Quotation emails, and review automated supply chain alerts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'suppliers' 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            📋 Supplier Directory
          </button>
          <button
            onClick={() => setActiveSubTab('rfq')}
            className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
              activeSubTab === 'rfq' 
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/10' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-350 border-slate-750'
            }`}
          >
            ✉️ AI RFQ Generator
          </button>
        </div>
      </div>

      {activeSubTab === 'suppliers' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main supplier list */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl glass-panel overflow-hidden">
              <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Active Supplier Performance Audit</h3>
                <button onClick={fetchSupplierPerformance} className="text-[10px] text-indigo-350 hover:underline">
                  🔄 Refresh Performance
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                  Calculating vendor grades...
                </div>
              ) : suppliers.length === 0 ? (
                <div className="p-12 text-center text-slate-550 italic text-xs">
                  No suppliers registered in system database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                        <th className="p-4">Vendor ID</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Performance Risk</th>
                        <th className="p-4">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/80 text-xs">
                      {suppliers.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-400">{s.supplier_id}</td>
                          <td className="p-4 font-semibold text-slate-200">{s.name}</td>
                          <td className="p-4 font-mono text-slate-450">{s.email}</td>
                          <td className="p-4 text-slate-400 max-w-xs truncate" title={s.reasons}>{s.reasons}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                              s.grade === 'A'
                                ? 'bg-emerald-950/40 text-emerald-450 border-emerald-900/60'
                                : s.grade === 'B'
                                ? 'bg-amber-950/40 text-amber-450 border-amber-900/60'
                                : 'bg-rose-950/40 text-rose-450 border-rose-900/60'
                            }`}>
                              Risk Score: {s.risk_score} (Grade {s.grade})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* AI recommendations side column */}
          <div className="lg:col-span-4 space-y-4">
            {/* Safety Stock warnings */}
            <div className="p-5 rounded-2xl glass-panel space-y-3">
              <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider block">Safety Stock Alerts</h3>
              {reorderAlerts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">All raw material stocks are currently healthy.</p>
              ) : (
                <div className="space-y-2">
                  {reorderAlerts.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-rose-950 bg-rose-950/20 text-rose-350 text-xs flex justify-between items-center">
                      <span className="capitalize font-bold">⚠️ {item} low</span>
                      <span className="font-mono text-[10px] bg-rose-900/40 px-2 py-0.5 rounded">Action Required</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI procurement insights */}
            <div className="p-5 rounded-2xl glass-panel space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">AI Procurement Suggestions</h3>
              {loadingSuggestions ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full mr-2" />
                  Generating forecasts...
                </div>
              ) : (
                <div className="text-xs text-slate-350 leading-relaxed whitespace-pre-wrap font-sans">
                  {aiSuggestions}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* RFQ Input Form */}
          <div className="lg:col-span-6 p-5 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Assemble RFQ Line Items</h3>
            
            {/* Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">Select Supplier Contact</label>
              <select
                value={selectedSupplierEmail}
                onChange={(e) => setSelectedSupplierEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s, idx) => (
                  <option key={idx} value={s.email}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            {/* Items list */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase block">BOM Material Specifications</label>
              {rfqItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Material name (e.g. zippers)"
                    value={item.item}
                    onChange={(e) => handleRfqItemChange(idx, 'item', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleRfqItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={item.unit}
                    onChange={(e) => handleRfqItemChange(idx, 'unit', e.target.value)}
                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                  {rfqItems.length > 1 && (
                    <button onClick={() => handleRemoveRfqItem(idx)} className="text-rose-450 text-sm p-1">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button onClick={handleAddRfqItem} className="text-xs text-indigo-400 font-bold hover:underline">
                + Add Material Row
              </button>
            </div>

            <button
              onClick={handleGenerateRfq}
              disabled={loadingRfq || !selectedSupplierEmail}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-semibold text-xs py-3 rounded-xl shadow-lg transition-all"
            >
              {loadingRfq ? 'Optimizing email terms via LLM...' : '✉️ Draft AI RFQ Email'}
            </button>
          </div>

          {/* Generated output */}
          <div className="lg:col-span-6 p-5 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI RFQ Draft Output</h3>
            {!generatedRfq ? (
              <div className="h-64 border border-dashed border-slate-850 rounded-xl flex items-center justify-center text-center p-6 text-xs text-slate-500 italic">
                RFQ document draft will compile here once items are submitted.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Recipient: {selectedSupplierEmail}</span>
                  <span>Generated via: OpenChat Local Engine</span>
                </div>
                <pre className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                  {generatedRfq}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
